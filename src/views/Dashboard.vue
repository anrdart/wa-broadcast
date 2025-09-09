<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Dashboard</h1>
              <p class="mt-1 text-sm text-gray-300">
                Kelola broadcast WhatsApp Anda dengan mudah
              </p>
            </div>
            
            <!-- Connection Status -->
            <div class="flex items-center space-x-4">
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
    </div>
    
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Total Contacts -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <UsersIcon class="w-6 h-6 text-blue-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-300">Total Kontak</p>
              <p class="text-2xl font-bold text-white">{{ contactsStore.contacts.length }}</p>
            </div>
          </div>
        </div>
        
        <!-- Selected Contacts -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircleIcon class="w-6 h-6 text-green-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-300">Kontak Terpilih</p>
              <p class="text-2xl font-bold text-white">{{ contactsStore.selectedContacts.size }}</p>
            </div>
          </div>
        </div>
        
        <!-- Total Broadcasts -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <SpeakerWaveIcon class="w-6 h-6 text-purple-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-300">Total Broadcast</p>
              <p class="text-2xl font-bold text-white">{{ broadcastStore.broadcastHistory.length }}</p>
            </div>
          </div>
        </div>
        
        <!-- Success Rate -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon class="w-6 h-6 text-yellow-400" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-300">Tingkat Berhasil</p>
              <p class="text-2xl font-bold text-white">{{ successRate }}%</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Quick Broadcast -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Broadcast Cepat</h3>
            <PaperAirplaneIcon class="w-5 h-5 text-gray-400" />
          </div>
          
          <div class="space-y-4">
            <!-- Message Input -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Pesan
              </label>
              <textarea
                v-model="quickMessage"
                rows="3"
                class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400"
                placeholder="Tulis pesan broadcast..."
              ></textarea>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex space-x-3">
              <button
                @click="goToBroadcast"
                class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Buat Broadcast
              </button>
              <button
                @click="goToContacts"
                class="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                Kelola Kontak
              </button>
            </div>
          </div>
        </div>
        
        <!-- Connection Status -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Status Koneksi</h3>
            <div 
              class="w-3 h-3 rounded-full"
              :class="whatsappStore.isReady ? 'bg-green-500' : 'bg-red-500'"
            ></div>
          </div>
          
          <!-- QR Code Section -->
          <div v-if="!whatsappStore.isAuthenticated && whatsappStore.qrCode" class="text-center">
            <div class="mb-4">
              <div class="inline-block p-4 bg-gray-700/50 border-2 border-gray-600 rounded-lg">
                <img :src="whatsappStore.qrCode" alt="QR Code" class="w-48 h-48" />
              </div>
            </div>
            <p class="text-sm text-gray-300">
              Scan QR code dengan WhatsApp di ponsel Anda
            </p>
          </div>
          
          <!-- Connected State -->
          <div v-else-if="whatsappStore.isReady" class="text-center">
            <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon class="w-8 h-8 text-green-400" />
            </div>
            <p class="text-sm text-gray-300 mb-4">
              WhatsApp terhubung dan siap digunakan
            </p>
            <button
              @click="whatsappStore.logout"
              class="text-sm text-red-400 hover:text-red-300 font-medium"
            >
              Logout
            </button>
          </div>
          
          <!-- Connecting State -->
          <div v-else class="text-center">
            <div class="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div class="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p class="text-sm text-gray-300">
              Menyambung...
            </p>
          </div>
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
        <div class="p-6 border-b border-gray-700/30">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">Aktivitas Terbaru</h3>

          </div>
        </div>
        
        <div class="p-6">
          <!-- Recent Broadcasts -->
          <div v-if="recentBroadcasts.length > 0" class="space-y-4">
            <div 
              v-for="broadcast in recentBroadcasts" 
              :key="broadcast.id"
              class="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
            >
              <div class="flex items-center space-x-4">
                <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <SpeakerWaveIcon class="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p class="font-medium text-white">{{ broadcast.message.substring(0, 50) }}...</p>
                  <p class="text-sm text-gray-300">
                    {{ formatDate(broadcast.timestamp) }} • {{ broadcast.recipients }} penerima
                  </p>
                </div>
              </div>
              <div class="text-right">
                <div class="flex items-center space-x-2">
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusClass(broadcast.status)"
                  >
                    {{ getStatusText(broadcast.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div v-else class="text-center py-8">
            <SpeakerWaveIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-300">Belum ada broadcast yang dikirim</p>
            <button
              @click="goToBroadcast"
              class="mt-4 text-blue-400 hover:text-blue-300 font-medium"
            >
              Buat Broadcast Pertama
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWhatsAppStore } from '../stores/whatsapp'
import { useContactsStore } from '../stores/contacts'
import { useBroadcastStore } from '../stores/broadcast'
import { useDeviceStore } from '../stores/device'
import { useAutoRefresh } from '../composables/useAutoRefresh'
import {
  UsersIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'

// Router
const router = useRouter()

// Store instances
const whatsappStore = useWhatsAppStore()
const contactsStore = useContactsStore()
const broadcastStore = useBroadcastStore()
const deviceStore = useDeviceStore()

// Reactive data
const quickMessage = ref('')

// Computed
const successRate = computed(() => {
  const broadcasts = broadcastStore.broadcastHistory
  if (broadcasts.length === 0) return 0
  
  const successful = broadcasts.filter(b => b.status === 'completed').length
  return Math.round((successful / broadcasts.length) * 100)
})

const recentBroadcasts = computed(() => {
  return broadcastStore.broadcastHistory
    .slice(-5)
    .reverse()
})

// Methods
function goToBroadcast() {
  if (quickMessage.value.trim()) {
    broadcastStore.setMessage(quickMessage.value.trim())
  }
  router.push('/broadcast')
}

function goToContacts() {
  router.push('/contacts')
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
      return 'bg-green-100 text-green-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
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
  // Refresh WhatsApp connection status
  if (!whatsappStore.isConnected) {
    whatsappStore.connectToServer()
  }
  
  // Request contacts if ready
  if (whatsappStore.isReady) {
    whatsappStore.requestContacts()
  }
}

// Setup auto refresh (every 30 seconds)
const { isRefreshing, lastRefresh } = useAutoRefresh(refreshData, 30000)

// Lifecycle
onMounted(async () => {
  // Connect to WhatsApp if not already connected
  if (!whatsappStore.isConnected) {
    whatsappStore.connectToServer()
  }
  
  // Load broadcast history
  await broadcastStore.getBroadcastHistory()
  
  // Setup realtime subscription for broadcast
  if (deviceStore.deviceId) {
    broadcastStore.setupRealtimeSubscription(deviceStore.deviceId)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  broadcastStore.cleanupRealtimeSubscription()
})
</script>