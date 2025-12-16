---
inclusion: always
---

# Broadcasto Project Guidelines

## Project Overview
Broadcasto is a WhatsApp broadcast tool with a Vue 3 frontend and Go backend using the whatsmeow library for WhatsApp Web Multi-Device API integration.

## Architecture

### Backend (Go)
- Single `main.go` file using whatsmeow for WhatsApp connectivity
- WebSocket server on port 3000 for real-time communication
- SQLite database for WhatsApp session persistence (`data/whatsmeow.db`)
- Event-driven architecture handling WhatsApp events (QR, messages, connection state)

### Frontend (Vue 3 + TypeScript)
- Vite dev server on port 5173
- Pinia for state management (`stores/app.ts`)
- WebSocket service for backend communication (`services/websocket.ts`)
- Supabase integration for data persistence (`services/supabase.ts`)
- Tailwind CSS v4 for styling

### Data Flow
```
Frontend (Vue) <--WebSocket--> Backend (Go) <--whatsmeow--> WhatsApp
                    |
                    v
              Supabase (persistence)
```

## Code Conventions

### TypeScript/Vue
- Use Composition API with `<script setup>` syntax
- Define interfaces for all data structures in `types/` directory
- Use Pinia stores for shared state, not component-level state
- Prefix event handlers with `handle` (e.g., `handleQRCode`, `handleAuthenticated`)
- Use `ref()` for reactive primitives, `computed()` for derived state

### Go Backend
- Use structured types for JSON payloads (e.g., `contactPayload`, `broadcastRequest`)
- Log with emoji prefixes for visual clarity (📱 QR, ✅ success, ❌ error, ⚠️ warning)
- Handle WebSocket connection state with mutex locks
- Use context for cancellation and timeouts

### WebSocket Message Types
Backend sends: `qr_code`, `authenticated`, `ready`, `contacts`, `broadcast_progress`, `broadcast_complete`, `chat_message`, `scheduled_messages`, `disconnected`, `error`

Frontend sends: `get_contacts`, `send_broadcast`, `send_chat`, `schedule_message`, `get_scheduled`, `logout`

## Database Schema
- `contacts`: WhatsApp contacts with phone, name, tags
- `chat_messages`: Message history with sender direction
- `broadcasts`: Broadcast campaigns with progress tracking
- `scheduled_messages`: Future scheduled messages
- `activity_logs`: System activity audit trail

## Environment Configuration
- Backend: `backend/.env` (ports, timeouts, WhatsApp settings)
- Frontend: `frontend/.env` (Supabase credentials)
- Never commit `.env` files or `data/` directory

## Key Patterns
- WebSocket reconnection with exponential backoff
- QR code caching for reconnecting clients
- Duplicate message detection in chat threads
- Graceful logout with session cleanup
- Real-time sync via both WebSocket and Supabase Realtime
