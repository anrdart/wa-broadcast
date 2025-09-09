<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Penjadwalan Broadcast</h1>
              <p class="mt-1 text-sm text-gray-300">
                Atur waktu pengiriman broadcast untuk masa depan
              </p>
            </div>
            
            <button
              @click="showScheduleModal = true"
              class="inline-flex items-center px-4 py-2 bg-whatsapp-500 text-white font-medium rounded-lg hover:bg-whatsapp-600 transition-colors"
            >
              <PlusIcon class="w-5 h-5 mr-2" />
              Jadwalkan Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ClockIcon class="w-6 h-6 text-blue-400" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-white">{{ pendingSchedules }}</div>
              <div class="text-sm text-gray-300">Menunggu Eksekusi</div>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircleIcon class="w-6 h-6 text-green-400" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-white">{{ completedSchedules }}</div>
              <div class="text-sm text-gray-300">Berhasil Dieksekusi</div>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <XCircleIcon class="w-6 h-6 text-red-400" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-white">{{ failedSchedules }}</div>
              <div class="text-sm text-gray-300">Gagal Dieksekusi</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30 p-6 mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div class="flex items-center space-x-4">
            <div class="relative">
              <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="searchQuery"
                @input="handleSearchInput"
                type="text"
                placeholder="Cari jadwal..."
                class="pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              v-model="selectedStatus"
              class="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Status</option>
              <option value="pending">Menunggu</option>
              <option value="completed">Selesai</option>
              <option value="failed">Gagal</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
            
            <select
              v-model="sortBy"
              class="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="scheduledAt">Waktu Jadwal</option>
              <option value="createdAt">Tanggal Dibuat</option>
              <option value="message">Pesan</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Scheduled Broadcasts List -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/30">
        <div class="p-6 border-b border-gray-700/30">
          <h3 class="text-lg font-semibold text-white">Jadwal Broadcast</h3>
        </div>
        
        <div v-if="filteredSchedules.length > 0" class="divide-y divide-gray-700/30">
          <div
            v-for="schedule in filteredSchedules"
            :key="schedule.id"
            class="p-6 hover:bg-gray-700/30 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getStatusClass(schedule.status)"
                  >
                    {{ getStatusText(schedule.status) }}
                  </span>
                  
                  <div class="flex items-center text-sm text-gray-500">
                    <ClockIcon class="w-4 h-4 mr-1" />
                    {{ formatScheduleTime(schedule.scheduledAt) }}
                  </div>
                  
                  <div class="flex items-center text-sm text-gray-500">
                    <UsersIcon class="w-4 h-4 mr-1" />
                    {{ schedule.contacts?.length || 0 }} kontak
                  </div>
                </div>
                
                <div class="mb-3">
                  <p class="text-sm text-white line-clamp-2">{{ schedule.message }}</p>
                </div>
                
                <div class="flex items-center space-x-4 text-xs text-gray-400">
                  <span>Dibuat: {{ formatDate(schedule.createdAt) }}</span>
                  <span v-if="schedule.executedAt">Dieksekusi: {{ formatDate(schedule.executedAt) }}</span>
                  <span v-if="schedule.template">Template: {{ schedule.template.name }}</span>
                </div>
              </div>
              
              <div class="ml-6 flex items-center space-x-2">
                <button
                  v-if="schedule.status === 'pending'"
                  @click="editSchedule(schedule)"
                  class="p-2 text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                  title="Edit Jadwal"
                >
                  <PencilIcon class="w-5 h-5" />
                </button>
                
                <button
                  v-if="schedule.status === 'pending'"
                  @click="cancelSchedule(schedule.id)"
                  class="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Batalkan Jadwal"
                >
                  <XMarkIcon class="w-5 h-5" />
                </button>
                
                <button
                  @click="viewScheduleDetails(schedule)"
                  class="p-2 text-gray-400 hover:text-gray-300 rounded-lg transition-colors"
                  title="Lihat Detail"
                >
                  <EyeIcon class="w-5 h-5" />
                </button>
                
                <button
                  @click="deleteSchedule(schedule.id)"
                  class="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                  title="Hapus Jadwal"
                >
                  <TrashIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="p-8 text-center">
          <ClockIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-white">Belum Ada Jadwal</h3>
          <p class="mt-1 text-sm text-gray-300">
            Buat jadwal broadcast pertama Anda
          </p>
          <button
            @click="showScheduleModal = true"
            class="mt-4 inline-flex items-center px-4 py-2 bg-whatsapp-500 text-white font-medium rounded-lg hover:bg-whatsapp-600 transition-colors"
          >
            <PlusIcon class="w-5 h-5 mr-2" />
            Jadwalkan Broadcast
          </button>
        </div>
      </div>
    </div>
    
    <!-- Schedule Modal -->
    <div v-if="showScheduleModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">
              {{ editingSchedule ? 'Edit Jadwal Broadcast' : 'Jadwalkan Broadcast Baru' }}
            </h3>
            <button
              @click="closeScheduleModal"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <form @submit.prevent="saveSchedule" class="space-y-6">
            <!-- Message Content -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Isi Pesan *
              </label>
              <div class="flex items-center space-x-2 mb-2">
                <button
                  type="button"
                  @click="showTemplateSelector = true"
                  class="text-sm text-blue-400 hover:text-blue-300 font-medium"
                >
                  Pilih Template
                </button>
              </div>
              <textarea
                v-model="scheduleForm.message"
                rows="4"
                placeholder="Tulis pesan Anda di sini..."
                class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              ></textarea>
              <div class="text-xs text-gray-400 mt-1">
                {{ scheduleForm.message.length }} karakter
              </div>
            </div>
            
            <!-- Schedule Date & Time -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Tanggal *
                </label>
                <input
                  v-model="scheduleForm.date"
                  type="date"
                  :min="minDate"
                  class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Waktu *
                </label>
                <input
                  v-model="scheduleForm.time"
                  type="time"
                  class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <!-- Contact Selection -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Pilih Kontak *
              </label>
              <div class="border border-gray-600 bg-gray-700/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div class="flex items-center mb-3">
                  <input
                    id="select-all"
                    type="checkbox"
                    :checked="allContactsSelected"
                    @change="toggleAllContacts"
                    class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label for="select-all" class="ml-2 text-sm font-medium text-gray-300">
                    Pilih Semua ({{ contactsStore.contacts.length }} kontak)
                  </label>
                </div>
                
                <div class="space-y-2">
                  <div
                    v-for="contact in contactsStore.contacts"
                    :key="contact.id"
                    class="flex items-center"
                  >
                    <input
                      :id="`contact-${contact.id}`"
                      type="checkbox"
                      :value="contact.id"
                      v-model="scheduleForm.selectedContacts"
                      class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <label :for="`contact-${contact.id}`" class="ml-2 text-sm text-gray-300">
                      {{ contact.name }} ({{ contact.number }})
                    </label>
                  </div>
                </div>
              </div>
              <div class="text-xs text-gray-400 mt-1">
                {{ scheduleForm.selectedContacts.length }} kontak dipilih
              </div>
            </div>
            
            <!-- Repeat Options -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Pengulangan
              </label>
              <select
                v-model="scheduleForm.repeatType"
                class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">Tidak Berulang</option>
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
              </select>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
              <button
                type="button"
                @click="closeScheduleModal"
                class="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="!canSaveSchedule"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ editingSchedule ? 'Update Jadwal' : 'Jadwalkan' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Template Selector Modal -->
    <div v-if="showTemplateSelector" class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-gray-800 rounded-lg w-full max-w-md max-h-[70vh] overflow-y-auto border border-gray-700">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Pilih Template</h3>
            <button
              @click="showTemplateSelector = false"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <div class="space-y-2">
            <div
              v-for="template in broadcastStore.messageTemplates.filter(t => t.isActive)"
              :key="template.id"
              @click="selectTemplate(template)"
              class="p-3 border border-gray-600 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <div class="font-medium text-white">{{ template.name }}</div>
              <div class="text-sm text-gray-300 mt-1 line-clamp-2">{{ template.content }}</div>
            </div>
          </div>
          
          <div v-if="broadcastStore.messageTemplates.filter(t => t.isActive).length === 0" class="text-center py-8">
            <DocumentTextIcon class="mx-auto h-12 w-12 text-gray-400" />
            <p class="text-gray-300 text-sm mt-2">Belum ada template aktif</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Detail Modal -->
    <div v-if="showDetailModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">Detail Jadwal Broadcast</h3>
            <button
              @click="showDetailModal = false"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <div v-if="selectedSchedule" class="space-y-6">
            <!-- Status and Schedule Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  :class="getStatusClass(selectedSchedule.status)"
                >
                  {{ getStatusText(selectedSchedule.status) }}
                </span>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Waktu Jadwal</label>
                <p class="text-sm text-white">{{ formatScheduleTime(selectedSchedule.scheduledAt) }}</p>
              </div>
            </div>
            
            <!-- Message Content -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Isi Pesan</label>
              <div class="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                <p class="text-sm text-white whitespace-pre-wrap">{{ selectedSchedule.message }}</p>
              </div>
            </div>
            
            <!-- Contact List -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Kontak Tujuan ({{ selectedSchedule.contacts?.length || 0 }})
              </label>
              <div class="max-h-32 overflow-y-auto border border-gray-600 bg-gray-700/30 rounded-lg">
                <div
                  v-for="contact in selectedSchedule.contacts"
                  :key="contact.id"
                  class="px-3 py-2 border-b border-gray-600 last:border-b-0"
                >
                  <div class="text-sm text-white">{{ contact.name }}</div>
                  <div class="text-xs text-gray-300">{{ contact.number }}</div>
                </div>
              </div>
            </div>
            
            <!-- Additional Info -->
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label class="block font-medium text-gray-300 mb-1">Dibuat</label>
                <p class="text-white">{{ formatDate(selectedSchedule.createdAt) }}</p>
              </div>
              <div v-if="selectedSchedule.executedAt">
                <label class="block font-medium text-gray-300 mb-1">Dieksekusi</label>
                <p class="text-white">{{ formatDate(selectedSchedule.executedAt) }}</p>
              </div>
            </div>
          </div>
          
          <div class="flex items-center justify-end pt-6 border-t border-gray-700">
            <button
              @click="showDetailModal = false"
              class="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBroadcastStore } from '../stores/broadcast'
import { useContactsStore } from '../stores/contacts'
import { useToast } from 'vue-toastification'
import { usePerformance } from '../composables/usePerformance'
import {
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  PencilIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/vue/24/outline'

// Stores and Toast
const broadcastStore = useBroadcastStore()
const contactsStore = useContactsStore()
const toast = useToast()

// Performance optimizations
const { createDebounced, createMemoizedComputed } = usePerformance()

// Reactive data
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const selectedStatus = ref('')
const sortBy = ref('scheduledAt')
const showScheduleModal = ref(false)
const showTemplateSelector = ref(false)
const showDetailModal = ref(false)
const editingSchedule = ref(null)
const selectedSchedule = ref(null)

// Schedule form
const scheduleForm = ref({
  message: '',
  date: '',
  time: '',
  selectedContacts: [],
  repeatType: 'none'
})

// Computed
const minDate = computed(() => {
  const today = new Date()
  return today.toISOString().split('T')[0]
})

const allContactsSelected = computed(() => {
  return scheduleForm.value.selectedContacts.length === contactsStore.contacts.length
})

const canSaveSchedule = computed(() => {
  return scheduleForm.value.message.trim() !== '' &&
         scheduleForm.value.date !== '' &&
         scheduleForm.value.time !== '' &&
         scheduleForm.value.selectedContacts.length > 0
})

const filteredSchedules = createMemoizedComputed(() => {
  let filtered = broadcastStore.scheduledBroadcasts || []
  
  // Filter by search query
  if (debouncedSearchQuery.value) {
    const query = debouncedSearchQuery.value.toLowerCase()
    filtered = filtered.filter(schedule => 
      schedule.message.toLowerCase().includes(query)
    )
  }
  
  // Filter by status
  if (selectedStatus.value) {
    filtered = filtered.filter(schedule => schedule.status === selectedStatus.value)
  }
  
  // Sort
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'scheduledAt':
        return new Date(a.scheduledAt) - new Date(b.scheduledAt)
      case 'createdAt':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'message':
        return a.message.localeCompare(b.message)
      default:
        return 0
    }
  })
  
  return filtered
}, [
  computed(() => broadcastStore.scheduledBroadcasts?.length || 0),
  debouncedSearchQuery,
  selectedStatus,
  sortBy
])

const pendingSchedules = createMemoizedComputed(() => {
  return (broadcastStore.scheduledBroadcasts || []).filter(s => s.status === 'pending').length
}, [computed(() => broadcastStore.scheduledBroadcasts?.length || 0)])

const completedSchedules = createMemoizedComputed(() => {
  return (broadcastStore.scheduledBroadcasts || []).filter(s => s.status === 'completed').length
}, [computed(() => broadcastStore.scheduledBroadcasts?.length || 0)])

// Debounced search handler
const debouncedSearch = createDebounced((query) => {
  debouncedSearchQuery.value = query
}, 300)

const handleSearchInput = (event) => {
  debouncedSearch(event.target.value)
}

const failedSchedules = createMemoizedComputed(() => {
  return (broadcastStore.scheduledBroadcasts || []).filter(s => s.status === 'failed').length
}, [computed(() => broadcastStore.scheduledBroadcasts?.length || 0)])

// Methods
function toggleAllContacts() {
  if (allContactsSelected.value) {
    scheduleForm.value.selectedContacts = []
  } else {
    scheduleForm.value.selectedContacts = contactsStore.contacts.map(c => c.id)
  }
}

function selectTemplate(template) {
  scheduleForm.value.message = template.content
  showTemplateSelector.value = false
  toast.info('Template diterapkan ke pesan')
}

function editSchedule(schedule) {
  editingSchedule.value = schedule
  const scheduledDate = new Date(schedule.scheduledAt)
  
  scheduleForm.value = {
    message: schedule.message,
    date: scheduledDate.toISOString().split('T')[0],
    time: scheduledDate.toTimeString().slice(0, 5),
    selectedContacts: schedule.contacts.map(c => c.id),
    repeatType: schedule.repeatType || 'none'
  }
  
  showScheduleModal.value = true
}

function saveSchedule() {
  const scheduledAt = new Date(`${scheduleForm.value.date}T${scheduleForm.value.time}`)
  
  // Validate future date
  if (scheduledAt <= new Date()) {
    toast.error('Waktu jadwal harus di masa depan')
    return
  }
  
  const selectedContacts = contactsStore.contacts.filter(c => 
    scheduleForm.value.selectedContacts.includes(c.id)
  )
  
  const scheduleData = {
    id: editingSchedule.value?.id || Date.now().toString(),
    message: scheduleForm.value.message,
    scheduledAt: scheduledAt.toISOString(),
    contacts: selectedContacts,
    repeatType: scheduleForm.value.repeatType,
    status: 'pending',
    createdAt: editingSchedule.value?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  if (editingSchedule.value) {
    broadcastStore.updateScheduledBroadcast(scheduleData)
    toast.success('Jadwal broadcast berhasil diupdate')
  } else {
    broadcastStore.addScheduledBroadcast(scheduleData)
    toast.success('Jadwal broadcast berhasil dibuat')
  }
  
  closeScheduleModal()
}

function cancelSchedule(scheduleId) {
  if (confirm('Apakah Anda yakin ingin membatalkan jadwal ini?')) {
    broadcastStore.cancelScheduledBroadcast(scheduleId)
    toast.success('Jadwal broadcast dibatalkan')
  }
}

function deleteSchedule(scheduleId) {
  if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
    broadcastStore.deleteScheduledBroadcast(scheduleId)
    toast.success('Jadwal broadcast dihapus')
  }
}

function viewScheduleDetails(schedule) {
  selectedSchedule.value = schedule
  showDetailModal.value = true
}

function closeScheduleModal() {
  showScheduleModal.value = false
  editingSchedule.value = null
  scheduleForm.value = {
    message: '',
    date: '',
    time: '',
    selectedContacts: [],
    repeatType: 'none'
  }
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatScheduleTime(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  
  const timeStr = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  if (diffMs < 0) {
    return `${timeStr} (Terlewat)`
  } else if (diffDays === 0) {
    return `${timeStr} (Hari ini)`
  } else if (diffDays === 1) {
    return `${timeStr} (Besok)`
  } else {
    return `${timeStr} (${diffDays} hari lagi)`
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

function getStatusText(status) {
  switch (status) {
    case 'pending':
      return 'Menunggu'
    case 'completed':
      return 'Selesai'
    case 'failed':
      return 'Gagal'
    case 'cancelled':
      return 'Dibatalkan'
    default:
      return 'Tidak Diketahui'
  }
}

// Schedule execution checker
let scheduleChecker = null

function checkSchedules() {
  const now = new Date()
  const pendingSchedules = (broadcastStore.scheduledBroadcasts || [])
    .filter(schedule => 
      schedule.status === 'pending' && 
      new Date(schedule.scheduledAt) <= now
    )
  
  pendingSchedules.forEach(schedule => {
    executeScheduledBroadcast(schedule)
  })
}

async function executeScheduledBroadcast(schedule) {
  try {
    // Update status to executing
    broadcastStore.updateScheduledBroadcast({
      ...schedule,
      status: 'executing',
      executedAt: new Date().toISOString()
    })
    
    // Execute the broadcast
    broadcastStore.setMessage(schedule.message)
    await broadcastStore.sendBroadcast(schedule.contacts)
    
    // Update status to completed
    broadcastStore.updateScheduledBroadcast({
      ...schedule,
      status: 'completed'
    })
    
    toast.success(`Jadwal broadcast "${schedule.message.substring(0, 30)}..." berhasil dieksekusi`)
    
    // Handle repeat
    if (schedule.repeatType !== 'none') {
      createRepeatSchedule(schedule)
    }
  } catch (error) {
    // Update status to failed
    broadcastStore.updateScheduledBroadcast({
      ...schedule,
      status: 'failed',
      error: error.message
    })
    
    toast.error(`Gagal mengeksekusi jadwal broadcast: ${error.message}`)
  }
}

function createRepeatSchedule(originalSchedule) {
  const nextDate = new Date(originalSchedule.scheduledAt)
  
  switch (originalSchedule.repeatType) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
  }
  
  const newSchedule = {
    ...originalSchedule,
    id: Date.now().toString(),
    scheduledAt: nextDate.toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  
  broadcastStore.addScheduledBroadcast(newSchedule)
}

// Lifecycle
onMounted(() => {
  // Check schedules every minute
  scheduleChecker = setInterval(checkSchedules, 60000)
  
  // Initial check
  checkSchedules()
})

onUnmounted(() => {
  if (scheduleChecker) {
    clearInterval(scheduleChecker)
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