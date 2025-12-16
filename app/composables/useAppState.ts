// App State Composable
// Global state management for the WhatsApp Broadcast application

import type { Contact, Session, ScheduledMessage } from './useWhatsAppAPI'
import type { LocalBroadcastHistory, LocalScheduledMessage, BroadcastHistoryRecord } from '~/types/supabase'
import { toBroadcastHistoryRecord, fromBroadcastHistoryRecord, toScheduledMessageRecord, fromScheduledMessageRecord } from '~/types/supabase'
import { getDeviceId } from '~/utils/deviceId'

export interface ChatMessage {
  id: string
  contactId: string
  message: string
  timestamp: string
  isOutgoing: boolean
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

// Re-export for backward compatibility
export type BroadcastHistory = LocalBroadcastHistory

type AuthStatus = 'unauthenticated' | 'authenticating' | 'loading_data' | 'authenticated'
type CurrentView = 'broadcast' | 'history' | 'settings'

export const useAppState = () => {
  // Auth & Connection State
  const authStatus = useState<AuthStatus>('authStatus', () => 'unauthenticated')
  const qrCode = useState<string | null>('qrCode', () => null)
  const connectionError = useState<string | null>('connectionError', () => null)
  const loadingProgress = useState<number>('loadingProgress', () => 0)
  const sessionId = useState<string>('sessionId', () => '')

  // Contacts
  const contacts = useState<Contact[]>('contacts', () => [])
  const selectedContacts = useState<Set<string>>('selectedContacts', () => new Set())
  const searchQuery = useState<string>('searchQuery', () => '')

  // Chat
  const currentChatContact = useState<Contact | null>('currentChatContact', () => null)
  const chatMessages = useState<Map<string, ChatMessage[]>>('chatMessages', () => new Map())

  // Broadcast - Initialize empty, will be loaded from Supabase
  const broadcastHistory = useState<BroadcastHistory[]>('broadcastHistory', () => [])
  const broadcastProgress = useState<{ current: number; total: number } | null>('broadcastProgress', () => null)
  const broadcastHistoryInitialized = useState<boolean>('broadcastHistoryInitialized', () => false)

  // Scheduled Messages - Initialize empty, will be loaded from Supabase
  const scheduledMessages = useState<ScheduledMessage[]>('scheduledMessages', () => [])
  const scheduledMessagesInitialized = useState<boolean>('scheduledMessagesInitialized', () => false)

  // Supabase Connection State - Requirements: 5.4
  // These are computed from useSupabase to avoid circular dependencies
  const isSupabaseConnected = useState<boolean>('isSupabaseConnected', () => false)
  const isSyncing = useState<boolean>('isSyncing', () => false)
  const lastSyncAt = useState<Date | null>('lastSyncAt', () => null)
  const pendingOperationsCount = useState<number>('pendingOperationsCount', () => 0)

  // UI State
  const currentView = useState<CurrentView>('currentView', () => 'broadcast')
  const isMobileMenuOpen = useState<boolean>('isMobileMenuOpen', () => false)

  // Computed
  const filteredContacts = computed(() => {
    if (!searchQuery.value) return contacts.value
    const query = searchQuery.value.toLowerCase()
    return contacts.value.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.number.includes(query)
    )
  })

  const selectedContactsList = computed(() => {
    return contacts.value.filter((c) => selectedContacts.value.has(c.id))
  })

  const isConnected = computed(() => authStatus.value === 'authenticated')

  // Actions
  const setAuthStatus = (status: AuthStatus) => {
    authStatus.value = status
  }

  const setQRCode = (qr: string | null) => {
    qrCode.value = qr
    if (qr) {
      authStatus.value = 'authenticating'
    }
  }

  const setConnectionError = (err: string | null) => {
    connectionError.value = err
  }

  const setLoadingProgress = (progress: number) => {
    loadingProgress.value = progress
  }

  const setSessionId = (id: string) => {
    sessionId.value = id
    if (import.meta.client) {
      localStorage.setItem('whatsapp_session_id', id)
    }
  }

  const loadSessionId = () => {
    if (import.meta.client) {
      const saved = localStorage.getItem('whatsapp_session_id')
      if (saved) {
        sessionId.value = saved
      }
    }
  }

  const setContacts = (newContacts: Contact[]) => {
    contacts.value = newContacts
  }

  const toggleContactSelection = (contactId: string) => {
    const newSet = new Set(selectedContacts.value)
    if (newSet.has(contactId)) {
      newSet.delete(contactId)
    } else {
      newSet.add(contactId)
    }
    selectedContacts.value = newSet
  }

  const selectAllContacts = () => {
    selectedContacts.value = new Set(contacts.value.map((c) => c.id))
  }

  const clearContactSelection = () => {
    selectedContacts.value = new Set()
  }

  const setCurrentView = (view: CurrentView) => {
    currentView.value = view
  }

  const addChatMessage = (message: ChatMessage) => {
    const existing = chatMessages.value.get(message.contactId) || []
    existing.push(message)
    chatMessages.value.set(message.contactId, existing)
  }

  const getChatMessages = (contactId: string): ChatMessage[] => {
    return chatMessages.value.get(contactId) || []
  }

  const setBroadcastProgress = (progress: { current: number; total: number } | null) => {
    broadcastProgress.value = progress
  }

  /**
   * Add broadcast history - saves to local state and Supabase
   * Requirements: 1.1
   */
  const addBroadcastHistory = async (
    history: BroadcastHistory,
    recipients: { phone: string; name?: string }[] = []
  ) => {
    // Update local state immediately for responsive UI
    broadcastHistory.value = [history, ...broadcastHistory.value]
    
    // Save to Supabase asynchronously
    if (import.meta.client) {
      try {
        const { useSupabase } = await import('./useSupabase')
        const supabase = useSupabase()
        const deviceId = getDeviceId()
        
        const record = toBroadcastHistoryRecord(history, deviceId, recipients)
        
        if (supabase.isConnected.value) {
          await supabase.saveBroadcastHistory(record)
        } else {
          // Queue for offline sync
          supabase.queueOperation({
            type: 'insert',
            table: 'broadcast_history',
            data: record as unknown as Record<string, unknown>,
          })
        }
      } catch (error) {
        console.error('[AppState] Error saving broadcast history to Supabase:', error)
      }
    }
  }

  /**
   * Clear all broadcast history - clears local state and Supabase
   */
  const clearBroadcastHistory = async () => {
    const previousHistory = [...broadcastHistory.value]
    broadcastHistory.value = []
    
    // Delete from Supabase
    if (import.meta.client) {
      try {
        const { useSupabase } = await import('./useSupabase')
        const supabase = useSupabase()
        
        if (supabase.isConnected.value) {
          // Delete each record from Supabase
          for (const history of previousHistory) {
            await supabase.deleteBroadcastHistory(history.id)
          }
        } else {
          // Queue deletions for offline sync
          for (const history of previousHistory) {
            supabase.queueOperation({
              type: 'delete',
              table: 'broadcast_history',
              data: { id: history.id },
            })
          }
        }
      } catch (error) {
        console.error('[AppState] Error clearing broadcast history from Supabase:', error)
      }
    }
  }

  /**
   * Set broadcast history - used for initial load and realtime updates
   * Requirements: 1.2
   */
  const setBroadcastHistory = (history: BroadcastHistory[]) => {
    broadcastHistory.value = history
    broadcastHistoryInitialized.value = true
  }

  /**
   * Initialize broadcast history from Supabase
   * Requirements: 1.2
   */
  const initBroadcastHistoryFromSupabase = async () => {
    if (!import.meta.client || broadcastHistoryInitialized.value) return
    
    try {
      const { useSupabase } = await import('./useSupabase')
      const supabase = useSupabase()
      
      const records = await supabase.fetchBroadcastHistory()
      const localHistory = records.map(fromBroadcastHistoryRecord)
      
      broadcastHistory.value = localHistory
      broadcastHistoryInitialized.value = true
    } catch (error) {
      console.error('[AppState] Error initializing broadcast history from Supabase:', error)
    }
  }

  /**
   * Set scheduled messages - used for initial load and realtime updates
   * Requirements: 2.4
   */
  const setScheduledMessages = (messages: ScheduledMessage[]) => {
    scheduledMessages.value = messages
    scheduledMessagesInitialized.value = true
  }

  /**
   * Add scheduled message - saves to local state and Supabase
   * Requirements: 2.1
   */
  const addScheduledMessage = async (message: ScheduledMessage) => {
    // Update local state immediately
    scheduledMessages.value = [...scheduledMessages.value, message]
    
    // Save to Supabase asynchronously
    if (import.meta.client) {
      try {
        const { useSupabase } = await import('./useSupabase')
        const supabase = useSupabase()
        const deviceId = getDeviceId()
        
        // Convert to local format first, then to record
        const localMessage: LocalScheduledMessage = {
          id: message.id,
          recipient: message.recipient,
          message: message.message,
          scheduled_at: message.scheduled_at,
          status: message.status as 'pending' | 'sent' | 'failed' | undefined,
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
        console.error('[AppState] Error saving scheduled message to Supabase:', error)
      }
    }
  }

  /**
   * Remove scheduled message - removes from local state and Supabase
   * Requirements: 2.2
   */
  const removeScheduledMessage = async (id: string) => {
    // Update local state immediately
    scheduledMessages.value = scheduledMessages.value.filter((m) => m.id !== id)
    
    // Delete from Supabase
    if (import.meta.client) {
      try {
        const { useSupabase } = await import('./useSupabase')
        const supabase = useSupabase()
        
        if (supabase.isConnected.value) {
          // Update status to cancelled instead of deleting
          await supabase.updateScheduledMessageStatus(id, 'cancelled')
        } else {
          // Queue for offline sync
          supabase.queueOperation({
            type: 'update',
            table: 'scheduled_messages',
            data: { id, status: 'cancelled' },
          })
        }
      } catch (error) {
        console.error('[AppState] Error removing scheduled message from Supabase:', error)
      }
    }
  }

  /**
   * Initialize scheduled messages from Supabase
   * Requirements: 2.4
   */
  const initScheduledMessagesFromSupabase = async () => {
    if (!import.meta.client || scheduledMessagesInitialized.value) return
    
    try {
      const { useSupabase } = await import('./useSupabase')
      const supabase = useSupabase()
      
      const records = await supabase.fetchScheduledMessages()
      // Filter to only pending messages and convert to local format
      const localMessages = records
        .filter(r => r.status === 'pending')
        .map(r => ({
          id: r.id,
          recipient: r.contact_id || '',
          message: r.message,
          scheduled_at: r.scheduled_time,
          status: r.status,
        } as ScheduledMessage))
      
      scheduledMessages.value = localMessages
      scheduledMessagesInitialized.value = true
    } catch (error) {
      console.error('[AppState] Error initializing scheduled messages from Supabase:', error)
    }
  }

  const logout = async () => {
    authStatus.value = 'unauthenticated'
    qrCode.value = null
    connectionError.value = null
    loadingProgress.value = 0
    contacts.value = []
    selectedContacts.value = new Set()
    currentChatContact.value = null
    chatMessages.value = new Map()
    broadcastHistory.value = []
    scheduledMessages.value = []
    broadcastHistoryInitialized.value = false
    scheduledMessagesInitialized.value = false
    
    if (import.meta.client) {
      localStorage.removeItem('whatsapp_session_id')
      localStorage.removeItem('whatsapp_api_key')
      localStorage.removeItem('scheduled_broadcasts')
      
      // Deactivate device session in Supabase
      try {
        const { useSupabase } = await import('./useSupabase')
        const supabase = useSupabase()
        await supabase.deactivateDeviceSession()
        supabase.unsubscribeFromChanges()
      } catch (error) {
        console.error('[AppState] Error during logout cleanup:', error)
      }
    }
  }

  const importContactsFromCSV = (csvContacts: Omit<Contact, 'isMyContact'>[]) => {
    const newContacts = csvContacts.map((c) => ({
      ...c,
      isMyContact: false,
      isFromCSV: true,
    }))
    // Merge with existing contacts, avoiding duplicates
    const existingNumbers = new Set(contacts.value.map((c) => c.number))
    const uniqueNew = newContacts.filter((c) => !existingNumbers.has(c.number))
    contacts.value = [...contacts.value, ...uniqueNew]
  }

  /**
   * Sync Supabase connection state to app state
   * Requirements: 5.4
   */
  const syncSupabaseState = async () => {
    if (!import.meta.client) return
    
    try {
      const { useSupabase } = await import('./useSupabase')
      const supabase = useSupabase()
      
      isSupabaseConnected.value = supabase.isConnected.value
      isSyncing.value = supabase.isSyncing.value
      lastSyncAt.value = supabase.lastSyncAt.value
      pendingOperationsCount.value = supabase.pendingOperationsCount.value
    } catch (error) {
      console.error('[AppState] Error syncing Supabase state:', error)
    }
  }

  /**
   * Update Supabase connection status
   * Requirements: 5.4
   */
  const setSupabaseConnected = (connected: boolean) => {
    isSupabaseConnected.value = connected
  }

  /**
   * Update syncing status
   * Requirements: 5.4
   */
  const setSyncing = (syncing: boolean) => {
    isSyncing.value = syncing
  }

  /**
   * Update last sync timestamp
   * Requirements: 5.4
   */
  const setLastSyncAt = (date: Date | null) => {
    lastSyncAt.value = date
  }

  /**
   * Update pending operations count
   * Requirements: 5.4
   */
  const setPendingOperationsCount = (count: number) => {
    pendingOperationsCount.value = count
  }

  return {
    // State
    authStatus: readonly(authStatus),
    qrCode: readonly(qrCode),
    connectionError: readonly(connectionError),
    loadingProgress: readonly(loadingProgress),
    sessionId: readonly(sessionId),
    contacts: readonly(contacts),
    selectedContacts: readonly(selectedContacts),
    searchQuery,
    currentChatContact: readonly(currentChatContact),
    chatMessages: readonly(chatMessages),
    broadcastHistory: readonly(broadcastHistory),
    broadcastProgress: readonly(broadcastProgress),
    scheduledMessages: readonly(scheduledMessages),
    currentView: readonly(currentView),
    isMobileMenuOpen,
    broadcastHistoryInitialized: readonly(broadcastHistoryInitialized),
    scheduledMessagesInitialized: readonly(scheduledMessagesInitialized),
    
    // Supabase Connection State (Requirements: 5.4)
    isSupabaseConnected: readonly(isSupabaseConnected),
    isSyncing: readonly(isSyncing),
    lastSyncAt: readonly(lastSyncAt),
    pendingOperationsCount: readonly(pendingOperationsCount),

    // Computed
    filteredContacts,
    selectedContactsList,
    isConnected,

    // Actions
    setAuthStatus,
    setQRCode,
    setConnectionError,
    setLoadingProgress,
    setSessionId,
    loadSessionId,
    setContacts,
    toggleContactSelection,
    selectAllContacts,
    clearContactSelection,
    setCurrentView,
    addChatMessage,
    getChatMessages,
    setBroadcastProgress,
    addBroadcastHistory,
    clearBroadcastHistory,
    setBroadcastHistory,
    setScheduledMessages,
    addScheduledMessage,
    removeScheduledMessage,
    logout,
    importContactsFromCSV,
    
    // Supabase initialization and state sync
    initBroadcastHistoryFromSupabase,
    initScheduledMessagesFromSupabase,
    syncSupabaseState,
    setSupabaseConnected,
    setSyncing,
    setLastSyncAt,
    setPendingOperationsCount,
  }
}
