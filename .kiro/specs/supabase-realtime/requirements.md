# Requirements Document

## Introduction

Fitur Supabase Realtime untuk Broadcasto memungkinkan sinkronisasi data secara real-time antar device/browser yang berbeda. Saat ini aplikasi menggunakan localStorage untuk menyimpan broadcast history dan scheduled messages, yang tidak memungkinkan sync antar device. Dengan mengintegrasikan Supabase Realtime, perubahan data akan langsung tersinkronisasi ke semua device yang terhubung.

## Glossary

- **Supabase_Client**: Instance client library Supabase yang digunakan untuk berkomunikasi dengan Supabase backend
- **Realtime_Subscription**: Koneksi WebSocket ke Supabase yang mendengarkan perubahan data pada tabel tertentu
- **Device_Session**: Sesi unik untuk setiap browser/device yang mengakses aplikasi
- **Broadcast_History**: Riwayat pengiriman broadcast yang telah dilakukan
- **Scheduled_Message**: Pesan yang dijadwalkan untuk dikirim di waktu tertentu
- **Sync_State**: Status sinkronisasi data antara local state dan Supabase database

## Requirements

### Requirement 1

**User Story:** As a user, I want to have my broadcast history automatically synced to Supabase, so that I can access my history from any device.

#### Acceptance Criteria

1. WHEN a broadcast is completed THEN the Supabase_Client SHALL insert the broadcast record into the broadcast_history table
2. WHEN the application loads THEN the Supabase_Client SHALL fetch existing broadcast history from Supabase and populate the local state
3. WHEN a broadcast record is inserted or updated in Supabase THEN the Realtime_Subscription SHALL notify the application and update the local state
4. IF the Supabase connection fails during broadcast save THEN the Supabase_Client SHALL queue the operation and retry when connection is restored

### Requirement 2

**User Story:** As a user, I want to schedule messages that persist across devices, so that I can manage scheduled broadcasts from any device.

#### Acceptance Criteria

1. WHEN a user creates a scheduled message THEN the Supabase_Client SHALL insert the record into the scheduled_messages table
2. WHEN a user cancels a scheduled message THEN the Supabase_Client SHALL update the status to 'cancelled' in Supabase
3. WHEN a scheduled message record changes in Supabase THEN the Realtime_Subscription SHALL update the local scheduled messages list
4. WHEN the application loads THEN the Supabase_Client SHALL fetch pending scheduled messages from Supabase

### Requirement 3

**User Story:** As a user, I want real-time updates when data changes on other devices, so that I always see the latest information.

#### Acceptance Criteria

1. WHEN the application initializes THEN the Supabase_Client SHALL establish Realtime_Subscription connections to broadcast_history and scheduled_messages tables
2. WHEN a Realtime_Subscription receives an INSERT event THEN the application SHALL add the new record to local state
3. WHEN a Realtime_Subscription receives an UPDATE event THEN the application SHALL update the corresponding record in local state
4. WHEN a Realtime_Subscription receives a DELETE event THEN the application SHALL remove the record from local state
5. IF the Realtime_Subscription disconnects THEN the Supabase_Client SHALL attempt automatic reconnection with exponential backoff

### Requirement 4

**User Story:** As a user, I want my device session to be tracked, so that the system can filter data relevant to my WhatsApp connection.

#### Acceptance Criteria

1. WHEN the application loads THEN the Supabase_Client SHALL create or update a device_sessions record with the current device identifier
2. WHEN the user connects to WhatsApp THEN the Supabase_Client SHALL update the device_sessions record with the WhatsApp number
3. WHEN fetching broadcast history THEN the Supabase_Client SHALL filter records by the current device_id
4. WHEN the application closes or user logs out THEN the Supabase_Client SHALL update the device_sessions is_active status to false

### Requirement 5

**User Story:** As a developer, I want a composable that encapsulates all Supabase operations, so that the codebase remains maintainable and testable.

#### Acceptance Criteria

1. THE useSupabase composable SHALL expose methods for CRUD operations on broadcast_history table
2. THE useSupabase composable SHALL expose methods for CRUD operations on scheduled_messages table
3. THE useSupabase composable SHALL expose methods for managing Realtime_Subscription lifecycle (subscribe, unsubscribe)
4. THE useSupabase composable SHALL expose reactive state for connection status and sync state
5. WHEN serializing data for Supabase THEN the useSupabase composable SHALL transform local types to database schema format
6. WHEN deserializing data from Supabase THEN the useSupabase composable SHALL transform database records to local types

### Requirement 6

**User Story:** As a user, I want the application to work offline and sync when back online, so that I can use the app without constant internet connection.

#### Acceptance Criteria

1. WHEN the Supabase connection is lost THEN the application SHALL continue to function using local state
2. WHEN operations are performed offline THEN the application SHALL queue them for later synchronization
3. WHEN the connection is restored THEN the application SHALL process the queued operations in order
4. IF a conflict occurs during sync THEN the application SHALL use last-write-wins strategy based on updated_at timestamp
