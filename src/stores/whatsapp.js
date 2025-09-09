import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useToast } from 'vue-toastification'
import { useDeviceStore } from './device'
import { useContactsStore } from './contacts'
import { useBroadcastStore } from './broadcast'
import QRCode from 'qrcode'
import socketService from '@/services/socketService'
import apiService from '@/services/apiService'

export const useWhatsAppStore = defineStore('whatsapp', () => {
  // State
  const isConnected = ref(false)
  const isAuthenticated = ref(false)
  const isReady = ref(false)
  const qrCode = ref('')
  const connectionStatus = ref('disconnected')
  const lastError = ref('')
  const lastToastTime = ref({})
  const whatsappContacts = ref([])
  const pollingInterval = ref(null)
  const socketConnected = ref(false)
  
  // Toast instance
  const toast = useToast()
  
  // Store instances
  const deviceStore = useDeviceStore()
  const contactsStore = useContactsStore()
  const broadcastStore = useBroadcastStore()
  
  // Throttle toast notifications to prevent spam
  function showThrottledToast(type, message, throttleKey, throttleMs = 10000) {
    const now = Date.now()
    const lastTime = lastToastTime.value[throttleKey] || 0
    
    if (now - lastTime > throttleMs) {
      toast[type](message)
      lastToastTime.value[throttleKey] = now
    }
  }
  
  // Configuration
  const config = {
    BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 
      (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('172.16.')
        ? `http://${window.location.hostname}:3001` 
        : 'https://wa-broadcast.ekalliptus.my.id')
  }
  
  // Computed
  const statusText = computed(() => {
    switch (connectionStatus.value) {
      case 'connecting':
        return 'Menyambung...'
      case 'qr_ready':
        return 'Scan QR Code'
      case 'authenticated':
        return 'Terautentikasi'
      case 'ready':
        return 'Siap Digunakan'
      case 'disconnected':
        return 'Tidak Terhubung'
      default:
        return 'Status Tidak Diketahui'
    }
  })
  
  const statusColor = computed(() => {
    switch (connectionStatus.value) {
      case 'connecting':
        return 'yellow'
      case 'qr_ready':
        return 'blue'
      case 'authenticated':
      case 'ready':
        return 'green'
      case 'disconnected':
        return 'red'
      default:
        return 'gray'
    }
  })
  
  // Check WhatsApp backend connection status
  async function checkBackendStatus() {
    const result = await apiService.getStatus()
    if (result.success) {
      return { success: true, data: result.data }
    }
    return { success: false, data: { connected: false, hasQR: false } }
  }
  
  // Get QR code from backend
  async function getBackendQR() {
    const result = await apiService.getQR()
    if (result.success && result.data?.qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(result.data.qr, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        })
        return qrDataUrl
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }
    return null
  }
  
  // Update polling to use backend
  function startStatusPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
    }
  
    pollingInterval.value = setInterval(async () => {
      const status = await checkBackendStatus()
  
      if (status.success) {
        const { connected, hasQR } = status.data
  
        if (connected && !isConnected.value) {
          isConnected.value = true
          isAuthenticated.value = true
          isReady.value = true
          connectionStatus.value = 'ready'
          qrCode.value = ''
  
          console.log('WhatsApp connected!')
  
          setTimeout(() => {
            loadContacts()
          }, 2000)
  
        } else if (!connected && isConnected.value) {
          isConnected.value = false
          isAuthenticated.value = false
          isReady.value = false
          connectionStatus.value = 'disconnected'
          qrCode.value = ''
  
          console.log('WhatsApp disconnected')
  
        } else if (!connected && hasQR && connectionStatus.value !== 'qr_ready') {
          connectionStatus.value = 'qr_ready'
          const qr = await getBackendQR()
          if (qr) {
            qrCode.value = qr
            console.log('QR code ready for scanning')
          }
        }
      } else {
        if (connectionStatus.value !== 'disconnected') {
          connectionStatus.value = 'disconnected'
          isConnected.value = false
          isAuthenticated.value = false
          isReady.value = false
          console.error('WhatsApp server not responding')
        }
      }
    }, 5000)
  }
  
  // Connect to backend server
  async function connectToServer() {
    try {
      if (connectionStatus.value === 'connecting') {
        console.log('Already connecting, skipping...')
        return
      }

      connectionStatus.value = 'connecting'

      await deviceStore.initializeDevice()
      console.log('Device initialized:', deviceStore.deviceId)

      console.log('Connecting to WhatsApp backend')

      const status = await checkBackendStatus()

      if (status.success) {
        console.log('Connected to WhatsApp backend')
        startStatusPolling()
        
        // Listen for contacts updates
        socketService.on('contacts-updated', (contacts) => {
          console.log('👥 Contacts updated via WebSocket:', contacts.length)
          // Sync contacts when they are updated
          loadContacts()
        })
      } else {
        throw new Error('Backend tidak merespons')
      }

    } catch (error) {
      console.error('Connection error:', error)
      lastError.value = error.message
      connectionStatus.value = 'disconnected'
      console.error('Failed to connect to WhatsApp backend')
    }
  }
  
  // Stop polling
  function stopStatusPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }
  
  // Disconnect from server
  function disconnect() {
    stopStatusPolling()
    isConnected.value = false
    isAuthenticated.value = false
    isReady.value = false
    connectionStatus.value = 'disconnected'
    qrCode.value = ''
    whatsappContacts.value = []
    
    console.log('Disconnected from WhatsApp')
  }
  
  // Logout from WhatsApp
  async function logout() {
    const result = await apiService.logout()
    
    if (result.success) {
      disconnect()
      
      // Reset all stores data
      contactsStore.resetStore()
      broadcastStore.resetStore()
      
      console.log('Successfully logged out from WhatsApp')
    } else {
      console.error('Logout error:', result.error)
      console.error('Failed to logout from WhatsApp')
    }
  }
  
  // Send message
  async function sendMessage(to, message) {
    if (!isReady.value) {
      return { success: false, error: 'WhatsApp belum siap' }
    }
    
    const result = await apiService.sendMessage(to, message)
    
    if (!result.success) {
      console.error('Send message error:', result.error)
    }
    
    return result
  }
  
  // Get profile picture
  async function getProfilePicture(jid) {
    const result = await apiService.getProfilePicture(jid)
    
    if (result.success) {
      return result.data.profilePicUrl
    }
    
    return null
  }
  
  // Load contacts from backend
  async function loadContacts() {
    if (!isReady.value) {
      console.warn('WhatsApp not ready, cannot load contacts')
      return false
    }
    
    const result = await apiService.getContacts()

    if (result.success) {
      const contacts = result.data.data || result.data
      if (contacts && contacts.length > 0) {
        console.log(`📱 Loaded ${contacts.length} contacts from WhatsApp backend`)

        const formattedContacts = contacts.map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          number: contact.phone || contact.number,
          isGroup: contact.isGroup || false,
          profilePicUrl: contact.profilePicUrl
        }))

        whatsappContacts.value = formattedContacts
        contactsStore.loadContactsFromWhatsApp(formattedContacts)
        console.log(`Contacts loaded: ${formattedContacts.length} contacts`)
        return true
      } else {
        console.log('No contacts found')
      }
    } else {
      console.error('Failed to load contacts from backend')
    }
    return false
  }
  
  // Refresh contacts
  async function refreshContacts() {
    console.log('🔄 refreshContacts called')
    await loadContacts()
  }
  
  // Request contacts (alias for refreshContacts)
  async function requestContacts() {
    console.log('🔄 requestContacts called')
    await refreshContacts()
  }
  
  // WebSocket Functions
  function initializeWebSocket() {
    socketService.connect()
    
    // Listen for connection status
    socketService.on('connect', () => {
      console.log('🔌 WebSocket connected')
      socketConnected.value = true
      console.log('Connected to realtime server')
    })
    
    socketService.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected')
      socketConnected.value = false
      console.log('Disconnected from realtime server')
    })
    
    // Listen for WhatsApp status updates
    socketService.on('whatsapp-status', (data) => {
      console.log('📱 WhatsApp status update:', data)
      updateConnectionStatus(data)
    })
    
    // Listen for new messages
    socketService.on('new-message', (message) => {
      console.log('💬 New message received:', message)
      console.log(`New message from ${message.senderName || message.sender}`)
    })
    
    // Listen for contact updates
    socketService.on('contacts-updated', (contacts) => {
      console.log('👥 Contacts updated:', contacts.length)
      if (contacts && contacts.length > 0) {
        const formattedContacts = contacts.map(contact => ({
          id: contact.id,
          name: contact.name || 'Unknown',
          number: contact.number,
          isGroup: contact.isGroup || false,
          profilePicUrl: contact.profilePicUrl
        }))
        
        whatsappContacts.value = formattedContacts
        contactsStore.loadContactsFromWhatsApp(formattedContacts)
        console.log(`Contacts updated: ${formattedContacts.length} contacts`)
      }
    })
    
    // Listen for chat updates
    socketService.on('chats-updated', (chats) => {
      console.log('💬 Chats updated:', chats.length)
    })
  }
  
  function disconnectWebSocket() {
    socketService.cleanup()
    socketConnected.value = false
  }

  function updateConnectionStatus(statusData) {
    if (statusData.connected) {
      isConnected.value = true
      connectionStatus.value = 'ready'
      isReady.value = true
  
      if (statusData.hasQR) {
        connectionStatus.value = 'qr_ready'
        getBackendQR().then(qrDataUrl => {
          if (qrDataUrl) {
            qrCode.value = qrDataUrl
          }
        })
      }
    } else {
      isConnected.value = false
      isReady.value = false
      connectionStatus.value = 'disconnected'
      qrCode.value = ''
    }
  }
  
  function initialize() {
    console.log('Initializing WhatsApp store with whatsapp-web.js backend')
    initializeWebSocket()
    connectToServer()
  }
  
  // Cleanup on unmount
  function cleanup() {
    stopStatusPolling()
    disconnectWebSocket()
  }
  
  return {
    // State
    isConnected,
    isAuthenticated,
    isReady,
    qrCode,
    connectionStatus,
    lastError,
    whatsappContacts,
    socketConnected,
    
    // Computed
    statusText,
    statusColor,
    
    // Actions
    connectToServer,
    disconnect,
    logout,
    sendMessage,
    getProfilePicture,
    refreshContacts,
    requestContacts,
    loadContacts,
    initializeWebSocket,
    disconnectWebSocket,
    initialize,
    cleanup
  }
})