# WhatsApp Broadcast Backend

Go-based WebSocket server for WhatsApp Web integration with Cloudflare RealtimeKit support.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
go mod download
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your settings (see Configuration section below).

### 3. Build & Run

```bash
# Build
go build -o backend main.go

# Run
./backend
```

Or run directly without building:

```bash
go run main.go
```

## ⚙️ Configuration

### Basic Configuration (`.env`)

```bash
# Server port (default: 3000)
PORT=3000

# Environment
NODE_ENV=development
```

### Cloudflare RealtimeKit (Optional)

For multi-client synchronization across devices:

```bash
# Enable RealtimeKit
ENABLE_REALTIMEKIT=true

# Get your API key from: https://dash.cloudflare.com/
# Navigate to: Workers & Pages > RealtimeKit
REALTIMEKIT_API_KEY=rtk_your_actual_api_key_here

# RealtimeKit API URL (usually don't need to change)
REALTIMEKIT_URL=https://api.realtime.cloudflare.com

# Channel name for synchronization
REALTIMEKIT_CHANNEL=broadcasto-sync
```

### WebSocket Configuration

```bash
# Timeout settings (in seconds)
WS_READ_TIMEOUT=60
WS_WRITE_TIMEOUT=15
CONNECT_RETRY_WAIT=5

# CORS - allowed origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

### Feature Flags

```bash
# Enable/disable features
ENABLE_AUTO_RECONNECT=true
ENABLE_SCHEDULING=true

# Scheduling check interval (seconds)
SCHEDULE_CHECK_INTERVAL=30
```

### WhatsApp Configuration

```bash
# Data directory for WhatsApp sessions
WHATSAPP_DATA_DIR=./data
```

### Logging

```bash
# Log level: DEBUG, INFO, WARN, ERROR
LOG_LEVEL=INFO

# Enable SQL query logging
ENABLE_SQL_LOGGING=false
```

## 🔐 Getting Cloudflare RealtimeKit API Key

1. **Sign up for Cloudflare** (if you haven't already)
   - Go to: https://dash.cloudflare.com/sign-up

2. **Navigate to RealtimeKit**
   - Dashboard > Account Home > Workers & Pages > RealtimeKit

3. **Create API Key**
   - Click "Create API Key" or "Generate Token"
   - Copy the token (format: `rtk_xxxxxxxxxxxxxxxx`)
   - Paste it in your `.env` file

4. **Set in Environment**
   ```bash
   REALTIMEKIT_API_KEY=rtk_your_copied_key_here
   ENABLE_REALTIMEKIT=true
   ```

## 📡 API Endpoints

### WebSocket Connection

Connect to: `ws://localhost:3000`

### Health Check

```bash
curl http://localhost:3000/healthz
# Response: ok
```

### Root Endpoint

```bash
curl http://localhost:3000
# Response: WhatsApp broadcast backend is running.
```

## 🔧 Development

### Running in Development Mode

```bash
# With hot reload (requires air)
go install github.com/cosmtrek/air@latest
air

# Or use go run
go run main.go
```

### Building for Production

```bash
# Build optimized binary
go build -ldflags="-s -w" -o backend main.go

# Run production build
./backend
```

## 📂 Project Structure

```
backend/
├── main.go              # Main application entry point
├── go.mod               # Go module dependencies
├── go.sum               # Dependency checksums
├── .env                 # Environment configuration (create from .env.example)
├── .env.example         # Environment template
├── backend              # Compiled executable
└── data/                # WhatsApp session storage (auto-created)
    └── whatsmeow.db     # SQLite database for sessions
```

## 🐛 Troubleshooting

### "database is locked" errors

**Fixed!** The backend now uses WAL (Write-Ahead Logging) mode for SQLite.

If you still see issues:
```bash
# Stop backend
# Delete old database
rm -rf data/
# Restart backend
./backend
```

### Port already in use

```bash
# Use different port
PORT=3001 ./backend
```

### RealtimeKit not working

1. Check API key format (should start with `rtk_`)
2. Ensure `ENABLE_REALTIMEKIT=true` in `.env`
3. Check network connectivity to Cloudflare
4. Verify API key is valid in Cloudflare dashboard

### Cannot connect to WhatsApp

1. Ensure frontend is running and connected to backend
2. Scan QR code from WhatsApp mobile app
3. Check that `data/` directory has proper permissions
4. Try deleting `data/` and rescanning QR

## 📊 Features

- ✅ **WhatsApp Web Integration** - Full WhatsApp Web protocol support
- ✅ **WebSocket Server** - Real-time bidirectional communication
- ✅ **Message Broadcasting** - Send to up to 256 contacts
- ✅ **Message Scheduling** - Schedule messages for later delivery
- ✅ **Contact Management** - Import and manage contacts
- ✅ **Session Persistence** - Auto-restore WhatsApp connection
- ✅ **SQLite WAL Mode** - No more database locking issues
- 🚧 **RealtimeKit Integration** - Multi-client sync (in development)

## 🔄 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | WebSocket server port |
| `REALTIMEKIT_API_KEY` | - | Cloudflare RealtimeKit API key |
| `REALTIMEKIT_URL` | `https://api.realtime.cloudflare.com` | RealtimeKit API endpoint |
| `REALTIMEKIT_CHANNEL` | `broadcasto-sync` | Sync channel name |
| `ENABLE_REALTIMEKIT` | `false` | Enable/disable RealtimeKit |
| `ENABLE_AUTO_RECONNECT` | `true` | Auto-reconnect to WhatsApp |
| `ENABLE_SCHEDULING` | `true` | Enable message scheduling |
| `SCHEDULE_CHECK_INTERVAL` | `30` | Scheduling check interval (seconds) |
| `WS_READ_TIMEOUT` | `60` | WebSocket read timeout (seconds) |
| `WS_WRITE_TIMEOUT` | `15` | WebSocket write timeout (seconds) |
| `CONNECT_RETRY_WAIT` | `5` | Connection retry wait (seconds) |
| `WHATSAPP_DATA_DIR` | `./data` | WhatsApp session data directory |
| `LOG_LEVEL` | `INFO` | Logging level |
| `NODE_ENV` | `development` | Environment mode |

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a pull request.

## 📞 Support

For issues or questions, please open a GitHub issue.
