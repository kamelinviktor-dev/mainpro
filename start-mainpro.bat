@echo off
cd /d "%~dp0"

echo Starting MainPro server...
start "MainPro Server" cmd /k "node serve-mainpro.js"

timeout /t 3 /nobreak >nul

echo Opening Chrome...
start chrome "http://127.0.0.1:3000/MAINPRO-MAIN.html"

echo Done. Close the server window to stop.
