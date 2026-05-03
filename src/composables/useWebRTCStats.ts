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
  const latestRttMs = ref(0)
  let intervalId: ReturnType<typeof setInterval> | null = null
  // Track byte deltas for bitrate calculation, keyed by ssrc
  const previousStats = new Map<string, { bytes: number; timestamp: number }>()

  function start(intervalMs = 7000) {
    if (isCollecting.value) return
    isCollecting.value = true
    console.log('[WebRTCStats] started, interval=' + intervalMs + 'ms')
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
    console.log('[WebRTCStats] stopped')
  }

  async function collect() {
    const peerConnection = pc.value
    if (!peerConnection) return

    try {
      const stats = await peerConnection.getStats()
      const metrics: QualityMetricSnapshot[] = []
      const now = new Date().toISOString()

      // Track ICE candidate-pair RTT as fallback for media-level RTT
      let iceRttMs: number | undefined
      // Track local-candidate types keyed by candidate ID for candidate-pair lookup
      const localCandidates = new Map<string, string>()

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
            if (r.roundTripTime !== undefined && r.roundTripTime > 0) {
              // Match by SSRC: find the inbound metric with matching SSRC by label
              // Chrome's remote-inbound-rtp uses kind field for label matching
              const label = r.kind === 'video' ? 'video' : 'audio'
              const existing = metrics.find(m => m.label === label && m.roundTripMs === undefined)
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
            // Use ANY candidate-pair with currentRoundTripTime (may be 0 on localhost)
            if (r.currentRoundTripTime !== undefined) {
              iceRttMs = r.currentRoundTripTime * 1000
            }
            // Chrome removed the `selected` field; use `nominated && state === 'succeeded'` instead
            const isSelected = r.selected || (r.nominated && r.state === 'succeeded')
            if (isSelected) {
              const pairType = r.localCandidateId ? localCandidates.get(r.localCandidateId) : undefined
              const existingConn = metrics.find(m => m.label === 'connection')
              if (existingConn) {
                existingConn.roundTripMs = r.currentRoundTripTime !== undefined ? r.currentRoundTripTime * 1000 : undefined
                if (!existingConn.candidateType && pairType) existingConn.candidateType = pairType
              } else {
                metrics.push({
                  label: 'connection',
                  roundTripMs: r.currentRoundTripTime !== undefined ? r.currentRoundTripTime * 1000 : undefined,
                  candidateType: pairType,
                  bitrateKbps: r.availableOutgoingBitrate ? r.availableOutgoingBitrate / 1000 : undefined,
                  snapshotAt: now,
                })
              }
            }
            break
          }
          case 'local-candidate': {
            const r = report as any
            if (r.candidateType && r.id) {
              localCandidates.set(r.id, r.candidateType)
            }
            break
          }
          default:
            // Log unknown types once for debugging (spammy, so only first call)
            if (metrics.length === 0 && report.type !== 'stream' && report.type !== 'media-source' && report.type !== 'peer-connection' && report.type !== 'certificate' && report.type !== 'transport' && report.type !== 'codec' && report.type !== 'candidate-pair' && report.type !== 'local-candidate' && report.type !== 'remote-candidate') {
              console.log('[WebRTCStats] unknown type:', report.type)
            }
        }
      })

      // If no media-level RTT was found via remote-inbound-rtp, fall back to ICE RTT
      if (iceRttMs !== undefined) {
        for (const m of metrics) {
          if ((m.label === 'audio' || m.label === 'video') && m.roundTripMs === undefined) {
            m.roundTripMs = iceRttMs
          }
        }
        // Ensure connection metric has RTT
        const conn = metrics.find(m => m.label === 'connection')
        if (conn && conn.roundTripMs === undefined) {
          conn.roundTripMs = iceRttMs
        }
      }

      // Fallback: associate candidate type for connection metric
      // (local-candidate may be processed after candidate-pair in stats.forEach)
      if (localCandidates.size > 0) {
        const conn = metrics.find(m => m.label === 'connection')
        if (conn && !conn.candidateType) {
          // Take the first local candidate type as best guess
          conn.candidateType = localCandidates.values().next().value
        }
      }

      // Update latest RTT for real-time display (best value from this collection)
      let bestRtt = 0
      for (const m of metrics) {
        if (m.roundTripMs !== undefined && m.roundTripMs > bestRtt) {
          bestRtt = m.roundTripMs
        }
      }
      latestRttMs.value = Math.round(bestRtt)

      if (metrics.length > 0) {
        console.log('[WebRTCStats] sending', metrics.length, 'metrics:', metrics.map(m => m.label + ' j=' + (m.jitterMs?.toFixed(1) ?? '-') + ' rtt=' + (m.roundTripMs?.toFixed(1) ?? '-')).join(', '))
        sendMessage({ type: 'quality-report', metrics })
      } else {
        console.log('[WebRTCStats] no metrics collected')
      }
    } catch (err) {
      console.warn('[WebRTCStats] getStats failed:', err)
    }
  }

  onUnmounted(stop)

  return { isCollecting, latestRttMs, start, stop }
}
