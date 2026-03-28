@echo off
title POS + Workshop Management System
color 0A

echo.
echo  ============================================
echo   POS + Workshop Management System
echo   Starting production server...
echo  ============================================
echo.

:: Check if node is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] Node.js is not installed!
  echo  Download from: https://nodejs.org
  pause
  exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
  echo  [SETUP] Installing dependencies...
  call npm install
  if %errorlevel% neq 0 (
    echo  [ERROR] Failed to install dependencies
    pause
    exit /b 1
  )
)

:: Check if app is built
if not exist ".next" (
  echo  [BUILD] Building application for first run...
  call npm run build
  if %errorlevel% neq 0 (
    echo  [ERROR] Build failed. Check errors above.
    pause
    exit /b 1
  )
)

:: Start the production server (includes backup + migration + start)
node scripts\start.js

pause
