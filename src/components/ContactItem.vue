<template>
  <div 
    v-memo="[contact.id, contact.name, contact.phone, isSelected, contact.lastMessageAt]"
    class="contact-item flex items-center p-3 border-b border-gray-600 hover:bg-gray-700/50 transition-colors duration-150"
    :class="{ 'bg-blue-500/10 border-blue-500/30': isSelected }"
  >
    <!-- Selection Checkbox -->
    <div class="flex-shrink-0 mr-3">
      <input
        type="checkbox"
        :checked="isSelected"
        @change="handleToggleSelect"
        class="w-4 h-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500 focus:ring-2"
      >
    </div>

    <!-- Contact Avatar -->
    <div class="flex-shrink-0 mr-3">
      <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
        <UserIcon v-if="!contact.avatar" class="w-6 h-6 text-gray-300" />
        <img 
          v-else
          :src="contact.avatar" 
          :alt="contact.name"
          class="w-10 h-10 rounded-full object-cover"
        >
      </div>
    </div>

    <!-- Contact Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-white truncate">
          {{ displayName }}
        </h3>
        <div class="flex items-center space-x-1">
          <!-- Status Badge -->
          <span 
            v-if="contact.status"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
            :class="getStatusClass(contact.status)"
          >
            {{ getStatusText(contact.status) }}
          </span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mt-1">
        <p class="text-sm text-gray-300 truncate">
          {{ formattedPhoneNumber }}
        </p>
        <div class="flex items-center space-x-2 text-xs text-gray-400">
          <span v-if="formattedLastMessage">
            {{ formattedLastMessage }}
          </span>
        </div>
      </div>
      
      <!-- Tags -->
      <div v-if="visibleTags.length > 0" class="flex flex-wrap gap-1 mt-2">
        <span 
          v-for="tag in visibleTags" 
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-200"
        >
          {{ tag }}
        </span>
        <span 
          v-if="remainingTagsCount > 0"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300"
        >
          +{{ remainingTagsCount }}
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex-shrink-0 ml-3">
      <div class="flex items-center space-x-1">
        <button
          @click="handleEdit"
          class="p-1 text-gray-400 hover:text-blue-400 transition-colors duration-150"
          title="Edit Kontak"
        >
          <PencilIcon class="w-4 h-4" />
        </button>
        <button
          @click="handleDelete"
          class="p-1 text-gray-400 hover:text-red-400 transition-colors duration-150"
          title="Hapus Kontak"
        >
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { UserIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  contact: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})



const emit = defineEmits(['toggle-select', 'edit', 'delete'])

// Computed properties for performance optimization
const displayName = computed(() => {
  return props.contact.name || 'Tanpa Nama'
})

const formattedPhoneNumber = computed(() => {
  return formatPhoneNumber(props.contact.number || props.contact.phone)
})

const formattedLastMessage = computed(() => {
  return formatLastMessage(props.contact.lastMessageAt)
})

const visibleTags = computed(() => {
  return props.contact.tags ? props.contact.tags.slice(0, 3) : []
})

const remainingTagsCount = computed(() => {
  return props.contact.tags ? Math.max(0, props.contact.tags.length - 3) : 0
})

// Event handlers
const handleToggleSelect = () => {
  emit('toggle-select')
}

const handleEdit = () => {
  emit('edit')
}

const handleDelete = () => {
  emit('delete')
}

// Utility functions
const formatPhoneNumber = (phone) => {
  if (!phone) return '-'
  
  // Format Indonesian phone numbers
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('62')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 9)} ${cleaned.slice(9)}`
  } else if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`
  }
  return phone
}

const formatLastMessage = (timestamp) => {
  if (!timestamp) return ''
  
  const now = new Date()
  const messageDate = new Date(timestamp)
  const diffInHours = Math.floor((now - messageDate) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    return 'Baru saja'
  } else if (diffInHours < 24) {
    return `${diffInHours}j yang lalu`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      return `${diffInDays}h yang lalu`
    } else {
      return messageDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
      })
    }
  }
}

const getStatusClass = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400'
    case 'inactive':
      return 'bg-gray-500/20 text-gray-300'
    case 'blocked':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-gray-500/20 text-gray-300'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'active':
      return 'Aktif'
    case 'inactive':
      return 'Tidak Aktif'
    case 'blocked':
      return 'Diblokir'
    default:
      return status
  }
}
</script>

<style scoped>
.contact-item {
  /* Ensure consistent height for virtual scrolling */
  min-height: 80px;
}

/* Smooth hover transitions */
.contact-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Selection state */
.contact-item.bg-blue-500\/10 {
  border-left: 3px solid #3b82f6;
}
</style>