<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ step === 'upload' ? 'Import Kontak CSV' : 'Preview & Filter Kontak' }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- Step 1: File Upload -->
        <div v-if="step === 'upload'" class="space-y-6">
          <div class="text-center">
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-gray-400 transition-colors"
                 @dragover.prevent @drop.prevent="handleFileDrop">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="mt-4">
                <label for="csv-file" class="cursor-pointer">
                  <span class="mt-2 block text-sm font-medium text-gray-900">
                    Drag & drop file CSV atau klik untuk memilih
                  </span>
                  <input id="csv-file" type="file" accept=".csv" class="sr-only" @change="handleFileSelect" ref="fileInput">
                </label>
                <p class="mt-2 text-xs text-gray-500">
                  Format yang didukung: CSV dengan kolom name/nama dan number/nomor/phone
                </p>
              </div>
            </div>
          </div>

          <div v-if="selectedFile" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center">
              <svg class="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-blue-900">{{ selectedFile.name }}</p>
                <p class="text-xs text-blue-700">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Preview & Filter -->
        <div v-else-if="step === 'preview'" class="space-y-6">
          <!-- Summary Stats -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="text-2xl font-bold text-blue-600">{{ previewData.total }}</div>
              <div class="text-sm text-blue-800">Total Kontak</div>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-lg p-4">
              <div class="text-2xl font-bold text-green-600">{{ previewData.whatsappCount }}</div>
              <div class="text-sm text-green-800">Nomor WhatsApp</div>
            </div>
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div class="text-2xl font-bold text-yellow-600">{{ previewData.nonWhatsappCount }}</div>
              <div class="text-sm text-yellow-800">Nomor Lainnya</div>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
              <div class="text-2xl font-bold text-red-600">{{ previewData.invalidCount }}</div>
              <div class="text-sm text-red-800">Nomor Invalid</div>
            </div>
          </div>

          <!-- Filter Options -->
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-900 mb-3">Opsi Import</h4>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="radio" v-model="importFilter" value="all" class="mr-2">
                <span class="text-sm text-gray-700">Import semua kontak ({{ previewData.total }} kontak)</span>
              </label>
              <label class="flex items-center">
                <input type="radio" v-model="importFilter" value="whatsapp" class="mr-2">
                <span class="text-sm text-gray-700">Hanya nomor WhatsApp ({{ previewData.whatsappCount }} kontak)</span>
              </label>
            </div>
          </div>

          <!-- Preview Tables -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- WhatsApp Numbers -->
            <div v-if="previewData.whatsappContacts?.length > 0">
              <h4 class="text-sm font-medium text-green-800 mb-3 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
                Nomor WhatsApp ({{ previewData.whatsappCount }})
              </h4>
              <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div class="max-h-60 overflow-y-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nomor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="contact in previewData.whatsappContacts" :key="contact.id" class="hover:bg-gray-50">
                        <td class="px-3 py-2 text-sm text-gray-900">{{ contact.name }}</td>
                        <td class="px-3 py-2 text-sm text-gray-600 font-mono">{{ contact.number }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="previewData.whatsappCount > 10" class="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                  Menampilkan 10 dari {{ previewData.whatsappCount }} nomor WhatsApp
                </div>
              </div>
            </div>

            <!-- Non-WhatsApp Numbers -->
            <div v-if="previewData.nonWhatsappContacts?.length > 0">
              <h4 class="text-sm font-medium text-yellow-800 mb-3 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                </svg>
                Nomor Lainnya ({{ previewData.nonWhatsappCount }})
              </h4>
              <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div class="max-h-60 overflow-y-auto">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nomor</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                      <tr v-for="contact in previewData.nonWhatsappContacts" :key="contact.id" class="hover:bg-gray-50">
                        <td class="px-3 py-2 text-sm text-gray-900">{{ contact.name }}</td>
                        <td class="px-3 py-2 text-sm text-gray-600 font-mono">{{ contact.originalNumber }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-if="previewData.nonWhatsappCount > 10" class="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                  Menampilkan 10 dari {{ previewData.nonWhatsappCount }} nomor lainnya
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        <button @click="$emit('close')" class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          Batal
        </button>
        <button v-if="step === 'upload'" @click="previewFile" :disabled="!selectedFile || isLoading" 
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <span v-if="isLoading" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Memproses...
          </span>
          <span v-else>Preview</span>
        </button>
        <button v-if="step === 'preview'" @click="importContacts" :disabled="isLoading"
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <span v-if="isLoading" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mengimpor...
          </span>
          <span v-else>Import {{ importFilter === 'whatsapp' ? 'Nomor WhatsApp' : 'Semua Kontak' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useContactsStore } from '../stores/contacts.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'imported'])

const contactsStore = useContactsStore()

// State
const step = ref('upload') // 'upload' | 'preview'
const selectedFile = ref(null)
const previewData = ref(null)
const importFilter = ref('all') // 'all' | 'whatsapp'
const isLoading = ref(false)
const fileInput = ref(null)

// Methods
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (file && file.type === 'text/csv') {
    selectedFile.value = file
  }
}

function handleFileDrop(event) {
  const file = event.dataTransfer.files[0]
  if (file && file.type === 'text/csv') {
    selectedFile.value = file
  }
}

async function previewFile() {
  if (!selectedFile.value) return
  
  isLoading.value = true
  try {
    const result = await contactsStore.importFromCsv(selectedFile.value, { showPreview: true })
    previewData.value = result
    step.value = 'preview'
  } catch (error) {
    console.error('Error previewing CSV:', error)
  } finally {
    isLoading.value = false
  }
}

async function importContacts() {
  if (!selectedFile.value) return
  
  isLoading.value = true
  try {
    const result = await contactsStore.importFromCsv(selectedFile.value, {
      whatsappOnly: importFilter.value === 'whatsapp',
      showPreview: false
    })
    
    emit('imported', result)
    emit('close')
    
    // Reset state
    step.value = 'upload'
    selectedFile.value = null
    previewData.value = null
    importFilter.value = 'all'
    
  } catch (error) {
    console.error('Error importing CSV:', error)
  } finally {
    isLoading.value = false
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>