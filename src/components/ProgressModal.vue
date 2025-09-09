<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="broadcastStore.isSending"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div 
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleBackdropClick"
        ></div>
        
        <!-- Modal Content -->
        <div class="relative bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md transform">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <SpeakerWaveIcon class="w-5 h-5 text-white" />
              </div>
              <h3 class="text-lg font-semibold text-white">
                Mengirim Broadcast
              </h3>
            </div>
            
            <button
              @click="handleClose"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Progress Content -->
          <div class="p-6">
            <!-- Progress Circle -->
            <div class="flex justify-center mb-6">
              <div class="relative w-32 h-32">
                <!-- Background Circle -->
                <svg class="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="#4b5563"
                    stroke-width="8"
                    fill="transparent"
                  />
                  <!-- Progress Circle -->
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    stroke="#3b82f6"
                    stroke-width="8"
                    fill="transparent"
                    stroke-linecap="round"
                    :stroke-dasharray="circumference"
                    :stroke-dashoffset="strokeDashoffset"
                    class="transition-all duration-300 ease-out"
                  />
                </svg>
                
                <!-- Percentage Text -->
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-white">
                      {{ broadcastStore.progressPercentage }}%
                    </div>
                    <div class="text-sm text-gray-300">
                      {{ broadcastStore.progressText }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Status and Stats -->
            <div class="space-y-4">
              <!-- Current Status -->
              <div class="text-center">
                <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                     :class="statusClasses">
                  <div class="w-2 h-2 rounded-full mr-2 animate-pulse"
                       :class="statusDotClasses"></div>
                  {{ statusText }}
                </div>
              </div>
              
              <!-- Statistics -->
              <div class="grid grid-cols-3 gap-4 text-center">
                <div class="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <div class="text-lg font-semibold text-white">
                    {{ broadcastStore.sendProgress.successful.length }}
                  </div>
                  <div class="text-xs text-green-400 font-medium">Berhasil</div>
                </div>
                
                <div class="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <div class="text-lg font-semibold text-white">
                    {{ broadcastStore.sendProgress.failed.length }}
                  </div>
                  <div class="text-xs text-red-400 font-medium">Gagal</div>
                </div>
                
                <div class="bg-gray-700/50 border border-gray-600 rounded-lg p-3">
                  <div class="text-lg font-semibold text-white">
                    {{ broadcastStore.sendProgress.total }}
                  </div>
                  <div class="text-xs text-gray-300 font-medium">Total</div>
                </div>
              </div>
            </div>
            
            <!-- Recent Logs -->
            <div v-if="recentLogs.length > 0" class="mt-6">
              <h4 class="text-sm font-medium text-white mb-3">Log Terbaru</h4>
              <div class="bg-gray-700/50 border border-gray-600 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div 
                  v-for="(log, index) in recentLogs" 
                  :key="index"
                  class="text-xs text-gray-300 mb-1 last:mb-0"
                >
                  <span class="text-gray-400">{{ formatTime(log.timestamp) }}</span>
                  <span class="ml-2" :class="getLogTypeClass(log.type)">{{ log.message }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="flex justify-between items-center p-6 border-t border-gray-700">
            <button
              @click="cancelBroadcast"
              class="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Batalkan
            </button>
            
            <button
              v-if="broadcastStore.sendProgress.status === 'completed'"
              @click="handleClose"
              class="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Tutup
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
import { usePerformance } from '../composables/usePerformance'
import { SpeakerWaveIcon, XMarkIcon } from '@heroicons/vue/24/outline'

// Store
const broadcastStore = useBroadcastStore()

// Performance optimizations
const { createMemoizedComputed, createThrottled } = usePerformance()

// Constants
const circumference = 2 * Math.PI * 52 // radius = 52

// Memoized computed properties for better performance
const strokeDashoffset = createMemoizedComputed(() => {
  const progress = broadcastStore.progressPercentage
  return circumference - (progress / 100) * circumference
}, [computed(() => broadcastStore.progressPercentage)])

const statusText = createMemoizedComputed(() => {
  switch (broadcastStore.sendProgress.status) {
    case 'preparing':
      return 'Mempersiapkan...'
    case 'sending':
      return 'Mengirim pesan...'
    case 'completed':
      return 'Selesai!'
    case 'cancelled':
      return 'Dibatalkan'
    case 'error':
      return 'Terjadi kesalahan'
    default:
      return 'Memproses...'
  }
}, [computed(() => broadcastStore.sendProgress.status)])

const statusClasses = createMemoizedComputed(() => {
  switch (broadcastStore.sendProgress.status) {
    case 'completed':
      return 'bg-green-500/20 text-green-400'
    case 'error':
      return 'bg-red-500/20 text-red-400'
    case 'cancelled':
      return 'bg-yellow-500/20 text-yellow-400'
    default:
      return 'bg-blue-500/20 text-blue-400'
  }
}, [computed(() => broadcastStore.sendProgress.status)])

const statusDotClasses = createMemoizedComputed(() => {
  switch (broadcastStore.sendProgress.status) {
    case 'completed':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    case 'cancelled':
      return 'bg-yellow-500'
    default:
      return 'bg-blue-500'
  }
}, [computed(() => broadcastStore.sendProgress.status)])

const recentLogs = createMemoizedComputed(() => {
  return broadcastStore.sendProgress.logs.slice(-5).reverse()
}, [computed(() => broadcastStore.sendProgress.logs?.length || 0)])

// Throttled methods to prevent excessive calls
const handleClose = createThrottled(() => {
  if (broadcastStore.sendProgress.status === 'completed' || 
      broadcastStore.sendProgress.status === 'cancelled' ||
      broadcastStore.sendProgress.status === 'error') {
    // Allow closing only when broadcast is finished
    broadcastStore.isSending = false
  }
}, 300)

const handleBackdropClick = createThrottled(() => {
  // Prevent closing by clicking backdrop during active broadcast
  if (broadcastStore.sendProgress.status === 'completed' || 
      broadcastStore.sendProgress.status === 'cancelled' ||
      broadcastStore.sendProgress.status === 'error') {
    handleClose()
  }
}, 300)

const cancelBroadcast = createThrottled(() => {
  if (confirm('Yakin ingin membatalkan broadcast yang sedang berjalan?')) {
    broadcastStore.cancelBroadcast()
  }
}, 500)

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getLogTypeClass(type) {
  switch (type) {
    case 'success':
      return 'text-green-400'
    case 'error':
      return 'text-red-400'
    case 'warning':
      return 'text-yellow-400'
    default:
      return 'text-gray-300'
  }
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

/* Custom scrollbar for logs */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #374151;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #6b7280;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>