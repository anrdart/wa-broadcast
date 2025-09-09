<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm shadow-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Template Pesan</h1>
              <p class="mt-1 text-sm text-gray-300">
                Kelola template pesan untuk broadcast yang lebih efisien
              </p>
            </div>
            
            <button
              @click="showCreateModal = true"
              class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon class="w-5 h-5 mr-2" />
              Buat Template
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <DocumentTextIcon class="w-6 h-6 text-blue-400" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-white">{{ broadcastStore.messageTemplates.length }}</div>
              <div class="text-sm text-gray-300">Total Template</div>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircleIcon class="w-6 h-6 text-green-400" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-white">{{ activeTemplatesCount }}</div>
              <div class="text-sm text-gray-300">Template Aktif</div>
            </div>
          </div>
        </div>
        
        <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/30 p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon class="w-6 h-6 text-purple-400" />
            </div>
            <div class="ml-4">
              <div class="text-2xl font-bold text-white">{{ mostUsedTemplate?.usage || 0 }}</div>
              <div class="text-sm text-gray-300">Paling Sering Digunakan</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Search and Filter -->
      <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/30 p-6 mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div class="flex-1 max-w-md">
            <div class="relative">
              <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari template..."
                class="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
          </div>
          
          <div class="flex items-center space-x-4">
            <select
              v-model="selectedCategory"
              class="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="">Semua Kategori</option>
              <option value="greeting">Salam</option>
              <option value="promotion">Promosi</option>
              <option value="reminder">Pengingat</option>
              <option value="announcement">Pengumuman</option>
              <option value="other">Lainnya</option>
            </select>
            
            <select
              v-model="sortBy"
              class="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
            >
              <option value="name">Nama</option>
              <option value="created">Tanggal Dibuat</option>
              <option value="usage">Penggunaan</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Templates Grid -->
      <div v-if="filteredTemplates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-sm border border-gray-700/30 hover:shadow-md transition-shadow"
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-white mb-1">{{ template.name }}</h3>
                <div class="flex items-center space-x-2">
                  <span 
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getCategoryClass(template.category)"
                  >
                    {{ getCategoryText(template.category) }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ template.usage || 0 }}x digunakan
                  </span>
                </div>
              </div>
              
              <div class="flex items-center space-x-1 ml-4">
                <button
                  @click="editTemplate(template)"
                  class="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors"
                  title="Edit"
                >
                  <PencilIcon class="w-4 h-4" />
                </button>
                <button
                  @click="duplicateTemplate(template)"
                  class="p-2 text-gray-400 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors"
                  title="Duplikat"
                >
                  <DocumentDuplicateIcon class="w-4 h-4" />
                </button>
                <button
                  @click="deleteTemplate(template.id)"
                  class="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  title="Hapus"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <!-- Content Preview -->
            <div class="mb-4">
              <p class="text-sm text-gray-300 line-clamp-4">{{ template.content }}</p>
            </div>
            
            <!-- Footer -->
            <div class="flex items-center justify-between pt-4 border-t border-gray-700/30">
              <div class="text-xs text-gray-400">
                Dibuat {{ formatDate(template.createdAt) }}
              </div>
              
              <div class="flex items-center space-x-2">
                <button
                  @click="previewTemplate(template)"
                  class="text-xs text-gray-300 hover:text-white font-medium"
                >
                  Preview
                </button>
                <button
                  @click="useTemplate(template)"
                  class="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  Gunakan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <DocumentTextIcon class="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white mb-2">Belum Ada Template</h3>
        <p class="text-gray-400 mb-6">Buat template pertama Anda untuk mempercepat proses broadcast</p>
        <button
          @click="showCreateModal = true"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon class="w-5 h-5 mr-2" />
          Buat Template Pertama
        </button>
      </div>
    </div>
    
    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">
              {{ showEditModal ? 'Edit Template' : 'Buat Template Baru' }}
            </h3>
            <button
              @click="closeModal"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <form @submit.prevent="saveTemplate" class="space-y-6">
            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Nama Template</label>
              <input
                v-model="templateForm.name"
                type="text"
                required
                class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Masukkan nama template"
              />
            </div>
            
            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Kategori</label>
              <select
                v-model="templateForm.category"
                required
                class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                <option value="">Pilih kategori</option>
                <option value="greeting">Salam</option>
                <option value="promotion">Promosi</option>
                <option value="reminder">Pengingat</option>
                <option value="announcement">Pengumuman</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            
            <!-- Content -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Isi Pesan</label>
              <textarea
                v-model="templateForm.content"
                rows="8"
                required
                class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400"
                placeholder="Tulis isi template...\n\nGunakan variabel:\n{name} - Nama kontak\n{phone} - Nomor telepon"
                maxlength="4096"
              ></textarea>
              
              <div class="mt-2 flex items-center justify-between">
                <div class="text-xs text-gray-400">
                  <strong>Variabel yang tersedia:</strong> {name}, {phone}
                </div>
                <div class="text-xs text-gray-400">
                  {{ templateForm.content.length }}/4096 karakter
                </div>
              </div>
            </div>
            
            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Deskripsi (Opsional)</label>
              <textarea
                v-model="templateForm.description"
                rows="3"
                class="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400"
                placeholder="Deskripsi singkat tentang template ini"
                maxlength="500"
              ></textarea>
            </div>
            
            <!-- Actions -->
            <div class="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700/30">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
              >
                Batal
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {{ showEditModal ? 'Simpan Perubahan' : 'Buat Template' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Preview Modal -->
    <div v-if="showPreviewModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div class="bg-white rounded-lg w-full max-w-md">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Preview Template</h3>
            <button
              @click="showPreviewModal = false"
              class="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <div v-if="previewedTemplate" class="space-y-4">
            <div>
              <div class="text-sm font-medium text-gray-700 mb-2">{{ previewedTemplate.name }}</div>
              <div class="p-4 bg-gray-50 rounded-lg border">
                <div class="whitespace-pre-wrap text-sm text-gray-900">
                  {{ previewedTemplate.content.replace('{name}', 'John Doe').replace('{phone}', '+62812345678') }}
                </div>
              </div>
            </div>
            
            <div class="text-xs text-gray-500">
              Preview dengan contoh data: nama "John Doe" dan nomor "+62812345678"
            </div>
          </div>
          
          <div class="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <button
              @click="showPreviewModal = false"
              class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tutup
            </button>
            <button
              @click="useTemplate(previewedTemplate)"
              class="px-4 py-2 bg-whatsapp-500 text-white rounded-lg hover:bg-whatsapp-600 transition-colors"
            >
              Gunakan Template
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useBroadcastStore } from '../stores/broadcast'
import { useToast } from 'vue-toastification'
import {
  PlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

// Router and Toast
const router = useRouter()
const toast = useToast()

// Stores
const broadcastStore = useBroadcastStore()

// Reactive data
const searchQuery = ref('')
const selectedCategory = ref('')
const sortBy = ref('name')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showPreviewModal = ref(false)
const previewedTemplate = ref(null)
const editingTemplate = ref(null)

const templateForm = reactive({
  name: '',
  category: '',
  content: '',
  description: ''
})

// Computed
const activeTemplatesCount = computed(() => {
  return broadcastStore.messageTemplates.filter(t => t.isActive !== false).length
})

const mostUsedTemplate = computed(() => {
  return broadcastStore.messageTemplates.reduce((prev, current) => {
    return (prev.usage || 0) > (current.usage || 0) ? prev : current
  }, {})
})

const filteredTemplates = computed(() => {
  let templates = broadcastStore.messageTemplates
  
  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    templates = templates.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.content.toLowerCase().includes(query) ||
      (template.description && template.description.toLowerCase().includes(query))
    )
  }
  
  // Filter by category
  if (selectedCategory.value) {
    templates = templates.filter(template => template.category === selectedCategory.value)
  }
  
  // Sort templates
  templates.sort((a, b) => {
    switch (sortBy.value) {
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'usage':
        return (b.usage || 0) - (a.usage || 0)
      case 'name':
      default:
        return a.name.localeCompare(b.name)
    }
  })
  
  return templates
})

// Methods
function getCategoryClass(category) {
  switch (category) {
    case 'greeting':
      return 'bg-blue-100 text-blue-800'
    case 'promotion':
      return 'bg-green-100 text-green-800'
    case 'reminder':
      return 'bg-yellow-100 text-yellow-800'
    case 'announcement':
      return 'bg-purple-100 text-purple-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getCategoryText(category) {
  switch (category) {
    case 'greeting':
      return 'Salam'
    case 'promotion':
      return 'Promosi'
    case 'reminder':
      return 'Pengingat'
    case 'announcement':
      return 'Pengumuman'
    default:
      return 'Lainnya'
  }
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function editTemplate(template) {
  editingTemplate.value = template
  templateForm.name = template.name
  templateForm.category = template.category
  templateForm.content = template.content
  templateForm.description = template.description || ''
  showEditModal.value = true
}

function duplicateTemplate(template) {
  const duplicated = {
    ...template,
    id: Date.now().toString(),
    name: `${template.name} (Copy)`,
    createdAt: Date.now(),
    usage: 0
  }
  
  broadcastStore.addTemplate(duplicated)
  toast.success('Template berhasil diduplikat')
}

function deleteTemplate(templateId) {
  if (confirm('Apakah Anda yakin ingin menghapus template ini?')) {
    broadcastStore.removeTemplate(templateId)
    toast.success('Template berhasil dihapus')
  }
}

function previewTemplate(template) {
  previewedTemplate.value = template
  showPreviewModal.value = true
}

function useTemplate(template) {
  broadcastStore.applyTemplate(template)
  router.push('/broadcast')
  toast.success(`Template "${template.name}" diterapkan`)
}

function saveTemplate() {
  if (showEditModal.value && editingTemplate.value) {
    // Update existing template
    const updatedTemplate = {
      ...editingTemplate.value,
      name: templateForm.name,
      category: templateForm.category,
      content: templateForm.content,
      description: templateForm.description,
      updatedAt: Date.now()
    }
    
    broadcastStore.updateTemplate(updatedTemplate)
    toast.success('Template berhasil diperbarui')
  } else {
    // Create new template
    const newTemplate = {
      id: Date.now().toString(),
      name: templateForm.name,
      category: templateForm.category,
      content: templateForm.content,
      description: templateForm.description,
      createdAt: Date.now(),
      usage: 0,
      isActive: true
    }
    
    broadcastStore.addTemplate(newTemplate)
    toast.success('Template berhasil dibuat')
  }
  
  closeModal()
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  editingTemplate.value = null
  
  // Reset form
  templateForm.name = ''
  templateForm.category = ''
  templateForm.content = ''
  templateForm.description = ''
}
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>