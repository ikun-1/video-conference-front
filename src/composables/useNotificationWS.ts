import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

// Module-level singleton state — shared across all consumers
let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let isConnected = false
const listeners = new Set<(data: any) => void>()

export const unreadCount = ref(0)
export const lastNotification = ref<any>(null)

function handleMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data)
    if (data.type === 'unread-count') {
      unreadCount.value = data.count
    }
    if (data.type === 'new-notification') {
      lastNotification.value = data.notification
    }
    // Notify all subscribers
    listeners.forEach(fn => fn(data))
  } catch {
    // ignore parse errors
  }
}

function startReconnect() {
  stopReconnect()
  reconnectTimer = setTimeout(connect, 5000)
}

function stopReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

export function connect() {
  if (isConnected || ws) return
  const authStore = useAuthStore()
  if (!authStore.token) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const url = `${protocol}//${window.location.host}/api/ws/notifications?token=${authStore.token}`

  ws = new WebSocket(url)
  ws.onopen = () => { isConnected = true }
  ws.onmessage = handleMessage
  ws.onclose = () => {
    isConnected = false
    ws = null
    startReconnect()
  }
  ws.onerror = () => {
    // onclose will handle reconnect
  }
}

export function disconnect() {
  stopReconnect()
  if (ws) {
    ws.onclose = null
    ws.close()
    ws = null
  }
  isConnected = false
}

export function subscribe(fn: (data: any) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Keep the old function signature for backward compatibility
export function useNotificationWS() {
  return {
    unreadCount,
    lastNotification,
    connect,
    disconnect,
    subscribe,
  }
}
