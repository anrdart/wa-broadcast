# Implementation Plan

- [x] 1. Setup Supabase Client and Configuration






  - [x] 1.1 Install Supabase client library and fast-check for testing

    - Run `npm install @supabase/supabase-js` and `npm install --save-dev fast-check vitest`
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 1.2 Create Supabase client plugin for Nuxt


    - Create `plugins/supabase.client.ts` with createClient configuration
    - Add runtime config for SUPABASE_URL and SUPABASE_ANON_KEY in `nuxt.config.ts`
    - _Requirements: 3.1_
  - [x] 1.3 Create type definitions for Supabase database schema


    - Create `types/supabase.ts` with BroadcastHistoryRecord, ScheduledMessageRecord, DeviceSessionRecord interfaces
    - _Requirements: 5.5, 5.6_

- [x] 2. Implement Device Session Management





  - [x] 2.1 Create device ID generation and persistence utility


    - Generate unique device ID using crypto.randomUUID() or fingerprint
    - Store in localStorage for persistence across sessions
    - _Requirements: 4.1_
  - [x] 2.2 Implement device session CRUD in useSupabase composable


    - Create `composables/useSupabase.ts` with initDeviceSession, updateDeviceSession, deactivateDeviceSession methods
    - _Requirements: 4.1, 4.2, 4.4_

  - [x] 2.3 Write property test for device session

    - **Property 6: Device ID Filtering**
    - **Validates: Requirements 4.3**

- [x] 3. Implement Broadcast History Sync





  - [x] 3.1 Implement broadcast history CRUD operations


    - Add fetchBroadcastHistory, saveBroadcastHistory, deleteBroadcastHistory methods to useSupabase
    - Include device_id filtering in fetch queries
    - _Requirements: 1.1, 1.2, 4.3, 5.1_

  - [x] 3.2 Create data transformation functions

    - Implement toBroadcastHistoryRecord (local → DB) and fromBroadcastHistoryRecord (DB → local)
    - _Requirements: 5.5, 5.6_

  - [x] 3.3 Write property test for broadcast history round-trip

    - **Property 1: Broadcast History Round-Trip Consistency**
    - **Validates: Requirements 1.1, 1.2, 5.5, 5.6**

- [x] 4. Implement Scheduled Messages Sync





  - [x] 4.1 Implement scheduled messages CRUD operations


    - Add fetchScheduledMessages, saveScheduledMessage, updateScheduledMessageStatus, deleteScheduledMessage methods
    - _Requirements: 2.1, 2.2, 2.4, 5.2_
  - [x] 4.2 Create scheduled message transformation functions

    - Implement toScheduledMessageRecord and fromScheduledMessageRecord
    - _Requirements: 5.5, 5.6_

  - [x] 4.3 Write property test for scheduled message round-trip

    - **Property 2: Scheduled Message Round-Trip Consistency**
    - **Validates: Requirements 2.1, 2.4, 5.5, 5.6**
  - [x] 4.4 Write property test for scheduled message status update


    - **Property 9: Scheduled Message Status Update**
    - **Validates: Requirements 2.2**

- [x] 5. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Realtime Subscriptions





  - [x] 6.1 Create realtime subscription setup


    - Implement subscribeToChanges method that subscribes to broadcast_history and scheduled_messages tables
    - Use postgres_changes event type for INSERT, UPDATE, DELETE
    - _Requirements: 3.1, 5.3_

  - [x] 6.2 Implement realtime event handlers

    - Create handleInsert, handleUpdate, handleDelete functions that update local state
    - Integrate with useAppState to update broadcastHistory and scheduledMessages
    - _Requirements: 3.2, 3.3, 3.4, 1.3, 2.3_
  - [x] 6.3 Implement subscription cleanup


    - Add unsubscribeFromChanges method for cleanup on component unmount
    - _Requirements: 5.3_

  - [x] 6.4 Write property tests for realtime events

    - **Property 3: Realtime INSERT Event Updates Local State**
    - **Property 4: Realtime UPDATE Event Updates Local State**
    - **Property 5: Realtime DELETE Event Removes From Local State**
    - **Validates: Requirements 1.3, 2.3, 3.2, 3.3, 3.4**

- [x] 7. Implement Offline Queue



  - [x] 7.1 Create offline queue storage and management


    - Store queued operations in localStorage
    - Implement queueOperation method that adds operations when offline
    - _Requirements: 6.1, 6.2_

  - [x] 7.2 Implement queue processing on reconnection
    - Create processOfflineQueue method that processes operations in FIFO order
    - Add connection state listener to trigger queue processing
    - _Requirements: 6.3_

  - [x] 7.3 Implement conflict resolution
    - Add last-write-wins logic based on updated_at timestamp comparison
    - _Requirements: 6.4_
  - [x] 7.4 Write property tests for offline queue



    - **Property 7: Offline Queue FIFO Processing**
    - **Property 8: Last-Write-Wins Conflict Resolution**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 8. Integrate with useAppState





  - [x] 8.1 Update useAppState to use Supabase for broadcast history


    - Replace localStorage calls with useSupabase methods in addBroadcastHistory, setBroadcastHistory, clearBroadcastHistory
    - Initialize broadcast history from Supabase on app load
    - _Requirements: 1.1, 1.2_

  - [x] 8.2 Update useAppState to use Supabase for scheduled messages

    - Replace localStorage calls with useSupabase methods in setScheduledMessages, addScheduledMessage, removeScheduledMessage
    - Initialize scheduled messages from Supabase on app load
    - _Requirements: 2.1, 2.4_


  - [x] 8.3 Add connection status and sync state to useAppState

    - Expose isSupabaseConnected, isSyncing, lastSyncAt from useSupabase
    - _Requirements: 5.4_

- [x] 9. Update UI Components





  - [x] 9.1 Update BroadcastInterface component


    - Call saveBroadcastHistory after broadcast completion
    - Show sync status indicator
    - _Requirements: 1.1_

  - [x] 9.2 Update BroadcastHistoryPanel component

    - Load history from Supabase on mount
    - Subscribe to realtime updates
    - _Requirements: 1.2, 1.3_

  - [x] 9.3 Update ScheduledMessagesPanel component

    - Load scheduled messages from Supabase on mount
    - Subscribe to realtime updates
    - Handle cancel action via Supabase
    - _Requirements: 2.1, 2.2, 2.3, 2.4_


- [x] 10. Implement App Lifecycle Hooks




  - [x] 10.1 Initialize Supabase on app mount


    - Call initDeviceSession and subscribeToChanges in app.vue onMounted
    - Fetch initial data from Supabase
    - _Requirements: 3.1, 4.1_


  - [ ] 10.2 Handle app close and logout
    - Call deactivateDeviceSession and unsubscribeFromChanges on logout
    - Process any remaining offline queue before close
    - _Requirements: 4.4_

- [x] 11. Final Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.
