/**
 * MainPro — calendar filter tab, search filter, sort-by-status (and related sorts), effective status + smart status run.
 */

/** Human label for the All / Pending / Done / Missed tab (browser title, etc.). */
export function mainProFilterTabLabel(filter) {
  return filter === 'all'
    ? 'All'
    : filter === 'pending'
      ? 'Pending'
      : filter === 'done'
        ? 'Done'
        : filter === 'missed'
          ? 'Missed'
          : filter;
}

/** Same rules as legacy computeNewStatus: done frozen; past calendar day → missed; else pending. */
export function mainProComputeEffectiveStatus(e, now) {
  try {
    const dt = new Date(e.start);
    if (isNaN(dt.getTime())) return e.status || 'pending';
    if (e.status === 'done') return 'done';
    const eventDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (eventDay < todayStart) return 'missed';
    return 'pending';
  } catch {
    return e.status || 'pending';
  }
}

/**
 * One smart-status pass: update state + optionally patch FullCalendar event colors + toast.
 */
export function mainProRunSmartStatusOnce({
  setEvents,
  calRef,
  eventsRef,
  showToast,
  statusColor,
  computeEffectiveStatus = mainProComputeEffectiveStatus,
}) {
  const now = new Date();
  let changed = 0;
  setEvents((prev) => {
    const next = prev.map((ev) => {
      const ns = computeEffectiveStatus(ev, now);
      if (ns !== ev.status) {
        changed++;
        return { ...ev, status: ns };
      }
      return ev;
    });
    return next;
  });

  if (changed > 0) {
    try {
      const cal = calRef.current;
      if (cal) {
        cal.getEvents().forEach((fcEv) => {
          const src = eventsRef.current.find((e) => String(e.id) === String(fcEv.id));
          if (src) {
            const col = statusColor(src.status);
            fcEv.setProp('color', col);
            fcEv.setProp('backgroundColor', col);
            fcEv.setProp('borderColor', col);
            fcEv.setProp('textColor', '#111827');
          }
        });
      }
    } catch {}
    showToast(`Smart Status updated (${changed}) tasks.`);
  }
}

/** All vs status-tab filter on expanded (instances included) list. */
export function mainProFilterEventsByViewTab(expanded, filter) {
  return filter === 'all' ? expanded : expanded.filter((e) => e.status === filter);
}

/** FullCalendar list sort: title | priority | status | date | none. */
export function mainProCompareEventsForCalendarSort(a, b, sortBy) {
  if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
  if (sortBy === 'priority') {
    const priorityOrder = { high: 3, medium: 2, normal: 2, low: 1 };
    return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
  }
  if (sortBy === 'status') {
    const statusOrder = { done: 3, pending: 2, missed: 1, none: 0 };
    return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
  }
  if (sortBy === 'date') return new Date(a.start || 0) - new Date(b.start || 0);
  return 0;
}

/** Text search over title, type, location, notes, category name. */
export function mainProSearchFilterExpandedEvents(src, search, categories) {
  const q = (search || '').trim().toLowerCase();
  if (!q) return src;
  return src.filter((e) => {
    const catName = (categories.find((c) => c.id === e.catId)?.name) || '';
    return [e.title, e.taskType, e.location, e.notes, catName].some((v) =>
      (v || '').toLowerCase().includes(q)
    );
  });
}

export function mainProAttachEffectiveStatuses(events, now, computeEffectiveStatus) {
  const fn =
    typeof computeEffectiveStatus === 'function' ? computeEffectiveStatus : (e) => e.status;
  return events.map((e) => ({
    ...e,
    effectiveStatus: (fn(e, now) || e.status || 'pending'),
  }));
}

export function mainProCountEffectiveStatusInView(withStatus) {
  return {
    total: withStatus.length,
    done: withStatus.filter((e) => e.effectiveStatus === 'done').length,
    pending: withStatus.filter((e) => e.effectiveStatus === 'pending').length,
    missed: withStatus.filter((e) => e.effectiveStatus === 'missed').length,
  };
}
