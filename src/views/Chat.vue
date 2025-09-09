<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Page Header -->
    <div class="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="py-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white">Chat</h1>
              <p class="mt-1 text-sm text-gray-300">
                Kelola percakapan WhatsApp dan kirim pesan
              </p>
            </div>
            
            <!-- Action Buttons -->
            <div class="mt-4 sm:mt-0 flex space-x-3">
              <!-- WebSocket Status -->
              <div class="flex items-center">
                <div :class="[
                  'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg',
                  socketConnected 
                    ? 'border border-green-600 text-green-300 bg-green-600/10' 
                    : 'border border-red-600 text-red-300 bg-red-600/10'
                ]">
                  <div :class="[
                    'w-2 h-2 rounded-full mr-2',
                    socketConnected ? 'bg-green-400' : 'bg-red-400'
                  ]"></div>
                  {{ socketConnected ? 'Realtime Aktif' : 'Realtime Terputus' }}
                </div>
              </div>
              
              <!-- Notification Status -->
              <div v-if="!isNotificationEnabled" class="flex items-center">
                <button
                  @click="requestNotificationPermission"
                  class="inline-flex items-center px-3 py-2 border border-yellow-600 text-sm font-medium rounded-lg text-yellow-300 bg-yellow-600/10 hover:bg-yellow-600/20 transition-colors"
                >
                  <ExclamationIcon class="w-4 h-4 mr-2" />
                  Aktifkan Notifikasi
                </button>
              </div>
              
              <button
                @click="refreshChats"
                :disabled="isRefreshing"
                class="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-lg text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowPathIcon class="w-4 h-4 mr-2" :class="{ 'animate-spin': isRefreshing }" />
                {{ isRefreshing ? 'Memuat...' : 'Refresh Chat' }}
              </button>
              
              <!-- Unduh Chat Button -->
              <button
                @click="downloadAllChats"
                :disabled="isDownloading"
                class="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-lg text-blue-300 bg-blue-600/10 hover:bg-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                :title="isDownloading ? `Mengunduh ${downloadProgress}%` : 'Unduh semua chat (prefetch pesan)'"
              >
                <ArrowDownTrayIcon class="w-4 h-4 mr-2" />
                <span v-if="isDownloading">Mengunduh {{ downloadProgress }}%</span>
                <span v-else>Unduh Chat</span>
              </button>
              
              <button
                @click="toggleAudio"
                :class="[
                  'inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg transition-colors',
                  isAudioEnabled 
                    ? 'border-green-600 text-green-300 bg-green-600/10 hover:bg-green-600/20' 
                    : 'border-gray-600 text-gray-300 bg-gray-700/50 hover:bg-gray-600/50'
                ]"
                :title="isAudioEnabled ? 'Matikan Suara Notifikasi' : 'Aktifkan Suara Notifikasi'"
              >
                <svg v-if="isAudioEnabled" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-5a3 3 0 00-6 0v5z" />
                </svg>
                <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
                {{ isAudioEnabled ? 'Suara Aktif' : 'Suara Nonaktif' }}
              </button>
              
              <button
                @click="showNewChatModal = true"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon class="w-4 h-4 mr-2" />
                Chat Baru
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- WhatsApp Connection Status -->
      <div v-if="!whatsappStore.isReady" class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0">
            <ExclamationTriangleIcon class="w-6 h-6 text-yellow-400" />
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-medium text-yellow-300">WhatsApp Belum Terhubung</h3>
            <p class="mt-1 text-sm text-yellow-200">
              Untuk menggunakan fitur chat, silakan hubungkan WhatsApp terlebih dahulu.
              Status saat ini: <span class="font-medium">{{ whatsappStore.statusText }}</span>
            </p>
            <div class="mt-4 flex space-x-3">
              <button
                @click="whatsappStore.connectToServer()"
                :disabled="whatsappStore.connectionStatus === 'connecting'"
                class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span v-if="whatsappStore.connectionStatus === 'connecting'">Menyambung...</span>
                <span v-else>Hubungkan WhatsApp</span>
              </button>
              <button
                v-if="whatsappStore.qrCode"
                @click="showQRModal = true"
                class="inline-flex items-center px-4 py-2 border border-blue-500 text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-500/10 transition-colors"
              >
                Lihat QR Code
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Interface -->
      <div v-if="whatsappStore.isReady" class="bg-gray-800/50 border border-gray-700/30 rounded-xl overflow-hidden">
        <div class="flex h-[600px]">
          <!-- Chat List Sidebar -->
          <div class="w-1/3 border-r border-gray-700/30 flex flex-col">
            <!-- Search Bar -->
            <div class="p-4 border-b border-gray-700/30">
              <div class="relative">
                <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari chat..."
                  class="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <!-- Chat List -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="filteredChats.length === 0" class="p-4 text-center text-gray-400">
                <ChatBubbleLeftRightIcon class="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada percakapan</p>
                <p class="text-sm mt-1">Mulai chat baru untuk melihat percakapan</p>
              </div>
              
              <div v-else>
                <div
                  v-for="chat in filteredChats"
                  :key="chat.id"
                  @click="selectChat(chat)"
                  class="p-4 border-b border-gray-700/30 cursor-pointer hover:bg-gray-700/30 transition-colors"
                  :class="{ 'bg-gray-700/50': selectedChat?.id === chat.id }"
                >
                  <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                      <img 
                        :src="getAvatarUrl(chat)" 
                        :alt="chat.name"
                        class="w-10 h-10 rounded-full object-cover"
                        @error="$event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=3b82f6&color=fff`"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-medium text-white truncate">{{ chat.name }}</p>
                        <p class="text-xs text-gray-400">{{ formatTime(chat.last_message_at) }}</p>
                      </div>
                      <p class="text-sm text-gray-400 truncate mt-1">{{ chat.last_message || 'No messages yet' }}</p>
                    </div>
                    <div v-if="chat.unread_count > 0" class="flex-shrink-0">
                      <span class="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {{ chat.unread_count }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Chat Messages Area -->
          <div class="flex-1 flex flex-col">
            <!-- Chat Header -->
            <div v-if="selectedChat" class="p-4 border-b border-gray-700/30 bg-gray-800/30">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <UserIcon class="w-5 h-5 text-gray-300" />
                </div>
                <div class="flex-1">
                  <h3 class="text-lg font-medium text-white">{{ selectedChat.name }}</h3>
                  <p class="text-sm text-gray-400">{{ selectedChat.phone }}</p>
                </div>
                <div class="flex space-x-2">
                  <button
                    @click="callContact"
                    class="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <PhoneIcon class="w-5 h-5" />
                  </button>
                  <button
                    @click="showChatInfo = true"
                    class="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <InformationCircleIcon class="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Messages Area -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
              <div v-if="!selectedChat" class="flex items-center justify-center h-full text-gray-400">
                <div class="text-center">
                  <ChatBubbleLeftRightIcon class="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p class="text-lg">Pilih chat untuk memulai percakapan</p>
                  <p class="text-sm mt-1">Pilih chat dari daftar di sebelah kiri</p>
                </div>
              </div>
              
              <div v-else-if="selectedChatMessages.length === 0" class="flex items-center justify-center h-full text-gray-400">
                <div class="text-center">
                  <ChatBubbleLeftRightIcon class="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p class="text-lg">Belum ada pesan</p>
                  <p class="text-sm mt-1">Mulai percakapan dengan mengirim pesan</p>
                </div>
              </div>
              
              <div v-else>
                <div
                v-for="message in selectedChatMessages"
                :key="message.id"
                class="flex"
                :class="message.is_from_me ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg"
                  :class="message.is_from_me 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-100'"
                >
                  <p class="text-sm">{{ message.content }}</p>
                  <div class="flex items-center justify-between mt-1">
                    <p class="text-xs opacity-70">{{ formatTime(message.timestamp) }}</p>
                    <!-- Message Status Icons -->
                    <div v-if="message.is_from_me" class="flex items-center">
                      <ClockIcon v-if="message.status === 'pending'" class="w-3 h-3 text-gray-400" />
                      <CheckIcon v-else-if="message.status === 'sent'" class="w-3 h-3 text-gray-400" />
                      <div v-else-if="message.status === 'delivered' || message.status === 'read'" class="relative">
                        <CheckIcon class="w-3 h-3" :class="message.status === 'read' ? 'text-blue-500' : 'text-blue-400'" />
                        <CheckIcon class="w-3 h-3 absolute -right-1 top-0" :class="message.status === 'read' ? 'text-blue-500' : 'text-blue-400'" />
                      </div>
                      <ExclamationIcon v-else-if="message.status === 'failed'" class="w-3 h-3 text-red-400" />
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            <!-- Message Input -->
            <div v-if="selectedChat" class="p-4 border-t border-gray-700/30 bg-gray-800/30">
              <div class="flex items-end space-x-3">
                <button
                  @click="showEmojiPicker = !showEmojiPicker"
                  class="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <FaceSmileIcon class="w-5 h-5" />
                </button>
                
                <div class="flex-1">
                  <textarea
                    v-model="newMessage"
                    @keydown.enter.prevent="sendMessage"
                    placeholder="Ketik pesan..."
                    rows="1"
                    class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  ></textarea>
                </div>
                
                <button
                  @click="sendMessage"
                  :disabled="!newMessage.trim()"
                  class="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon class="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- QR Code Modal -->
    <div v-if="showQRModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Scan QR Code</h3>
          <button @click="showQRModal = false" class="text-gray-400 hover:text-white">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>
        <div class="text-center">
          <div v-if="whatsappStore.qrCode" class="mb-4">
            <img :src="whatsappStore.qrCode" alt="QR Code" class="mx-auto max-w-full" />
          </div>
          <p class="text-sm text-gray-300">
            Scan QR code ini dengan WhatsApp di ponsel Anda
          </p>
        </div>
      </div>
    </div>
    
    <!-- New Chat Modal -->
    <div v-if="showNewChatModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Chat Baru</h3>
          <button @click="showNewChatModal = false" class="text-gray-400 hover:text-white">
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Nomor WhatsApp</label>
            <input
              v-model="newChatPhone"
              type="tel"
              placeholder="628123456789"
              class="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="flex space-x-3">
            <button
              @click="showNewChatModal = false"
              class="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              Batal
            </button>
            <button
              @click="startNewChat"
              :disabled="!newChatPhone.trim()"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Mulai Chat
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Toast Notifications removed -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useWhatsAppStore } from '@/stores/whatsapp'
import apiService from '@/services/apiService'
import {
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  PhoneIcon,
  InformationCircleIcon,
  CheckIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ClockIcon,
  ExclamationTriangleIcon as ExclamationIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
// Supabase imports removed - using WebSocket instead
import { useNotifications } from '@/composables/useNotifications'
import { useMessageStatus } from '@/composables/useMessageStatus'
import { useAudio } from '@/composables/useAudio'
import socketService from '@/services/socketService'

// Stores
const whatsappStore = useWhatsAppStore()

// Composables
const {
  isNotificationEnabled,
  requestNotificationPermission,
  showMessageNotification,
  showStatusNotification
} = useNotifications()

const {
  MESSAGE_STATUS,
  getStatusConfig,
  getStatusIconName,
  isDoubleCheck,
  simulateMessageStatusProgression
} = useMessageStatus()

// Toast functions removed

const {
  isAudioEnabled,
  playMessageSound,
  playSentSound,
  playDeliveredSound,
  playErrorSound,
  toggleAudio
} = useAudio()

// Reactive data
const isRefreshing = ref(false)
const showQRModal = ref(false)
const showNewChatModal = ref(false)
const showChatInfo = ref(false)
const showEmojiPicker = ref(false)
const searchQuery = ref('')
const selectedChat = ref(null)
const newMessage = ref('')
const newChatPhone = ref('')
const messagesContainer = ref(null)
const loading = ref(false)
const error = ref('')

// Download progress
const isDownloading = ref(false)
const downloadProgress = ref(0)

// Supabase data
const chats = ref([])
const messages = ref({})
const subscriptionChannels = ref([])

// WebSocket connection status
const socketConnected = ref(false)

// Computed properties
const filteredChats = computed(() => {
  if (!searchQuery.value) return chats.value
  
  return chats.value.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    chat.phone.includes(searchQuery.value) ||
    (chat.last_message && chat.last_message.toLowerCase().includes(searchQuery.value.toLowerCase()))
  )
})

const selectedChatMessages = computed(() => {
  if (!selectedChat.value) return []
  return messages.value[selectedChat.value.id] || []
})

const getMessageStatus = (message) => {
  if (!message.is_from_me) return null
  
  switch (message.status) {
    case 'sent':
      return 'text-gray-400'
    case 'delivered':
      return 'text-blue-400'
    case 'read':
      return 'text-blue-500'
    default:
      return 'text-gray-300'
  }
}

const getAvatarUrl = (chat) => {
  if (chat.avatar_url) return chat.avatar_url
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=3b82f6&color=fff`
}

// Methods
const loadChats = async () => {
  if (!whatsappStore.isReady) {
    console.warn('WhatsApp not connected, cannot load chats')
    return
  }
  

  
  try {
    loading.value = true
    
    // Load chats from WhatsApp backend
    const result = await apiService.getChats()
    
    if (result.success) {
      chats.value = result.data.map(chat => ({
        id: chat.id,
        name: chat.name || 'Unknown',
        phone: chat.id.replace('@s.whatsapp.net', '').replace('@c.us', ''),
        isGroup: chat.isGroup,
        unread_count: chat.unreadCount || 0,
        last_message_at: chat.lastMessageTime ? new Date(chat.lastMessageTime * 1000) : null,
        last_message: '',
        archived: chat.archived,
        pinned: chat.pinned
      }))
    } else {
      throw new Error(result.error || 'Failed to load chats')
    }
  } catch (err) {
    console.error('Error loading chats:', err)
    error.value = 'Failed to load chats'
    console.error('Failed to load chats')
  } finally {
    loading.value = false
  }
}

const loadMessages = async (chatId) => {
  if (!whatsappStore.isReady) return
  

  
  try {
    // Load messages from WhatsApp backend
    const result = await apiService.getMessages(chatId, 50)
    
    if (result.success) {
      messages.value[chatId] = result.data.map(msg => ({
        id: msg.id,
        chat_id: chatId,
        content: msg.message,
        is_from_me: msg.fromMe,
        timestamp: msg.timestamp ? new Date(msg.timestamp * 1000) : new Date(),
        status: msg.fromMe ? 'sent' : null,
        message_type: msg.messageType || 'text',
        sender_name: msg.fromMe ? 'You' : 'Contact'
      }))
    } else {
      console.warn('No messages found for chat:', chatId)
      messages.value[chatId] = []
    }
  } catch (err) {
    console.error('Error loading messages:', err)
    error.value = 'Failed to load messages'
    console.error('Failed to load messages')
  }
}

const refreshChats = async () => {
  isRefreshing.value = true
  try {
    await loadChats()
    console.log('Chat refreshed successfully')
    } catch (error) {
      console.error('Error refreshing chats:', error)
  } finally {
    isRefreshing.value = false
  }
}

const selectChat = async (chat) => {
  selectedChat.value = chat
  
  // Load messages for this chat
  if (!messages.value[chat.id]) {
    await loadMessages(chat.id)
  }
  
  // Mark messages as read
  chat.unreadCount = 0
  
  // Mark chat as read (WebSocket will handle the update)
  chat.unread_count = 0
  
  // Scroll to bottom of messages
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !selectedChat.value || !whatsappStore.isReady) return
  

  
  const messageText = newMessage.value.trim()
  const chatId = selectedChat.value.id
  
  // Create optimistic message for immediate UI update
  const optimisticMessage = {
    id: Date.now().toString(),
    chat_id: chatId,
    content: messageText,
    is_from_me: true,
    timestamp: new Date(),
    status: 'pending',
    message_type: 'text',
    sender_name: 'You'
  }
  
  // Add optimistic message to UI
  if (!messages.value[chatId]) {
    messages.value[chatId] = []
  }
  messages.value[chatId].push(optimisticMessage)
  
  // Clear input immediately
  newMessage.value = ''
  
  // Scroll to bottom
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
  
  try {
    // Send message via WhatsApp backend
    const result = await apiService.sendMessage(chatId, messageText)
    
    if (result.success) {
      // Update message status to sent
      optimisticMessage.status = 'sent'
      optimisticMessage.id = result.data?.messageId || optimisticMessage.id
      
      // Update last message in chat
      selectedChat.value.last_message = messageText
      selectedChat.value.last_message_at = new Date()
      
      console.log('Message sent successfully')
      playSentSound()
    } else {
      throw new Error(result.error || 'Failed to send message')
    }
  } catch (err) {
    console.error('Error sending message:', err)
    
    // Update message status to failed
    optimisticMessage.status = 'failed'
    
    console.error('Failed to send message:', err.message)
    playErrorSound()
  }
}

const startNewChat = () => {
  if (!newChatPhone.value.trim()) return
  
  const newChat = {
    id: Date.now().toString(),
    name: newChatPhone.value,
    phone: newChatPhone.value,
    lastMessage: '',
    lastMessageTime: new Date(),
    unreadCount: 0
  }
  
  chats.value.unshift(newChat)
  selectedChat.value = newChat
  showNewChatModal.value = false
  newChatPhone.value = ''
}

const callContact = () => {
  if (selectedChat.value) {
    // In real app, initiate call
    alert(`Memanggil ${selectedChat.value.name} (${selectedChat.value.phone})`)
  }
}

const downloadAllChats = async () => {
  if (isDownloading.value || !whatsappStore.isReady) return
  
  isDownloading.value = true
  downloadProgress.value = 0
  
  try {
    console.log('Starting chat download...')
    
    // Download all chats first
    await loadChats()
    downloadProgress.value = 20
    
    // Download messages for each chat
    const totalChats = chats.value.length
    if (totalChats === 0) {
      downloadProgress.value = 100
      return
    }
    
    for (let i = 0; i < totalChats; i++) {
      const chat = chats.value[i]
      await loadMessages(chat.id)
      downloadProgress.value = 20 + Math.floor((i + 1) / totalChats * 80)
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('Chat download completed')
  } catch (error) {
    console.error('Error downloading chats:', error)
  } finally {
    isDownloading.value = false
    downloadProgress.value = 0
  }
}

const formatTime = (date) => {
  if (!date) return ''
  
  const now = new Date()
  const diff = now - date
  
  if (diff < 1000 * 60) {
    return 'Baru saja'
  } else if (diff < 1000 * 60 * 60) {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes} menit lalu`
  } else if (diff < 1000 * 60 * 60 * 24) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours} jam lalu`
  } else {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Setup WebSocket subscriptions
const setupWebSocketSubscriptions = () => {
  // Connect to WebSocket
  socketService.connect()
  
  // Listen for connection status
  socketService.on('connect', () => {
    console.log('🔌 Chat WebSocket connected')
    socketConnected.value = true
  })
  
  socketService.on('disconnect', () => {
    console.log('🔌 Chat WebSocket disconnected')
    socketConnected.value = false
  })
  
  // Listen for new messages
  socketService.on('new-message', (message) => {
    console.log('💬 New message received:', message)
    
    const chatId = message.chatId || message.from
    
    // Add message to messages array
    if (!messages.value[chatId]) {
      messages.value[chatId] = []
    }
    
    const formattedMessage = {
      id: message.id || Date.now().toString(),
      chat_id: chatId,
      content: message.content || message.body,
      is_from_me: message.fromMe || false,
      sender_name: message.senderName || message.pushName,
      timestamp: message.timestamp ? new Date(message.timestamp * 1000) : new Date(),
      status: message.status || 'received'
    }
    
    messages.value[chatId].push(formattedMessage)
    
    // Update chat list with new message
    const existingChatIndex = chats.value.findIndex(c => c.id === chatId)
    if (existingChatIndex !== -1) {
      const chat = chats.value[existingChatIndex]
      chat.last_message = formattedMessage.content
      chat.last_message_at = formattedMessage.timestamp
      
      // Update unread count if not from me and chat is not selected
      if (!formattedMessage.is_from_me && (!selectedChat.value || selectedChat.value.id !== chatId)) {
        chat.unread_count = (chat.unread_count || 0) + 1
        
        // Show notification for incoming message
        if (isNotificationEnabled.value) {
          showMessageNotification(
            chat.name || formattedMessage.sender_name || 'Unknown',
            formattedMessage.content,
            chatId
          )
        }
        
        // Log new message
        console.log(`New message from ${chat.name || formattedMessage.sender_name || 'Unknown'}: ${formattedMessage.content}`)
        
        // Play message sound
        playMessageSound()
      }
      
      // Move chat to top
      chats.value.splice(existingChatIndex, 1)
      chats.value.unshift(chat)
    } else {
      // Create new chat entry
      const newChat = {
        id: chatId,
        name: message.senderName || message.pushName || chatId.replace('@s.whatsapp.net', '').replace('@c.us', ''),
        phone: chatId.replace('@s.whatsapp.net', '').replace('@c.us', ''),
        isGroup: chatId.includes('@g.us'),
        unread_count: formattedMessage.is_from_me ? 0 : 1,
        last_message_at: formattedMessage.timestamp,
        last_message: formattedMessage.content,
        archived: false,
        pinned: false
      }
      chats.value.unshift(newChat)
    }
    
    // Auto scroll if this chat is selected
    if (selectedChat.value && selectedChat.value.id === chatId) {
      nextTick(() => {
        scrollToBottom()
      })
    }
  })
  
  // Listen for chat updates
  socketService.on('chats-updated', (updatedChats) => {
    console.log('💬 Chats updated:', updatedChats.length)
    if (updatedChats && updatedChats.length > 0) {
      // Update chats list
      const formattedChats = updatedChats.map(chat => ({
        id: chat.id,
        name: chat.name || 'Unknown',
        phone: chat.id.replace('@s.whatsapp.net', '').replace('@c.us', ''),
        isGroup: chat.isGroup,
        unread_count: chat.unreadCount || 0,
        last_message_at: chat.lastMessageTime ? new Date(chat.lastMessageTime * 1000) : null,
        last_message: '',
        archived: chat.archived,
        pinned: chat.pinned
      }))
      
      chats.value = formattedChats
      console.log(`Chats updated: ${formattedChats.length} chats available`)
    }
  })
  
  // Listen for contact updates
  socketService.on('contacts-updated', (contacts) => {
    console.log('👥 Contacts updated in chat:', contacts.length)
  })
}

const cleanupWebSocketSubscriptions = () => {
  socketService.cleanup()
  socketConnected.value = false
}

// Lifecycle
onMounted(async () => {
  // Request notification permission
  const permissionGranted = await requestNotificationPermission()
  if (permissionGranted) {
    console.log('Notifications enabled')
  } else {
    console.log('Notifications disabled')
  }
  
  // Load initial data
  await loadChats()
  
  // Setup WebSocket subscriptions
  setupWebSocketSubscriptions()
  
  // Auto-select first chat if available
  if (chats.value.length > 0) {
    await selectChat(chats.value[0])
  }
  
  // Auto-connect if not connected
  if (!whatsappStore.isConnected) {
    whatsappStore.connectToServer()
  }
})

onUnmounted(() => {
  // Cleanup WebSocket subscriptions
  cleanupWebSocketSubscriptions()
})
</script>