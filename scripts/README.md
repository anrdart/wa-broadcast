# Backend Infrastructure Scripts

## Overview

These scripts set up the multi-session WhatsApp infrastructure for Broadcasto.

## Prerequisites

- Docker and Docker Compose installed
- Supabase project with `session_pool` and `whatsapp_sessions` tables created
- Environment variables configured in `.env`

## Setup Steps

### 1. Start Docker Services

```bash
# From project root
docker-compose up -d
```

This starts:
- 5 WhatsApp API instances (ports 3001-3005)
- Nginx reverse proxy (port 3000)

### 2. Initialize Session Pool

Option A: Run SQL directly in Supabase SQL Editor
```sql
-- Copy contents of scripts/init-session-pool.sql
```

Option B: Run TypeScript script
```bash
npx tsx scripts/init-session-pool.ts
```

### 3. Verify Setup

Check Docker containers:
```bash
docker-compose ps
```

Check Nginx health:
```bash
curl http://localhost:3000/health
```

Test session routing:
```bash
# Route to port 3001
curl -H "X-Session-Port: 3001" http://localhost:3000/app/devices

# Route to port 3002
curl -H "X-Session-Port: 3002" http://localhost:3000/app/devices
```

## Architecture

```
Frontend → Nginx (port 3000) → WhatsApp API Instance (port 3001-3005)
                ↓
        X-Session-Port header determines routing
```

## Troubleshooting

### Container not starting
```bash
docker-compose logs whatsapp-api-1
```

### Pool not initialized
Check Supabase `session_pool` table has 5 records with status 'available'

### Routing not working
Verify Nginx config and check `X-Session-Port` header is being sent
