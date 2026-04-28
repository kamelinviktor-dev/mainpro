MAINPRO STABILITY GUARD — RECURRENCE-ONLY MODE

DO NOT TOUCH (hard ban):
- index.html
- FullCalendar initialization (except recurrence range input for events callback)
- Calendar rendering logic (eventContent, eventDidMount, etc.)
- Event refetch logic (only recurrence range usage allowed)
- Filters / Search / Sorting
- Documents module
- Login / Settings / Auth
- Loader / Crash overlay
- Performance logic (unrelated to recurrence)
- CSS files
- Service worker
- Manifest
- Docs / reports
- Data storage engine (unless minimal schema for recur only)

ALLOWED FILES ONLY:
1) MAINPRO-MAIN/mainpro-app.js
2) MAINPRO-MAIN/mainpro-addtask-ui-v74.js
3) MAINPRO-MAIN/mainpro-taskmodal-v70.js
4) MAINPRO-MAIN/PROTECTION_GUARD/DO_NOT_TOUCH.md (this file)

STRICT RULE: If a change requires touching another file — STOP and request confirmation.
All changes must be: Minimal, Local, Isolated, Fully explained.
