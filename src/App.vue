<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
    <!-- Navigation Header -->
    <AppHeader />
    
    <!-- Main Content -->
    <main class="container mx-auto px-4 pt-24 pb-6">
      <div class="max-w-7xl mx-auto">
        <!-- Router View with Smooth Transitions -->
        <Transition name="page" mode="default">
          <RouterView :key="$route.fullPath" />
        </Transition>
      </div>
    </main>
    
    <!-- Global Modals -->
    <ProgressModal />
    <ConfirmationModal />
    
    <!-- Loading Overlay -->
    <LoadingOverlay v-if="isGlobalLoading" class="pointer-events-none" />
  </div>
</template>

<script setup>
import { onMounted, computed, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useWhatsAppStore } from './stores/whatsapp'
import { useContactsStore } from './stores/contacts'
import { useBroadcastStore } from './stores/broadcast'

// Components
import AppHeader from './components/AppHeader.vue'
import ProgressModal from './components/ProgressModal.vue'
import ConfirmationModal from './components/ConfirmationModal.vue'
import LoadingOverlay from './components/LoadingOverlay.vue'

// Stores
const whatsappStore = useWhatsAppStore()
const contactsStore = useContactsStore()
const broadcastStore = useBroadcastStore()

// Computed
const isGlobalLoading = computed(() => {
  // Only show overlay for initial connection and critical loading states
  return (whatsappStore.connectionStatus === 'connecting' && !whatsappStore.isReady) || 
         (contactsStore.isLoading && contactsStore.contacts.length === 0)
})

// Lifecycle
onMounted(async () => {
  // Auto-connect to WhatsApp server on app start
  whatsappStore.connectToServer()
  
  // Load contacts only after backend is ready
  const stopWatch = watch(() => whatsappStore.isReady, async (ready) => {
    if (ready) {
      await whatsappStore.loadContacts()
      console.log('📱 Contacts loaded from WhatsApp backend on app start')
      stopWatch()
    }
  })
  
  // Setup global error handling
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
  })
  
  // Setup beforeunload warning if sending broadcast
  window.addEventListener('beforeunload', (event) => {
    if (broadcastStore.isSending) {
      event.preventDefault()
      event.returnValue = 'Broadcast sedang berlangsung. Yakin ingin meninggalkan halaman?'
    }
  })
})
</script>

<style scoped>
/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Container styles */
.container {
  @apply w-full max-w-none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .container {
    @apply px-2;
  }
}
</style>