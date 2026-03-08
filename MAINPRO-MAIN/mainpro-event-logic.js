/**
 * MainPro EventLogic – Schema validation, NLP date parsing, Safe Apply
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

  function toYYYYMMDD(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function isValidParsedDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    var s = dateStr.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T12:00:00');
    return !Number.isNaN(d.getTime());
  }

  function isValidParsedTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return false;
    return /^([01]?\d|2[0-3]):[0-5]\d$/.test(timeStr.trim());
  }

  /**
   * Parse date/time from title. Relative: завтра, послезавтра, через неделю, в пн / понедельник, next Monday, etc.
   */
  function parseDateFromTitle(title) {
    if (!title || typeof title !== 'string') return null;
    var s = title.trim();
    if (!s.length) return null;

    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    var lower = s.toLowerCase();
    var dateStr = null;
    var timeStr = null;
    var matchedPhrases = [];

    if (/\b(завтра|tomorrow)\b/i.test(lower)) {
      dateStr = toYYYYMMDD(tomorrow);
      var m1 = s.match(/\b(завтра|tomorrow)\b/i);
      if (m1) matchedPhrases.push(m1[1]);
    } else if (/\b(сегодня|today)\b/i.test(lower)) {
      dateStr = toYYYYMMDD(today);
      var m2 = s.match(/\b(сегодня|today)\b/i);
      if (m2) matchedPhrases.push(m2[1]);
    } else if (/\b(послезавтра|day after tomorrow)\b/i.test(lower)) {
      var d2 = new Date(today);
      d2.setDate(d2.getDate() + 2);
      dateStr = toYYYYMMDD(d2);
      var m3 = s.match(/\b(послезавтра|day after tomorrow)\b/i);
      if (m3) matchedPhrases.push(m3[1]);
    } else if (/\b(через неделю|in a week|next week)\b/i.test(lower)) {
      var d7 = new Date(today);
      d7.setDate(d7.getDate() + 7);
      dateStr = toYYYYMMDD(d7);
      var m4 = s.match(/\b(через неделю|in a week|next week)\b/i);
      if (m4) matchedPhrases.push(m4[1]);
    } else if (/\b(через (\d+)\s*дн|in (\d+)\s*day)/i.test(lower)) {
      var dayMatch = lower.match(/(?:через|in)\s*(\d+)\s*(?:дн|day)/i);
      var n = dayMatch ? parseInt(dayMatch[1], 10) : 1;
      if (n >= 0 && n <= 365) {
        var dN = new Date(today);
        dN.setDate(dN.getDate() + n);
        dateStr = toYYYYMMDD(dN);
        var m5 = s.match(/(?:через|in)\s*\d+\s*(?:дн|day)/i);
        if (m5) matchedPhrases.push(m5[0]);
      }
    } else {
      var weekdayNames = [
        { ru: /пн|понедельник|пн\./i, en: /mon(day)?/i, w: 1 },
        { ru: /вт|вторник|вт\./i, en: /tue(sday)?/i, w: 2 },
        { ru: /ср|среда|ср\./i, en: /wed(nesday)?/i, w: 3 },
        { ru: /чт|четверг|чт\./i, en: /thu(rsday)?/i, w: 4 },
        { ru: /пт|пятница|пт\./i, en: /fri(day)?/i, w: 5 },
        { ru: /сб|суббота|сб\./i, en: /sat(urday)?/i, w: 6 },
        { ru: /вс|воскресенье|вс\./i, en: /sun(day)?/i, w: 0 }
      ];
      for (var i = 0; i < weekdayNames.length; i++) {
        var wd = weekdayNames[i];
        if (wd.ru.test(lower) || wd.en.test(lower)) {
          var cur = today.getDay();
          var diff = (wd.w - cur + 7) % 7;
          if (diff === 0) diff = 7;
          var nextD = new Date(today);
          nextD.setDate(nextD.getDate() + diff);
          dateStr = toYYYYMMDD(nextD);
          var wdMatch = s.match(wd.ru) || s.match(wd.en);
          if (wdMatch) matchedPhrases.push(wdMatch[0]);
          break;
        }
      }
    }

    var timeMatch = s.match(/\b(в|at|@)\s*(\d{1,2}):(\d{2})\b/i) || s.match(/\b(\d{1,2}):(\d{2})\s*(?:am|pm)?\b/i) || s.match(/\b(\d{1,2})\s*:\s*(\d{2})\b/);
    if (timeMatch) {
      matchedPhrases.push(timeMatch[0]);
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
    var result = { date: dateStr || toYYYYMMDD(today), time: timeStr || '09:00', matchedPhrase: matchedPhrases.length ? matchedPhrases.join(' ') : undefined };
    if (!isValidParsedDate(result.date)) result.date = toYYYYMMDD(today);
    if (!isValidParsedTime(result.time)) result.time = '09:00';
    return result;
  }

  /**
   * Safe Apply: merge parsed date/time into form data and return { formData, changed, changedFields } for UI flash.
   */
  function safeApplyParsedToFormData(formData, parsed) {
    if (!parsed || !formData || typeof formData !== 'object') return { formData: formData, changed: false, changedFields: [] };
    var next = Object.assign({}, formData);
    var changedFields = [];
    if (parsed.date && isValidParsedDate(parsed.date) && next.date !== parsed.date) {
      next.date = parsed.date;
      changedFields.push('date');
    }
    if (parsed.time && isValidParsedTime(parsed.time) && next.time !== parsed.time) {
      next.time = parsed.time;
      changedFields.push('time');
    }
    return { formData: next, changed: changedFields.length > 0, changedFields: changedFields };
  }

  function applyParsedToFormData(formData, parsed) {
    var r = safeApplyParsedToFormData(formData, parsed);
    return r.formData;
  }

  /** Trigger UI flash for NLP-applied fields (add/remove class on element or parent). */
  function flashNlpApplied(elementOrSelector) {
    try {
      var el = typeof elementOrSelector === 'string' ? document.querySelector(elementOrSelector) : elementOrSelector;
      if (!el) return;
      el.classList.add('mp-nlp-flash');
          var t = setTimeout(function () {
            el.classList.remove('mp-nlp-flash');
          }, 1200);
    } catch (_) {}
  }

  window.MainProEventLogic = {
    validateEvent: validateEvent,
    parseDateFromTitle: parseDateFromTitle,
    applyParsedToFormData: applyParsedToFormData,
    safeApplyParsedToFormData: safeApplyParsedToFormData,
    flashNlpApplied: flashNlpApplied,
    isValidParsedDate: isValidParsedDate,
    isValidParsedTime: isValidParsedTime
  };
})();
