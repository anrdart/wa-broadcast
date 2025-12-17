<script setup lang="ts">
/**
 * SessionStatusIndicator Component
 * Displays WhatsApp session connection status with color coding
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-vue-next'
import { Badge } from '~/components/ui/badge'
import { getStatusConfig, formatPhoneNumber, formatDuration } from '~/utils/sessionStatus'

const sessionManager = useSessionManager()

// Icon mapping based on status
const iconMap = {
  connected: Wifi,
  disconnected: WifiOff,
  pending: RefreshCw,
  dormant: Clock,
} as const

// Compute display properties based on session status
const statusConfig = computed(() => {
  const session = sessionManager.currentSession.value
  const status = session?.status || 'disconnected'
  
  return getStatusConfig(status)
})

// Get the appropriate icon for current status
const statusIcon = computed(() => {
  const session = sessionManager.currentSession.value
  const status = (session?.status || 'disconnected') as keyof typeof iconMap
  return iconMap[status] || WifiOff
})

// Compute phone number display
const phoneNumber = computed(() => {
  const session = sessionManager.currentSession.value
  if (session?.whatsapp_number) {
    return formatPhoneNumber(session.whatsapp_number)
  }
  return null
})

// Compute connection duration for tooltip
const connectionDuration = computed(() => {
  const session = sessionManager.currentSession.value
  if (!session?.created_at || session.status !== 'connected') {
    return null
  }
  
  const createdAt = new Date(session.created_at)
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  
  return formatDuration(diffMs)
})

// Tooltip content
// Requirements: 5.4
const tooltipContent = computed(() => {
  const session = sessionManager.currentSession.value
  if (!session) {
    return 'No active session'
  }
  
  const lines = [
    `Status: ${statusConfig.value.text}`,
  ]
  
  if (phoneNumber.value) {
    lines.push(`Phone: ${phoneNumber.value}`)
  }
  
  if (connectionDuration.value) {
    lines.push(`Connected for: ${connectionDuration.value}`)
  }
  
  if (session.api_instance_port) {
    lines.push(`Instance: Port ${session.api_instance_port}`)
  }
  
  return lines.join('\n')
})
</script>

<template>
  <div 
    class="relative inline-flex items-center gap-2 cursor-default group"
    :title="tooltipContent"
  >
    <!-- Status Badge -->
    <Badge 
      :variant="statusConfig.badgeVariant"
      class="flex items-center gap-1.5 px-2.5 py-1"
    >
      <component 
        :is="statusIcon" 
        class="w-3.5 h-3.5"
        :class="{
          'animate-spin': statusConfig.text === 'Connecting...',
        }"
      />
      <span class="text-xs font-medium">{{ statusConfig.text }}</span>
    </Badge>
    
    <!-- Phone Number (when connected) -->
    <span 
      v-if="phoneNumber && statusConfig.color === 'green'"
      class="text-xs text-muted-foreground hidden sm:inline"
    >
      {{ phoneNumber }}
    </span>
    
    <!-- Tooltip on hover -->
    <!-- Requirements: 5.4 -->
    <div 
      class="absolute top-full left-0 mt-2 p-3 bg-popover border rounded-lg shadow-lg 
             opacity-0 invisible group-hover:opacity-100 group-hover:visible 
             transition-all duration-200 z-50 min-w-[200px] whitespace-pre-line text-sm"
    >
      {{ tooltipContent }}
    </div>
  </div>
</template>
