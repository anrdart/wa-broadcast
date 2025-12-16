/**
 * Supabase Composable
 * Encapsulates all Supabase operations for the Broadcasto application
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type {
  DeviceSessionRecord,
  BroadcastHistoryRecord,
  ScheduledMessageRecord,
  QueuedOperation,
} from '~/types/supabase'
import {
  fromBroadcastHistoryRecord,
  fromScheduledMessageRecord,
  type LocalBroadcastHistory,
  type LocalScheduledMessage,
} from '~/types/supabase'
import { getDeviceId, clearDeviceId } from '~/utils/deviceId'
import {
  getOfflineQueue,
  queueOperation as addToQueue,
  removeFromQueue,
  sortByTimestamp,
  resolveConflict,
  hasPendingOperations,
  getQueueLength,
} from '~/utils/offlineQueue'

// Realtime event handler types
export type RealtimeEventHandler<T> = (payload: RealtimePostgresChangesPayload<T>) => void

// Realtime event types for external use
export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE'

/**
 * Handler functions for realtime events
 * These are pure functions that can be tested independently
 * Requirements: 3.2, 3.3, 3.4
 */

/**
 * Handle INSERT event - adds new record to local state
 * Requirements: 3.2
 */
export function handleInsert<T>(
  currentState: T[],
  newRecord: T,
  idKey: keyof T = 'id' as keyof T
): T[] {
  // Check if record already exists (avoid duplicates)
  const exists = currentState.some(item => item[idKey] === newRecord[idKey])
  if (exists) {
    return currentState
  }
  return [...currentState, newRecord]
}

/**
 * Handle UPDATE event - updates existing record in local state
 * Requirements: 3.3
 */
export function handleUpdate<T>(
  currentState: T[],
  updatedRecord: T,
  idKey: keyof T = 'id' as keyof T
): T[] {
  return currentState.map(item =>
    item[idKey] === updatedRecord[idKey] ? updatedRecord : item
  )
}

/**
 * Handle DELETE event - removes record from local state
 * Requirements: 3.4
 */
export function handleDelete<T>(
  currentState: T[],
  deletedId: unknown,
  idKey: keyof T = 'id' as keyof T
): T[] {
  return currentState.filter(item => item[idKey] !== deletedId)
}

export interface UseSupabase {
  // Connection State
  isConnected: Readonly<Ref<boolean>>
  isSyncing: Readonly<Ref<boolean>>
  lastSyncAt: Readonly<Ref<Date | null>>

  // Device Session
  deviceId: Readonly<Ref<string>>
  initDeviceSession: () => Promise<DeviceSessionRecord | null>
  updateDeviceSession: (whatsappNumber: string) => Promise<DeviceSessionRecord | null>
  deactivateDeviceSession: () => Promise<void>

  // Broadcast History
  fetchBroadcastHistory: () => Promise<BroadcastHistoryRecord[]>
  saveBroadcastHistory: (broadcast: BroadcastHistoryRecord) => Promise<BroadcastHistoryRecord | null>
  deleteBroadcastHistory: (id: string) => Promise<boolean>

  // Scheduled Messages
  fetchScheduledMessages: () => Promise<ScheduledMessageRecord[]>
  saveScheduledMessage: (message: ScheduledMessageRecord) => Promise<ScheduledMessageRecord | null>
  updateScheduledMessageStatus: (id: string, status: ScheduledMessageRecord['status']) => Promise<ScheduledMessageRecord | null>
  deleteScheduledMessage: (id: string) => Promise<boolean>

  // Realtime Subscriptions (Requirements: 3.1, 5.3)
  subscribeToChanges: (handlers?: {
    onBroadcastHistoryChange?: RealtimeEventHandler<BroadcastHistoryRecord>
    onScheduledMessageChange?: RealtimeEventHandler<ScheduledMessageRecord>
  }) => void
  subscribeWithAppState: (appState: {
    broadcastHistory: Readonly<Ref<LocalBroadcastHistory[]>>
    scheduledMessages: Readonly<Ref<LocalScheduledMessage[]>>
    setBroadcastHistory: (history: LocalBroadcastHistory[]) => void
    setScheduledMessages: (messages: LocalScheduledMessage[]) => void
  }) => void
  unsubscribeFromChanges: () => void

  // Offline Queue (Requirements: 6.1, 6.2, 6.3, 6.4)
  queueOperation: (operation: Omit<QueuedOperation, 'id' | 'timestamp'>) => void
  processOfflineQueue: () => Promise<void>
  pendingOperationsCount: Readonly<Ref<number>>
}

export const useSupabase = (): UseSupabase => {
  const { $supabase } = useNuxtApp()
  const supabase = $supabase as SupabaseClient

  // Connection State
  const isConnected = useState<boolean>('supabase_connected', () => true)
  const isSyncing = useState<boolean>('supabase_syncing', () => false)
  const lastSyncAt = useState<Date | null>('supabase_last_sync', () => null)

  // Device ID - initialized from localStorage
  const deviceId = useState<string>('supabase_device_id', () => {
    if (import.meta.client) {
      return getDeviceId()
    }
    return ''
  })

  /**
   * Initialize or update device session in Supabase
   * Creates a new session if one doesn't exist, or updates the existing one
   * Requirements: 4.1
   */
  const initDeviceSession = async (): Promise<DeviceSessionRecord | null> => {
    if (!import.meta.client) return null

    const currentDeviceId = getDeviceId()
    deviceId.value = currentDeviceId

    try {
      isSyncing.value = true

      // Check if session already exists
      const { data: existingSession, error: fetchError } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('device_id', currentDeviceId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new devices
        console.error('[Supabase] Error fetching device session:', fetchError)
        isConnected.value = false
        return null
      }

      if (existingSession) {
        // Update existing session
        const { data: updatedSession, error: updateError } = await supabase
          .from('device_sessions')
          .update({
            is_active: true,
            last_active: new Date().toISOString(),
          })
          .eq('device_id', currentDeviceId)
          .select()
          .single()

        if (updateError) {
          console.error('[Supabase] Error updating device session:', updateError)
          return null
        }

        isConnected.value = true
        lastSyncAt.value = new Date()
        return updatedSession as DeviceSessionRecord
      }

      // Create new session
      const { data: newSession, error: insertError } = await supabase
        .from('device_sessions')
        .insert({
          id: crypto.randomUUID(),
          device_id: currentDeviceId,
          whatsapp_number: null,
          is_active: true,
          last_active: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('[Supabase] Error creating device session:', insertError)
        return null
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return newSession as DeviceSessionRecord
    } catch (error) {
      console.error('[Supabase] initDeviceSession error:', error)
      isConnected.value = false
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Update device session with WhatsApp number
   * Requirements: 4.2
   */
  const updateDeviceSession = async (whatsappNumber: string): Promise<DeviceSessionRecord | null> => {
    if (!import.meta.client) return null

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      const { data: updatedSession, error } = await supabase
        .from('device_sessions')
        .update({
          whatsapp_number: whatsappNumber,
          last_active: new Date().toISOString(),
        })
        .eq('device_id', currentDeviceId)
        .select()
        .single()

      if (error) {
        console.error('[Supabase] Error updating device session with WhatsApp number:', error)
        return null
      }

      lastSyncAt.value = new Date()
      return updatedSession as DeviceSessionRecord
    } catch (error) {
      console.error('[Supabase] updateDeviceSession error:', error)
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Deactivate device session (on logout or app close)
   * Requirements: 4.4
   */
  const deactivateDeviceSession = async (): Promise<void> => {
    if (!import.meta.client) return

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      const { error } = await supabase
        .from('device_sessions')
        .update({
          is_active: false,
          last_active: new Date().toISOString(),
        })
        .eq('device_id', currentDeviceId)

      if (error) {
        console.error('[Supabase] Error deactivating device session:', error)
      }

      lastSyncAt.value = new Date()
    } catch (error) {
      console.error('[Supabase] deactivateDeviceSession error:', error)
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Fetch broadcast history filtered by device ID
   * Requirements: 1.2, 4.3, 5.1
   */
  const fetchBroadcastHistory = async (): Promise<BroadcastHistoryRecord[]> => {
    if (!import.meta.client) return []

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      const { data, error } = await supabase
        .from('broadcast_history')
        .select('*')
        .eq('device_id', currentDeviceId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Supabase] Error fetching broadcast history:', error)
        isConnected.value = false
        return []
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return (data || []) as BroadcastHistoryRecord[]
    } catch (error) {
      console.error('[Supabase] fetchBroadcastHistory error:', error)
      isConnected.value = false
      return []
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Save broadcast history record to Supabase
   * Requirements: 1.1, 5.1
   */
  const saveBroadcastHistory = async (broadcast: BroadcastHistoryRecord): Promise<BroadcastHistoryRecord | null> => {
    if (!import.meta.client) return null

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      // Ensure the broadcast has the current device_id
      const recordToSave = {
        ...broadcast,
        device_id: currentDeviceId,
      }

      // Check if record already exists (upsert logic)
      const { data: existingRecord } = await supabase
        .from('broadcast_history')
        .select('id')
        .eq('id', broadcast.id)
        .single()

      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('broadcast_history')
          .update({
            message: recordToSave.message,
            recipients: recordToSave.recipients,
            sent_count: recordToSave.sent_count,
            failed_count: recordToSave.failed_count,
            status: recordToSave.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', broadcast.id)
          .select()
          .single()

        if (error) {
          console.error('[Supabase] Error updating broadcast history:', error)
          return null
        }

        isConnected.value = true
        lastSyncAt.value = new Date()
        return data as BroadcastHistoryRecord
      }

      // Insert new record
      const { data, error } = await supabase
        .from('broadcast_history')
        .insert({
          id: recordToSave.id,
          device_id: recordToSave.device_id,
          message: recordToSave.message,
          recipients: recordToSave.recipients,
          sent_count: recordToSave.sent_count,
          failed_count: recordToSave.failed_count,
          status: recordToSave.status,
        })
        .select()
        .single()

      if (error) {
        console.error('[Supabase] Error inserting broadcast history:', error)
        return null
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return data as BroadcastHistoryRecord
    } catch (error) {
      console.error('[Supabase] saveBroadcastHistory error:', error)
      isConnected.value = false
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Delete broadcast history record from Supabase
   * Requirements: 5.1
   */
  const deleteBroadcastHistory = async (id: string): Promise<boolean> => {
    if (!import.meta.client) return false

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      // Only delete records belonging to this device
      const { error } = await supabase
        .from('broadcast_history')
        .delete()
        .eq('id', id)
        .eq('device_id', currentDeviceId)

      if (error) {
        console.error('[Supabase] Error deleting broadcast history:', error)
        return false
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return true
    } catch (error) {
      console.error('[Supabase] deleteBroadcastHistory error:', error)
      isConnected.value = false
      return false
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Fetch scheduled messages filtered by device ID
   * Requirements: 2.4, 5.2
   */
  const fetchScheduledMessages = async (): Promise<ScheduledMessageRecord[]> => {
    if (!import.meta.client) return []

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('device_id', currentDeviceId)
        .order('scheduled_time', { ascending: true })

      if (error) {
        console.error('[Supabase] Error fetching scheduled messages:', error)
        isConnected.value = false
        return []
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return (data || []) as ScheduledMessageRecord[]
    } catch (error) {
      console.error('[Supabase] fetchScheduledMessages error:', error)
      isConnected.value = false
      return []
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Save scheduled message record to Supabase
   * Requirements: 2.1, 5.2
   */
  const saveScheduledMessage = async (message: ScheduledMessageRecord): Promise<ScheduledMessageRecord | null> => {
    if (!import.meta.client) return null

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      // Ensure the message has the current device_id
      const recordToSave = {
        ...message,
        device_id: currentDeviceId,
      }

      // Check if record already exists (upsert logic)
      const { data: existingRecord } = await supabase
        .from('scheduled_messages')
        .select('id')
        .eq('id', message.id)
        .single()

      if (existingRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('scheduled_messages')
          .update({
            contact_id: recordToSave.contact_id,
            broadcast_id: recordToSave.broadcast_id,
            message: recordToSave.message,
            media_url: recordToSave.media_url,
            media_type: recordToSave.media_type,
            scheduled_time: recordToSave.scheduled_time,
            status: recordToSave.status,
            error_message: recordToSave.error_message,
          })
          .eq('id', message.id)
          .select()
          .single()

        if (error) {
          console.error('[Supabase] Error updating scheduled message:', error)
          return null
        }

        isConnected.value = true
        lastSyncAt.value = new Date()
        return data as ScheduledMessageRecord
      }

      // Insert new record
      const { data, error } = await supabase
        .from('scheduled_messages')
        .insert({
          id: recordToSave.id,
          device_id: recordToSave.device_id,
          contact_id: recordToSave.contact_id,
          broadcast_id: recordToSave.broadcast_id,
          message: recordToSave.message,
          media_url: recordToSave.media_url,
          media_type: recordToSave.media_type,
          scheduled_time: recordToSave.scheduled_time,
          status: recordToSave.status,
          error_message: recordToSave.error_message,
        })
        .select()
        .single()

      if (error) {
        console.error('[Supabase] Error inserting scheduled message:', error)
        return null
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return data as ScheduledMessageRecord
    } catch (error) {
      console.error('[Supabase] saveScheduledMessage error:', error)
      isConnected.value = false
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Update scheduled message status
   * Requirements: 2.2
   */
  const updateScheduledMessageStatus = async (
    id: string,
    status: ScheduledMessageRecord['status']
  ): Promise<ScheduledMessageRecord | null> => {
    if (!import.meta.client) return null

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      const updateData: Record<string, unknown> = { status }

      // If status is 'sent', also set sent_at timestamp
      if (status === 'sent') {
        updateData.sent_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('scheduled_messages')
        .update(updateData)
        .eq('id', id)
        .eq('device_id', currentDeviceId)
        .select()
        .single()

      if (error) {
        console.error('[Supabase] Error updating scheduled message status:', error)
        return null
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return data as ScheduledMessageRecord
    } catch (error) {
      console.error('[Supabase] updateScheduledMessageStatus error:', error)
      isConnected.value = false
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Delete scheduled message from Supabase
   * Requirements: 5.2
   */
  const deleteScheduledMessage = async (id: string): Promise<boolean> => {
    if (!import.meta.client) return false

    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      isSyncing.value = true

      // Only delete records belonging to this device
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id)
        .eq('device_id', currentDeviceId)

      if (error) {
        console.error('[Supabase] Error deleting scheduled message:', error)
        return false
      }

      isConnected.value = true
      lastSyncAt.value = new Date()
      return true
    } catch (error) {
      console.error('[Supabase] deleteScheduledMessage error:', error)
      isConnected.value = false
      return false
    } finally {
      isSyncing.value = false
    }
  }

  // ============================================
  // Realtime Subscriptions
  // Requirements: 3.1, 3.2, 3.3, 3.4, 5.3
  // ============================================

  // Store active subscription channel
  let realtimeChannel: RealtimeChannel | null = null

  /**
   * Subscribe to realtime changes on broadcast_history and scheduled_messages tables
   * Requirements: 3.1, 5.3
   * @param handlers - Optional custom handlers for realtime events
   */
  const subscribeToChanges = (handlers?: {
    onBroadcastHistoryChange?: RealtimeEventHandler<BroadcastHistoryRecord>
    onScheduledMessageChange?: RealtimeEventHandler<ScheduledMessageRecord>
  }): void => {
    if (!import.meta.client) return

    const currentDeviceId = deviceId.value || getDeviceId()

    // Unsubscribe from existing channel if any
    if (realtimeChannel) {
      unsubscribeFromChanges()
    }

    // Create a new channel for realtime subscriptions
    realtimeChannel = supabase
      .channel(`device-${currentDeviceId}`)
      // Subscribe to broadcast_history changes filtered by device_id
      .on<BroadcastHistoryRecord>(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'broadcast_history',
          filter: `device_id=eq.${currentDeviceId}`,
        },
        (payload) => {
          console.log('[Supabase Realtime] broadcast_history change:', payload.eventType)
          
          // Call custom handler if provided
          if (handlers?.onBroadcastHistoryChange) {
            handlers.onBroadcastHistoryChange(payload)
          }
        }
      )
      // Subscribe to scheduled_messages changes filtered by device_id
      .on<ScheduledMessageRecord>(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'scheduled_messages',
          filter: `device_id=eq.${currentDeviceId}`,
        },
        (payload) => {
          console.log('[Supabase Realtime] scheduled_messages change:', payload.eventType)
          
          // Call custom handler if provided
          if (handlers?.onScheduledMessageChange) {
            handlers.onScheduledMessageChange(payload)
          }
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          isConnected.value = true
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isConnected.value = false
        }
      })
  }

  /**
   * Create default handlers that integrate with useAppState
   * Requirements: 1.3, 2.3, 3.2, 3.3, 3.4
   * @param appState - The app state composable instance
   */
  const createDefaultHandlers = (appState: {
    broadcastHistory: Readonly<Ref<LocalBroadcastHistory[]>>
    scheduledMessages: Readonly<Ref<LocalScheduledMessage[]>>
    setBroadcastHistory: (history: LocalBroadcastHistory[]) => void
    setScheduledMessages: (messages: LocalScheduledMessage[]) => void
  }) => {
    return {
      onBroadcastHistoryChange: (payload: RealtimePostgresChangesPayload<BroadcastHistoryRecord>) => {
        const currentHistory = [...appState.broadcastHistory.value]
        
        switch (payload.eventType) {
          case 'INSERT': {
            if (payload.new) {
              const localRecord = fromBroadcastHistoryRecord(payload.new)
              const newHistory = handleInsert(currentHistory, localRecord)
              appState.setBroadcastHistory(newHistory)
            }
            break
          }
          case 'UPDATE': {
            if (payload.new) {
              const localRecord = fromBroadcastHistoryRecord(payload.new)
              const newHistory = handleUpdate(currentHistory, localRecord)
              appState.setBroadcastHistory(newHistory)
            }
            break
          }
          case 'DELETE': {
            if (payload.old) {
              const newHistory = handleDelete(currentHistory, payload.old.id)
              appState.setBroadcastHistory(newHistory)
            }
            break
          }
        }
      },
      onScheduledMessageChange: (payload: RealtimePostgresChangesPayload<ScheduledMessageRecord>) => {
        const currentMessages = [...appState.scheduledMessages.value]
        
        switch (payload.eventType) {
          case 'INSERT': {
            if (payload.new) {
              const localRecord = fromScheduledMessageRecord(payload.new)
              const newMessages = handleInsert(currentMessages, localRecord)
              appState.setScheduledMessages(newMessages)
            }
            break
          }
          case 'UPDATE': {
            if (payload.new) {
              const localRecord = fromScheduledMessageRecord(payload.new)
              const newMessages = handleUpdate(currentMessages, localRecord)
              appState.setScheduledMessages(newMessages)
            }
            break
          }
          case 'DELETE': {
            if (payload.old) {
              const newMessages = handleDelete(currentMessages, payload.old.id)
              appState.setScheduledMessages(newMessages)
            }
            break
          }
        }
      },
    }
  }

  /**
   * Subscribe to changes with automatic integration to useAppState
   * Requirements: 1.3, 2.3, 3.1, 3.2, 3.3, 3.4, 5.3
   * @param appState - The app state composable instance
   */
  const subscribeWithAppState = (appState: {
    broadcastHistory: Readonly<Ref<LocalBroadcastHistory[]>>
    scheduledMessages: Readonly<Ref<LocalScheduledMessage[]>>
    setBroadcastHistory: (history: LocalBroadcastHistory[]) => void
    setScheduledMessages: (messages: LocalScheduledMessage[]) => void
  }): void => {
    const handlers = createDefaultHandlers(appState)
    subscribeToChanges(handlers)
  }

  /**
   * Unsubscribe from all realtime changes
   * Requirements: 5.3
   */
  const unsubscribeFromChanges = (): void => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
      console.log('[Supabase Realtime] Unsubscribed from changes')
    }
  }

  // ============================================
  // Offline Queue
  // Requirements: 6.1, 6.2, 6.3, 6.4
  // ============================================

  // Track pending operations count
  const pendingOperationsCount = useState<number>('supabase_pending_ops', () => {
    if (import.meta.client) {
      return getQueueLength()
    }
    return 0
  })

  /**
   * Queue an operation for later processing when offline
   * Requirements: 6.1, 6.2
   */
  const queueOperation = (operation: Omit<QueuedOperation, 'id' | 'timestamp'>): void => {
    if (!import.meta.client) return

    addToQueue(operation)
    pendingOperationsCount.value = getQueueLength()
    console.log('[Supabase] Operation queued for offline processing:', operation.type, operation.table)
  }

  /**
   * Process a single queued operation
   * Returns true if successful, false if failed
   * Requirements: 6.3
   */
  const processOperation = async (operation: QueuedOperation): Promise<boolean> => {
    const currentDeviceId = deviceId.value || getDeviceId()

    try {
      switch (operation.table) {
        case 'broadcast_history': {
          if (operation.type === 'insert' || operation.type === 'update') {
            // Check for conflicts using last-write-wins
            const { data: existingRecord } = await supabase
              .from('broadcast_history')
              .select('updated_at')
              .eq('id', operation.data.id as string)
              .single()

            if (existingRecord && operation.type === 'update') {
              const winner = resolveConflict(
                operation.data.updated_at as string || operation.timestamp,
                existingRecord.updated_at
              )
              
              if (winner === 'remote') {
                console.log('[Supabase] Conflict resolved: remote wins, skipping local update')
                return true // Skip this operation, remote is newer
              }
            }

            if (operation.type === 'insert' && !existingRecord) {
              const { error } = await supabase
                .from('broadcast_history')
                .insert({
                  ...operation.data,
                  device_id: currentDeviceId,
                })

              if (error) {
                console.error('[Supabase] Error processing insert:', error)
                return false
              }
            } else if (operation.type === 'update' || existingRecord) {
              const { error } = await supabase
                .from('broadcast_history')
                .update({
                  ...operation.data,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', operation.data.id as string)
                .eq('device_id', currentDeviceId)

              if (error) {
                console.error('[Supabase] Error processing update:', error)
                return false
              }
            }
          } else if (operation.type === 'delete') {
            const { error } = await supabase
              .from('broadcast_history')
              .delete()
              .eq('id', operation.data.id as string)
              .eq('device_id', currentDeviceId)

            if (error) {
              console.error('[Supabase] Error processing delete:', error)
              return false
            }
          }
          break
        }

        case 'scheduled_messages': {
          if (operation.type === 'insert' || operation.type === 'update') {
            // Check for conflicts using last-write-wins
            const { data: existingRecord } = await supabase
              .from('scheduled_messages')
              .select('created_at')
              .eq('id', operation.data.id as string)
              .single()

            if (existingRecord && operation.type === 'update') {
              // For scheduled messages, use created_at or operation timestamp
              const localTime = operation.data.updated_at as string || new Date(operation.timestamp).toISOString()
              const winner = resolveConflict(localTime, existingRecord.created_at)
              
              if (winner === 'remote') {
                console.log('[Supabase] Conflict resolved: remote wins, skipping local update')
                return true
              }
            }

            if (operation.type === 'insert' && !existingRecord) {
              const { error } = await supabase
                .from('scheduled_messages')
                .insert({
                  ...operation.data,
                  device_id: currentDeviceId,
                })

              if (error) {
                console.error('[Supabase] Error processing insert:', error)
                return false
              }
            } else if (operation.type === 'update' || existingRecord) {
              const { error } = await supabase
                .from('scheduled_messages')
                .update(operation.data)
                .eq('id', operation.data.id as string)
                .eq('device_id', currentDeviceId)

              if (error) {
                console.error('[Supabase] Error processing update:', error)
                return false
              }
            }
          } else if (operation.type === 'delete') {
            const { error } = await supabase
              .from('scheduled_messages')
              .delete()
              .eq('id', operation.data.id as string)
              .eq('device_id', currentDeviceId)

            if (error) {
              console.error('[Supabase] Error processing delete:', error)
              return false
            }
          }
          break
        }
      }

      return true
    } catch (error) {
      console.error('[Supabase] Error processing operation:', error)
      return false
    }
  }

  /**
   * Process all queued operations in FIFO order
   * Requirements: 6.3
   */
  const processOfflineQueue = async (): Promise<void> => {
    if (!import.meta.client) return
    if (!isConnected.value) {
      console.log('[Supabase] Cannot process queue: not connected')
      return
    }

    const queue = getOfflineQueue()
    if (queue.length === 0) {
      console.log('[Supabase] No pending operations to process')
      return
    }

    console.log(`[Supabase] Processing ${queue.length} queued operations...`)
    isSyncing.value = true

    // Sort by timestamp for FIFO processing
    const sortedQueue = sortByTimestamp(queue)

    for (const operation of sortedQueue) {
      const success = await processOperation(operation)
      
      if (success) {
        removeFromQueue(operation.id)
        pendingOperationsCount.value = getQueueLength()
        console.log(`[Supabase] Processed operation: ${operation.type} ${operation.table}`)
      } else {
        console.error(`[Supabase] Failed to process operation: ${operation.type} ${operation.table}`)
        // Continue with next operation, failed ones stay in queue
      }
    }

    isSyncing.value = false
    lastSyncAt.value = new Date()
    console.log('[Supabase] Queue processing complete')
  }

  // Set up connection state listener to trigger queue processing
  if (import.meta.client) {
    watch(isConnected, async (connected, wasConnected) => {
      if (connected && !wasConnected && hasPendingOperations()) {
        console.log('[Supabase] Connection restored, processing offline queue...')
        await processOfflineQueue()
      }
    })
  }

  return {
    // Connection State
    isConnected: readonly(isConnected),
    isSyncing: readonly(isSyncing),
    lastSyncAt: readonly(lastSyncAt),

    // Device Session
    deviceId: readonly(deviceId),
    initDeviceSession,
    updateDeviceSession,
    deactivateDeviceSession,

    // Broadcast History
    fetchBroadcastHistory,
    saveBroadcastHistory,
    deleteBroadcastHistory,

    // Scheduled Messages
    fetchScheduledMessages,
    saveScheduledMessage,
    updateScheduledMessageStatus,
    deleteScheduledMessage,

    // Realtime Subscriptions (Requirements: 3.1, 5.3)
    subscribeToChanges,
    subscribeWithAppState,
    unsubscribeFromChanges,

    // Offline Queue (Requirements: 6.1, 6.2, 6.3, 6.4)
    queueOperation,
    processOfflineQueue,
    pendingOperationsCount: readonly(pendingOperationsCount),
  }
}
