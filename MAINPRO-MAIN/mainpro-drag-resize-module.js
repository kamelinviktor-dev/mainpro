/**
 * MainPro — FullCalendar eventDrop / eventResize (instance → exception + one-off, simple id move/resize).
 * Recurrence generation stays in mainpro-recurring-engine.js; refresh/click stay in CalendarLogic.js.
 */

/**
 * @param {{ eventsRef: React.MutableRefObject; setEvents: Function; stripInstances: (list: unknown[]) => unknown[]; settings: { autoStatusEnabled?: boolean }; runSmartStatusOnce?: () => void }} deps
 */
export function createEventDrop(deps) {
  const { eventsRef, setEvents, stripInstances, settings, runSmartStatusOnce } = deps;
  return function handleEventDrop(info) {
    const id = info.event.id;
    const idStr = String(id);
    const start = info.event.startStr?.slice(0, 16);
    const end = info.event.endStr?.slice(0, 16) || start;
    if (idStr.includes('-') && info.oldEvent && info.oldEvent.startStr) {
      const seriesId = idStr.replace(/-?\d+$/, '');
      const base = eventsRef.current.find(
        (e) => !e.isInstance && e.seriesId && String(e.seriesId) === seriesId
      );
      if (base) {
        const oldDate = info.oldEvent.startStr.slice(0, 10);
        const ex = [...(base.recur?.exceptions || []), oldDate];
        const oneOff = {
          ...base,
          id: Date.now(),
          seriesId: null,
          recur:
            base.recur && base.recur.freq && base.recur.freq !== 'none'
              ? { freq: 'none', interval: 1, end: { type: 'never' }, exceptions: [] }
              : base.recur || {},
          start,
          end,
          isInstance: false
        };
        setEvents((prev) => {
          const next = prev.map((e) =>
            e.id === base.id ? { ...e, recur: { ...(e.recur || {}), exceptions: ex } } : e
          );
          return stripInstances([...next, oneOff]);
        });
        if (typeof window.hideTooltipGlobal === 'function') window.hideTooltipGlobal();
        if (settings.autoStatusEnabled && runSmartStatusOnce) runSmartStatusOnce();
        return;
      }
    }
    setEvents((prev) => prev.map((e) => (String(e.id) === idStr ? { ...e, start, end } : e)));
    if (typeof window.hideTooltipGlobal === 'function') window.hideTooltipGlobal();
    if (settings.autoStatusEnabled && runSmartStatusOnce) runSmartStatusOnce();
  };
}

/**
 * @param {{ eventsRef: React.MutableRefObject; setEvents: Function; refreshCalendar: (list?: unknown) => void; settings?: { autoStatusEnabled?: boolean }; runSmartStatusOnce?: () => void }} deps
 */
export function createEventResize(deps) {
  const { eventsRef, setEvents, refreshCalendar } = deps;
  return function handleEventResize(info) {
    const id = info.event.id;
    const idStr = String(id);
    const start = info.event.startStr?.slice(0, 16);
    const end = info.event.endStr?.slice(0, 16) || start;
    if (idStr.includes('-')) {
      const seriesId = idStr.replace(/-?\d+$/, '');
      const base = eventsRef.current.find(
        (e) => !e.isInstance && e.seriesId && String(e.seriesId) === seriesId
      );
      if (base) {
        if (info.oldEvent && info.oldEvent.startStr) {
          const oldDate = info.oldEvent.startStr.slice(0, 10);
          const ex = [...(base.recur?.exceptions || []), oldDate];
          setEvents((prev) =>
            prev.map((e) =>
              e.id === base.id ? { ...e, recur: { ...(e.recur || {}), exceptions: ex } } : e
            )
          );
          eventsRef.current = eventsRef.current.map((e) =>
            e.id === base.id ? { ...e, recur: { ...(e.recur || {}), exceptions: ex } } : e
          );
        }
        refreshCalendar(eventsRef.current);
        if (typeof window.hideTooltipGlobal === 'function') window.hideTooltipGlobal();
        return;
      }
    }
    setEvents((prev) => prev.map((e) => (String(e.id) === idStr ? { ...e, start, end } : e)));
    if (typeof window.hideTooltipGlobal === 'function') window.hideTooltipGlobal();
    if (deps.settings?.autoStatusEnabled && deps.runSmartStatusOnce) deps.runSmartStatusOnce();
  };
}
