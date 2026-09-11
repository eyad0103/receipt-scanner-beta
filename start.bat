@echo off
title ReceiptFlow - Full Stack
echo Starting ReceiptFlow...

:: Kill old node processes
taskkill /F /IM node.exe >nul 2>&1

:: Start backend
echo Starting backend on port 3001...
start "ReceiptFlow Backend" cmd /c "cd /d %~dp0server && npx tsx src/index.ts"

:: Wait for backend
timeout /t 3 /nobreak >nul

:: Start frontend
echo Starting frontend on port 5173...
start "ReceiptFlow Frontend" cmd /c "cd /d %~dp0 && npx vite --host"

echo.
echo ============================================
echo   ReceiptFlow is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo ============================================
echo.
pause
