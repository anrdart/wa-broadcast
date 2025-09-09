<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Pengaturan</h1>
              <p class="mt-1 text-sm text-gray-300">
                Kelola konfigurasi aplikasi dan preferensi Anda
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="space-y-8">
        <!-- WhatsApp Connection Settings -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
          <div class="p-6 border-b border-gray-700/30">
            <h3 class="text-lg font-semibold text-white">Koneksi WhatsApp</h3>
            <p class="mt-1 text-sm text-gray-300">Kelola koneksi dan autentikasi WhatsApp</p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Connection Status -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Status Koneksi</label>
                <div class="flex items-center mt-1">
                  <div 
                    class="w-3 h-3 rounded-full mr-2"
                    :class="whatsappStore.isReady ? 'bg-green-500' : 'bg-red-500'"
                  ></div>
                  <span class="text-sm" :class="whatsappStore.isReady ? 'text-green-400' : 'text-red-400'">
                    {{ whatsappStore.statusText }}
                  </span>
                </div>
              </div>
              
              <div class="flex items-center space-x-3">
                <button
                  v-if="whatsappStore.isConnected"
                  @click="whatsappStore.logout()"
                  class="px-4 py-2 text-red-400 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Logout
                </button>
                <button
                  v-else
                  @click="whatsappStore.connectToServer()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Hubungkan
                </button>
              </div>
            </div>
            
            <!-- Server Configuration -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">Backend Server URL</label>
                <input
                  v-model="settings.backendUrl"
                  type="url"
                  class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="http://localhost:3000"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">WebSocket URL</label>
                <input
                  v-model="settings.websocketUrl"
                  type="url"
                  class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="ws://localhost:3000"
                />
              </div>
            </div>
            
            <!-- Auto Reconnect -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Auto Reconnect</label>
                <p class="text-xs text-gray-400 mt-1">Otomatis mencoba menghubungkan kembali jika koneksi terputus</p>
              </div>
              <button
                @click="settings.autoReconnect = !settings.autoReconnect"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.autoReconnect ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-gray-200 transition-transform"
                  :class="settings.autoReconnect ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Broadcast Settings -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
          <div class="p-6 border-b border-gray-700/30">
            <h3 class="text-lg font-semibold text-white">Pengaturan Broadcast</h3>
            <p class="mt-1 text-sm text-gray-300">Konfigurasi pengiriman pesan broadcast</p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Message Delay -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Jeda Antar Pesan (detik)
              </label>
              <div class="flex items-center space-x-4">
                <input
                  v-model.number="settings.messageDelay"
                  type="range"
                  min="1"
                  max="10"
                  class="flex-1"
                />
                <span class="text-sm font-medium text-white w-12">{{ settings.messageDelay }}s</span>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Jeda waktu antara pengiriman pesan untuk menghindari spam detection
              </p>
            </div>
            
            <!-- Batch Size -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Ukuran Batch
              </label>
              <select
                v-model="settings.batchSize"
                class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="10">10 pesan per batch</option>
                <option value="25">25 pesan per batch</option>
                <option value="50">50 pesan per batch</option>
                <option value="100">100 pesan per batch</option>
              </select>
              <p class="text-xs text-gray-400 mt-1">
                Jumlah pesan yang dikirim dalam satu batch sebelum jeda
              </p>
            </div>
            
            <!-- Retry Failed Messages -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Retry Pesan Gagal</label>
                <p class="text-xs text-gray-400 mt-1">Otomatis mencoba ulang pesan yang gagal dikirim</p>
              </div>
              <button
                @click="settings.retryFailedMessages = !settings.retryFailedMessages"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.retryFailedMessages ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-gray-200 transition-transform"
                  :class="settings.retryFailedMessages ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
            
            <!-- Max Retry Attempts -->
            <div v-if="settings.retryFailedMessages">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Maksimal Percobaan Ulang
              </label>
              <select
                v-model="settings.maxRetryAttempts"
                class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="1">1 kali</option>
                <option value="2">2 kali</option>
                <option value="3">3 kali</option>
                <option value="5">5 kali</option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Notification Settings -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
          <div class="p-6 border-b border-gray-700/30">
            <h3 class="text-lg font-semibold text-white">Notifikasi</h3>
            <p class="mt-1 text-sm text-gray-300">Kelola notifikasi dan peringatan</p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Browser Notifications -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Notifikasi Browser</label>
                <p class="text-xs text-gray-400 mt-1">Tampilkan notifikasi desktop untuk update penting</p>
              </div>
              <button
                @click="toggleBrowserNotifications"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.browserNotifications ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-gray-200 transition-transform"
                  :class="settings.browserNotifications ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
            
            <!-- Sound Notifications -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Notifikasi Suara</label>
                <p class="text-xs text-gray-400 mt-1">Putar suara saat broadcast selesai</p>
              </div>
              <button
                @click="settings.soundNotifications = !settings.soundNotifications"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.soundNotifications ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-gray-200 transition-transform"
                  :class="settings.soundNotifications ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
            
            <!-- Email Notifications -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Notifikasi Email</label>
                <p class="text-xs text-gray-400 mt-1">Kirim laporan broadcast via email</p>
              </div>
              <button
                @click="settings.emailNotifications = !settings.emailNotifications"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-gray-200 transition-transform"
                  :class="settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
            
            <!-- Email Address -->
            <div v-if="settings.emailNotifications">
              <label class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                v-model="settings.notificationEmail"
                type="email"
                class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="your@email.com"
              />
            </div>
          </div>
        </div>
        
        <!-- Data Management -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
          <div class="p-6 border-b border-gray-700/30">
            <h3 class="text-lg font-semibold text-white">Manajemen Data</h3>
            <p class="mt-1 text-sm text-gray-300">Kelola data aplikasi dan riwayat</p>
          </div>
          
          <div class="p-6 space-y-6">
            <!-- Auto Backup -->
            <div class="flex items-center justify-between">
              <div>
                <label class="text-sm font-medium text-gray-300">Auto Backup</label>
                <p class="text-xs text-gray-400 mt-1">Otomatis backup data kontak dan template</p>
              </div>
              <button
                @click="settings.autoBackup = !settings.autoBackup"
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                :class="settings.autoBackup ? 'bg-blue-600' : 'bg-gray-600'"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-gray-200 transition-transform"
                  :class="settings.autoBackup ? 'translate-x-6' : 'translate-x-1'"
                ></span>
              </button>
            </div>
            
            <!-- Data Retention -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Penyimpanan Riwayat Broadcast
              </label>
              <select
                v-model="settings.dataRetentionDays"
                class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="30">30 hari</option>
                <option value="90">90 hari</option>
                <option value="180">6 bulan</option>
                <option value="365">1 tahun</option>
                <option value="-1">Selamanya</option>
              </select>
              <p class="text-xs text-gray-400 mt-1">
                Riwayat broadcast lama akan dihapus otomatis
              </p>
            </div>
            
            <!-- Data Actions -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                @click="exportAllData"
                class="flex items-center justify-center px-4 py-3 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
              >
                <ArrowDownTrayIcon class="w-5 h-5 mr-2" />
                Export Data
              </button>
              
              <button
                @click="$refs.importInput.click()"
                class="flex items-center justify-center px-4 py-3 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
              >
                <ArrowUpTrayIcon class="w-5 h-5 mr-2" />
                Import Data
              </button>
              
              <button
                @click="clearAllData"
                class="flex items-center justify-center px-4 py-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                <TrashIcon class="w-5 h-5 mr-2" />
                Hapus Semua Data
              </button>
            </div>
            
            <input
              ref="importInput"
              type="file"
              accept=".json"
              @change="importData"
              class="hidden"
            />
          </div>
        </div>
        
        <!-- About -->
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
          <div class="p-6 border-b border-gray-700/30">
            <h3 class="text-lg font-semibold text-white">Tentang Aplikasi</h3>
          </div>
          
          <div class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Versi Aplikasi</label>
                <p class="text-sm text-white">2.0.0</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Framework</label>
                <p class="text-sm text-white">Vue.js 3 + Vite</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">WhatsApp Library</label>
                <p class="text-sm text-white">whatsapp-web.js</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Last Updated</label>
                <p class="text-sm text-white">{{ new Date().toLocaleDateString('id-ID') }}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Save Button -->
        <div class="flex items-center justify-end space-x-4">
          <button
            @click="resetSettings"
            class="px-6 py-3 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 border border-gray-600 transition-colors"
          >
            Reset ke Default
          </button>
          <button
            @click="saveSettings"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useWhatsAppStore } from '../stores/whatsapp'
import { useContactsStore } from '../stores/contacts'
import { useBroadcastStore } from '../stores/broadcast'
import { useToast } from 'vue-toastification'
import { useAutoRefresh } from '../composables/useAutoRefresh'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'

// Stores and Toast
const whatsappStore = useWhatsAppStore()
const contactsStore = useContactsStore()
const broadcastStore = useBroadcastStore()
const toast = useToast()

// Settings
const settings = reactive({
  // WhatsApp Connection
  backendUrl: 'http://localhost:3000',
  websocketUrl: 'ws://localhost:3000',
  autoReconnect: true,
  
  // Broadcast Settings
  messageDelay: 3,
  batchSize: 25,
  retryFailedMessages: true,
  maxRetryAttempts: 2,
  
  // Notifications
  browserNotifications: false,
  soundNotifications: true,
  emailNotifications: false,
  notificationEmail: '',
  
  // Data Management
  autoBackup: true,
  dataRetentionDays: 90
})

// Methods
function toggleBrowserNotifications() {
  if (!settings.browserNotifications && 'Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        settings.browserNotifications = true
        toast.success('Notifikasi browser diaktifkan')
      } else {
        toast.error('Izin notifikasi browser ditolak')
      }
    })
  } else {
    settings.browserNotifications = !settings.browserNotifications
  }
}

function saveSettings() {
  // Save to localStorage
  localStorage.setItem('wa-broadcast-settings', JSON.stringify(settings))
  
  // Apply settings to stores if needed
  if (whatsappStore.backendUrl !== settings.backendUrl) {
    whatsappStore.backendUrl = settings.backendUrl
  }
  if (whatsappStore.websocketUrl !== settings.websocketUrl) {
    whatsappStore.websocketUrl = settings.websocketUrl
  }
  
  toast.success('Pengaturan berhasil disimpan')
}

function resetSettings() {
  if (confirm('Apakah Anda yakin ingin mereset semua pengaturan ke default?')) {
    Object.assign(settings, {
      backendUrl: 'http://localhost:3000',
      websocketUrl: 'ws://localhost:3000',
      autoReconnect: true,
      messageDelay: 3,
      batchSize: 25,
      retryFailedMessages: true,
      maxRetryAttempts: 2,
      browserNotifications: false,
      soundNotifications: true,
      emailNotifications: false,
      notificationEmail: '',
      autoBackup: true,
      dataRetentionDays: 90
    })
    
    localStorage.removeItem('wa-broadcast-settings')
    toast.success('Pengaturan berhasil direset')
  }
}

function exportAllData() {
  const data = {
    contacts: contactsStore.contacts,
    templates: broadcastStore.messageTemplates,
    broadcastHistory: broadcastStore.broadcastHistory,
    settings: settings,
    exportDate: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wa-broadcast-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  toast.success('Data berhasil diexport')
}

function importData(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      
      if (confirm('Import data akan mengganti semua data yang ada. Lanjutkan?')) {
        // Import contacts
        if (data.contacts) {
          contactsStore.contacts = data.contacts
        }
        
        // Import templates
        if (data.templates) {
          broadcastStore.messageTemplates = data.templates
        }
        
        // Import broadcast history
        if (data.broadcastHistory) {
          broadcastStore.broadcastHistory = data.broadcastHistory
        }
        
        // Import settings
        if (data.settings) {
          Object.assign(settings, data.settings)
        }
        
        toast.success('Data berhasil diimport')
      }
    } catch (error) {
      toast.error('File tidak valid atau rusak')
    }
  }
  
  reader.readAsText(file)
  event.target.value = ''
}

function clearAllData() {
  if (confirm('Apakah Anda yakin ingin menghapus SEMUA data? Tindakan ini tidak dapat dibatalkan!')) {
    if (confirm('Konfirmasi sekali lagi: Hapus semua kontak, template, dan riwayat broadcast?')) {
      contactsStore.contacts = []
      broadcastStore.messageTemplates = []
      broadcastStore.broadcastHistory = []
      
      // Clear localStorage
      localStorage.removeItem('wa-broadcast-contacts')
      localStorage.removeItem('wa-broadcast-templates')
      localStorage.removeItem('wa-broadcast-history')
      
      toast.success('Semua data berhasil dihapus')
    }
  }
}

// Auto refresh function
const refreshData = async () => {
  // Refresh WhatsApp connection status
  if (!whatsappStore.isConnected) {
    whatsappStore.connectToServer()
  }
}

// Setup auto refresh (every 120 seconds for settings page)
const { isRefreshing, lastRefresh } = useAutoRefresh(refreshData, 120000)

// Load settings on mount
onMounted(() => {
  const savedSettings = localStorage.getItem('wa-broadcast-settings')
  if (savedSettings) {
    try {
      Object.assign(settings, JSON.parse(savedSettings))
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }
})
</script>