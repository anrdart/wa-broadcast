<template>
  <header class="glass-header">
    <div class="header-bg glass-card">
      <div class="header-content">
        <div class="header-title">
          <h1><i class="fab fa-whatsapp"></i> WhatsApp Modern</h1>
          <p>Broadcast & Real-time Messaging</p>
        </div>
        <div class="header-controls">
          <div class="connection-status" id="header-connection-status">
            <span class="connection-dot" :class="connectionStatus"></span>
            <span class="connection-text">{{ connectionText }}</span>
          </div>
          <button id="toggle-theme" class="glass-btn" @click="toggleTheme" title="Toggle Theme">
            <i :class="themeIcon"></i>
          </button>
          <button id="toggle-view" class="glass-btn" @click="$emit('toggle-view')" title="Switch View">
            <i :class="viewIcon"></i>
          </button>
        </div>
      </div>
      <div class="header-subtitle">
        <span class="glass-badge">
          <i class="fas fa-globe"></i> Global RealtimeKit
        </span>
        <span class="glass-badge">
          <i class="fas fa-mobile-alt"></i> Responsive Design
        </span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app'

interface Props {
  showChat: boolean
}

const props = defineProps<Props>()
defineEmits<{
  'toggle-view': []
}>()

const appStore = useAppStore()
const isDark = ref(document.body.classList.contains('theme-dark'))

const connectionStatus = computed(() => {
  switch (appStore.authStatus) {
    case 'authenticated': return 'connected'
    case 'authenticating': return 'connecting'
    default: return ''
  }
})

const connectionText = computed(() => {
  switch (appStore.authStatus) {
    case 'authenticated': return 'Connected'
    case 'authenticating': return 'Connecting...'
    default: return 'Offline'
  }
})

const viewIcon = computed(() => {
  return props.showChat ? 'fas fa-bullhorn' : 'fas fa-comments'
})

const themeIcon = computed(() => {
  return isDark.value ? 'fas fa-sun' : 'fas fa-moon'
})

const toggleTheme = () => {
  document.body.classList.toggle('theme-dark')
  isDark.value = document.body.classList.contains('theme-dark')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Initialize theme on mount
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.body.classList.add('theme-dark')
  isDark.value = true
}
</script>

<style scoped>
.glass-header {
  position: relative;
  z-index: 10;
}

.header-bg {
  margin: 15px;
  border-radius: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-title h1 {
  font-size: 2rem;
  margin-bottom: 4px;
}

.header-title p {
  font-size: 0.9rem;
  opacity: 0.8;
  margin: 0;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e74c3c;
  animation: pulse 2s infinite;
}

.connection-dot.connected {
  background: #25D366;
}

.connection-dot.connecting {
  background: #f39c12;
}

.header-subtitle {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  justify-content: center;
}

.glass-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 12px;
  }

  .header-title h1 {
    font-size: 1.5rem;
  }

  .header-controls {
    flex-wrap: wrap;
    justify-content: center;
  }

  .header-subtitle {
    flex-direction: column;
    gap: 8px;
  }
}
</style>