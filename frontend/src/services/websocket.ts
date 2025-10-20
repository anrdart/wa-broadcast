export interface Contact {
  id: string
  name?: string
  number: string
  isMyContact: boolean
  isFromCSV: boolean
}

export interface ChatMessage {
  type: string
  contactId: string
  message: string
  timestamp?: string
}

export interface BroadcastProgress {
  type: string
  current: number
  total: number
  contact: Contact
  success?: boolean
  error?: string
}

export interface ScheduledMessage {
  type: string
  message: string
  contacts: string[]
  dateTime: string
  isRecurring: boolean
  recurringConfig?: {
    interval: string
    endDate: string
  }
}

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 5000 // Increased from 2000 to 5000ms
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectTimeout: number | null = null
  private isIntentionallyClosed = false
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'

  constructor(url?: string) {
    // Use backend port 3000, or fallback to environment or defaults
    this.url = url || `ws://localhost:3000`
    this.maxReconnectAttempts = 8
    this.reconnectDelay = 5000
    // Don't auto-connect in constructor - let the app control when to connect
    // this.connect()
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prevent multiple simultaneous connection attempts
      if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
        console.log('⚠️  Connection already in progress or established')
        resolve()
        return
      }

      this.connectionState = 'connecting'
      this.isIntentionallyClosed = false

      try {
        this.ws = new WebSocket(this.url)

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.connectionState === 'connecting') {
            console.error('⏱️  Connection timeout')
            this.ws?.close()
            this.connectionState = 'disconnected'
            reject(new Error('Connection timeout'))
          }
        }, 10000) // 10 second timeout

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log('✅ WebSocket connected')
          this.connectionState = 'connected'
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 WebSocket message received:', data.type, data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          console.error('WebSocket error:', error)
          this.connectionState = 'disconnected'
          reject(error)
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout)
          console.log(`WebSocket disconnected with code: ${event.code}, reason: ${event.reason}`)
          this.connectionState = 'disconnected'

          // Only attempt reconnect if not intentionally closed
          if (!this.isIntentionallyClosed) {
            this.handleReconnect()
          }
        }
      } catch (error) {
        this.connectionState = 'disconnected'
        reject(error)
      }
    })
  }

  private handleReconnect() {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts && !this.isIntentionallyClosed) {
      this.reconnectAttempts++

      // Exponential backoff with cap at 30 seconds
      const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000)

      console.log(`Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectTimeout = null
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error)
          // handleReconnect will be called again by onclose if needed
        })
      }, delay)
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      this.emit('max_reconnect_failed', {})
    }
  }

  private handleMessage(data: WebSocketMessage) {
    const { type } = data
    console.log('🔔 Emitting event:', type)
    if (type) {
      this.emit(type, data)
    }
  }

  on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
  }

  off(eventType: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  private emit(eventType: string, data: any) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return
    }

    console.error('❌ WebSocket is not connected')
    throw new Error('WebSocket is not connected')
  }

  getContacts() {
    this.send({ type: 'get_contacts' })
  }

  sendBroadcast(message: string, contacts: string[]) {
    this.send({
      type: 'send_broadcast',
      message,
      contacts
    })
  }

  sendChat(contactId: string, message: string) {
    this.send({
      type: 'send_chat',
      contactId,
      message
    })
  }

  scheduleMessage(message: string, contacts: string[], dateTime: string, isRecurring = false, recurringConfig?: any) {
    this.send({
      type: 'schedule_message',
      message,
      contacts,
      dateTime,
      isRecurring,
      recurringConfig
    })
  }

  getScheduledMessages() {
    this.send({ type: 'get_scheduled' })
  }

  logout() {
    this.send({ type: 'logout' })
  }

  disconnect() {
    this.isIntentionallyClosed = true

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.listeners.clear()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.connectionState = 'disconnected'
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
export default wsService
