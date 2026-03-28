#!/bin/bash
# POS + Workshop Management System — Production Starter

set -e

echo ""
echo " ============================================"
echo "  POS + Workshop Management System"
echo "  Starting production server..."
echo " ============================================"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo " [ERROR] Node.js is not installed!"
  echo " Download from: https://nodejs.org"
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo " [SETUP] Installing dependencies..."
  npm install
fi

# Build if needed
if [ ! -d ".next" ]; then
  echo " [BUILD] Building application..."
  npm run build
fi

# Start via production script (backup + migrate + start)
node scripts/start.js
