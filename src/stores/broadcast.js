import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import { useWhatsAppStore } from './whatsapp'
import { useContactsStore } from './contacts'
// Supabase removed - using WebSocket for realtime updates

export const useBroadcastStore = defineStore('broadcast', () => {
  // State
  const message = ref({
    content: '',
    media: []
  })
  const mediaFile = ref(null)
  const includeMedia = ref(false)
  const isSending = ref(false)
  const sendProgress = ref({
    current: 0,
    total: 0,
    percentage: 0,
    status: 'idle',
    logs: [],
    errors: [],
    successful: [],
    failed: []
  })
  const broadcastHistory = ref([])
  const scheduledBroadcasts = ref([])
  const messageTemplates = ref([
    {
      id: 'welcome',
      name: 'Pesan Selamat Datang',
      category: 'greeting',
      content: 'Halo {name}, selamat datang! Terima kasih telah bergabung dengan kami.',
      description: 'Template untuk menyambut member baru',
      variables: ['name'],
      usage: 0,
      isActive: true,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000
    },
    {
      id: 'promo',
      name: 'Promosi Produk',
      category: 'promotion',
      content: 'Halo {name}! Ada promo spesial untuk Anda. Diskon hingga 50% untuk semua produk. Jangan sampai terlewat!',
      description: 'Template untuk promosi dan penawaran khusus',
      variables: ['name'],
      usage: 5,
      isActive: true,
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 86400000
    },
    {
      id: 'reminder',
      name: 'Pengingat Acara',
      category: 'reminder',
      content: 'Halo {name}, ini adalah pengingat untuk acara yang akan datang. Jangan lupa untuk hadir tepat waktu!',
      description: 'Template untuk mengingatkan tentang acara atau jadwal',
      variables: ['name'],
      usage: 2,
      isActive: true,
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 172800000
    }
  ])
  const selectedTemplate = ref(null)
  const appliedTemplate = ref(null)
  
  // Toast instance
  const toast = useToast()
  
  // Store instances
  const whatsappStore = useWhatsAppStore()
  const contactsStore = useContactsStore()
  
  // Realtime subscription
  let realtimeSubscription = null
  
  // Setup realtime subscription for broadcast history
  const setupRealtimeSubscription = (deviceId) => {
    console.log('Realtime subscription disabled - using WebSocket for updates')
    return
  }
  
  // Handle realtime broadcast insert
  const handleRealtimeBroadcastInsert = (newBroadcast) => {
    const existingIndex = broadcastHistory.value.findIndex(b => b.id === newBroadcast.id)
    if (existingIndex === -1) {
      const formattedBroadcast = {
        id: newBroadcast.id,
        message: newBroadcast.message,
        recipients: newBroadcast.recipients,
        sentCount: newBroadcast.sent_count,
        failedCount: newBroadcast.failed_count,
        status: newBroadcast.status,
        timestamp: newBroadcast.created_at,
        createdAt: newBroadcast.created_at
      }
      broadcastHistory.value.unshift(formattedBroadcast)
      console.log('🔄 Added broadcast via realtime:', formattedBroadcast.id)
    }
  }
  
  // Handle realtime broadcast update
  const handleRealtimeBroadcastUpdate = (updatedBroadcast) => {
    const existingIndex = broadcastHistory.value.findIndex(b => b.id === updatedBroadcast.id)
    if (existingIndex !== -1) {
      broadcastHistory.value[existingIndex] = {
        ...broadcastHistory.value[existingIndex],
        message: updatedBroadcast.message,
        recipients: updatedBroadcast.recipients,
        sentCount: updatedBroadcast.sent_count,
        failedCount: updatedBroadcast.failed_count,
        status: updatedBroadcast.status
      }
      console.log('🔄 Updated broadcast via realtime:', updatedBroadcast.id)
    }
  }
  
  // Handle realtime broadcast delete
  const handleRealtimeBroadcastDelete = (deletedBroadcast) => {
    const existingIndex = broadcastHistory.value.findIndex(b => b.id === deletedBroadcast.id)
    if (existingIndex !== -1) {
      broadcastHistory.value.splice(existingIndex, 1)
      console.log('🔄 Deleted broadcast via realtime:', deletedBroadcast.id)
    }
  }
  
  // Cleanup realtime subscription
  const cleanupRealtimeSubscription = () => {
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe()
      realtimeSubscription = null
      console.log('🔄 Broadcast realtime subscription cleaned up')
    }
  }
  
  // Computed
  const canSendBroadcast = computed(() => {
    return whatsappStore.isReady && 
           message.value.content.trim().length > 0 && 
           contactsStore.selectedCount > 0 &&
           !isSending.value
  })
  
  const progressPercentage = computed(() => {
    if (sendProgress.value.total === 0) return 0
    return Math.round((sendProgress.value.current / sendProgress.value.total) * 100)
  })
  
  const progressText = computed(() => {
    return `${sendProgress.value.current} / ${sendProgress.value.total}`
  })
  
  // Actions
  function setMessage(newMessage) {
    message.value.content = newMessage
  }
  
  function setMediaFile(file) {
    mediaFile.value = file
  }
  
  function toggleIncludeMedia() {
    includeMedia.value = !includeMedia.value
    if (!includeMedia.value) {
      mediaFile.value = null
    }
  }
  
  function clearMessage() {
    message.value.content = ''
    message.value.media = []
    mediaFile.value = null
    includeMedia.value = false
  }
  
  function addMedia(file) {
    const mediaItem = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }
    message.value.media.push(mediaItem)
  }
  
  function removeMedia(index) {
    message.value.media.splice(index, 1)
  }
  
  async function sendBroadcast() {
    if (!canSendBroadcast.value) {
      toast.error('Tidak dapat mengirim broadcast. Periksa koneksi dan pilihan kontak.')
      return false
    }
    
    try {
      isSending.value = true
      
      // Reset progress
      sendProgress.value = {
        current: 0,
        total: contactsStore.selectedCount,
        percentage: 0,
        status: 'preparing',
        logs: [],
        errors: [],
        successful: [],
        failed: []
      }
      
      // Prepare broadcast data
      const broadcastData = {
        message: message.value.content,
        contacts: contactsStore.selectedContactsArray.map(contact => ({
          id: contact.id,
          number: contact.number,
          name: contact.name
        })),
        includeMedia: message.value.media.length > 0,
        mediaFiles: message.value.media.length > 0 ? await Promise.all(
          message.value.media.map(async (media) => ({
            name: media.name,
            type: media.type,
            data: await fileToBase64(media.file)
          }))
        ) : [],
        timestamp: new Date().toISOString()
      }
      
      // Add to history
      const broadcastRecord = {
        id: generateBroadcastId(),
        ...broadcastData,
        status: 'sending',
        createdAt: new Date().toISOString()
      }
      
      broadcastHistory.value.unshift(broadcastRecord)
      
      // Send to server
      whatsappStore.emit('send_broadcast', broadcastData)
      
      // Setup progress listeners
      setupProgressListeners()
      
      toast.info('Broadcast dimulai...')
      return true
      
    } catch (error) {
      console.error('Broadcast error:', error)
      isSending.value = false
      sendProgress.value.status = 'error'
      toast.error('Gagal mengirim broadcast: ' + error.message)
      return false
    }
  }
  
  function setupProgressListeners() {
    if (!whatsappStore.socket) return
    
    // Listen for progress updates
    whatsappStore.socket.on('broadcast_progress', (data) => {
      updateProgress(data)
    })
    
    // Listen for completion
    whatsappStore.socket.on('broadcast_complete', (data) => {
      completeBroadcast(data)
    })
    
    // Listen for errors
    whatsappStore.socket.on('broadcast_error', (data) => {
      handleBroadcastError(data)
    })
  }
  
  function updateProgress(data) {
    sendProgress.value.current = data.current || 0
    sendProgress.value.total = data.total || sendProgress.value.total
    sendProgress.value.percentage = progressPercentage.value
    sendProgress.value.status = data.status || 'sending'
    
    if (data.log) {
      sendProgress.value.logs.push({
        timestamp: new Date().toISOString(),
        message: data.log,
        type: data.logType || 'info'
      })
    }
    
    if (data.success) {
      sendProgress.value.successful.push(data.success)
    }
    
    if (data.error) {
      sendProgress.value.failed.push(data.error)
      sendProgress.value.errors.push({
        timestamp: new Date().toISOString(),
        contact: data.error.contact,
        message: data.error.message
      })
    }
  }
  
  function completeBroadcast(data) {
    isSending.value = false
    sendProgress.value.status = 'completed'
    sendProgress.value.percentage = 100
    
    // Update history
    const historyIndex = broadcastHistory.value.findIndex(b => 
      b.timestamp === data.timestamp
    )
    
    if (historyIndex >= 0) {
      broadcastHistory.value[historyIndex] = {
        ...broadcastHistory.value[historyIndex],
        status: 'completed',
        completedAt: new Date().toISOString(),
        results: {
          total: data.total || sendProgress.value.total,
          successful: data.successful || sendProgress.value.successful.length,
          failed: data.failed || sendProgress.value.failed.length,
          errors: sendProgress.value.errors
        }
      }
    }
    
    // Clear selection after successful broadcast
    contactsStore.clearSelection()
    
    const successCount = data.successful || sendProgress.value.successful.length
    const failedCount = data.failed || sendProgress.value.failed.length
    
    toast.success(
      `Broadcast selesai! Berhasil: ${successCount}, Gagal: ${failedCount}`
    )
  }
  
  function handleBroadcastError(data) {
    isSending.value = false
    sendProgress.value.status = 'error'
    
    toast.error('Broadcast gagal: ' + (data.message || 'Unknown error'))
  }
  
  function cancelBroadcast() {
    if (isSending.value) {
      whatsappStore.emit('cancel_broadcast')
      isSending.value = false
      sendProgress.value.status = 'cancelled'
      toast.warning('Broadcast dibatalkan')
    }
  }
  
  function applyTemplate(templateId, variables = {}) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) {
      toast.error('Template tidak ditemukan')
      return
    }
    
    let content = template.content
    
    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value)
    })
    
    message.value = content
    toast.success('Template berhasil diterapkan')
  }
  
  function addTemplate(template) {
    const newTemplate = {
      id: generateTemplateId(),
      name: template.name,
      category: template.category,
      content: template.content,
      description: template.description || '',
      variables: extractVariables(template.content),
      usage: 0,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    messageTemplates.value.push(newTemplate)
    toast.success('Template berhasil ditambahkan')
    return newTemplate
  }
  
  function applyTemplate(template) {
    if (!template) return
    
    // Set the message content
    message.value = template.content
    appliedTemplate.value = template
    selectedTemplate.value = template
    
    // Increment usage count
    incrementTemplateUsage(template.id)
    
    toast.success(`Template "${template.name}" diterapkan`)
  }
  
  function updateTemplate(updatedTemplate) {
    const index = messageTemplates.value.findIndex(t => t.id === updatedTemplate.id)
    if (index >= 0) {
      messageTemplates.value[index] = { ...updatedTemplate }
      toast.success('Template berhasil diperbarui')
    }
  }
  
  function removeTemplate(templateId) {
    const index = messageTemplates.value.findIndex(t => t.id === templateId)
    if (index >= 0) {
      messageTemplates.value.splice(index, 1)
      toast.success('Template berhasil dihapus')
    }
  }
  
  function duplicateTemplate(template) {
    const duplicated = {
      ...template,
      id: generateTemplateId(),
      name: `${template.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usage: 0
    }
    messageTemplates.value.push(duplicated)
    toast.success('Template berhasil diduplikat')
    return duplicated
  }
  
  function toggleTemplateStatus(templateId) {
    const template = messageTemplates.value.find(t => t.id === templateId)
    if (template) {
      template.isActive = !template.isActive
      template.updatedAt = Date.now()
      toast.success(`Template ${template.isActive ? 'diaktifkan' : 'dinonaktifkan'}`)
    }
  }
  
  function incrementTemplateUsage(templateId) {
    const template = messageTemplates.value.find(t => t.id === templateId)
    if (template) {
      template.usage = (template.usage || 0) + 1
      template.updatedAt = Date.now()
    }
  }
  
  function parseTemplate(content) {
    const variables = extractVariables(content)
    return {
      content,
      variables,
      isValid: variables.length > 0
    }
  }
  
  function renderTemplate(template, data = {}) {
    let rendered = template.content
    
    // Replace variables with actual data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g')
      rendered = rendered.replace(regex, data[key] || '')
    })
    
    return rendered
  }
  
  function validateTemplate(template) {
    const errors = []
    
    if (!template.name || template.name.trim().length === 0) {
      errors.push('Nama template tidak boleh kosong')
    }
    
    if (!template.content || template.content.trim().length === 0) {
      errors.push('Isi template tidak boleh kosong')
    }
    
    if (template.content && template.content.length > 4096) {
      errors.push('Isi template tidak boleh lebih dari 4096 karakter')
    }
    
    if (!template.category) {
      errors.push('Kategori template harus dipilih')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  function getBroadcastHistory(limit = 50) {
    return broadcastHistory.value.slice(0, limit)
  }
  
  function clearHistory() {
    broadcastHistory.value = []
    toast.success('Riwayat broadcast berhasil dihapus')
  }
  
  function addScheduledBroadcast(schedule) {
    const newSchedule = {
      ...schedule,
      id: schedule.id || generateBroadcastId(),
      createdAt: schedule.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    scheduledBroadcasts.value.push(newSchedule)
    return newSchedule
  }
  
  function updateScheduledBroadcast(updatedSchedule) {
    const index = scheduledBroadcasts.value.findIndex(s => s.id === updatedSchedule.id)
    if (index !== -1) {
      scheduledBroadcasts.value[index] = {
        ...scheduledBroadcasts.value[index],
        ...updatedSchedule,
        updatedAt: new Date().toISOString()
      }
    }
  }
  
  function deleteScheduledBroadcast(scheduleId) {
    scheduledBroadcasts.value = scheduledBroadcasts.value.filter(s => s.id !== scheduleId)
  }
  
  function cancelScheduledBroadcast(scheduleId) {
    const schedule = scheduledBroadcasts.value.find(s => s.id === scheduleId)
    if (schedule && schedule.status === 'pending') {
      updateScheduledBroadcast({
        ...schedule,
        status: 'cancelled'
      })
    }
  }
  
  // Utility functions
  function generateBroadcastId() {
    return `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  function generateTemplateId() {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  function extractVariables(content) {
    const matches = content.match(/{([^}]+)}/g)
    return matches ? matches.map(match => match.slice(1, -1)) : []
  }
  
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  // Reset all data (for logout)
  function resetStore() {
    // Reset message state
    message.value.content = ''
    message.value.media = []
    mediaFile.value = null
    includeMedia.value = false
    
    // Reset sending state
    isSending.value = false
    sendProgress.value.current = 0
    sendProgress.value.total = 0
    sendProgress.value.status = ''
    
    // Reset history and scheduled broadcasts
    broadcastHistory.value = []
    scheduledBroadcasts.value = []
    
    // Reset templates
    messageTemplates.value = []
    selectedTemplate.value = null
    appliedTemplate.value = null
    
    // Cleanup realtime subscription
    cleanupRealtimeSubscription()
    
    // Clear localStorage
    localStorage.removeItem('broadcast_history')
    localStorage.removeItem('scheduled_broadcasts')
    localStorage.removeItem('message_templates')
  }

  return {
    // State
    message,
    mediaFile,
    includeMedia,
    isSending,
    sendProgress,
    broadcastHistory,
    scheduledBroadcasts,
    messageTemplates,
    selectedTemplate,
    appliedTemplate,
    
    // Computed
    canSendBroadcast,
    progressPercentage,
    progressText,
    
    // Actions
    setMessage,
    setMediaFile,
    toggleIncludeMedia,
    clearMessage,
    addMedia,
    removeMedia,
    sendBroadcast,
    cancelBroadcast,
    applyTemplate,
    addTemplate,
    updateTemplate,
    removeTemplate,
    duplicateTemplate,
    toggleTemplateStatus,
    incrementTemplateUsage,
    parseTemplate,
    renderTemplate,
    validateTemplate,
    getBroadcastHistory,
    clearHistory,
    addScheduledBroadcast,
    updateScheduledBroadcast,
    deleteScheduledBroadcast,
    cancelScheduledBroadcast,
    
    // Realtime
    setupRealtimeSubscription,
    cleanupRealtimeSubscription,
    
    // Reset
    resetStore
  }
})