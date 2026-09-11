@echo off
echo Starting OCR Microservice...
cd /d "%~dp0"
pip install -r requirements.txt >nul 2>&1
python main.py