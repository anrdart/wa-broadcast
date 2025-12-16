<script setup lang="ts">
import type { Contact } from '~/composables/useWhatsAppAPI'
import type { BroadcastHistory } from '~/composables/useAppState'

const appState = useAppState()
const api = useWhatsAppAPI()
const supabase = useSupabase()

// Initialize Supabase and load data on mount
// Requirements: 3.1, 4.1
onMounted(async () => {
  // Initialize device session in Supabase
  await supabase.initDeviceSession()
  
  // Subscribe to realtime changes with app state integration
  supabase.subscribeWithAppState({
    broadcastHistory: appState.broadcastHistory,
    scheduledMessages: appState.scheduledMessages,
    setBroadcastHistory: appState.setBroadcastHistory,
    setScheduledMessages: appState.setScheduledMessages,
  })
  
  // Fetch initial data from Supabase
  await appState.initBroadcastHistoryFromSupabase()
  await appState.initScheduledMessagesFromSupabase()
  
  // Process any pending offline operations
  await supabase.processOfflineQueue()
  
  // Start scheduled broadcast processor
  startScheduledBroadcastProcessor()
  
  // Add beforeunload handler to process offline queue before app close
  // Requirements: 4.4
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// Cleanup on unmount
// Requirements: 4.4
onUnmounted(() => {
  // Remove beforeunload handler
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // Unsubscribe from realtime changes
  supabase.unsubscribeFromChanges()
})

// Handle app close - process offline queue and deactivate session
// Requirements: 4.4
const handleBeforeUnload = async () => {
  // Process any remaining offline queue
  await supabase.processOfflineQueue()
  
  // Deactivate device session
  await supabase.deactivateDeviceSession()
}

// Load scheduled broadcasts from localStorage (for backward compatibility with scheduled broadcast processor)
const loadScheduledBroadcasts = () => {
  const saved = localStorage.getItem('scheduled_broadcasts')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch { return [] }
  }
  return []
}

// Scheduled broadcast processor - check and send due broadcasts every 30 seconds
const startScheduledBroadcastProcessor = () => {
  setInterval(async () => {
    const scheduled = loadScheduledBroadcasts()
    const now = new Date()
    
    for (const broadcast of scheduled) {
      if (broadcast.status !== 'pending') continue
      
      const scheduledTime = new Date(broadcast.scheduled_at)
      if (scheduledTime <= now) {
        // Execute the broadcast
        await executeBroadcast(broadcast)
      }
    }
  }, 30000) // Check every 30 seconds
}

// Execute a scheduled broadcast
const executeBroadcast = async (broadcast: any) => {
  try {
    // Update status to in_progress
    updateScheduledBroadcastStatus(broadcast.id, 'in_progress')
    updateHistoryStatus(broadcast.id, 'in_progress')
    
    let success = 0
    let failed = 0
    
    for (const phone of broadcast.recipients) {
      try {
        if (broadcast.hasMedia && broadcast.mediaBase64) {
          // Send with media
          const byteCharacters = atob(broadcast.mediaBase64.split(',')[1])
          const byteNumbers = new Array(byteCharacters.length)
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i)
          }
          const byteArray = new Uint8Array(byteNumbers)
          const blob = new Blob([byteArray], { type: broadcast.mediaType || 'image/png' })
          const file = new File([blob], broadcast.mediaName || 'image.png', { type: broadcast.mediaType || 'image/png' })
          
          const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
          await api.sendImageWithFile(jid, file, broadcast.message)
        } else {
          // Send text only
          const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
          await api.sendMessage(jid, broadcast.message)
        }
        success++
      } catch {
        failed++
      }
      
      // Small delay between messages
      await new Promise(r => setTimeout(r, 2000))
    }
    
    // Update status to completed
    updateScheduledBroadcastStatus(broadcast.id, 'completed')
    updateHistoryStatus(broadcast.id, 'completed', success, failed)
    
  } catch (err) {
    console.error('Failed to execute scheduled broadcast:', err)
    updateScheduledBroadcastStatus(broadcast.id, 'failed')
    updateHistoryStatus(broadcast.id, 'failed')
  }
}

// Update scheduled broadcast status in localStorage
const updateScheduledBroadcastStatus = (id: string, status: string) => {
  const scheduled = loadScheduledBroadcasts()
  const updated = scheduled.map((b: any) => b.id === id ? { ...b, status } : b)
  localStorage.setItem('scheduled_broadcasts', JSON.stringify(updated))
}

// Update broadcast history status
const updateHistoryStatus = (id: string, status: string, success = 0, failed = 0) => {
  const history = appState.broadcastHistory.value.map(h => 
    h.id === id ? { ...h, status: status as any, successful: success, failed } : h
  )
  appState.setBroadcastHistory(history)
}

// Sync contacts on mount if already authenticated
onMounted(async () => {
  if (appState.authStatus.value === 'authenticated') {
    await syncContacts()
  }
})

// Watch for authentication and sync contacts
watch(() => appState.authStatus.value, async (status) => {
  if (status === 'authenticated') {
    await syncContacts()
  }
})

// Sync contacts from WhatsApp
const syncContacts = async () => {
  try {
    const result = await api.getMyContacts()
    if (result.success && result.data?.results) {
      const contacts: Contact[] = result.data.results.map((item) => ({
        id: item.jid,
        name: item.name || extractPhoneFromJid(item.jid),
        number: extractPhoneFromJid(item.jid),
        isMyContact: true,
        isFromCSV: false,
      }))
      appState.setContacts(contacts)
    }
  } catch (err) {
    console.error('Failed to sync contacts:', err)
  }
}

// Extract phone number from JID (e.g., "628123456789@s.whatsapp.net" -> "628123456789")
const extractPhoneFromJid = (jid: string): string => {
  return jid.replace(/@.*$/, '')
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- QR Scanner / Login -->
    <QRScanner
      v-if="appState.authStatus.value === 'unauthenticated' || appState.authStatus.value === 'authenticating'"
      :qr-code="appState.qrCode.value"
      :error="appState.connectionError.value"
    />

    <!-- Loading Screen -->
    <LoadingScreen
      v-else-if="appState.authStatus.value === 'loading_data'"
      :progress="appState.loadingProgress.value"
    />

    <!-- Main Dashboard -->
    <div v-else-if="appState.authStatus.value === 'authenticated'" class="min-h-screen">
      <HeaderComponent />
      
      <main class="container mx-auto px-4 py-6">
        <!-- Desktop: 3-column layout -->
        <div class="grid gap-6 lg:grid-cols-[300px_1fr_320px]">
          <!-- Contacts Sidebar -->
          <aside class="order-2 lg:order-1 lg:h-[calc(100vh-140px)]">
            <ContactsSidebar />
          </aside>

          <!-- Main Content Area -->
          <div class="order-1 lg:order-2 space-y-6">
            <!-- Broadcast View -->
            <Transition name="fade" mode="out-in">
              <div v-if="appState.currentView.value === 'broadcast'" key="broadcast">
                <BroadcastInterface />
              </div>

              <div v-else-if="appState.currentView.value === 'history'" key="history">
                <BroadcastHistoryPanel />
              </div>

              <div v-else-if="appState.currentView.value === 'settings'" key="settings">
                <!-- Settings -->
                <Card class="p-6">
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p class="text-muted-foreground">Settings coming soon</p>
                  </CardContent>
                </Card>
              </div>
            </Transition>
          </div>

          <!-- Right Sidebar: Scheduled Messages -->
          <aside class="order-3 lg:h-[calc(100vh-140px)]">
            <ScheduledMessagesPanel />
          </aside>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
