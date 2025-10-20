<template>
  <div class="broadcast-interface">
    <!-- Status Card -->
    <div class="status-section mb-6">
      <StatusQRCard />
    </div>

    <!-- Composer Card -->
    <div class="composer-card card animate-fade-in" role="region" aria-labelledby="composer-title">
      <!-- Header -->
      <div class="composer-header">
        <div class="header-content">
          <div class="header-icon">
            <i class="fas fa-broadcast-tower text-primary"></i>
          </div>
          <div class="header-text">
            <h3 id="composer-title" class="text-lg font-semibold">Broadcast Composer</h3>
            <p class="text-sm text-muted">Send messages to multiple contacts</p>
          </div>
        </div>
        <div class="contact-counter">
          <div class="counter-badge">
            <i class="fas fa-users"></i>
            <span>{{ selectedContactsCount }}/{{ MAX_CONTACTS }}</span>
          </div>
        </div>
      </div>

      <!-- Message Input -->
      <div class="message-input-section">
        <div class="input-wrapper">
          <textarea
            v-model="messageText"
            placeholder="Type your broadcast message here..."
            class="message-textarea input textarea"
            rows="4"
            maxlength="4096"
            @input="updateSendButton"
            aria-describedby="char-counter"
            aria-label="Broadcast message text"
          ></textarea>
          <div class="input-footer">
            <div id="char-counter" class="char-counter">
              <span :class="charCountClass">{{ messageText.length }}</span>
              <span class="text-muted">/4096</span>
            </div>
            <button
              v-if="messageText"
              @click="clearMessage"
              class="clear-btn btn-ghost"
              title="Clear message"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Media Section -->
      <div class="media-section">
        <div class="media-toggle">
          <label class="toggle-switch">
            <input
              type="checkbox"
              v-model="includeMedia"
              class="toggle-input"
            >
            <span class="toggle-slider"></span>
            <span class="toggle-label">
              <i class="fas fa-paperclip"></i>
              Attach Media
            </span>
          </label>
        </div>

        <transition name="slide-fade">
          <div v-if="includeMedia" class="media-upload-area">
            <input
              type="file"
              ref="mediaFile"
              accept="image/*,video/*,audio/*,document/*"
              @change="handleMediaSelection"
              class="file-input"
            >

            <div v-if="!selectedMedia" class="upload-zone" @click="triggerFileSelect">
              <div class="upload-icon">
                <i class="fas fa-cloud-upload-alt"></i>
              </div>
              <div class="upload-text">
                <p class="font-medium">Drop files here or click to browse</p>
                <p class="text-sm text-muted">Supports images, videos, audio, and documents</p>
              </div>
            </div>

            <div v-else class="file-preview">
              <div class="preview-content">
                <div class="file-icon">
                  <i :class="getFileIcon(selectedMedia.type)"></i>
                </div>
                <div class="file-info">
                  <p class="file-name font-medium">{{ selectedMedia.name }}</p>
                  <p class="file-size text-sm text-muted">{{ formatFileSize(selectedMedia.size) }}</p>
                </div>
                <button @click="clearMedia" class="remove-file btn-ghost">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <div v-if="mediaPreview && selectedMedia.type.startsWith('image/')" class="image-preview">
                <img :src="mediaPreview" alt="Preview" class="preview-image">
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button
          @click="showScheduleModal = true"
          class="schedule-btn btn btn-secondary focus-ring"
          aria-label="Schedule broadcast message"
        >
          <i class="fas fa-calendar-plus" aria-hidden="true"></i>
          <span>Schedule</span>
        </button>

        <button
          @click="handleSendBroadcast"
          :disabled="!canSend"
          class="send-btn btn btn-primary focus-ring"
          :class="{ 'animate-pulse': isSending }"
          :aria-label="isSending ? 'Sending broadcast message' : 'Send broadcast message'"
        >
          <i class="fas fa-paper-plane" aria-hidden="true"></i>
          <span>{{ isSending ? 'Sending...' : 'Send Broadcast' }}</span>
        </button>
      </div>

      <!-- Progress Indicator -->
      <transition name="slide-fade">
        <div v-if="isSending" class="progress-section" role="status" aria-live="polite">
          <div class="progress-bar" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <p class="progress-text text-sm text-muted">{{ progressText }}</p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../stores/app'
import StatusQRCard from './StatusQRCard.vue'
import { showNotification } from '../utils/notifications'
import type { Contact } from '../stores/app'

const appStore = useAppStore()
const MAX_CONTACTS = 256

// Reactive data
const messageText = ref('')
const includeMedia = ref(false)
const selectedMedia = ref<File | null>(null)
const mediaPreview = ref('')
const mediaFile = ref<HTMLInputElement>()
const showScheduleModal = ref(false)
const isSending = ref(false)
const progressPercent = ref(0)
const progressText = ref('')

// Computed properties
const selectedContactsCount = computed(() => appStore.selectedContactsCount)
const canSend = computed(() => {
  return messageText.value.trim().length > 0 && selectedContactsCount.value > 0 && appStore.isConnected && !isSending.value
})

const charCountClass = computed(() => {
  const length = messageText.value.length
  if (length > 4000) return 'text-danger'
  if (length > 3500) return 'text-warning'
  return 'text-muted'
})

// Methods
const updateSendButton = () => {
  // Reactive updates handled by computed property
}

const clearMessage = () => {
  messageText.value = ''
}

const handleMediaSelection = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedMedia.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      mediaPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const clearMedia = () => {
  selectedMedia.value = null
  mediaPreview.value = ''
  if (mediaFile.value) {
    mediaFile.value.value = ''
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return 'fas fa-image'
  if (type.startsWith('video/')) return 'fas fa-video'
  if (type.startsWith('audio/')) return 'fas fa-music'
  return 'fas fa-file'
}

const handleSendBroadcast = () => {
  if (!canSend.value) return

  const message = messageText.value.trim()
  const selectedContactIds = Array.from(appStore.selectedContacts)

  if (!message || selectedContactIds.length === 0) {
    showNotification('Silakan masukkan pesan dan pilih kontak terlebih dahulu.', 'error')
    return
  }

  // Show confirmation modal
  if (confirm(`Kirim pesan ke ${selectedContactIds.length} kontak?`)) {
    sendBroadcastMessage(message, selectedContactIds)
  }
}

const sendBroadcastMessage = async (message: string, selectedContactIds: string[]) => {
  isSending.value = true
  progressPercent.value = 0
  progressText.value = 'Preparing broadcast...'

  const broadcastData: any = {
    type: 'send_broadcast',
    message: message,
    contacts: selectedContactIds
  }

  if (includeMedia.value && selectedMedia.value) {
    const file = selectedMedia.value
    const reader = new FileReader()
    reader.onload = () => {
      broadcastData.media = {
        data: (reader.result as string).split(',')[1], // base64 data
        mimetype: file.type,
        filename: file.name
      }
      sendViaWebSocket(broadcastData)
    }
    reader.readAsDataURL(file)
  } else {
    await sendViaWebSocket(broadcastData)
  }

  showNotification('Memulai pengiriman broadcast...', 'info')
}

const sendViaWebSocket = async (data: any) => {
  // Use the WebSocket service instead of direct socket access
  const { wsService } = await import('../services/websocket')
  try {
    wsService.send(data)
    appStore.sendBroadcast(data.message, data.contacts)

    // Simulate progress updates
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 90) {
        progress = 90
        clearInterval(interval)
      }
      progressPercent.value = Math.round(progress)
      progressText.value = `Sending to ${Math.round(progress / 100 * selectedContactsCount.value)}/${selectedContactsCount.value} contacts...`
    }, 500)

    // Reset after completion
    setTimeout(() => {
      isSending.value = false
      progressPercent.value = 100
      progressText.value = 'Broadcast completed!'
      setTimeout(() => {
        progressPercent.value = 0
        progressText.value = ''
      }, 2000)
    }, 3000)
  } catch (error) {
    console.error('Failed to send broadcast:', error)
    isSending.value = false
    showNotification('Failed to send broadcast', 'error')
  }
}

const triggerFileSelect = () => {
  if (mediaFile.value) {
    mediaFile.value.click()
  }
}

// Watch for drag and drop
watch(includeMedia, (newVal) => {
  if (!newVal) {
    clearMedia()
  }
})
</script>

<style scoped>
.broadcast-interface {
  display: flex;
  flex-direction: column;
}

.status-section {
  margin-bottom: 1.5rem;
}

.composer-card {
  padding: 1.5rem;
}

.composer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--neutral-200);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  color: var(--primary-600);
  font-size: 1.25rem;
}

.contact-counter {
  background: var(--primary-50);
  color: var(--primary-700);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 600;
}

.message-input-section {
  margin-bottom: 1.5rem;
}

.input-wrapper {
  position: relative;
}

.message-textarea {
  width: 100%;
  min-height: 120px;
  resize: vertical;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}

.char-counter {
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.media-section {
  margin-bottom: 1.5rem;
}

.media-toggle {
  margin-bottom: 1rem;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-input {
  display: none;
}

.toggle-slider {
  width: 2.5rem;
  height: 1.25rem;
  background: var(--neutral-300);
  border-radius: 0.625rem;
  position: relative;
  transition: all var(--transition-fast);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 0.125rem;
  left: 0.125rem;
  width: 1rem;
  height: 1rem;
  background: white;
  border-radius: 50%;
  transition: all var(--transition-fast);
}

.toggle-input:checked + .toggle-slider {
  background: var(--primary-500);
}

.toggle-input:checked + .toggle-slider::before {
  transform: translateX(1.25rem);
}

.toggle-label {
  font-size: 0.875rem;
  color: var(--neutral-700);
}

.media-upload-area {
  margin-top: 1rem;
}

.upload-zone {
  border: 2px dashed var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: var(--neutral-50);
}

.upload-zone:hover {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.upload-icon {
  color: var(--neutral-400);
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.upload-text p:first-child {
  font-weight: 600;
  color: var(--neutral-900);
  margin-bottom: 0.25rem;
}

.upload-text p:last-child {
  color: var(--neutral-600);
  font-size: 0.875rem;
}

.file-preview {
  border: 1px solid var(--neutral-300);
  border-radius: var(--radius-lg);
  padding: 1rem;
  background: white;
}

.preview-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-icon {
  font-size: 1.5rem;
  color: var(--neutral-600);
}

.file-info {
  flex: 1;
}

.file-name {
  color: var(--neutral-900);
  margin-bottom: 0.125rem;
}

.file-size {
  font-size: 0.875rem;
}

.remove-file {
  color: var(--danger-500);
  padding: 0.25rem;
  border-radius: var(--radius-sm);
}

.remove-file:hover {
  background: var(--danger-50);
}

.image-preview {
  margin-top: 1rem;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.progress-section {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--success-50);
  border: 1px solid var(--success-200);
  border-radius: var(--radius-lg);
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background: var(--neutral-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: var(--success-500);
  border-radius: var(--radius-sm);
  transition: width var(--transition-normal);
}

.progress-text {
  text-align: center;
  font-weight: 500;
}

@media (max-width: 640px) {
  .composer-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .contact-counter {
    align-self: flex-end;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .btn {
    width: 100%;
  }

  .input-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>