import { ref, type Ref, onUnmounted } from 'vue'

export interface QualityMetricSnapshot {
  label: 'audio' | 'video' | 'connection'
  bytesSent?: number
  bytesReceived?: number
  packetsSent?: number
  packetsReceived?: number
  packetsLost?: number
  jitterMs?: number
  roundTripMs?: number
  bitrateKbps?: number
  frameWidth?: number
  frameHeight?: number
  fps?: number
  framesDecoded?: number
  totalFramesLost?: number
  candidateType?: string
  snapshotAt: string
}

export function useWebRTCStats(
  pc: Ref<RTCPeerConnection | null>,
  sendMessage: (msg: Record<string, unknown>) => void,
) {
  const isCollecting = ref(false)
  let intervalId: ReturnType<typeof setInterval> | null = null
  // Track byte deltas for bitrate calculation, keyed by ssrc
  const previousStats = new Map<string, { bytes: number; timestamp: number }>()

  function start(intervalMs = 7000) {
    if (isCollecting.value) return
    isCollecting.value = true
    collect()
    intervalId = setInterval(collect, intervalMs)
  }

  function stop() {
    isCollecting.value = false
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
    previousStats.clear()
  }

  async function collect() {
    const peerConnection = pc.value
    if (!peerConnection) return

    try {
      const stats = await peerConnection.getStats()
      const metrics: QualityMetricSnapshot[] = []
      const now = new Date().toISOString()

      stats.forEach(report => {
        switch (report.type) {
          case 'inbound-rtp': {
            const r = report as any
            if (r.kind === 'audio' || r.kind === 'video') {
              metrics.push({
                label: r.kind,
                bytesReceived: r.bytesReceived,
                packetsReceived: r.packetsReceived,
                packetsLost: r.packetsLost,
                jitterMs: r.jitter !== undefined ? r.jitter * 1000 : undefined,
                snapshotAt: now,
              })
            }
            break
          }
          case 'remote-inbound-rtp': {
            const r = report as any
            // Merge RTT into the last audio/video metric of the same kind
            if (r.roundTripTime !== undefined) {
              const existing = metrics.find(m => m.label === (r.kind === 'audio' ? 'audio' : 'video'))
              if (existing) {
                existing.roundTripMs = r.roundTripTime * 1000
              }
            }
            break
          }
          case 'outbound-rtp': {
            const r = report as any
            if (r.kind === 'audio' || r.kind === 'video') {
              const entry: QualityMetricSnapshot = {
                label: r.kind,
                bytesSent: r.bytesSent,
                packetsSent: r.packetsSent,
                snapshotAt: now,
              }
              // Calculate bitrate from delta
              const key = `outbound-${r.kind}-${r.ssrc}`
              const prev = previousStats.get(key)
              if (prev && r.bytesSent) {
                const elapsed = (Date.now() - prev.timestamp) / 1000
                if (elapsed > 0) {
                  entry.bitrateKbps = ((r.bytesSent - prev.bytes) * 8) / 1000 / elapsed
                }
              }
              if (r.bytesSent) {
                previousStats.set(key, { bytes: r.bytesSent, timestamp: Date.now() })
              }
              metrics.push(entry)
            }
            break
          }
          case 'track': {
            const r = report as any
            if (r.kind === 'video') {
              const existing = metrics.find(m => m.label === 'video')
              if (existing) {
                existing.frameWidth = r.frameWidth
                existing.frameHeight = r.frameHeight
                existing.fps = r.framesPerSecond
                existing.framesDecoded = r.framesDecoded
                existing.totalFramesLost = r.totalFramesLost
              }
            }
            break
          }
          case 'candidate-pair': {
            const r = report as any
            if (r.selected) {
              const existingConn = metrics.find(m => m.label === 'connection')
              if (existingConn) {
                existingConn.roundTripMs = r.currentRoundTripTime !== undefined ? r.currentRoundTripTime * 1000 : undefined
              } else {
                metrics.push({
                  label: 'connection',
                  roundTripMs: r.currentRoundTripTime !== undefined ? r.currentRoundTripTime * 1000 : undefined,
                  bitrateKbps: r.availableOutgoingBitrate ? r.availableOutgoingBitrate / 1000 : undefined,
                  snapshotAt: now,
                })
              }
            }
            break
          }
          case 'local-candidate': {
            const r = report as any
            if (r.candidateType) {
              const existingConn = metrics.find(m => m.label === 'connection')
              if (existingConn && !existingConn.candidateType) {
                existingConn.candidateType = r.candidateType
              }
            }
            break
          }
        }
      })

      if (metrics.length > 0) {
        sendMessage({ type: 'quality-report', metrics })
      }
    } catch (err) {
      console.warn('[WebRTCStats] getStats failed:', err)
    }
  }

  onUnmounted(stop)

  return { isCollecting, start, stop }
}
