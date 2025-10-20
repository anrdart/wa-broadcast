#!/bin/bash

# Broadcasto Backend Build Script
# This script properly builds the backend with all fixes

echo "🔨 Building Broadcasto Backend..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Clean old binary
if [ -f "backend" ]; then
    echo "🗑️  Removing old binary..."
    rm -f backend
fi

# Build new binary
echo "⚙️  Compiling Go code..."
go build -o backend main.go

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📋 To run the backend:"
    echo "   ./backend"
    echo ""
    echo "🌐 Backend will run on:"
    echo "   - WebSocket: ws://localhost:3000"
    echo "   - Health Check: http://localhost:3000/healthz"
    echo ""
else
    echo ""
    echo "❌ Build failed!"
    echo "Please check the error messages above."
    exit 1
fi
