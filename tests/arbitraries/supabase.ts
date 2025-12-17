/**
 * Test Arbitraries (Generators) for Supabase Property-Based Tests
 * Uses fast-check to generate random test data
 */

import * as fc from 'fast-check'
import type { BroadcastHistoryRecord, ScheduledMessageRecord, DeviceSessionRecord } from '~/types/supabase'

/**
 * Generates a valid UUID string
 */
export const uuidArbitrary = fc.uuid()

/**
 * Generates a valid device ID (UUID format)
 */
export const deviceIdArbitrary = fc.uuid()

/**
 * Generates a valid phone number string (10-15 digits)
 */
export const phoneNumberArbitrary = fc.stringMatching(/^[0-9]{10,15}$/)

/**
 * Generates a valid message string (1-1000 characters)
 */
export const messageArbitrary = fc.string({ minLength: 1, maxLength: 1000 })

/**
 * Generates a valid broadcast status
 */
export const broadcastStatusArbitrary = fc.constantFrom('pending', 'in_progress', 'completed', 'failed') as fc.Arbitrary<'pending' | 'in_progress' | 'completed' | 'failed'>

/**
 * Generates a valid scheduled message status
 */
export const scheduledMessageStatusArbitrary = fc.constantFrom('pending', 'sent', 'failed', 'cancelled') as fc.Arbitrary<'pending' | 'sent' | 'failed' | 'cancelled'>

/**
 * Generates a valid ISO date string
 * Using integer timestamps to avoid invalid date issues
 */
export const isoDateArbitrary = fc.integer({ 
  min: new Date('2020-01-01').getTime(), 
  max: new Date('2030-12-31').getTime() 
}).map(timestamp => new Date(timestamp).toISOString())

/**
 * Generates a recipient object
 */
export const recipientArbitrary = fc.record({
  phone: phoneNumberArbitrary,
  name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
})

/**
 * Generates a BroadcastHistoryRecord
 */
export const broadcastHistoryRecordArbitrary = (deviceId?: string): fc.Arbitrary<BroadcastHistoryRecord> => 
  fc.record({
    id: uuidArbitrary,
    device_id: deviceId ? fc.constant(deviceId) : deviceIdArbitrary,
    message: messageArbitrary,
    recipients: fc.array(recipientArbitrary, { minLength: 1, maxLength: 10 }),
    sent_count: fc.integer({ min: 0, max: 100 }),
    failed_count: fc.integer({ min: 0, max: 100 }),
    status: broadcastStatusArbitrary,
    created_at: isoDateArbitrary,
    updated_at: isoDateArbitrary,
  })

/**
 * Generates a ScheduledMessageRecord
 */
export const scheduledMessageRecordArbitrary = (deviceId?: string): fc.Arbitrary<ScheduledMessageRecord> =>
  fc.record({
    id: uuidArbitrary,
    device_id: deviceId ? fc.constant(deviceId) : deviceIdArbitrary,
    contact_id: fc.option(uuidArbitrary, { nil: null }),
    broadcast_id: fc.option(uuidArbitrary, { nil: null }),
    message: messageArbitrary,
    media_url: fc.option(fc.webUrl(), { nil: null }),
    media_type: fc.option(fc.constantFrom('image', 'video', 'audio', 'document'), { nil: null }),
    scheduled_time: isoDateArbitrary,
    status: scheduledMessageStatusArbitrary,
    error_message: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: null }),
    created_at: isoDateArbitrary,
    sent_at: fc.option(isoDateArbitrary, { nil: null }),
  })

/**
 * Generates a DeviceSessionRecord
 */
export const deviceSessionRecordArbitrary = (deviceId?: string): fc.Arbitrary<DeviceSessionRecord> =>
  fc.record({
    id: uuidArbitrary,
    device_id: deviceId ? fc.constant(deviceId) : deviceIdArbitrary,
    whatsapp_number: fc.option(phoneNumberArbitrary, { nil: null }),
    is_active: fc.boolean(),
    last_active: isoDateArbitrary,
    created_at: isoDateArbitrary,
    updated_at: isoDateArbitrary,
  })

/**
 * Generates a list of broadcast history records with mixed device IDs
 * Some records will match the target device ID, others won't
 */
export const mixedDeviceBroadcastHistoryArbitrary = (targetDeviceId: string) =>
  fc.array(
    fc.oneof(
      // Records matching target device
      broadcastHistoryRecordArbitrary(targetDeviceId),
      // Records with different device IDs
      broadcastHistoryRecordArbitrary()
    ),
    { minLength: 0, maxLength: 20 }
  )

/**
 * Local BroadcastHistory type (matches useAppState)
 */
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
 * Generates a LocalBroadcastHistory object (from useAppState)
 */
export const localBroadcastHistoryArbitrary: fc.Arbitrary<LocalBroadcastHistory> = fc.record({
  id: uuidArbitrary,
  message: messageArbitrary,
  totalContacts: fc.integer({ min: 1, max: 100 }),
  successful: fc.integer({ min: 0, max: 100 }),
  failed: fc.integer({ min: 0, max: 100 }),
  status: broadcastStatusArbitrary,
  createdAt: isoDateArbitrary,
  hasMedia: fc.option(fc.boolean(), { nil: undefined }),
  scheduledAt: fc.option(isoDateArbitrary, { nil: undefined }),
})

/**
 * Local ScheduledMessage type (matches useWhatsAppAPI)
 */
export interface LocalScheduledMessage {
  id?: string
  recipient: string
  message: string
  scheduled_at: string
  status?: 'pending' | 'sent' | 'failed'
}

/**
 * Generates a LocalScheduledMessage object (from useWhatsAppAPI)
 */
export const localScheduledMessageArbitrary: fc.Arbitrary<LocalScheduledMessage> = fc.record({
  id: fc.option(uuidArbitrary, { nil: undefined }),
  recipient: phoneNumberArbitrary,
  message: messageArbitrary,
  scheduled_at: isoDateArbitrary,
  status: fc.option(fc.constantFrom('pending', 'sent', 'failed') as fc.Arbitrary<'pending' | 'sent' | 'failed'>, { nil: undefined }),
})

/**
 * QueuedOperation type (from types/supabase.ts)
 */
export interface QueuedOperation {
  id: string
  type: 'insert' | 'update' | 'delete'
  table: 'broadcast_history' | 'scheduled_messages'
  data: Record<string, unknown>
  timestamp: number
}

/**
 * Generates a QueuedOperation for offline queue testing
 */
export const queuedOperationArbitrary: fc.Arbitrary<QueuedOperation> = fc.record({
  id: uuidArbitrary,
  type: fc.constantFrom('insert', 'update', 'delete') as fc.Arbitrary<'insert' | 'update' | 'delete'>,
  table: fc.constantFrom('broadcast_history', 'scheduled_messages') as fc.Arbitrary<'broadcast_history' | 'scheduled_messages'>,
  data: fc.record({
    id: uuidArbitrary,
    message: messageArbitrary,
  }),
  timestamp: fc.integer({ min: 1000000000000, max: 2000000000000 }), // Valid timestamps
})

/**
 * Generates a list of QueuedOperations with unique timestamps for FIFO testing
 */
export const queuedOperationListArbitrary = (minLength = 1, maxLength = 10): fc.Arbitrary<QueuedOperation[]> =>
  fc.array(queuedOperationArbitrary, { minLength, maxLength }).map(ops => {
    // Ensure unique timestamps by adding index offset
    return ops.map((op, index) => ({
      ...op,
      timestamp: op.timestamp + index,
    }))
  })


/**
 * WhatsApp Session status types
 */
export const sessionStatusArbitrary = fc.constantFrom('pending', 'connected', 'disconnected', 'dormant') as fc.Arbitrary<'pending' | 'connected' | 'disconnected' | 'dormant'>

/**
 * Generates a WhatsAppSessionRecord
 */
export interface WhatsAppSessionRecord {
  id: string
  device_id: string
  whatsapp_number: string | null
  api_instance_port: number
  status: 'pending' | 'connected' | 'disconnected' | 'dormant'
  session_token: string | null
  token_expires_at: string | null
  created_at: string
  last_active_at: string
  updated_at: string
}

export const whatsappSessionRecordArbitrary = (deviceId?: string): fc.Arbitrary<WhatsAppSessionRecord> =>
  fc.record({
    id: uuidArbitrary,
    device_id: deviceId ? fc.constant(deviceId) : deviceIdArbitrary,
    whatsapp_number: fc.option(phoneNumberArbitrary, { nil: null }),
    api_instance_port: fc.integer({ min: 3001, max: 3010 }),
    status: sessionStatusArbitrary,
    session_token: fc.option(fc.base64String({ minLength: 10, maxLength: 200 }), { nil: null }),
    token_expires_at: fc.option(isoDateArbitrary, { nil: null }),
    created_at: isoDateArbitrary,
    last_active_at: isoDateArbitrary,
    updated_at: isoDateArbitrary,
  })

/**
 * Generates a list of WhatsApp sessions with mixed device IDs
 */
export const mixedDeviceSessionsArbitrary = (targetDeviceId: string) =>
  fc.array(
    fc.oneof(
      whatsappSessionRecordArbitrary(targetDeviceId),
      whatsappSessionRecordArbitrary()
    ),
    { minLength: 0, maxLength: 20 }
  )

/**
 * Session Pool Record
 */
export interface SessionPoolRecord {
  id: string
  port: number
  status: 'available' | 'in_use' | 'maintenance'
  session_id: string | null
  container_name: string | null
  last_health_check: string | null
  created_at: string
  updated_at: string
}

export const poolStatusArbitrary = fc.constantFrom('available', 'in_use', 'maintenance') as fc.Arbitrary<'available' | 'in_use' | 'maintenance'>

export const sessionPoolRecordArbitrary = (): fc.Arbitrary<SessionPoolRecord> =>
  fc.record({
    id: uuidArbitrary,
    port: fc.integer({ min: 3001, max: 3010 }),
    status: poolStatusArbitrary,
    session_id: fc.option(uuidArbitrary, { nil: null }),
    container_name: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: null }),
    last_health_check: fc.option(isoDateArbitrary, { nil: null }),
    created_at: isoDateArbitrary,
    updated_at: isoDateArbitrary,
  })
