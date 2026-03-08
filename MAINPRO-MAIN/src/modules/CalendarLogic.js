/**
 * MainPro Calendar — recurrence, refreshCalendar, event handlers
 * STABILITY LOCK: recurrence-only changes
 */

import { addDays, addMonths, toLocalISO, statusColor } from './utils.js';
import { RECUR_SAFE_CAP, RECUR_RANGE_BUFFER_DAYS } from './constants.js';

/** Bases-only integrity: remove any instance events. */
export function stripInstances(list) {
  if (list == null) return [];
  return Array.isArray(list) ? list.filter((e) => !e || !e.isInstance) : [];
}

function lastDayOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Map old recur shape to new SaaS-grade shape. In-place safe; returns task. */
export function normalizeRecur(task) {
  if (!task || typeof task !== 'object') return task;
  const r = task.recur;
  if (!r || typeof r !== 'object') return task;
  const opts = task.recurOptions || {};
  const start = task.start ? new Date(task.start) : new Date();
  if (Number.isNaN(start.getTime())) return task;

  const freq = r.freq || 'none';
  if (freq === 'none') {
    task.recur = { freq: 'none', interval: 1, end: { type: 'never' }, exceptions: r.exceptions || [] };
    return task;
  }

  let interval = 1;
  let monthlyMode = 'dayOfMonth';
  let monthDay = start.getDate();
  let nth = 1;
  let weekday = (start.getDay() + 6) % 7 + 1;
  let byWeekday = [];

  if (opts.monthDay != null) monthDay = Math.min(31, Math.max(1, Number(opts.monthDay)));
  if (opts.nth != null) nth = opts.nth;
  if (opts.weekday != null) weekday = opts.weekday >= 1 && opts.weekday <= 7 ? opts.weekday : weekday;
  const rawWdays = Array.isArray(opts.wdays) ? opts.wdays : Array.isArray(r.byWeekday) ? r.byWeekday : [];
  byWeekday = rawWdays
    .map(function (w) {
      if (w >= 1 && w <= 7) return w;
      if (w === 0) return 7;
      return (w + 6) % 7 + 1;
    })
    .filter((v, i, a) => a.indexOf(v) === i);

  if (freq === 'weekly' || freq === 'biweekly') {
    interval = freq === 'biweekly' ? 2 : 1;
    if (!byWeekday.length) byWeekday = [weekday];
    task.recur = {
      freq: 'weekly',
      interval,
      byWeekday,
      end: endFromOld(r, start),
      exceptions: r.exceptions || []
    };
    return task;
  }
  if (freq === 'daily') {
    task.recur = {
      freq: 'daily',
      interval: 1,
      byWeekday: byWeekday.length ? byWeekday : [1, 2, 3, 4, 5, 6, 7],
      end: endFromOld(r, start),
      exceptions: r.exceptions || []
    };
    return task;
  }

  const monthFreqMap = {
    monthly: 1,
    bimonthly: 2,
    quarterly: 3,
    yearly: 12,
    every4months: 4,
    every9months: 9,
    every18months: 18,
    every2years: 24,
    every3years: 36
  };
  interval = monthFreqMap[freq] != null ? monthFreqMap[freq] : Number(r.interval) || 1;
  if (freq === 'custom' && opts.unit === 'month') interval = Math.max(1, Number(opts.interval) || 1);

  if (r.monthlyMode === 'nthWeekday' || r.monthlyMode === 'lastDay') {
    monthlyMode = r.monthlyMode;
    if (r.nth != null) nth = r.nth;
    if (r.weekday != null) weekday = r.weekday;
  } else if (r.monthlyMode === 'dayOfMonth' || opts.monthDay != null) {
    monthlyMode = 'dayOfMonth';
    monthDay = r.monthDay != null ? r.monthDay : opts.monthDay != null ? opts.monthDay : monthDay;
  }

  task.recur = {
    freq: 'monthly',
    interval,
    monthlyMode,
    monthDay: Math.min(31, Math.max(1, monthDay)),
    nth,
    weekday,
    end: endFromOld(r, start),
    exceptions: r.exceptions || []
  };
  return task;
}

function endFromOld(r, baseStart) {
  if (r.end && (r.end.type === 'count' || r.end.type === 'until')) return r.end;
  const until = r.repeatEndDate ? (r.repeatEndDate.slice ? r.repeatEndDate : null) : null;
  if (until) return { type: 'until', until: until.slice(0, 10) };
  const months = r.repeatEndMonths != null ? Number(r.repeatEndMonths) : null;
  if (months != null && months > 0) {
    const d = addMonths(baseStart, months);
    const y = d.getFullYear(),
      m = String(d.getMonth() + 1).padStart(2, '0'),
      day = String(d.getDate()).padStart(2, '0');
    return { type: 'until', until: `${y}-${m}-${day}` };
  }
  return { type: 'never' };
}

/** Generate occurrences only inside rangeStart..rangeEnd (+ buffer). Cap 800. */
export function generateOccurrences(baseTask, rangeStart, rangeEnd) {
  const base = { ...baseTask };
  normalizeRecur(base);
  const r = base.recur;
  if (!r || r.freq === 'none') return [];

  const baseStart = new Date(base.start);
  if (Number.isNaN(baseStart.getTime())) return [];

  const buf = RECUR_RANGE_BUFFER_DAYS * 24 * 60 * 60 * 1000;
  let start = new Date(rangeStart);
  let end = new Date(rangeEnd);
  if (Number.isNaN(start.getTime())) start = new Date(baseStart.getTime() - buf);
  if (Number.isNaN(end.getTime())) end = new Date(baseStart.getTime() + 366 * 24 * 60 * 60 * 1000);
  const rangeStartMs = Math.min(start.getTime(), baseStart.getTime()) - buf;
  const rangeEndMs = end.getTime() + buf;

  let endLimit = rangeEndMs;
  const endCfg = r.end || { type: 'never' };
  if (endCfg.type === 'until' && endCfg.until) {
    const untilMs = new Date(endCfg.until + 'T23:59:59').getTime();
    if (untilMs < endLimit) endLimit = untilMs;
  }
  const maxCount =
    endCfg.type === 'count' && typeof endCfg.count === 'number'
      ? Math.min(RECUR_SAFE_CAP, endCfg.count)
      : RECUR_SAFE_CAP;
  const exceptions = new Set((r.exceptions || []).map((d) => String(d).slice(0, 10)));

  const out = [];
  let count = 0;
  const seriesId = base.seriesId || base.id;

  function pushOne(d) {
    const dStr = toLocalISO(d).slice(0, 10);
    if (exceptions.has(dStr)) return;
    if (d.getTime() < rangeStartMs || d.getTime() > rangeEndMs) return;
    count++;
    if (count > maxCount) return;
    out.push({ ...base, id: `${seriesId}-${count}`, start: toLocalISO(d), isInstance: true });
  }

  if (r.freq === 'daily') {
    const byWeekday =
      Array.isArray(r.byWeekday) && r.byWeekday.length ? r.byWeekday : [1, 2, 3, 4, 5, 6, 7];
    let cursor = new Date(Math.max(baseStart.getTime(), rangeStartMs));
    cursor.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
    let iters = 0;
    while (cursor.getTime() <= endLimit && out.length < RECUR_SAFE_CAP && iters++ < 10000) {
      const w = (cursor.getDay() + 6) % 7 + 1;
      if (byWeekday.includes(w)) pushOne(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    if (iters >= 10000) console.warn('generateOccurrences: daily iteration cap reached', base.id);
    return out;
  }

  if (r.freq === 'weekly') {
    const fallbackWd = (baseStart.getDay() + 6) % 7 + 1;
    const byWeekday =
      Array.isArray(r.byWeekday) && r.byWeekday.length ? r.byWeekday : [fallbackWd];
    const interval = Math.max(1, Number(r.interval) || 1);
    let weekStart = new Date(baseStart);
    const baseWeekStart = new Date(weekStart);
    baseWeekStart.setDate(baseWeekStart.getDate() - ((baseWeekStart.getDay() + 6) % 7));
    let cursor = new Date(baseWeekStart.getTime());
    let iters = 0;
    while (cursor.getTime() <= endLimit && out.length < RECUR_SAFE_CAP && iters++ < 10000) {
      for (const wd of byWeekday) {
        const d = addDays(cursor, wd === 7 ? 6 : wd - 1);
        d.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
        if (d.getTime() >= baseStart.getTime() && d.getTime() <= endLimit) pushOne(d);
      }
      cursor = addDays(cursor, 7 * interval);
    }
    if (iters >= 10000) console.warn('generateOccurrences: weekly iteration cap reached', base.id);
    return out;
  }

  if (r.freq === 'monthly') {
    const interval = Math.max(1, Number(r.interval) || 1);
    const mode = r.monthlyMode || 'dayOfMonth';
    const monthDay = Math.min(31, Math.max(1, Number(r.monthDay) || baseStart.getDate()));
    const nth = r.nth != null ? r.nth : Math.min(4, Math.ceil(baseStart.getDate() / 7));
    const weekday =
      r.weekday >= 1 && r.weekday <= 7 ? r.weekday : (baseStart.getDay() + 6) % 7 + 1;

    let monthIndex = 0;
    let iters = 0;
    while (out.length < RECUR_SAFE_CAP && iters++ < 10000) {
      const next = addMonths(baseStart, monthIndex * interval);
      next.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      if (next.getTime() > endLimit) break;

      let target;
      if (mode === 'lastDay') {
        const last = lastDayOfMonth(next);
        target = new Date(
          next.getFullYear(),
          next.getMonth(),
          last,
          baseStart.getHours(),
          baseStart.getMinutes(),
          0,
          0
        );
      } else if (mode === 'nthWeekday') {
        target = nthWeekdayInMonth(next.getFullYear(), next.getMonth(), nth, weekday);
        target.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      } else {
        const last = lastDayOfMonth(next);
        const d = Math.min(monthDay, last);
        target = new Date(
          next.getFullYear(),
          next.getMonth(),
          d,
          baseStart.getHours(),
          baseStart.getMinutes(),
          0,
          0
        );
      }
      if (target.getTime() >= baseStart.getTime() && target.getTime() <= endLimit) pushOne(target);
      monthIndex++;
    }
    if (iters >= 10000) console.warn('generateOccurrences: monthly iteration cap reached', base.id);
    return out;
  }

  return out;
}

function nthWeekdayInMonth(year, month, nth, weekday) {
  const one = new Date(year, month, 1);
  const wOne = (one.getDay() + 6) % 7 + 1;
  let firstOcc = 1 + ((weekday - wOne + 7) % 7);
  if (firstOcc > 7) firstOcc -= 7;
  if (nth === -1) {
    const last = lastDayOfMonth(one);
    let d = last;
    while (d >= 1) {
      const dDate = new Date(year, month, d);
      if ((dDate.getDay() + 6) % 7 + 1 === weekday) return dDate;
      d--;
    }
    return new Date(year, month, firstOcc);
  }
  const d = firstOcc + (nth - 1) * 7;
  const last = lastDayOfMonth(one);
  const day = Math.min(d, last);
  return new Date(year, month, day);
}

export function generateSeries(base, freq, months, rangeEnd) {
  if (freq === 'none') return [];
  const baseStart = new Date(base.start);
  if (Number.isNaN(baseStart.getTime())) return [];
  const clone = {
    ...base,
    recur: {
      ...(base.recur || {}),
      freq,
      months: Number(months) || 12,
      repeatEndMonths: base.recur?.repeatEndMonths,
      repeatEndDate: base.recur?.repeatEndDate
    }
  };
  normalizeRecur(clone);
  const rangeEndDate =
    rangeEnd != null ? new Date(rangeEnd) : addMonths(baseStart, Math.max(1, Number(months) || 12));
  return generateOccurrences(clone, baseStart, rangeEndDate);
}

/**
 * Factory: returns refreshCalendar(list) that uses calRef, eventsRef, filter, search, categories, sortBy, computeNewStatus, setEvents.
 */
export function createRefreshCalendar(deps) {
  const {
    calRef,
    eventsRef,
    filter,
    search,
    categories,
    sortBy,
    computeNewStatus,
    setEvents
  } = deps;
  return function refreshCalendar(list) {
    const cal = calRef.current;
    if (!cal) return;
    const listToUse = list !== undefined ? list : (eventsRef.current || []);
    requestAnimationFrame(() => {
      let rangeStart, rangeEnd;
      try {
        const view = cal.getView();
        if (view && view.activeStart && view.activeEnd) {
          rangeStart = view.activeStart;
          rangeEnd = view.activeEnd;
        } else {
          const now = new Date();
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }
      } catch (_) {
        const now = new Date();
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
        rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      const baseList = Array.isArray(listToUse) ? listToUse.filter((e) => !e.isInstance) : [];
      const expanded = [];
      for (const e of baseList) {
        const recur = e.recur;
        if (!recur || recur.freq === 'none') {
          expanded.push(e);
        } else {
          expanded.push(...generateOccurrences({ ...e }, rangeStart, rangeEnd));
        }
      }

      let src = filter === 'all' ? expanded : expanded.filter((e) => e.status === filter);

      const q = (search || '').trim().toLowerCase();
      if (q) {
        src = src.filter((e) => {
          const catName = (categories.find((c) => c.id === e.catId)?.name) || '';
          return [e.title, e.taskType, e.location, e.notes, catName].some((v) =>
            (v || '').toLowerCase().includes(q)
          );
        });
      }
      if (sortBy !== 'none') {
        src = [...src].sort((a, b) => {
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
        });
      }

      const now = new Date();
      const eventsToAdd = src.map((e) => {
        let start = e.start;
        if (/^\d{4}-\d{2}-\d{2}$/.test(start)) start += 'T09:00';
        const status =
          (typeof computeNewStatus === 'function' ? computeNewStatus(e, now) : null) ||
          e.status ||
          'pending';
        const color = statusColor(status);
        let displayTitle = e.title || 'Untitled';
        if (displayTitle.length > 12) displayTitle = displayTitle.substring(0, 12) + '...';
        const priority = e.priority || 'normal';
        if (priority === 'high') displayTitle = '🔴 ' + displayTitle;
        else if (priority === 'low') displayTitle = '⬇️ ' + displayTitle;
        return {
          id: e.id,
          title: displayTitle,
          start,
          allDay: false,
          color,
          backgroundColor: color,
          borderColor: color,
          textColor: '#111827',
          extendedProps: { ...e, status }
        };
      });

      cal.removeAllEvents();
      eventsToAdd.forEach((event) => cal.addEvent(event));
    });
  };
}

/**
 * Factory: returns eventClick handler for FullCalendar.
 */
export function createEventClick(deps) {
  const { eventsRef, setEditEvent, todayISO } = deps;
  return function handleEventClick(info) {
    if (typeof window.hideTooltipGlobal === 'function') window.hideTooltipGlobal();
    const idStr = String(info.event.id);
    let src = eventsRef.current.find((e) => String(e.id) === idStr);
    if (!src && idStr.includes('-')) {
      const seriesId = idStr.replace(/-?\d+$/, '');
      src = eventsRef.current.find(
        (e) => !e.isInstance && e.seriesId && String(e.seriesId) === seriesId
      );
    }

    if (src && typeof window.openAddTaskModal === 'function') {
      const startStr = src.start || info.event.startStr;
      const endStr = src.end || info.event.endStr;
      const editPref = {
        ...src,
        id: src.id,
        mode: 'edit',
        title: src.title,
        date: startStr ? startStr.slice(0, 10) : (info.event.startStr ? info.event.startStr.slice(0, 10) : todayISO()),
        time: startStr ? startStr.slice(11, 16) : '',
        recur: src.recur,
        recurOptions: src.recurOptions,
        recurMonths: src.recur?.months,
        reminder: src.reminder,
        subtasks: src.subtasks,
        location: src.location,
        notes: src.notes,
        catId: src.catId,
        priority: src.priority,
        assignedTo: src.assignedTo,
        taskType: src.taskType,
        status: src.status,
        seriesId: src.seriesId,
        start: startStr,
        end: endStr
      };
      if (!editPref.time && startStr) {
        const startDate = new Date(startStr);
        if (!Number.isNaN(startDate.getTime())) {
          editPref.time = startDate.toISOString().slice(11, 16);
        }
      }
      window.openAddTaskModal(editPref);
    } else if (src) {
      setEditEvent({ ...src, _seriesScope: 'one' });
    }
  };
}

/**
 * Factory: returns eventDrop handler for FullCalendar.
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
 * Factory: returns eventResize handler for FullCalendar.
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

/** Returns getCalendarViewRange(calRef) for external use. */
export function createGetCalendarViewRange(calRef) {
  return function getCalendarViewRange() {
    const fallback = function () {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      if (window.mainproRecurDebug)
        console.warn('getCalendarViewRange: using fallback range', { start, end });
      return { start, end };
    };
    try {
      const cal = calRef.current;
      if (!cal) return fallback();
      const v = cal.getView();
      if (v && v.activeStart && v.activeEnd) return { start: v.activeStart, end: v.activeEnd };
      return fallback();
    } catch (_) {
      return fallback();
    }
  };
}
