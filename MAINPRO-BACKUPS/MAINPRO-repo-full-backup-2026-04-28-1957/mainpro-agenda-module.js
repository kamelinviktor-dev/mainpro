/**
 * MainPro — List / Agenda view: filter events, build grouped day data, modal UI (no calendar engine / recurrence).
 */

import {
  mainProParseISODateLocalMidday,
  mainProDateToISODate,
  mainProEventStartTimeHHmm,
  mainProTimeHHmmToMinutes,
  mainProAnnotateTimeSlotConflicts,
} from './mainpro-utils-module.js';

/** Same rules as legacy mpFilterSearch: status tab + text search on title/type/location/notes/category name. */
export function mainProListFilterEvents(events, filter, search, categories) {
  let src = Array.isArray(events) ? events : [];
  src = filter === 'all' ? src : src.filter((e) => (e.status || 'pending') === filter);
  const q = (search || '').trim().toLowerCase();
  if (q) {
    src = src.filter((e) => {
      const catName = (categories.find((c) => c.id === e.catId)?.name) || '';
      return [e.title, e.taskType, e.location, e.notes, catName].some((v) =>
        (v || '').toLowerCase().includes(q)
      );
    });
  }
  return src;
}

/**
 * Build agenda structure for day or week range (Monday-start week).
 * @returns {{ startISO: string, endISO: string, rangeLabel: string, days: Array<{iso,label,items,conflicts}>, total: number, conflictsTotal: number }}
 */
export function mainProBuildAgendaData({
  events,
  listAnchorDate,
  listRange,
  filter,
  search,
  categories,
}) {
  try {
    const anchor = mainProParseISODateLocalMidday(listAnchorDate);
    let start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12, 0, 0, 0);
    let daysCount = 1;
    if (listRange === 'week') {
      const dow = start.getDay();
      const diff = (dow + 6) % 7;
      start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - diff, 12, 0, 0, 0);
      daysCount = 7;
    }
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + daysCount, 12, 0, 0, 0);
    const startISO = mainProDateToISODate(start);
    const endISO = mainProDateToISODate(end);

    const base = mainProListFilterEvents(events, filter, search, categories);
    const inRange = base.filter((ev) => {
      const d = String(ev?.start || '').slice(0, 10);
      if (!d) return false;
      return d >= startISO && d < endISO;
    });

    const byDay = new Map();
    inRange.forEach((ev) => {
      const d = String(ev?.start || '').slice(0, 10);
      if (!d) return;
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(ev);
    });

    const days = [];
    let conflictsTotal = 0;
    for (let i = 0; i < daysCount; i++) {
      const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0, 0);
      const iso = mainProDateToISODate(dt);
      const label = dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const itemsSorted = (byDay.get(iso) || []).slice().sort((a, b) => {
        const ta = mainProTimeHHmmToMinutes(mainProEventStartTimeHHmm(a));
        const tb = mainProTimeHHmmToMinutes(mainProEventStartTimeHHmm(b));
        if (ta !== tb) return ta - tb;
        return String(a.title || '').localeCompare(String(b.title || ''));
      });
      const ann = mainProAnnotateTimeSlotConflicts(itemsSorted);
      conflictsTotal += Number(ann.conflicts || 0);
      days.push({ iso, label, items: ann.items, conflicts: ann.conflicts || 0 });
    }

    const rangeLabel =
      listRange === 'week'
        ? `${days[0]?.label || startISO} – ${days[days.length - 1]?.label || ''}`
        : `${days[0]?.label || startISO}`;

    return { startISO, endISO, rangeLabel, days, total: inRange.length, conflictsTotal };
  } catch {
    return { startISO: '', endISO: '', rangeLabel: '', days: [], total: 0, conflictsTotal: 0 };
  }
}

/** Category label for list row (matches legacy inline logic). */
export function mainProAgendaResolveCategoryName(ev, categories) {
  let catName =
    typeof window !== 'undefined' && typeof window.getCategoryDisplayName === 'function'
      ? window.getCategoryDisplayName(ev.catId || ev.category || 'maintenance')
      : (() => {
          const c = categories.find(
            (cat) =>
              cat &&
              (cat.id === ev.catId ||
                (cat.name &&
                  String(cat.name).toLowerCase() === String(ev.catId || '').toLowerCase()))
          );
          return c && c.name ? c.name : ev.catId && ev.catId !== 'other' ? String(ev.catId) : 'Other';
        })();
  if (catName == null || catName === undefined || String(catName).trim() === '') catName = 'Other';
  return catName;
}

/** Sync list anchor + range from current calendar view, then open list (header 📄 List button). */
export function mainProAgendaOpenFromCalendarToolbar({
  calRef,
  view,
  setListAnchorDate,
  setListRange,
  setShowList,
  showToast,
}) {
  try {
    const dt = new Date(calRef.current?.getDate() || Date.now());
    const iso = dt.toISOString().slice(0, 10);
    setListAnchorDate(iso);
  } catch {}
  try {
    const v = String(view || '');
    setListRange(v === 'timeGridWeek' ? 'week' : 'day');
  } catch {}
  setShowList(true);
  try {
    showToast('📄 List');
  } catch {}
}

/**
 * Full List / Agenda modal overlay + content (caller wraps with `showList &&` if desired).
 */
export function mainProRenderAgendaListModal(React, deps) {
  const {
    mpCloseWithAnim,
    setShowList,
    agendaData,
    listRange,
    setListRange,
    listAnchorDate,
    setListAnchorDate,
    todayISO,
    showToast,
    filter,
    search,
    ui,
    calRef,
    categories,
    statusColor,
    setEditEvent,
    setEvents,
    eventsRef,
    mainProRemoveEventByIdString,
  } = deps;

  return React.createElement(
    'div',
    {
      className: 'fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-3 sm:p-6 mp-overlay-anim',
      'data-mp-overlay': '1',
      onClick: (e) => {
        if (e.target === e.currentTarget) mpCloseWithAnim(() => setShowList(false), e);
      },
    },
    React.createElement(
      'div',
      {
        className:
          'modal-enter modal-ready bg-white dark:bg-gray-800 w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl p-0 shadow-2xl flex flex-col',
        'data-mp-modal': '1',
        style: { borderTop: '4px solid', borderTopColor: '#f59e0b', maxHeight: '80vh' },
      },
      React.createElement(
        'div',
        {
          className: 'px-5 py-4 border-b flex items-center justify-between flex-shrink-0',
          style: {
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            borderBottom: '2px solid #f59e0b',
          },
        },
        React.createElement(
          'div',
          { className: 'flex items-center gap-3 min-w-0' },
          React.createElement('div', { className: 'text-lg font-semibold', style: { color: '#92400e' } }, '📄 List'),
          React.createElement(
            'div',
            { className: 'text-sm text-amber-900/80 hidden sm:block truncate' },
            agendaData.rangeLabel ? `• ${agendaData.rangeLabel}` : null
          ),
          React.createElement(
            'div',
            { className: 'text-xs text-amber-900/70 hidden sm:block' },
            agendaData.total ? `(${agendaData.total})` : null
          ),
          agendaData.conflictsTotal > 0 &&
            React.createElement(
              'div',
              {
                className:
                  'text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 tooltip-bottom',
                'data-tooltip': 'Tasks that overlap by time',
              },
              `⚠ Conflicts: ${agendaData.conflictsTotal}`
            )
        ),
        React.createElement(
          'button',
          {
            onClick: (e) => mpCloseWithAnim(() => setShowList(false), e),
            className:
              'text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom',
            'data-tooltip': 'Close',
          },
          '✕'
        )
      ),
      React.createElement(
        'div',
        { className: 'p-5 overflow-y-auto', style: { background: '#fffbeb' } },
        React.createElement(
          'div',
          { className: 'flex flex-wrap items-center gap-2 mb-4' },
          React.createElement(
            'div',
            { className: 'bg-white border border-amber-200 rounded-lg p-1 flex gap-1' },
            React.createElement(
              'button',
              {
                onClick: () => setListRange('day'),
                className: `px-3 py-1 rounded text-sm ${listRange === 'day' ? 'text-white' : 'hover:bg-amber-50'}`,
                style: listRange === 'day' ? { background: ui.primary } : {},
              },
              'Day'
            ),
            React.createElement(
              'button',
              {
                onClick: () => setListRange('week'),
                className: `px-3 py-1 rounded text-sm ${listRange === 'week' ? 'text-white' : 'hover:bg-amber-50'}`,
                style: listRange === 'week' ? { background: ui.primary } : {},
              },
              'Week'
            )
          ),
          React.createElement('input', {
            type: 'date',
            value: listAnchorDate,
            onChange: (e) => {
              try {
                setListAnchorDate(String(e.target.value || ''));
              } catch {}
            },
            className: 'border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white',
          }),
          React.createElement(
            'button',
            {
              onClick: () => {
                try {
                  setListAnchorDate(
                    typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0, 10)
                  );
                } catch {}
                try {
                  showToast('⌂ Today');
                } catch {}
              },
              className:
                'px-3 py-1.5 rounded-lg text-sm bg-white border border-amber-200 hover:bg-amber-100 text-amber-800',
            },
            '⌂ Today'
          ),
          React.createElement('div', { className: 'flex-1' }),
          React.createElement(
            'div',
            { className: 'text-xs text-gray-500' },
            `Filter: ${filter} • Search: ${(search || '').trim() ? 'on' : 'off'}`
          )
        ),
        agendaData.days && agendaData.days.length
          ? agendaData.days.map((day) =>
              React.createElement(
                'div',
                { key: day.iso, className: 'mb-4' },
                React.createElement(
                  'div',
                  { className: 'flex items-center justify-between mb-2' },
                  React.createElement(
                    'button',
                    {
                      onClick: () => {
                        try {
                          const dt = mainProParseISODateLocalMidday(day.iso);
                          calRef.current?.gotoDate(dt);
                          showToast(`📅 ${day.label}`);
                        } catch {}
                      },
                      className: 'text-sm font-semibold text-gray-800 hover:underline',
                    },
                    `${day.label}`
                  ),
                  React.createElement(
                    'div',
                    { className: 'text-xs text-gray-500' },
                    `${(day.items || []).length} tasks`
                  )
                ),
                day.items && day.items.length
                  ? React.createElement(
                      'div',
                      { className: 'space-y-2' },
                      day.items.map((ev) => {
                        const idStr = String(ev?.id || '');
                        const t = mainProEventStartTimeHHmm(ev);
                        const st = String(ev?.status || 'pending');
                        const pri = String(ev?.priority || 'normal');
                        const catName = mainProAgendaResolveCategoryName(ev, categories);
                        const color =
                          typeof statusColor === 'function' ? statusColor(st) : '#60a5fa';
                        return React.createElement(
                          'div',
                          {
                            key: `${day.iso}_${idStr}`,
                            className:
                              'bg-white border border-amber-200 rounded-xl px-3 py-3 flex items-start gap-3',
                          },
                          React.createElement(
                            'div',
                            { className: 'w-16 flex-shrink-0' },
                            React.createElement(
                              'div',
                              { className: 'text-sm font-semibold text-gray-900 flex items-center gap-1' },
                              t || 'All',
                              !!ev.__conflict &&
                                React.createElement(
                                  'span',
                                  {
                                    className:
                                      'text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 tooltip-bottom',
                                    'data-tooltip': 'Overlaps with another task',
                                  },
                                  '⚠'
                                )
                            ),
                            React.createElement(
                              'div',
                              { className: 'text-[11px] text-gray-500' },
                              pri === 'high' ? 'high' : pri === 'low' ? 'low' : ''
                            )
                          ),
                          React.createElement(
                            'div',
                            { className: 'min-w-0 flex-1' },
                            React.createElement(
                              'div',
                              { className: 'flex items-center gap-2 min-w-0' },
                              React.createElement(
                                'div',
                                { className: 'font-semibold text-gray-900 truncate' },
                                ev.title || 'Untitled'
                              ),
                              React.createElement(
                                'span',
                                {
                                  className: 'text-[11px] px-2 py-0.5 rounded-full text-white',
                                  style: { background: color },
                                },
                                st
                              ),
                              (() => {
                                const a = Array.isArray(ev?.attachments) ? ev.attachments : [];
                                const n = a.filter((x) => x?.docId || x?.id || x?.name).length;
                                return n > 0
                                  ? React.createElement(
                                      'span',
                                      {
                                        className:
                                          'mp-attach-ind text-gray-600 dark:text-gray-400 flex-shrink-0',
                                      },
                                      `📎 ${n}`
                                    )
                                  : null;
                              })()
                            ),
                            React.createElement(
                              'div',
                              { className: 'text-xs text-gray-600 mt-1 truncate' },
                              `${catName}${ev.taskType ? ` • ${ev.taskType}` : ''}${
                                ev.location ? ` • ${ev.location}` : ''
                              }`
                            )
                          ),
                          React.createElement(
                            'div',
                            { className: 'flex items-center gap-2 flex-shrink-0' },
                            React.createElement(
                              'button',
                              {
                                onClick: () => {
                                  try {
                                    setShowList(false);
                                  } catch {}
                                  try {
                                    const startStr = String(ev.start || '');
                                    if (typeof window.openAddTaskModal === 'function') {
                                      window.openAddTaskModal({
                                        ...ev,
                                        id: ev.id,
                                        mode: 'edit',
                                        date: startStr ? startStr.slice(0, 10) : day.iso,
                                        time: startStr.includes('T') ? startStr.slice(11, 16) : '',
                                        start: ev.start,
                                        end: ev.end,
                                        catId: ev.catId || ev.category || 'other',
                                      });
                                    } else {
                                      setEditEvent({ ...ev, _seriesScope: 'one' });
                                    }
                                  } catch {}
                                },
                                className:
                                  'px-2 py-1 rounded-md text-xs bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 tooltip-bottom',
                                'data-tooltip': 'Open',
                              },
                              '✏️'
                            ),
                            React.createElement(
                              'button',
                              {
                                onClick: () => {
                                  const next = String(ev.status || 'pending') === 'done' ? 'pending' : 'done';
                                  try {
                                    if (typeof window.quickStatusChange === 'function') {
                                      window.quickStatusChange(ev.id, next, ev);
                                      return;
                                    }
                                  } catch {}
                                  setEvents((prev) =>
                                    (Array.isArray(prev) ? prev : []).map((e) =>
                                      String(e.id) === String(ev.id) ? { ...e, status: next } : e
                                    )
                                  );
                                  showToast(next === 'done' ? '✅ Done' : '🟡 Pending');
                                },
                                className: 'px-2 py-1 rounded-md text-xs text-white tooltip-bottom',
                                style: { background: ui.primary },
                                'data-tooltip': st === 'done' ? 'Mark pending' : 'Mark done',
                              },
                              st === 'done' ? '↩️' : '✅'
                            ),
                            React.createElement(
                              'button',
                              {
                                onClick: () => {
                                  try {
                                    if (!confirm('Delete this task?')) return;
                                    const idx =
                                      eventsRef?.current && Array.isArray(eventsRef.current)
                                        ? eventsRef.current.findIndex((e) => String(e.id) === String(ev.id))
                                        : -1;
                                    try {
                                      if (typeof window.mainproQueueUndoDeleteOne === 'function')
                                        window.mainproQueueUndoDeleteOne(ev, idx);
                                    } catch {}
                                    setEvents((prev) => mainProRemoveEventByIdString(prev, ev.id));
                                    showToast('🗑️ Deleted — Undo (10s)');
                                  } catch {}
                                },
                                className:
                                  'px-2 py-1 rounded-md text-xs bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 tooltip-bottom',
                                'data-tooltip': 'Delete',
                              },
                              '🗑️'
                            ),
                            React.createElement(
                              'button',
                              {
                                onClick: () => {
                                  try {
                                    const startStr = String(ev.start || '');
                                    const pref = {
                                      title: ev.title || '',
                                      date: startStr ? startStr.slice(0, 10) : day.iso,
                                      time: startStr.includes('T') ? startStr.slice(11, 16) : '',
                                      catId: ev.catId,
                                      taskType: ev.taskType,
                                      priority: ev.priority,
                                      location: ev.location,
                                      notes: ev.notes,
                                      assignedTo: ev.assignedTo,
                                    };
                                    setShowList(false);
                                    if (typeof window.openTaskModal === 'function') {
                                      window.openTaskModal(pref);
                                      showToast('📄 Duplicated (edit then save)');
                                      return;
                                    }
                                    if (typeof window.openAddTaskModal === 'function') {
                                      window.openAddTaskModal(pref);
                                      showToast('📄 Duplicated');
                                      return;
                                    }
                                  } catch {}
                                },
                                className:
                                  'px-2 py-1 rounded-md text-xs bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 tooltip-bottom',
                                'data-tooltip': 'Duplicate',
                              },
                              '📄'
                            )
                          )
                        );
                      })
                    )
                  : React.createElement(
                      'div',
                      {
                        className:
                          'text-sm text-gray-500 bg-white border border-amber-200 rounded-xl px-3 py-3',
                      },
                      'No tasks'
                    )
              )
            )
          : React.createElement(
              'div',
              {
                className:
                  'text-sm text-gray-500 bg-white border border-amber-200 rounded-xl px-4 py-3',
              },
              'No tasks in this range'
            )
      )
    )
  );
}
