@echo off
title Train SmolVLM Receipt AI Model
echo.
echo ============================================
echo   SmolVLM Receipt Model Fine-Tuner
echo ============================================
echo.
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
set HF_HOME=F:/hf-cache
set HF_HUB_DISABLE_SYMLINKS_WARNING=1

python C:\Users\Eyad\receipt-scanner-demo\ocr-service\train_smolvlm.py
echo.
echo ============================================
echo   Training Completed!
echo ============================================
pause
