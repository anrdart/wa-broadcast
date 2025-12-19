<script setup lang="ts">
import { Send, Users, Image, Clock, XCircle, Loader2, Calendar, X, Cloud, CloudOff, RefreshCw } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Textarea } from '~/components/ui/textarea'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import type { Contact } from '~/composables/useWhatsAppAPI'
import { toBroadcastHistoryRecord } from '~/types/supabase'
import { getDeviceId } from '~/utils/deviceId'

const appState = useAppState()
const api = useWhatsAppAPI()
const supabase = useSupabase()

const messageText = ref('')
const includeMedia = ref(false)
const mediaFile = ref<File | null>(null)
const mediaPreview = ref<string | null>(null)
const isSending = ref(false)
const showScheduleModal = ref(false)
const scheduledDateTime = ref('')

const MAX_CONTACTS = 500
const charCount = computed(() => messageText.value.length)

const canSend = computed(() => {
  return messageText.value.trim().length > 0 && 
         appState.selectedContacts.value.size > 0 &&
         !isSending.value
})

// Store media as base64 for scheduled broadcasts
const mediaBase64 = ref<string | null>(null)

const handleSendBroadcast = async () => {
  if (!canSend.value) return

  isSending.value = true
  const selectedIds = Array.from(appState.selectedContacts.value)
  const contactsList = appState.contacts.value.filter((c: Contact) => selectedIds.includes(c.id))
  const phones = contactsList.map((c: Contact) => c.number)

  appState.setBroadcastProgress({ current: 0, total: phones.length })

  try {
    let result: { success: boolean; results: { phone: string; success: boolean }[] }
    
    // Check if media is attached
    if (mediaFile.value && mediaFile.value.type.startsWith('image/')) {
      // Use sendBroadcastWithMedia for image broadcasts
      result = await api.sendBroadcastWithMedia(
        phones, 
        messageText.value, 
        mediaFile.value, 
        2000,
        (current, total) => appState.setBroadcastProgress({ current, total })
      )
    } else {
      // Use regular text broadcast
      result = await api.sendBroadcast(phones, messageText.value, 2000)
    }

    // Count successful sends
    const successCount = result.results.filter((r) => r.success).length
    const failCount = phones.length - successCount

    // Build recipients list with names
    const recipients = contactsList.map((c: Contact) => ({
      phone: c.number,
      name: c.name,
    }))

    // Add to history (this will also save to Supabase via useAppState)
    // Requirements: 1.1 - Save broadcast history to Supabase after completion
    const broadcastId = crypto.randomUUID()
    await appState.addBroadcastHistory({
      id: broadcastId,
      message: messageText.value,
      totalContacts: phones.length,
      successful: successCount,
      failed: failCount,
      status: 'completed',
      createdAt: new Date().toISOString(),
      hasMedia: !!mediaFile.value,
    }, recipients)

    // Reset form
    messageText.value = ''
    clearMedia()
    appState.clearContactSelection()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send broadcast'
    appState.setConnectionError(errorMessage)
  } finally {
    isSending.value = false
    appState.setBroadcastProgress(null)
  }
}

// Schedule broadcast for later
const handleScheduleBroadcast = () => {
  if (!canSend.value || !scheduledDateTime.value) return
  
  const selectedIds = Array.from(appState.selectedContacts.value)
  const contactsList = appState.contacts.value.filter((c: Contact) => selectedIds.includes(c.id))
  const phones = contactsList.map((c: Contact) => c.number)
  
  // Create scheduled broadcast entry
  const scheduledBroadcast = {
    id: `sched-bc-${Date.now()}`,
    type: 'broadcast',
    recipients: phones,
    recipientNames: contactsList.map((c: Contact) => c.name || c.number),
    message: messageText.value,
    scheduled_at: new Date(scheduledDateTime.value).toISOString(),
    status: 'pending',
    created_at: new Date().toISOString(),
    hasMedia: !!mediaFile.value,
    mediaBase64: mediaBase64.value,
    mediaType: mediaFile.value?.type,
    mediaName: mediaFile.value?.name,
  }
  
  // Save to localStorage
  const existing = JSON.parse(localStorage.getItem('scheduled_broadcasts') || '[]')
  existing.push(scheduledBroadcast)
  localStorage.setItem('scheduled_broadcasts', JSON.stringify(existing))
  
  // Add to broadcast history with pending status
  appState.addBroadcastHistory({
    id: scheduledBroadcast.id,
    message: messageText.value,
    totalContacts: phones.length,
    successful: 0,
    failed: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    hasMedia: !!mediaFile.value,
    scheduledAt: new Date(scheduledDateTime.value).toISOString(),
  })
  
  // Reset form
  showScheduleModal.value = false
  scheduledDateTime.value = ''
  messageText.value = ''
  clearMedia()
  
  // Force clear contact selection
  appState.clearContactSelection()
  
  alert(`Broadcast scheduled for ${new Date(scheduledBroadcast.scheduled_at).toLocaleString()}`)
}

const handleMediaSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  mediaFile.value = file

  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      mediaPreview.value = result
      mediaBase64.value = result // Store for scheduling
    }
    reader.readAsDataURL(file)
  } else {
    mediaPreview.value = null
    mediaBase64.value = null
  }
}

const clearMedia = () => {
  mediaFile.value = null
  mediaPreview.value = null
  mediaBase64.value = null
  includeMedia.value = false
}

const getContactName = (contactId: string): string => {
  const contact = appState.contacts.value.find((c: Contact) => c.id === contactId)
  return contact?.name || contact?.number || contactId
}

const getMinDateTime = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return now.toISOString().slice(0, 16)
}
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-lg flex items-center gap-2">
            <Send class="w-5 h-5 text-whatsapp" />
            Broadcast Message
          </CardTitle>
          <CardDescription>
            Send message to multiple contacts at once
          </CardDescription>
        </div>
        <div class="flex items-center gap-2">
          <!-- Sync Status Indicator - Requirements: 1.1 -->
          <Badge 
            v-if="supabase.isSyncing.value" 
            variant="secondary" 
            class="flex items-center gap-1"
          >
            <RefreshCw class="w-3 h-3 animate-spin" />
            Syncing
          </Badge>
          <Badge 
            v-else-if="supabase.isConnected.value" 
            variant="outline" 
            class="flex items-center gap-1 text-green-600 border-green-600"
          >
            <Cloud class="w-3 h-3" />
            Synced
          </Badge>
          <Badge 
            v-else 
            variant="outline" 
            class="flex items-center gap-1 text-yellow-600 border-yellow-600"
          >
            <CloudOff class="w-3 h-3" />
            Offline
          </Badge>
          
          <Badge variant="secondary" class="flex items-center gap-1">
            <Users class="w-3 h-3" />
            {{ appState.selectedContacts.value.size }} / {{ MAX_CONTACTS }}
          </Badge>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4 flex-1">
      <!-- Message Input -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">Message</label>
          <span 
            class="text-xs"
            :class="charCount > 4000 ? 'text-destructive' : 'text-muted-foreground'"
          >
            {{ charCount }} / 4096
          </span>
        </div>
        <Textarea
          v-model="messageText"
          placeholder="Type your broadcast message here..."
          class="min-h-[120px] resize-none"
          :maxlength="4096"
        />
      </div>

      <!-- Media Toggle -->
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            v-model="includeMedia"
            class="w-4 h-4 rounded border-input accent-whatsapp"
          />
          <Image class="w-4 h-4" />
          <span class="text-sm">Attach Media</span>
        </label>
      </div>

      <!-- Media Upload -->
      <Transition name="slide-fade">
        <div v-if="includeMedia" class="space-y-2">
          <div 
            v-if="!mediaFile"
            class="border-2 border-dashed border-muted rounded-lg p-6 text-center cursor-pointer hover:border-whatsapp transition-colors"
            @click="($refs.mediaInput as HTMLInputElement)?.click()"
          >
            <Image class="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p class="text-sm text-muted-foreground">Click to upload image or video</p>
          </div>
          
          <div v-else class="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div v-if="mediaPreview" class="w-16 h-16 rounded overflow-hidden">
              <img :src="mediaPreview" class="w-full h-full object-cover" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ mediaFile.name }}</p>
              <p class="text-xs text-muted-foreground">{{ (mediaFile.size / 1024).toFixed(1) }} KB</p>
            </div>
            <Button variant="ghost" size="sm" @click="clearMedia">
              <XCircle class="w-4 h-4" />
            </Button>
          </div>
          
          <input 
            ref="mediaInput"
            type="file" 
            accept="image/*,video/*" 
            class="hidden" 
            @change="handleMediaSelect"
          />
        </div>
      </Transition>

      <!-- Send Progress -->
      <Transition name="slide-fade">
        <div v-if="appState.broadcastProgress.value" class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-2">
              <Loader2 class="w-4 h-4 animate-spin text-whatsapp" />
              Sending broadcast...
            </span>
            <span>
              {{ appState.broadcastProgress.value.current }} / {{ appState.broadcastProgress.value.total }}
            </span>
          </div>
          <div class="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              class="h-full bg-gradient-whatsapp transition-all duration-300"
              :style="{ 
                width: `${(appState.broadcastProgress.value.current / appState.broadcastProgress.value.total) * 100}%` 
              }"
            />
          </div>
        </div>
      </Transition>

      <!-- Send Button -->
      <div class="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          class="gap-2"
          :disabled="!canSend"
          @click="showScheduleModal = true"
        >
          <Calendar class="w-4 h-4" />
          Schedule
        </Button>
        <Button 
          variant="whatsapp" 
          class="flex-1 gap-2"
          :disabled="!canSend"
          @click="handleSendBroadcast"
        >
          <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
          <Send v-else class="w-4 h-4" />
          {{ isSending ? 'Sending...' : 'Send Broadcast' }}
        </Button>
      </div>

      <!-- Selected Contacts Preview -->
      <div v-if="appState.selectedContacts.value.size > 0" class="pt-2">
        <p class="text-xs text-muted-foreground mb-2">Selected contacts:</p>
        <div class="flex flex-wrap gap-1">
          <Badge 
            v-for="contactId in Array.from(appState.selectedContacts.value).slice(0, 5)"
            :key="contactId"
            variant="outline"
            class="text-xs"
          >
            {{ getContactName(contactId) }}
          </Badge>
          <Badge 
            v-if="appState.selectedContacts.value.size > 5"
            variant="secondary"
            class="text-xs"
          >
            +{{ appState.selectedContacts.value.size - 5 }} more
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Schedule Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="showScheduleModal" 
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showScheduleModal = false"
      >
        <Card class="w-full max-w-md">
          <CardHeader>
            <div class="flex items-center justify-between">
              <CardTitle class="flex items-center gap-2">
                <Calendar class="w-5 h-5 text-whatsapp" />
                Schedule Broadcast
              </CardTitle>
              <Button variant="ghost" size="icon" @click="showScheduleModal = false">
                <X class="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              Schedule this broadcast to be sent later
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="p-3 bg-muted rounded-lg space-y-2">
              <p class="text-sm font-medium">Broadcast Summary</p>
              <p class="text-xs text-muted-foreground">
                <strong>Recipients:</strong> {{ appState.selectedContacts.value.size }} contacts
              </p>
              <p class="text-xs text-muted-foreground line-clamp-2">
                <strong>Message:</strong> {{ messageText || '(empty)' }}
              </p>
              <p v-if="mediaFile" class="text-xs text-muted-foreground">
                <strong>Media:</strong> {{ mediaFile.name }}
              </p>
            </div>
            
            <div class="space-y-2">
              <label class="text-sm font-medium">Schedule Date & Time</label>
              <Input 
                v-model="scheduledDateTime"
                type="datetime-local"
                :min="getMinDateTime()"
              />
              <p class="text-xs text-muted-foreground">Schedule at least 5 minutes from now</p>
            </div>

            <div class="flex gap-2 pt-2">
              <Button variant="outline" class="flex-1" @click="showScheduleModal = false">
                Cancel
              </Button>
              <Button 
                variant="whatsapp" 
                class="flex-1 gap-2"
                :disabled="!scheduledDateTime"
                @click="handleScheduleBroadcast"
              >
                <Calendar class="w-4 h-4" />
                Schedule Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
