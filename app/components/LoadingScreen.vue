<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  progress?: number
}>()

const loadingSteps = [
  'Connecting to server...',
  'Loading contacts...',
  'Syncing messages...',
  'Preparing dashboard...',
  'Almost ready...',
]

const currentStepIndex = computed(() => {
  const progress = props.progress || 0
  return Math.min(Math.floor(progress / 25), loadingSteps.length - 1)
})

const currentStep = computed(() => loadingSteps[currentStepIndex.value])
</script>

<template>
  <div class="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
    <div class="text-center space-y-8 animate-fade-in">
      <!-- Animated Logo -->
      <div class="relative inline-flex items-center justify-center">
        <div class="w-24 h-24 rounded-3xl bg-gradient-whatsapp flex items-center justify-center shadow-2xl">
          <Loader2 class="w-12 h-12 text-white animate-spin" />
        </div>
        <div class="absolute inset-0 rounded-3xl bg-gradient-whatsapp opacity-50 animate-ping" />
      </div>

      <!-- Progress Text -->
      <div class="space-y-2">
        <h2 class="text-2xl font-bold text-white">Loading...</h2>
        <p class="text-muted-foreground">{{ currentStep }}</p>
      </div>

      <!-- Progress Bar -->
      <div class="w-64 mx-auto">
        <div class="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            class="h-full bg-gradient-whatsapp transition-all duration-500 ease-out rounded-full"
            :style="{ width: `${props.progress || 0}%` }"
          />
        </div>
        <p class="text-sm text-muted-foreground mt-2">{{ props.progress || 0 }}%</p>
      </div>
    </div>
  </div>
</template>
