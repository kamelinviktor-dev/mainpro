let jobs = loadJobs();
/** All | New | In Progress — use History tab for completed jobs */
let statusFilter = "All";

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

function isActiveStatus(status) {
  return status === "New" || status === "In Progress";
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
  const parts = [j.location, j.problem, j.reportedBy, j.priority, j.status].map(
    (v) => String(v == null ? "" : v).toLowerCase()
  );
  return parts.some((p) => p.indexOf(q) >= 0);
}

/**
 * Active list: New / In Progress only. If a stale filter was "Done" (old UI), show all.
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

function renderActiveCard(j) {
  const st = j.status;
  const qid = idAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt=""></div>`
    : "";
  const commentVal = escapeHtml(j.engineerComment || "");
  const sInProgress = JSON.stringify("In Progress");
  const sDone = JSON.stringify("Done");
  const progressBtn =
    st === "New"
      ? `<button type="button" class="btn-sec" onclick='setStatus(${qid}, ${sInProgress})'>In Progress</button>`
      : "";
  return `
      <div class="job" data-status="${escapeHtml(st)}">
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
        </div>
        <label class="comment-label">Engineer comment / work done</label>
        <textarea class="comment-field" rows="2" placeholder="Notes…" onchange='saveComment(${qid}, this.value)'>${commentVal}</textarea>
        <div class="job-actions">
          ${progressBtn}
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
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt=""></div>`
    : "";
  const when = formatWhen(j.completedAt);
  const comment = (j.engineerComment || "").trim();
  const commentBlock = comment
    ? `<div class="history-comment"><strong>Work / notes:</strong><br>${escapeHtml(
        comment
      )}</div>`
    : '<div class="history-comment muted">No engineer notes</div>';
  return `
      <div class="job job-history" data-status="Done">
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
        ${commentBlock}
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
    };
    jobs.push(job);
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
    /* Remaining active jobs still show; avoid empty list because filter was e.g. "New". */
    statusFilter = "All";
  } else {
    j.completedAt = "";
  }
  save();
  render();
}

function saveComment(id, value) {
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) return;
  j.engineerComment = value;
  save();
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
render();
setTab("active");
