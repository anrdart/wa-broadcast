<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Kelola Kontak</h1>
              <p class="mt-1 text-sm text-gray-300">
                Import, edit, dan kelola daftar kontak untuk broadcast
              </p>
            </div>
            
            <!-- Action Buttons -->
            <div class="mt-4 sm:mt-0 flex space-x-3">
              <button
                @click="showImportModal = true"
                class="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 transition-colors"
              >
                <ArrowUpTrayIcon class="w-4 h-4 mr-2" />
                Import CSV
              </button>
              
              <button
                @click="exportContacts"
                :disabled="contactsStore.contacts.length === 0"
                class="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
                Export CSV
              </button>
              
              <button
                @click="showAddModal = true"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon class="w-4 h-4 mr-2" />
                Tambah Kontak
              </button>
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
              Untuk memuat kontak WhatsApp, silakan hubungkan WhatsApp terlebih dahulu.
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


      
      <!-- Stats and Search -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6 mb-8">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <!-- Stats -->
          <div class="flex items-center space-x-8">
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{{ contactsStore.contacts.length }}</div>
              <div class="text-sm text-gray-300">Total Kontak</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-400">{{ contactsStore.selectedContacts.size }}</div>
              <div class="text-sm text-gray-300">Terpilih</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ filteredContacts.length }}</div>
              <div class="text-sm text-gray-300">Ditampilkan</div>
            </div>
          </div>
          
          <!-- Search and Filter -->
            <div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <!-- Search -->
              <div class="relative">
                <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  :value="contactsStore.searchQuery"
                  @input="handleSearchInput"
                  type="text"
                  placeholder="Cari kontak..."
                  class="pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 text-white placeholder-gray-400"
                />
              </div>
              
              <!-- Filter -->
              <select
                v-model="contactsStore.filterBy"
                class="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="all">Semua Kontak</option>
                <option value="selected">Kontak Terpilih</option>
                <option value="unselected">Belum Terpilih</option>
              </select>
              
              <!-- Reload Button -->
              <button
                @click="refreshContacts"
                :disabled="isRefreshing"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': isRefreshing }" />
                {{ isRefreshing ? 'Memuat...' : 'Reload' }}
              </button>
            </div>
        </div>
        
        <!-- Bulk Actions -->
        <div v-if="contactsStore.selectedContacts.size > 0" class="mt-4 pt-4 border-t border-gray-700/30">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-300">
              {{ contactsStore.selectedContacts.size }} kontak terpilih
            </span>
            
            <div class="flex space-x-2">
              <button
                @click="selectAllFiltered"
                class="text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                Pilih Semua
              </button>
              <button
                @click="deselectAll"
                class="text-sm text-gray-300 hover:text-gray-200 font-medium"
              >
                Batal Pilih
              </button>
              <button
                @click="deleteSelected"
                class="text-sm text-red-400 hover:text-red-300 font-medium"
              >
                Hapus Terpilih
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Contacts List -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
        <!-- Table Header -->
        <div class="px-6 py-4 border-b border-gray-700/30">
          <div class="flex items-center">
            <div class="flex items-center">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll"
                class="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <label class="ml-3 text-sm font-medium text-white">
                Pilih Semua
              </label>
            </div>
          </div>
        </div>
        
        <!-- Virtual Contact List -->
        <div class="h-96">
          <VirtualContactList
            v-memo="[filteredContacts.length, selectedContacts.size]"
            :contacts="filteredContacts"
            :selected-contacts="selectedContacts"
            :height="384"
            @toggle-select="toggleContactSelection"
            @edit="editContact"
            @delete="deleteContact"
          />
          
          <!-- Empty State -->
          <div v-if="filteredContacts.length === 0" class="px-6 py-12 text-center">
            <UsersIcon class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-300 mb-4">
              {{ contactsStore.searchQuery ? 'Tidak ada kontak yang cocok dengan pencarian' : 'Belum ada kontak' }}
            </p>
            <button
              v-if="!contactsStore.searchQuery"
              @click="showAddModal = true"
              class="text-blue-400 hover:text-blue-300 font-medium"
            >
              Tambah Kontak Pertama
            </button>
          </div>
        </div>
        
        <!-- Pagination -->
        <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-700/30">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-300">
              Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredContacts.length) }} dari {{ filteredContacts.length }} kontak
            </div>
            
            <div class="flex space-x-2">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-1 text-sm border border-gray-600 rounded text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              
              <span class="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                {{ currentPage }}
              </span>
              
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 text-sm border border-gray-600 rounded text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Contact Modal -->
    <ContactModal
      :is-visible="showAddModal || showEditModal"
      :contact="editingContact"
      @save="handleSaveContact"
      @cancel="handleCancelModal"
    />
    
    <!-- Import CSV Modal -->
    <CsvImportModal
      :is-visible="showImportModal"
      @import="handleImportContacts"
      @cancel="showImportModal = false"
    />
    
    <!-- QR Code Modal -->
    <div v-if="showQRModal" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 opacity-75" @click="showQRModal = false"></div>
        </div>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Scan QR Code dengan WhatsApp
                </h3>
                <div class="flex justify-center">
                  <img v-if="whatsappStore.qrCode" :src="whatsappStore.qrCode" alt="QR Code" class="max-w-full h-auto" />
                  <div v-else class="text-gray-500">QR Code tidak tersedia</div>
                </div>
                <p class="text-sm text-gray-600 mt-4 text-center">
                  Buka WhatsApp di ponsel Anda, pilih menu titik tiga > Perangkat Tertaut > Tautkan Perangkat, lalu scan QR code di atas.
                </p>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="showQRModal = false"
              type="button"
              class="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
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
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent, nextTick } from 'vue'
import { useContactsStore } from '../stores/contacts'
import { useWhatsAppStore } from '../stores/whatsapp'
import { useDeviceStore } from '../stores/device'
import { usePerformance } from '../composables/usePerformance'
import { useAutoRefresh } from '../composables/useAutoRefresh'
import socketService from '@/services/socketService'
import VirtualContactList from '../components/VirtualContactList.vue'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

// Lazy load heavy components
const ContactModal = defineAsyncComponent(() => import('../components/ContactModal.vue'))
const CsvImportModal = defineAsyncComponent(() => import('../components/CsvImportModal.vue'))

// Stores
const contactsStore = useContactsStore()
const whatsappStore = useWhatsAppStore()
const deviceStore = useDeviceStore()

// Performance optimizations
const { 
  createDebounced, 
  createMemoizedComputed, 
  createShallowReactive 
} = usePerformance()

// Reactive data
const showAddModal = ref(false)
const showEditModal = ref(false)
const showImportModal = ref(false)
const showQRModal = ref(false)
const editingContact = createShallowReactive(null)
const currentPage = ref(1)
const itemsPerPage = ref(20)

// Memoized computed properties for better performance
const filteredContacts = createMemoizedComputed(() => {
  // Apply filtering logic locally instead of using store's computed property
  let filtered = contactsStore.contacts
  
  // Filter by search query
  if (contactsStore.searchQuery) {
    const query = contactsStore.searchQuery.toLowerCase()
    filtered = filtered.filter(contact => 
      contact.name?.toLowerCase().includes(query) ||
      contact.number?.includes(query) ||
      contact.pushname?.toLowerCase().includes(query)
    )
  }
  
  // Filter by type based on filterOptions
  filtered = filtered.filter(contact => {
    if (contact.source === 'saved' && !contactsStore.filterOptions.showSaved) return false
    if (contact.source === 'csv' && !contactsStore.filterOptions.showCsv) return false
    if (contact.source === 'whatsapp' && !contactsStore.filterOptions.showWhatsapp) return false
    if (contact.isGroup && !contactsStore.filterOptions.showGroups) return false
    return true
  })
  
  // Apply filterBy (selection filter)
  if (contactsStore.filterBy === 'selected') {
    filtered = filtered.filter(contact => contactsStore.selectedContacts.has(contact.id))
  } else if (contactsStore.filterBy === 'unselected') {
    filtered = filtered.filter(contact => !contactsStore.selectedContacts.has(contact.id))
  }
  
  return filtered
}, [
  computed(() => contactsStore.contacts.length),
  computed(() => contactsStore.searchQuery),
  // Depend on explicit flags instead of the whole object reference
  computed(() => `${contactsStore.filterOptions.showSaved}-${contactsStore.filterOptions.showCsv}-${contactsStore.filterOptions.showWhatsapp}-${contactsStore.filterOptions.showGroups}`),
  computed(() => contactsStore.filterBy),
  computed(() => contactsStore.selectedContacts.size)
])

const selectedContacts = computed(() => contactsStore.selectedContacts)

const paginatedContacts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredContacts.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredContacts.value.length / itemsPerPage.value)
})

const isAllSelected = computed(() => {
  return filteredContacts.value.length > 0 && 
         filteredContacts.value.every(contact => contactsStore.selectedContacts.has(contact.id))
})

// Methods
function toggleContactSelection(contact) {
  contactsStore.toggleContactSelection(contact.id)
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    deselectAll()
  } else {
    selectAllFiltered()
  }
}



function selectAllFiltered() {
  filteredContacts.value.forEach(contact => {
    if (!contactsStore.selectedContacts.has(contact.id)) {
      contactsStore.toggleContactSelection(contact.id)
    }
  })
}

function deselectAll() {
  contactsStore.clearSelection()
}

// Debounced search function
const debouncedSearch = createDebounced((query) => {
  contactsStore.setSearchQuery(query)
}, 300)

// Optimized event handlers
const handleSearchInput = (event) => {
  debouncedSearch(event.target.value)
}

function editContact(contact) {
  editingContact.value = { ...contact }
  showEditModal.value = true
}

// Refresh contacts from WhatsApp API
async function refreshContacts() {
  try {
    if (whatsappStore.isReady) {
      await whatsappStore.refreshContacts()
    } else {
      whatsappStore.connectToServer()
    }
  } catch (error) {
    console.error('Error refreshing contacts:', error)
  }
}

function deleteContact(contact) {
  if (confirm(`Yakin ingin menghapus kontak ${contact.name || contact.phone}?`)) {
    contactsStore.removeContact(contact.id)
  }
}

// Optimized bulk operations
const handleBulkDelete = createDebounced(() => {
  const idsToDelete = Array.from(selectedContacts.value)
  if (idsToDelete.length > 0 && confirm(`Yakin ingin menghapus ${idsToDelete.length} kontak?`)) {
    contactsStore.removeMultipleContacts(idsToDelete)
  }
}, 100)

const handleBulkExport = createDebounced(() => {
  const idsToExport = Array.from(selectedContacts.value)
  if (idsToExport.length > 0) {
    contactsStore.exportContacts(idsToExport)
  }
}, 100)

function deleteSelected() {
  const selectedIds = Array.from(contactsStore.selectedContacts)
  if (confirm(`Yakin ingin menghapus ${selectedIds.length} kontak terpilih?`)) {
    selectedIds.forEach(contactId => {
      contactsStore.removeContact(contactId)
    })
    contactsStore.clearSelection()
  }
}

function handleSaveContact(contactData) {
  if (editingContact.value) {
    // Update existing contact
    contactsStore.updateContact(editingContact.value.id, contactData)
  } else {
    // Add new contact
    contactsStore.addContact(contactData)
  }
  handleCancelModal()
}

function handleCancelModal() {
  showAddModal.value = false
  showEditModal.value = false
  editingContact.value = null
}

function handleImportContacts(data) {
  // data contains { file, filterOptions }
  contactsStore.importFromCsv(data.file, data.filterOptions)
  showImportModal.value = false
}

function exportContacts() {
  contactsStore.exportToCSV()
}

// Request WhatsApp contacts using whatsapp-web.js backend
console.log('Requesting WhatsApp contacts from backend...')
whatsappStore.loadContacts()

// Auto-refresh interval
const refreshInterval = ref(null)

// Auto-refresh contacts every 30 seconds when WhatsApp is ready
watch(
  () => whatsappStore.isReady,
  (isReady) => {
    if (isReady) {
      console.log('WhatsApp ready, starting auto-refresh')
      whatsappStore.loadContacts()
      
      // Set up auto-refresh
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
      }
      
      refreshInterval.value = setInterval(() => {
        if (whatsappStore.isReady) {
          console.log('Auto-refreshing contacts...')
          whatsappStore.loadContacts()
        }
      }, 30000) // 30 seconds
    } else {
      // Clear auto-refresh when not ready
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
        refreshInterval.value = null
      }
    }
  },
  { immediate: true }
)

// Listen for contacts updates via WebSocket
const setupContactsListener = () => {
  socketService.on('contacts-updated', (contacts) => {
    console.log('👥 Contacts updated in Contacts view:', contacts.length)
    // Refresh contacts when updated
    if (whatsappStore.isReady) {
      whatsappStore.loadContacts()
    }
  })
}

// Setup listener on mount
setupContactsListener()

// Watch for WhatsApp ready state changes
watch(() => whatsappStore.isReady, (isReady) => {
  if (isReady) {
    console.log('WhatsApp is ready, requesting contacts...')
    // Small delay to ensure connection is stable
    setTimeout(() => {
      requestWhatsAppContacts()
    }, 1000)
    showQRModal.value = false
  }
})

// Watch for WhatsApp contacts changes to auto-load
watch(() => whatsappStore.whatsappContacts.length, (newLength, oldLength) => {
  if (newLength > 0 && contactsStore.contacts.length === 0) {
    contactsStore.loadContactsFromWhatsApp(whatsappStore.whatsappContacts)
  }
})

// Watch for QR code changes to show/hide modal
watch(() => whatsappStore.qrCode, (newQr) => {
  showQRModal.value = !!newQr
})

// Watch for authentication to hide modal
watch(() => whatsappStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    showQRModal.value = false
  }
})

// Auto refresh function
const refreshData = async () => {
  // Request WhatsApp contacts if ready
  if (whatsappStore.isReady) {
    requestWhatsAppContacts()
  }
  
  // Refresh WhatsApp connection if not connected
  if (!whatsappStore.isConnected) {
    whatsappStore.connectToServer()
  }
}

// Refresh contacts function already defined above as async function refreshContacts()

// Setup auto refresh (every 45 seconds)
const { isRefreshing, lastRefresh } = useAutoRefresh(refreshData, 45000)

// Watch for contacts changes
watch(() => contactsStore.contacts.length, (newLength, oldLength) => {
  // Current contacts refreshed
}, { immediate: true })

// Watch for WhatsApp ready state
watch(() => whatsappStore.isReady, (isReady) => {
  if (isReady) {
    requestWhatsAppContacts()
  }
})

// Lifecycle
onMounted(async () => {
  
  // Setup realtime subscription for contacts
  const deviceId = deviceStore.deviceId
  if (deviceId) {
    console.log('🔄 Setting up realtime subscription for device:', deviceId)
    contactsStore.setupRealtimeSubscription(deviceId)
  }
  
  // Reset pagination when filters change
  currentPage.value = 1
  
  // Auto-load WhatsApp contacts if available in store
  if (whatsappStore.whatsappContacts.length > 0 && contactsStore.contacts.length === 0) {
    contactsStore.loadContactsFromWhatsApp(whatsappStore.whatsappContacts)
  }
  
  // Request WhatsApp contacts if ready but no contacts in store
  if (whatsappStore.isReady && whatsappStore.whatsappContacts.length === 0) {
    setTimeout(() => {
      requestWhatsAppContacts()
    }, 500)
  }
  
  // Auto-connect if not connected
  if (!whatsappStore.isConnected) {
    whatsappStore.connectToServer()
  }
  
  // Force load contacts if ready
  whatsappStore.loadContacts()
})

// Cleanup on unmount
onUnmounted(() => {
  console.log('🔄 Cleaning up realtime subscription')
  contactsStore.cleanupRealtimeSubscription()
})
</script>