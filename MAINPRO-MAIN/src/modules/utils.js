/**
 * MainPro Calendar — shared utilities
 * STABILITY LOCK: recurrence-only changes
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
