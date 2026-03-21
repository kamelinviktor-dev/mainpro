/**
 * MainPro — recurrence / series engine (normalize, expansion, end rules, delete transforms).
 * Calendar refresh, drag/drop, and UI stay in CalendarLogic / mainpro-app.js.
 */

import { addDays, addMonths, toLocalISO } from './src/modules/utils.js';
import { RECUR_SAFE_CAP, RECUR_RANGE_BUFFER_DAYS } from './src/modules/constants.js';

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

export function mainProRecurringMatchEventId(e, sid) {
  return (
    String(e.id) === sid ||
    e.id == sid ||
    (e.extendedProps && (String(e.extendedProps.id) === sid || e.extendedProps.id == sid))
  );
}

/**
 * Apply series / occurrence / simple delete to the events list (same rules as mainpro-app deleteEvent).
 * Caller runs stripInstances + persistence. `toLocalISO` must be the same util as the app (e.g. from utils).
 */
export function mainProRecurringTransformListForDelete(list, { idStr, seriesScope, occurrenceStart, toLocalISO: toLocalISOFn }) {
  const matchId = mainProRecurringMatchEventId;
  const listArr = Array.isArray(list) ? list : [];
  const byId = listArr.find((e) => matchId(e, idStr));
  const eventToDelete =
    byId ||
    (idStr.includes('-')
      ? listArr.find(
          (e) =>
            e.seriesId != null &&
            (String(e.seriesId) === idStr.replace(/-?\d+$/, '') || e.seriesId == idStr.replace(/-?\d+$/, ''))
        )
      : null);
  const baseId = eventToDelete ? String(eventToDelete.id) : idStr;
  const sid = eventToDelete && eventToDelete.seriesId != null ? String(eventToDelete.seriesId) : '';
  const hasRecur = !!(
    eventToDelete &&
    eventToDelete.recur &&
    eventToDelete.recur.freq &&
    eventToDelete.recur.freq !== 'none'
  );
  const hasSeries = sid.length > 0;
  let next;
  if (seriesScope === 'all' && (hasSeries || hasRecur)) {
    next = listArr.filter(
      (e) =>
        String(e.id) !== baseId &&
        e.id != baseId &&
        (sid ? String(e.seriesId || '') !== sid && e.seriesId != sid : true)
    );
  } else if (seriesScope === 'one' && hasRecur) {
    let dateStr = '';
    const toLocalDate = (d) => (d && !isNaN(d.getTime()) ? toLocalISOFn(d).slice(0, 10) : '');
    if (occurrenceStart != null && occurrenceStart !== '') {
      if (typeof occurrenceStart === 'string') {
        const s = occurrenceStart.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) dateStr = s;
        else dateStr = toLocalDate(new Date(occurrenceStart));
      } else if (occurrenceStart instanceof Date) dateStr = toLocalDate(occurrenceStart);
      else dateStr = toLocalDate(new Date(occurrenceStart));
    }
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      next = listArr.map((e) => {
        if (String(e.id) !== baseId && e.id != baseId) return e;
        const prevEx = (e.recur?.exceptions || []).map((d) => String(d).slice(0, 10));
        const already = prevEx.includes(dateStr);
        const ex = already ? e.recur?.exceptions || [] : [...(e.recur?.exceptions || []), dateStr];
        return { ...e, recur: { ...(e.recur || {}), exceptions: ex } };
      });
    } else {
      next = listArr;
    }
  } else if (idStr.includes('-') && hasSeries && eventToDelete) {
    const seriesId = idStr.replace(/-?\d+$/, '');
    let dateStr = eventToDelete.start ? toLocalISOFn(new Date(eventToDelete.start)).slice(0, 10) : '';
    const fromId = idStr.split('-').slice(-3).join('-');
    if (!dateStr && /^\d{4}-\d{2}-\d{2}$/.test(fromId)) dateStr = fromId;
    if (dateStr) {
      next = listArr.map((e) => {
        const matchSeries =
          String(e.seriesId) === seriesId ||
          e.seriesId == seriesId ||
          String(e.id) === seriesId ||
          e.id == seriesId;
        if (matchSeries) {
          const ex = [...(e.recur?.exceptions || []), dateStr];
          return { ...e, recur: { ...(e.recur || {}), exceptions: ex } };
        }
        return e;
      });
    } else {
      next = listArr;
    }
  } else {
    next = listArr.filter((e) => !matchId(e, idStr));
    if (next.length === listArr.length) {
      const idx = listArr.findIndex((e) => matchId(e, idStr));
      if (idx >= 0) next = listArr.slice(0, idx).concat(listArr.slice(idx + 1));
    }
  }
  return next;
}
