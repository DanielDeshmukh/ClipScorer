@echo off
echo Stopping ClipScorer...

:: Kill by window title
taskkill /FI "WINDOWTITLE eq clipscore-backend*" /F /T 2>NUL
taskkill /FI "WINDOWTITLE eq clipscore-frontend*" /F /T 2>NUL

:: Also kill any stray processes on the ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>NUL
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F 2>NUL

echo Done.
