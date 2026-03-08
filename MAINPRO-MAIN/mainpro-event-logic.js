/**
 * MainPro EventLogic – Schema validation & NLP date parsing from title
 * STABILITY LOCK: does not change existing event shape.
 */
(function () {
  'use strict';

  function validateEvent(event) {
    if (!event || typeof event !== 'object') return { valid: false, error: 'Invalid event object' };
    if (event.title != null && typeof event.title !== 'string') return { valid: false, error: 'title must be string' };
    if (event.id != null && typeof event.id !== 'number' && typeof event.id !== 'string') return { valid: false, error: 'id must be number or string' };
    return { valid: true };
  }

  /** Parse date/time from title phrase (e.g. "Встреча завтра в 15:00", "Meeting tomorrow at 3pm") */
  function parseDateFromTitle(title) {
    if (!title || typeof title !== 'string') return null;
    var s = title.trim();
    if (!s.length) return null;

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    function toYYYYMMDD(d) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }
    function toHHMM(d) {
      var h = d.getHours();
      var m = d.getMinutes();
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    var lower = s.toLowerCase();
    var dateStr = null;
    var timeStr = null;

    if (/\b(завтра|tomorrow)\b/i.test(lower)) {
      dateStr = toYYYYMMDD(tomorrow);
    } else if (/\b(сегодня|today)\b/i.test(lower)) {
      dateStr = toYYYYMMDD(today);
    } else if (/\b(послезавтра|day after tomorrow)\b/i.test(lower)) {
      var d = new Date(today);
      d.setDate(d.getDate() + 2);
      dateStr = toYYYYMMDD(d);
    }

    var timeMatch = s.match(/\b(в|at|@)\s*(\d{1,2}):(\d{2})\b/i) || s.match(/\b(\d{1,2}):(\d{2})\s*(?:am|pm)?\b/i) || s.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
    if (timeMatch) {
      var h, m;
      if (/^(в|at|@)$/i.test(timeMatch[1])) {
        h = parseInt(timeMatch[2], 10);
        m = parseInt(timeMatch[3], 10) || 0;
      } else {
        h = parseInt(timeMatch[1], 10);
        m = parseInt(timeMatch[2], 10) || 0;
      }
      if (/\bpm\b/i.test(s) && h < 12) h += 12;
      if (/\bam\b/i.test(s) && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    if (!dateStr && !timeStr) return null;
    return { date: dateStr || toYYYYMMDD(today), time: timeStr || '09:00' };
  }

  /** Apply parsed date/time to form data (non-destructive: only set if parsed) */
  function applyParsedToFormData(formData, parsed) {
    if (!parsed || !formData || typeof formData !== 'object') return formData;
    var next = Object.assign({}, formData);
    if (parsed.date) next.date = parsed.date;
    if (parsed.time) next.time = parsed.time;
    return next;
  }

  window.MainProEventLogic = {
    validateEvent: validateEvent,
    parseDateFromTitle: parseDateFromTitle,
    applyParsedToFormData: applyParsedToFormData
  };
})();
