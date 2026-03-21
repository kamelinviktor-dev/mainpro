/**
 * MainPro Calendar — refreshCalendar, event handlers (recurrence engine: mainpro-recurring-engine.js)
 * STABILITY LOCK: recurrence-only changes
 */

import { statusColor } from './utils.js';
import { generateOccurrences } from '../../mainpro-recurring-engine.js';
import {
  mainProFilterEventsByViewTab,
  mainProCompareEventsForCalendarSort,
  mainProSearchFilterExpandedEvents,
} from '../../mainpro-filters-status-module.js';
export { createEventDrop, createEventResize } from '../../mainpro-drag-resize-module.js';

/** Bases-only integrity: remove any instance events. */
export function stripInstances(list) {
  if (list == null) return [];
  return Array.isArray(list) ? list.filter((e) => !e || !e.isInstance) : [];
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

      let src = mainProFilterEventsByViewTab(expanded, filter);

      src = mainProSearchFilterExpandedEvents(src, search, categories);
      if (sortBy !== 'none') {
        src = [...src].sort((a, b) => mainProCompareEventsForCalendarSort(a, b, sortBy));
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
        catId: src.catId || src.category || 'other',
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
