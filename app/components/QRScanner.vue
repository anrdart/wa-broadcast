<script setup lang="ts">
import { MessageCircle, QrCode, RefreshCw, Loader2, WifiOff, CheckCircle2, Clock } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

const props = defineProps<{
  qrCode?: string | null
  error?: string | null
}>()

const appState = useAppState()
const api = useWhatsAppAPI()

const isLoading = ref(true)
const localError = ref<string | null>(null)
const localQR = ref<string | null>(null)
const qrExpiresIn = ref(30) // QR expires in 30 seconds

let pollingInterval: ReturnType<typeof setInterval> | null = null
let qrRefreshInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  await initConnection()
})

const initConnection = async () => {
  isLoading.value = true
  localError.value = null

  try {
    // First check if already connected
    const deviceResult = await api.checkDevices()
    
    if (deviceResult.connected) {
      // Already connected - go to dashboard
      goToDashboard()
      return
    }

    // Not connected - get QR code
    await fetchQRCode()
    startPolling()
    startQRRefreshTimer()
  } catch (err: any) {
    localError.value = err.message || 'Failed to connect to server'
  } finally {
    isLoading.value = false
  }
}

const fetchQRCode = async () => {
  isLoading.value = true
  const result = await api.getLoginQR()
  if (result.success && result.data?.results?.qr_link) {
    localQR.value = result.data.results.qr_link
    appState.setQRCode(result.data.results.qr_link)
    qrExpiresIn.value = result.data.results.qr_duration || 30
    localError.value = null
  } else {
    localError.value = result.error || 'Failed to get QR code'
  }
  isLoading.value = false
}

const startPolling = () => {
  if (pollingInterval) clearInterval(pollingInterval)
  
  // Poll every 2 seconds for connection status
  pollingInterval = setInterval(async () => {
    const result = await api.checkDevices()
    
    if (result.connected) {
      stopAllIntervals()
      goToDashboard()
    }
  }, 2000)
}

const startQRRefreshTimer = () => {
  if (qrRefreshInterval) clearInterval(qrRefreshInterval)
  
  // Countdown timer for QR expiration
  qrRefreshInterval = setInterval(() => {
    qrExpiresIn.value--
    
    if (qrExpiresIn.value <= 0) {
      // Auto-refresh QR when expired
      fetchQRCode()
    }
  }, 1000)
}

const stopAllIntervals = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
  if (qrRefreshInterval) {
    clearInterval(qrRefreshInterval)
    qrRefreshInterval = null
  }
}

const goToDashboard = async () => {
  appState.setQRCode(null)
  localQR.value = null
  appState.setAuthStatus('loading_data')
  
  // Loading animation
  for (let i = 0; i <= 100; i += 20) {
    appState.setLoadingProgress(i)
    await new Promise(r => setTimeout(r, 100))
  }
  
  appState.setAuthStatus('authenticated')
}

const handleRefreshQR = async () => {
  await fetchQRCode()
  startQRRefreshTimer()
}

const handleRetry = () => {
  localError.value = null
  initConnection()
}

onUnmounted(() => {
  stopAllIntervals()
})

// Use props or local state
// Fix mixed content: convert http:// to https:// for QR code URL
const displayQR = computed(() => {
  const qr = props.qrCode || localQR.value
  if (qr && qr.startsWith('http://')) {
    return qr.replace('http://', 'https://')
  }
  return qr
})
const displayError = computed(() => props.error || localError.value)
</script>

<template>
  <div class="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo & Title -->
      <div class="text-center mb-8 animate-fade-in">
        <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-whatsapp mb-4 shadow-lg">
          <MessageCircle class="w-10 h-10 text-white" />
        </div>
        <h1 class="text-3xl font-bold text-white mb-2">Broadcasto</h1>
        <p class="text-muted-foreground">WhatsApp Broadcast Manager</p>
      </div>

      <!-- Loading State -->
      <Card v-if="isLoading && !displayQR" class="glass animate-slide-in">
        <CardContent class="py-12 flex flex-col items-center gap-4">
          <Loader2 class="w-12 h-12 text-whatsapp animate-spin" />
          <p class="text-muted-foreground">Connecting to WhatsApp server...</p>
        </CardContent>
      </Card>

      <!-- Error State -->
      <Card v-else-if="displayError && !displayQR" class="glass animate-slide-in">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-destructive">
            <WifiOff class="w-5 h-5" />
            Connection Failed
          </CardTitle>
          <CardDescription>
            {{ displayError }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="whatsapp" class="w-full" @click="handleRetry">
            <RefreshCw class="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        </CardContent>
      </Card>

      <!-- QR Code Card -->
      <Card v-else-if="displayQR" class="glass animate-slide-in">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span class="flex items-center gap-2">
              <QrCode class="w-5 h-5 text-whatsapp" />
              Scan QR Code
            </span>
            <div class="flex items-center gap-2">
              <Badge v-if="qrExpiresIn > 10" variant="whatsapp">
                <Clock class="w-3 h-3 mr-1" />
                {{ qrExpiresIn }}s
              </Badge>
              <Badge v-else variant="destructive">
                <Clock class="w-3 h-3 mr-1" />
                {{ qrExpiresIn }}s
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Open WhatsApp on your phone and scan this code
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col items-center space-y-4">
          <div class="w-64 h-64 bg-white rounded-xl p-4 shadow-lg relative">
            <img 
              :src="displayQR" 
              alt="WhatsApp QR Code" 
              class="w-full h-full object-contain"
            />
            <!-- Overlay when QR is about to expire -->
            <div 
              v-if="qrExpiresIn <= 5 && qrExpiresIn > 0"
              class="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"
            >
              <div class="text-white text-center">
                <p class="text-sm">QR expiring...</p>
                <p class="text-2xl font-bold">{{ qrExpiresIn }}</p>
              </div>
            </div>
          </div>
          
          <Button variant="outline" size="sm" @click="handleRefreshQR" :disabled="isLoading">
            <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': isLoading }" />
            Refresh QR
          </Button>

          <p class="text-xs text-muted-foreground text-center">
            1. Open WhatsApp on your phone<br>
            2. Tap Menu or Settings > Linked Devices<br>
            3. Tap "Link a Device"<br>
            4. Point your phone at this screen
          </p>
        </CardContent>
      </Card>

      <!-- Connected State (brief) -->
      <Card v-else class="glass animate-slide-in">
        <CardContent class="py-12 flex flex-col items-center gap-4">
          <CheckCircle2 class="w-12 h-12 text-whatsapp" />
          <p class="text-foreground font-medium">Connected!</p>
          <p class="text-muted-foreground text-sm">Loading dashboard...</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
