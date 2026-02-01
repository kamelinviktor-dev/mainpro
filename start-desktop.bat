@echo off
echo Starting MAINPRO desktop launcher...
cd /d "D:\Cursor 2025"

rem Kill servers on common ports (ignore errors)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5502 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5500 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

rem Small delay
timeout /t 1 /nobreak >nul

rem Start a simple static server on 127.0.0.1:5502 (requires npx http-server)
start "MAINPRO Static Server" cmd /c "npx --yes http-server . -a 127.0.0.1 -p 5502 -c-1"

rem Give the server a moment to boot
timeout /t 2 /nobreak >nul

set "URL=http://127.0.0.1:5502/MAINPRO-MAIN.html"
set "CHROME_X64=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CHROME_X86=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

echo Opening MAINPRO in Chrome...
if exist "%CHROME_X64%" (
    start "" "%CHROME_X64%" "%URL%"
) else if exist "%CHROME_X86%" (
    start "" "%CHROME_X86%" "%URL%"
) else (
    start "" "%URL%"
)

echo MAINPRO launched at %URL%
exit /b 0


