/**
 * MainPro — shared localStorage access (keys and behavior match existing app).
 * Calendar / recurrence / UI logic stay in mainpro-app.js; this module only persists reads/writes.
 */

import { safeParse } from './mainpro-utils-module.js';

/** Exact storage keys (do not rename). */
export const MP_STORAGE_KEYS = Object.freeze({
  calendars: 'mainpro_calendars_v1',
  currentCalendarId: 'mainpro_current_calendar_v1',
  settings: 'mainpro_settings_v60',
  eventsLegacyV60: 'mainpro_events_v60',
  eventsLegacyV70: 'mainpro_events_v70',
  ui: 'mainpro_ui_v60',
  categories: 'mainpro_categories_v60',
  taskTypes: 'mainpro_tasktypes_v60',
  autostatus: 'mainpro_autostatus_v1',
  calendarEventsPrefix: 'mainpro_calendar_',
});

/** Safe JSON read (delegates to utils safeParse). */
export function mainProStorageParse(key, fallback) {
  return safeParse(key, fallback);
}

/** JSON.stringify + setItem with console.warn on failure. */
export function mainProStorageSetJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('localStorage write failed:', key, e);
    return false;
  }
}

export function mainProStorageGetItem(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

export function mainProStorageRemoveItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function mainProStorageCalendarEventsKey(calendarId) {
  return `${MP_STORAGE_KEYS.calendarEventsPrefix}${calendarId}`;
}

// --- Calendars list ---

export function mainProStorageLoadCalendars(fallback = []) {
  return safeParse(MP_STORAGE_KEYS.calendars, fallback);
}

export function mainProStorageSaveCalendars(calendars) {
  return mainProStorageSetJson(MP_STORAGE_KEYS.calendars, calendars);
}

// --- Current calendar id ---

export function mainProStorageLoadCurrentCalendarId(fallback = 'main') {
  try {
    return localStorage.getItem(MP_STORAGE_KEYS.currentCalendarId) || fallback;
  } catch {
    return fallback;
  }
}

export function mainProStorageSaveCurrentCalendarId(id) {
  try {
    localStorage.setItem(MP_STORAGE_KEYS.currentCalendarId, String(id));
    return true;
  } catch {
    return false;
  }
}

// --- Events per calendar ---

export function mainProStorageLoadEventsForCalendar(calendarId, fallback = []) {
  return safeParse(mainProStorageCalendarEventsKey(calendarId), fallback);
}

/**
 * Persist current calendar events + legacy `mainpro_events_v60` / `mainpro_events_v70` mirrors
 * (same as debounced effect in mainpro-app).
 */
export function mainProStorageSaveEventsBundle(strippedEvents, calendarId) {
  const key = mainProStorageCalendarEventsKey(calendarId);
  try {
    const json = JSON.stringify(strippedEvents);
    localStorage.setItem(key, json);
    try {
      localStorage.setItem(MP_STORAGE_KEYS.eventsLegacyV60, json);
    } catch {}
    try {
      localStorage.setItem(MP_STORAGE_KEYS.eventsLegacyV70, json);
    } catch {}
    return true;
  } catch (e) {
    console.warn('localStorage write failed:', e);
    return false;
  }
}

/** Only `mainpro_calendar_<id>` (no legacy mirrors). */
export function mainProStorageSaveEventsCalendarOnly(calendarId, strippedEvents) {
  return mainProStorageSetJson(mainProStorageCalendarEventsKey(calendarId), strippedEvents);
}

export function mainProStorageRemoveCalendarEvents(calendarId) {
  return mainProStorageRemoveItem(mainProStorageCalendarEventsKey(calendarId));
}

/** Raw string for backup export (`getItem` || `'[]'`). */
export function mainProStorageReadCalendarEventsRaw(calendarId) {
  try {
    return localStorage.getItem(mainProStorageCalendarEventsKey(calendarId)) || '[]';
  } catch {
    return '[]';
  }
}

// --- Settings record (hotel / logo slice in localStorage) ---

export function mainProStorageLoadSettingsBase(fallback) {
  return safeParse(MP_STORAGE_KEYS.settings, fallback);
}

export function mainProStorageSaveSettingsFields(fields) {
  return mainProStorageSetJson(MP_STORAGE_KEYS.settings, fields);
}
