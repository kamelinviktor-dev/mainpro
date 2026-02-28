# FullCalendar Lifecycle Audit — MainPro Calendar

**Mode:** ANALYSIS ONLY — NO CODE CHANGES  
**Date:** 2025-02-17

---

## 1) Where FullCalendar is Created

| Location | File | Function / Context | Line |
|----------|------|-------------------|------|
| **Single creation point** | `mainpro-app.js` | Inside `useEffect` (empty deps `[]`) in MainPro component | 477–866 |

**Details:**
- `const cal = new FC.Calendar(el, {...})` where `el = document.getElementById('calendar')`
- `cal.render()` at line 843
- `calRef.current = cal` at line 845
- No cleanup function returned from the effect (no `destroy()` on unmount)

---

## 2) Multiple "new FullCalendar.Calendar(...)" Calls?

**No.** There is exactly **one** creation call in the app lifecycle:
- `mainpro-app.js` line 481: `new FC.Calendar(el, {...})`

**Other references:**
- `mainpro-addtask-ui-v74.js` line 993: `window.calRef.current.render()` — calls `render()` on the **existing** instance, does not create a new one.
- `mainpro-app.js` line 13998: `window.__mainproReactRoot.render(React.createElement(window.MainPro))` — React root render, not FullCalendar.

---

## 3) UI Actions → What Runs

### 3.1 Switching Views (Month / Week / Day / List)

| Action | Function | Method Used |
|--------|----------|-------------|
| Month / Week / Day buttons | `setView(v)` | `calRef.current?.changeView(view)` via `useEffect` at line 870 |
| List button | `setShowList(true)` | Opens modal; FullCalendar stays as-is |

**Conclusion:** Uses `changeView()` — **no destroy/re-init**.

---

### 3.2 Changing Filters (all / pending / done / missed)

| Action | Function | Method Used |
|--------|----------|-------------|
| Filter buttons | `setFilter(s)` | Triggers `useEffect` at 922–949 → `refreshCalendar(events)` |

**refreshCalendar (lines 1891–1968):**
```text
cal.removeAllEvents()
→ filter by status
→ filter by search
→ sort
→ cal.addEvent(...) for each event
```

**Conclusion:** Uses `removeAllEvents()` + `addEvent()` — **no destroy/re-init**.

---

### 3.3 Changing Sorting (Newest / Oldest / Title / etc.)

| Action | Function | Method Used |
|--------|----------|-------------|
| Sort dropdown | `setSortBy(v)` | Same `useEffect` at 922–949 → `refreshCalendar(events)` |

**Conclusion:** Same as filters — `removeAllEvents()` + `addEvent()` — **no destroy/re-init**.

---

### 3.4 Changing Active Calendar (mainpro_calendar_${id})

| Action | Function | Method Used |
|--------|----------|-------------|
| Calendar selector | `switchCalendar(calendarId)` | `setCurrentCalendarId` + `setEvents(newEvents)` |

**Flow:**
1. `switchCalendar` (lines 1830 or 3115) loads events from `mainpro_calendar_${calendarId}`
2. `setEvents(newEvents)` triggers `useEffect` at 922–949
3. Effect calls `refreshCalendar(events)` → `removeAllEvents()` + `addEvent()`

**Conclusion:** Uses `removeAllEvents()` + `addEvent()` — **no destroy/re-init**.

---

## 4) Risk Assessment

### 4.1 If Re-init Happened (it does NOT)

Risks would include:
- Listener buildup (datesSet, eventClick, eventDrop, eventResize, eventDidMount, etc.)
- Memory leaks (old instance not destroyed)
- UI glitches (DOM replacement, scroll reset, focus loss)
- Stale closures in callbacks

### 4.2 Current Implementation (No Re-init)

**Safe:**
- Single FullCalendar instance for the app lifetime
- View changes via `changeView()`
- Data changes via `removeAllEvents()` + `addEvent()`

**Minor gaps:**
1. **No cleanup on unmount:** The calendar `useEffect` has no `return () => cal.destroy()`. If MainPro ever unmounts (e.g. error recovery, future routing), the instance would not be destroyed. Low risk in current usage (no routing, single main view).
2. **eventDidMount listeners:** Each event gets `mouseenter`, `mouseleave`, `mousedown`, `click` listeners. These are on DOM nodes managed by FullCalendar; when `removeAllEvents()` runs, those nodes are removed, so listeners are released. No buildup.
3. **addEventSource / removeEventSource:** Not used. The app uses imperative `addEvent()` / `removeAllEvents()` instead. Both are valid; current approach is fine.

---

## 5) Minimal Safe Recommendation (NO CODE)

1. **Keep current approach:** Prefer `changeView()`, `removeAllEvents()`, `addEvent()` for view/filter/sort/calendar changes. Do **not** introduce `destroy()` + re-init for these flows.

2. **Optional improvement:** Add a cleanup to the calendar `useEffect`:
   - `return () => { try { calRef.current?.destroy(); } catch {} }`
   - Only needed if MainPro ever unmounts (e.g. error boundaries, future SPA routing).

3. **Avoid:** Do not use `destroy()` + `new Calendar()` for normal UI actions (view, filter, sort, calendar switch). The current pattern is correct.

4. **External scripts:** `mainpro-addtask-ui-v74.js` and `mainpro-taskmodal-v70.js` correctly use `calRef.current.addEvent()` / `refreshCalendar()` — no changes needed.

---

## Summary Table

| UI Action | Method | Re-init? |
|-----------|--------|----------|
| View (Month/Week/Day) | `changeView()` | No |
| Filter (all/pending/done/missed) | `removeAllEvents()` + `addEvent()` | No |
| Sort | `removeAllEvents()` + `addEvent()` | No |
| Calendar switch | `removeAllEvents()` + `addEvent()` | No |
| Clear All | `removeAllEvents()` | No |

**FullCalendar is created once and never destroyed during normal app usage.**
