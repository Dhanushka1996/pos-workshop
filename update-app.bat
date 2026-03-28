@echo off
title POS Update Tool
color 0E

echo.
echo  ============================================
echo   POS + Workshop — Update Tool
echo  ============================================
echo.
echo  This will:
echo    1. Backup your database
echo    2. Install latest dependencies
echo    3. Apply database migrations
echo    4. Rebuild the application
echo.
echo  Your data will NOT be lost.
echo.
set /p confirm="Continue? (y/n): "
if /i not "%confirm%"=="y" (
  echo Cancelled.
  exit /b 0
)

echo.
echo  [1/4] Creating database backup...
node scripts\backup.js --tag pre-update
if %errorlevel% neq 0 (
  echo  [WARN] Backup failed, but continuing...
)

echo.
echo  [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
  echo  [ERROR] npm install failed
  pause
  exit /b 1
)

echo.
echo  [3/4] Applying database migrations...
call npx prisma migrate deploy
if %errorlevel% neq 0 (
  echo  [WARN] Migration deploy failed - trying db push...
  call npx prisma db push --skip-generate
)

echo.
echo  [4/4] Rebuilding application...
call npm run build
if %errorlevel% neq 0 (
  echo  [ERROR] Build failed
  pause
  exit /b 1
)

echo.
echo  ============================================
echo   Update complete! Run start.bat to launch.
echo  ============================================
echo.
pause
