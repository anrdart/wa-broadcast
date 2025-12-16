<script setup lang="ts">
import { Search, Upload, CheckSquare, Square, User, Phone, RefreshCw } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'

interface WhatsAppContact {
  id: string
  name: string
  number: string
  isMyContact: boolean
  isFromCSV: boolean
}

const appState = useAppState()
const api = useWhatsAppAPI()
const fileInput = ref<HTMLInputElement | null>(null)
const isLoading = ref(false)
const isSyncing = ref(false)
const localContacts = ref<WhatsAppContact[]>([])
const searchQuery = ref('')

// Auto-sync contacts on mount (client-side only)
onMounted(async () => {
  if (import.meta.client && localContacts.value.length === 0) {
    await syncWhatsAppContacts()
  }
})

// Sync contacts from WhatsApp
const syncWhatsAppContacts = async () => {
  isSyncing.value = true
  try {
    const result = await api.getMyContacts()
    console.log('Full API Result:', result)
    
    // Direct access with any cast
    const apiData = result.data as any
    
    // Contacts are in apiData.results.data (nested structure)
    let rawContacts: Array<{ jid: string; name: string }> = []
    
    if (apiData?.results?.data && Array.isArray(apiData.results.data)) {
      rawContacts = apiData.results.data
    } else if (apiData?.results && Array.isArray(apiData.results)) {
      rawContacts = apiData.results
    }
    
    console.log('Raw contacts count:', rawContacts.length)
    
    if (rawContacts.length > 0) {
      const contacts: WhatsAppContact[] = rawContacts.map((item) => ({
        id: item.jid,
        name: item.name || extractPhoneFromJid(item.jid),
        number: extractPhoneFromJid(item.jid),
        isMyContact: true,
        isFromCSV: false,
      }))
      
      console.log('Mapped contacts count:', contacts.length)
      localContacts.value = contacts
      appState.setContacts(contacts as any)
    } else {
      console.error('No contacts found in response')
    }
  } catch (err) {
    console.error('Failed to sync contacts:', err)
  } finally {
    isSyncing.value = false
  }
}

// Extract phone number from JID
const extractPhoneFromJid = (jid: string): string => {
  return jid.replace(/@.*$/, '')
}

// Filtered contacts
const filteredContacts = computed(() => {
  if (!searchQuery.value) return localContacts.value
  const query = searchQuery.value.toLowerCase()
  return localContacts.value.filter(
    (c) => c.name.toLowerCase().includes(query) || c.number.includes(query)
  )
})

// Selected contacts
const selectedContacts = ref<Set<string>>(new Set())

const toggleContactSelection = (contactId: string) => {
  const newSet = new Set(selectedContacts.value)
  if (newSet.has(contactId)) {
    newSet.delete(contactId)
  } else {
    newSet.add(contactId)
  }
  selectedContacts.value = newSet
  // Also update global state
  appState.toggleContactSelection(contactId)
}

const handleSelectAll = () => {
  if (selectedContacts.value.size === localContacts.value.length) {
    selectedContacts.value = new Set()
    appState.clearContactSelection()
  } else {
    selectedContacts.value = new Set(localContacts.value.map((c) => c.id))
    appState.selectAllContacts()
  }
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isLoading.value = true
  const reader = new FileReader()
  
  reader.onload = (e) => {
    const text = e.target?.result as string
    const lines = text.split('\n').filter(line => line.trim())
    
    // Skip header if exists
    const startIndex = lines[0]?.toLowerCase().includes('name') ? 1 : 0
    
    const contacts = lines.slice(startIndex).map((line, index) => {
      const parts = line.split(',').map(p => p.trim().replace(/"/g, ''))
      return {
        id: `csv-${Date.now()}-${index}`,
        name: parts[0] || parts[1] || '',
        number: parts[1] || parts[0],
        isFromCSV: true,
        isMyContact: false,
      }
    }).filter(c => c.number && c.number.match(/^\d+$/))

    localContacts.value = [...localContacts.value, ...contacts]
    isLoading.value = false
  }

  reader.onerror = () => {
    isLoading.value = false
  }

  reader.readAsText(file)
  target.value = ''
}
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <CardTitle class="text-lg flex items-center gap-2">
          <User class="w-5 h-5 text-whatsapp" />
          Contacts
        </CardTitle>
        <Badge variant="secondary">
          {{ selectedContacts.size }} / {{ localContacts.length }}
        </Badge>
      </div>
      
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          v-model="searchQuery"
          placeholder="Search contacts..."
          class="pl-9"
        />
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <Button variant="outline" size="sm" class="flex-1" @click="handleSelectAll">
          <CheckSquare v-if="selectedContacts.size === localContacts.length && localContacts.length > 0" class="w-4 h-4 mr-2" />
          <Square v-else class="w-4 h-4 mr-2" />
          {{ selectedContacts.size === localContacts.length && localContacts.length > 0 ? 'Deselect All' : 'Select All' }}
        </Button>
        <Button variant="outline" size="sm" @click="syncWhatsAppContacts" :disabled="isSyncing">
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isSyncing }" />
        </Button>
        <Button variant="outline" size="sm" @click="fileInput?.click()">
          <Upload class="w-4 h-4" />
        </Button>
        <input 
          ref="fileInput"
          type="file" 
          accept=".csv" 
          class="hidden" 
          @change="handleFileUpload"
        />
      </div>
    </CardHeader>

    <CardContent class="flex-1 overflow-y-auto space-y-2 pr-2">
      <!-- Loading Skeletons -->
      <template v-if="isLoading || isSyncing">
        <div v-for="i in 5" :key="i" class="flex items-center gap-3 p-3">
          <Skeleton class="w-10 h-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-3 w-1/2" />
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div 
        v-else-if="filteredContacts.length === 0" 
        class="text-center py-8 text-muted-foreground"
      >
        <User class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No contacts found</p>
        <p class="text-sm mb-4">Click sync button to load WhatsApp contacts</p>
        <Button variant="whatsapp" size="sm" @click="syncWhatsAppContacts" :disabled="isSyncing">
          <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': isSyncing }" />
          Sync from WhatsApp
        </Button>
      </div>

      <!-- Contact List -->
      <template v-else>
        <div
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent"
          :class="{ 'bg-accent': selectedContacts.has(contact.id) }"
          @click="toggleContactSelection(contact.id)"
        >
          <!-- Checkbox -->
          <div 
            class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
            :class="selectedContacts.has(contact.id) 
              ? 'bg-whatsapp border-whatsapp' 
              : 'border-muted-foreground'"
          >
            <svg 
              v-if="selectedContacts.has(contact.id)"
              class="w-3 h-3 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <!-- Avatar -->
          <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span class="text-sm font-medium">
              {{ (contact.name || contact.number).charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ contact.name || contact.number }}
            </p>
            <p class="text-sm text-muted-foreground flex items-center gap-1">
              <Phone class="w-3 h-3" />
              {{ contact.number }}
            </p>
          </div>

          <!-- Tags -->
          <div class="flex gap-1">
            <Badge v-if="contact.isFromCSV" variant="outline" class="text-xs">CSV</Badge>
            <Badge v-if="contact.isMyContact" variant="whatsapp" class="text-xs">WA</Badge>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
