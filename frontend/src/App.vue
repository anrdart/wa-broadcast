<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useAppStore } from './stores/app'
import { initializeSupabase, printSetupInstructions } from './utils/setup-supabase'
import QRScanner from './components/QRScanner.vue'
import LoadingScreen from './components/LoadingScreen.vue'

const appStore = useAppStore()

const authStatus = computed(() => appStore.authStatus)
const qrCode = computed(() => appStore.qrCode)
const connectionError = computed(() => appStore.connectionError)
const loadingProgress = computed(() => appStore.loadingProgress)

// Debug watcher
watch(authStatus, (newVal, oldVal) => {
  console.log('🔄 authStatus changed:', oldVal, '=>', newVal)
})

watch(qrCode, (newVal) => {
  console.log('🔄 qrCode changed, length:', newVal?.length || 0)
})

onMounted(async () => {
  // Check Supabase configuration
  const supabaseInit = await initializeSupabase()

  if (!supabaseInit.success) {
    console.warn('⚠️  Supabase not configured properly')
    console.warn(supabaseInit.message)
    printSetupInstructions()
  } else {
    console.log('✅ Supabase initialized successfully')
  }

  // Initialize WebSocket connection
  await appStore.initWebSocket()
})
</script>

<template>
  <div id="app" class="min-h-screen">
    <!-- Debug info -->
    <div style="position: fixed; top: 10px; right: 10px; background: black; color: white; padding: 10px; font-size: 12px; z-index: 9999;">
      <div>authStatus: {{ authStatus }}</div>
      <div>qrCode length: {{ qrCode?.length || 0 }}</div>
      <div>Show QRScanner: {{ authStatus === 'unauthenticated' || authStatus === 'authenticating' }}</div>
    </div>

    <!-- QR Code Scanning Phase -->
    <QRScanner
      v-if="authStatus === 'unauthenticated' || authStatus === 'authenticating'"
      :qr-code="qrCode"
      :error="connectionError"
    />

    <!-- Loading Data Phase -->
    <LoadingScreen
      v-else-if="authStatus === 'loading_data'"
      :progress="loadingProgress"
    />

    <!-- Main Dashboard Phase -->
    <div v-else-if="authStatus === 'authenticated'" class="min-h-screen bg-gray-50">
      <!-- Dashboard will be implemented in next steps -->
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-xl mb-4">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 mb-2">Dashboard Coming Soon</h2>
          <p class="text-gray-600">Your WhatsApp is connected and ready!</p>
          <p class="text-sm text-gray-500 mt-4">Contacts: {{ appStore.contacts.length }}</p>
          <button
            @click="appStore.logout()"
            class="mt-6 px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
</style>
