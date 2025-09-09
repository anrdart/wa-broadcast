<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleCancel"
        ></div>
        
        <!-- Modal Content -->
        <div class="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg transform border border-gray-700">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon class="w-5 h-5 text-white" />
              </div>
              <h3 class="text-lg font-semibold text-white">
                Konfirmasi Broadcast
              </h3>
            </div>
            
            <button
              @click="handleCancel"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Content -->
          <div class="p-6">
            <!-- Warning Message -->
            <div class="mb-6">
              <p class="text-gray-300 mb-4">
                Anda akan mengirim pesan broadcast ke <strong>{{ selectedContactsCount }}</strong> kontak.
              </p>
              
              <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div class="flex items-start space-x-3">
                  <ExclamationTriangleIcon class="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div class="text-sm text-yellow-200">
                    <p class="font-medium mb-1">Peringatan:</p>
                    <ul class="list-disc list-inside space-y-1">
                      <li>Pastikan pesan sudah benar sebelum mengirim</li>
                      <li>Proses tidak dapat dibatalkan setelah dimulai</li>
                      <li>Tunggu hingga proses selesai sebelum menutup aplikasi</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Message Preview -->
            <div class="mb-6">
              <h4 class="text-sm font-medium text-white mb-3">Preview Pesan:</h4>
              <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <!-- Text Message -->
                <div v-if="messageContent" class="mb-3">
                  <div class="text-sm text-gray-300 whitespace-pre-wrap">{{ messageContent }}</div>
                </div>
                
                <!-- Media Preview -->
                <div v-if="hasMedia" class="space-y-2">
                  <div 
                    v-for="(media, index) in mediaFiles" 
                    :key="index"
                    class="flex items-center space-x-3 p-2 bg-gray-600/50 rounded border border-gray-600"
                  >
                    <div class="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                      <DocumentIcon v-if="media.type.startsWith('application')" class="w-4 h-4 text-blue-400" />
                      <PhotoIcon v-else-if="media.type.startsWith('image')" class="w-4 h-4 text-blue-400" />
                      <VideoCameraIcon v-else-if="media.type.startsWith('video')" class="w-4 h-4 text-blue-400" />
                      <SpeakerWaveIcon v-else-if="media.type.startsWith('audio')" class="w-4 h-4 text-blue-400" />
                      <DocumentIcon v-else class="w-4 h-4 text-blue-400" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-white truncate">{{ media.name }}</div>
                      <div class="text-xs text-gray-400">{{ formatFileSize(media.size) }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- Empty State -->
                <div v-if="!messageContent && !hasMedia" class="text-sm text-gray-400 italic">
                  Tidak ada pesan atau media
                </div>
              </div>
            </div>
            
            <!-- Recipients Summary -->
            <div class="mb-6">
              <h4 class="text-sm font-medium text-white mb-3">Penerima:</h4>
              <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-300">Total kontak:</span>
                  <span class="text-sm font-medium text-white">{{ selectedContactsCount }}</span>
                </div>
                
                <div v-if="selectedContactsCount > 0" class="text-xs text-gray-400">
                  {{ selectedContactsPreview }}
                  <span v-if="selectedContactsCount > 3">dan {{ selectedContactsCount - 3 }} lainnya</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="flex justify-end space-x-3 p-6 border-t border-gray-700">
            <button
              @click="handleCancel"
              class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Batal
            </button>
            
            <button
              @click="handleConfirm"
              :disabled="!canSend"
              class="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span class="flex items-center space-x-2">
                <PaperAirplaneIcon class="w-4 h-4" />
                <span>Kirim Broadcast</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useBroadcastStore } from '../stores/broadcast'
import { useContactsStore } from '../stores/contacts'
import { usePerformance } from '../composables/usePerformance'
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['confirm', 'cancel'])

// Stores
const broadcastStore = useBroadcastStore()
const contactsStore = useContactsStore()

// Performance optimizations
const { createMemoizedComputed, createThrottled } = usePerformance()

// Memoized computed properties for better performance
const messageContent = createMemoizedComputed(() => broadcastStore.message.content, [
  computed(() => broadcastStore.message.content)
])

const mediaFiles = createMemoizedComputed(() => broadcastStore.message.media, [
  computed(() => broadcastStore.message.media?.length || 0)
])

const hasMedia = createMemoizedComputed(() => mediaFiles.value.length > 0, [
  mediaFiles
])

const selectedContactsCount = createMemoizedComputed(() => contactsStore.selectedContacts.length, [
  computed(() => contactsStore.selectedContacts.length)
])

const selectedContactsPreview = createMemoizedComputed(() => {
  const contacts = contactsStore.selectedContacts.slice(0, 3)
  return contacts.map(contact => contact.name || contact.phone).join(', ')
}, [computed(() => contactsStore.selectedContacts.length)])

const canSend = createMemoizedComputed(() => {
  return selectedContactsCount.value > 0 && 
         (messageContent.value.trim() || hasMedia.value)
}, [selectedContactsCount, messageContent, hasMedia])

// Throttled methods to prevent excessive calls
const handleConfirm = createThrottled(() => {
  if (canSend.value) {
    emit('confirm')
  }
}, 300)

const handleCancel = createThrottled(() => {
  emit('cancel')
}, 100)

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>