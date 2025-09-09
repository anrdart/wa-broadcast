import { ref, computed } from 'vue'

// Message status types
const MESSAGE_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
}

// Status colors and icons
const getStatusConfig = (status) => {
  const configs = {
    [MESSAGE_STATUS.PENDING]: {
      color: 'text-gray-400',
      icon: 'clock',
      label: 'Mengirim...',
      description: 'Pesan sedang dikirim'
    },
    [MESSAGE_STATUS.SENT]: {
      color: 'text-gray-400',
      icon: 'check',
      label: 'Terkirim',
      description: 'Pesan telah terkirim ke server'
    },
    [MESSAGE_STATUS.DELIVERED]: {
      color: 'text-blue-400',
      icon: 'check-double',
      label: 'Tersampaikan',
      description: 'Pesan telah sampai ke penerima'
    },
    [MESSAGE_STATUS.READ]: {
      color: 'text-blue-500',
      icon: 'check-double',
      label: 'Dibaca',
      description: 'Pesan telah dibaca penerima'
    },
    [MESSAGE_STATUS.FAILED]: {
      color: 'text-red-400',
      icon: 'exclamation-triangle',
      label: 'Gagal',
      description: 'Pesan gagal terkirim'
    }
  }
  
  return configs[status] || configs[MESSAGE_STATUS.PENDING]
}

// Get status icon component name
const getStatusIconName = (status) => {
  const config = getStatusConfig(status)
  const iconMap = {
    'clock': 'ClockIcon',
    'check': 'CheckIcon',
    'check-double': 'CheckIcon', // We'll use double check styling
    'exclamation-triangle': 'ExclamationTriangleIcon'
  }
  
  return iconMap[config.icon] || 'ClockIcon'
}

// Check if status shows double check
const isDoubleCheck = (status) => {
  return status === MESSAGE_STATUS.DELIVERED || status === MESSAGE_STATUS.READ
}

// Update message status with animation
const updateMessageStatus = async (messageId, newStatus, delay = 0) => {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  // In real implementation, this would update the database
  // For now, we'll emit an event or use a callback
  return {
    messageId,
    status: newStatus,
    timestamp: new Date().toISOString()
  }
}

// Simulate message status progression
const simulateMessageStatusProgression = async (messageId, callbacks = {}) => {
  const { onStatusChange } = callbacks
  
  try {
    // Pending -> Sent (1-2 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))
    const sentUpdate = await updateMessageStatus(messageId, MESSAGE_STATUS.SENT)
    onStatusChange?.(sentUpdate)
    
    // Sent -> Delivered (2-5 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))
    const deliveredUpdate = await updateMessageStatus(messageId, MESSAGE_STATUS.DELIVERED)
    onStatusChange?.(deliveredUpdate)
    
    // Delivered -> Read (random, might not happen)
    if (Math.random() > 0.3) { // 70% chance of being read
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 10000))
      const readUpdate = await updateMessageStatus(messageId, MESSAGE_STATUS.READ)
      onStatusChange?.(readUpdate)
    }
    
  } catch (error) {
    console.error('Error in status progression:', error)
    const failedUpdate = await updateMessageStatus(messageId, MESSAGE_STATUS.FAILED)
    onStatusChange?.(failedUpdate)
  }
}

// Format status timestamp
const formatStatusTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 1000 * 60) {
    return 'Baru saja'
  } else if (diff < 1000 * 60 * 60) {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}m`
  } else if (diff < 1000 * 60 * 60 * 24) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours}j`
  } else {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  }
}

export function useMessageStatus() {
  return {
    // Constants
    MESSAGE_STATUS,
    
    // Methods
    getStatusConfig,
    getStatusIconName,
    isDoubleCheck,
    updateMessageStatus,
    simulateMessageStatusProgression,
    formatStatusTime
  }
}