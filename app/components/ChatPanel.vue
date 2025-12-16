<script setup lang="ts">
import { MessageCircle, Send, ArrowLeft, Phone, Loader2, RefreshCw, Search, Image, Paperclip, ChevronDown } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Skeleton } from '~/components/ui/skeleton'

interface ChatItem {
  jid: string
  name?: string
  last_message?: string
  last_message_time?: string
  unread_count?: number
  is_group?: boolean
}

interface MessageItem {
  id: string
  chat_jid: string
  sender_jid: string
  sender_name?: string
  content?: string  // API field
  message?: string  // Fallback field  
  timestamp: string
  is_from_me: boolean
  media_type?: string
  url?: string
  filename?: string
}

const api = useWhatsAppAPI()

const isLoadingChats = ref(false)
const isLoadingMessages = ref(false)
const isSending = ref(false)
const isLoadingMore = ref(false)
const chats = ref<ChatItem[]>([])
const selectedChat = ref<ChatItem | null>(null)
const messages = ref<MessageItem[]>([])
const newMessage = ref('')
const searchQuery = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const chatOffset = ref(0)
const messageOffset = ref(0)
const hasMoreChats = ref(true)
const hasMoreMessages = ref(true)
const totalChats = ref(0)

// Load chats on mount
onMounted(async () => {
  await loadChats()
})

// Load chat list
const loadChats = async (loadMore = false) => {
  if (loadMore) {
    isLoadingMore.value = true
  } else {
    isLoadingChats.value = true
    chatOffset.value = 0
    chats.value = []
  }
  
  try {
    const result = await api.getChats(50, chatOffset.value)
    const apiData = result.data as any
    
    if (apiData?.results?.data && Array.isArray(apiData.results.data)) {
      if (loadMore) {
        chats.value = [...chats.value, ...apiData.results.data]
      } else {
        chats.value = apiData.results.data
      }
      
      totalChats.value = apiData.results.pagination?.total || chats.value.length
      hasMoreChats.value = chats.value.length < totalChats.value
      chatOffset.value = chats.value.length
    }
  } catch (err) {
    console.error('Failed to load chats:', err)
  } finally {
    isLoadingChats.value = false
    isLoadingMore.value = false
  }
}

// Load messages for selected chat
const loadMessages = async (chat: ChatItem, loadMore = false) => {
  selectedChat.value = chat
  
  if (loadMore) {
    isLoadingMore.value = true
  } else {
    isLoadingMessages.value = true
    messageOffset.value = 0
    messages.value = []
  }
  
  try {
    const result = await api.getChatMessages(chat.jid, 50, messageOffset.value)
    const apiData = result.data as any
    
    // Debug logging
    console.log('Chat messages API response:', result)
    console.log('API Data:', apiData)
    console.log('Messages data:', apiData?.results?.data)
    
    if (apiData?.results?.data && Array.isArray(apiData.results.data)) {
      const newMsgs = apiData.results.data.reverse() // Oldest first
      
      if (loadMore) {
        messages.value = [...newMsgs, ...messages.value]
      } else {
        messages.value = newMsgs
      }
      
      hasMoreMessages.value = apiData.results.data.length === 50
      messageOffset.value += apiData.results.data.length
    }
    
    // Scroll to bottom on initial load
    if (!loadMore) {
      scrollToBottom()
    }
  } catch (err) {
    console.error('Failed to load messages:', err)
  } finally {
    isLoadingMessages.value = false
    isLoadingMore.value = false
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Send message
const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedChat.value) return
  
  isSending.value = true
  const messageText = newMessage.value
  newMessage.value = ''
  
  try {
    await api.sendMessage(selectedChat.value.jid, messageText)
    
    // Add message to local list
    messages.value.push({
      id: `local-${Date.now()}`,
      chat_jid: selectedChat.value.jid,
      sender_jid: 'me',
      content: messageText,
      timestamp: new Date().toISOString(),
      is_from_me: true,
    })
    
    scrollToBottom()
  } catch (err) {
    console.error('Failed to send message:', err)
    newMessage.value = messageText // Restore message on error
  } finally {
    isSending.value = false
  }
}

// Go back to chat list
const goBack = () => {
  selectedChat.value = null
  messages.value = []
  messageOffset.value = 0
}

// Format phone from JID
const formatPhone = (jid: string) => jid.replace(/@.*$/, '')

// Get display name
const getDisplayName = (chat: ChatItem) => {
  if (chat.name) return chat.name
  const phone = formatPhone(chat.jid)
  return phone.startsWith('62') ? `+${phone}` : phone
}

// Format time
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Format date for chat list
const formatChatDate = (timestamp: string) => {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return formatTime(timestamp)
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

// Format date separator for messages
const formatDateSeparator = (timestamp: string) => {
  const date = new Date(timestamp)
  const today = new Date()
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  }
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Check if new date separator needed
const needsDateSeparator = (index: number) => {
  if (index === 0) return true
  const currentDate = new Date(messages.value[index].timestamp).toDateString()
  const prevDate = new Date(messages.value[index - 1].timestamp).toDateString()
  return currentDate !== prevDate
}

// Filtered chats
const filteredChats = computed(() => {
  if (!searchQuery.value) return chats.value
  const query = searchQuery.value.toLowerCase()
  return chats.value.filter(c => 
    c.name?.toLowerCase().includes(query) || 
    formatPhone(c.jid).includes(query) ||
    c.last_message?.toLowerCase().includes(query)
  )
})
</script>

<template>
  <Card class="h-[calc(100vh-200px)] flex flex-col overflow-hidden">
    <!-- Chat List View -->
    <template v-if="!selectedChat">
      <CardHeader class="pb-3 shrink-0">
        <div class="flex items-center justify-between">
          <CardTitle class="text-lg flex items-center gap-2">
            <MessageCircle class="w-5 h-5 text-whatsapp" />
            Chats
            <Badge v-if="totalChats" variant="secondary" class="ml-1">{{ totalChats }}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" @click="loadChats()" :disabled="isLoadingChats">
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoadingChats }" />
          </Button>
        </div>
        
        <div class="relative mt-2">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            v-model="searchQuery"
            placeholder="Search chats..."
            class="pl-9"
          />
        </div>
      </CardHeader>
      
      <CardContent class="flex-1 overflow-y-auto space-y-1 pr-2">
        <!-- Loading -->
        <template v-if="isLoadingChats && chats.length === 0">
          <div v-for="i in 8" :key="i" class="flex items-center gap-3 p-3">
            <Skeleton class="w-12 h-12 rounded-full shrink-0" />
            <div class="flex-1 space-y-2">
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-3 w-1/2" />
            </div>
          </div>
        </template>
        
        <!-- Empty State -->
        <div v-else-if="filteredChats.length === 0" class="text-center py-12 text-muted-foreground">
          <MessageCircle class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No chats found</p>
          <Button variant="whatsapp" size="sm" class="mt-4" @click="loadChats()">
            <RefreshCw class="w-4 h-4 mr-2" />
            Sync Chats
          </Button>
        </div>
        
        <!-- Chat List -->
        <template v-else>
          <div
            v-for="chat in filteredChats"
            :key="chat.jid"
            class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-accent"
            @click="loadMessages(chat)"
          >
            <!-- Avatar -->
            <div 
              class="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              :class="chat.is_group ? 'bg-blue-500/20' : 'bg-muted'"
            >
              <span class="text-lg font-medium">
                {{ getDisplayName(chat).charAt(0).toUpperCase() }}
              </span>
            </div>
            
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <p class="font-medium truncate">
                  {{ getDisplayName(chat) }}
                </p>
                <span v-if="chat.last_message_time" class="text-xs text-muted-foreground shrink-0">
                  {{ formatChatDate(chat.last_message_time) }}
                </span>
              </div>
              <p v-if="chat.last_message" class="text-sm text-muted-foreground truncate mt-0.5">
                {{ chat.last_message }}
              </p>
            </div>
            
            <!-- Unread Badge -->
            <Badge v-if="chat.unread_count" variant="whatsapp" class="shrink-0">
              {{ chat.unread_count > 99 ? '99+' : chat.unread_count }}
            </Badge>
          </div>
          
          <!-- Load More -->
          <Button 
            v-if="hasMoreChats && !searchQuery"
            variant="ghost" 
            class="w-full mt-2"
            @click="loadChats(true)"
            :disabled="isLoadingMore"
          >
            <Loader2 v-if="isLoadingMore" class="w-4 h-4 mr-2 animate-spin" />
            <ChevronDown v-else class="w-4 h-4 mr-2" />
            Load more chats
          </Button>
        </template>
      </CardContent>
    </template>
    
    <!-- Chat Messages View -->
    <template v-else>
      <!-- Header -->
      <CardHeader class="pb-3 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Button variant="ghost" size="icon" @click="goBack" class="shrink-0">
            <ArrowLeft class="w-5 h-5" />
          </Button>
          
          <div 
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="selectedChat.is_group ? 'bg-blue-500/20' : 'bg-muted'"
          >
            <span class="font-medium">
              {{ getDisplayName(selectedChat).charAt(0).toUpperCase() }}
            </span>
          </div>
          
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">
              {{ getDisplayName(selectedChat) }}
            </p>
            <p class="text-xs text-muted-foreground flex items-center gap-1">
              <Phone class="w-3 h-3" />
              {{ formatPhone(selectedChat.jid) }}
            </p>
          </div>
          
          <Button variant="ghost" size="icon" @click="loadMessages(selectedChat)" :disabled="isLoadingMessages">
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoadingMessages }" />
          </Button>
        </div>
      </CardHeader>
      
      <!-- Messages -->
      <CardContent 
        ref="messagesContainer"
        class="flex-1 overflow-y-auto p-4 space-y-2"
      >
        <!-- Loading -->
        <div v-if="isLoadingMessages && messages.length === 0" class="flex justify-center py-8">
          <Loader2 class="w-8 h-8 animate-spin text-whatsapp" />
        </div>
        
        <!-- Load More Messages -->
        <Button 
          v-if="hasMoreMessages && messages.length > 0"
          variant="ghost" 
          size="sm"
          class="w-full mb-4"
          @click="loadMessages(selectedChat!, true)"
          :disabled="isLoadingMore"
        >
          <Loader2 v-if="isLoadingMore" class="w-4 h-4 mr-2 animate-spin" />
          Load earlier messages
        </Button>
        
        <!-- Messages List -->
        <template v-for="(msg, index) in messages" :key="msg.id">
          <!-- Date Separator -->
          <div 
            v-if="needsDateSeparator(index)"
            class="flex justify-center my-4"
          >
            <Badge variant="secondary" class="text-xs font-normal">
              {{ formatDateSeparator(msg.timestamp) }}
            </Badge>
          </div>
          
          <!-- Message Bubble -->
          <div
            class="flex"
            :class="msg.is_from_me ? 'justify-end' : 'justify-start'"
          >
            <div 
              class="max-w-[75%] rounded-xl px-4 py-2 shadow-sm"
              :class="msg.is_from_me 
                ? 'bg-gradient-whatsapp text-white rounded-br-sm' 
                : 'bg-muted rounded-bl-sm'"
            >
              <!-- Sender name for group -->
              <p v-if="!msg.is_from_me && msg.sender_name" class="text-xs font-medium mb-1 text-whatsapp">
                {{ msg.sender_name }}
              </p>
              
              <!-- Media indicator -->
              <div v-if="msg.media_type" class="flex items-center gap-1 text-xs opacity-70 mb-1">
                <Image v-if="msg.media_type === 'image'" class="w-3 h-3" />
                <Paperclip v-else class="w-3 h-3" />
                {{ msg.media_type }}
              </div>
              
              <p class="break-words whitespace-pre-wrap">{{ msg.content || msg.message || '[Media]' }}</p>
              <p class="text-xs mt-1 opacity-70 text-right">
                {{ formatTime(msg.timestamp) }}
              </p>
            </div>
          </div>
        </template>
        
        <!-- Empty messages -->
        <div v-if="!isLoadingMessages && messages.length === 0" class="text-center py-8 text-muted-foreground">
          <MessageCircle class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No messages yet</p>
          <p class="text-sm">Send a message to start the conversation</p>
        </div>
      </CardContent>
      
      <!-- Input -->
      <div class="p-4 border-t shrink-0">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <Input 
            v-model="newMessage"
            placeholder="Type a message..."
            class="flex-1"
            :disabled="isSending"
          />
          <Button 
            type="submit" 
            variant="whatsapp"
            :disabled="!newMessage.trim() || isSending"
          >
            <Loader2 v-if="isSending" class="w-4 h-4 animate-spin" />
            <Send v-else class="w-4 h-4" />
          </Button>
        </form>
      </div>
    </template>
  </Card>
</template>
