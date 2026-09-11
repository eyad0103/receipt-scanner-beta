@echo off
title ReceiptFlow - Full Stack + AI
echo.
echo  ============================================
echo   Starting ReceiptFlow (AI + App)
echo  ============================================
echo.

:: Kill old processes
taskkill /F /IM node.exe >nul 2>&1

:: 1. Start SmolVLM AI server (port 8000)
echo [1/4] Starting SmolVLM AI on port 8000...
start "SmolVLM AI" cmd /c "C:\Users\Eyad\receipt-scanner-demo\start-ai.bat"
timeout /t 3 /nobreak >nul

:: 2. Start OCR service (port 8001)
echo [2/4] Starting OCR service on port 8001...
start "OCR Service" cmd /c "cd /d %~dp0ocr-service && python main.py"
timeout /t 3 /nobreak >nul

:: 3. Start Node backend (port 3001)
echo [3/4] Starting backend on port 3001...
start "ReceiptFlow Backend" cmd /c "cd /d %~dp0server && npx tsx src/index.ts"
timeout /t 3 /nobreak >nul

:: 4. Start frontend (port 5173)
echo [4/4] Starting frontend on port 5173...
start "ReceiptFlow Frontend" cmd /c "cd /d %~dp0 && npx vite --host"

echo.
echo  ============================================
echo   ReceiptFlow is running!
echo  ============================================
echo   AI Model:    http://localhost:8000
echo   OCR Service: http://localhost:8001
echo   Backend:     http://localhost:3001
echo   Frontend:    http://localhost:5173
echo  ============================================
echo.
pause
