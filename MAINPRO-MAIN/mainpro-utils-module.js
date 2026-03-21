/**
 * MainPro — shared utilities (date, formatting, ids/array helpers, toast, storage parse).
 * Feature logic stays in dedicated modules; this file is the single import surface for cross-cutting helpers.
 */

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function statusColor(s) {
  if (s === 'done') return '#22c55e';
  if (s === 'missed') return '#ef4444';
  if (s === 'pending') return '#eab308';
  return '#9ca3af'; // gray for 'none' or no status
}

export function formatAmPm(input) {
  if (!input) return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export const addDays = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

export const addMonths = (d, months) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

export const toLocalISO = (dt) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}T${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

/** Safe localStorage parser utility */
export function safeParse(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    console.warn('Corrupted localStorage key:', key);
    return fallback;
  }
}

/** Toast helper — requires #mp-toast in DOM */
export function showToast(msg) {
  try {
    const t = document.getElementById('mp-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('show'), 2200);
  } catch {}
}

/** Bases-only integrity: remove any instance events. */
export function stripInstances(list) {
  if (list == null) return [];
  return Array.isArray(list) ? list.filter((e) => !e || !e.isInstance) : [];
}

/** Parse YYYY-MM-DD to local Date at midday (DST-safe). */
export function mainProParseISODateLocalMidday(iso) {
  try {
    const parts = String(iso || '').slice(0, 10).split('-').map((n) => parseInt(n, 10));
    const y = parts[0] || new Date().getFullYear();
    const m = (parts[1] || 1) - 1;
    const d = parts[2] || 1;
    return new Date(y, m, d, 12, 0, 0, 0);
  } catch {
    return new Date();
  }
}

/** Calendar date → YYYY-MM-DD (UTC slice of local noon, same as legacy mpISO). */
export function mainProDateToISODate(d) {
  try {
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    return dd.toISOString().slice(0, 10);
  } catch {
    return todayISO();
  }
}

/** Event start time as HH:mm from ISO string, or ''. */
export function mainProEventStartTimeHHmm(ev) {
  const s = String(ev?.start || '');
  if (s.includes('T')) return s.slice(11, 16);
  return '';
}

/** Parse HH:mm to minutes from midnight; empty → 0. */
export function mainProTimeHHmmToMinutes(t) {
  try {
    if (!t) return 0;
    const hh = parseInt(String(t).slice(0, 2), 10) || 0;
    const mm = parseInt(String(t).slice(3, 5), 10) || 0;
    return hh * 60 + mm;
  } catch {
    return 0;
  }
}

/** Event end time as HH:mm from ISO string, or ''. */
export function mainProEventEndTimeHHmm(ev) {
  try {
    const end = String(ev?.end || '');
    if (end.includes('T')) return end.slice(11, 16);
  } catch {}
  return '';
}

/** Mark overlapping timed events with __conflict (agenda / list view). */
export function mainProAnnotateTimeSlotConflicts(items) {
  try {
    const list = Array.isArray(items) ? items : [];
    const out = list.map((ev) => ({ ...ev, __conflict: false }));
    const idxs = out
      .map((ev, idx) => ({ ev, idx }))
      .filter((x) => !!mainProEventStartTimeHHmm(x.ev))
      .sort(
        (a, b) =>
          mainProTimeHHmmToMinutes(mainProEventStartTimeHHmm(a.ev)) -
          mainProTimeHHmmToMinutes(mainProEventStartTimeHHmm(b.ev))
      );

    let conflicts = 0;
    let maxEnd = -1;
    let maxIdx = -1;
    idxs.forEach(({ ev, idx }) => {
      const st = mainProTimeHHmmToMinutes(mainProEventStartTimeHHmm(ev));
      let en = mainProTimeHHmmToMinutes(mainProEventEndTimeHHmm(ev));
      if (!en || en <= st) en = st + 60;

      if (st < maxEnd && maxIdx >= 0) {
        if (!out[idx].__conflict) {
          out[idx].__conflict = true;
          conflicts++;
        }
        if (!out[maxIdx].__conflict) {
          out[maxIdx].__conflict = true;
          conflicts++;
        }
      }
      if (en > maxEnd) {
        maxEnd = en;
        maxIdx = idx;
      }
    });
    return { items: out, conflicts };
  } catch {
    return { items: Array.isArray(items) ? items : [], conflicts: 0 };
  }
}
