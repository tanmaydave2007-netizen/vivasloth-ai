@echo off
setlocal
cd /d "%~dp0"
title VivaSloth AI
if not exist ".venv\Scripts\python.exe" (
  echo Run SETUP_ONCE.bat first.
  pause
  exit /b 1
)
if not exist ".env" (
  echo NOTE: .env file not found. The app will open, but AI requests need an OpenRouter API key.
  echo Read START_HERE_GUJARATI.md to configure the key.
  echo.
)
echo Opening VivaSloth AI. AI generation needs an internet connection.
start "" http://127.0.0.1:5000
".venv\Scripts\python.exe" app.py
pause
