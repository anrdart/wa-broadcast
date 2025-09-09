<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="opacity-100 translate-y-0 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100 translate-y-0 sm:translate-x-0"
      leave-to-class="opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-2"
    >
      <div
        v-if="visible"
        class="fixed top-4 right-4 z-50 max-w-sm w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden"
      >
        <div class="p-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <!-- Success Icon -->
              <CheckCircleIcon
                v-if="type === 'success'"
                class="h-6 w-6 text-green-400"
              />
              <!-- Error Icon -->
              <XCircleIcon
                v-else-if="type === 'error'"
                class="h-6 w-6 text-red-400"
              />
              <!-- Warning Icon -->
              <ExclamationTriangleIcon
                v-else-if="type === 'warning'"
                class="h-6 w-6 text-yellow-400"
              />
              <!-- Info Icon -->
              <InformationCircleIcon
                v-else
                class="h-6 w-6 text-blue-400"
              />
            </div>
            <div class="ml-3 w-0 flex-1 pt-0.5">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ title }}
              </p>
              <p v-if="message" class="mt-1 text-sm text-gray-500 dark:text-gray-300">
                {{ message }}
              </p>
            </div>
            <div class="ml-4 flex-shrink-0 flex">
              <button
                @click="close"
                class="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span class="sr-only">Close</span>
                <XMarkIcon class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 5000
  },
  persistent: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)
let timeoutId = null

const show = () => {
  visible.value = true
  
  if (!props.persistent && props.duration > 0) {
    timeoutId = setTimeout(() => {
      close()
    }, props.duration)
  }
}

const close = () => {
  visible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  emit('close')
}

// Auto show on mount
onMounted(() => {
  show()
})

// Cleanup on unmount
onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId)
  }
})

// Expose methods
defineExpose({
  show,
  close
})
</script>