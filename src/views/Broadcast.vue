<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Broadcast Pesan</h1>
              <p class="mt-1 text-sm text-gray-300">
                Kirim pesan ke multiple kontak sekaligus
              </p>
            </div>
            
            <!-- Connection Status -->
            <div class="flex items-center space-x-2">
              <div 
                class="w-3 h-3 rounded-full"
                :class="whatsappStore.isReady ? 'bg-green-500' : 'bg-red-500'"
              ></div>
              <span class="text-sm font-medium" :class="whatsappStore.isReady ? 'text-green-400' : 'text-red-400'">
                {{ whatsappStore.statusText }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- WhatsApp Connection Status -->
      <div v-if="!whatsappStore.isReady" class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <ExclamationTriangleIcon class="w-6 h-6 text-yellow-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-medium text-yellow-300">WhatsApp Belum Terhubung</h3>
            <p class="mt-1 text-sm text-yellow-200">
              Untuk mengirim broadcast, silakan hubungkan WhatsApp terlebih dahulu.
              Status saat ini: <span class="font-medium">{{ whatsappStore.statusText }}</span>
            </p>
            <div class="mt-4 flex space-x-3">
              <button
                @click="whatsappStore.connectToServer()"
                :disabled="whatsappStore.connectionStatus === 'connecting'"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="whatsappStore.connectionStatus === 'connecting'">Menyambung...</span>
                <span v-else>Hubungkan WhatsApp</span>
              </button>
              <button
                v-if="whatsappStore.qrCode"
                @click="showQRModal = true"
                class="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                Lihat QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Message Composer -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Message Templates -->
          <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Template Pesan</h3>
              <button
                @click="showTemplateModal = true"
                class="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Kelola Template
              </button>
            </div>
            
            <div v-if="broadcastStore.messageTemplates.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                v-for="template in broadcastStore.messageTemplates.slice(0, 4)"
                :key="template.id"
                @click="applyTemplate(template)"
                class="text-left p-3 border border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/10 transition-colors"
              >
                <div class="font-medium text-white text-sm mb-1">{{ template.name }}</div>
                <div class="text-xs text-gray-300 line-clamp-2">{{ template.content }}</div>
              </button>
            </div>
            
            <div v-else class="text-center py-4">
              <p class="text-gray-300 text-sm">Belum ada template pesan</p>
              <button
                @click="showTemplateModal = true"
                class="mt-2 text-blue-400 hover:text-blue-300 font-medium text-sm"
              >
                Buat Template Pertama
              </button>
            </div>
          </div>
          
          <!-- Message Input -->
          <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Tulis Pesan</h3>
              <div class="text-sm text-gray-400">
                {{ messageLength }}/4096 karakter
              </div>
            </div>
            
            <div class="space-y-4">
              <!-- Text Message -->
              <div>
                <textarea
                  v-model="broadcastStore.message.content"
                  rows="8"
                  class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400"
                  placeholder="Tulis pesan broadcast Anda di sini...\n\nGunakan variabel:\n{name} - Nama kontak\n{phone} - Nomor telepon"
                  maxlength="4096"
                ></textarea>
                
                <div class="mt-2 text-xs text-gray-400">
                  <strong>Variabel yang tersedia:</strong> {name}, {phone}
                </div>
              </div>
              
              <!-- Media Attachments -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-gray-300">Media (Opsional)</label>
                  <button
                    @click="$refs.mediaInput.click()"
                    class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-300"
                  >
                    <PlusIcon class="w-4 h-4 mr-1" />
                    Tambah Media
                  </button>
                </div>
                
                <input
                  ref="mediaInput"
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                  @change="handleMediaSelect"
                  class="hidden"
                />
                
                <!-- Media Preview -->
                <div v-if="broadcastStore.message.media.length > 0" class="space-y-2">
                  <div 
                    v-for="(media, index) in broadcastStore.message.media" 
                    :key="index"
                    class="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600"
                  >
                    <div class="flex items-center space-x-3">
                      <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <DocumentIcon v-if="media.type.startsWith('application')" class="w-5 h-5 text-blue-400" />
                        <PhotoIcon v-else-if="media.type.startsWith('image')" class="w-5 h-5 text-blue-400" />
                        <VideoCameraIcon v-else-if="media.type.startsWith('video')" class="w-5 h-5 text-blue-400" />
                        <SpeakerWaveIcon v-else-if="media.type.startsWith('audio')" class="w-5 h-5 text-blue-400" />
                        <DocumentIcon v-else class="w-5 h-5 text-blue-400" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-white truncate">{{ media.name }}</div>
                        <div class="text-xs text-gray-400">{{ formatFileSize(media.size) }}</div>
                      </div>
                    </div>
                    
                    <button
                      @click="removeMedia(index)"
                      class="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                    >
                      <XMarkIcon class="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div v-else class="text-center py-6 border-2 border-dashed border-gray-600 rounded-lg">
                  <PhotoIcon class="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p class="text-sm text-gray-400">Belum ada media dipilih</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Send Button -->
          <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-300">
                  Siap mengirim ke <strong>{{ contactsStore.selectedContacts.size }}</strong> kontak
                </p>
                <p v-if="!canSendBroadcast" class="text-xs text-red-400 mt-1">
                  {{ broadcastValidationMessage }}
                </p>
              </div>
              
              <button
                @click="showConfirmation = true"
                :disabled="!canSendBroadcast"
                class="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon class="w-5 h-5 mr-2" />
                Kirim Broadcast
              </button>
            </div>
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Selected Contacts -->
          <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Penerima</h3>
              <router-link
                to="/contacts"
                class="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Kelola
              </router-link>
            </div>
            
            <div class="space-y-3">
              <!-- Stats -->
              <div class="grid grid-cols-2 gap-4">
                <div class="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div class="text-lg font-semibold text-white">{{ contactsStore.selectedContacts.size }}</div>
                  <div class="text-xs text-gray-300">Terpilih</div>
                </div>
                <div class="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div class="text-lg font-semibold text-white">{{ contactsStore.contacts.length }}</div>
                  <div class="text-xs text-gray-300">Total</div>
                </div>
              </div>
              
              <!-- Contact List -->
              <div v-if="contactsStore.selectedContacts.size > 0" class="max-h-64 overflow-y-auto space-y-2">
                <div 
                  v-for="contact in selectedContactsArray.slice(0, 10)" 
                  :key="contact.id"
                  class="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg"
                >
                  <div class="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <UserIcon class="w-4 h-4 text-gray-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-white truncate">
                      {{ contact.name || 'Tanpa Nama' }}
                    </div>
                    <div class="text-xs text-gray-300 truncate">{{ contact.phone }}</div>
                  </div>
                </div>
                
                <div v-if="contactsStore.selectedContacts.size > 10" class="text-center py-2">
                  <span class="text-xs text-gray-400">
                    +{{ contactsStore.selectedContacts.size - 10 }} kontak lainnya
                  </span>
                </div>
              </div>
              
              <div v-else class="text-center py-6">
                <UsersIcon class="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p class="text-sm text-gray-400 mb-3">Belum ada kontak terpilih</p>
                <router-link
                  to="/contacts"
                  class="text-sm text-blue-400 hover:text-blue-300 font-medium"
                >
                  Pilih Kontak
                </router-link>
              </div>
            </div>
          </div>
          
          <!-- Broadcast History -->
          <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Riwayat Terbaru</h3>

            </div>
            
            <div v-if="recentBroadcasts.length > 0" class="space-y-3">
              <div 
                v-for="broadcast in recentBroadcasts" 
                :key="broadcast.id"
                class="p-3 bg-gray-700/50 rounded-lg"
              >
                <div class="flex items-center justify-between mb-2">
                  <span 
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusClass(broadcast.status)"
                  >
                    {{ getStatusText(broadcast.status) }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ formatDate(broadcast.timestamp) }}
                  </span>
                </div>
                <p class="text-sm text-white line-clamp-2">{{ broadcast.message }}</p>
                <p class="text-xs text-gray-300 mt-1">{{ broadcast.recipients }} penerima</p>
              </div>
            </div>
            
            <div v-else class="text-center py-6">
              <SpeakerWaveIcon class="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p class="text-sm text-gray-400">Belum ada riwayat broadcast</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modals -->
    <ConfirmationModal
      :is-visible="showConfirmation"
      @confirm="handleSendBroadcast"
      @cancel="showConfirmation = false"
    />
    
    <ProgressModal />
    
    <!-- Template Modal (placeholder) -->
    <div v-if="showTemplateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h3 class="text-lg font-semibold mb-4 text-white">Template Pesan</h3>
        <p class="text-gray-300 mb-4">Fitur template akan segera hadir!</p>
        <button
          @click="showTemplateModal = false"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
    
    <!-- QR Code Modal -->
    <div v-if="showQRModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75" @click="showQRModal = false"></div>
        </div>
        
        <div class="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-700">
          <div class="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-white mb-4">
                  Scan QR Code dengan WhatsApp
                </h3>
                <div class="flex justify-center">
                  <img v-if="whatsappStore.qrCode" :src="whatsappStore.qrCode" alt="QR Code" class="max-w-full h-auto" />
                  <div v-else class="text-gray-400">QR Code tidak tersedia</div>
                </div>
                <p class="text-sm text-gray-300 mt-4 text-center">
                  Buka WhatsApp di ponsel Anda, pilih menu titik tiga > Perangkat Tertaut > Tautkan Perangkat, lalu scan QR code di atas.
                </p>
              </div>
            </div>
          </div>
          <div class="bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="showQRModal = false"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWhatsAppStore } from '../stores/whatsapp'
import { useContactsStore } from '../stores/contacts'
import { useBroadcastStore } from '../stores/broadcast'
import { useAutoRefresh } from '../composables/useAutoRefresh'
import ConfirmationModal from '../components/ConfirmationModal.vue'
import ProgressModal from '../components/ProgressModal.vue'
import {
  PlusIcon,
  PaperAirplaneIcon,
  UserIcon,
  UsersIcon,
  SpeakerWaveIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/24/outline'

// Router
const router = useRouter()

// Stores
const whatsappStore = useWhatsAppStore()
const contactsStore = useContactsStore()
const broadcastStore = useBroadcastStore()

// Reactive data
const showConfirmation = ref(false)
const showTemplateModal = ref(false)
const showQRModal = ref(false)

// Computed
const messageLength = computed(() => broadcastStore.message.content.length)

const canSendBroadcast = computed(() => broadcastStore.canSendBroadcast)

const broadcastValidationMessage = computed(() => {
  if (!whatsappStore.isReady) {
    return 'WhatsApp belum terhubung'
  }
  if (contactsStore.selectedContacts.size === 0) {
    return 'Pilih minimal 1 kontak'
  }
  if (!broadcastStore.message.content.trim() && broadcastStore.message.media.length === 0) {
    return 'Tulis pesan atau pilih media'
  }
  return ''
})

const recentBroadcasts = computed(() => {
  return broadcastStore.broadcastHistory.slice(-3).reverse()
})

const selectedContactsArray = computed(() => {
  const selectedIds = Array.from(contactsStore.selectedContacts)
  return contactsStore.contacts.filter(contact => selectedIds.includes(contact.id))
})

// Methods
function handleMediaSelect(event) {
  const files = Array.from(event.target.files)
  files.forEach(file => {
    broadcastStore.addMedia(file)
  })
  // Reset input
  event.target.value = ''
}

function removeMedia(index) {
  broadcastStore.removeMedia(index)
}

function applyTemplate(template) {
  broadcastStore.setMessage(template.content)
}

function handleSendBroadcast() {
  showConfirmation.value = false
  broadcastStore.sendBroadcast()
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusClass(status) {
  switch (status) {
    case 'completed':
      return 'bg-green-500/20 text-green-400'
    case 'failed':
      return 'bg-red-500/20 text-red-400'
    case 'partial':
      return 'bg-yellow-500/20 text-yellow-400'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
}

function getStatusText(status) {
  switch (status) {
    case 'completed':
      return 'Berhasil'
    case 'failed':
      return 'Gagal'
    case 'partial':
      return 'Sebagian'
    default:
      return 'Tidak Diketahui'
  }
}

// Auto refresh function
const refreshData = async () => {
  // Refresh WhatsApp connection if not connected
  if (!whatsappStore.isConnected && whatsappStore.connectionStatus !== 'connecting') {
    whatsappStore.connectToServer()
  }
  
  // Request contacts if ready
  if (whatsappStore.isReady) {
    whatsappStore.requestContacts()
  }
}

// Setup auto refresh (every 60 seconds)
const { isRefreshing, lastRefresh } = useAutoRefresh(refreshData, 60000)

// Lifecycle
onMounted(() => {
  // Ensure WhatsApp is connected only if not already connecting or connected
  if (!whatsappStore.isConnected && whatsappStore.connectionStatus !== 'connecting') {
    whatsappStore.connectToServer()
  }
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>