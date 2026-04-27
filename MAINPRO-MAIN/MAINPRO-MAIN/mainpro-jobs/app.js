/**
 * statusFilter: KPI row + dashboard (All, New, In Progress, …). "Done" kept for old localStorage.
 */
let statusFilter = "All";
/** "All" | engineer name — filter by job.assignedTo */
let engineerFilter = "All";
/** My Jobs quick filter: uses matchesMyJobsFilter (role-based). */
let myJobsFilterActive = false;
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

/** Assign dropdown + filter (temporary list). */
const ASSIGNED_ENGINEER_OPTIONS = [
  "Unassigned",
  "Engineer 1",
  "Engineer 2",
  "Engineer 3",
  "Manager",
];

/** Set when a job is open in full-screen detail (narrow ≤600px or desktop ≥900px). */
let mobileJobDetailId = null;
/** Preserved list scroll so closing overlay restores it. */
let mobileJobsListScrollY = 0;
/** On narrow layout: hide + Job FAB when user has scrolled down the list. */
let mobileFabHiddenByScroll = false;
let mobileFabLastScrollY = 0;

const MOBILE_FAB_TOP_ZONE_PX = 88;
const MOBILE_FAB_SCROLL_DELTA = 10;
/** Поиск: отложенный render, меньше лагов при быстром вводе. */
const JOB_SEARCH_DEBOUNCE_MS = 280;
let _jobSearchDebounceTimer = null;
/** Bump with meaningful app changes; included in JSON export. */
const MAINPRO_JOBS_APP_VERSION = "1.3.0";
/** Jobs payload version (export, browser backup). Increment when job shape changes. */
const MAINPRO_JOBS_DATA_SCHEMA = 1;
const MAINPRO_UI_LANG_KEY = "mainpro_ui_lang";
const MAINPRO_BROWSER_BACKUP_KEY = "mainpro_jobs_browser_snapshot";
const MAINPRO_AUTOBACKUP_ENABLED_KEY = "mainpro_jobs_autobackup_enabled";
const MAINPRO_ONBOARDING_KEY = "mainpro_jobs_onboarding_ok";
const AUTO_BACKUP_INTERVAL_MS = 4 * 60 * 60 * 1000;

const MAINPRO_I18N = {
  en: {
    appTitle: "MainPro Jobs",
    loginTitle: "Select your role",
    loginSub: "Who is using this device right now?",
    reportTitle: "Report a Job",
    tabActive: "Active Jobs",
    tabHistory: "History",
    searchPh: "Search jobs…",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    importMerge: "Merge JSON",
    exportCsv: "Export CSV",
    changeUser: "Change user",
    newJob: "+ New Job",
    settings: "Settings",
    help: "Help",
    language: "Language",
    kpiAll: "All",
    kpiNew: "New",
    kpiInProgress: "In progress",
    kpiPending: "Pending",
    kpiOverdue: "Overdue",
    kpiDoneToday: "Done today",
    kpiDeleted: "Deleted",
    lang: "EN",
    langNext: "RU",
    roomPh: "Room / area",
    problemPh: "Describe the problem",
    emptyActive: "No open jobs match your filters. Clear search or set status to <strong>All</strong>, or add a new job from above.",
    emptyDeleted: "No deleted jobs. Items stay here for 7 days, then are removed automatically.",
    emptyHistory: "No completed jobs match your search or filters yet.",
    emptyHistoryToday:
      "No jobs completed on this day at the current filters. Try &quot;All&quot; history or clear search.",
    resetFilters: "Reset filters &amp; search",
    clearFiltersShort: "Clear filters",
    listResultLine: "{n} jobs",
    emptyHintFilterSearch: "Search is active",
    emptyHintFilterMyJobs: "“My jobs” is on",
    emptyHintFilterEngineer: "Engineer filter: {name}",
    emptyHintFilterStatus: "Status filter: {status}",
    emptyHintFilterDeleted: "Viewing deleted jobs only",
    emptyHintFilterHistoryToday: "“Done today” in History is on",
    autobackupLabel: "Browser backup (every ~4h + on user change)",
    autobackupHint: "Keeps a second copy in this browser’s storage. Not a replacement for Export JSON.",
    restoreBrowserBackup: "Restore from browser backup",
    lastBrowserBackup: "Last backup: {t}",
    noBrowserBackup: "No browser backup yet",
    importSchemaNewer:
      "This file needs a newer app version. Update MainPro Jobs, then import again.",
    onboardingTitle: "Welcome",
    onboardingStep1:
      "Use <strong>Active jobs</strong> and <strong>History</strong> to switch lists.",
    onboardingStep2:
      "The tiles show counts — tap one to filter, or <strong>All</strong> to see everything open.",
    onboardingStep3:
      "Filter by <strong>Engineer</strong> or <strong>My jobs</strong> to focus your work. Clear filters any time.",
    onboardingNext: "Next",
    onboardingSkip: "Skip",
    onboardingDone: "Got it",
    onboardingDontShow: "Don’t show again",
    swUpdateLine: "A new version is ready",
    swUpdateRefresh: "Refresh",
    swUpdateDismiss: "Dismiss",
    backupRestored: "Browser backup applied",
    desktopPageTitle: "Dashboard",
    desktopPageSubtitle: "Welcome back — here's today's job overview.",
    desktopTagline: "Intelligent Hotel Operations",
    desktopNavDashboard: "Dashboard",
    desktopNavJobs: "Jobs",
    desktopNavCalendar: "Calendar",
    desktopNavLocations: "Locations",
    desktopNavReports: "Reports",
    desktopNavSettings: "Settings",
    desktopRecentJobs: "Recent jobs",
    desktopThJobRoom: "Job / room",
    desktopThDescription: "Description",
    desktopThPriority: "Priority",
    desktopThAssigned: "Assigned",
    desktopThStatus: "Status",
    desktopThUpdated: "Updated",
    desktopThAction: "Action",
    desktopPriBy: "Jobs by priority",
    desktopLabelPriCritical: "Critical",
    desktopLabelPriHigh: "High",
    desktopLabelPriMedium: "Medium",
    desktopLabelPriLow: "Low",
    desktopQaTitle: "Quick actions",
    desktopQaCreate: "Create new job",
    desktopQaView: "View",
    desktopNoRecent: "No jobs yet.",
    desktopActive: "Active",
    desktopNavAssets: "Assets",
    desktopNavUsers: "Users",
    desktopKpiSubPlus: "+{n} today",
    desktopKpiOverdueAttn: "Needs attention",
    desktopThJob: "Job",
    desktopThRoom: "Room",
    desktopThEngineer: "Engineer",
    desktopPriByDonut: "Jobs by priority",
    desktopViewAllJobs: "View all jobs",
    desktopUpcomingTitle: "Upcoming (7 days)",
    desktopUpcomingToday: "Today",
    desktopUpcomingJobs: "{n} jobs",
    desktopQaAssign: "Assign engineer",
    desktopQaCalendar: "View calendar",
    desktopRoleAdmin: "Administrator",
    desktopRoleUser: "Team member",
    desktopNotifEmpty: "No new notifications",
    desktopCalendarMsg: "Calendar is coming in a later update.",
    desktopQaSearchHint: "Search jobs",
    desktopDonutTotalLabel: "Total",
    jobCreatedToast: "Job created",
    reportCancel: "Cancel",
  },
  ru: {
    appTitle: "MainPro — заявки",
    loginTitle: "Выберите роль",
    loginSub: "Кто сейчас с этой страницей работает?",
    reportTitle: "Сообщить о заявке",
    tabActive: "Активные",
    tabHistory: "История",
    searchPh: "Поиск заявок…",
    exportJson: "Экспорт JSON",
    importJson: "Импорт JSON",
    importMerge: "Слияние JSON",
    exportCsv: "Экспорт CSV",
    changeUser: "Сменить пользователя",
    newJob: "+ Заявка",
    settings: "Настройки",
    help: "Справка",
    language: "Язык",
    kpiAll: "Все",
    kpiNew: "Новые",
    kpiInProgress: "В работе",
    kpiPending: "Ожидание",
    kpiOverdue: "Просрочка",
    kpiDoneToday: "Сегодня",
    kpiDeleted: "Удалённые",
    lang: "RU",
    langNext: "EN",
    roomPh: "Комната / зона",
    problemPh: "Опишите проблему",
    emptyActive:
      "Нет открытых заявок по фильтрам. Сбросьте поиск или статус <strong>All</strong>, или создайте заявку выше.",
    emptyDeleted: "Нет удалённых заявок. Они хранятся 7 дней, затем очищаются.",
    emptyHistory: "Нет завершённых заявок по поиску или фильтрам.",
    emptyHistoryToday: "Сегодня нет по текущим фильтрам. Попробуйте весь период или сбросьте поиск.",
    resetFilters: "Сбросить фильтры и поиск",
    clearFiltersShort: "Сбросить фильтры",
    listResultLine: "{n} заявок",
    emptyHintFilterSearch: "Активен поиск",
    emptyHintFilterMyJobs: "Включён фильтр «Мои»",
    emptyHintFilterEngineer: "Инженер: {name}",
    emptyHintFilterStatus: "Статус: {status}",
    emptyHintFilterDeleted: "Показаны только удалённые",
    emptyHintFilterHistoryToday: "В истории выбрано «Сегодня»",
    autobackupLabel: "Копия в браузере (~каждые 4 ч + при смене пользователя)",
    autobackupHint:
      "Вторая копия в памяти браузера. Не заменяет ручной экспорт JSON.",
    restoreBrowserBackup: "Восстановить из копии в браузере",
    lastBrowserBackup: "Копия: {t}",
    noBrowserBackup: "Копии в браузере ещё нет",
    importSchemaNewer:
      "Файл требует более новой версии приложения. Обновите MainPro Jobs и импортируйте снова.",
    onboardingTitle: "Добро пожаловать",
    onboardingStep1:
      "Переключайте <strong>Активные</strong> и <strong>Историю</strong> вверху.",
    onboardingStep2:
      "Плитки — счётчики. Нажмите на статус для фильтра или <strong>Все</strong> для полного списка.",
    onboardingStep3:
      "Ряд <strong>Инженер</strong> и <strong>Мои заявки</strong> сужают выдачу. «Сбросить фильтры» вернёт всё.",
    onboardingNext: "Далее",
    onboardingSkip: "Пропустить",
    onboardingDone: "Понятно",
    onboardingDontShow: "Больше не показывать",
    swUpdateLine: "Доступна новая версия",
    swUpdateRefresh: "Обновить",
    swUpdateDismiss: "Скрыть",
    backupRestored: "Копия из браузера применена",
    desktopPageTitle: "Панель",
    desktopPageSubtitle: "С возвращением — обзор заявок на сегодня.",
    desktopTagline: "Интеллектуальные операции отеля",
    desktopNavDashboard: "Панель",
    desktopNavJobs: "Заявки",
    desktopNavCalendar: "Календарь",
    desktopNavLocations: "Локации",
    desktopNavReports: "Отчёты",
    desktopNavSettings: "Настройки",
    desktopRecentJobs: "Недавние заявки",
    desktopThJobRoom: "Заявка / зона",
    desktopThDescription: "Описание",
    desktopThPriority: "Приоритет",
    desktopThAssigned: "Назначено",
    desktopThStatus: "Статус",
    desktopThUpdated: "Обновлено",
    desktopThAction: "Действие",
    desktopPriBy: "По приоритету",
    desktopLabelPriCritical: "Критично",
    desktopLabelPriHigh: "Высокий",
    desktopLabelPriMedium: "Средний",
    desktopLabelPriLow: "Низкий",
    desktopQaTitle: "Быстрые действия",
    desktopQaCreate: "Новая заявка",
    desktopQaView: "Смотреть",
    desktopNoRecent: "Пока нет заявок.",
    desktopActive: "Активен",
    desktopNavAssets: "Активы",
    desktopNavUsers: "Пользователи",
    desktopKpiSubPlus: "+{n} сегодня",
    desktopKpiOverdueAttn: "Нужен контроль",
    desktopThJob: "Заявка",
    desktopThRoom: "Комната",
    desktopThEngineer: "Инженер",
    desktopPriByDonut: "По приоритету",
    desktopViewAllJobs: "Все заявки",
    desktopUpcomingTitle: "Ближайшие 7 дней",
    desktopUpcomingToday: "Сегодня",
    desktopUpcomingJobs: "{n} заявок",
    desktopQaAssign: "Назначить",
    desktopQaCalendar: "Календарь",
    desktopRoleAdmin: "Администратор",
    desktopRoleUser: "Сотрудник",
    desktopNotifEmpty: "Новых уведомлений нет",
    desktopCalendarMsg: "Календарь появится в следующем обновлении.",
    desktopQaSearchHint: "Поиск",
    desktopDonutTotalLabel: "Всего",
    jobCreatedToast: "Заявка создана",
    reportCancel: "Отмена",
  },
};

function getUiLang() {
  try {
    const s = String(localStorage.getItem(MAINPRO_UI_LANG_KEY) || "en");
    return s === "ru" ? "ru" : "en";
  } catch (e) {
    return "en";
  }
}

function t(key) {
  const lang = getUiLang();
  const a = MAINPRO_I18N[lang] || MAINPRO_I18N.en;
  if (a[key] != null) return a[key];
  return MAINPRO_I18N.en[key] != null ? MAINPRO_I18N.en[key] : key;
}

function applyMainproI18n() {
  const el = function (id, html) {
    const n = document.getElementById(id);
    if (!n) return;
    n.innerHTML = html;
  };
  const tx = function (id, text) {
    const n = document.getElementById(id);
    if (!n) return;
    n.textContent = text;
  };
  el("loginTitle", t("loginTitle"));
  el("loginSub", t("loginSub"));
  const titleEl = document.getElementById("appHeaderTitle");
  if (titleEl) titleEl.textContent = t("appTitle");
  el("reportFormTitle", t("reportTitle"));
  tx("mobileReportSheetTitle", t("reportTitle"));
  tx("mobileReportCancelBtn", t("reportCancel"));
  const loc = document.getElementById("location");
  if (loc) loc.setAttribute("placeholder", t("roomPh"));
  const prob = document.getElementById("problem");
  if (prob) prob.setAttribute("placeholder", t("problemPh"));
  const s = document.getElementById("jobSearch");
  if (s) s.setAttribute("placeholder", t("searchPh"));
  const ta = document.querySelector('.tab[data-tab="active"]');
  const th = document.querySelector('.tab[data-tab="history"]');
  if (ta) ta.textContent = t("tabActive");
  if (th) th.textContent = t("tabHistory");
  const bEx = document.getElementById("btnExportBackup");
  if (bEx) bEx.textContent = t("exportJson");
  const bIm = document.getElementById("btnImportBackup");
  if (bIm) bIm.textContent = t("importJson");
  const bMr = document.getElementById("btnImportMerge");
  if (bMr) bMr.textContent = t("importMerge");
  const bCs = document.getElementById("btnExportCsv");
  if (bCs) bCs.textContent = t("exportCsv");
  const bCh = document.getElementById("btnChangeUser");
  if (bCh) bCh.textContent = t("changeUser");
  const bNew = document.getElementById("btnNewJob");
  if (bNew) bNew.textContent = t("newJob");
  const bSet = document.getElementById("btnOpenSettings");
  if (bSet) {
    const stLabel = t("settings");
    bSet.setAttribute("aria-label", stLabel);
    bSet.setAttribute("title", stLabel);
    const st = document.getElementById("settingsBtnText");
    if (st) st.textContent = stLabel;
  }
  const bLang = document.getElementById("btnUiLang");
  if (bLang) {
    bLang.textContent = t("lang");
    bLang.setAttribute("title", t("langNext"));
  }
  const bHelp = document.getElementById("btnSettingsHelp");
  if (bHelp) bHelp.textContent = t("help");
  const langLbl = document.getElementById("settingsLangLabel");
  if (langLbl) langLbl.textContent = t("language");
  const setTitle = document.getElementById("settingsModalTitle");
  if (setTitle) setTitle.textContent = t("settings");
  tx("dashLabelAll", t("kpiAll"));
  tx("dashLabelNew", t("kpiNew"));
  tx("dashLabelInProgress", t("kpiInProgress"));
  tx("dashLabelPending", t("kpiPending"));
  tx("dashLabelOverdue", t("kpiOverdue"));
  tx("dashLabelDoneToday", t("kpiDoneToday"));
  tx("dashLabelDeleted", t("kpiDeleted"));
  tx("desktopLabelNew", t("kpiNew"));
  tx("desktopLabelInProgress", t("kpiInProgress"));
  tx("desktopLabelPending", t("kpiPending"));
  tx("desktopLabelOverdue", t("kpiOverdue"));
  tx("desktopLabelDoneToday", t("kpiDoneToday"));
  tx("desktopPageTitle", t("desktopPageTitle"));
  tx("desktopPageSubtitle", t("desktopPageSubtitle"));
  tx("desktopTagline", t("desktopTagline"));
  tx("desktopNavDashboard", t("desktopNavDashboard"));
  tx("desktopNavJobs", t("desktopNavJobs"));
  tx("desktopNavCalendar", t("desktopNavCalendar"));
  tx("desktopNavAssets", t("desktopNavAssets"));
  tx("desktopNavReports", t("desktopNavReports"));
  tx("desktopNavUsers", t("desktopNavUsers"));
  tx("desktopNavSettings", t("desktopNavSettings"));
  tx("desktopRecentJobsTitle", t("desktopRecentJobs"));
  tx("desktopThJob", t("desktopThJob"));
  tx("desktopThRoom", t("desktopThRoom"));
  tx("desktopThPriority", t("desktopThPriority"));
  tx("desktopThEngineer", t("desktopThEngineer"));
  tx("desktopThStatus", t("desktopThStatus"));
  tx("desktopThUpdated", t("desktopThUpdated"));
  tx("desktopThAction", t("desktopThAction"));
  tx("desktopPriTitle", t("desktopPriByDonut"));
  tx("desktopPriLabelCritical", t("desktopLabelPriCritical"));
  tx("desktopPriLabelHigh", t("desktopLabelPriHigh"));
  tx("desktopPriLabelMedium", t("desktopLabelPriMedium"));
  tx("desktopPriLabelLow", t("desktopLabelPriLow"));
  tx("desktopQaTitle", t("desktopQaTitle"));
  const bDNew = document.getElementById("btnDesktopNewJob");
  if (bDNew) bDNew.textContent = t("newJob");
  const bQaC = document.getElementById("desktopQaCreate");
  if (bQaC) bQaC.textContent = t("desktopQaCreate");
  const bQaA = document.getElementById("desktopQaAssign");
  if (bQaA) bQaA.textContent = t("desktopQaAssign");
  const bQaCal = document.getElementById("desktopQaCalendar");
  if (bQaCal) bQaCal.textContent = t("desktopQaCalendar");
  const vAll = document.getElementById("desktopViewAllJobs");
  if (vAll) vAll.textContent = t("desktopViewAllJobs");
  const upT = document.getElementById("desktopUpcomingTitle");
  if (upT) upT.textContent = t("desktopUpcomingTitle");
  const bSrch = document.getElementById("btnDesktopSearch");
  if (bSrch) bSrch.setAttribute("title", t("desktopQaSearchHint"));
  const bBell = document.getElementById("btnDesktopNotify");
  if (bBell) bBell.setAttribute("title", t("desktopNotifEmpty"));
  const bUser = document.getElementById("btnDesktopProfile");
  if (bUser) bUser.setAttribute("title", t("changeUser"));
  const dtl = document.getElementById("desktopDonutTotalLbl");
  if (dtl) dtl.textContent = t("desktopDonutTotalLabel");
  const bClear = document.getElementById("btnClearListFilters");
  if (bClear) {
    bClear.textContent = t("clearFiltersShort");
    bClear.setAttribute("title", t("resetFilters").replace(/<[^>]+>/g, ""));
  }
  updateClearFiltersButton();
  el("onboardingStep1", t("onboardingStep1"));
  el("onboardingStep2", t("onboardingStep2"));
  el("onboardingStep3", t("onboardingStep3"));
  tx("onboardingTitle", t("onboardingTitle"));
  tx("onboardingSkipBtn", t("onboardingSkip"));
  const odl = document.getElementById("onboardingDontShowLabel");
  if (odl) odl.textContent = t("onboardingDontShow");
  const swL = document.getElementById("swUpdateLineText");
  if (swL) swL.textContent = t("swUpdateLine");
  const bSwR = document.getElementById("btnSwUpdateRefresh");
  if (bSwR) bSwR.textContent = t("swUpdateRefresh");
  const bSwD = document.getElementById("btnSwUpdateDismiss");
  if (bSwD) bSwD.setAttribute("aria-label", t("swUpdateDismiss"));
  const abL = document.getElementById("autobackupLabel");
  if (abL) {
    abL.textContent = t("autobackupLabel");
  }
  const abH = document.getElementById("autobackupHint");
  if (abH) abH.textContent = t("autobackupHint");
  const bRB = document.getElementById("btnRestoreBrowserBackup");
  if (bRB) bRB.textContent = t("restoreBrowserBackup");
  updateOnboardingFooterButton();
  updateSettingsBackupInfo();
  if (hasMainproLogin()) {
    const c = computeFilteredListCounts();
    updateListResultCount(c.nActive, c.nHistory);
  }
}

function showSwUpdateBar() {
  const b = document.getElementById("swUpdateBar");
  if (b) b.hidden = false;
}
function dismissSwUpdateBar() {
  const elbar = document.getElementById("swUpdateBar");
  if (elbar) elbar.hidden = true;
}
window.showSwUpdateBar = showSwUpdateBar;
window.dismissSwUpdateBar = dismissSwUpdateBar;

function onAutobackupToggle() {
  const cb = document.getElementById("cbAutobackup");
  if (!cb) return;
  setAutobackupEnabled(cb.checked);
  if (cb.checked) {
    writeBrowserAutobackupNow();
  }
  updateSettingsBackupInfo();
}
window.onAutobackupToggle = onAutobackupToggle;
window.restoreFromBrowserBackup = restoreFromBrowserBackup;
window.onboardingNext = onboardingNext;
window.onboardingDone = onboardingDone;
window.onboardingSkip = onboardingSkip;

function toggleUiLang() {
  try {
    localStorage.setItem(MAINPRO_UI_LANG_KEY, getUiLang() === "en" ? "ru" : "en");
  } catch (e) {
    /* ignore */
  }
  applyMainproI18n();
  if (hasMainproLogin()) {
    render();
  }
}

function isNarrowLayout() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(max-width: 600px)").matches;
}

function isMainproDesktopLayout() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia("(min-width: 900px)").matches;
}

function jobDetailModalHostActive() {
  return isNarrowLayout() || isMainproDesktopLayout();
}

/** Короткая вибрация на телефоне (если API есть). */
function hapticNarrow() {
  if (!isNarrowLayout()) return;
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(14);
    }
  } catch (e) {
    /* ignore */
  }
}

/** Report form + saved on job */
const JOB_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const PRIORITY_SLA_HOURS = { Low: 24, Medium: 8, High: 4, Critical: 1 };

function normalizePriorityValue(p) {
  const s = String(p == null ? "" : p).trim();
  if (!s) return "Low";
  if (/^urgent$/i.test(s)) return "Critical";
  if (JOB_PRIORITIES.indexOf(s) >= 0) return s;
  return "Low";
}

/**
 * @param {string} createdAtIso
 * @param {string} priority
 */
function computeDueAtIso(createdAtIso, priority) {
  const p = normalizePriorityValue(priority);
  const hours =
    PRIORITY_SLA_HOURS[p] != null ? PRIORITY_SLA_HOURS[p] : PRIORITY_SLA_HOURS.Low;
  let base = Date.now();
  if (createdAtIso && String(createdAtIso).trim()) {
    const t = new Date(createdAtIso).getTime();
    if (!isNaN(t)) base = t;
  }
  return new Date(base + hours * 3600 * 1000).toISOString();
}

/** SLA clock: after dueAt, not done, not deleted. */
function isSlaOverdue(j) {
  if (!j || j.deleted || j.status === "Done") return false;
  const d = (j.dueAt == null ? "" : String(j.dueAt)).trim();
  if (!d) return false;
  const t = new Date(d).getTime();
  if (isNaN(t)) return false;
  return Date.now() > t;
}

function normalizeAssignedTo(j) {
  if (!j) return "Unassigned";
  const v = String(j.assignedTo == null ? "" : j.assignedTo).trim();
  if (!v) return "Unassigned";
  return v;
}

let jobs = loadJobs();

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

let _urlJobIdToOpen = null;

function scheduleJobUrlParamIfPresent() {
  _urlJobIdToOpen = null;
  if (!hasMainproLogin()) {
    return;
  }
  try {
    const p = new URLSearchParams(window.location.search).get("job");
    if (p && String(p).trim()) {
      _urlJobIdToOpen = String(p).trim();
    }
  } catch (e) {
    /* ignore */
  }
}

function tryStripJobUrlParam() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("job");
    history.replaceState({}, "", (u.pathname || ".") + u.search + u.hash);
  } catch (e) {
    /* ignore */
  }
}

function tryOpenJobFromUrl() {
  if (!_urlJobIdToOpen) {
    return;
  }
  const want = _urlJobIdToOpen;
  _urlJobIdToOpen = null;
  const j = jobs.find((x) => String(x.id) === String(want));
  if (!j) {
    showJobsToast("Job not found");
    tryStripJobUrlParam();
    return;
  }
  if (j.deleted) {
    setTab("active");
    statusFilter = "Deleted";
  } else if (j.status === "Done") {
    setTab("history");
  } else {
    setTab("active");
  }
  historyViewFilter = "all";
  if (isNarrowLayout()) {
    mobileJobDetailId = String(j.id);
    render();
  } else {
    render();
    requestAnimationFrame(function () {
      let target = null;
      document.querySelectorAll(".job[data-job-id]").forEach(function (el) {
        if (jobIdFromDomAttr(el.getAttribute("data-job-id")) === String(j.id)) {
          target = el;
        }
      });
      if (target) {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
          target.scrollIntoView(true);
        }
        target.classList.add("job-card--url-flash");
        setTimeout(function () {
          target.classList.remove("job-card--url-flash");
        }, 2200);
      }
    });
  }
  tryStripJobUrlParam();
}

function applyAuthUi() {
  applyMainproI18n();
  const ok = hasMainproLogin();
  const u = getMainproUser();
  const login = document.getElementById("loginScreen");
  const app = document.getElementById("appMain");
  const disp = document.getElementById("reportingAsDisplay");
  if (login) login.hidden = ok;
  if (app) app.hidden = !ok;
  if (disp) disp.textContent = ok && u ? u : "—";
  if (ok) {
    /* Как на мобильной: список и фильтры сначала, форма — по + New Job */
    setReportFormCollapsed(true);
    scheduleJobUrlParamIfPresent();
    render();
    if (!_urlJobIdToOpen) {
      setTab("active");
    }
    setTimeout(function () {
      tryOpenJobFromUrl();
    }, 0);
    setTimeout(function () {
      tryShowOnboarding();
    }, 600);
    if (isNarrowLayout()) {
      requestAnimationFrame(function () {
        onMobileFabScroll();
      });
    }
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
  writeBrowserAutobackupNow();
  try {
    localStorage.removeItem(MAINPRO_USER_KEY);
  } catch (e) {
    console.warn("Could not clear mainpro_user", e);
  }
  closeJobsSettings();
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
    if (x.assignedTo == null || String(x.assignedTo).trim() === "") {
      x.assignedTo = "Unassigned";
      changed = true;
    } else {
      x.assignedTo = String(x.assignedTo).trim();
      if (ASSIGNED_ENGINEER_OPTIONS.indexOf(x.assignedTo) < 0) {
        x.assignedTo = "Unassigned";
        changed = true;
      }
    }
    {
      const prevP = x.priority;
      x.priority = normalizePriorityValue(x.priority);
      if (x.priority !== prevP) {
        changed = true;
      }
    }
    {
      const du0 = (x.dueAt == null ? "" : String(x.dueAt)).trim();
      const t0 = du0 ? new Date(du0).getTime() : NaN;
      if (!du0 || isNaN(t0)) {
        x.dueAt = computeDueAtIso(x.createdAt, x.priority);
        changed = true;
      } else {
        x.dueAt = du0;
      }
    }
    {
      if (x.slaBecameOverdueLogged == null) {
        const du = (x.dueAt == null ? "" : String(x.dueAt)).trim();
        const dt = du ? new Date(du).getTime() : NaN;
        const nowMs = Date.now();
        const wasPast = !isNaN(dt) && dt < nowMs;
        const activeOpen = isActiveStatus(x.status) && !x.deleted;
        x.slaBecameOverdueLogged = wasPast && activeOpen;
        changed = true;
      } else {
        x.slaBecameOverdueLogged = x.slaBecameOverdueLogged === true;
      }
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
  maybeWriteBrowserAutobackup();
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Set in render() to match job search; used by hl() in card HTML. */
let _renderSearchQ = "";
/** Stash list focus so re-render() can try to return keyboard focus to a job card. */
let _listFocus = null;

function highlightSearchMatchHtml(raw, q) {
  if (q == null || String(q).trim() === "") {
    return escapeHtml(raw);
  }
  const s = String(raw == null ? "" : raw);
  const qLower = String(q).toLowerCase();
  if (qLower.length === 0) {
    return escapeHtml(s);
  }
  const sLower = s.toLowerCase();
  let out = "";
  let from = 0;
  let idx;
  for (;;) {
    idx = sLower.indexOf(qLower, from);
    if (idx < 0) {
      out += escapeHtml(s.slice(from));
      break;
    }
    out += escapeHtml(s.slice(from, idx));
    out += '<mark class="search-hit">';
    out += escapeHtml(s.slice(idx, idx + qLower.length));
    out += "</mark>";
    from = idx + qLower.length;
  }
  return out;
}

function hl(raw) {
  return highlightSearchMatchHtml(raw, _renderSearchQ);
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

function getLocalDayStartMs(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return NaN;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isTimestampOnLocalDay(tsMs, dayDate) {
  if (tsMs == null || isNaN(tsMs) || !dayDate) return false;
  const a = getLocalDayStartMs(new Date(tsMs));
  const b = getLocalDayStartMs(dayDate);
  return a === b;
}

function isLocalTodayFromIso(s) {
  if (!s || !String(s).trim()) return false;
  const t = new Date(s).getTime();
  if (isNaN(t)) return false;
  return isTimestampOnLocalDay(t, new Date());
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
  return any;
}

/**
 * When SLA dueAt is first passed, one system line "Became Overdue" (uses slaBecameOverdueLogged).
 */
function appendSlaBecameOverdueAuditIfNeeded() {
  let any = false;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (j.deleted) continue;
    if (j.slaBecameOverdueLogged) continue;
    if (!isSlaOverdue(j)) continue;
    appendSystemComment(j, "Became Overdue");
    j.slaBecameOverdueLogged = true;
    any = true;
  }
  if (any) save();
  return any;
}

function formatDurationHMFromMs(totalMs) {
  if (totalMs < 0) totalMs = 0;
  const totalMin = Math.floor(totalMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { h: h, m: m };
}

/** Pending: one line — timer/countdown + until date (visual only). */
function getPendingTimerUntilLine(j) {
  if (j.status !== "Pending" || !(j.pendingUntil || "").trim()) return "";
  const t = new Date(j.pendingUntil).getTime();
  if (isNaN(t)) return "";
  const untilEsc = escapeHtml(formatDateClean(j.pendingUntil) || "—");
  const now = Date.now();
  if (j.isOverdue) {
    const { h, m } = formatDurationHMFromMs(now - t);
    return `<div class="pending-timer-combined pending-timer--overdue" aria-live="polite">⏱ Overdue by ${h}h ${m}m <span class="pending-sep" aria-hidden="true">·</span> Until ${untilEsc}</div>`;
  }
  if (t <= now) return "";
  const { h, m } = formatDurationHMFromMs(t - now);
  return `<div class="pending-timer-combined pending-timer--left" aria-live="polite">⏱ ${h}h ${m}m left <span class="pending-sep" aria-hidden="true">·</span> Until ${untilEsc}</div>`;
}

function renderJobMetaRow(j) {
  const repRaw = (j.reportedBy && String(j.reportedBy).trim()
    ? j.reportedBy
    : "—");
  const assignRaw = normalizeAssignedTo(j);
  const when = escapeHtml(formatDateClean(j.createdAt) || "—");
  return `<div class="job-meta-row"><span class="job-meta-chunk">👤 ${hl(
    repRaw
  )}</span><span class="job-meta-sep" aria-hidden="true">·</span><span class="job-meta-chunk">👷 ${hl(
    assignRaw
  )}</span><span class="job-meta-sep" aria-hidden="true">·</span><span class="job-meta-chunk">🕘 ${when}</span></div>`;
}

function matchesMyJobsFilter(j) {
  const u = getMainproUser();
  if (!u) return false;
  const asg = normalizeAssignedTo(j);
  const rep = String(j.reportedBy || "").trim();
  if (u === "Manager") {
    return rep === "Manager" || asg === "Manager";
  }
  if (u === "Engineer 1" || u === "Engineer 2" || u === "Engineer 3") {
    return asg === u;
  }
  return rep === u || asg === u;
}

function buildAssignmentLogMessage(prev, next) {
  const p = prev || "Unassigned";
  const n = next || "Unassigned";
  if (p === n) return "";
  if (p === "Unassigned" && n !== "Unassigned") {
    return "Assigned to " + n;
  }
  if (n === "Unassigned" && p !== "Unassigned") {
    return "Unassigned from " + p;
  }
  return "Reassigned from " + p + " to " + n;
}

/**
 * @param {object} j job
 * @param {{ compact?: boolean, disabled?: boolean, modal?: boolean }} opts
 */
function renderJobAssignBlock(j, opts) {
  opts = opts || {};
  const disabled = opts.disabled === true;
  const idAttr2 = jobIdForDomAttr(j.id);
  const current = normalizeAssignedTo(j);
  const optionsHtml = ASSIGNED_ENGINEER_OPTIONS.map(function (name) {
    return (
      '<option value="' +
      escapeAttr(name) +
      '"' +
      (name === current ? " selected" : "") +
      ">" +
      escapeHtml(name) +
      "</option>"
    );
  }).join("");
  const cls =
    "job-assign-block" +
    (opts.compact ? " job-assign-block--compact" : "") +
    (opts.modal ? " job-assign-block--modal" : "");
  return (
    '<div class="' +
    cls +
    '" data-stops-tap="1" onclick="onJobAssignBlockClick(event)">' +
    '<span class="job-assign-label">Assigned</span>' +
    '<select class="job-assign-select" data-job-id="' +
    idAttr2 +
    '" onchange="onJobAssignFromUi(this)"' +
    (disabled ? " disabled" : "") +
    ' aria-label="Assign or reassign job">' +
    optionsHtml +
    "</select></div>"
  );
}

function setJobAssignment(rawId, newValue) {
  const j = jobs.find((x) => String(x.id) === String(rawId));
  if (!j) return;
  const s = String(newValue == null ? "" : newValue).trim();
  const next =
    ASSIGNED_ENGINEER_OPTIONS.indexOf(s) >= 0 ? s : "Unassigned";
  const prev = normalizeAssignedTo(j);
  if (prev === next) return;
  j.assignedTo = next;
  const msg = buildAssignmentLogMessage(prev, next);
  if (msg) {
    appendSystemComment(j, msg);
  }
  save();
  hapticNarrow();
  render();
}

function onJobAssignBlockClick(e) {
  if (e && typeof e.stopPropagation === "function") {
    e.stopPropagation();
  }
}

function onJobAssignFromUi(selectEl) {
  if (!selectEl) return;
  const raw = selectEl.getAttribute("data-job-id");
  const id = jobIdFromDomAttr(raw);
  if (id == null) return;
  setJobAssignment(id, selectEl.value);
}

/** Priority pill + SLA countdown (or due date on done/deleted). */
function renderJobPrioritySlaBlock(j) {
  const p = normalizePriorityValue(j.priority);
  const slug = p.toLowerCase();
  const pill = `<span class="job-priority-pill job-priority-pill--${slug}">${escapeHtml(
    p
  )}</span>`;
  const d = (j.dueAt == null ? "" : String(j.dueAt)).trim();
  if (!d) {
    return `<div class="job-sla-row">Priority: ${pill}</div>`;
  }
  const dueT = new Date(d).getTime();
  if (isNaN(dueT)) {
    return `<div class="job-sla-row">Priority: ${pill}</div>`;
  }
  if (j.status === "Done" || j.deleted) {
    const when = formatDateTime(d) || "—";
    return `<div class="job-sla-row">Priority: ${pill}<span class="job-sla-due">Due: ${escapeHtml(
      when
    )}</span></div>`;
  }
  const now = Date.now();
  const diff = dueT - now;
  const { h, m } = formatDurationHMFromMs(Math.abs(diff));
  const dueText =
    diff < 0 ? "Overdue by: " + h + "h " + m + "m" : "Due in: " + h + "h " + m + "m";
  const modClass = diff < 0 ? " job-sla-due--late" : "";
  return `<div class="job-sla-row">Priority: ${pill}<span class="job-sla-due${modClass}" aria-live="polite">${escapeHtml(
    dueText
  )}</span></div>`;
}

function getNewJobAssignedToValue() {
  const el = document.getElementById("newJobAssignedTo");
  const raw = el ? String(el.value || "Unassigned").trim() : "Unassigned";
  if (ASSIGNED_ENGINEER_OPTIONS.indexOf(raw) >= 0) return raw;
  return "Unassigned";
}

function getDashboardCounts() {
  let nAll = 0;
  let nNew = 0;
  let nInProgress = 0;
  let nPending = 0;
  let nOverdue = 0;
  let nDoneToday = 0;
  let nDeleted = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (j.deleted) {
      nDeleted++;
      continue;
    }
    const st = j.status;
    if (isActiveStatus(st)) nAll++;
    if (st === "New") nNew++;
    else if (st === "In Progress") nInProgress++;
    else if (st === "Pending" && !j.isOverdue && !isSlaOverdue(j)) {
      nPending++;
    }
    if (isSlaOverdue(j)) nOverdue++;
    if (st === "Done" && isCompletedAtToday(j.completedAt)) nDoneToday++;
  }
  return {
    nAll: nAll,
    nNew: nNew,
    nInProgress: nInProgress,
    nPending: nPending,
    nOverdue: nOverdue,
    nDoneToday: nDoneToday,
    nDeleted: nDeleted,
  };
}

function getJobPriorityBreakdown() {
  const o = { critical: 0, high: 0, medium: 0, low: 0 };
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (!j || j.deleted) continue;
    const p = normalizePriorityValue(j.priority);
    if (p === "Critical") o.critical++;
    else if (p === "High") o.high++;
    else if (p === "Medium") o.medium++;
    else o.low++;
  }
  return o;
}

function countNewCreatedToday() {
  let n = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (!j || j.deleted || j.status !== "New") continue;
    if (isLocalTodayFromIso(j.createdAt)) n++;
  }
  return n;
}

function countScheduledForLocalDay(dayDate) {
  const start = getLocalDayStartMs(dayDate);
  if (isNaN(start)) return 0;
  const end = start + 86400000;
  let n = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (!j || j.deleted || j.status === "Done") continue;
    const dueRaw = (j.dueAt && String(j.dueAt).trim()) || "";
    const puRaw = (j.pendingUntil && String(j.pendingUntil).trim()) || "";
    const dueT = dueRaw ? new Date(dueRaw).getTime() : NaN;
    const puT = puRaw ? new Date(puRaw).getTime() : NaN;
    if (!isNaN(dueT) && dueT >= start && dueT < end) n++;
    else if (!isNaN(puT) && puT >= start && puT < end) n++;
  }
  return n;
}

function engineerInitials(name) {
  const s = String(name == null ? "" : name).trim();
  if (!s || s === "Unassigned") return "—";
  const parts = s.split(/\s+/);
  if (parts.length >= 2) {
    return (
      String(parts[0][0] || "").toUpperCase() +
      String(parts[parts.length - 1][0] || "").toUpperCase()
    );
  }
  return s.slice(0, 2).toUpperCase();
}

function getDesktopRoleLine() {
  const r = getMainproUser();
  if (!r) return t("desktopRoleUser");
  if (r === "Manager") return t("desktopRoleAdmin");
  return t("desktopRoleUser");
}

function updateDesktopUserProfile() {
  const u = getMainproUser() || "—";
  const initials = engineerInitials(u);
  const line = getDesktopRoleLine();
  const setT = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  setT("desktopSidebarUserName", u);
  setT("desktopSidebarUserStatus", line);
  const av = document.getElementById("desktopUserAvatar");
  if (av) av.textContent = initials.length > 2 ? initials.slice(0, 2) : initials;
  const tb = document.getElementById("desktopTopbarAvatar");
  if (tb) tb.textContent = initials.length > 2 ? initials.slice(0, 2) : initials;
}

function updateDesktopKpiSublines(c) {
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v == null ? "" : String(v);
  };
  const sub = (n) =>
    n > 0 ? t("desktopKpiSubPlus").replace(/\{n\}/g, String(n)) : "";
  const nNewT = countNewCreatedToday();
  const nInProgT = countSystemLogPhrasesToday([/moved to in progress/i]);
  const nPendT = countSystemLogPhrasesToday([/moved to pending/i]);
  set("desktopKpiSubNew", sub(nNewT));
  set("desktopKpiSubInProgress", sub(nInProgT));
  set("desktopKpiSubPending", sub(nPendT));
  set("desktopKpiSubDone", "");
  set("desktopKpiSubOverdue", c.nOverdue > 0 ? t("desktopKpiOverdueAttn") : "");
}

function updateDesktopDonutChart() {
  const pr = getJobPriorityBreakdown();
  const total = pr.critical + pr.high + pr.medium + pr.low;
  const el = document.getElementById("desktopDonutChart");
  const num = document.getElementById("desktopDonutTotal");
  if (num) num.textContent = String(total);
  if (!el) return;
  if (total === 0) {
    el.style.background = "#e5e7eb";
    const setP = (id) => {
      const n = document.getElementById(id);
      if (n) n.textContent = "0%";
    };
    setP("desktopDonutPctCritical");
    setP("desktopDonutPctHigh");
    setP("desktopDonutPctMedium");
    setP("desktopDonutPctLow");
    return;
  }
  const pC = (pr.critical / total) * 100;
  const pH = (pr.high / total) * 100;
  const pM = (pr.medium / total) * 100;
  const pL = (pr.low / total) * 100;
  const a1 = pC;
  const a2 = a1 + pH;
  const a3 = a2 + pM;
  const g = `conic-gradient(
    #e11d48 0% ${a1}%,
    #f97316 ${a1}% ${a2}%,
    #eab308 ${a2}% ${a3}%,
    #0f9d68 ${a3}% 100%
  )`;
  el.style.background = g;
  const pct = (x) => Math.round((x / total) * 100) + "%";
  const setP = (id, v) => {
    const n = document.getElementById(id);
    if (n) n.textContent = v;
  };
  setP("desktopDonutPctCritical", pct(pr.critical));
  setP("desktopDonutPctHigh", pct(pr.high));
  setP("desktopDonutPctMedium", pct(pr.medium));
  setP("desktopDonutPctLow", pct(pr.low));
}

function renderDesktopUpcoming() {
  const host = document.getElementById("desktopUpcomingStrip");
  if (!host) return;
  const now = new Date();
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const nSched = countScheduledForLocalDay(d);
    const dayLabel =
      i === 0
        ? t("desktopUpcomingToday")
        : d.toLocaleDateString(getUiLang() === "ru" ? "ru-RU" : "en-GB", {
            weekday: "short",
          });
    const dateStr = d.toLocaleDateString(getUiLang() === "ru" ? "ru-RU" : "en-GB", {
      month: "short",
      day: "numeric",
    });
    const jobsLine = t("desktopUpcomingJobs").replace(/\{n\}/g, String(nSched));
    parts.push(
      '<div class="desktop-upcoming__chip' +
        (i === 0 ? " desktop-upcoming__chip--today" : "") +
        '">' +
        '<span class="desktop-upcoming__day">' +
        escapeHtml(dayLabel) +
        "</span>" +
        '<span class="desktop-upcoming__date">' +
        escapeHtml(dateStr) +
        "</span>" +
        '<span class="desktop-upcoming__n">' +
        escapeHtml(jobsLine) +
        "</span></div>"
    );
  }
  host.innerHTML = parts.join("");
}

function updateDesktopSidebarAndPanels() {
  const pr = getJobPriorityBreakdown();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set("desktopPriCritical", pr.critical);
  set("desktopPriHigh", pr.high);
  set("desktopPriMedium", pr.medium);
  set("desktopPriLow", pr.low);
  updateDesktopUserProfile();
  updateDesktopDonutChart();
}

function renderDesktopRecentJobsTable() {
  const tb = document.getElementById("desktopRecentJobsBody");
  if (!tb) return;
  const list = jobs
    .slice()
    .sort((a, b) => getJobLastActivityMs(b) - getJobLastActivityMs(a))
    .slice(0, 10);
  if (!list.length) {
    tb.innerHTML =
      '<tr><td colspan="7" class="desktop-jobs-table__empty">' +
      escapeHtml(t("desktopNoRecent")) +
      "</td></tr>";
    return;
  }
  const prClass = { Critical: "critical", High: "high", Medium: "medium", Low: "low" };
  tb.innerHTML = list
    .map(function (j) {
      const vis = getJobDetailHeaderBadgeVisual(j);
      const pNorm = normalizePriorityValue(j.priority);
      const prSlug = prClass[pNorm] || "low";
      const ms = getJobLastActivityMs(j);
      const updated =
        ms > 0
          ? formatDateClean(new Date(ms).toISOString()) || "—"
          : "—";
      const room = escapeHtml(String(j.location != null ? j.location : "").trim() || "—");
      const rawProblem = String(j.problem != null ? j.problem : "").trim();
      const jobTitleEsc = escapeHtml(
        rawProblem.length > 80 ? rawProblem.slice(0, 77) + "…" : rawProblem || "—"
      );
      const assignName = normalizeAssignedTo(j);
      const inits = escapeHtml(engineerInitials(assignName));
      const nameEsc = escapeHtml(assignName);
      const stHtml =
        '<span class="job-status-badge job-status-badge--' +
        vis.badgeMod +
        ' desktop-status-pill">' +
        escapeHtml(vis.badgeText) +
        "</span>";
      const prHtml =
        '<span class="job-priority-pill job-priority-pill--' +
        prSlug +
        '">' +
        escapeHtml(pNorm.toUpperCase()) +
        "</span>";
      const engCell =
        '<span class="desktop-eng"><span class="desktop-eng__avatar" aria-hidden="true">' +
        inits +
        "</span><span class=\"desktop-eng__name\">" +
        nameEsc +
        "</span></span>";
      return (
        "<tr><td class=\"desktop-jobs-table__job\">" +
        jobTitleEsc +
        "</td><td>" +
        room +
        "</td><td>" +
        prHtml +
        "</td><td>" +
        engCell +
        "</td><td>" +
        stHtml +
        "</td><td>" +
        escapeHtml(updated) +
        '</td><td class="desktop-jobs-table__action"><button type="button" class="desktop-view-btn" data-jid="' +
        jobIdForDomAttr(j.id) +
        '" onclick="openDesktopJobFromTableFromButton(this)">' +
        escapeHtml(t("desktopQaView")) +
        "</button></td></tr>"
      );
    })
    .join("");
}

function updateDashboard() {
  const c = getDashboardCounts();
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v);
  };
  set("dashCountAll", c.nAll);
  set("dashCountNew", c.nNew);
  set("dashCountInProgress", c.nInProgress);
  set("dashCountPending", c.nPending);
  set("dashCountOverdue", c.nOverdue);
  set("dashCountDoneToday", c.nDoneToday);
  set("dashCountDeleted", c.nDeleted);
  set("desktopKpiNew", c.nNew);
  set("desktopKpiInProgress", c.nInProgress);
  set("desktopKpiPending", c.nPending);
  set("desktopKpiOverdue", c.nOverdue);
  set("desktopKpiDoneToday", c.nDoneToday);
  updateDesktopKpiSublines(c);
  updateDesktopSidebarAndPanels();
  renderDesktopRecentJobsTable();
  renderDesktopUpcoming();
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
  if (kind === "active") {
    if (statusFilter === "All") {
      const t = document.querySelector('.job-dashboard-card[data-dash="all"]');
      if (t) t.classList.add("job-dashboard-card--active");
    } else if (statusFilter === "Deleted") {
      const d = document.querySelector('.job-dashboard-card[data-dash="deleted"]');
      if (d) d.classList.add("job-dashboard-card--active");
    } else {
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
    normalizeAssignedTo(j),
    getJobCommentsTextBlob(j),
    j.pendingUntil,
    j.pendingReason,
    j.dueAt,
  ].map((v) => String(v == null ? "" : v).toLowerCase());
  return parts.some((p) => p.indexOf(q) >= 0);
}

/**
 * Active list: Overdue = SLA (dueAt passed). Pending = on-hold, not past park, not SLA overdue.
 */
function matchesStatusFilterForActive(j) {
  if (statusFilter === "All" || statusFilter === "Done") return true;
  if (statusFilter === "Overdue") return isSlaOverdue(j) === true;
  if (statusFilter === "Pending") {
    return j.status === "Pending" && !j.isOverdue && !isSlaOverdue(j);
  }
  return j.status === statusFilter;
}

function matchesEngineerFilter(j) {
  if (myJobsFilterActive) {
    return matchesMyJobsFilter(j);
  }
  if (!engineerFilter || engineerFilter === "All") return true;
  return normalizeAssignedTo(j) === engineerFilter;
}

function syncEngineerFilterUi() {
  const sel = document.getElementById("engineerFilter");
  if (sel) {
    const v = String(engineerFilter || "All");
    let ok = false;
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === v) {
        ok = true;
        break;
      }
    }
    sel.value = ok ? v : "All";
  }
  const btn = document.getElementById("btnMyJobs");
  if (btn) {
    btn.classList.toggle("active", myJobsFilterActive);
    btn.setAttribute("aria-pressed", myJobsFilterActive ? "true" : "false");
  }
}

function toggleMyJobsFilter() {
  if (myJobsFilterActive) {
    myJobsFilterActive = false;
  } else {
    myJobsFilterActive = true;
    engineerFilter = "All";
  }
  render();
}

function setStatusFilter(s) {
  statusFilter = s;
  historyViewFilter = "all";
  setTab("active");
  render();
}

function onDashboardFilter(dash) {
  if (dash === "all") {
    statusFilter = "All";
    historyViewFilter = "all";
    setTab("active");
    render();
    return;
  }
  if (dash === "doneToday") {
    historyViewFilter = "completedToday";
    setTab("history");
    render();
    return;
  }
  historyViewFilter = "all";
  if (dash === "deleted") {
    statusFilter = "Deleted";
    setTab("active");
    render();
    return;
  }
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
  if (isSlaOverdue(j)) return 0;
  if (j.isOverdue) return 1;
  if (j.status === "In Progress") return 2;
  if (j.status === "Pending") return 3;
  if (j.status === "New") return 4;
  return 5;
}

/**
 * True when the empty list is plausibly due to search/filters, so we show a reset control.
 */
function shouldOfferResetForEmptyActive() {
  if (getSearchQuery()) return true;
  if (engineerFilter && engineerFilter !== "All") return true;
  if (myJobsFilterActive) return true;
  if (statusFilter && statusFilter !== "All") return true;
  return false;
}

function shouldOfferResetForEmptyHistory() {
  if (getSearchQuery()) return true;
  if (engineerFilter && engineerFilter !== "All") return true;
  if (myJobsFilterActive) return true;
  if (historyViewFilter === "completedToday") return true;
  return false;
}

/**
 * Сбрасывает поиск и фильтры к «все / все инженеры / без My Jobs / весь срок / статус All».
 * Активная/история вкладка не переключается.
 */
function resetFiltersAndSearch() {
  if (_jobSearchDebounceTimer) {
    clearTimeout(_jobSearchDebounceTimer);
    _jobSearchDebounceTimer = null;
  }
  const s = document.getElementById("jobSearch");
  if (s) s.value = "";
  engineerFilter = "All";
  myJobsFilterActive = false;
  statusFilter = "All";
  historyViewFilter = "all";
  render();
}

function hasListFiltersActive() {
  if (getSearchQuery()) return true;
  if (myJobsFilterActive) return true;
  if (engineerFilter && engineerFilter !== "All") return true;
  if (getCurrentPanelKind() === "active") {
    if (statusFilter === "Deleted") return true;
    if (statusFilter && statusFilter !== "All" && statusFilter !== "Done")
      return true;
  } else if (historyViewFilter === "completedToday") {
    return true;
  }
  return false;
}

function updateClearFiltersButton() {
  const btn = document.getElementById("btnClearListFilters");
  if (btn) btn.hidden = !hasListFiltersActive();
}

function getActiveEmptyFilterHintLines(searchDisplay) {
  const out = [];
  if (getSearchQuery()) {
    out.push(
      t("emptyHintFilterSearch") +
        " — «" +
        escapeHtml(String(searchDisplay == null ? "" : searchDisplay)) +
        "»"
    );
  }
  if (myJobsFilterActive) {
    out.push(t("emptyHintFilterMyJobs"));
  }
  if (engineerFilter && engineerFilter !== "All") {
    out.push(
      t("emptyHintFilterEngineer").replace(
        "{name}",
        escapeHtml(engineerFilter)
      )
    );
  }
  if (statusFilter === "Deleted") {
    out.push(t("emptyHintFilterDeleted"));
  } else if (statusFilter && statusFilter !== "All" && statusFilter !== "Done") {
    out.push(
      t("emptyHintFilterStatus").replace(
        "{status}",
        escapeHtml(statusFilter)
      )
    );
  }
  return out;
}

function getHistoryEmptyFilterHintLines(searchDisplay) {
  const out = [];
  if (getSearchQuery()) {
    out.push(
      t("emptyHintFilterSearch") +
        " — «" +
        escapeHtml(String(searchDisplay == null ? "" : searchDisplay)) +
        "»"
    );
  }
  if (myJobsFilterActive) {
    out.push(t("emptyHintFilterMyJobs"));
  }
  if (engineerFilter && engineerFilter !== "All") {
    out.push(
      t("emptyHintFilterEngineer").replace(
        "{name}",
        escapeHtml(engineerFilter)
      )
    );
  }
  if (historyViewFilter === "completedToday") {
    out.push(t("emptyHintFilterHistoryToday"));
  }
  return out;
}

function emptyFilterHintsHtml(lines) {
  if (!lines || !lines.length) return "";
  return (
    '<ul class="empty-hint-bullets">' +
    lines
      .map(function (x) {
        return '<li class="empty-hint-li">' + x + "</li>";
      })
      .join("") +
    "</ul>"
  );
}

function captureListFocusState() {
  _listFocus = null;
  const ae = document.activeElement;
  if (!ae || !ae.closest) return;
  const inList = ae.closest("#jobs-active .job, #jobs-history .job");
  if (!inList) return;
  const job = ae.closest(".job");
  if (!job) return;
  const rawId = job.getAttribute("data-job-id");
  const id = jobIdFromDomAttr(rawId);
  if (id == null) return;
  const panel = job.closest("#jobs-history") ? "history" : "active";
  let kind = "other";
  if (ae.classList && ae.classList.contains("job-card-tap")) {
    kind = "tap";
  } else if (
    ae.classList &&
    ae.classList.contains("comment-new") &&
    ae.tagName &&
    String(ae.tagName).toLowerCase() === "textarea"
  ) {
    kind = "comment";
  } else if (ae.tagName && String(ae.tagName).toLowerCase() === "button") {
    kind = "button";
  }
  _listFocus = { id: String(id), panel: panel, kind: kind };
}

function restoreListFocusState() {
  if (!_listFocus) return;
  const { id, panel, kind } = _listFocus;
  _listFocus = null;
  const contId = panel === "history" ? "jobs-history" : "jobs-active";
  const cont = document.getElementById(contId);
  if (!cont) return;
  let job = null;
  cont.querySelectorAll(".job[data-job-id]").forEach(function (el) {
    if (job) return;
    if (String(jobIdFromDomAttr(el.getAttribute("data-job-id"))) === id) {
      job = el;
    }
  });
  if (!job) return;
  let el = null;
  if (kind === "tap") {
    el = job.querySelector(".job-card-tap");
  } else if (kind === "comment") {
    el = job.querySelector("textarea.comment-new");
  } else if (kind === "button") {
    el = job.querySelector("button");
  } else {
    el =
      job.querySelector(".job-card-tap") || job.querySelector("button");
  }
  if (!el) return;
  try {
    el.focus();
  } catch (e) {
    /* ignore */
  }
}

function updateListResultCount(nActive, nHistory) {
  const el = document.getElementById("jobListResultCount");
  if (!el) return;
  if (!hasMainproLogin()) {
    el.textContent = "";
    el.setAttribute("hidden", "hidden");
    return;
  }
  el.removeAttribute("hidden");
  const n =
    getCurrentPanelKind() === "active" ? nActive : nHistory;
  el.textContent = t("listResultLine").replace(
    "{n}",
    String(n)
  );
}

function getAutobackupEnabled() {
  try {
    return localStorage.getItem(MAINPRO_AUTOBACKUP_ENABLED_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function setAutobackupEnabled(on) {
  try {
    if (on) {
      localStorage.setItem(MAINPRO_AUTOBACKUP_ENABLED_KEY, "1");
    } else {
      localStorage.removeItem(MAINPRO_AUTOBACKUP_ENABLED_KEY);
    }
  } catch (e) {
    /* ignore */
  }
}

function buildBrowserSnapshotPayload() {
  const out = jobs.map((j) => {
    const o = { ...j };
    delete o.isOverdue;
    delete o.engineerComment;
    delete o.notes;
    if (!Array.isArray(o.comments)) o.comments = [];
    return o;
  });
  return {
    savedAt: new Date().toISOString(),
    schemaVersion: MAINPRO_JOBS_DATA_SCHEMA,
    appVersion: MAINPRO_JOBS_APP_VERSION,
    app: "MainPro Jobs",
    jobs: out,
  };
}

function writeBrowserAutobackupNow() {
  if (!getAutobackupEnabled() || !hasMainproLogin()) return;
  try {
    const payload = buildBrowserSnapshotPayload();
    localStorage.setItem(
      MAINPRO_BROWSER_BACKUP_KEY,
      JSON.stringify(payload)
    );
  } catch (e) {
    console.warn("Browser backup failed", e);
  }
}

function maybeWriteBrowserAutobackup() {
  if (!getAutobackupEnabled() || !hasMainproLogin()) return;
  let last = 0;
  try {
    const raw = localStorage.getItem(MAINPRO_BROWSER_BACKUP_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.savedAt) {
        const t0 = new Date(String(o.savedAt)).getTime();
        if (!isNaN(t0)) last = t0;
      }
    }
  } catch (e) {
    /* ignore */
  }
  if (Date.now() - last < AUTO_BACKUP_INTERVAL_MS) return;
  writeBrowserAutobackupNow();
}

function getBrowserBackupSavedAt() {
  try {
    const raw = localStorage.getItem(MAINPRO_BROWSER_BACKUP_KEY);
    if (!raw) return "";
    const o = JSON.parse(raw);
    return (o && o.savedAt) || "";
  } catch (e) {
    return "";
  }
}

function updateSettingsBackupInfo() {
  const meta = document.getElementById("autobackupMeta");
  if (meta) {
    const s = getBrowserBackupSavedAt();
    if (s) {
      let label = s;
      try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleString();
        }
      } catch (e) {
        /* keep raw */
      }
      meta.textContent = t("lastBrowserBackup").replace("{t}", label);
    } else {
      meta.textContent = t("noBrowserBackup");
    }
  }
  const cb = document.getElementById("cbAutobackup");
  if (cb) cb.checked = getAutobackupEnabled();
  const btnR = document.getElementById("btnRestoreBrowserBackup");
  if (btnR) {
    btnR.disabled = !getBrowserBackupSavedAt();
  }
}

function restoreFromBrowserBackup() {
  if (!hasMainproLogin()) return;
  const raw = (function () {
    try {
      return localStorage.getItem(MAINPRO_BROWSER_BACKUP_KEY);
    } catch (e) {
      return null;
    }
  })();
  if (!raw) {
    showJobsToast(t("noBrowserBackup"));
    return;
  }
  let o;
  try {
    o = JSON.parse(raw);
  } catch (e) {
    showJobsToast("Invalid backup");
    return;
  }
  if (!o || !Array.isArray(o.jobs)) {
    showJobsToast("Invalid backup");
    return;
  }
  if (
    typeof o.schemaVersion === "number" &&
    o.schemaVersion > MAINPRO_JOBS_DATA_SCHEMA
  ) {
    showJobsToast(t("importSchemaNewer"));
    return;
  }
  return importJobsFromArrayAfterConfirm(
    o.jobs,
    "browser backup",
    t("backupRestored")
  );
}

function importJobsFromArrayAfterConfirm(arr, sourceLabel, toastMsg) {
  const n = arr.length;
  if (
    !confirm(
      n === 0
        ? (sourceLabel
            ? "Replace all jobs with an empty list from " + sourceLabel + "?"
            : "Import an empty list? All current jobs on this device will be removed. Continue?")
        : "Replace all " +
            jobs.length +
            " current job(s) with " +
            n +
            " from " +
            (sourceLabel || "the file") +
            "? This cannot be undone."
    )
  ) {
    return false;
  }
  try {
    localStorage.setItem("jobs", JSON.stringify(arr));
  } catch (e) {
    showJobsToast("Storage full or blocked");
    return false;
  }
  jobs = loadJobs();
  if (mobileJobDetailId) {
    const still = jobs.some((x) => String(x.id) === String(mobileJobDetailId));
    if (!still) {
      mobileJobDetailId = null;
      const m = document.getElementById("jobDetailModal");
      if (m) m.hidden = true;
      syncAppBodyScrollLock();
    }
  }
  statusFilter = "All";
  myJobsFilterActive = false;
  engineerFilter = "All";
  historyViewFilter = "all";
  const s = document.getElementById("jobSearch");
  if (s) s.value = "";
  if (_jobSearchDebounceTimer) {
    clearTimeout(_jobSearchDebounceTimer);
    _jobSearchDebounceTimer = null;
  }
  setTab("active");
  Object.keys(jobLogExpanded).forEach(function (k) {
    delete jobLogExpanded[k];
  });
  render();
  hapticNarrow();
  showJobsToast(toastMsg || "Import complete");
  const s2 = document.getElementById("jobSearch");
  if (s2) {
    try {
      s2.focus();
    } catch (e) {
      /* ignore */
    }
  }
  return true;
}

function isOnboardingDone() {
  try {
    return localStorage.getItem(MAINPRO_ONBOARDING_KEY) === "1";
  } catch (e) {
    return false;
  }
}

function setOnboardingDone() {
  try {
    localStorage.setItem(MAINPRO_ONBOARDING_KEY, "1");
  } catch (e) {
    /* ignore */
  }
}

function updateOnboardingFooterButton() {
  const m = document.getElementById("onboardingModal");
  if (!m) return;
  const cur = parseInt(m.getAttribute("data-onboarding-step") || "0", 10) || 0;
  const step = m.querySelectorAll(".onboarding-step");
  const btn = m.querySelector(".onboarding-next");
  if (!btn) return;
  if (cur >= step.length - 1) {
    btn.textContent = t("onboardingDone");
  } else {
    btn.textContent = t("onboardingNext");
  }
}

function showOnboardingModal() {
  const m = document.getElementById("onboardingModal");
  if (!m) return;
  m.hidden = false;
  const step = m.querySelectorAll(".onboarding-step");
  for (let i = 0; i < step.length; i++) {
    step[i].hidden = i !== 0;
  }
  m.setAttribute("data-onboarding-step", "0");
  updateOnboardingFooterButton();
  syncAppBodyScrollLock();
  const ob = m.querySelector(".onboarding-body");
  if (ob) ob.scrollTop = 0;
  updateMobileFormFab();
  updateMobileScrollTopBtn();
  try {
    m.querySelector(".onboarding-next").focus();
  } catch (e) {
    /* ignore */
  }
}

function closeOnboardingModal() {
  const m = document.getElementById("onboardingModal");
  if (m) m.hidden = true;
  syncAppBodyScrollLock();
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

function onboardingNext() {
  const m = document.getElementById("onboardingModal");
  if (!m) return;
  const cur = parseInt(m.getAttribute("data-onboarding-step") || "0", 10) || 0;
  const step = m.querySelectorAll(".onboarding-step");
  if (cur >= step.length - 1) {
    onboardingDone();
    return;
  }
  const next = cur + 1;
  for (let i = 0; i < step.length; i++) {
    step[i].hidden = i !== next;
  }
  m.setAttribute("data-onboarding-step", String(next));
  const ob = m.querySelector(".onboarding-body");
  if (ob) ob.scrollTop = 0;
  updateOnboardingFooterButton();
}

function onboardingDone() {
  const box = document.getElementById("onboardingDontShow");
  if (box && box.checked) {
    setOnboardingDone();
  }
  closeOnboardingModal();
}

function onboardingSkip() {
  closeOnboardingModal();
}

function tryShowOnboarding() {
  if (!hasMainproLogin() || isOnboardingDone()) return;
  if (mobileJobDetailId || _urlJobIdToOpen) return;
  if (getSearchQuery() && getSearchQuery().length > 0) return;
  const m = document.getElementById("onboardingModal");
  if (m && !m.hidden) return;
  showOnboardingModal();
}

/** Same filter pipeline as in render() — for live counts without a full re-render. */
function computeFilteredListCounts() {
  const q = getSearchQuery();
  let actives;
  if (statusFilter === "Deleted") {
    actives = jobs.filter((j) => j.deleted === true);
  } else {
    actives = jobs.filter((j) => isActiveStatus(j.status) && !j.deleted);
    actives = actives.filter((j) => matchesStatusFilterForActive(j));
  }
  actives = actives.filter((j) => matchesJobSearch(j, q));
  actives = actives.filter((j) => matchesEngineerFilter(j));
  let doneList = jobs
    .filter((j) => j.status === "Done" && !j.deleted)
    .slice();
  if (historyViewFilter === "completedToday") {
    doneList = doneList.filter((j) => isCompletedAtToday(j.completedAt));
  }
  doneList = doneList.filter((j) => matchesJobSearch(j, q));
  doneList = doneList.filter((j) => matchesEngineerFilter(j));
  return { nActive: actives.length, nHistory: doneList.length };
}

function render() {
  captureListFocusState();
  syncOverdueFlags();
  appendOverdueAuditIfNeeded();
  appendSlaBecameOverdueAuditIfNeeded();

  const activeEl = document.getElementById("jobs-active");
  const historyEl = document.getElementById("jobs-history");
  if (activeEl) activeEl.innerHTML = "";
  if (historyEl) historyEl.innerHTML = "";

  const q = getSearchQuery();
  _renderSearchQ = q;
  const jobSearchDisplay = (function () {
    const s = document.getElementById("jobSearch");
    return s ? String(s.value || "").trim() : "";
  })();

  let actives;
  if (statusFilter === "Deleted") {
    actives = jobs.filter((j) => j.deleted === true);
  } else {
    actives = jobs.filter((j) => isActiveStatus(j.status) && !j.deleted);
    actives = actives.filter((j) => matchesStatusFilterForActive(j));
  }
  actives = actives.filter((j) => matchesJobSearch(j, q));
  actives = actives.filter((j) => matchesEngineerFilter(j));
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
  doneList = doneList.filter((j) => matchesEngineerFilter(j));

  if (actives.length === 0 && activeEl) {
    const canReset = shouldOfferResetForEmptyActive();
    const resetBlock = canReset
      ? '<p class="empty-hint empty-hint--actions"><button type="button" class="btn-empty-reset" onclick="resetFiltersAndSearch()">' +
        t("resetFilters") +
        "</button></p>"
      : "";
    const filterHints = emptyFilterHintsHtml(
      getActiveEmptyFilterHintLines(jobSearchDisplay)
    );
    const emptyMsg =
      statusFilter === "Deleted"
        ? "<p class=\"empty-hint\">" + t("emptyDeleted") + "</p>" + filterHints + resetBlock
        : "<p class=\"empty-hint\">" + t("emptyActive") + "</p>" + filterHints + resetBlock;
    activeEl.innerHTML = emptyMsg;
  } else {
    actives.forEach((j) => {
      activeEl.innerHTML += j.deleted
        ? renderDeletedCard(j)
        : renderActiveCard(j);
    });
  }

  if (doneList.length === 0 && historyEl) {
    const canHReset = shouldOfferResetForEmptyHistory();
    const hReset = canHReset
      ? '<p class="empty-hint empty-hint--actions"><button type="button" class="btn-empty-reset" onclick="resetFiltersAndSearch()">' +
        t("resetFilters") +
        "</button></p>"
      : "";
    const hHints = emptyFilterHintsHtml(
      getHistoryEmptyFilterHintLines(jobSearchDisplay)
    );
    const baseH =
      historyViewFilter === "completedToday"
        ? "<p class=\"empty-hint\">" + t("emptyHistoryToday") + "</p>"
        : "<p class=\"empty-hint\">" + t("emptyHistory") + "</p>";
    historyEl.innerHTML = baseH + hHints + hReset;
  } else {
    doneList.forEach((j) => {
      historyEl.innerHTML += renderHistoryCard(j);
    });
  }
  updateDashboard();
  syncEngineerFilterUi();
  updateJobDetailModal();
  updateMobileFormFab();
  updateMobileScrollTopBtn();
  updateClearFiltersButton();
  updateListResultCount(actives.length, doneList.length);
  requestAnimationFrame(function () {
    restoreListFocusState();
  });
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
  return {
    text: c.text,
    createdAt: c.createdAt,
    time: c.time,
    date: c.date,
    author,
    type,
  };
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

/** Count system log lines today whose text matches any of the regexes (desktop KPI sublines). */
function countSystemLogPhrasesToday(res) {
  const dayStart = getLocalDayStartMs(new Date());
  if (isNaN(dayStart)) return 0;
  const dayEnd = dayStart + 86400000;
  let n = 0;
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (!j || !Array.isArray(j.comments)) continue;
    for (let k = 0; k < j.comments.length; k++) {
      const c = j.comments[k];
      if (!isSystemLogComment(c)) continue;
      const msg = String(c.text == null ? "" : c.text);
      let ok = false;
      for (let r = 0; r < res.length; r++) {
        if (res[r].test(msg)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
      const ms = getCommentSortTimeMs(c);
      if (isNaN(ms) || ms < dayStart || ms >= dayEnd) continue;
      n++;
    }
  }
  return n;
}

/**
 * For engineer / user message cards, tint to match the parent job card.
 */
function getCommentLogToneClass(j) {
  if (j.deleted) return "comment-log--tone-default";
  if (isSlaOverdue(j)) return "comment-log--tone-overdue";
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

function jobIsoTimeMs(s) {
  if (s == null || s === "") return 0;
  const t = new Date(String(s).trim()).getTime();
  return t > 0 && !isNaN(t) ? t : 0;
}

/**
 * Newest “touch” for desktop table: created/completed/deleted, pending until, due, latest comment.
 */
function getJobLastActivityMs(j) {
  if (!j) return 0;
  let m = 0;
  m = Math.max(m, jobIsoTimeMs(j.createdAt));
  m = Math.max(m, jobIsoTimeMs(j.completedAt));
  m = Math.max(m, jobIsoTimeMs(j.deletedAt));
  m = Math.max(m, jobIsoTimeMs(j.pendingUntil));
  m = Math.max(m, jobIsoTimeMs(j.dueAt));
  const list = j.comments;
  if (Array.isArray(list)) {
    for (let i = 0; i < list.length; i++) {
      const cm = getCommentSortTimeMs(list[i]);
      if (!isNaN(cm) && cm > 0) m = Math.max(m, cm);
    }
  }
  return m || jobIsoTimeMs(j.createdAt);
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
  if (/^Became Overdue$/i.test(m)) return "Became Overdue";
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
  x = m.match(/^Assigned to (.+)$/i);
  if (x) return "Assigned to " + x[1].trim();
  return m;
}

/** Timeline dot color via `data-type` on `.activity-item` (visual only). */
function getActivityDataType(displayLabel) {
  const L = String(displayLabel || "").toLowerCase();
  if (L.indexOf("overdue") >= 0) return "overdue";
  if (L.indexOf("restored") >= 0) return "restored";
  if (L.indexOf("marked done") >= 0 || L === "marked done") return "done";
  if (L.indexOf("pending") >= 0) return "pending";
  if (L.indexOf("in progress") >= 0) return "progress";
  if (L.indexOf("deleted") >= 0) return "deleted";
  if (L.indexOf("assigned to") >= 0) return "progress";
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
  const dataType = getActivityDataType(label);
  const labelEsc = escapeHtml(label);
  const timeRaw = d.time || d.date || d.createdAt;
  const timeEsc = escapeHtml(formatTimeOnly(timeRaw) || "—");
  return `<div class="activity-item" data-type="${escapeHtml(
    dataType
  )}" role="listitem"><div class="activity-row"><span class="activity-line-text"><strong>${labelEsc}</strong></span><span class="activity-time">${timeEsc}</span></div></div>`;
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
    activityBlock = `<h4 class="log-title section-title system">Activity</h4><div class="activity-timeline${
      expanded ? " expanded" : ""
    }" role="list">${visibleActivity
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

/** Full notes + full activity, no “show all” (mobile detail). */
function renderEngineerNotesForModal(j) {
  const list = getCommentsSortedNewestFirst(j);
  const tone = getCommentLogToneClass(j);
  const engineerList = sortCommentsNewestFirst(
    list.filter((c) => !isSystemLogComment(c))
  );
  const sortedActivity = list.filter((c) => isSystemLogComment(c)).sort(
    (a, b) =>
      new Date(b.time || b.date || b.createdAt).getTime() -
      new Date(a.time || a.date || a.createdAt).getTime()
  );
  let engineerBlock = "";
  if (!engineerList.length) {
    engineerBlock = `<h4 class="log-title section-title">Engineer notes</h4><div class="notes-container engineer-notes-list notes-list job-notes-list"><div class="comment-log comment-log--empty job-log--timeline ${tone}">No notes yet</div></div>`;
  } else {
    engineerBlock = `<h4 class="log-title section-title">Engineer notes</h4><div class="notes-container engineer-notes-list notes-list job-notes-list"><div class="comment-log job-log--timeline job-log--engineer-notes job-log--modal ${tone} expanded" role="list">${engineerList
      .map((c) => renderEngineerLogItemHtml(c))
      .join("")}</div></div>`;
  }
  let activityBlock = "";
  if (sortedActivity.length) {
    activityBlock = `<h4 class="log-title section-title system">Activity</h4><div class="activity-timeline activity-list job-activity-list expanded" role="list">${sortedActivity
      .map((c) => renderSystemLogItemHtml(c))
      .join("")}</div>`;
  }
  if (!list.length) {
    return `<div class="job-log-stack job-log-stack--modal"><h4 class="log-title section-title">Engineer notes</h4><div class="notes-container engineer-notes-list notes-list job-notes-list"><div class="comment-log--empty">No notes or activity</div></div></div>`;
  }
  return `<div class="job-log-stack job-log-stack--modal">${engineerBlock}${activityBlock}</div>`;
}

function getLatestSystemCommentObject(j) {
  const list = getCommentsSortedNewestFirst(j).filter(
    (c) => c && isSystemLogComment(c)
  );
  return list[0] || null;
}

/** Mobile list: one-line priority, assignee, due / hold / overdue (no reporter/timestamps). */
function getJobListDueShortText(j) {
  if (j.deleted) return "";
  if (j.status === "Done") {
    return formatDateClean(j.completedAt) || "";
  }
  if (j.status === "Pending") {
    if (j.isOverdue) return "Overdue";
    const u = (j.pendingUntil && String(j.pendingUntil).trim()) || "";
    if (u) {
      const t = new Date(u).getTime();
      if (isNaN(t)) return "On hold";
      const now = Date.now();
      if (t <= now) return "On hold";
      const { h, m } = formatDurationHMFromMs(t - now);
      return "Hold " + h + "h" + (m > 0 ? " " + m + "m" : "");
    }
    return "On hold";
  }
  const d = (j.dueAt == null ? "" : String(j.dueAt)).trim();
  if (!d) return "";
  const dueT = new Date(d).getTime();
  if (isNaN(dueT)) return "";
  if (j.status === "In Progress" || j.status === "New") {
    if (isSlaOverdue(j)) {
      const { h, m } = formatDurationHMFromMs(Math.max(0, Date.now() - dueT));
      return "Overdue " + h + "h" + (m > 0 ? " " + m + "m" : "");
    }
  }
  const now = Date.now();
  const diff = dueT - now;
  const { h, m } = formatDurationHMFromMs(Math.abs(diff));
  if (diff < 0) return "Overdue " + h + "h" + (m > 0 ? " " + m + "m" : "");
  return "Due " + h + "h" + (m > 0 ? " " + m + "m" : "");
}

function renderJobListMetaCompact(j) {
  const p = normalizePriorityValue(j.priority);
  const slug = p.toLowerCase();
  const pill = `<span class="job-priority-pill job-priority-pill--${slug}">${escapeHtml(
    p
  )}</span>`;
  const eng = escapeHtml(normalizeAssignedTo(j));
  const dueText = getJobListDueShortText(j);
  const se = '<span class="job-list-meta-sep" aria-hidden="true">·</span>';
  const bits = [pill, se, `<span class="job-list-meta-eng">${eng}</span>`];
  if (dueText) {
    bits.push(se, `<span class="job-list-meta-due">${escapeHtml(dueText)}</span>`);
  }
  return `<div class="job-list-meta-line">${bits.join("")}</div>`;
}

function renderActiveCardCompact(j) {
  const st = j.status;
  const vis = getJobCardStatusVisual(j);
  const qid = idAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-list-photo" aria-hidden="true"><img class="job-photo-thumb job-list-photo__img" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button" /></div>`
    : "";
  const sInProgress = JSON.stringify("In Progress");
  const sDone = JSON.stringify("Done");
  const progressBtn =
    st === "New" || st === "Pending"
      ? `<button type="button" class="btn-sec" onclick="event.stopPropagation(); setStatus(${qid}, ${sInProgress})">In Progress</button>`
      : "";
  const doneBtn = `<button type="button" class="btn-done" onclick="event.stopPropagation(); setStatus(${qid}, ${sDone})">Done</button>`;
  const idForAttr = jobIdForDomAttr(j.id);
  const isParkOverDueAttr = st === "Pending" && j.isOverdue;
  const slaO = isSlaOverdue(j) ? "1" : "0";
  const onlyDone = !progressBtn;
  const actCls = "job-actions job-actions--compact mobile-card-actions";
  const actionRow = progressBtn
    ? `<div class="${actCls}"><div class="job-action-cell">${progressBtn}</div><div class="job-action-cell">${doneBtn}</div></div>`
    : `<div class="${actCls} mobile-card-actions--one"><div class="job-action-cell job-action-cell--ghost" aria-hidden="true"></div><div class="job-action-cell">${doneBtn}</div></div>`;
  return `
      <div class="job job-card job-card--list-compact mobile-job-card ${vis.cardClass}" data-job-id="${idForAttr}" data-status="${escapeHtml(
    st
  )}" data-sla-overdue="${slaO}" data-park-overdue="${
    isParkOverDueAttr ? "1" : "0"
  }">
        <div class="job-card-tap" role="button" tabindex="0" aria-label="Open full job">
          <div class="job-list-card__row-head">
            <div class="job-list-card__room job-title mobile-job-title"><strong>${hl(
              j.location
            )}</strong></div>
            <span class="job-status-badge job-status-badge--${
              vis.badgeMod
            }">${vis.badgeText}</span>
          </div>
          <div class="job-list-card__row-problem">
            <div class="job-problem job-problem--compact job-problem--list-clamp mobile-job-problem">${hl(
              j.problem
            )}</div>
            ${photoBlock}
          </div>
          ${renderJobListMetaCompact(j).replace(
            'class="job-list-meta-line"',
            'class="job-list-meta-line mobile-job-meta"'
          )}
        </div>
        ${actionRow}
      </div>
    `;
}

function renderHistoryCardCompact(j) {
  const vis = getJobCardStatusVisual(j);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-list-photo" aria-hidden="true"><img class="job-photo-thumb job-list-photo__img" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button" /></div>`
    : "";
  const when = formatDateClean(j.completedAt);
  const p = normalizePriorityValue(j.priority);
  const slug = p.toLowerCase();
  const pill = `<span class="job-priority-pill job-priority-pill--${slug}">${escapeHtml(
    p
  )}</span>`;
  const eng = escapeHtml(normalizeAssignedTo(j));
  const se = '<span class="job-list-meta-sep" aria-hidden="true">·</span>';
  const whenEsc = when ? escapeHtml(when) : "—";
  const metaLine = `<div class="job-list-meta-line mobile-job-meta">${pill}${se}<span class="job-list-meta-eng">${eng}</span>${se}<span class="job-list-meta-due">${whenEsc}</span></div>`;
  return `
      <div class="job job-card job-card--list-compact mobile-job-card done job-history ${vis.cardClass
    }" data-job-id="${jobIdForDomAttr(j.id)}" data-status="Done">
        <div class="job-card-tap" role="button" tabindex="0" aria-label="Open full job">
          <div class="job-list-card__row-head">
            <div class="job-list-card__room job-title mobile-job-title"><strong>${hl(
              j.location
            )}</strong></div>
            <span class="job-status-badge job-status-badge--${vis.badgeMod}">${vis.badgeText}</span>
          </div>
          <div class="job-list-card__row-problem">
            <div class="job-problem job-problem--compact job-problem--list-clamp mobile-job-problem">${hl(
              j.problem
            )}</div>
            ${photoBlock}
          </div>
          ${metaLine}
        </div>
      </div>
    `;
}

function renderDeletedCardCompact(j) {
  const idForAttr = jobIdForDomAttr(j.id);
  const visClass = "job-card-shell";
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-list-photo" aria-hidden="true"><img class="job-photo-thumb job-list-photo__img" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button" /></div>`
    : "";
  const delWhen = formatDateClean(j.deletedAt) || "—";
  const p = normalizePriorityValue(j.priority);
  const slug = p.toLowerCase();
  const pill = `<span class="job-priority-pill job-priority-pill--${slug}">${escapeHtml(
    p
  )}</span>`;
  const eng = escapeHtml(normalizeAssignedTo(j));
  const se = '<span class="job-list-meta-sep" aria-hidden="true">·</span>';
  const metaLine = `<div class="job-list-meta-line mobile-job-meta">${pill}${se}<span class="job-list-meta-eng">${eng}</span>${se}<span class="job-list-meta-due">Del ${escapeHtml(
    delWhen
  )}</span></div>`;
  return `
      <div class="job job-card job-card--list-compact mobile-job-card deleted ${visClass
    }" data-job-id="${idForAttr}" data-status="Deleted">
        <div class="job-card-tap" role="button" tabindex="0" aria-label="Open full job">
          <div class="job-list-card__row-head">
            <div class="job-list-card__room job-title mobile-job-title"><strong>${hl(
              j.location
            )}</strong></div>
            <span class="job-status-badge job-status-badge--deleted">DELETED</span>
          </div>
          <div class="job-list-card__row-problem">
            <div class="job-problem job-problem--compact job-problem--list-clamp mobile-job-problem">${hl(
              j.problem
            )}</div>
            ${photoBlock}
          </div>
          ${metaLine}
        </div>
      </div>
    `;
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
 * Premium shell + CSS status slugs (done, new, in-progress, pending, on-hold, overdue).
 * SLA past dueAt takes badge OVERDUE; status in data is unchanged.
 */
function getJobCardStatusVisual(j) {
  const st = j.status;
  if (st === "Done") {
    return { cardClass: "job-card-shell done", badgeMod: "done", badgeText: "DONE" };
  }
  if (isSlaOverdue(j)) {
    return {
      cardClass: "job-card-shell overdue",
      badgeMod: "overdue",
      badgeText: "OVERDUE",
    };
  }
  if (st === "New") {
    return { cardClass: "job-card-shell new", badgeMod: "new", badgeText: "NEW" };
  }
  if (st === "In Progress") {
    return {
      cardClass: "job-card-shell in-progress",
      badgeMod: "progress",
      badgeText: "IN PROGRESS",
    };
  }
  if (st === "Pending") {
    if (j.isOverdue) {
      return { cardClass: "job-card-shell overdue", badgeMod: "overdue", badgeText: "OVERDUE" };
    }
    return { cardClass: "job-card-shell pending on-hold", badgeMod: "pending", badgeText: "ON HOLD" };
  }
  return { cardClass: "job-card-shell new", badgeMod: "new", badgeText: "NEW" };
}

function renderActiveCardFull(j, forModal) {
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
  const isParkOverDueAttr = st === "Pending" && j.isOverdue;
  const slaO = isSlaOverdue(j) ? "1" : "0";
  let statusInfoBlock = "";
  if (st === "Pending") {
    const si = [];
    si.push(
      `<div class="pending-reason-line">Reason: ${escapeHtml(pr || "—")}</div>`
    );
    const timerUntil = getPendingTimerUntilLine(j);
    if (timerUntil) si.push(timerUntil);
    statusInfoBlock = `<div class="job-status-info">${si.join("")}</div>`;
  }
  const logClass = forModal ? " job--modal-detail" : jobCardLogsExpandedClass(j);
  const notesBlock = forModal
    ? renderEngineerNotesForModal(j)
    : renderEngineerNotesSavedSection(j);
  return `
      <div class="job job-card ${vis.cardClass}${logClass}" data-job-id="${idForAttr}" data-status="${escapeHtml(
    st
  )}" data-sla-overdue="${slaO}" data-park-overdue="${
    isParkOverDueAttr ? "1" : "0"
  }">
        <span class="job-status-badge job-status-badge--${vis.badgeMod}">${vis.badgeText}</span>
        ${photoBlock}
        <div class="job-body job-meta">
          <div class="job-title"><strong>${hl(
            j.location
          )}</strong></div>
          <div class="job-problem">${hl(j.problem)}</div>
          ${renderJobMetaRow(j)}
          ${renderJobAssignBlock(j, { modal: forModal, disabled: false })}
          ${renderJobPrioritySlaBlock(j)}
          ${statusInfoBlock}
        </div>
        ${notesBlock}
        <label class="comment-label">Add a note <span class="comment-shortcut-hint" aria-hidden="true">· Ctrl/⌘+S</span></label>
        <textarea class="comment-field comment-new" rows="2" placeholder="Type a note, then tap Save note" title="Ctrl+S or ⌘+S to save (desktop)"></textarea>
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

function renderActiveCard(j) {
  if (isNarrowLayout()) {
    return renderActiveCardCompact(j);
  }
  return renderActiveCardFull(j, false);
}

function renderHistoryCardFull(j, forModal) {
  const vis = getJobCardStatusVisual(j);
  const qid = idAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button"></div>`
    : "";
  const when = formatDateClean(j.completedAt);
  const logClass = forModal ? " job--modal-detail" : jobCardLogsExpandedClass(j);
  const notesBlock = forModal
    ? renderEngineerNotesForModal(j)
    : renderEngineerNotesSavedSection(j);
  return `
      <div class="job job-card done job-history ${vis.cardClass}${logClass}" data-job-id="${jobIdForDomAttr(
    j.id
  )}" data-status="Done">
        <span class="job-status-badge job-status-badge--${vis.badgeMod}">${vis.badgeText}</span>
        ${photoBlock}
        <div class="job-body job-meta">
          <div class="job-title"><strong>${hl(
            j.location
          )}</strong></div>
          <div class="job-problem">${hl(j.problem)}</div>
          ${renderJobMetaRow(j)}
          ${renderJobAssignBlock(j, { modal: forModal, disabled: true })}
          ${renderJobPrioritySlaBlock(j)}
          <div class="job-status-info"><div class="completed-line">Completed: ${escapeHtml(
            when || "—"
          )}</div></div>
        </div>
        ${notesBlock}
        <div class="job-actions job-actions-single">
          <button type="button" class="btn-del" onclick='deleteJob(${qid})'>Delete</button>
        </div>
      </div>
    `;
}

function renderHistoryCard(j) {
  if (isNarrowLayout()) {
    return renderHistoryCardCompact(j);
  }
  return renderHistoryCardFull(j, false);
}

function renderDeletedCardFull(j, forModal) {
  const idForAttr = jobIdForDomAttr(j.id);
  const safePhoto =
    j.photo && String(j.photo).indexOf("data:image/") === 0 ? j.photo : "";
  const photoBlock = safePhoto
    ? `<div class="job-photo-wrap"><img class="job-photo-thumb" src="${safePhoto}" alt="Fault photo" tabindex="0" role="button"></div>`
    : "";
  const delWhen = formatDateClean(j.deletedAt) || "—";
  const prev = (j.previousStatus && String(j.previousStatus).trim()) || "—";
  const logClass = forModal ? " job--modal-detail" : jobCardLogsExpandedClass(j);
  const notesBlock = forModal
    ? renderEngineerNotesForModal(j)
    : renderEngineerNotesSavedSection(j);
  return `
      <div class="job job-card deleted job-card-shell${logClass}" data-job-id="${idForAttr}" data-status="Deleted">
        <span class="job-status-badge job-status-badge--deleted">DELETED</span>
        ${photoBlock}
        <div class="job-body job-meta">
          <div class="job-title"><strong>${hl(
            j.location
          )}</strong></div>
          <div class="job-problem">${hl(j.problem)}</div>
          ${renderJobMetaRow(j)}
          ${renderJobAssignBlock(j, { modal: forModal, disabled: true })}
          ${renderJobPrioritySlaBlock(j)}
          <div class="job-status-info"><div class="deleted-meta-line">Deleted: ${escapeHtml(
            delWhen
          )}</div><div class="deleted-meta-line">Previous: ${escapeHtml(
    prev
  )}</div></div>
        </div>
        ${notesBlock}
        <div class="job-actions job-actions-deleted">
          <button type="button" class="btn-restore">Restore</button>
          <button type="button" class="btn-permanent-delete">Delete permanently</button>
        </div>
      </div>
    `;
}

function renderDeletedCard(j) {
  if (isNarrowLayout()) {
    return renderDeletedCardCompact(j);
  }
  return renderDeletedCardFull(j, false);
}

function renderJobDetailBodyForModal(j) {
  if (j.deleted) {
    return renderDeletedCardFull(j, true);
  }
  if (j.status === "Done") {
    return renderHistoryCardFull(j, true);
  }
  return renderActiveCardFull(j, true);
}

function getJobDetailHeaderBadgeVisual(j) {
  if (j.deleted) {
    return { badgeMod: "deleted", badgeText: "DELETED" };
  }
  return getJobCardStatusVisual(j);
}

function setReportFormCollapsed(collapse) {
  const form = document.getElementById("reportJobForm");
  if (!form) return;
  if (collapse) {
    form.classList.add("report-job-form--collapsed");
  } else {
    form.classList.remove("report-job-form--collapsed");
  }
}

function updateJobDetailModal() {
  const modal = document.getElementById("jobDetailModal");
  const content = document.getElementById("jobDetailModalBody");
  if (!modal || !content) return;
  if (!jobDetailModalHostActive() || !mobileJobDetailId) {
    if (!jobDetailModalHostActive()) {
      mobileJobDetailId = null;
    }
    modal.hidden = true;
    syncAppBodyScrollLock();
    updateMobileScrollTopBtn();
    return;
  }
  const j = jobs.find((x) => String(x.id) === String(mobileJobDetailId));
  if (!j) {
    mobileJobDetailId = null;
    modal.hidden = true;
    const b = document.getElementById("jobDetailModalBadge");
    if (b) {
      b.textContent = "";
      b.className = "job-detail-modal__badge";
      b.removeAttribute("aria-label");
    }
    syncAppBodyScrollLock();
    updateMobileScrollTopBtn();
    return;
  }
  content.innerHTML = renderJobDetailBodyForModal(j);
  const badgeEl = document.getElementById("jobDetailModalBadge");
  if (badgeEl) {
    const vis = getJobDetailHeaderBadgeVisual(j);
    badgeEl.className =
      "job-detail-modal__badge job-status-badge job-status-badge--" + vis.badgeMod;
    badgeEl.textContent = vis.badgeText;
    badgeEl.setAttribute("aria-label", "Status: " + vis.badgeText);
  }
  modal.hidden = false;
  syncAppBodyScrollLock();
  updateMobileScrollTopBtn();
}

/**
 * Оверлеи: деталь заявки, Park, фото, подсказки — влияют на scroll lock, FAB, pull-to-refresh.
 */
function getJobsOpenLayers() {
  const jobDetailModal = document.getElementById("jobDetailModal");
  const parkModal = document.getElementById("parkModal");
  const photoLightbox = document.getElementById("photoLightbox");
  const jobsTipsModal = document.getElementById("jobsTipsModal");
  const jobsSettingsModal = document.getElementById("jobsSettingsModal");
  const onboardingModal = document.getElementById("onboardingModal");
  const mobileReportModal = document.getElementById("mobileReportJobModal");
  return {
    jobDetail: !!(jobDetailModal && !jobDetailModal.hidden),
    park: !!(parkModal && !parkModal.hidden),
    photo: !!(photoLightbox && !photoLightbox.hidden),
    tips: !!(jobsTipsModal && !jobsTipsModal.hidden),
    settings: !!(jobsSettingsModal && !jobsSettingsModal.hidden),
    onboarding: !!(onboardingModal && !onboardingModal.hidden),
    newJobSheet: !!(
      mobileReportModal &&
      !mobileReportModal.hidden &&
      isNarrowLayout()
    ),
  };
}

function syncAppBodyScrollLock() {
  const L = getJobsOpenLayers();
  if (L.jobDetail) {
    document.body.style.overflow = "hidden";
    return;
  }
  if (L.newJobSheet) {
    document.body.style.overflow = "hidden";
    return;
  }
  if (L.tips) {
    document.body.style.overflow = "hidden";
    return;
  }
  if (L.settings) {
    document.body.style.overflow = "hidden";
    return;
  }
  if (L.onboarding) {
    document.body.style.overflow = "hidden";
    return;
  }
  if (L.park) return;
  if (L.photo) return;
  document.body.style.overflow = "";
}

function updateMobileFormFab() {
  const form = document.getElementById("reportJobForm");
  const fab = document.getElementById("fabNewJob");
  if (!fab) return;
  if (!isNarrowLayout()) {
    fab.classList.remove("fab-hidden");
    fab.removeAttribute("aria-hidden");
    return;
  }
  const L = getJobsOpenLayers();
  const formOpen = form && !form.classList.contains("report-job-form--collapsed");
  const hide =
    formOpen ||
    L.newJobSheet ||
    L.jobDetail ||
    L.tips ||
    L.settings ||
    L.onboarding ||
    mobileFabHiddenByScroll;
  if (hide) {
    fab.classList.add("fab-hidden");
    fab.setAttribute("aria-hidden", "true");
  } else {
    fab.classList.remove("fab-hidden");
    fab.removeAttribute("aria-hidden");
  }
}

/**
 * NARROW: кнопка «наверх» слева внизу (не пересекает + Job справа).
 */
function updateJobsStickyScrollClass() {
  const el = document.querySelector(".jobs-sticky");
  if (!el) return;
  if (typeof isNarrowLayout === "function" && !isNarrowLayout()) {
    el.classList.remove("jobs-sticky--scrolled");
    return;
  }
  const y =
    window.scrollY ||
    window.pageYOffset ||
    (document.documentElement && document.documentElement.scrollTop) ||
    0;
  el.classList.toggle("jobs-sticky--scrolled", y > 10);
}

function updateMobileScrollTopBtn() {
  const btn = document.getElementById("btnScrollTop");
  if (!btn) return;
  if (!isNarrowLayout() || !hasMainproLogin()) {
    btn.classList.add("btn-scroll-top--hidden");
    btn.setAttribute("aria-hidden", "true");
    return;
  }
  const am = document.getElementById("appMain");
  if (!am || am.hidden) {
    btn.classList.add("btn-scroll-top--hidden");
    btn.setAttribute("aria-hidden", "true");
    return;
  }
  const L = getJobsOpenLayers();
  if (L.jobDetail || L.newJobSheet || L.park || L.photo || L.tips || L.settings || L.onboarding) {
    btn.classList.add("btn-scroll-top--hidden");
    btn.setAttribute("aria-hidden", "true");
    return;
  }
  const y =
    window.scrollY ||
    window.pageYOffset ||
    (document.documentElement && document.documentElement.scrollTop) ||
    0;
  if (y < 160) {
    btn.classList.add("btn-scroll-top--hidden");
    btn.setAttribute("aria-hidden", "true");
  } else {
    btn.classList.remove("btn-scroll-top--hidden");
    btn.removeAttribute("aria-hidden");
  }
}

function scrollToListTop() {
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e) {
    window.scrollTo(0, 0);
  }
  setTimeout(function () {
    if (isNarrowLayout()) {
      onMobileFabScroll();
      updateMobileScrollTopBtn();
    }
  }, 400);
}

/**
 * NARROW only: show FAB near top; hide when scrolling down, show when scrolling up.
 * Form open / full-screen job handled in updateMobileFormFab (this updates scroll flags only).
 */
function onMobileFabScroll() {
  if (typeof window === "undefined") return;
  updateJobsStickyScrollClass();
  if (!isNarrowLayout()) return;
  if (!hasMainproLogin()) return;
  const am = document.getElementById("appMain");
  if (!am || am.hidden) return;
  const y =
    window.scrollY ||
    window.pageYOffset ||
    (document.documentElement && document.documentElement.scrollTop) ||
    0;
  const form = document.getElementById("reportJobForm");
  const L = getJobsOpenLayers();
  const formOpen = form && !form.classList.contains("report-job-form--collapsed");
  if (formOpen || L.newJobSheet || L.jobDetail || L.tips || L.settings) {
    mobileFabLastScrollY = y;
    updateMobileFormFab();
    updateMobileScrollTopBtn();
    return;
  }
  const d = MOBILE_FAB_SCROLL_DELTA;
  if (y <= MOBILE_FAB_TOP_ZONE_PX) {
    mobileFabHiddenByScroll = false;
  } else {
    if (y > mobileFabLastScrollY + d) {
      mobileFabHiddenByScroll = true;
    } else if (y < mobileFabLastScrollY - d) {
      mobileFabHiddenByScroll = false;
    }
  }
  mobileFabLastScrollY = y;
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

function onJobCardTapOpen(e) {
  if (!isNarrowLayout()) return;
  if (e.target.closest(".btn-job-log-toggle")) return;
  if (e.target.closest(".job-photo-thumb")) return;
  if (e.target.closest(".job-actions")) return;
  if (e.target.closest(".job-assign-block")) return;
  const tap = e.target.closest(".job-card-tap");
  if (!tap) return;
  const jobEl = tap.closest(".job");
  if (!jobEl || !jobEl.classList.contains("job-card--list-compact")) return;
  if (
    e.target.closest(
      "button, a, input, textarea, select, label, option, [type=file]"
    )
  ) {
    return;
  }
  const id = jobIdFromDomAttr(jobEl.getAttribute("data-job-id"));
  if (id == null) return;
  e.preventDefault();
  mobileJobsListScrollY =
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    0;
  mobileJobDetailId = String(id);
  render();
}

function closeJobDetailModal() {
  mobileJobDetailId = null;
  const modal = document.getElementById("jobDetailModal");
  if (modal) modal.hidden = true;
  const badgeEl = document.getElementById("jobDetailModalBadge");
  if (badgeEl) {
    badgeEl.textContent = "";
    badgeEl.className = "job-detail-modal__badge";
    badgeEl.removeAttribute("aria-label");
  }
  syncAppBodyScrollLock();
  const y = mobileJobsListScrollY;
  mobileFabLastScrollY = y;
  if (y <= MOBILE_FAB_TOP_ZONE_PX) {
    mobileFabHiddenByScroll = false;
  } else {
    mobileFabHiddenByScroll = true;
  }
  updateMobileFormFab();
  updateMobileScrollTopBtn();
  requestAnimationFrame(function () {
    window.scrollTo(0, y);
    mobileFabLastScrollY = y;
    updateMobileFormFab();
    updateMobileScrollTopBtn();
  });
}

function openDesktopJobFromTable(id) {
  if (id == null) return;
  mobileJobsListScrollY =
    window.scrollY ||
    window.pageYOffset ||
    (document.documentElement && document.documentElement.scrollTop) ||
    0;
  mobileJobDetailId = String(id);
  render();
}

function openDesktopJobFromTableFromButton(btn) {
  if (!btn || !btn.getAttribute) return;
  const raw = btn.getAttribute("data-jid");
  if (raw == null || raw === "") return;
  const parsed = jobIdFromDomAttr(raw);
  if (parsed == null) return;
  openDesktopJobFromTable(parsed);
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

/**
 * Скачать JSON-резерв: заявки + текущий пользователь (для переноса/архива).
 */
function exportJobsBackup() {
  if (!hasMainproLogin()) {
    showJobsToast("Select a role first");
    return;
  }
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: MAINPRO_JOBS_DATA_SCHEMA,
      appVersion: MAINPRO_JOBS_APP_VERSION,
      app: "MainPro Jobs",
      mainpro_user: getMainproUser(),
      jobs: jobs,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "mainpro-jobs-backup-" +
      new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) +
      ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showJobsToast("Backup downloaded");
  } catch (e) {
    showJobsToast("Export failed");
  }
}

function csvEscapeCell(v) {
  const s = String(v == null ? "" : v).replace(/\r\n/g, "\n");
  if (/[",\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Таблица заявок для Excel: основные поля.
 */
function exportJobsCsv() {
  if (!hasMainproLogin()) {
    showJobsToast("Select a role first");
    return;
  }
  const headers = [
    "id",
    "location",
    "problem",
    "status",
    "priority",
    "assignedTo",
    "reportedBy",
    "createdAt",
    "dueAt",
    "completedAt",
    "pendingUntil",
    "deleted",
  ];
  const lines = [headers.join(",")];
  jobs.forEach(function (j) {
    if (!j) {
      return;
    }
    const row = headers.map(function (h) {
      if (h === "deleted") {
        return j.deleted ? "1" : "0";
      }
      return csvEscapeCell(j[h]);
    });
    lines.push(row.join(","));
  });
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "mainpro-jobs-" +
    new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) +
    ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showJobsToast("CSV downloaded");
}

function compressDataUrlWithCanvas(dataUrl, maxW, q, next) {
  if (!dataUrl || String(dataUrl).indexOf("data:image/") !== 0) {
    next(dataUrl);
    return;
  }
  if (typeof document === "undefined" || !document.createElement) {
    next(dataUrl);
    return;
  }
  const im = new Image();
  im.onload = function () {
    let w = im.width;
    let h = im.height;
    if (w < 2 || h < 2) {
      next(dataUrl);
      return;
    }
    if (w > maxW) {
      h = Math.max(1, Math.round((h * maxW) / w));
      w = maxW;
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) {
      next(dataUrl);
      return;
    }
    ctx.drawImage(im, 0, 0, w, h);
    let out;
    try {
      out = c.toDataURL("image/jpeg", q);
    } catch (e) {
      out = dataUrl;
    }
    next(out);
  };
  im.onerror = function () {
    next(dataUrl);
  };
  im.src = dataUrl;
}

/**
 * Восстанавливает jobs из JSON (файл Export или сырой массив). Перезаписывает localStorage.
 */
function importJobsFromJsonText(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch (e) {
    showJobsToast("Invalid JSON file");
    return false;
  }
  if (o && typeof o === "object" && !Array.isArray(o)) {
    if (
      typeof o.schemaVersion === "number" &&
      o.schemaVersion > MAINPRO_JOBS_DATA_SCHEMA
    ) {
      showJobsToast(t("importSchemaNewer"));
      return false;
    }
  }
  let arr;
  if (Array.isArray(o)) {
    arr = o;
  } else if (o && Array.isArray(o.jobs)) {
    arr = o.jobs;
  } else {
    showJobsToast("File must contain a jobs array");
    return false;
  }
  return importJobsFromArrayAfterConfirm(arr, "JSON file", "Import complete");
}

/**
 * Слияние: id совпали — заявка заменяется нормализованной; новые id — добавляются.
 */
function importJobsMergeFromJsonText(text) {
  let o;
  try {
    o = JSON.parse(text);
  } catch (e) {
    showJobsToast("Invalid JSON file");
    return false;
  }
  if (o && typeof o === "object" && !Array.isArray(o)) {
    if (
      typeof o.schemaVersion === "number" &&
      o.schemaVersion > MAINPRO_JOBS_DATA_SCHEMA
    ) {
      showJobsToast(t("importSchemaNewer"));
      return false;
    }
  }
  let arr;
  if (Array.isArray(o)) {
    arr = o;
  } else if (o && Array.isArray(o.jobs)) {
    arr = o.jobs;
  } else {
    showJobsToast("File must contain a jobs array");
    return false;
  }
  const n = arr.length;
  if (
    !confirm(
      "Merge " +
        n +
        " job(s) into the current list? Matching id = replace, new id = add. Continue?"
    )
  ) {
    return false;
  }
  const lsBackup = localStorage.getItem("jobs");
  try {
    for (let k = 0; k < arr.length; k++) {
      const raw = arr[k];
      try {
        localStorage.setItem("jobs", JSON.stringify([raw]));
        const norm = loadJobs();
        if (!norm.length) {
          continue;
        }
        const one = norm[0];
        const ix = jobs.findIndex(function (j) {
          return String(j.id) === String(one.id);
        });
        if (ix >= 0) {
          jobs[ix] = one;
        } else {
          jobs.push(one);
        }
      } finally {
        localStorage.setItem("jobs", lsBackup);
      }
    }
  } catch (e) {
    showJobsToast("Merge failed");
    return false;
  }
  save();
  jobs = loadJobs();
  if (mobileJobDetailId) {
    const still = jobs.some(function (x) {
      return String(x.id) === String(mobileJobDetailId);
    });
    if (!still) {
      mobileJobDetailId = null;
      const m = document.getElementById("jobDetailModal");
      if (m) m.hidden = true;
      syncAppBodyScrollLock();
    }
  }
  render();
  hapticNarrow();
  showJobsToast("Merge complete");
  return true;
}

function triggerImportBackup() {
  if (!hasMainproLogin()) {
    showJobsToast("Select a role first");
    return;
  }
  const inp = document.getElementById("importBackupInput");
  if (inp) inp.click();
}

function triggerImportMerge() {
  if (!hasMainproLogin()) {
    showJobsToast("Select a role first");
    return;
  }
  const inp = document.getElementById("importMergeInput");
  if (inp) inp.click();
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
    const assignedTo = getNewJobAssignedToValue();
    const pNorm = normalizePriorityValue(priority);
    const createdAt = new Date().toISOString();
    const job = {
      id: String(Date.now()) + "-" + String(Math.floor(Math.random() * 1e9)),
      location,
      problem,
      priority: pNorm,
      reportedBy: reportedBy || "",
      status: "New",
      comments: [],
      photo: photo || "",
      completedAt: "",
      createdAt: createdAt,
      dueAt: computeDueAtIso(createdAt, pNorm),
      pendingUntil: "",
      pendingReason: "",
      deleted: false,
      deletedAt: "",
      previousStatus: "",
      assignedTo,
      slaBecameOverdueLogged: false,
    };
    if (assignedTo !== "Unassigned") {
      appendSystemComment(job, "Assigned to " + assignedTo);
    }
    jobs.unshift(job);
    save();
    hapticNarrow();
    const locEl = document.getElementById("location");
    const probEl = document.getElementById("problem");
    const priEl = document.getElementById("priority");
    const assignEl = document.getElementById("newJobAssignedTo");
    if (locEl) locEl.value = "";
    if (probEl) probEl.value = "";
    if (priEl) priEl.value = "Low";
    if (assignEl) assignEl.value = "Unassigned";
    if (fileInput) fileInput.value = "";
    const prev = document.getElementById("jobPhotoPreview");
    if (prev) prev.innerHTML = "";
    setReportFormCollapsed(true);
    if (typeof isNarrowLayout === "function" && isNarrowLayout()) {
      if (typeof closeMobileReportJobModal === "function") {
        closeMobileReportJobModal();
      }
      if (typeof showJobsToast === "function") {
        showJobsToast(t("jobCreatedToast"));
      }
    } else {
      setTimeout(function () {
        const stack = document.querySelector(".app-jobs-stack");
        if (stack) {
          try {
            stack.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (e) {
            stack.scrollIntoView(true);
          }
        }
      }, 80);
    }
    render();
    setTab("active");
  };

  if (file) {
    const r = new FileReader();
    r.onload = function () {
      const src = typeof r.result === "string" ? r.result : "";
      compressDataUrlWithCanvas(src, 1280, 0.82, function (out) {
        done(out);
      });
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
  hapticNarrow();
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
  updateMobileScrollTopBtn();
}

function closeParkDialog() {
  _parkTargetId = null;
  const m = document.getElementById("parkModal");
  if (m) m.hidden = true;
  const reasonEl = document.getElementById("parkReasonInput");
  if (reasonEl) reasonEl.value = "";
  syncAppBodyScrollLock();
  updateMobileScrollTopBtn();
}

function openJobsTipsDialog() {
  const m = document.getElementById("jobsTipsModal");
  if (!m) return;
  const am = document.getElementById("appMain");
  if (!am || am.hidden || !hasMainproLogin()) return;
  m.hidden = false;
  document.body.style.overflow = "hidden";
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

function closeJobsTipsDialog() {
  const m = document.getElementById("jobsTipsModal");
  if (m) m.hidden = true;
  syncAppBodyScrollLock();
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

function openJobsSettings() {
  const m = document.getElementById("jobsSettingsModal");
  if (!m) return;
  const am = document.getElementById("appMain");
  if (!am || am.hidden || !hasMainproLogin()) return;
  m.hidden = false;
  updateSettingsBackupInfo();
  syncAppBodyScrollLock();
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

function closeJobsSettings() {
  const m = document.getElementById("jobsSettingsModal");
  if (m) m.hidden = true;
  syncAppBodyScrollLock();
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

function openNewJobFromHeader() {
  scrollToReportJob();
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
  hapticNarrow();
}

function setParkReasonChip(btn) {
  if (!btn || !btn.getAttribute) return;
  const v = btn.getAttribute("data-reason");
  if (v == null) return;
  const reasonEl = document.getElementById("parkReasonInput");
  if (reasonEl) {
    reasonEl.value = v;
    try {
      reasonEl.focus();
    } catch (e) {
      /* ignore */
    }
  }
}

window.openParkDialog = openParkDialog;
window.closeParkDialog = closeParkDialog;
window.confirmPark = confirmPark;
window.setParkReasonChip = setParkReasonChip;
window.openJobsTipsDialog = openJobsTipsDialog;
window.closeJobsTipsDialog = closeJobsTipsDialog;
window.openJobsSettings = openJobsSettings;
window.closeJobsSettings = closeJobsSettings;
window.openNewJobFromHeader = openNewJobFromHeader;
window.openDesktopJobFromTable = openDesktopJobFromTable;
window.openDesktopJobFromTableFromButton = openDesktopJobFromTableFromButton;

function desktopViewAllJobs() {
  try {
    setTab("active");
  } catch (e) {
    /* ignore */
  }
  const el = document.getElementById("app-jobs-stack");
  if (el) {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      el.scrollIntoView(true);
    }
  }
}

function desktopFocusJobSearch() {
  const s = document.getElementById("jobSearch");
  if (s) {
    try {
      s.focus();
      if (typeof s.select === "function") s.select();
    } catch (e) {
      /* ignore */
    }
  }
}

function desktopNotifyClick() {
  showJobsToast(t("desktopNotifEmpty"));
}

function desktopQuickAssign() {
  desktopViewAllJobs();
  const sel = document.getElementById("engineerFilter");
  if (sel) {
    try {
      sel.focus();
    } catch (e) {
      /* ignore */
    }
  }
}

function desktopQuickCalendar() {
  showJobsToast(t("desktopCalendarMsg"));
}

window.desktopViewAllJobs = desktopViewAllJobs;
window.desktopFocusJobSearch = desktopFocusJobSearch;
window.desktopNotifyClick = desktopNotifyClick;
window.desktopQuickAssign = desktopQuickAssign;
window.desktopQuickCalendar = desktopQuickCalendar;

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
  const saveB = job.querySelector("button.btn-save-note");
  if (saveB) {
    saveB.disabled = true;
  }
  const j = jobs.find((x) => String(x.id) === String(id));
  if (!j) {
    if (saveB) {
      saveB.disabled = false;
    }
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
  hapticNarrow();
  setTimeout(function () {
    flashCommentSaved(String(id));
  }, 0);
}

function openMobileReportJobModal() {
  if (!isNarrowLayout()) return;
  const sheetBody = document.getElementById("mobileReportJobSheetBody");
  const form = document.getElementById("reportJobForm");
  const m = document.getElementById("mobileReportJobModal");
  if (!form || !sheetBody || !m) return;
  setReportFormCollapsed(false);
  sheetBody.appendChild(form);
  m.hidden = false;
  m.classList.add("open");
  m.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  updateMobileFormFab();
  updateMobileScrollTopBtn();
  setTimeout(function () {
    const loc = document.getElementById("location");
    if (loc) {
      try {
        loc.focus({ preventScroll: true });
      } catch (err) {
        loc.focus();
      }
    }
  }, 80);
}

function closeMobileReportJobModal() {
  const sheetBody = document.getElementById("mobileReportJobSheetBody");
  const anchor = document.getElementById("reportJobFormAnchor");
  const form = document.getElementById("reportJobForm");
  const m = document.getElementById("mobileReportJobModal");
  if (form && sheetBody && anchor && form.parentNode === sheetBody) {
    anchor.appendChild(form);
  }
  if (m) {
    m.hidden = true;
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
  }
  setReportFormCollapsed(true);
  syncAppBodyScrollLock();
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

window.closeMobileReportJobModal = closeMobileReportJobModal;

function scrollToReportJob() {
  setReportFormCollapsed(false);
  if (isNarrowLayout()) {
    openMobileReportJobModal();
    return;
  }
  const form = document.getElementById("reportJobForm");
  if (form) {
    try {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      form.scrollIntoView(true);
    }
  }
  setTimeout(function () {
    const loc = document.getElementById("location");
    if (loc) {
      try {
        loc.focus({ preventScroll: true });
      } catch (err) {
        loc.focus();
      }
    }
  }, 450);
  updateMobileFormFab();
  updateMobileScrollTopBtn();
}

window.saveEngineerNote = saveEngineerNote;
window.toggleJobLog = toggleJobLog;
window.toggleMyJobsFilter = toggleMyJobsFilter;
window.onJobAssignFromUi = onJobAssignFromUi;
window.onJobAssignBlockClick = onJobAssignBlockClick;
window.resetFiltersAndSearch = resetFiltersAndSearch;
window.scrollToReportJob = scrollToReportJob;
window.closeJobDetailModal = closeJobDetailModal;
window.scrollToListTop = scrollToListTop;

function openPhotoLightbox(src) {
  if (!src || String(src).indexOf("data:image/") !== 0) return;
  const box = document.getElementById("photoLightbox");
  const im = document.getElementById("photoLightboxImg");
  if (!box || !im) return;
  im.src = src;
  im.alt = "Fault photo (full size)";
  box.hidden = false;
  document.body.style.overflow = "hidden";
  updateMobileScrollTopBtn();
}

function closePhotoLightbox() {
  const box = document.getElementById("photoLightbox");
  const im = document.getElementById("photoLightboxImg");
  if (im) im.removeAttribute("src");
  if (box) box.hidden = true;
  syncAppBodyScrollLock();
  updateMobileScrollTopBtn();
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
  updateDashboardCardHighlight();
  updateClearFiltersButton();
  const _cc = computeFilteredListCounts();
  updateListResultCount(_cc.nActive, _cc.nHistory);
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
  if (!s) return;
  s.addEventListener("input", function () {
    if (_jobSearchDebounceTimer) {
      clearTimeout(_jobSearchDebounceTimer);
    }
    _jobSearchDebounceTimer = setTimeout(function () {
      _jobSearchDebounceTimer = null;
      render();
    }, JOB_SEARCH_DEBOUNCE_MS);
  });
  s.addEventListener("search", function () {
    if (_jobSearchDebounceTimer) {
      clearTimeout(_jobSearchDebounceTimer);
      _jobSearchDebounceTimer = null;
    }
    render();
  });
})();

(function bindEngineerFilter() {
  const el = document.getElementById("engineerFilter");
  if (!el || el._mainproBound) return;
  el._mainproBound = true;
  el.addEventListener("change", function () {
    engineerFilter = String(el.value || "All");
    myJobsFilterActive = false;
    render();
  });
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
  const sig = jobs
    .map(function (j) {
      return String(j.id) + ":" + (j.isOverdue ? "1" : "0");
    })
    .join("|");
  syncOverdueFlags();
  const sig2 = jobs
    .map(function (j) {
      return String(j.id) + ":" + (j.isOverdue ? "1" : "0");
    })
    .join("|");
  const a = appendOverdueAuditIfNeeded();
  const b = appendSlaBecameOverdueAuditIfNeeded();
  if (a || b || sig !== sig2) {
    render();
  } else {
    updateDashboard();
    updateJobDetailModal();
  }
}, 30000);

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
  if (e.key === "/") {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const te = e.target;
      if (te) {
        const tag = te.tagName && String(te.tagName).toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          (te.isContentEditable === true)
        ) {
          return;
        }
      }
      const am = document.getElementById("appMain");
      if (am && !am.hidden && hasMainproLogin()) {
        const s = document.getElementById("jobSearch");
        if (s) {
          e.preventDefault();
          try {
            s.focus();
            if (s.select) s.select();
          } catch (err) {
            s.focus();
          }
        }
      }
    }
  }
  if (e.key === "?") {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const te = e.target;
      if (te) {
        const tag = te.tagName && String(te.tagName).toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          te.isContentEditable === true
        ) {
          return;
        }
      }
      const am = document.getElementById("appMain");
      if (am && !am.hidden && hasMainproLogin()) {
        e.preventDefault();
        openJobsTipsDialog();
      }
    }
  }
  if (e.key === "[" || e.key === "]") {
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      const te = e.target;
      if (te) {
        const tag = te.tagName && String(te.tagName).toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          tag === "select" ||
          te.isContentEditable === true
        ) {
          return;
        }
      }
      const am = document.getElementById("appMain");
      if (am && !am.hidden && hasMainproLogin()) {
        const L = getJobsOpenLayers();
        if (L.onboarding) return;
        if (L.jobDetail || L.tips || L.settings || L.park || L.photo) {
          return;
        }
        e.preventDefault();
        if (e.key === "[") {
          setTab("active");
        } else {
          setTab("history");
        }
        const cc = computeFilteredListCounts();
        updateListResultCount(cc.nActive, cc.nHistory);
      }
    }
  }
  if (e.key === "s" || e.key === "S") {
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const te = e.target;
      if (
        te &&
        te.classList &&
        te.classList.contains("comment-new") &&
        te.tagName &&
        String(te.tagName).toLowerCase() === "textarea"
      ) {
        const am = document.getElementById("appMain");
        if (
          am &&
          !am.hidden &&
          hasMainproLogin() &&
          te.closest &&
          te.closest("#appMain")
        ) {
          e.preventDefault();
          const job = te.closest(".job");
          if (job) {
            const btn = job.querySelector("button.btn-save-note");
            if (btn) saveEngineerNote(btn);
          }
        }
      }
    }
  }
  if (e.key === "Escape" || e.key === "Esc") {
    const ob = document.getElementById("onboardingModal");
    if (ob && !ob.hidden) {
      e.preventDefault();
      onboardingSkip();
      return;
    }
    const settingsM = document.getElementById("jobsSettingsModal");
    if (settingsM && !settingsM.hidden) {
      closeJobsSettings();
      return;
    }
    const tipsM = document.getElementById("jobsTipsModal");
    if (tipsM && !tipsM.hidden) {
      closeJobsTipsDialog();
      return;
    }
    const jdm = document.getElementById("jobDetailModal");
    if (jdm && !jdm.hidden) {
      closeJobDetailModal();
      return;
    }
    const nrm = document.getElementById("mobileReportJobModal");
    if (nrm && !nrm.hidden && isNarrowLayout()) {
      e.preventDefault();
      closeMobileReportJobModal();
      return;
    }
    const parkM = document.getElementById("parkModal");
    if (parkM && !parkM.hidden) {
      closeParkDialog();
      return;
    }
    const box = document.getElementById("photoLightbox");
    if (box && !box.hidden) {
      closePhotoLightbox();
      return;
    }
    const s = document.getElementById("jobSearch");
    if (s && e.target === s) {
      e.preventDefault();
      if (String(s.value || "").trim() !== "") {
        s.value = "";
        if (_jobSearchDebounceTimer) {
          clearTimeout(_jobSearchDebounceTimer);
          _jobSearchDebounceTimer = null;
        }
        render();
      } else {
        try {
          s.blur();
        } catch (err) {
          /* ignore */
        }
      }
    }
  }
  const t = e.target;
  if (t && t.classList && t.classList.contains("job-photo-thumb") && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    openPhotoLightbox(t.getAttribute("src"));
  }
});

(function bindMobileJobOpen() {
  const app = document.getElementById("appMain");
  if (!app || app._mobileTapBound) return;
  app._mobileTapBound = true;
  app.addEventListener("click", onJobCardTapOpen);
})();

document.addEventListener("keydown", function (e) {
  if (e.key !== "Enter" && e.key !== " ") return;
  const te = e.target;
  if (te && te.closest && te.closest(".job-assign-block")) return;
  if (!te || !te.classList || !te.classList.contains("job-card-tap")) return;
  const job = te.closest(".job");
  if (!job || !job.classList.contains("job-card--list-compact")) return;
  e.preventDefault();
  const id = jobIdFromDomAttr(job.getAttribute("data-job-id"));
  if (id == null) return;
  mobileJobsListScrollY =
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    0;
  mobileJobDetailId = String(id);
  render();
});

window.addEventListener("resize", function () {
  if (!jobDetailModalHostActive() && mobileJobDetailId) {
    mobileJobDetailId = null;
    const m = document.getElementById("jobDetailModal");
    if (m) m.hidden = true;
    syncAppBodyScrollLock();
  }
  if (!isNarrowLayout()) {
    mobileFabHiddenByScroll = false;
  }
  mobileFabLastScrollY =
    window.scrollY || (document.documentElement && document.documentElement.scrollTop) || 0;
  if (isNarrowLayout()) {
    onMobileFabScroll();
  } else {
    updateMobileFormFab();
    updateMobileScrollTopBtn();
  }
});

(function bindMobileFabScroll() {
  if (typeof window === "undefined" || window._mainproFabScrollBound) return;
  window._mainproFabScrollBound = true;
  window.addEventListener("scroll", onMobileFabScroll, { passive: true });
})();

/**
 * Pull-to-refresh (touch): вверху страницы потянуть вниз — render() + тост.
 */
(function bindPullToRefresh() {
  if (typeof document === "undefined" || window._mainproPullRefreshBound) {
    return;
  }
  window._mainproPullRefreshBound = true;
  let startY = 0;
  let tracking = false;
  function blockers() {
    const am = document.getElementById("appMain");
    if (!am || am.hidden) return true;
    if (!hasMainproLogin()) return true;
    const L = getJobsOpenLayers();
    return (
      L.jobDetail || L.park || L.photo || L.tips || L.settings || L.onboarding
    );
  }
  document.addEventListener(
    "touchstart",
    function (e) {
      if (blockers()) return;
      if (window.scrollY > 12) return;
      if (!e.touches || !e.touches[0]) return;
      startY = e.touches[0].clientY;
      tracking = true;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchend",
    function (e) {
      if (!tracking) return;
      tracking = false;
      if (blockers()) return;
      if (window.scrollY > 12) return;
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const endY = e.changedTouches[0].clientY;
      if (endY - startY > 72) {
        render();
        showJobsToast("Refreshed");
      }
    },
    { passive: true }
  );
})();

(function bindImportBackup() {
  const inp = document.getElementById("importBackupInput");
  if (!inp || inp._mainproImportBound) return;
  inp._mainproImportBound = true;
  inp.addEventListener("change", function () {
    const f = inp.files && inp.files[0];
    if (!f) return;
    if (!hasMainproLogin()) {
      showJobsToast("Select a role first");
      inp.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = function () {
      if (typeof r.result !== "string") return;
      importJobsFromJsonText(r.result);
    };
    r.onerror = function () {
      showJobsToast("Could not read file");
    };
    r.readAsText(f);
    inp.value = "";
  });
})();

(function bindImportMerge() {
  const inp = document.getElementById("importMergeInput");
  if (!inp || inp._mainproImportMergeBound) return;
  inp._mainproImportMergeBound = true;
  inp.addEventListener("change", function () {
    const f = inp.files && inp.files[0];
    if (!f) return;
    if (!hasMainproLogin()) {
      showJobsToast("Select a role first");
      inp.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = function () {
      if (typeof r.result !== "string") return;
      importJobsMergeFromJsonText(r.result);
    };
    r.onerror = function () {
      showJobsToast("Could not read file");
    };
    r.readAsText(f);
    inp.value = "";
  });
})();

window.exportJobsBackup = exportJobsBackup;
window.exportJobsCsv = exportJobsCsv;
window.triggerImportBackup = triggerImportBackup;
window.triggerImportMerge = triggerImportMerge;
window.toggleUiLang = toggleUiLang;
window.showJobsToast = showJobsToast;

let _mainproPrevOffline = false;

function updateOnlineStatusBar() {
  const el = document.getElementById("offlineBar");
  if (!el) return;
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (online) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent =
    "You're offline — work is saved on this device only";
}

function onOnlineStatusEvent() {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (online) {
    if (_mainproPrevOffline) {
      showJobsToast("Back online");
    }
    _mainproPrevOffline = false;
  } else {
    _mainproPrevOffline = true;
  }
  updateOnlineStatusBar();
}

(function bindOnlineStatus() {
  if (typeof window === "undefined" || window._mainproOnlineBound) return;
  window._mainproOnlineBound = true;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    _mainproPrevOffline = true;
  }
  window.addEventListener("online", onOnlineStatusEvent);
  window.addEventListener("offline", onOnlineStatusEvent);
  updateOnlineStatusBar();
})();

applyAuthUi();
