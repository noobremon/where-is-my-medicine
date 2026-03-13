@echo off
setlocal enabledelayedexpansion

rem One-click runner for Firebase Functions on Node 18 (Windows + nvm-windows)

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%" >nul

where nvm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] nvm-windows is not installed or not on PATH.
  echo Install nvm-windows, reopen terminal, then run this script again.
  popd >nul
  exit /b 1
)

echo [INFO] Ensuring Node 18.20.4 is available...
nvm list | findstr /I "18.20.4" >nul
if errorlevel 1 (
  echo [INFO] Installing Node 18.20.4...
  nvm install 18.20.4
  if errorlevel 1 (
    echo [ERROR] Failed to install Node 18.20.4.
    popd >nul
    exit /b 1
  )
)

echo [INFO] Switching to Node 18.20.4...
nvm use 18.20.4
if errorlevel 1 (
  echo [ERROR] Failed to switch to Node 18.20.4.
  popd >nul
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set "NODE_VER=%%v"
echo [INFO] Active Node version: !NODE_VER!

cd /d "firebase\functions"
if errorlevel 1 (
  echo [ERROR] Could not enter firebase\functions.
  popd >nul
  exit /b 1
)

echo [INFO] Installing/updating function dependencies...
npm install
if errorlevel 1 (
  echo [ERROR] npm install failed in firebase\functions.
  popd >nul
  exit /b 1
)

echo [INFO] Starting Firebase Functions emulator...
npm run serve
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
exit /b %EXIT_CODE%
