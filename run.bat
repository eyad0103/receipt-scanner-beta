@echo off
title ReceiptFlow - Dev Server
echo.
echo  ================================
echo   ReceiptFlow Dev Server
echo  ================================
echo.
echo  Starting server...
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo  Installing dependencies...
    call npm install
    echo.
)

echo  Opening browser at http://localhost:5173
echo  Press Ctrl+C to stop the server
echo.

:: Start dev server and open browser
start "" "http://localhost:5173"
call npm run dev
