@echo off
cd /d "%~dp0"
echo MainPro local server (alternative to Live Server)
echo.
start /B node serve-mainpro.js
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:3000/MAINPRO-MAIN.html"
echo Open in browser: http://127.0.0.1:3000/MAINPRO-MAIN.html
echo.
echo Server is running. Close this window to stop.
pause
