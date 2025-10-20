<template>
  <div class="status-qr-card glass-card">
    <!-- Connection Status Section -->
    <div class="status-section">
      <div class="status-info">
        <div :class="['status-indicator', connectionStatus]" class="glass-status">
          <span class="status-dot" :class="connectionStatus"></span>
          <span class="status-text">{{ connectionText }}</span>
        </div>
        <div class="status-actions">
          <button
            id="connect-btn"
            class="glass-btn glass-primary"
            :disabled="isConnecting || isConnected"
            @click="connectToServer"
          >
            <i class="fas fa-play"></i> {{ isConnected ? 'Connected' : 'Connect' }}
          </button>
          <button
            id="logout-btn"
            class="glass-btn glass-danger"
            v-if="isConnected"
            @click="logout"
          >
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>

      <!-- Warning Notice -->
      <div class="warning-notice glass-notice">
        <div class="warning-header">
          <i class="fas fa-exclamation-triangle"></i>
          <strong>Penting: Gunakan tool ini dengan bijak</strong>
        </div>
        <ol class="warning-list">
          <li>Jangan spam kontak dengan pesan yang tidak relevan</li>
          <li>Hormati privasi dan preferensi penerima</li>
          <li>Gunakan delay yang cukup antar pesan</li>
          <li>Patuhi terms of service WhatsApp</li>
        </ol>
      </div>
    </div>

    <!-- QR Code Section -->
    <div id="qr-section" class="qr-section glass-qr" v-if="showQR">
      <div id="qr-container" class="glass-qr-container">
        <div v-if="!qrCode" id="qr-placeholder">
          <i class="fas fa-qrcode"></i>
          <p>QR Code akan muncul di sini</p>
          <p class="qr-instruction">Scan dengan WhatsApp di ponsel Anda</p>
        </div>
        <div v-else id="qr-code-display">
          <div id="qrcode" ref="qrcodeContainer"></div>
          <p class="qr-instruction">Scan QR code di atas dengan WhatsApp</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/app'
import QRCodeStyling from 'qr-code-styling'

const appStore = useAppStore()

// Reactive data
const qrcodeContainer = ref<HTMLDivElement>()
let qrCodeStyling: QRCodeStyling | null = null

// Computed properties
const connectionStatus = computed(() => {
  switch (appStore.authStatus) {
    case 'authenticated': return 'connected'
    case 'authenticating': return 'connecting'
    default: return 'disconnected'
  }
})

const connectionText = computed(() => {
  switch (appStore.authStatus) {
    case 'authenticated': return 'Terhubung ke WhatsApp'
    case 'authenticating': return 'Menghubungkan...'
    default: return 'Tidak Terhubung'
  }
})

const isConnected = computed(() => appStore.isConnected)
const isConnecting = computed(() => appStore.authStatus === 'authenticating')
const showQR = computed(() => appStore.authStatus === 'authenticating' || appStore.qrCode)
const qrCode = computed(() => appStore.qrCode)

// Methods
const connectToServer = () => {
  appStore.initWebSocket()
}

const logout = () => {
  appStore.logout()
}

// The WebSocket service handles message routing now, so we don't need this

const generateQRCode = async (qrData: string) => {
  if (!qrcodeContainer.value) return

  try {
    if (qrCodeStyling) {
      qrCodeStyling.update({
        data: qrData
      })
    } else {
      qrCodeStyling = new QRCodeStyling({
        width: 256,
        height: 256,
        data: qrData,
        margin: 2,
        qrOptions: {
          errorCorrectionLevel: 'H'
        },
        dotsOptions: {
          color: '#000000',
          type: 'square'
        },
        backgroundOptions: {
          color: '#ffffff'
        },
        cornersSquareOptions: {
          color: '#000000',
          type: 'square'
        },
        cornersDotOptions: {
          color: '#000000',
          type: 'square'
        }
      })
      qrCodeStyling.append(qrcodeContainer.value)
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    if (qrcodeContainer.value) {
      qrcodeContainer.value.innerHTML = '<p>Error generating QR code</p>'
    }
  }
}

// Watch for QR code changes
watch(qrCode, (newQR) => {
  if (newQR && qrcodeContainer.value) {
    generateQRCode(newQR)
  }
})

// Initialize QRCode library
onMounted(async () => {
  // QRCode is imported at the top
})
</script>

<style scoped>
.status-qr-card {
  display: flex;
  gap: 30px;
  min-height: 120px;
  padding: 20px;
}

.status-section {
  flex: 1;
}

.status-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
}

.status-dot.connected {
  background: #25D366;
}

.status-dot.connecting {
  background: #f39c12;
  animation: pulse 2s infinite;
}

.status-actions {
  display: flex;
  gap: 12px;
}

.qr-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

#qr-container {
  padding: 20px;
  text-align: center;
  min-width: 200px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

#qr-placeholder {
  color: var(--text-secondary);
}

#qr-placeholder i {
  font-size: 2.5rem;
  color: #25D366;
  margin-bottom: 10px;
  display: block;
}

.qr-instruction {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.9rem;
  margin-top: 10px;
}

.warning-notice {
  padding: 15px;
  margin-bottom: 0;
  text-align: left;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
}

.warning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #856404;
}

.warning-header i {
  font-size: 1.1rem;
  color: #f39c12;
}

.warning-header strong {
  font-weight: 600;
  font-size: 14px;
}

.warning-list {
  margin: 0;
  padding-left: 20px;
  color: #6c5ce7;
  font-size: 13px;
  line-height: 1.6;
}

.warning-list li {
  margin-bottom: 4px;
  font-weight: 500;
}

.realtime-status {
  font-size: 0.85rem;
  font-weight: normal;
  opacity: 0.8;
  margin-left: 10px;
}

.realtime-status.realtime-connected {
  color: #25D366;
}

.realtime-status.realtime-disconnected {
  color: #e74c3c;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .status-qr-card {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .status-info {
    flex-direction: column;
    gap: 15px;
  }

  .status-actions {
    justify-content: center;
  }

  .warning-notice {
    max-width: none;
  }
}
</style>