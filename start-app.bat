@echo off
title Test Case Generator

echo Starting Test Case Generator...
echo.

REM Start Express server in its own window
start "TCG - Server (port 3001)" cmd /k "cd /d %~dp0server && echo [SERVER] Starting... && node src/index.js"

REM Give the server a moment to bind before the client starts
timeout /t 2 /nobreak >nul

REM Start Vite dev server in its own window
start "TCG - Client (port 5173)" cmd /k "cd /d %~dp0client && echo [CLIENT] Starting Vite... && npm run dev"

echo.
echo Both processes launched in separate windows.
echo   Server  ^> http://localhost:3001/api/health
echo   Client  ^> http://localhost:5173
echo.
echo Run stop-app.bat to shut everything down.
pause
