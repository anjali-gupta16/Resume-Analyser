@echo off
echo ============================================
echo   ResumeAI — Backend Server
echo ============================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Python...
python --version
if errorlevel 1 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)

echo.
echo [2/3] Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting FastAPI server...
echo.
echo   API:  http://localhost:8000
echo   Docs: http://localhost:8000/docs
echo.
echo   Open index.html in your browser to use the app.
echo   Press Ctrl+C to stop the server.
echo.

uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
