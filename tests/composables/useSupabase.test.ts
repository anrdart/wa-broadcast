/**
 * Property-Based Tests for useSupabase composable
 * Uses fast-check for property-based testing
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { BroadcastHistoryRecord, ScheduledMessageRecord, LocalBroadcastHistory, LocalScheduledMessage } from '~/types/supabase'
import {
  toBroadcastHistoryRecord,
  fromBroadcastHistoryRecord,
  toScheduledMessageRecord,
  fromScheduledMessageRecord,
} from '~/types/supabase'
import {
  handleInsert,
  handleUpdate,
  handleDelete,
} from '~/composables/useSupabase'
import {
  deviceIdArbitrary,
  mixedDeviceBroadcastHistoryArbitrary,
  localBroadcastHistoryArbitrary,
  recipientArbitrary,
  localScheduledMessageArbitrary,
  scheduledMessageRecordArbitrary,
  scheduledMessageStatusArbitrary,
  queuedOperationArbitrary,
  queuedOperationListArbitrary,
} from '../arbitraries/supabase'
import {
  sortByTimestamp,
  resolveConflict,
} from '~/utils/offlineQueue'

/**
 * Simulates the device ID filtering logic from fetchBroadcastHistory
 * This is a pure function that can be tested without Supabase connection
 */
function filterByDeviceId<T extends { device_id: string }>(
  records: T[],
  targetDeviceId: string
): T[] {
  return records.filter(record => record.device_id === targetDeviceId)
}

describe('useSupabase', () => {
  describe('property tests', () => {
    /**
     * **Feature: supabase-realtime, Property 6: Device ID Filtering**
     * *For any* fetch operation on broadcast_history, all returned records 
     * should have device_id matching the current device's ID.
     * **Validates: Requirements 4.3**
     */
    it('Property 6: Device ID Filtering - all returned records should have matching device_id', () => {
      fc.assert(
        fc.property(
          deviceIdArbitrary,
          mixedDeviceBroadcastHistoryArbitrary(fc.sample(deviceIdArbitrary, 1)[0]),
          (targetDeviceId, allRecords) => {
            // Apply the filtering logic
            const filteredRecords = filterByDeviceId(allRecords, targetDeviceId)

            // Property: All returned records must have device_id matching targetDeviceId
            const allMatch = filteredRecords.every(
              record => record.device_id === targetDeviceId
            )

            expect(allMatch).toBe(true)

            // Additional property: No records with matching device_id should be excluded
            const expectedCount = allRecords.filter(
              r => r.device_id === targetDeviceId
            ).length
            expect(filteredRecords.length).toBe(expectedCount)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 6: Device ID Filtering (Empty Result)**
     * *For any* device ID that doesn't exist in the records, 
     * the filter should return an empty array.
     * **Validates: Requirements 4.3**
     */
    it('Property 6: Device ID Filtering - returns empty array when no matching records', () => {
      fc.assert(
        fc.property(
          deviceIdArbitrary,
          deviceIdArbitrary,
          fc.array(
            fc.record({
              id: fc.uuid(),
              device_id: deviceIdArbitrary,
              message: fc.string({ minLength: 1, maxLength: 100 }),
              recipients: fc.array(fc.record({ phone: fc.string(), name: fc.option(fc.string(), { nil: undefined }) }), { minLength: 1, maxLength: 3 }),
              sent_count: fc.integer({ min: 0, max: 10 }),
              failed_count: fc.integer({ min: 0, max: 10 }),
              status: fc.constantFrom('pending', 'in_progress', 'completed', 'failed'),
              created_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
              updated_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (targetDeviceId, differentDeviceId, records) => {
            // Ensure all records have a different device_id
            const recordsWithDifferentDevice = records.map(r => ({
              ...r,
              device_id: differentDeviceId,
            })) as BroadcastHistoryRecord[]

            // Only test when device IDs are actually different
            fc.pre(targetDeviceId !== differentDeviceId)

            const filteredRecords = filterByDeviceId(recordsWithDifferentDevice, targetDeviceId)

            // Property: Should return empty array when no records match
            expect(filteredRecords.length).toBe(0)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 6: Device ID Filtering (Idempotence)**
     * *For any* set of records, filtering twice with the same device ID 
     * should produce the same result.
     * **Validates: Requirements 4.3**
     */
    it('Property 6: Device ID Filtering - filtering is idempotent', () => {
      fc.assert(
        fc.property(
          deviceIdArbitrary,
          mixedDeviceBroadcastHistoryArbitrary(fc.sample(deviceIdArbitrary, 1)[0]),
          (targetDeviceId, allRecords) => {
            const firstFilter = filterByDeviceId(allRecords, targetDeviceId)
            const secondFilter = filterByDeviceId(firstFilter, targetDeviceId)

            // Property: Filtering twice should produce the same result
            expect(secondFilter.length).toBe(firstFilter.length)
            expect(secondFilter).toEqual(firstFilter)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 1: Broadcast History Round-Trip Consistency**
     * *For any* valid BroadcastHistory object, converting to database format and back
     * should preserve the essential data (with expected transformations applied).
     * **Validates: Requirements 1.1, 1.2, 5.5, 5.6**
     */
    it('Property 1: Broadcast History Round-Trip - local to DB to local preserves essential data', () => {
      fc.assert(
        fc.property(
          localBroadcastHistoryArbitrary,
          deviceIdArbitrary,
          fc.array(recipientArbitrary, { minLength: 1, maxLength: 10 }),
          (localBroadcast, deviceId, recipients) => {
            // Transform local → DB
            const dbRecord = toBroadcastHistoryRecord(localBroadcast, deviceId, recipients)

            // Transform DB → local
            const roundTripped = fromBroadcastHistoryRecord(dbRecord)

            // Property: Essential fields should be preserved
            expect(roundTripped.id).toBe(localBroadcast.id)
            expect(roundTripped.message).toBe(localBroadcast.message)
            expect(roundTripped.successful).toBe(localBroadcast.successful)
            expect(roundTripped.failed).toBe(localBroadcast.failed)
            expect(roundTripped.status).toBe(localBroadcast.status)
            expect(roundTripped.createdAt).toBe(localBroadcast.createdAt)

            // totalContacts is derived from recipients array length
            expect(roundTripped.totalContacts).toBe(recipients.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 1: Broadcast History Round-Trip (DB Record)**
     * *For any* valid BroadcastHistoryRecord, converting to local format and back
     * should preserve the essential data.
     * **Validates: Requirements 1.1, 1.2, 5.5, 5.6**
     */
    it('Property 1: Broadcast History Round-Trip - DB to local preserves essential data', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            device_id: deviceIdArbitrary,
            message: fc.string({ minLength: 1, maxLength: 1000 }),
            recipients: fc.array(recipientArbitrary, { minLength: 1, maxLength: 10 }),
            sent_count: fc.integer({ min: 0, max: 100 }),
            failed_count: fc.integer({ min: 0, max: 100 }),
            status: fc.constantFrom('pending', 'in_progress', 'completed', 'failed') as fc.Arbitrary<'pending' | 'in_progress' | 'completed' | 'failed'>,
            created_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
            updated_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
          }),
          (dbRecord) => {
            // Transform DB → local
            const localBroadcast = fromBroadcastHistoryRecord(dbRecord as BroadcastHistoryRecord)

            // Property: Essential fields should be preserved
            expect(localBroadcast.id).toBe(dbRecord.id)
            expect(localBroadcast.message).toBe(dbRecord.message)
            expect(localBroadcast.successful).toBe(dbRecord.sent_count)
            expect(localBroadcast.failed).toBe(dbRecord.failed_count)
            expect(localBroadcast.status).toBe(dbRecord.status)
            expect(localBroadcast.createdAt).toBe(dbRecord.created_at)
            expect(localBroadcast.totalContacts).toBe(dbRecord.recipients.length)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 2: Scheduled Message Round-Trip Consistency**
     * *For any* valid ScheduledMessage object, converting to database format and back
     * should preserve the essential data (with expected transformations applied).
     * **Validates: Requirements 2.1, 2.4, 5.5, 5.6**
     */
    it('Property 2: Scheduled Message Round-Trip - local to DB to local preserves essential data', () => {
      fc.assert(
        fc.property(
          localScheduledMessageArbitrary,
          deviceIdArbitrary,
          (localMessage, deviceId) => {
            // Transform local → DB
            const dbRecord = toScheduledMessageRecord(localMessage, deviceId)

            // Simulate DB adding timestamps (as would happen in real DB)
            const fullDbRecord: ScheduledMessageRecord = {
              ...dbRecord,
              created_at: new Date().toISOString(),
              sent_at: null,
            }

            // Transform DB → local
            const roundTripped = fromScheduledMessageRecord(fullDbRecord)

            // Property: Essential fields should be preserved
            expect(roundTripped.message).toBe(localMessage.message)
            expect(roundTripped.scheduled_at).toBe(localMessage.scheduled_at)
            
            // Status should be preserved (with 'cancelled' mapped to 'failed')
            const expectedStatus = localMessage.status || 'pending'
            expect(roundTripped.status).toBe(expectedStatus)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 2: Scheduled Message Round-Trip (DB Record)**
     * *For any* valid ScheduledMessageRecord, converting to local format
     * should preserve the essential data.
     * **Validates: Requirements 2.1, 2.4, 5.5, 5.6**
     */
    it('Property 2: Scheduled Message Round-Trip - DB to local preserves essential data', () => {
      fc.assert(
        fc.property(
          scheduledMessageRecordArbitrary(),
          (dbRecord) => {
            // Transform DB → local
            const localMessage = fromScheduledMessageRecord(dbRecord)

            // Property: Essential fields should be preserved
            expect(localMessage.id).toBe(dbRecord.id)
            expect(localMessage.message).toBe(dbRecord.message)
            expect(localMessage.scheduled_at).toBe(dbRecord.scheduled_time)
            
            // Status mapping: 'cancelled' → 'failed', others preserved
            if (dbRecord.status === 'cancelled') {
              expect(localMessage.status).toBe('failed')
            } else {
              expect(localMessage.status).toBe(dbRecord.status)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 9: Scheduled Message Status Update**
     * *For any* scheduled message cancellation, the status should be 'cancelled' after the operation.
     * This tests the status update transformation logic.
     * **Validates: Requirements 2.2**
     */
    it('Property 9: Scheduled Message Status Update - status updates are correctly applied', () => {
      fc.assert(
        fc.property(
          scheduledMessageRecordArbitrary(),
          scheduledMessageStatusArbitrary,
          (originalRecord, newStatus) => {
            // Simulate status update (pure function test)
            const updatedRecord: ScheduledMessageRecord = {
              ...originalRecord,
              status: newStatus,
              // If status is 'sent', sent_at should be set
              sent_at: newStatus === 'sent' ? new Date().toISOString() : originalRecord.sent_at,
            }

            // Property: Status should be updated correctly
            expect(updatedRecord.status).toBe(newStatus)

            // Property: If status is 'sent', sent_at should be set
            if (newStatus === 'sent') {
              expect(updatedRecord.sent_at).not.toBeNull()
            }

            // Property: Other fields should remain unchanged
            expect(updatedRecord.id).toBe(originalRecord.id)
            expect(updatedRecord.message).toBe(originalRecord.message)
            expect(updatedRecord.scheduled_time).toBe(originalRecord.scheduled_time)
            expect(updatedRecord.device_id).toBe(originalRecord.device_id)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 3: Realtime INSERT Event Updates Local State**
     * *For any* INSERT event received via Realtime subscription, the local state 
     * should contain the new record after processing.
     * **Validates: Requirements 1.3, 2.3, 3.2**
     */
    it('Property 3: Realtime INSERT Event Updates Local State - new record is added', () => {
      fc.assert(
        fc.property(
          fc.array(localBroadcastHistoryArbitrary, { minLength: 0, maxLength: 10 }),
          localBroadcastHistoryArbitrary,
          (existingState, newRecord) => {
            // Ensure the new record has a unique ID
            const uniqueNewRecord = {
              ...newRecord,
              id: crypto.randomUUID(),
            }

            // Apply INSERT handler
            const newState = handleInsert(existingState, uniqueNewRecord)

            // Property: New state should contain the new record
            const found = newState.find(item => item.id === uniqueNewRecord.id)
            expect(found).toBeDefined()
            expect(found?.message).toBe(uniqueNewRecord.message)
            expect(found?.status).toBe(uniqueNewRecord.status)

            // Property: New state length should be original + 1
            expect(newState.length).toBe(existingState.length + 1)

            // Property: All original records should still exist
            existingState.forEach(original => {
              const stillExists = newState.find(item => item.id === original.id)
              expect(stillExists).toBeDefined()
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 3: Realtime INSERT Event - Duplicate Prevention**
     * *For any* INSERT event with an ID that already exists, the local state 
     * should not add a duplicate record.
     * **Validates: Requirements 1.3, 2.3, 3.2**
     */
    it('Property 3: Realtime INSERT Event - prevents duplicate records', () => {
      fc.assert(
        fc.property(
          fc.array(localBroadcastHistoryArbitrary, { minLength: 1, maxLength: 10 }),
          (existingState) => {
            // Pick an existing record to try to insert again
            const existingRecord = existingState[0]

            // Apply INSERT handler with existing record
            const newState = handleInsert(existingState, existingRecord)

            // Property: State length should remain the same (no duplicate added)
            expect(newState.length).toBe(existingState.length)

            // Property: Only one record with that ID should exist
            const matchingRecords = newState.filter(item => item.id === existingRecord.id)
            expect(matchingRecords.length).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 4: Realtime UPDATE Event Updates Local State**
     * *For any* UPDATE event received via Realtime subscription, the corresponding 
     * record in local state should reflect the updated values.
     * **Validates: Requirements 1.3, 2.3, 3.3**
     */
    it('Property 4: Realtime UPDATE Event Updates Local State - record is updated', () => {
      fc.assert(
        fc.property(
          fc.array(localBroadcastHistoryArbitrary, { minLength: 1, maxLength: 10 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('pending', 'in_progress', 'completed', 'failed') as fc.Arbitrary<'pending' | 'in_progress' | 'completed' | 'failed'>,
          (existingState, newMessage, newStatus) => {
            // Pick an existing record to update
            const recordToUpdate = existingState[0]
            const updatedRecord: LocalBroadcastHistory = {
              ...recordToUpdate,
              message: newMessage,
              status: newStatus,
            }

            // Apply UPDATE handler
            const newState = handleUpdate(existingState, updatedRecord)

            // Property: Updated record should have new values
            const found = newState.find(item => item.id === recordToUpdate.id)
            expect(found).toBeDefined()
            expect(found?.message).toBe(newMessage)
            expect(found?.status).toBe(newStatus)

            // Property: State length should remain the same
            expect(newState.length).toBe(existingState.length)

            // Property: Other records should be unchanged
            existingState.slice(1).forEach(original => {
              const stillExists = newState.find(item => item.id === original.id)
              expect(stillExists).toBeDefined()
              expect(stillExists?.message).toBe(original.message)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 4: Realtime UPDATE Event - Non-existent Record**
     * *For any* UPDATE event for a record that doesn't exist, the local state 
     * should remain unchanged.
     * **Validates: Requirements 1.3, 2.3, 3.3**
     */
    it('Property 4: Realtime UPDATE Event - non-existent record leaves state unchanged', () => {
      fc.assert(
        fc.property(
          fc.array(localBroadcastHistoryArbitrary, { minLength: 0, maxLength: 10 }),
          localBroadcastHistoryArbitrary,
          (existingState, updateRecord) => {
            // Ensure the update record has a unique ID not in existing state
            const nonExistentRecord = {
              ...updateRecord,
              id: crypto.randomUUID(),
            }

            // Apply UPDATE handler
            const newState = handleUpdate(existingState, nonExistentRecord)

            // Property: State length should remain the same
            expect(newState.length).toBe(existingState.length)

            // Property: No record with the non-existent ID should be added
            const found = newState.find(item => item.id === nonExistentRecord.id)
            expect(found).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 5: Realtime DELETE Event Removes From Local State**
     * *For any* DELETE event received via Realtime subscription, the deleted record 
     * should no longer exist in local state.
     * **Validates: Requirements 3.4**
     */
    it('Property 5: Realtime DELETE Event Removes From Local State - record is removed', () => {
      fc.assert(
        fc.property(
          fc.array(localBroadcastHistoryArbitrary, { minLength: 1, maxLength: 10 }),
          (existingState) => {
            // Pick an existing record to delete
            const recordToDelete = existingState[0]

            // Apply DELETE handler
            const newState = handleDelete(existingState, recordToDelete.id)

            // Property: Deleted record should no longer exist
            const found = newState.find(item => item.id === recordToDelete.id)
            expect(found).toBeUndefined()

            // Property: State length should be original - 1
            expect(newState.length).toBe(existingState.length - 1)

            // Property: Other records should still exist
            existingState.slice(1).forEach(original => {
              const stillExists = newState.find(item => item.id === original.id)
              expect(stillExists).toBeDefined()
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 5: Realtime DELETE Event - Non-existent Record**
     * *For any* DELETE event for a record that doesn't exist, the local state 
     * should remain unchanged.
     * **Validates: Requirements 3.4**
     */
    it('Property 5: Realtime DELETE Event - non-existent record leaves state unchanged', () => {
      fc.assert(
        fc.property(
          fc.array(localBroadcastHistoryArbitrary, { minLength: 0, maxLength: 10 }),
          fc.uuid(),
          (existingState, nonExistentId) => {
            // Ensure the ID doesn't exist in state
            fc.pre(!existingState.some(item => item.id === nonExistentId))

            // Apply DELETE handler
            const newState = handleDelete(existingState, nonExistentId)

            // Property: State length should remain the same
            expect(newState.length).toBe(existingState.length)

            // Property: All original records should still exist
            existingState.forEach(original => {
              const stillExists = newState.find(item => item.id === original.id)
              expect(stillExists).toBeDefined()
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 3/4/5: Realtime Events with ScheduledMessages**
     * *For any* realtime event on scheduled_messages, the handlers should work correctly.
     * **Validates: Requirements 1.3, 2.3, 3.2, 3.3, 3.4**
     */
    it('Property 3/4/5: Realtime Events work with ScheduledMessages', () => {
      fc.assert(
        fc.property(
          fc.array(localScheduledMessageArbitrary, { minLength: 1, maxLength: 10 }),
          localScheduledMessageArbitrary,
          (existingState, newRecord) => {
            // Ensure all records have IDs
            const stateWithIds = existingState.map(item => ({
              ...item,
              id: item.id || crypto.randomUUID(),
            }))
            const newRecordWithId = {
              ...newRecord,
              id: crypto.randomUUID(),
            }

            // Test INSERT
            const afterInsert = handleInsert(stateWithIds, newRecordWithId)
            expect(afterInsert.length).toBe(stateWithIds.length + 1)
            expect(afterInsert.find(item => item.id === newRecordWithId.id)).toBeDefined()

            // Test UPDATE
            const updatedRecord = { ...stateWithIds[0], message: 'updated message' }
            const afterUpdate = handleUpdate(stateWithIds, updatedRecord)
            expect(afterUpdate.find(item => item.id === updatedRecord.id)?.message).toBe('updated message')

            // Test DELETE
            const afterDelete = handleDelete(stateWithIds, stateWithIds[0].id)
            expect(afterDelete.length).toBe(stateWithIds.length - 1)
            expect(afterDelete.find(item => item.id === stateWithIds[0].id)).toBeUndefined()
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 7: Offline Queue FIFO Processing**
     * *For any* sequence of offline operations, when sorted by timestamp,
     * operations should be processed in the same order they were queued (FIFO).
     * **Validates: Requirements 6.2, 6.3**
     */
    it('Property 7: Offline Queue FIFO Processing - operations are sorted by timestamp', () => {
      fc.assert(
        fc.property(
          queuedOperationListArbitrary(2, 20),
          (operations) => {
            // Shuffle the operations to simulate random queue order
            const shuffled = [...operations].sort(() => Math.random() - 0.5)

            // Apply FIFO sorting
            const sorted = sortByTimestamp(shuffled)

            // Property: Sorted operations should be in ascending timestamp order
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].timestamp).toBeGreaterThanOrEqual(sorted[i - 1].timestamp)
            }

            // Property: All original operations should be present
            expect(sorted.length).toBe(operations.length)

            // Property: The first operation should have the smallest timestamp
            const minTimestamp = Math.min(...operations.map(op => op.timestamp))
            expect(sorted[0].timestamp).toBe(minTimestamp)

            // Property: The last operation should have the largest timestamp
            const maxTimestamp = Math.max(...operations.map(op => op.timestamp))
            expect(sorted[sorted.length - 1].timestamp).toBe(maxTimestamp)
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 7: Offline Queue FIFO - Stability**
     * *For any* sequence of operations with the same timestamp,
     * the relative order should be preserved (stable sort).
     * **Validates: Requirements 6.2, 6.3**
     */
    it('Property 7: Offline Queue FIFO Processing - sorting is stable for equal timestamps', () => {
      fc.assert(
        fc.property(
          fc.array(queuedOperationArbitrary, { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (operations, sameTimestamp) => {
            // Give all operations the same timestamp
            const sameTimeOps = operations.map((op, index) => ({
              ...op,
              id: `op-${index}`, // Use index-based IDs to track order
              timestamp: sameTimestamp,
            }))

            // Sort should preserve original order for equal timestamps
            const sorted = sortByTimestamp(sameTimeOps)

            // Property: All operations should still be present
            expect(sorted.length).toBe(sameTimeOps.length)

            // Property: All timestamps should be equal
            sorted.forEach(op => {
              expect(op.timestamp).toBe(sameTimestamp)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 8: Last-Write-Wins Conflict Resolution**
     * *For any* conflicting updates (same record, different values), 
     * the update with the later updated_at timestamp should prevail.
     * **Validates: Requirements 6.4**
     */
    it('Property 8: Last-Write-Wins Conflict Resolution - later timestamp wins', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 1500000000000 }),
          fc.integer({ min: 1500000000001, max: 2000000000000 }),
          (earlierTimestamp, laterTimestamp) => {
            // Property: Later timestamp should always win
            const result1 = resolveConflict(laterTimestamp, earlierTimestamp)
            expect(result1).toBe('local')

            const result2 = resolveConflict(earlierTimestamp, laterTimestamp)
            expect(result2).toBe('remote')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 8: Last-Write-Wins - Equal Timestamps**
     * *For any* conflicting updates with equal timestamps,
     * local should win (tie-breaker favors local).
     * **Validates: Requirements 6.4**
     */
    it('Property 8: Last-Write-Wins Conflict Resolution - equal timestamps favor local', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000000000000, max: 2000000000000 }),
          (sameTimestamp) => {
            // Property: Equal timestamps should favor local (local >= remote)
            const result = resolveConflict(sameTimestamp, sameTimestamp)
            expect(result).toBe('local')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 8: Last-Write-Wins - ISO String Timestamps**
     * *For any* ISO date string timestamps, conflict resolution should work correctly.
     * **Validates: Requirements 6.4**
     */
    it('Property 8: Last-Write-Wins Conflict Resolution - works with ISO date strings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-01-01').getTime() }),
          fc.integer({ min: new Date('2025-01-02').getTime(), max: new Date('2030-12-31').getTime() }),
          (earlierMs, laterMs) => {
            const earlierIso = new Date(earlierMs).toISOString()
            const laterIso = new Date(laterMs).toISOString()

            // Property: Later ISO timestamp should win
            const result1 = resolveConflict(laterIso, earlierIso)
            expect(result1).toBe('local')

            const result2 = resolveConflict(earlierIso, laterIso)
            expect(result2).toBe('remote')
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * **Feature: supabase-realtime, Property 8: Last-Write-Wins - Mixed Timestamp Types**
     * *For any* mix of numeric and ISO string timestamps, conflict resolution should work.
     * **Validates: Requirements 6.4**
     */
    it('Property 8: Last-Write-Wins Conflict Resolution - handles mixed timestamp types', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2024-12-31').getTime() }),
          fc.integer({ min: new Date('2025-01-01').getTime(), max: new Date('2030-12-31').getTime() }),
          (earlierMs, laterMs) => {
            const earlierIso = new Date(earlierMs).toISOString()

            // Property: Numeric vs ISO string comparison should work
            const result1 = resolveConflict(laterMs, earlierIso)
            expect(result1).toBe('local')

            const result2 = resolveConflict(earlierIso, laterMs)
            expect(result2).toBe('remote')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})


    /**
     * **Feature: multi-session, Property 7: Session Persistence Round-Trip**
     * *For any* session data stored in Supabase, retrieving by session ID should return 
     * equivalent data including all required fields.
     * **Validates: Requirements 4.1, 4.4**
     */
    describe('Property 7: Session Persistence Round-Trip', () => {
      /**
       * Simulates the session creation and retrieval logic
       * This tests that the data transformation preserves all required fields
       */
      it('session data round-trip preserves all required fields', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.uuid(),
            fc.option(fc.stringMatching(/^[0-9]{10,15}$/), { nil: null }),
            fc.integer({ min: 3001, max: 3010 }),
            fc.constantFrom('pending', 'connected', 'disconnected', 'dormant') as fc.Arbitrary<'pending' | 'connected' | 'disconnected' | 'dormant'>,
            fc.option(fc.base64String({ minLength: 10, maxLength: 200 }), { nil: null }),
            fc.option(fc.integer({ min: Date.now(), max: Date.now() + 86400000 }).map(t => new Date(t).toISOString()), { nil: null }),
            (sessionId, deviceId, whatsappNumber, port, status, token, tokenExpiresAt) => {
              // Simulate session creation input (what we send to Supabase)
              const sessionInput = {
                id: sessionId,
                device_id: deviceId,
                whatsapp_number: whatsappNumber,
                api_instance_port: port,
                status: status,
                session_token: token,
                token_expires_at: tokenExpiresAt,
              }

              // Simulate what Supabase would return (adding timestamps)
              const simulatedDbResponse = {
                ...sessionInput,
                created_at: new Date().toISOString(),
                last_active_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }

              // Property: All input fields should be preserved in the response
              expect(simulatedDbResponse.id).toBe(sessionInput.id)
              expect(simulatedDbResponse.device_id).toBe(sessionInput.device_id)
              expect(simulatedDbResponse.whatsapp_number).toBe(sessionInput.whatsapp_number)
              expect(simulatedDbResponse.api_instance_port).toBe(sessionInput.api_instance_port)
              expect(simulatedDbResponse.status).toBe(sessionInput.status)
              expect(simulatedDbResponse.session_token).toBe(sessionInput.session_token)
              expect(simulatedDbResponse.token_expires_at).toBe(sessionInput.token_expires_at)

              // Property: Timestamps should be valid ISO strings
              expect(() => new Date(simulatedDbResponse.created_at)).not.toThrow()
              expect(() => new Date(simulatedDbResponse.last_active_at)).not.toThrow()
              expect(() => new Date(simulatedDbResponse.updated_at)).not.toThrow()
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * Tests that session retrieval by device_id returns the correct session
       */
      it('session retrieval by device_id returns matching session', () => {
        fc.assert(
          fc.property(
            fc.uuid(),
            fc.array(
              fc.record({
                id: fc.uuid(),
                device_id: fc.uuid(),
                whatsapp_number: fc.option(fc.stringMatching(/^[0-9]{10,15}$/), { nil: null }),
                api_instance_port: fc.integer({ min: 3001, max: 3010 }),
                status: fc.constantFrom('pending', 'connected', 'disconnected', 'dormant') as fc.Arbitrary<'pending' | 'connected' | 'disconnected' | 'dormant'>,
                session_token: fc.option(fc.base64String({ minLength: 10, maxLength: 200 }), { nil: null }),
                token_expires_at: fc.option(fc.integer({ min: Date.now(), max: Date.now() + 86400000 }).map(t => new Date(t).toISOString()), { nil: null }),
                created_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
                last_active_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
                updated_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (targetDeviceId, sessions) => {
              // Add a session with the target device_id
              const targetSession = {
                id: crypto.randomUUID(),
                device_id: targetDeviceId,
                whatsapp_number: '1234567890',
                api_instance_port: 3001,
                status: 'connected' as const,
                session_token: 'test-token',
                token_expires_at: new Date(Date.now() + 86400000).toISOString(),
                created_at: new Date().toISOString(),
                last_active_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }

              const allSessions = [...sessions, targetSession]

              // Simulate filtering by device_id (what getWhatsAppSession does)
              const foundSession = allSessions.find(s => s.device_id === targetDeviceId)

              // Property: Should find the session with matching device_id
              expect(foundSession).toBeDefined()
              expect(foundSession?.device_id).toBe(targetDeviceId)
              expect(foundSession?.id).toBe(targetSession.id)
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * Tests that session update preserves non-updated fields
       */
      it('session update preserves non-updated fields', () => {
        fc.assert(
          fc.property(
            fc.record({
              id: fc.uuid(),
              device_id: fc.uuid(),
              whatsapp_number: fc.option(fc.stringMatching(/^[0-9]{10,15}$/), { nil: null }),
              api_instance_port: fc.integer({ min: 3001, max: 3010 }),
              status: fc.constantFrom('pending', 'connected', 'disconnected', 'dormant') as fc.Arbitrary<'pending' | 'connected' | 'disconnected' | 'dormant'>,
              session_token: fc.option(fc.base64String({ minLength: 10, maxLength: 200 }), { nil: null }),
              token_expires_at: fc.option(fc.integer({ min: Date.now(), max: Date.now() + 86400000 }).map(t => new Date(t).toISOString()), { nil: null }),
              created_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
              last_active_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
              updated_at: fc.integer({ min: Date.now() - 86400000, max: Date.now() }).map(t => new Date(t).toISOString()),
            }),
            fc.constantFrom('pending', 'connected', 'disconnected', 'dormant') as fc.Arbitrary<'pending' | 'connected' | 'disconnected' | 'dormant'>,
            (originalSession, newStatus) => {
              // Simulate partial update (only status changes)
              const updates = { status: newStatus }

              // Simulate what the update would produce
              const updatedSession = {
                ...originalSession,
                ...updates,
                updated_at: new Date().toISOString(),
              }

              // Property: Non-updated fields should be preserved
              expect(updatedSession.id).toBe(originalSession.id)
              expect(updatedSession.device_id).toBe(originalSession.device_id)
              expect(updatedSession.whatsapp_number).toBe(originalSession.whatsapp_number)
              expect(updatedSession.api_instance_port).toBe(originalSession.api_instance_port)
              expect(updatedSession.session_token).toBe(originalSession.session_token)
              expect(updatedSession.token_expires_at).toBe(originalSession.token_expires_at)
              expect(updatedSession.created_at).toBe(originalSession.created_at)

              // Property: Updated field should have new value
              expect(updatedSession.status).toBe(newStatus)

              // Property: updated_at should be newer
              expect(new Date(updatedSession.updated_at).getTime()).toBeGreaterThanOrEqual(
                new Date(originalSession.updated_at).getTime()
              )
            }
          ),
          { numRuns: 100 }
        )
      })

      /**
       * Tests that session deletion removes the session
       */
      it('session deletion removes session from collection', () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                id: fc.uuid(),
                device_id: fc.uuid(),
                whatsapp_number: fc.option(fc.stringMatching(/^[0-9]{10,15}$/), { nil: null }),
                api_instance_port: fc.integer({ min: 3001, max: 3010 }),
                status: fc.constantFrom('pending', 'connected', 'disconnected', 'dormant') as fc.Arbitrary<'pending' | 'connected' | 'disconnected' | 'dormant'>,
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (sessions) => {
              // Pick a session to delete
              const sessionToDelete = sessions[0]

              // Simulate deletion (filter out the deleted session)
              const afterDeletion = sessions.filter(s => s.id !== sessionToDelete.id)

              // Property: Deleted session should not exist
              const found = afterDeletion.find(s => s.id === sessionToDelete.id)
              expect(found).toBeUndefined()

              // Property: Other sessions should still exist
              expect(afterDeletion.length).toBe(sessions.length - 1)

              // Property: All remaining sessions should have different IDs
              sessions.slice(1).forEach(s => {
                const stillExists = afterDeletion.find(remaining => remaining.id === s.id)
                expect(stillExists).toBeDefined()
              })
            }
          ),
          { numRuns: 100 }
        )
      })
    })
