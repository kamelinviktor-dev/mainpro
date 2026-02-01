@echo off
setlocal ENABLEDELAYEDEXPANSION
echo Starting MainPro (stable)...
cd /d "D:\Cursor 2025"

set PORT=5500
set URL=http://127.0.0.1:%PORT%/MAINPRO-MAIN.html

rem Kill any process listening on PORT (quietly)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

rem Small delay
timeout /t 1 /nobreak >nul

rem Start Node server in separate window (keeps logs visible)
start "MainPro Server" cmd /k "node simple-server.js"

rem Wait until port is open (max ~10s)
set /a tries=0
:wait_loop
set /a tries+=1
timeout /t 1 /nobreak >nul
netstat -ano | findstr LISTENING | findstr ":%PORT% " >nul 2>&1
if errorlevel 1 (
  if !tries! LSS 12 goto wait_loop
)

rem Open in Chrome if available, otherwise default browser
set "CHROME_X64=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CHROME_X86=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%CHROME_X64%" (
  start "" "%CHROME_X64%" "%URL%"
) else if exist "%CHROME_X86%" (
  start "" "%CHROME_X86%" "%URL%"
) else (
  start "" "%URL%"
)

echo Launched: %URL%
endlocal
exit /b 0


