#!/bin/bash

# Reset WhatsApp Session Script
# This script clears all WhatsApp session data to force a fresh QR code login

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║                                          ║"
echo "║    🔄 Reset WhatsApp Session 🔄         ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    print_info "Please run this script from the broadcasto root directory"
    exit 1
fi

# Check if data directory exists
if [ ! -d "backend/data" ]; then
    print_warning "No session data found (backend/data/ doesn't exist)"
    print_info "Nothing to reset. You can start the application normally."
    exit 0
fi

# Check if backend is running
BACKEND_PID=$(lsof -ti :3000 2>/dev/null || echo "")
if [ ! -z "$BACKEND_PID" ]; then
    print_warning "Backend is currently running (PID: $BACKEND_PID)"
    read -p "Do you want to stop it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $BACKEND_PID 2>/dev/null || true
        sleep 2
        print_success "Backend stopped"
    else
        print_error "Cannot reset session while backend is running"
        print_info "Please stop the backend first and run this script again"
        exit 1
    fi
fi

# Show current session data
print_info "Current session data:"
ls -lh backend/data/

echo ""
print_warning "⚠️  This will DELETE all WhatsApp session data!"
print_warning "⚠️  You will need to scan QR code again to login"
echo ""
read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Reset cancelled"
    exit 0
fi

# Backup session data (optional)
BACKUP_DIR="backend/data_backup_$(date +%Y%m%d_%H%M%S)"
print_info "Creating backup at: $BACKUP_DIR"
cp -r backend/data "$BACKUP_DIR"
print_success "Backup created"

# Delete session data
print_info "Deleting session data..."
rm -rf backend/data/*
print_success "Session data deleted"

# Verify deletion
if [ -z "$(ls -A backend/data 2>/dev/null)" ]; then
    print_success "Session reset complete!"
else
    print_error "Some files may still exist in backend/data/"
    ls -la backend/data/
fi

echo ""
print_success "🎉 WhatsApp session has been reset!"
echo ""
print_info "Next steps:"
echo "  1. Start the application: ./start.sh"
echo "  2. Open browser: http://localhost:5173"
echo "  3. Wait for QR code (5-10 seconds)"
echo "  4. Scan QR code with WhatsApp on your phone"
echo ""
print_info "To restore backup if needed:"
echo "  rm -rf backend/data"
echo "  cp -r $BACKUP_DIR backend/data"
echo ""
