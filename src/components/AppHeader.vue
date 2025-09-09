<template>
  <header class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[95%] max-w-6xl">
    <div class="bg-gray-900/80 backdrop-blur-xl border border-gray-700/30 rounded-2xl px-6 py-3 shadow-2xl shadow-black/40">
      <div class="flex items-center justify-between">
        <!-- Minimalist Logo -->
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.516"/>
            </svg>
          </div>
          <span class="text-white font-medium text-sm hidden sm:block">WA Broadcast</span>
        </div>

        <!-- Navigation Pills -->
        <nav class="hidden md:flex items-center space-x-2">
          <RouterLink
            v-for="item in navigation"
            :key="item.name"
            :to="item.to"
            class="px-3 py-1.5 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center space-x-1.5"
            :class="{
              'bg-white/15 text-white shadow-lg': $route.name === item.name
            }"
          >
            <component v-if="item.icon" :is="item.icon" class="w-3.5 h-3.5" />
            <span class="hidden lg:block">{{ item.label }}</span>
          </RouterLink>
        </nav>

        <!-- Right Side -->
        <div class="flex items-center space-x-3">
          <!-- Status Indicator (Visual Only) -->
          <div 
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="statusClasses"
          ></div>

          <!-- Mobile Menu Button -->
          <button
            @click="toggleMobileMenu"
            class="md:hidden p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Bars3Icon v-if="!showMobileMenu" class="w-4 h-4" />
            <XMarkIcon v-else class="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
    
    <!-- Mobile Navigation -->
    <Transition name="slide-down">
      <div v-if="showMobileMenu" class="md:hidden mt-3">
        <div class="bg-gray-900/90 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-4 shadow-2xl shadow-black/40">
          <nav class="flex flex-col space-y-2">
            <RouterLink
              v-for="item in navigation"
              :key="item.name"
              :to="item.to"
              @click="showMobileMenu = false"
              class="px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300 flex items-center space-x-3"
              :class="{
                'bg-white/15 text-white shadow-lg': $route.name === item.name
              }"
            >
              <component v-if="item.icon" :is="item.icon" class="w-4 h-4" />
              <span class="text-sm font-medium">{{ item.label }}</span>
            </RouterLink>
          </nav>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useWhatsAppStore } from '../stores/whatsapp'
import { usePerformance } from '../composables/usePerformance'
import {
  HomeIcon,
  UserGroupIcon,
  SpeakerWaveIcon,
  DocumentTextIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

// Store
const whatsappStore = useWhatsAppStore()

// Performance optimizations
const { createMemoizedComputed, createThrottled } = usePerformance()

// State
const showMobileMenu = ref(false)

// Navigation items
const navigation = [
  {
    name: 'dashboard',
    label: 'Dashboard',
    to: '/',
    icon: HomeIcon
  },
  {
    name: 'contacts',
    label: 'Kontak',
    to: '/contacts',
    icon: UserGroupIcon
  },
  {
    name: 'chat',
    label: 'Chat',
    to: '/chat',
    icon: ChatBubbleLeftRightIcon
  },
  {
    name: 'broadcast',
    label: 'Broadcast',
    to: '/broadcast',
    icon: SpeakerWaveIcon
  },
  {
    name: 'templates',
    label: 'Template',
    to: '/templates',
    icon: DocumentTextIcon
  },

  {
    name: 'scheduling',
    label: 'Penjadwalan',
    to: '/scheduling',
    icon: ClockIcon
  }
]

// Memoized computed properties for better performance
const statusClasses = createMemoizedComputed(() => {
  const baseClasses = 'transition-all duration-300'
  
  switch (whatsappStore.connectionStatus) {
    case 'ready':
      return `${baseClasses} bg-green-400 shadow-lg shadow-green-400/50 animate-pulse`
    case 'authenticated':
      return `${baseClasses} bg-blue-400 shadow-lg shadow-blue-400/50 animate-pulse`
    case 'connecting':
    case 'qr_ready':
      return `${baseClasses} bg-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse`
    case 'disconnected':
    default:
      return `${baseClasses} bg-red-400`
  }
}, [computed(() => whatsappStore.connectionStatus)])

// Throttled methods to prevent excessive calls
const toggleMobileMenu = createThrottled(() => {
  showMobileMenu.value = !showMobileMenu.value
}, 100)
</script>

<style scoped>
/* Mobile menu transitions */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* Active link styles */
.router-link-active {
  @apply bg-white/20 text-white;
}
</style>