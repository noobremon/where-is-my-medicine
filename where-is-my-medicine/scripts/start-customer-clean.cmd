@echo off
setlocal

rem One-click runner for customer app with Metro cache clear

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%" >nul

echo [INFO] Starting customer app with cleared Metro cache...
npx expo start -c --workspace=apps/customer
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
exit /b %EXIT_CODE%
