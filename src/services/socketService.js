import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '' // use current origin

    // Connect via Vite proxy: '/socket.io' -> backend http://localhost:3001
    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server')
      this.isConnected = true
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
      this.isConnected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect()
    }
    this.socket.on(event, callback)
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit event:', event)
    }
  }

  cleanup() {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.disconnect()
    }
  }
}

const socketService = new SocketService()
export default socketService