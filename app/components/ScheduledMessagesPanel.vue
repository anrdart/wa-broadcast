<script setup lang="ts">
import { Calendar, Clock, Trash2, Plus, Send, Users, X, Loader2, RefreshCw, Image, XCircle, Cloud, CloudOff } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { toScheduledMessageRecord, fromScheduledMessageRecord, type LocalScheduledMessage } from '~/types/supabase'
import { getDeviceId } from '~/utils/deviceId'

interface ScheduledMessage {
  id: string
  recipient: string
  recipientName?: string
  message: string
  scheduled_at: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  created_at: string
  hasMedia?: boolean
  mediaBase64?: string
  mediaType?: string
  mediaName?: string
}

const api = useWhatsAppAPI()
const appState = useAppState()
const supabase = useSupabase()

const showCreateModal = ref(false)
const isLoading = ref(false)
const isSending = ref(false)
const scheduledMessages = ref<ScheduledMessage[]>([])

// Media state
const mediaFile = ref<File | null>(null)
const mediaPreview = ref<string | null>(null)
const mediaBase64 = ref<string | null>(null)

// Form state
const newMessage = ref('')
const scheduledDateTime = ref('')
const selectedRecipient = ref('')
const selectedRecipientName = ref('')
const contactSearch = ref('')
const showContactDropdown = ref(false)

// Filtered contacts based on search
const filteredContacts = computed(() => {
  if (!contactSearch.value) return appState.contacts.value.slice(0, 10)
  const query = contactSearch.value.toLowerCase()
  return appState.contacts.value
    .filter(c => 
      c.name?.toLowerCase().includes(query) || 
      c.number?.includes(query)
    )
    .slice(0, 10)
})

// Select a contact from dropdown
const selectContact = (contact: { id: string; name?: string; number?: string }) => {
  selectedRecipient.value = contact.number || contact.id
  selectedRecipientName.value = contact.name || ''
  contactSearch.value = ''
  showContactDropdown.value = false
}

// Clear selected recipient
const clearRecipient = () => {
  selectedRecipient.value = ''
  selectedRecipientName.value = ''
  contactSearch.value = ''
}

// Handle Enter key on search input to use as manual phone
const handleSearchKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && contactSearch.value && !selectedRecipient.value) {
    selectedRecipient.value = contactSearch.value
    selectedRecipientName.value = ''
    contactSearch.value = ''
    showContactDropdown.value = false
  }
}

/**
 * Load scheduled messages from Supabase on mount
 * Requirements: 2.1, 2.4
 */
onMounted(async () => {
  // Load from Supabase first, fallback to localStorage
  await loadFromSupabase()
  
  // Subscribe to realtime updates
  // Requirements: 2.3
  supabase.subscribeWithAppState({
    broadcastHistory: appState.broadcastHistory,
    scheduledMessages: appState.scheduledMessages,
    setBroadcastHistory: appState.setBroadcastHistory,
    setScheduledMessages: appState.setScheduledMessages,
  })
  
  checkAndSendDueMessages()
  
  // Check for due messages every minute
  const interval = setInterval(checkAndSendDueMessages, 60000)
  onUnmounted(() => {
    clearInterval(interval)
    supabase.unsubscribeFromChanges()
  })
})

/**
 * Load scheduled messages from Supabase
 * Requirements: 2.4
 */
const loadFromSupabase = async () => {
  isLoading.value = true
  try {
    const records = await supabase.fetchScheduledMessages()
    // Filter to only pending messages and convert to local format
    scheduledMessages.value = records
      .filter(r => r.status === 'pending')
      .map(r => ({
        id: r.id,
        recipient: r.contact_id || '',
        message: r.message,
        scheduled_at: r.scheduled_time,
        status: r.status as 'pending' | 'sent' | 'failed',
        created_at: r.created_at,
        hasMedia: !!r.media_url,
      }))
  } catch (error) {
    console.error('[ScheduledMessagesPanel] Error loading from Supabase:', error)
    // Fallback to localStorage
    loadFromStorage()
  } finally {
    isLoading.value = false
  }
}

/**
 * Refresh messages from Supabase
 */
const refreshMessages = async () => {
  await loadFromSupabase()
}

const loadFromStorage = () => {
  if (import.meta.client) {
    const stored = localStorage.getItem('scheduled_messages')
    if (stored) {
      try {
        scheduledMessages.value = JSON.parse(stored)
      } catch (e) {
        scheduledMessages.value = []
      }
    }
  }
}

const saveToStorage = () => {
  if (import.meta.client) {
    localStorage.setItem('scheduled_messages', JSON.stringify(scheduledMessages.value))
  }
}

const checkAndSendDueMessages = async () => {
  const now = new Date()
  const dueMessages = scheduledMessages.value.filter(
    m => m.status === 'pending' && new Date(m.scheduled_at) <= now
  )
  
  for (const msg of dueMessages) {
    await sendScheduledMessage(msg)
  }
}

const sendScheduledMessage = async (msg: ScheduledMessage) => {
  try {
    const jid = msg.recipient.includes('@') ? msg.recipient : `${msg.recipient}@s.whatsapp.net`
    const result = await api.sendMessage(jid, msg.message)
    
    if (result.success) {
      msg.status = 'sent'
    } else {
      msg.status = 'failed'
    }
  } catch (err) {
    msg.status = 'failed'
    console.error('Failed to send scheduled message:', err)
  }
  
  saveToStorage()
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'warning' as const
    case 'sent': return 'success' as const
    case 'failed': return 'destructive' as const
    default: return 'secondary' as const
  }
}

const isOverdue = (scheduledAt: string) => {
  return new Date(scheduledAt) < new Date()
}

/**
 * Handle cancel/delete scheduled message
 * Requirements: 2.2 - Update status to 'cancelled' in Supabase
 */
const handleDelete = async (messageId: string) => {
  if (!confirm('Cancel this scheduled message?')) return
  
  // Update local state immediately
  scheduledMessages.value = scheduledMessages.value.filter(m => m.id !== messageId)
  saveToStorage()
  
  // Update status to cancelled in Supabase
  // Requirements: 2.2
  try {
    if (supabase.isConnected.value) {
      await supabase.updateScheduledMessageStatus(messageId, 'cancelled')
    } else {
      // Queue for offline sync
      supabase.queueOperation({
        type: 'update',
        table: 'scheduled_messages',
        data: { id: messageId, status: 'cancelled' },
      })
    }
  } catch (error) {
    console.error('[ScheduledMessagesPanel] Error cancelling message in Supabase:', error)
  }
}

/**
 * Create a new scheduled message
 * Requirements: 2.1 - Save to Supabase
 */
const handleCreate = async () => {
  if (!newMessage.value || !scheduledDateTime.value || !selectedRecipient.value) return
  
  const messageId = `sched-${Date.now()}`
  const newScheduledMessage: ScheduledMessage = {
    id: messageId,
    recipient: selectedRecipient.value,
    recipientName: selectedRecipientName.value || undefined,
    message: newMessage.value,
    scheduled_at: new Date(scheduledDateTime.value).toISOString(),
    status: 'pending',
    created_at: new Date().toISOString(),
    hasMedia: !!mediaFile.value,
    mediaBase64: mediaBase64.value || undefined,
    mediaType: mediaFile.value?.type,
    mediaName: mediaFile.value?.name,
  }
  
  // Update local state immediately
  scheduledMessages.value.push(newScheduledMessage)
  saveToStorage()
  
  // Save to Supabase
  // Requirements: 2.1
  try {
    const deviceId = getDeviceId()
    const localMessage: LocalScheduledMessage = {
      id: messageId,
      recipient: selectedRecipient.value,
      message: newMessage.value,
      scheduled_at: new Date(scheduledDateTime.value).toISOString(),
      status: 'pending',
    }
    const record = toScheduledMessageRecord(localMessage, deviceId)
    
    if (supabase.isConnected.value) {
      await supabase.saveScheduledMessage(record as any)
    } else {
      // Queue for offline sync
      supabase.queueOperation({
        type: 'insert',
        table: 'scheduled_messages',
        data: record as unknown as Record<string, unknown>,
      })
    }
  } catch (error) {
    console.error('[ScheduledMessagesPanel] Error saving to Supabase:', error)
  }
  
  // Reset form
  showCreateModal.value = false
  newMessage.value = ''
  scheduledDateTime.value = ''
  clearRecipient()
  clearMedia()
}

// Media handling
const handleMediaSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    alert('Only images are supported')
    return
  }
  
  mediaFile.value = file
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    mediaPreview.value = result
    mediaBase64.value = result
  }
  reader.readAsDataURL(file)
}

const clearMedia = () => {
  mediaFile.value = null
  mediaPreview.value = null
  mediaBase64.value = null
}

const handleSendNow = async (msg: ScheduledMessage) => {
  isSending.value = true
  await sendScheduledMessage(msg)
  isSending.value = false
}

const getMinDateTime = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5) // At least 5 minutes from now
  return now.toISOString().slice(0, 16)
}

// Sort: pending first, then by scheduled time
const sortedMessages = computed(() => {
  return [...scheduledMessages.value].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  })
})
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-lg flex items-center gap-2">
            <Calendar class="w-5 h-5 text-whatsapp" />
            Scheduled Messages
            <!-- Sync Status Indicator - Requirements: 2.1, 2.3 -->
            <Badge 
              v-if="supabase.isSyncing.value || isLoading" 
              variant="secondary" 
              class="ml-2 flex items-center gap-1"
            >
              <Loader2 class="w-3 h-3 animate-spin" />
            </Badge>
            <Badge 
              v-else-if="supabase.isConnected.value" 
              variant="outline" 
              class="ml-2 flex items-center gap-1 text-green-600 border-green-600"
            >
              <Cloud class="w-3 h-3" />
            </Badge>
            <Badge 
              v-else 
              variant="outline" 
              class="ml-2 flex items-center gap-1 text-yellow-600 border-yellow-600"
            >
              <CloudOff class="w-3 h-3" />
            </Badge>
          </CardTitle>
          <CardDescription>
            Schedule messages for later
          </CardDescription>
        </div>
        <div class="flex gap-2">
          <!-- Refresh Button -->
          <Button 
            variant="outline" 
            size="sm" 
            @click="refreshMessages"
            :disabled="isLoading"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
          <Button size="sm" variant="outline" @click="showCreateModal = true">
            <Plus class="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 overflow-y-auto space-y-3">
      <!-- Loading State -->
      <div 
        v-if="isLoading && sortedMessages.length === 0"
        class="text-center py-8 text-muted-foreground"
      >
        <Loader2 class="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
        <p>Loading scheduled messages...</p>
      </div>
      
      <!-- Empty State -->
      <div 
        v-else-if="sortedMessages.length === 0"
        class="text-center py-8 text-muted-foreground"
      >
        <Calendar class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No scheduled messages</p>
        <p class="text-sm">Schedule messages to send later</p>
      </div>

      <!-- Message List -->
      <template v-else>
        <div
          v-for="message in sortedMessages"
          :key="message.id"
          class="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          :class="{ 'border-yellow-500/50': isOverdue(message.scheduled_at) && message.status === 'pending' }"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium line-clamp-2">{{ message.message }}</p>
              <div class="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock class="w-3 h-3" />
                <span :class="{ 'text-yellow-500': isOverdue(message.scheduled_at) && message.status === 'pending' }">
                  {{ formatDate(message.scheduled_at) }}
                </span>
              </div>
              <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Users class="w-3 h-3" />
                <span>{{ message.recipient }}</span>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2">
              <Badge :variant="getStatusColor(message.status)">
                {{ message.status }}
              </Badge>
              <div class="flex gap-1">
                <!-- Send Now button for pending messages -->
                <Button 
                  v-if="message.status === 'pending'"
                  variant="ghost" 
                  size="icon" 
                  class="h-8 w-8 text-whatsapp"
                  @click="handleSendNow(message)"
                  :disabled="isSending"
                  title="Send now"
                >
                  <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
                  <Send v-else class="w-4 h-4" />
                </Button>
                <!-- Delete button -->
                <Button 
                  variant="ghost" 
                  size="icon" 
                  class="h-8 w-8 text-muted-foreground hover:text-destructive"
                  @click="handleDelete(message.id)"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </CardContent>

    <!-- Create Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div 
          v-if="showCreateModal" 
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="showCreateModal = false"
        >
          <Card class="w-full max-w-md animate-slide-in">
            <CardHeader>
              <div class="flex items-center justify-between">
                <CardTitle class="flex items-center gap-2">
                  <Calendar class="w-5 h-5 text-whatsapp" />
                  Schedule Message
                </CardTitle>
                <Button variant="ghost" size="icon" @click="showCreateModal = false">
                  <X class="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Schedule a message to be sent at a specific time
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <!-- Contact Picker -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Select Recipient</label>
                <div class="relative">
                  <Input 
                    v-model="contactSearch"
                    placeholder="Search contacts or enter phone..."
                    @focus="showContactDropdown = true"
                  />
                  
                  <!-- Contact Dropdown -->
                  <div 
                    v-if="showContactDropdown && filteredContacts.length > 0"
                    class="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-popover border rounded-md shadow-lg"
                  >
                    <button
                      v-for="contact in filteredContacts"
                      :key="contact.id"
                      type="button"
                      class="w-full px-3 py-2 text-left hover:bg-accent text-sm flex items-center gap-2"
                      @click="selectContact(contact)"
                    >
                      <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span class="text-xs font-medium">{{ contact.name?.charAt(0).toUpperCase() || '?' }}</span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium truncate">{{ contact.name }}</p>
                        <p class="text-xs text-muted-foreground">{{ contact.number }}</p>
                      </div>
                    </button>
                  </div>
                </div>
                
                <!-- Selected Contact or Manual Input -->
                <div v-if="selectedRecipient" class="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <Users class="w-4 h-4 text-muted-foreground" />
                  <span class="flex-1 text-sm">{{ selectedRecipientName || selectedRecipient }}</span>
                  <Button variant="ghost" size="icon" class="h-6 w-6" @click="clearRecipient">
                    <X class="w-3 h-3" />
                  </Button>
                </div>
                
                <p v-if="!selectedRecipient" class="text-xs text-muted-foreground">
                  Select from contacts or type a phone number and press Enter
                </p>
              </div>
              
              <div class="space-y-2">
                <label class="text-sm font-medium">Message</label>
                <Textarea 
                  v-model="newMessage"
                  placeholder="Type your message..."
                  class="min-h-[100px]"
                />
                <p class="text-xs text-muted-foreground">{{ newMessage.length }} characters</p>
              </div>
              
              <!-- Media Attachment -->
              <div class="space-y-2">
                <label class="text-sm font-medium">Attach Image (Optional)</label>
                <div 
                  v-if="!mediaFile"
                  class="border-2 border-dashed border-muted rounded-lg p-4 text-center cursor-pointer hover:border-whatsapp transition-colors"
                  @click="($refs.mediaInput as HTMLInputElement)?.click()"
                >
                  <Image class="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                  <p class="text-xs text-muted-foreground">Click to upload image</p>
                </div>
                
                <div v-else class="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div v-if="mediaPreview" class="w-12 h-12 rounded overflow-hidden shrink-0">
                    <img :src="mediaPreview" class="w-full h-full object-cover" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ mediaFile.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ (mediaFile.size / 1024).toFixed(1) }} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" class="h-8 w-8" @click="clearMedia">
                    <XCircle class="w-4 h-4" />
                  </Button>
                </div>
                
                <input 
                  ref="mediaInput"
                  type="file" 
                  accept="image/*" 
                  class="hidden" 
                  @change="handleMediaSelect"
                />
              </div>
              
              <div class="space-y-2">
                <label class="text-sm font-medium">Date & Time</label>
                <Input 
                  v-model="scheduledDateTime"
                  type="datetime-local"
                  :min="getMinDateTime()"
                />
                <p class="text-xs text-muted-foreground">Schedule at least 5 minutes from now</p>
              </div>

              <div class="flex gap-2 pt-2">
                <Button variant="outline" class="flex-1" @click="showCreateModal = false">
                  Cancel
                </Button>
                <Button 
                  variant="whatsapp" 
                  class="flex-1 gap-2"
                  :disabled="!newMessage || !scheduledDateTime || !selectedRecipient"
                  @click="handleCreate"
                >
                  <Calendar class="w-4 h-4" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Transition>
    </Teleport>
  </Card>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
