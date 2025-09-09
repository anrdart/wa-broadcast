import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Generate unique device ID based on browser fingerprint
function generateDeviceId() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'
  ctx.font = '14px Arial'
  ctx.fillText('Device fingerprint', 2, 2)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return 'device_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36)
}

export const useDeviceStore = defineStore('device', () => {
  // State
  const deviceId = ref(localStorage.getItem('device_id') || generateDeviceId())
  const session = ref(null)
  const isSessionActive = ref(false)
  const lastSyncTime = ref(null)
  const syncError = ref(null)
  
  // Computed
  const hasActiveSession = computed(() => {
    return session.value && isSessionActive.value
  })
  
  const sessionInfo = computed(() => {
    if (!session.value) return null
    return {
      deviceId: deviceId.value,
      whatsappNumber: session.value.whatsapp_number,
      lastActive: session.value.last_active,
      createdAt: session.value.created_at
    }
  })
  
  // Actions
  async function initializeDevice() {
    try {
      // Simpan device ID ke localStorage
      localStorage.setItem('device_id', deviceId.value)
      
      // Cek apakah device sudah memiliki session aktif di localStorage
      const sessionData = localStorage.getItem('device_session')
      
      if (sessionData) {
        const existingSession = JSON.parse(sessionData)
        if (existingSession.device_id === deviceId.value) {
          session.value = existingSession
          isSessionActive.value = existingSession.is_active
          console.log('Device session found:', existingSession)
        } else {
          console.log('Session belongs to different device, clearing...')
          localStorage.removeItem('device_session')
        }
      } else {
        console.log('No existing session found for device:', deviceId.value)
      }
      
      return deviceId.value
    } catch (error) {
      console.error('Error initializing device:', error)
      syncError.value = error.message
      throw error
    }
  }
  
  async function createSession(whatsappNumber) {
    try {
      syncError.value = null
      
      const newSession = {
        device_id: deviceId.value,
        whatsapp_number: whatsappNumber,
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
        is_active: true
      }
      
      // Save to localStorage
      localStorage.setItem('device_session', JSON.stringify(newSession))
      
      session.value = newSession
      isSessionActive.value = true
      lastSyncTime.value = new Date().toISOString()
      
      console.log('Device session created:', newSession)
      return newSession
    } catch (error) {
      console.error('Error creating device session:', error)
      syncError.value = error.message
      throw error
    }
  }
  
  async function deactivateSession() {
    try {
      if (!deviceId.value) return
      
      // Remove from localStorage
      localStorage.removeItem('device_session')
      
      session.value = null
      isSessionActive.value = false
      lastSyncTime.value = new Date().toISOString()
      
      console.log('Device session deactivated')
    } catch (error) {
      console.error('Error deactivating device session:', error)
      syncError.value = error.message
      throw error
    }
  }
  
  async function updateLastActive() {
    try {
      if (!deviceId.value || !isSessionActive.value) return
      
      if (session.value) {
        session.value.last_active = new Date().toISOString()
        // Update localStorage
        localStorage.setItem('device_session', JSON.stringify(session.value))
      }
    } catch (error) {
      console.error('Error updating last active:', error)
      // Don't throw error for this non-critical operation
    }
  }
  
  async function syncContacts(contacts) {
    try {
      if (!deviceId.value) {
        throw new Error('Device ID not available')
      }
      
      syncError.value = null
      
      // Save contacts to localStorage
      const contactsData = {
        device_id: deviceId.value,
        contacts: contacts,
        synced_at: new Date().toISOString()
      }
      localStorage.setItem('device_contacts', JSON.stringify(contactsData))
      
      lastSyncTime.value = new Date().toISOString()
      console.log(`Synced ${contacts.length} contacts to localStorage`)
      
      return true
    } catch (error) {
      console.error('Error syncing contacts:', error)
      syncError.value = error.message
      throw error
    }
  }
  
  async function loadContacts() {
    try {
      if (!deviceId.value) {
        throw new Error('Device ID not available')
      }
      
      const contactsData = localStorage.getItem('device_contacts')
      if (!contactsData) {
        console.log('No contacts found in localStorage')
        return []
      }
      
      const parsed = JSON.parse(contactsData)
      if (parsed.device_id !== deviceId.value) {
        console.log('Contacts belong to different device')
        return []
      }
      
      console.log(`Loaded ${parsed.contacts.length} contacts from localStorage`)
      return parsed.contacts
    } catch (error) {
      console.error('Error loading contacts:', error)
      syncError.value = error.message
      return []
    }
  }
  
  async function clearContacts() {
    try {
      if (!deviceId.value) return
      
      localStorage.removeItem('device_contacts')
      console.log('Contacts cleared from localStorage')
    } catch (error) {
      console.error('Error clearing contacts:', error)
      syncError.value = error.message
      throw error
    }
  }
  
  // Setup periodic heartbeat untuk update last active
  function startHeartbeat() {
    setInterval(() => {
      if (isSessionActive.value) {
        updateLastActive()
      }
    }, 30000) // Update setiap 30 detik
  }
  
  return {
    // State
    deviceId: computed(() => deviceId.value),
    session: computed(() => session.value),
    isSessionActive: computed(() => isSessionActive.value),
    lastSyncTime: computed(() => lastSyncTime.value),
    syncError: computed(() => syncError.value),
    
    // Computed
    hasActiveSession,
    sessionInfo,
    
    // Actions
    initializeDevice,
    createSession,
    deactivateSession,
    updateLastActive,
    syncContacts,
    loadContacts,
    clearContacts,
    startHeartbeat
  }
})