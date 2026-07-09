@echo off
title Stop Test Case Generator

echo Stopping Test Case Generator...
echo.

REM Kill whatever is listening on port 3001 (Express server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo Killing server process PID %%a on port 3001...
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill whatever is listening on port 5173 (Vite dev server)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo Killing client process PID %%a on port 5173...
    taskkill /PID %%a /F >nul 2>&1
)

REM Close the named terminal windows launched by start-app.bat
taskkill /FI "WINDOWTITLE eq TCG - Server (port 3001)" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq TCG - Client (port 5173)" /F >nul 2>&1

echo.
echo Done. Both processes stopped.
pause
