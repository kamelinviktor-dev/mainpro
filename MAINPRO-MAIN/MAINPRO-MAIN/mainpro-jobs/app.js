let jobs = loadJobs();
/** All | New | In Progress | Pending — History tab for completed */
let statusFilter = "All";
/** set when opening Park modal */
let _parkTargetId = null;

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
    if (x.engineerComment == null) {
      x.engineerComment = "";
      changed = true;
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
    return x;
  });
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
  localStorage.setItem("jobs", JSON.stringify(jobs));
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

/**
 * If Pending until time has passed, return job to New and clear pendingUntil.
 */
function processExpiredPending() {
  const now = Date.now();
  let changed = false;
  jobs.forEach((j) => {
    if (j.status !== "Pending" || !j.pendingUntil) return;
    const t = new Date(j.pendingUntil).getTime();
    if (isNaN(t)) {
      j.status = "New";
      j.pendingUntil = "";
      changed = true;
      return;
    }
    if (t > now) return;
    j.status = "New";
    j.pendingUntil = "";
    changed = true;
  });
  if (changed) {
    try {
      localStorage.setItem("jobs", JSON.stringify(jobs));
    } catch (e) {
      console.warn("Could not save after pending expiry", e);
    }
  }
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

function formatWhen(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

/** Job reported time (createdAt) — local string or em dash. */
function formatCreatedDisplay(createdAt) {
  if (createdAt == null || createdAt === "") return "—";
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function getSearchQuery() {
  const el = document.getElementById("jobSearch");
  return ((el && el.value) || "").trim().toLowerCase();
}

function matchesJobSearch(j, q) {
  if (!q) return true;
  const parts = [
    j.location,
    j.problem,
    j.reportedBy,
    j.priority,
    j.status,
    j.engineerComment,
    j.pendingUntil,
  ].map((v) => String(v == null ? "" : v).toLowerCase());
  return parts.some((p) => p.indexOf(q) >= 0);
}

/**
 * Active list filters. Stale "Done" filter (old UI) → show all actives.
 */
function matchesStatusFilterForActive(j) {
  if (statusFilter === "All" || statusFilter === "Done") return true;
  return j.status === statusFilter;
}

function setStatusFilter(s) {
  statusFilter = s;
  render();
}

function render() {
  processExpiredPending();

  const activeEl = document.getElementById("jobs-active");
  const historyEl = document.getElementById("jobs-history");
  if (activeEl) activeEl.innerHTML = "";
  if (historyEl) historyEl.innerHTML = "";

  const q = getSearchQuery();

  let actives = jobs.filter((j) => isActiveStatus(j.status));
  actives = actives.filter((j) => matchesStatusFilterForActive(j));
  actives = actives.filter((j) => matchesJobSearch(j, q));

  let doneList = jobs
    .filter((j) => j.status === "Done")
    .slice()
    .sort((a, b) => {
      const ta = a.completedAt || "";
      const tb = b.completedAt || "";
      return tb.localeCompare(ta);
    });
  /* History: all completed; use the History tab — only search filters this list. */
  doneList = doneList.filter((j) => matchesJobSearch(j, q));

  document.querySelectorAll("[data-status-filter]").forEach((el) => {
    const v = el.getAttribute("data-status-filter");
    el.classList.toggle("active", v === statusFilter);
  });

  if (actives.length === 0 && activeEl) {
    activeEl.innerHTML =
      '<p class="empty-hint">No active jobs to show. Try clearing search or set filter to <strong>All</strong>. Submit a new issue above if needed.</p>';
  } else {
    actives.forEach((j) => {
      activeEl.innerHTML += renderActiveCard(j);
    });
  }

  if (doneList.length === 0 && historyEl) {
    historyEl.innerHTML = '<p class="empty-hint">No completed jobs yet.</p>';
  } else {
    doneList.forEach((j) => {
      historyEl.innerHTML += renderHistoryCard(j);
    });
  }
}

function idAttr(id) {
  return JSON.stringify(String(id));
}

/** Same label + saved-text block in Active and History (single source of truth). */
function renderEngineerNotesSavedSection(j) {
  const savedNotes = (j.engineerComment || "").trim();
  const body = savedNotes
    ? `<div class="comment-saved-display">${escapeHtml(savedNotes)}</div>`
    : `<div class="comment-saved-display comment-saved-empty">No notes yet</div>`;
  return `<label class="comment-label">Engineer notes (saved)</label>${body}`;
}

function renderActiveCard(j) {
  const st = j.status;
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
  const pendingLine =
    st === "Pending" && (j.pendingUntil || "").trim()
      ? `<div class="pending-until-line">Pending until: ${escapeHtml(
          formatWhen(j.pendingUntil) || "—"
        )}</div>`
      : st === "Pending"
        ? `<div class="pending-until-line">Pending until: —</div>`
        : "";
  return `
      <div class="job" data-job-id="${idForAttr}" data-status="${escapeHtml(st)}">
        ${photoBlock}
        <div class="job-body">
          <b>${escapeHtml(j.location)}</b> (${escapeHtml(j.priority)})<br>
          ${escapeHtml(j.problem)}<br>
          <div class="reported-by-line">Reported by: ${escapeHtml(
            j.reportedBy || "—"
          )}</div>
          <div class="created-line">Reported: ${escapeHtml(
            formatCreatedDisplay(j.createdAt)
          )}</div>
          <span class="status-line">Status: ${escapeHtml(st)}</span>
          ${pendingLine}
        </div>
        ${renderEngineerNotesSavedSection(j)}
        <label class="comment-label">Add a note</label>
        <textarea class="comment-field comment-new" rows="2" placeholder="Type a note, then tap Save note (e.g. reason for park)"></textarea>
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
  const qid = idAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button"></div>`
    : "";
  const when = formatWhen(j.completedAt);
  return `
      <div class="job job-history" data-job-id="${jobIdForDomAttr(j.id)}" data-status="Done">
        ${photoBlock}
        <div class="job-body">
          <b>${escapeHtml(j.location)}</b> (${escapeHtml(j.priority)})<br>
          ${escapeHtml(j.problem)}<br>
          <div class="reported-by-line">Reported by: ${escapeHtml(
            j.reportedBy || "—"
          )}</div>
          <div class="created-line">Reported: ${escapeHtml(
            formatCreatedDisplay(j.createdAt)
          )}</div>
          <div class="completed-line">Completed: ${escapeHtml(when || "—")}</div>
        </div>
        ${renderEngineerNotesSavedSection(j)}
        <div class="job-actions job-actions-single">
          <button type="button" class="btn-del" onclick='deleteJob(${qid})'>Delete</button>
        </div>
      </div>
    `;
}

function addJob() {
  const location = document.getElementById("location").value.trim();
  const problem = document.getElementById("problem").value.trim();
  const priority = document.getElementById("priority").value;
  const reportedBy = document.getElementById("reportedBy")
    ? document.getElementById("reportedBy").value
    : "";
  const fileInput = document.getElementById("jobPhoto");

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
      engineerComment: "",
      photo: photo || "",
      completedAt: "",
      createdAt: new Date().toISOString(),
      pendingUntil: "",
    };
    jobs.unshift(job);
    save();
    const locEl = document.getElementById("location");
    const probEl = document.getElementById("problem");
    const priEl = document.getElementById("priority");
    if (locEl) locEl.value = "";
    if (probEl) probEl.value = "";
    if (priEl) priEl.value = "Low";
    const repEl = document.getElementById("reportedBy");
    if (repEl) repEl.value = "Reception";
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
  j.status = status;
  if (status === "Done") {
    j.completedAt = new Date().toISOString();
    j.pendingUntil = "";
    /* Remaining active jobs still show; avoid empty list because filter was e.g. "New". */
    statusFilter = "All";
  } else {
    j.completedAt = "";
  }
  if (status !== "Pending") {
    j.pendingUntil = "";
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
  const m = document.getElementById("parkModal");
  if (m) m.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeParkDialog() {
  _parkTargetId = null;
  const m = document.getElementById("parkModal");
  if (m) m.hidden = true;
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
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) {
    alert("Could not find this job.");
    closeParkDialog();
    return;
  }
  j.status = "Pending";
  j.pendingUntil = d.toISOString();
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
  if (!text) {
    alert("Please type a note first.");
    return;
  }
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) {
    alert("Could not find this job. Try refreshing the page.");
    return;
  }
  const cur = (j.engineerComment || "").trim();
  j.engineerComment = cur ? cur + "\n\n" + text : text;
  save();
  render();
  setTimeout(function () {
    flashCommentSaved(String(id));
  }, 0);
}

window.saveEngineerNote = saveEngineerNote;

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
  if (!confirm("Delete this job?")) return;
  jobs = jobs.filter((x) => String(x.id) !== String(id));
  save();
  render();
}

function setTab(tab) {
  const a = document.getElementById("panel-active");
  const h = document.getElementById("panel-history");
  if (a) a.hidden = tab !== "active";
  if (h) h.hidden = tab !== "history";
  document.querySelectorAll(".tab").forEach(function (el) {
    const on = el.getAttribute("data-tab") === tab;
    el.classList.toggle("active", on);
  });
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

/* Thumbnail / full-screen photo */
document.addEventListener("click", function (e) {
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

render();
setTab("active");
