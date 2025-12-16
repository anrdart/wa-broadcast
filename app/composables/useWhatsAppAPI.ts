// WhatsApp API Composable
// Integration with aldinokemal/go-whatsapp-web-multidevice

// Types for App State compatibility
export interface Contact {
  id: string
  name?: string
  number: string
  isMyContact: boolean
  isFromCSV: boolean
}

export interface Session {
  session_id: string
  status: 'qr_ready' | 'connected' | 'disconnected' | 'connecting'
  connected: boolean
  qr?: string
  phone_number?: string
}

export interface ScheduledMessage {
  id?: string
  recipient: string
  message: string
  scheduled_at: string
  status?: 'pending' | 'sent' | 'failed'
}

// API Response Types
export interface LoginResponse {
  code: string
  message: string
  results?: {
    qr_link?: string
    qr_duration?: number
  }
}

export interface DeviceInfo {
  name: string
  device: string
}

export interface DeviceResponse {
  code: string
  message: string
  results?: DeviceInfo[]
}

export interface SendMessageRequest {
  phone: string
  message: string
  reply_message_id?: string
}

export interface SendImageRequest {
  phone: string
  caption?: string
  image: string // base64
  view_once?: boolean
  compress?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const useWhatsAppAPI = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.whatsappApiUrl as string
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isConnected = ref(false)
  const qrCode = ref<string | null>(null)

  // API Headers
  const getHeaders = () => ({
    'Content-Type': 'application/json',
  })

  // Generic API Call
  const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {}),
        },
      })

      const data = await response.json()

      if (!response.ok || (data.code && data.code !== 'SUCCESS')) {
        throw new Error(data.message || 'API request failed')
      }

      return { success: true, data }
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  // Login - Get QR Code
  const getLoginQR = async () => {
    const result = await apiCall<LoginResponse>('/app/login')
    if (result.success && result.data?.results?.qr_link) {
      qrCode.value = result.data.results.qr_link
    }
    return result
  }

  // Check if connected - results is an array of devices
  const checkDevices = async () => {
    const result = await apiCall<DeviceResponse>('/app/devices')
    // Check if results array has at least one device
    if (result.success && result.data?.results && result.data.results.length > 0) {
      isConnected.value = true
      return { success: true, connected: true, data: result.data }
    }
    isConnected.value = false
    return { success: true, connected: false }
  }

  // Logout
  const logout = async () => {
    const result = await apiCall('/app/logout')
    if (result.success) {
      isConnected.value = false
      qrCode.value = null
    }
    return result
  }

  // Reconnect
  const reconnect = async () => {
    return await apiCall('/app/reconnect')
  }

  // Send Text Message
  const sendMessage = async (phone: string, message: string) => {
    return await apiCall('/send/message', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    })
  }

  // Send Image (with File using FormData)
  const sendImageWithFile = async (phone: string, imageFile: File, caption?: string) => {
    const formData = new FormData()
    formData.append('phone', phone)
    formData.append('image', imageFile)
    if (caption) {
      formData.append('caption', caption)
    }
    
    try {
      const response = await fetch(`${baseUrl}/send/image`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      return { success: data.code === 'SUCCESS', data, error: data.message }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send image'
      return { success: false, error: errorMessage }
    }
  }

  // Send Image (URL-based, not file)
  const sendImage = async (request: SendImageRequest) => {
    return await apiCall('/send/image', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Send to multiple recipients (broadcast) - text only
  const sendBroadcast = async (phones: string[], message: string, delayMs = 2000) => {
    const results: { phone: string; success: boolean; data?: unknown; error?: string }[] = []
    for (const phone of phones) {
      const result = await sendMessage(phone, message)
      results.push({ phone, success: result.success, data: result.data, error: result.error })
      // Add delay between messages to avoid rate limiting
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
    return { success: true, results }
  }

  // Send to multiple recipients with media (broadcast with image)
  const sendBroadcastWithMedia = async (phones: string[], message: string, imageFile: File, delayMs = 2000, onProgress?: (current: number, total: number) => void) => {
    const results: { phone: string; success: boolean; data?: unknown; error?: string }[] = []
    let current = 0
    
    for (const phone of phones) {
      current++
      onProgress?.(current, phones.length)
      
      const result = await sendImageWithFile(phone, imageFile, message)
      results.push({ phone, success: result.success, data: result.data, error: result.error })
      
      // Add delay between messages to avoid rate limiting
      if (delayMs > 0 && current < phones.length) {
        await new Promise(r => setTimeout(r, delayMs))
      }
    }
    return { success: true, results }
  }

  // Get user info
  const getUserInfo = async (phone: string) => {
    return await apiCall(`/user/info?phone=${phone}`)
  }

  // Get user avatar
  const getUserAvatar = async (phone: string) => {
    return await apiCall(`/user/avatar?phone=${phone}`)
  }

  // Check if phone is registered on WhatsApp
  const checkPhone = async (phone: string) => {
    return await apiCall(`/user/check?phone=${phone}`)
  }

  // Get my contacts from WhatsApp
  interface MyContactsResponse {
    code: string
    message: string
    results?: Array<{
      jid: string
      name: string
    }>
  }
  
  const getMyContacts = async () => {
    return await apiCall<MyContactsResponse>('/user/my/contacts')
  }

  // Get my groups from WhatsApp
  interface MyGroupsResponse {
    code: string
    message: string
    results?: Array<{
      jid: string
      name: string
      topic: string
      participants_count: number
    }>
  }
  
  const getMyGroups = async () => {
    return await apiCall<MyGroupsResponse>('/user/my/groups')
  }

  // Get list of chats
  interface ChatItem {
    jid: string
    name?: string
    last_message?: string
    last_message_time?: string
    unread_count?: number
    is_group?: boolean
  }
  
  interface ChatsResponse {
    code: string
    message: string
    results?: {
      data: ChatItem[]
      pagination: { limit: number; offset: number; total: number }
    }
  }
  
  const getChats = async (limit = 50, offset = 0) => {
    return await apiCall<ChatsResponse>(`/chats?limit=${limit}&offset=${offset}`)
  }

  // Get messages for a specific chat
  interface ChatMessageItem {
    id: string
    chat_jid: string
    sender_jid: string
    sender_name?: string
    message: string
    timestamp: string
    is_from_me: boolean
    is_read?: boolean
    media_type?: string
    media_url?: string
  }
  
  interface ChatMessagesResponse {
    code: string
    message: string
    results?: {
      data: ChatMessageItem[]
      pagination: { limit: number; offset: number; total: number }
    }
  }
  
  const getChatMessages = async (chatJid: string, limit = 50, offset = 0) => {
    return await apiCall<ChatMessagesResponse>(`/chat/${encodeURIComponent(chatJid)}/messages?limit=${limit}&offset=${offset}`)
  }

  return {
    // State
    isLoading: readonly(isLoading),
    error: readonly(error),
    isConnected: readonly(isConnected),
    qrCode: readonly(qrCode),
    baseUrl,

    // Actions
    getLoginQR,
    checkDevices,
    logout,
    reconnect,
    sendMessage,
    sendImage,
    sendBroadcast,
    getUserInfo,
    getUserAvatar,
    checkPhone,
    getMyContacts,
    getMyGroups,
    getChats,
    getChatMessages,
    sendImageWithFile,
    sendBroadcastWithMedia,
  }
}
