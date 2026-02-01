/* ==== MAINPRO CALENDAR v65.6c – Smart Dashboard + AutoBackup + Audit Trail ==== */

// === v65.6 Update Module – Smart Dashboard + AutoBackup + Audit Trail ===

// GLOBAL patch hook
(() => {
  const logKey = 'mainpro_audit_v1';
  const backupKey = 'mainpro_autobackup_v1';

  // === 1. Audit Log system ===
  window.MainPro_Audit = {
    add: (action, detail = {}) => {
      try {
        const logs = JSON.parse(localStorage.getItem(logKey) || '[]');
        const entry = {
          id: Date.now(),
          time: new Date().toLocaleString(),
          action,
          detail
        };
        logs.unshift(entry);
        localStorage.setItem(logKey, JSON.stringify(logs.slice(0, 200))); // keep last 200
        console.log(`[AUDIT] ${action}`, detail);
      } catch (e) { console.warn('Audit save failed', e); }
    },
    get: () => {
      try { return JSON.parse(localStorage.getItem(logKey) || '[]'); }
      catch { return []; }
    }
  };

  // Hook for notifications
  window.MainPro_Notify = (msg) => {
    try {
      const t = document.getElementById('mp-toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._hideTimer);
      t._hideTimer = setTimeout(() => t.classList.remove('show'), 2500);
    } catch {}
  };

  // === 2. Auto Backup ===
  function runAutoBackup() {
    try {
      const now = new Date();
      const key = `${backupKey}_${now.toISOString().slice(0, 10)}`;
      const data = {
        time: now.toLocaleString(),
        events: localStorage.getItem('mainpro_events_v65'),
        settings: localStorage.getItem('mainpro_settings_v65'),
        cats: localStorage.getItem('mainpro_categories_v65'),
        ui: localStorage.getItem('mainpro_ui_v65')
      };
      localStorage.setItem(key, JSON.stringify(data));
      console.log('[AUTO BACKUP SAVED]', key);
    } catch (err) {
      console.error('AutoBackup failed', err);
    }
  }

  setInterval(runAutoBackup, 3600000); // every hour
  runAutoBackup();

  // === 3. Smart Dashboard ===
  window.addEventListener('DOMContentLoaded', () => {
    try {
      const root = document.querySelector('#calendar-shell');
      if (!root) return;
      const bar = document.createElement('div');
      bar.id = 'mp-dashboard';
      bar.className = 'mb-3 flex gap-2 text-sm font-medium';
      bar.innerHTML = `
        <div class="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-700">🟡 Pending: <span id="dash-pending">0</span></div>
        <div class="px-3 py-2 rounded-lg bg-green-100 text-green-700">🟢 Done: <span id="dash-done">0</span></div>
        <div class="px-3 py-2 rounded-lg bg-rose-100 text-rose-700">🔴 Missed: <span id="dash-missed">0</span></div>
      `;
      root.parentElement.insertBefore(bar, root);

      function refreshDashboard() {
        try {
          const ev = JSON.parse(localStorage.getItem('mainpro_events_v65') || '[]');
          const p = ev.filter(e => e.status === 'pending').length;
          const d = ev.filter(e => e.status === 'done').length;
          const m = ev.filter(e => e.status === 'missed').length;
          document.getElementById('dash-pending').textContent = p;
          document.getElementById('dash-done').textContent = d;
          document.getElementById('dash-missed').textContent = m;
        } catch {}
      }

      refreshDashboard();
      setInterval(refreshDashboard, 10000); // update every 10s
    } catch (err) { console.error('Dashboard error', err); }
  });

  // === 4. Global event hooks for Audit ===
  const origSetItem = localStorage.setItem;
  localStorage.setItem = function (key, val) {
    try {
      if (key === 'mainpro_events_v65') {
        const ev = JSON.parse(val || '[]');
        window.MainPro_Audit.add('EVENTS_UPDATE', { count: ev.length });
      }
    } catch {}
    return origSetItem.apply(this, arguments);
  };

})();

const { useState, useEffect, useRef } = React;
const { jsPDF } = window.jspdf;
const FC = window.FullCalendar;

// === Utility functions ===
const todayISO = () => new Date().toISOString().slice(0, 10);
const statusColor = s =>
  s === "done" ? "#22c55e" : s === "missed" ? "#ef4444" : "#eab308";

// === Default categories ===
const DEFAULT_CATS = [
  { id: "maintenance", name: "Maintenance", color: "#22c55e" },
  { id: "compliance", name: "Compliance", color: "#3b82f6" },
  { id: "safety", name: "Safety / Fire", color: "#f97316" },
  { id: "training", name: "Training", color: "#eab308" },
  { id: "other", name: "Other", color: "#a78bfa" },
];

function MainPro() {
  // === States ===
  const [events, setEvents] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("mainpro_events_v65")) || [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mainpro_categories_v65"));
      return saved?.length ? saved : DEFAULT_CATS;
    } catch {
      return DEFAULT_CATS;
    }
  });

  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("dayGridMonth");
  const [monthLabel, setMonthLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  
  // === Event counts ===
  const done = events.filter(e => e.status === 'done').length;
  const pending = events.filter(e => e.status === 'pending').length;
  const missed = events.filter(e => e.status === 'missed').length;
  
  const [form, setForm] = useState({
    title: "",
    date: todayISO(),
    time: "09:00",
    status: "pending",
    catId: "maintenance",
  });

  const calRef = useRef(null);
  const eventsRef = useRef(events);

  useEffect(() => {
    eventsRef.current = events;
    localStorage.setItem("mainpro_events_v65", JSON.stringify(events));
  }, [events]);

  // === Initialize Calendar ===
  useEffect(() => {
    const el = document.getElementById("calendar");
    const cal = new FC.Calendar(el, {
      initialView: view,
      firstDay: 1,
      selectable: true,
      editable: true,
      nowIndicator: true,
      headerToolbar: false,
      height: "100%",
      datesSet(info) {
        const date = info.view.currentStart;
        setMonthLabel(
          date.toLocaleString(undefined, { month: "long", year: "numeric" })
        );
      },

      eventClick(info) {
        alert("Task: " + info.event.title);
      },

      dateClick(info) {
        setForm(f => ({ ...f, date: info.dateStr }));
        setShowAdd(true);
      },

      eventContent(arg) {
        const e = arg.event.extendedProps;
        const cat = categories.find(c => c.id === e.catId);
        const dot = document.createElement("span");
        dot.style.width = "8px";
        dot.style.height = "8px";
        dot.style.borderRadius = "9999px";
        dot.style.background = cat?.color || "#ccc";
        dot.style.display = "inline-block";

        const text = document.createElement("span");
        text.textContent = " " + arg.event.title;

        const wrapper = document.createElement("div");
        wrapper.appendChild(dot);
        wrapper.appendChild(text);
        return { domNodes: [wrapper] };
      },

      eventDidMount(arg) {
        const el = arg.el;
        let tooltip = document.getElementById("mp-tooltip");
        if (!tooltip) {
          tooltip = document.createElement("div");
          tooltip.id = "mp-tooltip";
          tooltip.className = "mp-pop";
          document.body.appendChild(tooltip);
        }

        el.addEventListener("mouseenter", () => {
          const e = arg.event.extendedProps;
          tooltip.innerHTML = `
            <div class="t">${arg.event.title}</div>
            <div class="row"><span class="dot" style="background:${statusColor(
              e.status
            )}"></span><span>${e.status}</span></div>
          `;
          const r = el.getBoundingClientRect();
          tooltip.style.left = r.left + window.scrollX + 10 + "px";
          tooltip.style.top = r.top + window.scrollY + 25 + "px";
          tooltip.classList.add("show");
        });

        el.addEventListener("mouseleave", () =>
          tooltip.classList.remove("show")
        );
      },
    });

    cal.render();
    calRef.current = cal;
    refreshCalendar(events);
  }, []);

  // === Refresh calendar events ===
  function refreshCalendar(list) {
    const cal = calRef.current;
    if (!cal) return;
    cal.removeAllEvents();
    const src =
      filter === "all" ? list : list.filter(e => e.status === filter);
    src.forEach(e => {
      cal.addEvent({
        id: e.id,
        title: e.title,
        start: e.date + "T09:00",
        color: statusColor(e.status),
        extendedProps: { ...e },
      });
    });
  }

  // === Add task ===
  function addEvent() {
    if (!form.title) return alert("Enter title");
    const newE = {
      id: Date.now(),
      title: form.title,
      date: form.date,
      status: form.status,
      catId: form.catId,
    };
    setEvents(prev => [...prev, newE]);
    setShowAdd(false);
  }

  return React.createElement(
    "div",
    null,
    React.createElement("header", null, "MainPro Calendar v65.6c 🛠️"),
    
    // === Notification Toast ===
    React.createElement("div", {
      id: "mp-toast",
      className: "fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 opacity-0 transition-opacity duration-300",
      style: { display: "none" }
    }, "Notification"),
    
    // Calendar + Status Bar
    React.createElement('div', null,
      React.createElement('div',{id:"calendar-shell", className:"bg-white rounded-xl p-2 sm:p-4 shadow relative"},
        React.createElement('div',{id:"calendar"})
      ),
      React.createElement('div', {className:"mt-4 flex justify-center gap-6 text-sm font-semibold"},
        React.createElement('div',{className:"flex items-center gap-1 text-yellow-600"},
          '🟡 Pending:', ' ', pending
        ),
        React.createElement('div',{className:"flex items-center gap-1 text-green-600"},
          '🟢 Done:', ' ', done
        ),
        React.createElement('div',{className:"flex items-center gap-1 text-red-600"},
          '🔴 Missed:', ' ', missed
        )
      )
    ),

    showAdd &&
      React.createElement(
        "div",
        {
          className:
            "fixed inset-0 bg-black/40 flex items-center justify-center z-50",
        },
        React.createElement(
          "div",
          { className: "bg-white rounded-xl p-5 shadow-xl w-80" },
          React.createElement("h2", null, "Add Task"),
          React.createElement("input", {
            placeholder: "Title",
            value: form.title,
            onChange: e => setForm({ ...form, title: e.target.value }),
            className: "border w-full mb-2 p-2 rounded",
          }),
          React.createElement("input", {
            type: "date",
            value: form.date,
            onChange: e => setForm({ ...form, date: e.target.value }),
            className: "border w-full mb-2 p-2 rounded",
          }),
          React.createElement(
            "button",
            {
              onClick: addEvent,
              className:
                "bg-yellow-500 text-white px-3 py-2 rounded hover:bg-yellow-600 w-full",
            },
            "Save"
          )
        )
      )
  );
}

// === v65.6c Smart Daily Summary ===
(() => {
  function showDailySummary() {
    try {
      const evRaw = JSON.parse(localStorage.getItem('mainpro_events_v65') || '[]');
      if (!Array.isArray(evRaw) || evRaw.length === 0) return;

      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      const todayISO = today.toISOString().slice(0, 10);
      const tomorrowISO = tomorrow.toISOString().slice(0, 10);

      const todayTasks = evRaw.filter(e => (e.start || e.date || '').slice(0,10) === todayISO);
      const tomorrowTasks = evRaw.filter(e => (e.start || e.date || '').slice(0,10) === tomorrowISO);

      const tPending = todayTasks.filter(e => e.status === 'pending').length;
      const tDone = todayTasks.filter(e => e.status === 'done').length;
      const tMissed = todayTasks.filter(e => e.status === 'missed').length;

      const msgToday = `📅 Today: ${tPending} pending, ${tDone} done, ${tMissed} missed.`;
      const msgTomorrow = `📆 Tomorrow: ${tomorrowTasks.length} tasks scheduled.`;

      const t = document.getElementById('mp-toast');
      if (!t) return;

      t.innerHTML = `${msgToday}<br>${msgTomorrow}`;
      t.classList.add('show');
      clearTimeout(t._hideTimer);
      t._hideTimer = setTimeout(() => t.classList.remove('show'), 5500);
    } catch (err) {
      console.warn('Daily summary error', err);
    }
  }

  window.addEventListener('load', () => {
    setTimeout(showDailySummary, 1200); // запуск через 1.2 сек после загрузки
  });
})();

// === Render ===
ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(MainPro)
);