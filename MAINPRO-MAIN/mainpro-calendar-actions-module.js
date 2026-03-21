/**
 * MainPro — simple calendar event list transforms (single-task CRUD helpers).
 * Recurrence, drag/drop, series delete, and modal flows stay in mainpro-app.js; this module only holds shared reducers.
 */

function asList(prev) {
  return Array.isArray(prev) ? prev : [];
}

/** Append one event (new task / AI suggestion path). */
export function mainProAppendEvent(prev, event) {
  return [...asList(prev), event];
}

/** Append multiple events at once (same semantics as [...prev, ...items]). */
export function mainProAppendEvents(prev, items) {
  const list = asList(prev);
  const extra = Array.isArray(items) ? items : [];
  return [...list, ...extra];
}

/**
 * Single-event edit: replace row matching editEvent.id, preserve isInstance from existing row.
 * (Used when not updating an entire series.)
 */
export function mainProMergeEditIntoEventById(prev, editEvent) {
  if (!editEvent) return asList(prev);
  const list = asList(prev);
  const editId = editEvent.id;
  return list.map((e) => (String(e.id) === String(editId) ? { ...editEvent, isInstance: e.isInstance } : e));
}

/**
 * Remove one event by id using strict inequality (matches legacy edit-modal delete for non-series).
 */
export function mainProRemoveEventStrictId(prev, id) {
  return asList(prev).filter((e) => e.id !== id);
}

/**
 * Remove one event by id using string comparison (agenda/list quick delete).
 */
export function mainProRemoveEventByIdString(prev, id) {
  const idStr = String(id);
  return asList(prev).filter((e) => String(e.id) !== idStr);
}

/** Set status for a single event id (toggle done / setTaskStatus base path). */
export function mainProMapEventStatusById(prev, eventId, status) {
  const list = asList(prev);
  const idStr = String(eventId);
  return list.map((e) => (String(e.id) === idStr ? { ...e, status } : e));
}
