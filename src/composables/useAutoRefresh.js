import { ref, onMounted, onUnmounted } from 'vue'

export function useAutoRefresh(refreshFunction, intervalMs = 30000) {
  const isRefreshing = ref(false)
  const lastRefresh = ref(null)
  let intervalId = null

  const refresh = async () => {
    if (isRefreshing.value) return
    
    try {
      isRefreshing.value = true
      await refreshFunction()
      lastRefresh.value = new Date()
    } catch (error) {
      console.error('Auto refresh error:', error)
    } finally {
      isRefreshing.value = false
    }
  }

  const startAutoRefresh = () => {
    if (intervalId) return
    
    intervalId = setInterval(refresh, intervalMs)
  }

  const stopAutoRefresh = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const restartAutoRefresh = (newIntervalMs) => {
    stopAutoRefresh()
    if (newIntervalMs) {
      intervalMs = newIntervalMs
    }
    startAutoRefresh()
  }

  onMounted(() => {
    startAutoRefresh()
  })

  onUnmounted(() => {
    stopAutoRefresh()
  })

  return {
    isRefreshing,
    lastRefresh,
    refresh,
    startAutoRefresh,
    stopAutoRefresh,
    restartAutoRefresh
  }
}