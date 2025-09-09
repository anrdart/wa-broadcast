import { ref, computed } from 'vue'

// Notification permission state
const notificationPermission = ref(Notification.permission)
const isNotificationSupported = computed(() => 'Notification' in window)
const isNotificationEnabled = computed(() => notificationPermission.value === 'granted')

// Request notification permission
const requestNotificationPermission = async () => {
  if (!isNotificationSupported.value) {
    console.warn('Notifications are not supported in this browser')
    return false
  }

  if (notificationPermission.value === 'granted') {
    return true
  }

  try {
    const permission = await Notification.requestPermission()
    notificationPermission.value = permission
    return permission === 'granted'
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return false
  }
}

// Show notification
const showNotification = (title, options = {}) => {
  if (!isNotificationEnabled.value) {
    console.warn('Notifications are not enabled')
    return null
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options
    })

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    return notification
  } catch (error) {
    console.error('Error showing notification:', error)
    return null
  }
}

// Show message notification
const showMessageNotification = (senderName, message, chatId) => {
  const options = {
    body: message,
    tag: `chat-${chatId}`, // Prevent duplicate notifications for same chat
    requireInteraction: false,
    silent: false,
    data: {
      chatId,
      type: 'message'
    }
  }

  const notification = showNotification(`Pesan dari ${senderName}`, options)
  
  if (notification) {
    // Handle notification click
    notification.onclick = () => {
      window.focus()
      // Navigate to chat if needed
      notification.close()
    }
  }

  return notification
}

// Show status notification
const showStatusNotification = (title, message, type = 'info') => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  const options = {
    body: message,
    icon: '/favicon.ico',
    tag: `status-${type}`,
    requireInteraction: false,
    silent: type === 'info'
  }

  return showNotification(`${icons[type]} ${title}`, options)
}

export function useNotifications() {
  return {
    // State
    notificationPermission,
    isNotificationSupported,
    isNotificationEnabled,
    
    // Methods
    requestNotificationPermission,
    showNotification,
    showMessageNotification,
    showStatusNotification
  }
}