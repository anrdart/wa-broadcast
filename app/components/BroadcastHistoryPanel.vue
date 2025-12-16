<script setup lang="ts">
import { History, CheckCircle, XCircle, Clock, Image, Trash2, RefreshCw, Cloud, CloudOff, Loader2 } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { fromBroadcastHistoryRecord } from '~/types/supabase'

const appState = useAppState()
const supabase = useSupabase()

// Loading state for initial fetch
const isLoading = ref(false)

/**
 * Load broadcast history from Supabase on mount
 * Requirements: 1.2
 */
onMounted(async () => {
  if (!appState.broadcastHistoryInitialized.value) {
    isLoading.value = true
    try {
      await appState.initBroadcastHistoryFromSupabase()
    } finally {
      isLoading.value = false
    }
  }
  
  // Subscribe to realtime updates
  // Requirements: 1.3
  supabase.subscribeWithAppState({
    broadcastHistory: appState.broadcastHistory,
    scheduledMessages: appState.scheduledMessages,
    setBroadcastHistory: appState.setBroadcastHistory,
    setScheduledMessages: appState.setScheduledMessages,
  })
})

// Cleanup subscription on unmount
onUnmounted(() => {
  supabase.unsubscribeFromChanges()
})

/**
 * Refresh history from Supabase
 */
const refreshHistory = async () => {
  isLoading.value = true
  try {
    const records = await supabase.fetchBroadcastHistory()
    const localHistory = records.map(fromBroadcastHistoryRecord)
    appState.setBroadcastHistory(localHistory)
  } finally {
    isLoading.value = false
  }
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'completed': return 'success' as const
    case 'pending': return 'warning' as const
    case 'in_progress': return 'secondary' as const
    case 'failed': return 'destructive' as const
    default: return 'secondary' as const
  }
}

const getSuccessRate = (successful: number, total: number) => {
  return total > 0 ? Math.round((successful / total) * 100) : 0
}

const clearHistory = () => {
  if (!confirm('Clear all broadcast history?')) return
  appState.clearBroadcastHistory()
}

// Sort by date descending
const sortedHistory = computed(() => {
  return [...appState.broadcastHistory.value].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <div>
          <CardTitle class="text-lg flex items-center gap-2">
            <History class="w-5 h-5 text-whatsapp" />
            Broadcast History
            <!-- Sync Status Indicator - Requirements: 1.2, 1.3 -->
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
            {{ appState.broadcastHistory.value.length }} broadcasts sent
          </CardDescription>
        </div>
        <div class="flex gap-2">
          <!-- Refresh Button -->
          <Button 
            variant="outline" 
            size="sm" 
            @click="refreshHistory"
            :disabled="isLoading"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          </Button>
          <Button 
            v-if="appState.broadcastHistory.value.length > 0"
            variant="outline" 
            size="sm" 
            @click="clearHistory"
          >
            <Trash2 class="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="flex-1 overflow-y-auto space-y-3">
      <!-- Loading State -->
      <div 
        v-if="isLoading && sortedHistory.length === 0"
        class="text-center py-12 text-muted-foreground"
      >
        <Loader2 class="w-12 h-12 mx-auto mb-2 animate-spin opacity-50" />
        <p>Loading broadcast history...</p>
      </div>
      
      <!-- Empty State -->
      <div 
        v-else-if="sortedHistory.length === 0"
        class="text-center py-12 text-muted-foreground"
      >
        <History class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No broadcast history yet</p>
        <p class="text-sm">Send your first broadcast to see it here</p>
      </div>

      <!-- History List -->
      <template v-else>
        <div
          v-for="broadcast in sortedHistory"
          :key="broadcast.id"
          class="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <!-- Message Preview -->
              <p class="text-sm font-medium line-clamp-2">
                {{ broadcast.message || '[No message]' }}
              </p>
              
              <!-- Stats -->
              <div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  {{ formatDate(broadcast.createdAt) }}
                </span>
                <span v-if="broadcast.scheduledAt && broadcast.status === 'pending'" class="flex items-center gap-1 text-yellow-500">
                  📅 Scheduled: {{ formatDate(broadcast.scheduledAt) }}
                </span>
                <span v-if="broadcast.hasMedia" class="flex items-center gap-1 text-blue-500">
                  <Image class="w-3 h-3" />
                  Media
                </span>
              </div>
              
              <!-- Success/Fail counts -->
              <div class="flex items-center gap-3 mt-2">
                <span class="flex items-center gap-1 text-xs">
                  <CheckCircle class="w-3 h-3 text-green-500" />
                  <span class="text-green-500 font-medium">{{ broadcast.successful }}</span>
                </span>
                <span v-if="broadcast.failed > 0" class="flex items-center gap-1 text-xs">
                  <XCircle class="w-3 h-3 text-red-500" />
                  <span class="text-red-500 font-medium">{{ broadcast.failed }}</span>
                </span>
                <span class="text-xs text-muted-foreground">
                  of {{ broadcast.totalContacts }} contacts
                </span>
              </div>
            </div>
            
            <!-- Status & Rate -->
            <div class="flex flex-col items-end gap-2">
              <Badge :variant="getStatusVariant(broadcast.status)">
                {{ broadcast.status }}
              </Badge>
              <div 
                class="text-lg font-bold"
                :class="getSuccessRate(broadcast.successful, broadcast.totalContacts) >= 90 ? 'text-green-500' : 'text-yellow-500'"
              >
                {{ getSuccessRate(broadcast.successful, broadcast.totalContacts) }}%
              </div>
            </div>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
