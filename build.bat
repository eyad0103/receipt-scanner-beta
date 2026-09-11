@echo off
title ReceiptFlow - Build
echo.
echo  Building ReceiptFlow...
echo.

cd /d "%~dp0"
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo  Build successful! Output in dist/
    echo.
) else (
    echo.
    echo  Build failed. Check errors above.
    echo.
)
pause
