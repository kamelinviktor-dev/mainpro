@echo off
echo Stopping any existing server on port 5500...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5500 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo Starting MainPro Live Server...
cd /d "D:\Cursor 2025"

echo Opening browser...
start http://localhost:5500/index.htmlnew.html4.html

echo Starting server...
npx --yes live-server --port=5500 --host=localhost --open=/index.htmlnew.html4.html --no-browser

pause

