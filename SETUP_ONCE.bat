@echo off
setlocal
cd /d "%~dp0"
echo =====================================
echo   VivaSloth AI - One-time setup
echo =====================================
echo.
where py >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3.11 or newer from https://www.python.org/downloads/ and enable Add Python to PATH.
  pause
  exit /b 1
)
if not exist ".venv\Scripts\python.exe" (
  echo Creating project environment...
  py -m venv .venv
  if errorlevel 1 (
    echo Could not create the virtual environment. Check your Python installation.
    pause
    exit /b 1
  )
)
echo Installing the small Python dependencies. Internet is required for this first setup.
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo Setup failed. Keep internet connected and run SETUP_ONCE.bat again.
  pause
  exit /b 1
)
echo.
echo Setup is complete. No local AI model or llama.cpp runtime is required.
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo A .env file was created. Paste your existing OpenRouter API key into it.
  notepad ".env"
)
echo.
echo Save .env, close Notepad, then double-click START_VIVASLOTH.bat.
echo For help, read START_HERE_GUJARATI.md.
pause
