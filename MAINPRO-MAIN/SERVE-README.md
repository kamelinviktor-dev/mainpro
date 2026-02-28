# MainPro Calendar — Static Server Setup

## Run from MAINPRO-MAIN folder (recommended)

```bash
cd MAINPRO-MAIN
npx serve . -s -l 5000
```

**Open in browser:**
- http://localhost:5000/MAINPRO-MAIN.html
- http://localhost:5000/ (index.html → iframe to MAINPRO-MAIN.html)

## Run from parent folder (d:\Cursor 2025\)

```bash
cd "d:\Cursor 2025"
npx serve . -s -l 5000
```

**Open in browser:**
- http://localhost:5000/MAINPRO-MAIN.html

## Boot log

In browser console (F12) you should see:
```
MainPro boot OK http://localhost:5000/MAINPRO-MAIN.html
```

If React or FullCalendar are missing, a warning will appear.
