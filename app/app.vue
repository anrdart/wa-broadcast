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
  
  // Clear scheduled broadcast processor interval
  if (scheduledBroadcastInterval) {
    clearInterval(scheduledBroadcastInterval)
    scheduledBroadcastInterval = null
  }
  
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

// Store interval ID for cleanup
let scheduledBroadcastInterval: ReturnType<typeof setInterval> | null = null

// Scheduled broadcast processor - check and send due broadcasts every 30 seconds
const startScheduledBroadcastProcessor = () => {
  scheduledBroadcastInterval = setInterval(async () => {
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

// Note: Initial contact sync for already-authenticated users is handled in the first onMounted hook
// by checking authStatus after initialization

// Watch for authentication and sync contacts
watch(() => appState.authStatus.value, async (status) => {
  if (status === 'loading_data') {
    // Sync contacts with retry during loading phase
    await syncContactsWithRetry()
  }
})

// Sync contacts from WhatsApp with retry mechanism
// This handles the delay between QR scan and WhatsApp server sync
// Waits until contacts count stabilizes (no new contacts for 2 consecutive checks)
const syncContactsWithRetry = async () => {
  const maxRetries = 15
  const retryDelay = 2000 // 2 seconds between retries
  const stabilityChecks = 2 // Number of consecutive checks with same count to consider stable
  
  let lastContactCount = 0
  let stableCount = 0
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Update progress based on attempt
    const progress = Math.min(10 + (attempt * 6), 95)
    appState.setLoadingProgress(progress)
    
    try {
      const result = await api.getMyContacts()
      const contactsData = result.data?.results?.data || result.data?.results
      
      if (result.success && Array.isArray(contactsData) && contactsData.length > 0) {
        const currentCount = contactsData.length
        console.log(`[Sync] Attempt ${attempt}/${maxRetries}: Found ${currentCount} contacts`)
        
        // Update contacts in state
        const contacts = transformContactsData(contactsData)
        appState.setContacts(contacts)
        
        // Check if count is stable (same as last check)
        if (currentCount === lastContactCount) {
          stableCount++
          console.log(`[Sync] Contact count stable (${stableCount}/${stabilityChecks})`)
          
          if (stableCount >= stabilityChecks) {
            // Contacts are stable, finish loading
            console.log(`[Sync] Sync complete! Final count: ${currentCount} contacts`)
            appState.setLoadingProgress(100)
            await new Promise(r => setTimeout(r, 500))
            appState.setAuthStatus('authenticated')
            return
          }
        } else {
          // Count changed, reset stability counter
          stableCount = 0
          lastContactCount = currentCount
        }
        
        await new Promise(r => setTimeout(r, retryDelay))
      } else {
        // No contacts yet, wait and retry
        console.log(`[Sync] Attempt ${attempt}/${maxRetries}: No contacts yet, retrying...`)
        stableCount = 0
        lastContactCount = 0
        await new Promise(r => setTimeout(r, retryDelay))
      }
      
    } catch (err) {
      console.error(`[Sync] Attempt ${attempt}/${maxRetries} failed:`, err)
      stableCount = 0
      await new Promise(r => setTimeout(r, retryDelay))
    }
  }
  
  // Max retries reached, proceed anyway (user can manually sync later)
  console.log('[Sync] Max retries reached, proceeding to dashboard')
  appState.setLoadingProgress(100)
  await new Promise(r => setTimeout(r, 500))
  appState.setAuthStatus('authenticated')
}

// Sync contacts from WhatsApp (for manual refresh)
const syncContacts = async () => {
  try {
    const result = await api.getMyContacts()
    // Handle nested response: results.data can be null or array
    const contactsData = result.data?.results?.data || result.data?.results
    if (result.success && Array.isArray(contactsData) && contactsData.length > 0) {
      appState.setContacts(transformContactsData(contactsData))
    }
  } catch (err) {
    console.error('Failed to sync contacts:', err)
  }
}

// Extract phone number from JID (e.g., "628123456789@s.whatsapp.net" -> "628123456789")
const extractPhoneFromJid = (jid: string): string => {
  return jid.replace(/@.*$/, '')
}

// Transform API contact data to Contact type
const transformContactsData = (contactsData: any[]): Contact[] => {
  return contactsData.map((item) => ({
    id: item.jid,
    name: item.name || extractPhoneFromJid(item.jid),
    number: extractPhoneFromJid(item.jid),
    isMyContact: true,
    isFromCSV: false,
  }))
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
