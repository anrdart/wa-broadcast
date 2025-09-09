import { ref, createApp } from 'vue'
import ToastNotification from '@/components/ToastNotification.vue'

// Global toast state
const toasts = ref([])
let toastId = 0

// Create and mount toast
const createToast = (options) => {
  const id = ++toastId
  const toast = {
    id,
    ...options,
    show: true
  }
  
  // Add to toasts array
  toasts.value.push(toast)
  
  // Create Vue app instance for this toast
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  const app = createApp(ToastNotification, {
    ...options,
    onClose: () => {
      // Remove from toasts array
      const index = toasts.value.findIndex(t => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
      
      // Cleanup DOM
      setTimeout(() => {
        app.unmount()
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      }, 300) // Wait for transition to complete
    }
  })
  
  app.mount(container)
  
  return {
    id,
    close: () => {
      const toastInstance = app._instance
      if (toastInstance && toastInstance.exposed) {
        toastInstance.exposed.close()
      }
    }
  }
}

// Toast methods
const showToast = (title, message = '', type = 'info', options = {}) => {
  return createToast({
    title,
    message,
    type,
    duration: 5000,
    persistent: false,
    ...options
  })
}

const showSuccess = (title, message = '', options = {}) => {
  return showToast(title, message, 'success', options)
}

const showError = (title, message = '', options = {}) => {
  return showToast(title, message, 'error', {
    duration: 8000, // Longer duration for errors
    ...options
  })
}

const showWarning = (title, message = '', options = {}) => {
  return showToast(title, message, 'warning', options)
}

const showInfo = (title, message = '', options = {}) => {
  return showToast(title, message, 'info', options)
}

// Clear all toasts
const clearAllToasts = () => {
  toasts.value.forEach(toast => {
    if (toast.close) {
      toast.close()
    }
  })
  toasts.value = []
}

export function useToast() {
  return {
    // State
    toasts,
    
    // Methods
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts
  }
}