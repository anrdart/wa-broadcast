#!/bin/bash

# Broadcasto Diagnostic Script
# Comprehensive system check to diagnose issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Counters
ISSUES_FOUND=0
WARNINGS_FOUND=0

# Function to print colored messages
print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ISSUES_FOUND++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS_FOUND++))
}

print_check() {
    echo -e "${CYAN}🔍 $1${NC}"
}

# Banner
clear
echo ""
echo -e "${BOLD}${MAGENTA}"
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║   🔬 Broadcasto Diagnostic Tool 🔬          ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check 1: Directory Structure
print_header "1. Directory Structure"

if [ -d "backend" ]; then
    print_success "Backend directory exists"
else
    print_error "Backend directory NOT found!"
fi

if [ -d "frontend" ]; then
    print_success "Frontend directory exists"
else
    print_error "Frontend directory NOT found!"
fi

if [ -f "backend/backend" ]; then
    print_success "Backend binary exists"
else
    print_warning "Backend binary NOT found (needs building)"
fi

if [ -d "frontend/node_modules" ]; then
    print_success "Frontend dependencies installed"
else
    print_warning "Frontend dependencies NOT installed"
fi

# Check 2: Running Processes
print_header "2. Running Processes"

BACKEND_PID=$(lsof -ti :3000 2>/dev/null || echo "")
if [ ! -z "$BACKEND_PID" ]; then
    print_success "Backend is RUNNING on port 3000 (PID: $BACKEND_PID)"
    BACKEND_RUNNING=true
else
    print_error "Backend is NOT running on port 3000"
    BACKEND_RUNNING=false
fi

FRONTEND_PID=$(lsof -ti :5173 2>/dev/null || echo "")
if [ ! -z "$FRONTEND_PID" ]; then
    print_success "Frontend is RUNNING on port 5173 (PID: $FRONTEND_PID)"
    FRONTEND_RUNNING=true
else
    print_error "Frontend is NOT running on port 5173"
    FRONTEND_RUNNING=false
fi

# Check 3: Network Connectivity
print_header "3. Network Connectivity"

print_check "Testing localhost connectivity..."

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Backend HTTP endpoint reachable"
else
    print_warning "Backend HTTP endpoint not reachable"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    print_success "Frontend HTTP endpoint reachable"
else
    print_warning "Frontend HTTP endpoint not reachable"
fi

# Check 4: WebSocket Test
print_header "4. WebSocket Connection Test"

if [ "$BACKEND_RUNNING" = true ]; then
    print_check "Testing WebSocket connection to backend..."

    # Create a simple WebSocket test using websocat if available
    if command -v websocat &> /dev/null; then
        timeout 3 websocat ws://localhost:3000 < /dev/null > /tmp/ws_test.txt 2>&1 &
        sleep 2
        if grep -q "EOF" /tmp/ws_test.txt 2>/dev/null; then
            print_success "WebSocket connection successful"
        else
            print_warning "WebSocket test inconclusive (install 'websocat' for better testing)"
        fi
        rm -f /tmp/ws_test.txt
    else
        print_info "Install 'websocat' for WebSocket testing: brew install websocat"
    fi
else
    print_warning "Skipping WebSocket test (backend not running)"
fi

# Check 5: Session Data
print_header "5. WhatsApp Session Data"

if [ -d "backend/data" ]; then
    SESSION_FILES=$(ls -A backend/data 2>/dev/null | wc -l | tr -d ' ')
    if [ "$SESSION_FILES" -gt 0 ]; then
        print_warning "Session data EXISTS (${SESSION_FILES} files)"
        echo -e "   ${YELLOW}Files:${NC}"
        ls -lh backend/data/ | tail -n +2 | sed 's/^/   /'
        echo ""
        print_info "If experiencing issues, try: ./reset-session.sh"
    else
        print_success "No session data (fresh QR code will be generated)"
    fi
else
    print_info "No data directory (will be created on first run)"
fi

# Check 6: Environment Configuration
print_header "6. Environment Configuration"

if [ -f "backend/.env" ]; then
    print_success "Backend .env file exists"

    # Check key configurations
    if grep -q "WS_WRITE_TIMEOUT" backend/.env 2>/dev/null; then
        WS_TIMEOUT=$(grep "WS_WRITE_TIMEOUT" backend/.env | cut -d'=' -f2)
        print_info "WS_WRITE_TIMEOUT: ${WS_TIMEOUT}s"
    fi

    if grep -q "PORT" backend/.env 2>/dev/null; then
        PORT=$(grep "PORT" backend/.env | cut -d'=' -f2)
        print_info "Backend PORT: ${PORT}"
    fi
else
    print_warning "Backend .env file NOT found"
fi

# Check 7: Log Files
print_header "7. Recent Log Analysis"

if [ -f "backend.log" ]; then
    print_info "Analyzing backend.log..."

    # Check for QR code generation
    if grep -q "QR Code received" backend.log 2>/dev/null; then
        QR_COUNT=$(grep "QR Code received" backend.log | wc -l | tr -d ' ')
        print_success "QR code generated ${QR_COUNT} time(s)"
    else
        print_warning "No QR code generation found in logs"
    fi

    # Check for successful broadcasts
    if grep -q "Successfully sent 'qr_code'" backend.log 2>/dev/null; then
        print_success "QR code successfully sent to clients"
    else
        print_warning "No successful QR code broadcast found"
    fi

    # Check for errors
    ERROR_COUNT=$(grep -i "error\|failed" backend.log | tail -5 | wc -l | tr -d ' ')
    if [ "$ERROR_COUNT" -gt 0 ]; then
        print_warning "Recent errors found (${ERROR_COUNT}):"
        grep -i "error\|failed" backend.log | tail -5 | sed 's/^/   /'
    fi

    # Check for timeout errors
    if grep -q "i/o timeout" backend.log 2>/dev/null; then
        print_error "I/O timeout errors detected!"
        echo -e "   ${RED}This usually means:${NC}"
        echo "   - Frontend connected after backend tried to send data"
        echo "   - WebSocket write deadline expired"
        echo "   - Client connection is slow/unstable"
    fi
else
    print_info "No backend.log found (logs may be in terminal)"
fi

# Check 8: System Resources
print_header "8. System Resources"

# Check memory
MEM_USAGE=$(ps aux | grep -E "backend|vite" | grep -v grep | awk '{sum+=$4} END {print sum}')
if [ ! -z "$MEM_USAGE" ]; then
    print_info "Memory usage: ${MEM_USAGE}%"
fi

# Check open files
OPEN_FILES=$(lsof -p $BACKEND_PID 2>/dev/null | wc -l | tr -d ' ')
if [ ! -z "$OPEN_FILES" ] && [ "$OPEN_FILES" != "0" ]; then
    print_info "Backend open file descriptors: $OPEN_FILES"
fi

# Check 9: Browser Connection Test
print_header "9. Browser Connectivity"

if [ "$FRONTEND_RUNNING" = true ]; then
    print_check "Frontend is accessible at: http://localhost:5173"
    print_info "Open this URL in your browser and check:"
    echo "   1. DevTools Console (F12)"
    echo "   2. Look for 'WebSocket connected' message"
    echo "   3. Check Network tab for WebSocket connection"
else
    print_error "Frontend not running - cannot test browser connection"
fi

# Summary
print_header "Diagnostic Summary"

echo ""
if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    print_success "No issues found! System appears healthy."
elif [ $ISSUES_FOUND -eq 0 ]; then
    print_warning "Found ${WARNINGS_FOUND} warning(s) but no critical issues"
else
    print_error "Found ${ISSUES_FOUND} critical issue(s) and ${WARNINGS_FOUND} warning(s)"
fi

echo ""
print_header "Recommendations"
echo ""

if [ "$BACKEND_RUNNING" = false ]; then
    echo "   1. Start the backend:"
    echo "      cd backend && ./backend"
    echo ""
fi

if [ "$FRONTEND_RUNNING" = false ]; then
    echo "   2. Start the frontend:"
    echo "      cd frontend && npm run dev"
    echo ""
fi

if [ "$SESSION_FILES" -gt 0 ] && grep -q "i/o timeout" backend.log 2>/dev/null; then
    echo "   3. Reset WhatsApp session (recommended):"
    echo "      ./reset-session.sh"
    echo ""
fi

if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo "   ✓ Both services are running!"
    echo ""
    echo "   If QR code still not appearing:"
    echo ""
    echo "   A. Check browser console (F12):"
    echo "      - Should see: 'WebSocket connected'"
    echo "      - Check for error messages"
    echo ""
    echo "   B. Restart services in order:"
    echo "      1. Stop both services (Ctrl+C)"
    echo "      2. ./reset-session.sh"
    echo "      3. Start backend first: cd backend && ./backend"
    echo "      4. Wait 5 seconds"
    echo "      5. Start frontend: cd frontend && npm run dev"
    echo "      6. Open browser: http://localhost:5173"
    echo ""
    echo "   C. Monitor backend logs:"
    echo "      tail -f backend.log"
    echo "      Look for: '📱 QR Code received'"
    echo ""
fi

echo ""
print_header "Quick Fix Commands"
echo ""
echo "   # Full reset and restart:"
echo "   pkill -f backend; pkill -f vite"
echo "   ./reset-session.sh"
echo "   ./start.sh"
echo ""
echo "   # Just restart services:"
echo "   pkill -f backend; pkill -f vite"
echo "   ./start.sh"
echo ""
echo "   # Monitor logs:"
echo "   tail -f backend.log"
echo ""

print_header "End of Diagnostics"
echo ""

exit 0
