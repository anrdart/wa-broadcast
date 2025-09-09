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
        <div class="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md transform border border-gray-700">
          <!-- Header -->
          <div class="flex items-center justify-between p-6 border-b border-gray-700">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <UserIcon class="w-5 h-5 text-white" />
              </div>
              <h3 class="text-lg font-semibold text-white">
                {{ isEditing ? 'Edit Kontak' : 'Tambah Kontak' }}
              </h3>
            </div>
            
            <button
              @click="handleCancel"
              class="p-2 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
          
          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-6">
            <div class="space-y-4">
              <!-- Name Field -->
              <div>
                <label for="name" class="block text-sm font-medium text-gray-300 mb-2">
                  Nama
                </label>
                <input
                  id="name"
                  v-model="form.name"
                  type="text"
                  class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Masukkan nama kontak"
                />
              </div>
              
              <!-- Phone Field -->
              <div>
                <label for="phone" class="block text-sm font-medium text-gray-300 mb-2">
                  Nomor Telepon <span class="text-red-400">*</span>
                </label>
                <div class="relative">
                  <input
                    id="phone"
                    v-model="form.phone"
                    type="tel"
                    required
                    class="w-full px-3 py-2 bg-gray-700/50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    :class="{
                      'border-red-400 focus:ring-red-500': phoneError,
                      'border-gray-600': !phoneError
                    }"
                    placeholder="628123456789"
                    @input="validatePhone"
                  />
                  <div v-if="phoneError" class="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <ExclamationCircleIcon class="w-5 h-5 text-red-400" />
                  </div>
                </div>
                <div v-if="phoneError" class="mt-1 text-sm text-red-400">
                  {{ phoneError }}
                </div>
                <div v-else class="mt-1 text-xs text-gray-400">
                  Format: 628xxxxxxxxx (tanpa tanda +)
                </div>
              </div>
              
              <!-- Email Field -->
              <div>
                <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="email@example.com"
                />
              </div>
              
              <!-- Group Field -->
              <div>
                <label for="group" class="block text-sm font-medium text-gray-300 mb-2">
                  Grup
                </label>
                <select
                  id="group"
                  v-model="form.group"
                  class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="" class="bg-gray-700 text-gray-400">Pilih grup (opsional)</option>
                  <option v-for="group in availableGroups" :key="group" :value="group" class="bg-gray-700 text-white">
                    {{ group }}
                  </option>
                </select>
              </div>
              
              <!-- Notes Field -->
              <div>
                <label for="notes" class="block text-sm font-medium text-gray-300 mb-2">
                  Catatan
                </label>
                <textarea
                  id="notes"
                  v-model="form.notes"
                  rows="3"
                  class="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white placeholder-gray-400"
                  placeholder="Catatan tambahan..."
                ></textarea>
              </div>
            </div>
            
            <!-- Form Actions -->
            <div class="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-700">
              <button
                type="button"
                @click="handleCancel"
                class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Batal
              </button>
              
              <button
                type="submit"
                :disabled="!isFormValid"
                class="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isEditing ? 'Simpan Perubahan' : 'Tambah Kontak' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useContactsStore } from '../stores/contacts'
import { UserIcon, XMarkIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  contact: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['save', 'cancel'])

// Store
const contactsStore = useContactsStore()

// Reactive data
const form = ref({
  name: '',
  phone: '',
  email: '',
  group: '',
  notes: ''
})

const phoneError = ref('')

// Computed
const isEditing = computed(() => !!props.contact)

const availableGroups = computed(() => {
  const groups = contactsStore.contacts
    .map(contact => contact.group)
    .filter(group => group && group.trim())
  return [...new Set(groups)].sort()
})

const isFormValid = computed(() => {
  return form.value.phone.trim() && !phoneError.value
})

// Methods
function validatePhone() {
  const phone = form.value.phone.trim()
  
  if (!phone) {
    phoneError.value = 'Nomor telepon wajib diisi'
    return false
  }
  
  // Remove any non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Check if it starts with 62 and has proper length
  if (!cleanPhone.startsWith('62')) {
    phoneError.value = 'Nomor harus dimulai dengan 62'
    return false
  }
  
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    phoneError.value = 'Panjang nomor tidak valid (10-15 digit)'
    return false
  }
  
  // Check if phone already exists (for new contacts or different contact when editing)
  const existingContact = contactsStore.contacts.find(contact => 
    contact.phone === cleanPhone && 
    (!props.contact || contact.id !== props.contact.id)
  )
  
  if (existingContact) {
    phoneError.value = 'Nomor telepon sudah ada'
    return false
  }
  
  phoneError.value = ''
  return true
}

function resetForm() {
  if (props.contact) {
    // Edit mode - populate with existing data
    form.value = {
      name: props.contact.name || '',
      phone: props.contact.phone || '',
      email: props.contact.email || '',
      group: props.contact.group || '',
      notes: props.contact.notes || ''
    }
  } else {
    // Add mode - reset to empty
    form.value = {
      name: '',
      phone: '',
      email: '',
      group: '',
      notes: ''
    }
  }
  phoneError.value = ''
}

function handleSubmit() {
  if (!validatePhone()) {
    return
  }
  
  const contactData = {
    name: form.value.name.trim(),
    phone: form.value.phone.replace(/\D/g, ''), // Clean phone number
    email: form.value.email.trim(),
    group: form.value.group.trim(),
    notes: form.value.notes.trim()
  }
  
  emit('save', contactData)
}

function handleCancel() {
  emit('cancel')
}

// Watchers
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    resetForm()
  }
})

watch(() => props.contact, () => {
  if (props.isVisible) {
    resetForm()
  }
})

// Lifecycle
onMounted(() => {
  if (props.isVisible) {
    resetForm()
  }
})
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