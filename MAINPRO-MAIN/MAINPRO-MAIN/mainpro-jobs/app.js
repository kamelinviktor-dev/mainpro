let jobs = loadJobs();
/**
 * All | New | In Progress | Pending | Overdue (active list).
 * "Done" kept for old localStorage.
 */
let statusFilter = "All";
/** "all" | "completedToday" — History tab */
let historyViewFilter = "all";
/** set when opening Park modal */
let _parkTargetId = null;

/** in-memory only: job id string → show full log */
const jobLogExpanded = Object.create(null);
const JOB_LOG_PREVIEW_COUNT = 1;
/** Collapsed Activity: show this many newest system events; expanded shows all. */
const ACTIVITY_LOG_VISIBLE_COUNT = 1;

const MAINPRO_USER_KEY = "mainpro_user";
const MAINPRO_ROLES = [
  "Reception",
  "Housekeeping",
  "Maintenance",
  "Manager",
];

function getMainproUser() {
  try {
    return String(localStorage.getItem(MAINPRO_USER_KEY) || "").trim();
  } catch {
    return "";
  }
}

function isMainproRole(r) {
  return MAINPRO_ROLES.indexOf(r) >= 0;
}

function hasMainproLogin() {
  return isMainproRole(getMainproUser());
}

function applyAuthUi() {
  const ok = hasMainproLogin();
  const u = getMainproUser();
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("appMain");
  const disp = document.getElementById("reportingAsDisplay");
  if (login) login.hidden = ok;
  if (app) app.hidden = !ok;
  if (disp) disp.textContent = ok && u ? u : "—";
  if (ok) {
    render();
    setTab("active");
  }
}

function selectUserRole(role) {
  if (!isMainproRole(role)) return;
  try {
    localStorage.setItem(MAINPRO_USER_KEY, role);
  } catch (e) {
    console.warn("Could not save mainpro_user", e);
  }
  applyAuthUi();
}

function showChangeUser() {
  try {
    localStorage.removeItem(MAINPRO_USER_KEY);
  } catch (e) {
    console.warn("Could not clear mainpro_user", e);
  }
  applyAuthUi();
}

window.selectUserRole = selectUserRole;
window.showChangeUser = showChangeUser;

function loadJobs() {
  let list = JSON.parse(localStorage.getItem("jobs") || "[]");
  if (!Array.isArray(list)) list = [];
  let changed = false;
  list = list.map((j, i) => {
    const x = { ...j };
    if (x.id == null || x.id === "") {
      x.id = "mig-" + i + "-" + Date.now();
      changed = true;
    }
    x.id = String(x.id);
    if (!Array.isArray(x.comments)) {
      x.comments = [];
      changed = true;
    }
    {
      const legacy = [];
      if (typeof x.notes === "string" && x.notes.trim()) {
        legacy.push(x.notes.trim());
      }
      if (typeof x.engineerComment === "string" && x.engineerComment.trim()) {
        const t = x.engineerComment.trim();
        if (legacy[legacy.length - 1] !== t) legacy.push(t);
      }
      if (x.comments.length === 0 && legacy.length) {
        const hasCreated =
          x.createdAt && String(x.createdAt).trim();
        const base = hasCreated
          ? new Date(x.createdAt).getTime()
          : Date.now();
        x.comments = legacy.map((text, i) => ({
          text,
          createdAt: new Date(base + i).toISOString(),
          author: "Engineer",
          type: "info",
        }));
        changed = true;
      }
      if (x.engineerComment != null) {
        delete x.engineerComment;
        changed = true;
      }
      if (x.notes != null) {
        delete x.notes;
        changed = true;
      }
    }
    if (x.photo == null) {
      x.photo = "";
      changed = true;
    }
    if (x.completedAt == null) {
      x.completedAt = "";
      changed = true;
    }
    if (x.status === "Done" && !x.completedAt) {
      x.completedAt = new Date().toISOString();
      changed = true;
    }
    if (x.createdAt == null) {
      x.createdAt = "";
      changed = true;
    }
    if (x.reportedBy == null) {
      x.reportedBy = "";
      changed = true;
    }
    if (x.pendingUntil == null) {
      x.pendingUntil = "";
      changed = true;
    }
    if (x.pendingReason == null) {
      x.pendingReason = "";
      changed = true;
    }
    if (x.overdueLoggedForUntil == null) {
      x.overdueLoggedForUntil = "";
      changed = true;
    }
    {
      const u = (x.pendingUntil || "").trim();
      if (x.status === "Pending" && u) {
        const t = new Date(u).getTime();
        if (!isNaN(t) && Date.now() > t && x.overdueLoggedForUntil === "") {
          x.overdueLoggedForUntil = u;
          changed = true;
        }
      }
    }
    if (x.deleted == null) {
      x.deleted = false;
      changed = true;
    }
    if (x.deletedAt == null) {
      x.deletedAt = "";
      changed = true;
    }
    if (x.previousStatus == null) {
      x.previousStatus = "";
      changed = true;
    }
    delete x.isOverdue;
    return x;
  });
  {
    const nowMs = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    const n0 = list.length;
    list = list.filter((j) => {
      if (!j.deleted) return true;
      const raw = (j.deletedAt && String(j.deletedAt).trim()) || "";
      if (!raw) return true;
      const t = new Date(raw).getTime();
      if (isNaN(t)) return true;
      return nowMs - t < maxAge;
    });
    if (list.length !== n0) {
      changed = true;
    }
  }
  if (changed) {
    try {
      localStorage.setItem("jobs", JSON.stringify(list));
    } catch (e) {
      console.warn("Could not save migrated jobs", e);
    }
  }
  return list;
}

function save() {
  const out = jobs.map((j) => {
    const o = { ...j };
    delete o.isOverdue;
    delete o.engineerComment;
    delete o.notes;
    if (!Array.isArray(o.comments)) o.comments = [];
    return o;
  });
  localStorage.setItem("jobs", JSON.stringify(out));
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** For double-quoted HTML attributes (e.g. data-jid). */
function escapeAttr(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/'/g, "&#39;");
}

/** Safe id in data-job-id (any characters in job id). */
function jobIdForDomAttr(id) {
  return encodeURIComponent(String(id));
}

function jobIdFromDomAttr(raw) {
  if (raw == null || raw === "") return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function isActiveStatus(status) {
  return (
    status === "New" || status === "In Progress" || status === "Pending"
  );
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

/** Value for <input type="datetime-local"> from a Date. */
function toDatetimeLocalValue(d) {
  return (
    d.getFullYear() +
    "-" +
    pad2(d.getMonth() + 1) +
    "-" +
    pad2(d.getDate()) +
    "T" +
    pad2(d.getHours()) +
    ":" +
    pad2(d.getMinutes())
  );
}

function defaultParkDateTimeValue() {
  return toDatetimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

function minParkDateTimeValue() {
  return toDatetimeLocalValue(new Date());
}

/** All visible date/time in the UI (no seconds). */
function formatDateTime(value) {
  const d = new Date(value);
  if (isNaN(d)) return "";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Card header / meta: "25 Apr, 23:53" (no year). */
function formatDateClean(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }) +
    ", " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

/** Activity timeline: time only. */
function formatTimeOnly(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function isCompletedAtToday(iso) {
  if (iso == null || iso === "") return false;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  const d = new Date(t);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Rule: Pending + pendingUntil + now > until (also sets j.isOverdue via sync). */
function isJobOverdueState(j) {
  if (j.status !== "Pending") return false;
  const u = (j.pendingUntil || "").trim();
  if (!u) return false;
  const t = new Date(u).getTime();
  if (isNaN(t)) return false;
  return Date.now() > t;
}

/**
 * isOverdue is in-memory only; stripped in save().
 */
function syncOverdueFlags() {
  jobs.forEach((j) => {
    if (j.deleted) {
      j.isOverdue = false;
      return;
    }
    j.isOverdue = isJobOverdueState(j);
  });
}

function appendSystemComment(j, text) {
  const msg = (text == null ? "" : String(text)).trim();
  if (!msg) return;
  if (!Array.isArray(j.comments)) j.comments = [];
  j.comments.push({
    text: msg,
    createdAt: new Date().toISOString(),
    author: "System",
  });
}

/**
 * When pending until passes, log once per pending-until value (overdueLoggedForUntil).
 */
function appendOverdueAuditIfNeeded() {
  let any = false;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (j.deleted) {
      if (j.overdueLoggedForUntil) {
        j.overdueLoggedForUntil = "";
        any = true;
      }
      continue;
    }
    if (j.status !== "Pending" || !(j.pendingUntil || "").trim()) {
      if (j.overdueLoggedForUntil) {
        j.overdueLoggedForUntil = "";
        any = true;
      }
      continue;
    }
    const u = (j.pendingUntil || "").trim();
    if (!j.isOverdue) {
      if (j.overdueLoggedForUntil) {
        j.overdueLoggedForUntil = "";
        any = true;
      }
      continue;
    }
    if (j.overdueLoggedForUntil === u) continue;
    appendSystemComment(j, "Job became Overdue");
    j.overdueLoggedForUntil = u;
    any = true;
  }
  if (any) save();
}

function formatDurationHMFromMs(totalMs) {
  if (totalMs < 0) totalMs = 0;
  const totalMin = Math.floor(totalMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { h: h, m: m };
}

function getPendingTimerBlock(j) {
  if (j.status !== "Pending" || !(j.pendingUntil || "").trim()) return "";
  const t = new Date(j.pendingUntil).getTime();
  if (isNaN(t)) return "";
  const now = Date.now();
  if (j.isOverdue) {
    const { h, m } = formatDurationHMFromMs(now - t);
    return `<div class="pending-timer-line pending-timer--overdue meta-line" aria-live="polite">⚠️ Overdue by ${h}h ${m}m</div>`;
  }
  if (t <= now) return "";
  const { h, m } = formatDurationHMFromMs(t - now);
  return `<div class="pending-timer-line pending-timer--left meta-line" aria-live="polite">⏱️ ${h}h ${m}m left</div>`;
}

function getDashboardCounts() {
  let nNew = 0;
  let nInProgress = 0;
  let nPending = 0;
  let nOverdue = 0;
  let nDoneToday = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (j.deleted) continue;
    const st = j.status;
    if (st === "New") nNew++;
    else if (st === "In Progress") nInProgress++;
    else if (st === "Pending") {
      if (j.isOverdue) nOverdue++;
      else nPending++;
    }
    if (st === "Done" && isCompletedAtToday(j.completedAt)) nDoneToday++;
  }
  return {
    nNew: nNew,
    nInProgress: nInProgress,
    nPending: nPending,
    nOverdue: nOverdue,
    nDoneToday: nDoneToday,
  };
}

function updateDashboard() {
  const c = getDashboardCounts();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set("dashCountNew", c.nNew);
  set("dashCountInProgress", c.nInProgress);
  set("dashCountPending", c.nPending);
  set("dashCountOverdue", c.nOverdue);
  set("dashCountDoneToday", c.nDoneToday);
  updateDashboardCardHighlight();
}

function getCurrentPanelKind() {
  const a = document.getElementById("panel-active");
  if (a && !a.hidden) return "active";
  return "history";
}

function updateDashboardCardHighlight() {
  const kind = getCurrentPanelKind();
  document.querySelectorAll(".job-dashboard-card").forEach((el) => {
    el.classList.remove("job-dashboard-card--active");
  });
  if (kind === "active" && statusFilter && statusFilter !== "All") {
    const h = {
      New: "new",
      "In Progress": "inProgress",
      Pending: "pending",
      Overdue: "overdue",
    }[statusFilter];
    if (h) {
      const t = document.querySelector('.job-dashboard-card[data-dash="' + h + '"]');
      if (t) t.classList.add("job-dashboard-card--active");
    }
  } else if (kind === "history" && historyViewFilter === "completedToday") {
    const t = document.querySelector('.job-dashboard-card[data-dash="doneToday"]');
    if (t) t.classList.add("job-dashboard-card--active");
  }
}

function getSearchQuery() {
  const el = document.getElementById("jobSearch");
  return ((el && el.value) || "").trim().toLowerCase();
}

function getJobCommentsTextBlob(j) {
  const arr = Array.isArray(j.comments) ? j.comments : [];
  return arr
    .map((c) => {
      if (!c) return "";
      const d = getCommentDisplayFields(c);
      return [d.text, d.author, d.type].filter(Boolean).join(" ");
    })
    .join(" ");
}

function matchesJobSearch(j, q) {
  if (!q) return true;
  const parts = [
    j.location,
    j.problem,
    j.reportedBy,
    j.priority,
    j.status,
    getJobCommentsTextBlob(j),
    j.pendingUntil,
    j.pendingReason,
  ].map((v) => String(v == null ? "" : v).toLowerCase());
  return parts.some((p) => p.indexOf(q) >= 0);
}

/**
 * Active list filters. Pending = on-time only; Overdue = separate. Stale "Done" → all actives.
 */
function matchesStatusFilterForActive(j) {
  if (statusFilter === "All" || statusFilter === "Done") return true;
  if (statusFilter === "Overdue") return j.isOverdue === true;
  if (statusFilter === "Pending") {
    return j.status === "Pending" && !j.isOverdue;
  }
  return j.status === statusFilter;
}

function setStatusFilter(s) {
  statusFilter = s;
  historyViewFilter = "all";
  setTab("active");
  render();
}

function onDashboardFilter(dash) {
  if (dash === "doneToday") {
    historyViewFilter = "completedToday";
    setTab("history");
    render();
    return;
  }
  historyViewFilter = "all";
  const map = {
    new: "New",
    inProgress: "In Progress",
    pending: "Pending",
    overdue: "Overdue",
  };
  if (map[dash]) {
    statusFilter = map[dash];
  }
  setTab("active");
  render();
}

window.onDashboardFilter = onDashboardFilter;

function sortKeyActiveList(j) {
  if (j.isOverdue) return 0;
  if (j.status === "In Progress") return 1;
  if (j.status === "Pending") return 2;
  if (j.status === "New") return 3;
  return 4;
}

function updateFilterButtonsActiveState() {
  const onActive = getCurrentPanelKind() === "active";
  document.querySelectorAll("[data-status-filter]").forEach((el) => {
    const v = el.getAttribute("data-status-filter");
    el.classList.toggle("active", onActive && v === statusFilter);
  });
}

function render() {
  syncOverdueFlags();
  appendOverdueAuditIfNeeded();

  const activeEl = document.getElementById("jobs-active");
  const historyEl = document.getElementById("jobs-history");
  if (activeEl) activeEl.innerHTML = "";
  if (historyEl) historyEl.innerHTML = "";

  const q = getSearchQuery();

  let actives;
  if (statusFilter === "Deleted") {
    actives = jobs.filter((j) => j.deleted === true);
  } else {
    actives = jobs.filter((j) => isActiveStatus(j.status) && !j.deleted);
    actives = actives.filter((j) => matchesStatusFilterForActive(j));
  }
  actives = actives.filter((j) => matchesJobSearch(j, q));
  actives.sort((a, b) => {
    if (statusFilter === "Deleted") {
      return String(b.deletedAt || "").localeCompare(String(a.deletedAt || ""));
    }
    const ka = sortKeyActiveList(a);
    const kb = sortKeyActiveList(b);
    if (ka !== kb) return ka - kb;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });

  let doneList = jobs
    .filter((j) => j.status === "Done" && !j.deleted)
    .slice()
    .sort((a, b) => {
      const ta = a.completedAt || "";
      const tb = b.completedAt || "";
      return tb.localeCompare(ta);
    });
  if (historyViewFilter === "completedToday") {
    doneList = doneList.filter((j) => isCompletedAtToday(j.completedAt));
  }
  doneList = doneList.filter((j) => matchesJobSearch(j, q));

  updateFilterButtonsActiveState();
  updateDeletedFilterCount();

  if (actives.length === 0 && activeEl) {
    const emptyMsg =
      statusFilter === "Deleted"
        ? '<p class="empty-hint">No deleted jobs. Items stay here for 7 days, then are removed automatically.</p>'
        : '<p class="empty-hint">No active jobs to show. Try clearing search or set filter to <strong>All</strong>. Submit a new issue above if needed.</p>';
    activeEl.innerHTML = emptyMsg;
  } else {
    actives.forEach((j) => {
      activeEl.innerHTML += j.deleted
        ? renderDeletedCard(j)
        : renderActiveCard(j);
    });
  }

  if (doneList.length === 0 && historyEl) {
    historyEl.innerHTML =
      historyViewFilter === "completedToday"
        ? '<p class="empty-hint">No jobs completed today yet.</p>'
        : '<p class="empty-hint">No completed jobs yet.</p>';
  } else {
    doneList.forEach((j) => {
      historyEl.innerHTML += renderHistoryCard(j);
    });
  }
  updateDashboard();
}

function idAttr(id) {
  return JSON.stringify(String(id));
}

const COMMENT_TYPES = ["info", "issue", "action", "done"];

/** Backward compatible: default author and type for legacy or partial objects. */
function getCommentDisplayFields(c) {
  if (!c) {
    return {
      text: "",
      createdAt: "",
      time: "",
      date: "",
      author: "Engineer",
      type: "info",
    };
  }
  const t = String(c.type || "info")
    .toLowerCase()
    .trim();
  const type = COMMENT_TYPES.indexOf(t) >= 0 ? t : "info";
  const author =
    c.author && String(c.author).trim() ? String(c.author).trim() : "Engineer";
  return { text: c.text, createdAt: c.createdAt, author, type };
}

function getCommentTypeBadgeLabel(type) {
  return { issue: "ISSUE", action: "ACTION", done: "DONE" }[type] || "";
}

function isSystemLogComment(c) {
  if (!c) return false;
  if (String(c.author == null ? "" : c.author).trim() === "System")
    return true;
  if (String(c.type || "").toLowerCase().trim() === "system") return true;
  return false;
}

/**
 * For engineer / user message cards, tint to match the parent job card.
 */
function getCommentLogToneClass(j) {
  if (j.deleted) return "comment-log--tone-default";
  if (j.status === "Pending" && j.isOverdue) return "comment-log--tone-overdue";
  if (j.status === "Pending") return "comment-log--tone-pending";
  return "comment-log--tone-default";
}

function getCommentSortTimeMs(c) {
  if (!c) return NaN;
  const raw = c.time || c.date || c.createdAt;
  const t = new Date(raw).getTime();
  return t;
}

function getCommentsSortedNewestFirst(j) {
  const arr = (Array.isArray(j.comments) ? j.comments : [])
    .filter((c) => c && String(c.text || "").trim());
  return arr
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ta = getCommentSortTimeMs(a.c);
      const tb = getCommentSortTimeMs(b.c);
      if (tb !== ta) return tb - ta;
      return b.i - a.i;
    })
    .map((x) => x.c);
}

function sortCommentsNewestFirst(arr) {
  return (Array.isArray(arr) ? arr : [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.time || b.date || b.createdAt).getTime() -
        new Date(a.time || a.date || a.createdAt).getTime()
    );
}

/**
 * Activity line copy (clear SaaS-style wording from stored system text).
 */
function getActivityDisplayLabel(rawMsg) {
  const m = String(rawMsg == null ? "" : rawMsg)
    .trim()
    .replace(/\|\|/g, " ")
    .replace(/\s+/g, " ");
  if (/^job moved to deleted$/i.test(m)) return "Moved to Deleted";
  if (/^job restored$/i.test(m)) return "Restored";
  if (/^moved to in progress$/i.test(m)) return "Moved to In Progress";
  if (/^moved to pending$/i.test(m)) return "Moved to Pending";
  if (/^job became overdue$/i.test(m)) return "Became Overdue";
  if (/^job completed$/i.test(m)) return "Marked Done";
  let x = m.match(/^Moved to (.+)$/i);
  if (x) {
    const cap = x[1].trim();
    if (/^pending$/i.test(cap)) return "Moved to Pending";
    if (/^in progress$/i.test(cap)) return "Moved to In Progress";
    return "Moved to " + cap;
  }
  x = m.match(/^Job moved to (.+)$/i);
  if (x) {
    const cap = x[1].trim();
    if (/^deleted$/i.test(cap)) return "Moved to Deleted";
    return "Moved to " + cap;
  }
  x = m.match(/^Job became (.+)$/i);
  if (x) return "Became " + x[1].trim();
  return m;
}

function getActivityItemVariant(displayLabel) {
  const L = String(displayLabel || "").toLowerCase();
  if (L.indexOf("deleted") >= 0) return "deleted";
  if (L.indexOf("restored") >= 0) return "restored";
  if (L.indexOf("marked done") >= 0 || L === "marked done") return "done";
  if (L.indexOf("overdue") >= 0) return "deleted";
  if (L.indexOf("pending") >= 0) return "pending";
  if (L.indexOf("in progress") >= 0) return "progress";
  return "default";
}

function renderEngineerLogItemHtml(c) {
  const d = getCommentDisplayFields(c);
  const label = getCommentTypeBadgeLabel(d.type);
  const showBadge = Boolean(d.type && d.type !== "info" && label);
  const badgeBlock =
    showBadge && label
      ? `<div class="comment-log-badge-wrap"><span class="comment-type-badge comment-type-badge--${d.type}">${escapeHtml(
          label
        )}</span></div>`
      : "";
  return `<div class="comment-log-item comment-log-item--engineer note-card" role="listitem">
      <div class="comment-log-time note-date">${escapeHtml(
        formatDateClean(d.time || d.date || d.createdAt) || "—"
      )}</div>
      <div class="comment-log-author note-author">${escapeHtml(d.author)}</div>
      ${badgeBlock}
      <div class="comment-log-text note-text">${escapeHtml(
        String(d.text == null ? "" : d.text).trim()
      )}</div>
    </div>`;
}

function renderSystemLogItemHtml(c) {
  const d = getCommentDisplayFields(c);
  const msg = String(d.text == null ? "" : d.text).trim();
  const label = getActivityDisplayLabel(msg);
  const variant = getActivityItemVariant(label);
  const labelEsc = escapeHtml(label);
  const timeRaw = d.time || d.date || d.createdAt;
  const timeEsc = escapeHtml(formatTimeOnly(timeRaw) || "—");
  return `<div class="activity-item ${variant}" role="listitem"><span class="activity-line-text"><strong>${labelEsc}</strong></span><span class="activity-time">${timeEsc}</span></div>`;
}

/** Job log in Active and History: engineer cards + Activity (system) + collapse for notes. */
function renderEngineerNotesSavedSection(j) {
  const list = getCommentsSortedNewestFirst(j);
  const tone = getCommentLogToneClass(j);
  const idKey = String(j.id);

  if (!list.length) {
    return `<div class="job-log-stack"><h4 class="log-title section-title">Engineer notes</h4><div class="notes-container"><div class="comment-log comment-log--empty job-log--timeline ${tone}">No notes yet</div></div></div>`;
  }

  const engineerList = sortCommentsNewestFirst(
    list.filter((c) => !isSystemLogComment(c))
  );
  const sortedActivity = [...list.filter((c) => isSystemLogComment(c))].sort(
    (a, b) => {
      return (
        new Date(b.time || b.date || b.createdAt).getTime() -
        new Date(a.time || a.date || a.createdAt).getTime()
      );
    }
  );

  const hasMoreEngineer = engineerList.length > JOB_LOG_PREVIEW_COUNT;
  const hasMoreSystem = sortedActivity.length > ACTIVITY_LOG_VISIBLE_COUNT;
  const hasMore = hasMoreEngineer || hasMoreSystem;
  const expanded = !!jobLogExpanded[idKey];
  /** Newest-first lists: latest k == first k (chronological list would use slice(-k)). */
  const visibleNotes = expanded
    ? engineerList
    : engineerList.slice(0, JOB_LOG_PREVIEW_COUNT);
  const visibleActivity = expanded
    ? sortedActivity
    : sortedActivity.slice(0, ACTIVITY_LOG_VISIBLE_COUNT);

  let engineerBlock = "";
  if (!engineerList.length) {
    engineerBlock = `<h4 class="log-title section-title">Engineer notes</h4><div class="notes-container"><div class="comment-log comment-log--empty job-log--timeline ${tone}">No notes yet</div></div>`;
  } else {
    engineerBlock = `<h4 class="log-title section-title">Engineer notes</h4><div class="notes-container"><div class="comment-log job-log--timeline job-log--engineer-notes ${tone}" role="list">${visibleNotes
      .map((c) => renderEngineerLogItemHtml(c))
      .join("")}</div></div>`;
  }

  let activityBlock = "";
  if (sortedActivity.length) {
    activityBlock = `<h4 class="log-title section-title system">Activity</h4><div class="activity" role="list">${visibleActivity
      .map((c) => renderSystemLogItemHtml(c))
      .join("")}</div>`;
  }

  const toggleBtn = hasMore
    ? `<div class="job-log-foot"><button type="button" class="btn-job-log-toggle logs-toggle-btn" data-job-id="${jobIdForDomAttr(
        j.id
      )}">${
        expanded ? "Hide logs" : "Show all logs"
      }</button></div>`
    : "";

  return `<div class="job-log-stack">${engineerBlock}${activityBlock}${toggleBtn}</div>`;
}

/** Canonical key so expand state matches `jobLogExpanded[String(j.id)]` on re-render. */
function jobLogExpandedKeyForId(rawId) {
  if (rawId == null || rawId === "") return "";
  const sid = String(rawId);
  const j = jobs.find((x) => String(x.id) === sid);
  return j ? String(j.id) : sid;
}

function toggleJobLog(id) {
  const k = jobLogExpandedKeyForId(id);
  if (!k) return;
  jobLogExpanded[k] = !jobLogExpanded[k];
  render();
}

/** CSS: `.job-card.logs-expanded .notes-container` drops inner scroll (full log height). */
function jobCardLogsExpandedClass(j) {
  return jobLogExpanded[String(j.id)] ? " logs-expanded" : "";
}

/**
 * All cards share base class "job-card-shell" (Pending/Overdue premium shell); tone = color only.
 */
function getJobCardStatusVisual(j) {
  const st = j.status;
  if (st === "Done") {
    return { cardClass: "job-card-shell job-card--done", badgeMod: "done", badgeText: "DONE" };
  }
  if (st === "New") {
    return { cardClass: "job-card-shell job-card--new", badgeMod: "new", badgeText: "NEW" };
  }
  if (st === "In Progress") {
    return {
      cardClass: "job-card-shell job-card--progress",
      badgeMod: "progress",
      badgeText: "IN PROGRESS",
    };
  }
  if (st === "Pending") {
    if (j.isOverdue) {
      return { cardClass: "job-card-shell job-card--overdue", badgeMod: "overdue", badgeText: "OVERDUE" };
    }
    return { cardClass: "job-card-shell job-card--pending", badgeMod: "pending", badgeText: "ON HOLD" };
  }
  return { cardClass: "job-card-shell job-card--new", badgeMod: "new", badgeText: "NEW" };
}

function renderActiveCard(j) {
  const st = j.status;
  const vis = getJobCardStatusVisual(j);
  const qid = idAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button"></div>`
    : "";
  const sInProgress = JSON.stringify("In Progress");
  const sDone = JSON.stringify("Done");
  const progressBtnNew =
    st === "New"
      ? `<button type="button" class="btn-sec" onclick='setStatus(${qid}, ${sInProgress})'>In Progress</button>`
      : "";
  const progressBtnPending =
    st === "Pending"
      ? `<button type="button" class="btn-sec" onclick='setStatus(${qid}, ${sInProgress})'>In Progress</button>`
      : "";
  const parkBtn =
    st === "New" || st === "In Progress"
      ? `<button type="button" class="btn-park" onclick='openParkDialog(${qid})'>Park</button>`
      : "";
  const idForAttr = jobIdForDomAttr(j.id);
  const pr = (j.pendingReason || "").trim();
  const isOverdue = st === "Pending" && j.isOverdue;
  const reasonLine =
    st === "Pending"
      ? `<div class="pending-reason-line meta-line">Reason: ${escapeHtml(
          pr || "—"
        )}</div>`
      : "";
  const timerLine = st === "Pending" ? getPendingTimerBlock(j) : "";
  const pendingLine =
    st === "Pending" && (j.pendingUntil || "").trim()
      ? `<div class="pending-until-line meta-line">Pending until: ${escapeHtml(
          formatDateClean(j.pendingUntil) || "—"
        )}</div>`
      : st === "Pending"
        ? `<div class="pending-until-line meta-line">Pending until: —</div>`
        : "";
  return `
      <div class="job job-card ${vis.cardClass}${jobCardLogsExpandedClass(
    j
  )}" data-job-id="${idForAttr}" data-status="${escapeHtml(
    st
  )}" data-overdue="${isOverdue ? "1" : "0"}">
        <span class="job-status-badge job-status-badge--${vis.badgeMod}">${vis.badgeText}</span>
        ${photoBlock}
        <div class="job-body job-meta">
          <div class="job-title"><strong>${escapeHtml(
            j.location
          )}</strong> <span class="job-priority-paren">(${escapeHtml(
    j.priority
  )})</span></div>
          <div class="job-problem">${escapeHtml(j.problem)}</div>
          <div class="reported-by-line meta-line">Reported by: ${escapeHtml(
            j.reportedBy || "—"
          )}</div>
          <div class="created-line meta-line">Reported: ${escapeHtml(
            formatDateClean(j.createdAt) || "—"
          )}</div>
          ${reasonLine}
          ${timerLine}
          ${pendingLine}
        </div>
        ${renderEngineerNotesSavedSection(j)}
        <label class="comment-label">Add a note</label>
        <textarea class="comment-field comment-new" rows="2" placeholder="Type a note, then tap Save note"></textarea>
        <div class="comment-save-row">
          <button type="button" class="btn-save-note" onclick="saveEngineerNote(this)">Save note</button>
          <span class="comment-saved-hint" data-saved-hint="1" hidden>Saved</span>
        </div>
        <div class="job-actions">
          ${progressBtnNew}
          ${progressBtnPending}
          ${parkBtn}
          <button type="button" class="btn-done" onclick='setStatus(${qid}, ${sDone})'>Done</button>
          <button type="button" class="btn-del" onclick='deleteJob(${qid})'>Delete</button>
        </div>
      </div>
    `;
}

function renderHistoryCard(j) {
  const vis = getJobCardStatusVisual(j);
  const qid = idAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button"></div>`
    : "";
  const when = formatDateClean(j.completedAt);
  return `
      <div class="job job-card done job-history ${vis.cardClass}${jobCardLogsExpandedClass(
    j
  )}" data-job-id="${jobIdForDomAttr(j.id)}" data-status="Done">
        <span class="job-status-badge job-status-badge--${vis.badgeMod}">${vis.badgeText}</span>
        ${photoBlock}
        <div class="job-body job-meta">
          <div class="job-title"><strong>${escapeHtml(
            j.location
          )}</strong> <span class="job-priority-paren">(${escapeHtml(
    j.priority
  )})</span></div>
          <div class="job-problem">${escapeHtml(j.problem)}</div>
          <div class="reported-by-line meta-line">Reported by: ${escapeHtml(
            j.reportedBy || "—"
          )}</div>
          <div class="created-line meta-line">Reported: ${escapeHtml(
            formatDateClean(j.createdAt) || "—"
          )}</div>
          <div class="completed-line meta-line">Completed: ${escapeHtml(when || "—")}</div>
        </div>
        ${renderEngineerNotesSavedSection(j)}
        <div class="job-actions job-actions-single">
          <button type="button" class="btn-del" onclick='deleteJob(${qid})'>Delete</button>
        </div>
      </div>
    `;
}

function renderDeletedCard(j) {
  const idForAttr = jobIdForDomAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button"></div>`
    : "";
  const delWhen = formatDateClean(j.deletedAt) || "—";
  const prev = (j.previousStatus && String(j.previousStatus).trim()) || "—";
  return `
      <div class="job job-card deleted job--deleted job-card-shell job-deleted${jobCardLogsExpandedClass(
    j
  )}" data-job-id="${idForAttr}" data-status="Deleted">
        <span class="job-status-badge job-status-badge--deleted">DELETED</span>
        ${photoBlock}
        <div class="job-body job-meta">
          <div class="job-title"><strong>${escapeHtml(
            j.location
          )}</strong> <span class="job-priority-paren">(${escapeHtml(
    j.priority
  )})</span></div>
          <div class="job-problem">${escapeHtml(j.problem)}</div>
          <div class="reported-by-line meta-line">Reported by: ${escapeHtml(
            j.reportedBy || "—"
          )}</div>
          <div class="deleted-meta-line meta-line">Reported: ${escapeHtml(
            formatDateClean(j.createdAt) || "—"
          )}</div>
          <div class="deleted-meta-line meta-line">Deleted: ${escapeHtml(delWhen)}</div>
          <div class="deleted-meta-line meta-line">Previous status: ${escapeHtml(prev)}</div>
        </div>
        ${renderEngineerNotesSavedSection(j)}
        <div class="job-actions job-actions-deleted">
          <button type="button" class="btn-restore">Restore</button>
          <button type="button" class="btn-permanent-delete">Delete permanently</button>
        </div>
      </div>
    `;
}

function updateDeletedFilterCount() {
  const n = jobs.filter((j) => j.deleted).length;
  const el = document.getElementById("deletedFilterCount");
  if (el) {
    el.textContent = n > 0 ? " (" + n + ")" : "";
  }
}

function showJobsToast(msg) {
  const el = document.getElementById("jobsToast");
  if (!el) return;
  el.textContent = String(msg || "");
  el.hidden = false;
  clearTimeout(showJobsToast._t);
  showJobsToast._t = setTimeout(function () {
    el.hidden = true;
  }, 2500);
}

function addJob() {
  const location = document.getElementById("location").value.trim();
  const problem = document.getElementById("problem").value.trim();
  const priority = document.getElementById("priority").value;
  const fileInput = document.getElementById("jobPhoto");
  const reportedBy = getMainproUser();
  if (!hasMainproLogin()) {
    alert("Select your role first.");
    return;
  }

  if (!location || !problem) {
    alert("Please fill required fields");
    return;
  }

  const file = fileInput && fileInput.files && fileInput.files[0];
  const done = (photo) => {
    const job = {
      id: String(Date.now()) + "-" + String(Math.floor(Math.random() * 1e9)),
      location,
      problem,
      priority,
      reportedBy: reportedBy || "",
      status: "New",
      comments: [],
      photo: photo || "",
      completedAt: "",
      createdAt: new Date().toISOString(),
      pendingUntil: "",
      pendingReason: "",
      deleted: false,
      deletedAt: "",
      previousStatus: "",
    };
    jobs.unshift(job);
    save();
    const locEl = document.getElementById("location");
    const probEl = document.getElementById("problem");
    const priEl = document.getElementById("priority");
    if (locEl) locEl.value = "";
    if (probEl) probEl.value = "";
    if (priEl) priEl.value = "Low";
    if (fileInput) fileInput.value = "";
    const prev = document.getElementById("jobPhotoPreview");
    if (prev) prev.innerHTML = "";
    render();
    setTab("active");
  };

  if (file) {
    const r = new FileReader();
    r.onload = function () {
      done(typeof r.result === "string" ? r.result : "");
    };
    r.onerror = function () {
      done("");
    };
    r.readAsDataURL(file);
  } else {
    done("");
  }
}

function setStatus(id, status) {
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) return;
  if (String(j.status) === String(status)) return;
  j.status = status;
  if (status === "Done") {
    j.completedAt = new Date().toISOString();
    /* Remaining active jobs still show; avoid empty list because filter was e.g. "New". */
    statusFilter = "All";
  } else {
    j.completedAt = "";
  }
  if (status !== "Pending") {
    j.pendingUntil = "";
    j.pendingReason = "";
  }
  if (status === "In Progress") {
    appendSystemComment(j, "Moved to In Progress");
  } else if (status === "Done") {
    appendSystemComment(j, "Job completed");
  }
  save();
  render();
}

function openParkDialog(id) {
  _parkTargetId = String(id);
  const inp = document.getElementById("parkUntilInput");
  if (inp) {
    inp.value = defaultParkDateTimeValue();
    inp.min = minParkDateTimeValue();
  }
  const reasonEl = document.getElementById("parkReasonInput");
  if (reasonEl) reasonEl.value = "";
  const m = document.getElementById("parkModal");
  if (m) m.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeParkDialog() {
  _parkTargetId = null;
  const m = document.getElementById("parkModal");
  if (m) m.hidden = true;
  const reasonEl = document.getElementById("parkReasonInput");
  if (reasonEl) reasonEl.value = "";
  document.body.style.overflow = "";
}

function confirmPark() {
  const id = _parkTargetId;
  if (id == null) return;
  const inp = document.getElementById("parkUntilInput");
  const raw = inp ? String(inp.value).trim() : "";
  if (!raw) {
    alert("Select a date and time.");
    return;
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    alert("Invalid date and time.");
    return;
  }
  if (d.getTime() <= Date.now()) {
    alert("Please choose a time in the future.");
    return;
  }
  const reasonInp = document.getElementById("parkReasonInput");
  const reason = reasonInp ? String(reasonInp.value).trim() : "";
  if (!reason) {
    alert("Enter a reason for pending (e.g. waiting for parts, no access).");
    return;
  }
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) {
    alert("Could not find this job.");
    closeParkDialog();
    return;
  }
  j.status = "Pending";
  j.pendingUntil = d.toISOString();
  j.pendingReason = reason;
  appendSystemComment(j, "Moved to Pending");
  save();
  closeParkDialog();
  render();
}

window.openParkDialog = openParkDialog;
window.closeParkDialog = closeParkDialog;
window.confirmPark = confirmPark;

function flashCommentSaved(id) {
  const want = String(id);
  document.querySelectorAll(".job[data-job-id]").forEach((job) => {
    const got = jobIdFromDomAttr(job.getAttribute("data-job-id"));
    if (got !== want) return;
    const hint = job.querySelector(".comment-saved-hint");
    if (hint) hint.hidden = false;
  });
  clearTimeout(flashCommentSaved._t);
  flashCommentSaved._t = setTimeout(function () {
    document.querySelectorAll(".job[data-job-id]").forEach((job) => {
      const got = jobIdFromDomAttr(job.getAttribute("data-job-id"));
      if (got !== want) return;
      const hint = job.querySelector(".comment-saved-hint");
      if (hint) hint.hidden = true;
    });
  }, 1800);
}

/**
 * Append note to job, save, re-render (field clears), show "Saved".
 */
function saveEngineerNote(btn) {
  const job = btn && btn.closest && btn.closest(".job");
  if (!job) return;
  const id = jobIdFromDomAttr(job.getAttribute("data-job-id"));
  if (id == null) return;
  const ta = job.querySelector("textarea.comment-new");
  const text = ta ? String(ta.value).trim() : "";
  if (!text) return;
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) {
    alert("Could not find this job. Try refreshing the page.");
    return;
  }
  if (!Array.isArray(j.comments)) j.comments = [];
  j.comments.push({
    text,
    createdAt: new Date().toISOString(),
    author: "Engineer",
    type: "info",
  });
  if (ta) ta.value = "";
  save();
  render();
  setTimeout(function () {
    flashCommentSaved(String(id));
  }, 0);
}

window.saveEngineerNote = saveEngineerNote;
window.toggleJobLog = toggleJobLog;

function openPhotoLightbox(src) {
  if (!src || String(src).indexOf("data:image/") !== 0) return;
  const box = document.getElementById("photoLightbox");
  const im = document.getElementById("photoLightboxImg");
  if (!box || !im) return;
  im.src = src;
  im.alt = "Fault photo (full size)";
  box.hidden = false;
  document.body.style.overflow = "hidden";
}

function closePhotoLightbox() {
  const box = document.getElementById("photoLightbox");
  const im = document.getElementById("photoLightboxImg");
  if (im) im.removeAttribute("src");
  if (box) box.hidden = true;
  document.body.style.overflow = "";
}

function deleteJob(id) {
  if (
    !confirm(
      "Move this job to Deleted? You can restore it from the Deleted filter."
    )
  ) {
    return;
  }
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) return;
  j.previousStatus = j.status;
  j.deleted = true;
  j.deletedAt = new Date().toISOString();
  appendSystemComment(j, "Job moved to Deleted");
  save();
  showJobsToast("Job moved to Deleted");
  render();
}

function restoreJob(id) {
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j || !j.deleted) return;
  const st = (j.previousStatus && String(j.previousStatus).trim()) || "New";
  j.deleted = false;
  j.deletedAt = "";
  j.previousStatus = "";
  j.status = st;
  if (st !== "Done") {
    j.completedAt = "";
  }
  appendSystemComment(j, "Job restored");
  save();
  historyViewFilter = "all";
  if (st === "Done") {
    statusFilter = "All";
    setTab("history");
  } else if (
    st === "New" ||
    st === "In Progress" ||
    st === "Pending"
  ) {
    statusFilter = st;
    setTab("active");
  } else {
    statusFilter = "All";
    setTab("active");
  }
  render();
}

function deleteJobPermanently(id) {
  if (!confirm("Permanently delete this job?")) return;
  jobs = jobs.filter((x) => String(x.id) !== String(id));
  save();
  render();
}

window.restoreJob = restoreJob;
window.deleteJobPermanently = deleteJobPermanently;

function setTab(tab) {
  const a = document.getElementById("panel-active");
  const h = document.getElementById("panel-history");
  if (a) a.hidden = tab !== "active";
  if (h) h.hidden = tab !== "history";
  document.querySelectorAll(".tab").forEach(function (el) {
    const on = el.getAttribute("data-tab") === tab;
    el.classList.toggle("active", on);
  });
  updateFilterButtonsActiveState();
  updateDashboardCardHighlight();
}

function bindPhotoPreview() {
  const input = document.getElementById("jobPhoto");
  const prev = document.getElementById("jobPhotoPreview");
  if (!input || !prev) return;
  input.addEventListener("change", function () {
    prev.innerHTML = "";
    const f = input.files && input.files[0];
    if (!f || !f.type || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = function () {
      if (typeof r.result !== "string") return;
      prev.innerHTML =
        '<img class="form-photo-preview" src="' +
        r.result +
        '" alt="Preview">';
    };
    r.readAsDataURL(f);
  });
}

bindPhotoPreview();
(function bindListToolbar() {
  const s = document.getElementById("jobSearch");
  if (s) s.addEventListener("input", render);
})();

(function bindActiveJobsPanelActions() {
  const root = document.getElementById("jobs-active");
  if (!root || root._mainproJobsPanelClickBound) return;
  root._mainproJobsPanelClickBound = true;
  root.addEventListener("click", function (e) {
    let t = e.target;
    if (!t) return;
    if (t.nodeType !== 1) {
      t = t.parentElement;
    }
    if (!t || !t.closest) return;
    const restoreBtn = t.closest(".btn-restore");
    const permBtn = t.closest(".btn-permanent-delete");
    if (!restoreBtn && !permBtn) return;
    const jobEl = t.closest(".job");
    if (!jobEl) return;
    const rawId = jobEl.getAttribute("data-job-id");
    const jid = jobIdFromDomAttr(rawId);
    if (jid == null) return;
    e.preventDefault();
    if (restoreBtn) {
      restoreJob(jid);
    } else {
      deleteJobPermanently(jid);
    }
  });
})();

setInterval(function () {
  if (!hasMainproLogin()) return;
  const am = document.getElementById("appMain");
  if (!am || am.hidden) return;
  render();
}, 30000);

/* Thumbnail / full-screen photo */
document.addEventListener("click", function (e) {
  const logBtn = e.target && e.target.closest && e.target.closest(".btn-job-log-toggle");
  if (logBtn) {
    e.preventDefault();
    const raw = logBtn.getAttribute("data-job-id");
    const id = jobIdFromDomAttr(raw);
    if (id != null) toggleJobLog(id);
    return;
  }
  const t = e.target;
  if (t && t.classList && t.classList.contains("job-photo-thumb")) {
    e.preventDefault();
    const src = t.getAttribute("src");
    openPhotoLightbox(src);
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" || e.key === "Esc") {
    const parkM = document.getElementById("parkModal");
    if (parkM && !parkM.hidden) {
      closeParkDialog();
      return;
    }
    const box = document.getElementById("photoLightbox");
    if (box && !box.hidden) closePhotoLightbox();
  }
  const t = e.target;
  if (t && t.classList && t.classList.contains("job-photo-thumb") && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    openPhotoLightbox(t.getAttribute("src"));
  }
});

applyAuthUi();
