@echo off
echo Starting MainPro Live Server...
cd /d "D:\Cursor 2025"
start http://localhost:5500/index.htmlnew.html4.html
npx --yes live-server --port=5500 --host=localhost --open=/index.htmlnew.html4.html --no-browser
pause
