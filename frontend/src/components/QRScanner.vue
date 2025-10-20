<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-accent-50 to-primary-100 px-4 py-8">
    <div class="max-w-2xl w-full">
      <!-- Glass Card Container -->
      <div class="glass-card p-8 md:p-12 text-center animate-slide-up">
        <!-- Logo/Brand -->
        <div class="mb-8">
          <div class="w-20 h-20 mx-auto bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-xl">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          WhatsApp Broadcast
        </h1>
        <p class="text-lg text-gray-600 mb-8">
          Connect your WhatsApp to start broadcasting
        </p>

        <!-- QR Code Display -->
        <div v-if="qrCode" class="mb-8 animate-fade-in">
          <div class="bg-white rounded-2xl p-6 shadow-lg inline-block">
            <div ref="qrCanvas" class="mx-auto"></div>
          </div>

          <!-- Countdown Timer -->
          <div class="mt-4 text-center">
            <p class="text-sm text-gray-600">
              QR code expires in <span class="font-bold text-primary-600">{{ timeRemaining }}s</span>
            </p>
            <div class="mt-2 w-64 mx-auto bg-gray-200 rounded-full h-2">
              <div
                class="bg-primary-500 h-2 rounded-full transition-all duration-1000"
                :style="{ width: `${(timeRemaining / 45) * 100}%` }"
              ></div>
            </div>
          </div>

          <!-- Pulsing Animation Indicator -->
          <div class="mt-6 flex items-center justify-center">
            <div class="flex space-x-2">
              <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-else class="mb-8">
          <div class="w-64 h-64 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
            <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
          </div>
          <p class="mt-4 text-gray-600">Generating QR code...</p>
        </div>

        <!-- Instructions -->
        <div class="space-y-6 text-left max-w-md mx-auto">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              1
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-1">Open WhatsApp on your phone</h3>
              <p class="text-sm text-gray-600">Open WhatsApp on your phone and navigate to the menu</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              2
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-1">Tap on "Linked Devices"</h3>
              <p class="text-sm text-gray-600">Go to Settings > Linked Devices and tap "Link a Device"</p>
            </div>
          </div>

          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
              3
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 mb-1">Scan the QR code</h3>
              <p class="text-sm text-gray-600">Point your phone at the QR code above to connect</p>
            </div>
          </div>
        </div>

        <!-- Security Notice -->
        <div class="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div class="flex items-start space-x-3">
            <svg class="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="text-left">
              <h4 class="font-semibold text-amber-900 text-sm">Security Notice</h4>
              <p class="text-xs text-amber-700 mt-1">
                Your messages are end-to-end encrypted. We don't store your WhatsApp credentials.
              </p>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="mt-8 text-center text-sm text-gray-600">
        <p>Secure • Private • Fast</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import QRCodeStyling from 'qr-code-styling'

const props = defineProps<{
  qrCode: string
  error?: string
}>()

const qrCanvas = ref<HTMLDivElement>()
let qrCodeStyling: QRCodeStyling | null = null
const qrExpiryTimer = ref<number | null>(null)
const timeRemaining = ref(45) // 45 seconds before auto-refresh

const generateQRCode = async () => {
  console.log('🎨 generateQRCode called')
  console.log('🎨 props.qrCode:', props.qrCode)
  console.log('🎨 qrCanvas.value:', qrCanvas.value)

  if (props.qrCode && qrCanvas.value) {
    try {
      console.log('🎨 Generating QR code...')

      // Clear existing content first
      if (qrCanvas.value) {
        qrCanvas.value.innerHTML = ''
      }

      console.log('🎨 Creating new QR code')
      qrCodeStyling = new QRCodeStyling({
        width: 256,
        height: 256,
        data: props.qrCode,
        margin: 2,
        qrOptions: {
          errorCorrectionLevel: 'H'
        },
        dotsOptions: {
          color: '#1F2937',
          type: 'square'
        },
        backgroundOptions: {
          color: '#FFFFFF'
        },
        cornersSquareOptions: {
          color: '#1F2937',
          type: 'square'
        },
        cornersDotOptions: {
          color: '#1F2937',
          type: 'square'
        }
      })

      await nextTick()
      qrCodeStyling.append(qrCanvas.value)
      console.log('🎨 QR code appended to canvas')

      // Start expiry countdown
      startExpiryTimer()
    } catch (error) {
      console.error('❌ Error generating QR code:', error)
    }
  } else {
    console.log('⚠️ Cannot generate QR code - qrCode or qrCanvas missing')
  }
}

const startExpiryTimer = () => {
  // Clear existing timer
  if (qrExpiryTimer.value) {
    clearInterval(qrExpiryTimer.value)
  }

  timeRemaining.value = 45

  qrExpiryTimer.value = window.setInterval(() => {
    timeRemaining.value--
    console.log('⏱️ QR code expires in:', timeRemaining.value, 'seconds')

    if (timeRemaining.value <= 0) {
      console.log('🔄 QR code expired, reloading page...')
      window.location.reload()
    }
  }, 1000)
}

watch(() => props.qrCode, async (newVal) => {
  console.log('👁️ QRScanner: qrCode prop changed:', newVal?.length || 0)
  if (newVal) {
    await nextTick()
    generateQRCode()
  }
})

onMounted(() => {
  console.log('🚀 QRScanner mounted')
  console.log('🚀 Initial qrCode:', props.qrCode?.length || 0)
  if (props.qrCode) {
    nextTick(() => {
      generateQRCode()
    })
  }
})

onUnmounted(() => {
  // Clean up timer
  if (qrExpiryTimer.value) {
    clearInterval(qrExpiryTimer.value)
  }
})
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.6s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-in;
}
</style>
