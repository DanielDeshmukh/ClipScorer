@echo off
:: ClipScorer Launcher - use "start.cmd" to launch, "stop.cmd" to kill
:: This script stays alive and keeps services running.

set ROOT=%~dp0
set LOGDIR=%ROOT%logs
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

:: Check if already running
tasklist /FI "WINDOWTITLE eq clipscore-backend*" 2>NUL | find /I "python" >NUL
if %ERRORLEVEL% EQU 0 (
    echo Backend already running.
) else (
    echo Starting backend on port 8000...
    start "clipscore-backend" /MIN cmd /c "cd /d "%ROOT%" && python -m uvicorn engine.api:app --reload --host 127.0.0.1 --port 8000 --log-level info > "%LOGDIR%\backend.log" 2>&1"
)

:: Wait for backend
echo Waiting for backend...
set /a attempts=0
:waitbackend
curl -s http://localhost:8000/health >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
    set /a attempts+=1
    if %attempts% GEQ 60 (
        echo Backend failed to start. Check logs\backend.log
        goto :eof
    )
    timeout /t 1 /nobreak >NUL
    goto :waitbackend
)
echo Backend is UP.

:: Check if frontend already running
tasklist /FI "WINDOWTITLE eq clipscore-frontend*" 2>NUL | find /I "node" >NUL
if %ERRORLEVEL% EQU 0 (
    echo Frontend already running.
) else (
    echo Starting frontend on port 3000...
    start "clipscore-frontend" /MIN cmd /c "cd /d "%ROOT%" && npm run dev > "%LOGDIR%\frontend.log" 2>&1"
)

:: Wait for frontend
echo Waiting for frontend...
set /a attempts=0
:waitfrontend
curl -s -o NUL -w "" http://localhost:3000 >NUL 2>&1
if %ERRORLEVEL% NEQ 0 (
    set /a attempts+=1
    if %attempts% GEQ 120 (
        echo Frontend failed to start. Check logs\frontend.log
        goto :eof
    )
    timeout /t 1 /nobreak >NUL
    goto :waitfrontend
)
echo Frontend is UP.

echo.
echo ========================================
echo   ClipScorer is running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   Logs:     %LOGDIR%
echo   Stop:     stop.cmd
echo ========================================
