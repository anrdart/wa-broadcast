import { ref, watch } from 'vue'

/**
 * Composable untuk mengelola cache localStorage dengan session management
 * Mendukung multiple device sessions dan auto-restore data
 */
export function useCache() {
  // Generate unique device ID jika belum ada
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('wa_broadcast_device_id')
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('wa_broadcast_device_id', deviceId)
    }
    return deviceId
  }

  const deviceId = getDeviceId()

  /**
   * Menyimpan data ke localStorage dengan prefix device ID
   * @param {string} key - Key untuk data
   * @param {any} data - Data yang akan disimpan
   * @param {number} ttl - Time to live dalam milidetik (optional)
   */
  const setCache = (key, data, ttl = null) => {
    try {
      const cacheKey = `${deviceId}_${key}`
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
        deviceId
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      console.log(`Cache saved: ${cacheKey}`, { dataSize: JSON.stringify(data).length })
    } catch (error) {
      console.error('Error saving to cache:', error)
    }
  }

  /**
   * Mengambil data dari localStorage
   * @param {string} key - Key untuk data
   * @param {any} defaultValue - Default value jika data tidak ada
   * @returns {any} Data dari cache atau default value
   */
  const getCache = (key, defaultValue = null) => {
    try {
      const cacheKey = `${deviceId}_${key}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) {
        return defaultValue
      }

      const cacheData = JSON.parse(cached)
      
      // Check TTL jika ada
      if (cacheData.ttl && (Date.now() - cacheData.timestamp) > cacheData.ttl) {
        localStorage.removeItem(cacheKey)
        console.log(`Cache expired and removed: ${cacheKey}`)
        return defaultValue
      }

      console.log(`Cache loaded: ${cacheKey}`, { dataSize: JSON.stringify(cacheData.data).length })
      return cacheData.data
    } catch (error) {
      console.error('Error loading from cache:', error)
      return defaultValue
    }
  }

  /**
   * Menghapus data dari cache
   * @param {string} key - Key untuk data yang akan dihapus
   */
  const removeCache = (key) => {
    try {
      const cacheKey = `${deviceId}_${key}`
      localStorage.removeItem(cacheKey)
      console.log(`Cache removed: ${cacheKey}`)
    } catch (error) {
      console.error('Error removing cache:', error)
    }
  }

  /**
   * Membersihkan semua cache untuk device ini
   */
  const clearDeviceCache = () => {
    try {
      const keys = Object.keys(localStorage)
      const deviceKeys = keys.filter(key => key.startsWith(`${deviceId}_`))
      
      deviceKeys.forEach(key => {
        localStorage.removeItem(key)
      })
      
      console.log(`Cleared ${deviceKeys.length} cache entries for device: ${deviceId}`)
    } catch (error) {
      console.error('Error clearing device cache:', error)
    }
  }

  /**
   * Membersihkan cache yang sudah expired
   */
  const cleanExpiredCache = () => {
    try {
      const keys = Object.keys(localStorage)
      const deviceKeys = keys.filter(key => key.startsWith(`${deviceId}_`))
      let cleanedCount = 0
      
      deviceKeys.forEach(key => {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const cacheData = JSON.parse(cached)
            if (cacheData.ttl && (Date.now() - cacheData.timestamp) > cacheData.ttl) {
              localStorage.removeItem(key)
              cleanedCount++
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          localStorage.removeItem(key)
          cleanedCount++
        }
      })
      
      if (cleanedCount > 0) {
        console.log(`Cleaned ${cleanedCount} expired cache entries`)
      }
    } catch (error) {
      console.error('Error cleaning expired cache:', error)
    }
  }

  /**
   * Mendapatkan informasi cache untuk device ini
   */
  const getCacheInfo = () => {
    try {
      const keys = Object.keys(localStorage)
      const deviceKeys = keys.filter(key => key.startsWith(`${deviceId}_`))
      
      let totalSize = 0
      const cacheEntries = deviceKeys.map(key => {
        const value = localStorage.getItem(key)
        const size = value ? value.length : 0
        totalSize += size
        
        try {
          const cacheData = JSON.parse(value)
          return {
            key: key.replace(`${deviceId}_`, ''),
            size,
            timestamp: cacheData.timestamp,
            ttl: cacheData.ttl,
            expired: cacheData.ttl ? (Date.now() - cacheData.timestamp) > cacheData.ttl : false
          }
        } catch {
          return {
            key: key.replace(`${deviceId}_`, ''),
            size,
            corrupted: true
          }
        }
      })
      
      return {
        deviceId,
        totalEntries: deviceKeys.length,
        totalSize,
        entries: cacheEntries
      }
    } catch (error) {
      console.error('Error getting cache info:', error)
      return { deviceId, totalEntries: 0, totalSize: 0, entries: [] }
    }
  }

  /**
   * Auto-reactive cache untuk Vue reactive data
   * @param {string} key - Key untuk data
   * @param {any} initialValue - Initial value
   * @param {number} ttl - Time to live dalam milidetik (optional)
   * @returns {Ref} Vue ref yang tersinkronisasi dengan cache
   */
  const useReactiveCache = (key, initialValue, ttl = null) => {
    const cachedValue = getCache(key, initialValue)
    const reactiveValue = ref(cachedValue)
    
    // Watch untuk auto-save ke cache
    watch(reactiveValue, (newValue) => {
      setCache(key, newValue, ttl)
    }, { deep: true })
    
    return reactiveValue
  }

  // Clean expired cache saat composable diinisialisasi
  cleanExpiredCache()

  return {
    deviceId,
    setCache,
    getCache,
    removeCache,
    clearDeviceCache,
    cleanExpiredCache,
    getCacheInfo,
    useReactiveCache
  }
}