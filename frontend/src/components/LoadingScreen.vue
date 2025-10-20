<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100 px-4">
    <div class="max-w-md w-full">
      <!-- Glass Card -->
      <div class="glass-card p-8 text-center animate-pulse-slow">
        <!-- Success Icon -->
        <div class="mb-6">
          <div class="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl animate-scale-in">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <!-- Title -->
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Connected Successfully!
        </h2>
        <p class="text-gray-600 mb-8">
          Loading your WhatsApp data...
        </p>

        <!-- Progress Bar -->
        <div class="mb-6">
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-primary-500 to-accent-600 rounded-full transition-all duration-500 ease-out"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <p class="text-sm text-gray-600 mt-2">{{ progress }}% Complete</p>
        </div>

        <!-- Loading Steps -->
        <div class="space-y-3 text-left">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="flex items-center space-x-3 p-3 rounded-lg transition-all"
            :class="currentStep >= index ? 'bg-primary-50' : 'bg-gray-50'"
          >
            <!-- Step Icon -->
            <div 
              class="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all"
              :class="[
                currentStep > index ? 'bg-green-500' : currentStep === index ? 'bg-primary-500 animate-pulse' : 'bg-gray-300'
              ]"
            >
              <svg 
                v-if="currentStep > index" 
                class="w-4 h-4 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
              <div 
                v-else-if="currentStep === index"
                class="w-2 h-2 bg-white rounded-full"
              ></div>
            </div>

            <!-- Step Text -->
            <span 
              class="text-sm font-medium transition-colors"
              :class="currentStep >= index ? 'text-gray-900' : 'text-gray-500'"
            >
              {{ step }}
            </span>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p class="text-xs text-blue-700">
            💡 This may take a few moments depending on your chat history and contacts.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  progress: number
}>()

const steps = [
  'Loading contacts',
  'Fetching chat history',
  'Loading broadcasts',
  'Loading scheduled messages',
  'Preparing dashboard'
]

const currentStep = computed(() => {
  if (props.progress < 20) return 0
  if (props.progress < 40) return 1
  if (props.progress < 60) return 2
  if (props.progress < 80) return 3
  return 4
})
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

@keyframes scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-scale-in {
  animation: scale-in 0.5s ease-out;
}

@keyframes pulse-slow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.95;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 3s ease-in-out infinite;
}
</style>
