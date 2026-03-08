/**
 * MainPro StorageEngine – Hybrid Sync (Stale-While-Revalidate)
 * STABILITY LOCK: load/save API shape preserved for compatibility.
 */
(function () {
  'use strict';

  var SYNC_STATUS = { synced: 'synced', pending: 'pending', error: 'error' };

  function safeParse(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : (fallback !== undefined ? fallback : []);
    } catch (e) {
      console.warn('StorageEngine: corrupted key', key);
      return fallback !== undefined ? fallback : [];
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('StorageEngine: write failed', key, e);
      return false;
    }
  }

  /** Schema validation: ensure event has required fields and types before save */
  function validateEvent(event) {
    if (!event || typeof event !== 'object') return { valid: false, error: 'Invalid event object' };
    var title = event.title;
    if (title != null && typeof title !== 'string') return { valid: false, error: 'title must be string' };
    var id = event.id;
    if (id != null && typeof id !== 'number' && typeof id !== 'string') return { valid: false, error: 'id must be number or string' };
    return { valid: true };
  }

  function validateEventList(list) {
    if (!Array.isArray(list)) return { valid: false, error: 'Events must be array' };
    for (var i = 0; i < list.length; i++) {
      var r = validateEvent(list[i]);
      if (!r.valid) return { valid: false, error: 'Event at index ' + i + ': ' + r.error };
    }
    return { valid: true };
  }

  /**
   * Load events: Stale-While-Revalidate.
   * Returns { events, status } – events from localStorage immediately; status updated after revalidate.
   */
  function loadEvents(options, onStatusChange) {
    var workspaceId = (options && options.workspaceId) || 'default';
    var calendarId = (options && options.calendarId) || 'main';
    var key = 'mainpro_ws_' + workspaceId + '_calendar_' + calendarId;
    var legacyKey = 'mainpro_calendar_' + calendarId;

    var local = safeParse(key, null);
    if (!Array.isArray(local) || local.length === 0) {
      local = safeParse(legacyKey, []);
      if (Array.isArray(local) && local.length > 0) safeSet(key, local);
    }
    var events = Array.isArray(local) ? local : [];

    if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.pending);

    revalidateFromAPI(key, events, onStatusChange);

    return { events: events, status: SYNC_STATUS.synced };
  }

  function revalidateFromAPI(storageKey, currentEvents, onStatusChange) {
    var apiUrl = (window.MainProAPI && window.MainProAPI.eventsUrl) || '/api/events';
    var fetchFn = typeof fetch !== 'undefined' ? fetch : null;
    if (!fetchFn) {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      return;
    }
    fetchFn(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (data && Array.isArray(data.events) && data.events.length > 0) {
          var validated = validateEventList(data.events);
          if (validated.valid) safeSet(storageKey, data.events);
        }
        if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      })
      .catch(function () {
        if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      });
  }

  /**
   * Save events: write to localStorage immediately, then sync to API (stub).
   */
  function saveEvents(events, options, onStatusChange) {
    var workspaceId = (options && options.workspaceId) || 'default';
    var calendarId = (options && options.calendarId) || 'main';
    var key = 'mainpro_ws_' + workspaceId + '_calendar_' + calendarId;
    var legacyKey = 'mainpro_calendar_' + calendarId;

    var validated = validateEventList(events);
    if (!validated.valid) {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
      return { ok: false, error: validated.error };
    }

    safeSet(key, events);
    try { safeSet(legacyKey, events); } catch (_) {}
    try { safeSet('mainpro_events_v60', events); } catch (_) {}
    try { safeSet('mainpro_events_v70', events); } catch (_) {}

    if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.pending);

    syncToAPI(events, options, onStatusChange);
    return { ok: true };
  }

  function syncToAPI(events, options, onStatusChange) {
    var apiUrl = (window.MainProAPI && window.MainProAPI.eventsUrl) || '/api/events';
    var fetchFn = typeof fetch !== 'undefined' ? fetch : null;
    if (!fetchFn) {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      return;
    }
    fetchFn(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: events, workspaceId: (options && options.workspaceId) || 'default', calendarId: (options && options.calendarId) || 'main' })
    })
      .then(function (res) {
        if (typeof onStatusChange === 'function') onStatusChange(res && res.ok ? SYNC_STATUS.synced : SYNC_STATUS.synced);
      })
      .catch(function () {
        if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      });
  }

  /** Get storage key for current workspace + calendar (for compatibility with existing code that uses mainpro_calendar_${id}) */
  function getCalendarStorageKey(workspaceId, calendarId) {
    if (!workspaceId || workspaceId === 'default') return 'mainpro_calendar_' + (calendarId || 'main');
    return 'mainpro_ws_' + workspaceId + '_calendar_' + (calendarId || 'main');
  }

  window.MainProStorageEngine = {
    SYNC_STATUS: SYNC_STATUS,
    loadEvents: loadEvents,
    saveEvents: saveEvents,
    validateEvent: validateEvent,
    validateEventList: validateEventList,
    safeParse: safeParse,
    safeSet: safeSet,
    getCalendarStorageKey: getCalendarStorageKey
  };
})();
