/**
 * MainPro StorageEngine – Single Source of Truth, Outbox Queue, Retry
 * STABILITY LOCK: load/save API shape preserved for compatibility.
 */
(function () {
  'use strict';

  var SYNC_STATUS = { synced: 'synced', pending: 'pending', error: 'error', offline: 'offline' };
  var OUTBOX_KEY = 'mainpro_outbox_v1';
  var MAX_RETRIES = 5;
  var BASE_DELAY_MS = 1000;

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

  /** Deep validation: IDs, dates, required fields */
  function isValidId(id) {
    if (id == null) return true;
    if (typeof id === 'number') return !Number.isNaN(id) && id > 0 && Number.isInteger(id);
    if (typeof id === 'string') return id.length > 0 && id.trim().length > 0;
    return false;
  }

  function isValidDateStr(str) {
    if (str == null || typeof str !== 'string') return false;
    var s = str.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T12:00:00');
    return !Number.isNaN(d.getTime());
  }

  function isValidDateTimeStr(str) {
    if (str == null || typeof str !== 'string') return false;
    if (str.length < 10) return false;
    var d = new Date(str);
    return !Number.isNaN(d.getTime());
  }

  function validateEvent(event) {
    if (!event || typeof event !== 'object') return { valid: false, error: 'Invalid event object' };
    if (event.title != null && typeof event.title !== 'string') return { valid: false, error: 'title must be string' };
    if (!isValidId(event.id)) return { valid: false, error: 'Invalid or missing id' };
    if (event.start != null && !isValidDateTimeStr(event.start) && !isValidDateStr(event.start)) return { valid: false, error: 'Invalid start date' };
    if (event.end != null && !isValidDateTimeStr(event.end) && !isValidDateStr(event.end)) return { valid: false, error: 'Invalid end date' };
    if (event.recur && typeof event.recur === 'object' && event.recur.exceptions) {
      var ex = event.recur.exceptions;
      if (!Array.isArray(ex)) return { valid: false, error: 'recur.exceptions must be array' };
      for (var i = 0; i < ex.length; i++) {
        if (!isValidDateStr(String(ex[i]).slice(0, 10))) return { valid: false, error: 'Invalid exception date at ' + i };
      }
    }
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

  function getOutbox() {
    return safeParse(OUTBOX_KEY, []);
  }

  function setOutbox(arr) {
    return safeSet(OUTBOX_KEY, arr);
  }

  function addToOutbox(payload, options) {
    var outbox = getOutbox();
    outbox.push({
      id: 'o_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      payload: payload,
      options: options || {},
      ts: Date.now(),
      retries: 0
    });
    setOutbox(outbox);
    return outbox.length;
  }

  function removeFromOutbox(id) {
    var outbox = getOutbox().filter(function (o) { return o.id !== id; });
    setOutbox(outbox);
    return outbox;
  }

  function notifyToast(msg) {
    try {
      if (typeof window.showToast === 'function') window.showToast(msg);
    } catch (_) {}
  }

  function syncOne(item, onStatusChange) {
    var apiUrl = (window.MainProAPI && window.MainProAPI.eventsUrl) || '/api/events';
    var body = JSON.stringify(item.payload);
    return fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    }).then(function (res) {
      if (res && res.ok) {
        if (item.id && item.id !== '_immediate') removeFromOutbox(item.id);
        if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
        return true;
      }
      throw new Error('Sync failed');
    });
  }

  function processOutboxWithRetry(onStatusChange) {
    var outbox = getOutbox();
    if (outbox.length === 0) {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      return Promise.resolve();
    }
    if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.pending);
    var item = outbox[0];
    var delay = BASE_DELAY_MS * Math.pow(2, Math.min(item.retries || 0, MAX_RETRIES));
    return new Promise(function (resolve) {
      setTimeout(function () {
        syncOne(item, onStatusChange).then(function () {
          processOutboxWithRetry(onStatusChange).then(resolve);
        }).catch(function () {
          var arr = getOutbox();
          var idx = arr.findIndex(function (o) { return o.id === item.id; });
          if (idx !== -1) {
            arr[idx].retries = (arr[idx].retries || 0) + 1;
            setOutbox(arr);
          }
          if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
          notifyToast('Sync failed. Will retry when online.');
          resolve();
        });
      }, delay);
    });
  }

  function flushOutbox(onStatusChange) {
    if (!navigator.onLine) {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.offline);
      return Promise.resolve();
    }
    return processOutboxWithRetry(onStatusChange);
  }

  /**
   * Single dispatcher: all event persistence goes through here.
   * action: 'replace' | 'save' – replace = full list, save = validate and persist current list.
   * payload: { events: [] } for replace/save.
   * Returns { ok: boolean, error?: string }.
   */
  function dispatchEventAction(action, payload, options, onStatusChange) {
    try {
      var events = payload && payload.events;
      if (action !== 'replace' && action !== 'save') return { ok: false, error: 'Unknown action' };
      if (!Array.isArray(events)) return { ok: false, error: 'Events array required' };
      var validated = validateEventList(events);
      if (!validated.valid) {
        notifyToast('Validation failed: ' + (validated.error || 'invalid data'));
        if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
        return { ok: false, error: validated.error };
      }
      return persistEvents(events, options || {}, onStatusChange);
    } catch (e) {
      var msg = (e && e.message) || 'Storage error';
      notifyToast(msg);
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
      return { ok: false, error: msg };
    }
  }

  function persistEvents(events, options, onStatusChange) {
    var workspaceId = (options && options.workspaceId) || 'default';
    var calendarId = (options && options.calendarId) || 'main';
    var key = 'mainpro_ws_' + workspaceId + '_calendar_' + calendarId;
    var legacyKey = 'mainpro_calendar_' + calendarId;

    safeSet(key, events);
    try { safeSet(legacyKey, events); } catch (_) {}
    try { safeSet('mainpro_events_v60', events); } catch (_) {}
    try { safeSet('mainpro_events_v70', events); } catch (_) {}

    var payload = { events: events, workspaceId: workspaceId, calendarId: calendarId };
    if (!navigator.onLine) {
      addToOutbox(payload, options);
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.offline);
      return { ok: true };
    }
    if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.pending);
    syncOne({ id: '_immediate', payload: payload }, onStatusChange).then(function (ok) {
      if (ok) return;
      addToOutbox(payload, options);
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
    }).catch(function () {
      addToOutbox(payload, options);
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
      notifyToast('Saved locally. Will sync when online.');
    });
    return { ok: true };
  }

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

    if (typeof onStatusChange === 'function') {
      var outbox = getOutbox();
      onStatusChange(outbox.length > 0 ? SYNC_STATUS.pending : SYNC_STATUS.synced);
    }
    revalidateFromAPI(key, events, onStatusChange);
    return { events: events, status: SYNC_STATUS.synced };
  }

  function revalidateFromAPI(storageKey, currentEvents, onStatusChange) {
    var apiUrl = (window.MainProAPI && window.MainProAPI.eventsUrl) || '/api/events';
    if (typeof fetch === 'undefined') {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.synced);
      return;
    }
    fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json' } })
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

  function saveEvents(events, options, onStatusChange) {
    var validated = validateEventList(events);
    if (!validated.valid) {
      if (typeof onStatusChange === 'function') onStatusChange(SYNC_STATUS.error);
      notifyToast('Validation failed');
      return { ok: false, error: validated.error };
    }
    return persistEvents(events, options || {}, onStatusChange);
  }

  function getCalendarStorageKey(workspaceId, calendarId) {
    if (!workspaceId || workspaceId === 'default') return 'mainpro_calendar_' + (calendarId || 'main');
    return 'mainpro_ws_' + workspaceId + '_calendar_' + (calendarId || 'main');
  }

  function getOutboxLength() {
    return getOutbox().length;
  }

  function setupOnlineListener(onStatusChange) {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', function () {
      flushOutbox(onStatusChange);
    });
  }

  window.MainProStorageEngine = {
    SYNC_STATUS: SYNC_STATUS,
    loadEvents: loadEvents,
    saveEvents: saveEvents,
    persistEvents: persistEvents,
    dispatchEventAction: dispatchEventAction,
    validateEvent: validateEvent,
    validateEventList: validateEventList,
    safeParse: safeParse,
    safeSet: safeSet,
    getCalendarStorageKey: getCalendarStorageKey,
    getOutbox: getOutbox,
    getOutboxLength: getOutboxLength,
    flushOutbox: flushOutbox,
    setupOnlineListener: setupOnlineListener
  };
})();
