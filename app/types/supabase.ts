/**
 * Supabase Database Schema Type Definitions
 * These types match the Supabase table schemas for type-safe operations
 */

// Database record types (match Supabase schema)
export interface BroadcastHistoryRecord {
  id: string
  device_id: string
  message: string
  recipients: { phone: string; name?: string }[]
  sent_count: number
  failed_count: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface ScheduledMessageRecord {
  id: string
  device_id: string
  contact_id: string | null
  broadcast_id: string | null
  message: string
  media_url: string | null
  media_type: string | null
  scheduled_time: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message: string | null
  created_at: string
  sent_at: string | null
}

export interface DeviceSessionRecord {
  id: string
  device_id: string
  whatsapp_number: string | null
  is_active: boolean
  last_active: string
  created_at: string
  updated_at: string
}

// Offline queue types
export interface QueuedOperation {
  id: string
  type: 'insert' | 'update' | 'delete'
  table: 'broadcast_history' | 'scheduled_messages'
  data: Record<string, unknown>
  timestamp: number
}

// Realtime payload types
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      broadcast_history: {
        Row: BroadcastHistoryRecord
        Insert: Omit<BroadcastHistoryRecord, 'created_at' | 'updated_at'>
        Update: Partial<Omit<BroadcastHistoryRecord, 'id' | 'created_at'>>
      }
      scheduled_messages: {
        Row: ScheduledMessageRecord
        Insert: Omit<ScheduledMessageRecord, 'created_at' | 'sent_at'>
        Update: Partial<Omit<ScheduledMessageRecord, 'id' | 'created_at'>>
      }
      device_sessions: {
        Row: DeviceSessionRecord
        Insert: Omit<DeviceSessionRecord, 'created_at' | 'updated_at'>
        Update: Partial<Omit<DeviceSessionRecord, 'id' | 'created_at'>>
      }
    }
  }
}

// Local BroadcastHistory type (from useAppState)
export interface LocalBroadcastHistory {
  id: string
  message: string
  totalContacts: number
  successful: number
  failed: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  createdAt: string
  hasMedia?: boolean
  scheduledAt?: string
}

/**
 * Transform local BroadcastHistory to database BroadcastHistoryRecord
 * Requirements: 5.5
 * @param local - Local broadcast history object from useAppState
 * @param deviceId - Current device ID
 * @param recipients - Array of recipients (phone and optional name)
 * @returns Database record format
 */
export function toBroadcastHistoryRecord(
  local: LocalBroadcastHistory,
  deviceId: string,
  recipients: { phone: string; name?: string }[] = []
): BroadcastHistoryRecord {
  return {
    id: local.id,
    device_id: deviceId,
    message: local.message,
    recipients: recipients,
    sent_count: local.successful,
    failed_count: local.failed,
    status: local.status,
    created_at: local.createdAt,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Transform database BroadcastHistoryRecord to local BroadcastHistory
 * Requirements: 5.6
 * @param record - Database record from Supabase
 * @returns Local broadcast history format for useAppState
 */
export function fromBroadcastHistoryRecord(record: BroadcastHistoryRecord): LocalBroadcastHistory {
  return {
    id: record.id,
    message: record.message,
    totalContacts: record.recipients?.length || 0,
    successful: record.sent_count,
    failed: record.failed_count,
    status: record.status,
    createdAt: record.created_at,
    hasMedia: false, // Not stored in DB, default to false
  }
}

// Local ScheduledMessage type (from useWhatsAppAPI)
export interface LocalScheduledMessage {
  id?: string
  recipient: string
  message: string
  scheduled_at: string
  status?: 'pending' | 'sent' | 'failed'
}

/**
 * Transform local ScheduledMessage to database ScheduledMessageRecord
 * Requirements: 5.5
 * @param local - Local scheduled message object from useWhatsAppAPI
 * @param deviceId - Current device ID
 * @returns Database record format
 */
export function toScheduledMessageRecord(
  local: LocalScheduledMessage,
  deviceId: string
): Omit<ScheduledMessageRecord, 'created_at' | 'sent_at'> {
  return {
    id: local.id || crypto.randomUUID(),
    device_id: deviceId,
    contact_id: null, // Can be set if contact lookup is needed
    broadcast_id: null, // Can be set if part of a broadcast
    message: local.message,
    media_url: null,
    media_type: null,
    scheduled_time: local.scheduled_at,
    status: local.status || 'pending',
    error_message: null,
  }
}

/**
 * Transform database ScheduledMessageRecord to local ScheduledMessage
 * Requirements: 5.6
 * @param record - Database record from Supabase
 * @returns Local scheduled message format for useWhatsAppAPI/useAppState
 */
export function fromScheduledMessageRecord(record: ScheduledMessageRecord): LocalScheduledMessage {
  return {
    id: record.id,
    recipient: record.contact_id || '', // Use contact_id as recipient identifier
    message: record.message,
    scheduled_at: record.scheduled_time,
    status: record.status === 'cancelled' ? 'failed' : record.status as 'pending' | 'sent' | 'failed',
  }
}
