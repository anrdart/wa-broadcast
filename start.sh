#!/bin/bash

# Broadcasto Startup Script
# This script starts both backend and frontend services

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

# Function to cleanup on exit
cleanup() {
    print_info "Shutting down services..."

    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        print_info "Backend stopped (PID: $BACKEND_PID)"
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        print_info "Frontend stopped (PID: $FRONTEND_PID)"
    fi

    print_success "All services stopped"
    exit 0
}

# Trap Ctrl+C and other signals
trap cleanup SIGINT SIGTERM

# Check if required directories exist
if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found!"
    exit 1
fi

# Print banner
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║                                          ║"
echo "║        🚀 Broadcasto Launcher 🚀        ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Check if backend binary exists, if not build it
if [ ! -f "backend/backend" ]; then
    print_warning "Backend binary not found, building..."
    cd backend
    go build -o backend . || {
        print_error "Failed to build backend"
        exit 1
    }
    cd ..
    print_success "Backend built successfully"
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Frontend dependencies not found, installing..."
    cd frontend
    npm install || {
        print_error "Failed to install frontend dependencies"
        exit 1
    }
    cd ..
    print_success "Frontend dependencies installed"
fi

# Start Backend
print_info "Starting backend on port 3000..."
cd backend
./backend > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to initialize
sleep 2

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend failed to start. Check backend.log for details:"
    tail -20 backend.log
    exit 1
fi

print_success "Backend started (PID: $BACKEND_PID)"

# Start Frontend
print_info "Starting frontend on port 5173..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to initialize
sleep 3

# Check if frontend is still running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend failed to start. Check frontend.log for details:"
    tail -20 frontend.log
    cleanup
    exit 1
fi

print_success "Frontend started (PID: $FRONTEND_PID)"
echo ""
print_success "🎉 All services are running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📱 Frontend: http://localhost:5173"
echo "  🔌 Backend:  http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Press Ctrl+C to stop all services"
echo ""
print_info "Tailing logs (Ctrl+C to stop)..."
echo ""

# Tail both log files
tail -f backend.log frontend.log

# Wait for processes
wait
