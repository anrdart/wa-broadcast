import { ref, computed } from 'vue'
import { useCache } from './useCache.js'

/**
 * Session Management Composable
 * Manages device-specific sessions and user data
 */
export function useSession() {
  const cache = useCache()
  
  // Generate unique device ID based on browser fingerprint
  const generateDeviceId = () => {
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
    
    return 'device_' + Math.abs(hash).toString(36)
  }
  
  // Current device ID
  const deviceId = ref(generateDeviceId())
  
  // Session data
  const sessionData = ref({
    deviceId: deviceId.value,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    userPreferences: {},
    appState: {}
  })
  
  // Get session key for current device
  const getSessionKey = (key) => {
    return `session_${deviceId.value}_${key}`
  }
  
  // Initialize session
  const initSession = () => {
    const existingSession = cache.getCache(getSessionKey('data'), null)
    
    if (existingSession) {
      sessionData.value = {
        ...existingSession,
        lastActive: new Date().toISOString()
      }
      console.log(`Session restored for device: ${deviceId.value}`)
    } else {
      console.log(`New session created for device: ${deviceId.value}`)
    }
    
    // Save updated session
    saveSession()
    
    // Update last active every 30 seconds
    setInterval(() => {
      updateLastActive()
    }, 30000)
  }
  
  // Save session data
  const saveSession = () => {
    cache.setCache(
      getSessionKey('data'),
      sessionData.value,
      30 * 24 * 60 * 60 * 1000 // 30 days
    )
  }
  
  // Update last active timestamp
  const updateLastActive = () => {
    sessionData.value.lastActive = new Date().toISOString()
    saveSession()
  }
  
  // Set user preference
  const setUserPreference = (key, value) => {
    sessionData.value.userPreferences[key] = value
    saveSession()
  }
  
  // Get user preference
  const getUserPreference = (key, defaultValue = null) => {
    return sessionData.value.userPreferences[key] ?? defaultValue
  }
  
  // Set app state
  const setAppState = (key, value) => {
    sessionData.value.appState[key] = value
    saveSession()
  }
  
  // Get app state
  const getAppState = (key, defaultValue = null) => {
    return sessionData.value.appState[key] ?? defaultValue
  }
  
  // Clear current session
  const clearSession = () => {
    cache.removeCache(getSessionKey('data'))
    sessionData.value = {
      deviceId: deviceId.value,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      userPreferences: {},
      appState: {}
    }
    console.log(`Session cleared for device: ${deviceId.value}`)
  }
  
  // Get all sessions (for debugging)
  const getAllSessions = () => {
    const allKeys = Object.keys(localStorage)
    const sessionKeys = allKeys.filter(key => key.startsWith('session_'))
    
    return sessionKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        return {
          key,
          deviceId: data.value?.deviceId,
          createdAt: data.value?.createdAt,
          lastActive: data.value?.lastActive
        }
      } catch (e) {
        return null
      }
    }).filter(Boolean)
  }
  
  // Clean old sessions (older than 30 days)
  const cleanOldSessions = () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const allSessions = getAllSessions()
    
    let cleanedCount = 0
    allSessions.forEach(session => {
      const lastActive = new Date(session.lastActive)
      if (lastActive < thirtyDaysAgo) {
        localStorage.removeItem(session.key)
        cleanedCount++
      }
    })
    
    if (cleanedCount > 0) {
      console.log(`Cleaned ${cleanedCount} old sessions`)
    }
  }
  
  // Computed properties
  const isNewSession = computed(() => {
    const createdAt = new Date(sessionData.value.createdAt)
    const now = new Date()
    return (now - createdAt) < 60000 // Less than 1 minute old
  })
  
  const sessionAge = computed(() => {
    const createdAt = new Date(sessionData.value.createdAt)
    const now = new Date()
    const diffMs = now - createdAt
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return `${diffDays} hari`
    } else if (diffHours > 0) {
      return `${diffHours} jam`
    } else {
      return 'Baru saja'
    }
  })
  
  // Initialize session on composable creation
  initSession()
  
  // Clean old sessions on initialization
  cleanOldSessions()
  
  return {
    // State
    deviceId: computed(() => deviceId.value),
    sessionData: computed(() => sessionData.value),
    isNewSession,
    sessionAge,
    
    // Methods
    initSession,
    saveSession,
    updateLastActive,
    setUserPreference,
    getUserPreference,
    setAppState,
    getAppState,
    clearSession,
    getAllSessions,
    cleanOldSessions
  }
}