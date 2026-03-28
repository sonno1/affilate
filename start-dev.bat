@echo off
echo ============================================
echo   AI Affiliate - Start Dev Servers
echo ============================================
echo.

REM --- Step 1: Pause Google Drive sync if running ---
echo [1/4] Temporarily pausing Google Drive sync...
taskkill /IM "googledrivesync.exe" /F >nul 2>&1
taskkill /IM "GoogleDriveFS.exe" /F >nul 2>&1
timeout /t 2 /nobreak >nul

REM --- Step 2: Frontend - npm install + dev ---
echo [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules\vite" (
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed. Try running as Administrator.
        pause
        exit /b 1
    )
)

echo [3/4] Starting frontend (Vite)...
start "Frontend - Vite" cmd /k "cd /d "%~dp0frontend" && npm run dev"

REM --- Step 3: Backend - pip install + uvicorn ---
echo [4/4] Starting backend (FastAPI)...
cd /d "%~dp0backend"
if not exist ".venv\Scripts\uvicorn.exe" (
    echo Installing Python dependencies...
    py -m venv .venv
    .venv\Scripts\pip.exe install -r requirements.txt
)

start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\uvicorn.exe main:app --reload --port 8000"

echo.
echo ============================================
echo   Servers starting...
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo ============================================
echo.
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
