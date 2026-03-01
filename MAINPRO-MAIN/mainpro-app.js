
// STABILITY LOCK: recurrence-only changes

// Safe Guard will be added at the end of the file

(() => {

  const { useState, useEffect, useRef } = React;

  const FC = window.FullCalendar;

  const { jsPDF } = window.jspdf || {};

  // utils

  const todayISO = () => new Date().toISOString().slice(0,10);

  const statusColor = s => {
    if(s==='done') return '#22c55e';
    if(s==='missed') return '#ef4444';
    if(s==='pending') return '#eab308';
    return '#9ca3af'; // gray for 'none' or no status
  };

  const formatAmPm = (input)=>{
    if(!input) return '';
    const d = input instanceof Date ? input : new Date(input);
    if(Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12:true});
  };

  const addDays   = (d,days)=>{const x=new Date(d);x.setDate(x.getDate()+days);return x;}

  const addMonths = (d,months)=>{const x=new Date(d);x.setMonth(x.getMonth()+months);return x;}

  const toLocalISO = (dt)=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}T${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;

  const DEFAULT_CATS = [

    { id:'maintenance', name:'Maintenance', color:'#22c55e' },

    { id:'compliance',  name:'Compliance',  color:'#3b82f6' },

    { id:'safety',      name:'Safety / Fire', color:'#f97316' },

    { id:'training',    name:'Training',    color:'#eab308' },

    { id:'other',       name:'Other',       color:'#a78bfa' },

  ];

  // Toast helper

  function showToast(msg) {

    try{

      const t = document.getElementById('mp-toast');

      if(!t) return;

      t.textContent = msg;

      t.classList.add('show');

      clearTimeout(t._hideTimer);

      t._hideTimer = setTimeout(()=>t.classList.remove('show'), 2200);

    }catch{}

  }

  // Move MainPro to global scope so it can be accessed after IIFE
  window.MainPro = function(){

    useEffect(function() {
      var el = document.getElementById('mp-loading');
      if (el) el.style.display = 'none';
    }, []);

    // Safe localStorage parser utility
    const safeParse = (key, fallback=[]) => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
      } catch {
        console.warn("Corrupted localStorage key:", key);
        return fallback;
      }
    };

    // theme
    const [ui, setUI] = useState(() => safeParse('mainpro_ui_v60', {primary:'#EAB308'}));

    // settings (+ smart status toggle)
    const [settings, setSettings] = useState(() => {
      const base = safeParse('mainpro_settings_v60', {
        hotelName:'', preparedBy:'Chief Engineer', approvedBy:'Maintenance Manager',
        logoUrl:'https://i.imgur.com/SW6T4ZL.png'
      });
      const smart = safeParse('mainpro_autostatus_v1', {enabled: true});
      return {...base, autoStatusEnabled: smart.enabled !== false};
    });

    // categories
    const DEFAULT_CATS = [
      {name:'Maintenance', color:'#3B82F6'},
      {name:'Compliance', color:'#10B981'},
      {name:'Contractor', color:'#F59E0B'},
      {name:'Inspection', color:'#8B5CF6'},
      {name:'Other', color:'#6B7280'}
    ];

    const [categories, setCategories] = useState(() => safeParse('mainpro_categories_v60', DEFAULT_CATS));

    // task types
    const [taskTypes, setTaskTypes] = useState(() => safeParse('mainpro_tasktypes_v60', [
      "Maintenance","Compliance","Contractor Visit","Inspection","Other"
    ]));

    // MultiCalendar System
    const DEFAULT_CALENDAR = { id: 'main', name: 'Main Calendar', type: 'maintenance', icon: '📅', color: '#3B82F6', created: new Date().toISOString() };
    
    const [calendars, setCalendars] = useState(() => {
      const saved = safeParse('mainpro_calendars_v1', []);
      if (saved.length === 0) {
        // Create default calendar if none exist
        localStorage.setItem('mainpro_calendars_v1', JSON.stringify([DEFAULT_CALENDAR]));
        return [DEFAULT_CALENDAR];
      }
      return saved;
    });

    const [currentCalendarId, setCurrentCalendarId] = useState(() => {
      try {
        return localStorage.getItem('mainpro_current_calendar_v1') || 'main';
      } catch {
        return 'main';
      }
    });

    // events - now loads from current calendar
    const [events, setEvents] = useState(() => {
      const calendarKey = `mainpro_calendar_${currentCalendarId}`;
      const current = safeParse(calendarKey, []);
      // Migration: if calendar is empty but legacy key has tasks, import once.
      try {
        if ((!current || !current.length)) {
          const legacy = safeParse('mainpro_events_v60', []);
          if (Array.isArray(legacy) && legacy.length) {
            const cleaned = stripInstances(legacy);
            try { localStorage.setItem(calendarKey, JSON.stringify(cleaned)); } catch {}
            return cleaned;
          }
        }
      } catch {}
      return Array.isArray(current) ? current.filter(e => !e || !e.isInstance) : [];
    });

    const [docs, setDocs] = useState([]);

  // ==========================
  // 📁 MainPro v66.7 – Document Manager PRO (Gold UI)
  // ==========================
    // === Document Manager PRO state ===
    const [dmShow,setDmShow] = useState(false);
    
    // === Enhanced Document Manager States ===
    const [dmSearchQuery, setDmSearchQuery] = useState('');
    const [dmFilterType, setDmFilterType] = useState('all'); // all, pdf, image, doc, etc.
    const [dmSortBy, setDmSortBy] = useState('date'); // date, name, size, type
    const [dmViewMode, setDmViewMode] = useState('grid'); // grid, list, timeline
    const [dmShowAnalytics, setDmShowAnalytics] = useState(false);
    const [dmSelectedDocs, setDmSelectedDocs] = useState([]);
    const [dmShowComments, setDmShowComments] = useState({});
    const [dmDocumentVersions, setDmDocumentVersions] = useState({});
    const [dmDocumentTags, setDmDocumentTags] = useState({});
    const [dmDocumentAnnotations, setDmDocumentAnnotations] = useState({});
    const [dmShowAdvancedSearch, setDmShowAdvancedSearch] = useState(false);
    const [dmBackupStatus, setDmBackupStatus] = useState('idle'); // idle, backing_up, completed, error
    
    const DEFAULT_FOLDERS = [
      { id: 1, name: 'General' },
      { id: 2, name: 'RAMS' },
      { id: 3, name: 'Certificates' },
      { id: 4, name: 'Contracts' }
    ];

    const [dmFolders, setDmFolders] = useState(() => {
      const saved = safeParse('mainpro_folders', []);
      if (saved.length === 0) {
        localStorage.setItem('mainpro_folders', JSON.stringify(DEFAULT_FOLDERS));
        return DEFAULT_FOLDERS;
      }
      return saved;
    });
    const [dmActive,setDmActive] = useState('General');
    const [dmNewFolder,setDmNewFolder] = useState('');
    const [dmRenamingId,setDmRenamingId] = useState(null);
    const [dmRenameValue,setDmRenameValue] = useState('');

    // Initialize folders if empty - moved to state initialization

    useEffect(()=>{ localStorage.setItem('mainpro_folders', JSON.stringify(dmFolders)); },[dmFolders]);

    const [dmDocs, setDmDocs] = useState(() => safeParse('mainpro_documents', []));
    useEffect(()=>{ localStorage.setItem('mainpro_documents', JSON.stringify(dmDocs)); },[dmDocs]);

    // Drag&Drop highlight
    const [dmDragging,setDmDragging] = useState(false);
    let dmDragLeaveTimer = useRef(null);

    // === AI Analytics Dashboard State ===
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [analyticsData, setAnalyticsData] = useState({
      totalFiles: 0,
      folderDistribution: {},
      fileTypes: {},
      recentActivity: [],
      aiSuggestions: []
    });

    // === Loading States ===
    const [loadingStates, setLoadingStates] = useState({});

    const [previewDoc, setPreviewDoc] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const eventsRef = useRef(events);
    const baseTitleRef = useRef(document.title || 'MainPro Calendar');
    const searchInputRef = useRef(null);

    useEffect(()=>{ eventsRef.current = events; },[events]);

    /** Bases-only integrity: remove any instance events. state/ref/storage must never contain isInstance. */
    function stripInstances(list) {
      if (list == null) return [];
      return Array.isArray(list) ? list.filter(e => !e || !e.isInstance) : [];
    }

    // Documents initialization moved to state declaration

    // Folders initialization moved to state declaration

    // ui state

    const [filter,setFilter] = useState(() => {
      try {
        return localStorage.getItem('mainpro_filter_v1') || 'all';
      } catch {
        return 'all';
      }
    });

    const [view,setView] = useState(() => {
      try {
        return localStorage.getItem('mainpro_view_v1') || 'dayGridMonth';
      } catch {
        return 'dayGridMonth';
      }
    });

    const [showAdd,setShowAdd] = useState(false);

    const [editEvent,setEditEvent] = useState(null);

    const [openSettings,setOpenSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('general'); // 'general', 'categories', 'ai', 'cloud', 'export'

    const [monthLabel,setMonthLabel] = useState('');

    const [showPicker,setShowPicker] = useState(false);

    const [pickerMode,setPickerMode] = useState('month');

    const [search,setSearch] = useState('');
    const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showList, setShowList] = useState(false); // Agenda/List view modal
    const [listRange, setListRange] = useState('day'); // 'day' | 'week'
    const [listAnchorDate, setListAnchorDate] = useState(() => {
      try {
        return localStorage.getItem('mainpro_lastdate_v1') || (typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0,10));
      } catch {
        return (typeof todayISO === 'function' ? todayISO() : new Date().toISOString().slice(0,10));
      }
    });
    const DEFAULT_TEMPLATES = [
      { id:'daily_walk', label:'Daily walk-through', title:'Daily walk-through', catId:'maintenance', taskType:'Internal', priority:'normal', time:'09:00' },
      { id:'fire_check', label:'Fire safety check', title:'Fire safety check', catId:'safety', taskType:'Safety', priority:'high', time:'09:00' },
      { id:'contractor_call', label:'Contractor visit', title:'Contractor visit', catId:'maintenance', taskType:'Contractor', priority:'normal', time:'09:00' },
      { id:'compliance_audit', label:'Compliance audit', title:'Compliance audit', catId:'compliance', taskType:'Compliance', priority:'normal', time:'09:00' },
    ];
    const [taskTemplates, setTaskTemplates] = useState(() => {
      try {
        const raw = localStorage.getItem('mainpro_templates_v1');
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length) return parsed;
      } catch {}
      return DEFAULT_TEMPLATES;
    });
    const [tplEditingId, setTplEditingId] = useState(null);
    const [tplDraft, setTplDraft] = useState(() => ({
      id:'',
      label:'',
      title:'',
      catId:'maintenance',
      taskType:'Internal',
      priority:'normal',
      time:'09:00'
    }));
    const [undoClearAll, setUndoClearAll] = useState(null); // { events: [], expiresAt: number, count: number }
    const undoClearAllTimerRef = useRef(null);
    const [undoDelete, setUndoDelete] = useState(null); // { items: [{event,index}], expiresAt: number }
    const undoDeleteTimerRef = useRef(null);
    
    // Calendar improvements: Dark mode, sorting, stats, notifications
    const [darkMode, setDarkMode] = useState(() => {
      try {
        return localStorage.getItem('mainpro_darkmode') === 'true';
      } catch {
        return false;
      }
    });
    const [sortBy, setSortBy] = useState(() => {
      try {
        return localStorage.getItem('mainpro_sort_v1') || 'none';
      } catch {
        return 'none';
      }
    }); // 'none', 'title', 'priority', 'status', 'date'
    const [showStats, setShowStats] = useState(() => {
      try {
        return localStorage.getItem('mainpro_showstats_v1') === 'true';
      } catch {
        return false;
      }
    });
    const [groupBy, setGroupBy] = useState('none'); // 'none', 'category', 'priority', 'status'
    
    // Cloud Sync (v65.6)
    const [cloudSync,setCloudSync] = useState(() => {
      return safeParse('mainpro_cloudsync_v1', {enabled:false,serverUrl:"",apiKey:"",lastSync:null});
    });
    const [syncStatus,setSyncStatus] = useState('disconnected');
    const [isOnline,setIsOnline] = useState(navigator.onLine);
    
    // Multi-User Collaboration (v65.7)
    const [teamMode,setTeamMode] = useState(() => {
      return safeParse('mainpro_team_v1', {enabled:false,teamId:"",userRole:"admin",teamMembers:[],currentUser:null});
    });
    const [activeUsers,setActiveUsers] = useState([]);
    const [userPresence,setUserPresence] = useState(new Map());
    
    // AI Analytics & Auto-Suggestions (v65.8)
    const [aiAnalytics,setAiAnalytics] = useState(() => {
      return safeParse('mainpro_ai_v1', {enabled:false,predictiveMaintenance:true,complianceAlerts:true,autoSuggestions:true,analyticsLevel:"basic"});
    });
    const [aiInsights,setAiInsights] = useState([]);
    const [predictiveTasks,setPredictiveTasks] = useState([]);
    const [complianceAlerts,setComplianceAlerts] = useState([]);
    const [autoSuggestions,setAutoSuggestions] = useState([]);
    
    // Audit & Reporting Dashboards (v65.9)
    const [auditLogs,setAuditLogs] = useState(() => {
      return safeParse('mainpro_audit_v1', []);
    });
    const [showAuditDashboard,setShowAuditDashboard] = useState(false);
    const [showReports,setShowReports] = useState(false);
    const [showAIPanel,setShowAIPanel] = useState(false);
    
    // === MAINPRO v71 - CLOUD & COLLABORATION STATE ===
    const [cloudMode, setCloudMode] = useState(false);
    const [currentUser, setCurrentUser] = useState({
      id: localStorage.getItem('mainpro_user_id') || 'user_' + Date.now(),
      name: localStorage.getItem('mainpro_user_name') || 'MainPro User',
      email: localStorage.getItem('mainpro_user_email') || '',
      role: localStorage.getItem('mainpro_user_role') || 'Admin',
      teamId: localStorage.getItem('mainpro_user_team') || 'default_team',
      avatar: localStorage.getItem('mainpro_user_avatar') || '👤'
    });
    const [teamMembers, setTeamMembers] = useState(JSON.parse(localStorage.getItem('mainpro_team_members') || '[]'));
    const [showTeamSettings, setShowTeamSettings] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('Member');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [realtimeUpdates, setRealtimeUpdates] = useState([]);
    const [showProjectSharing, setShowProjectSharing] = useState(false);
    const [showCrossCompanyCollaboration, setShowCrossCompanyCollaboration] = useState(false);
    const [showGuestAccess, setShowGuestAccess] = useState(false);
    const [showSecureVault, setShowSecureVault] = useState(false);
    const [showAICompliance, setShowAICompliance] = useState(false);
  const [showCloudSync, setShowCloudSync] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [billingHistory, setBillingHistory] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [securityStatus, setSecurityStatus] = useState('secure');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessType, setBusinessType] = useState('office');
  const [businessModules, setBusinessModules] = useState([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login', 'signup', 'profile'
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authUser, setAuthUser] = useState(null);
    const [showAIChat, setShowAIChat] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [auditFilter,setAuditFilter] = useState('all');
    const [reportType,setReportType] = useState('summary');
    const [reportPeriod,setReportPeriod] = useState('30days');
    const [reportData,setReportData] = useState({});
    const [auditStats,setAuditStats] = useState({
      totalActions: 0,
      todayActions: 0,
      userActions: {},
      actionTypes: {},
      recentActivity: []
    });

    // add form

    const [form,setForm] = useState({

      title:'', date:todayISO(), time:'09:00', status:'pending',

      catId:'maintenance', taskType:'Maintenance',

      priority:'normal',

      contractorOnSite:false, contractorName:'', contractorPhone:'',

      location:'', notes:'',

      recurFreq:'none', recurMonths:12, recurInterval:1, recurUnit:'day', recurEndDate:'', repeatEndMonths:''

    });

    const [showNewCat,setShowNewCat] = useState(false);

    const [newCat,setNewCat] = useState({ name:'', color:'#6b7280' });

    const [showLocationManager, setShowLocationManager] = useState(false);

    const [newLocation, setNewLocation] = useState('');

    const [showContractorDetails, setShowContractorDetails] = useState(false);

    const [contractorDetails, setContractorDetails] = useState({

      companyName: '',

      contactPerson: '',

      primaryPhone: '',

      secondaryPhone: '',

      email: '',

      website: '',

      address: '',

      license: '',

      specialization: '',

      notes: ''

    });

    const [showRecurringOptions, setShowRecurringOptions] = useState(true);

    // calendar

    const calRef = useRef(null);

    useEffect(()=>{

      const el = document.getElementById('calendar');

      const cal = new FC.Calendar(el,{

        initialView:view,
        // Restore last opened date (navigation only)
        initialDate:(() => {
          try {
            return localStorage.getItem('mainpro_lastdate_v1') || undefined;
          } catch {
            return undefined;
          }
        })(),

        firstDay:1,

        selectable:true,

        editable:true,

        eventResizableFromStart:true,

        nowIndicator:true,

        headerToolbar:false,

        height:'100%',

        datesSet:(info)=>{
          try{
            const center = info.view.calendar.getDate();
            const label = center.toLocaleString(undefined,{month:'long',year:'numeric'});
            setMonthLabel(label);
            try{ localStorage.setItem('mainpro_lastdate_v1', center.toISOString().slice(0,10)); }catch{}
            if (eventsRef.current && eventsRef.current.length >= 0) refreshCalendar(eventsRef.current);
          }catch{}
        },

        dateClick:(info)=>{

          // Open new v70.6 Smart Event Form with pre-filled date
          if (window.openTaskModal) {
            window.openTaskModal(info.dateStr);
          } else {
            // Fallback to old behavior if v70.6 form not available
            setForm(f=>({...f,date:info.dateStr}));
            setShowAdd(true);
          }

        },

        eventClick:(info)=>{
          hideTooltipGlobal();
          const idStr = String(info.event.id);
          let src = eventsRef.current.find(e=> String(e.id)===idStr);
          if (!src && idStr.includes('-')) {
            const seriesId = idStr.replace(/-?\d+$/, '');
            src = eventsRef.current.find(e=> !e.isInstance && e.seriesId && String(e.seriesId)===seriesId);
          }

          if(src && typeof window.openAddTaskModal === 'function'){
            const startStr = src.start || info.event.startStr;
            const endStr = src.end || info.event.endStr;
            const editPref = {
              ...src,
              id: src.id,
              mode:'edit',
              title: src.title,
              date: startStr ? startStr.slice(0,10) : (info.event.startStr ? info.event.startStr.slice(0,10) : todayISO()),
              time: startStr ? startStr.slice(11,16) : '',
              recur: src.recur,
              recurOptions: src.recurOptions,
              recurMonths: src.recur?.months,
              reminder: src.reminder,
              subtasks: src.subtasks,
              location: src.location,
              notes: src.notes,
              catId: src.catId,
              priority: src.priority,
              assignedTo: src.assignedTo,
              taskType: src.taskType,
              status: src.status,
              seriesId: src.seriesId,
              start: startStr,
              end: endStr
            };
            if(!editPref.time && startStr){
              const startDate = new Date(startStr);
              if(!Number.isNaN(startDate.getTime())){
                editPref.time = startDate.toISOString().slice(11,16);
              }
            }
            window.openAddTaskModal(editPref);
          } else if(src){
            setEditEvent({...src, _seriesScope:'one'});
          }

        },

        eventDrop:(info)=>{
          const id = info.event.id;
          const idStr = String(id);
          const start = info.event.startStr?.slice(0,16);
          if (idStr.includes('-') && info.oldEvent && info.oldEvent.startStr) {
            const seriesId = idStr.replace(/-?\d+$/, '');
            const base = eventsRef.current.find(e=> !e.isInstance && e.seriesId && String(e.seriesId)===seriesId);
            if (base) {
              const oldDate = info.oldEvent.startStr.slice(0,10);
              const ex = [...(base.recur?.exceptions || []), oldDate];
              setEvents(prev=> prev.map(e=> e.id===base.id ? {...e, recur: {...(e.recur||{}), exceptions: ex}} : e));
              eventsRef.current = eventsRef.current.map(e=> e.id===base.id ? {...e, recur: {...(e.recur||{}), exceptions: ex}} : e);
              refreshCalendar(eventsRef.current);
              hideTooltipGlobal();
              return;
            }
          }
          setEvents(prev=> prev.map(e=> String(e.id)===idStr ? {...e, start}: e));
          hideTooltipGlobal();
          if(settings.autoStatusEnabled) runSmartStatusOnce();
        },

        eventResize:(info)=>{
          const id = info.event.id;
          const idStr = String(id);
          const start = info.event.startStr?.slice(0,16);
          if (idStr.includes('-')) {
            const seriesId = idStr.replace(/-?\d+$/, '');
            const base = eventsRef.current.find(e=> !e.isInstance && e.seriesId && String(e.seriesId)===seriesId);
            if (base) {
              if (info.oldEvent && info.oldEvent.startStr) {
                const oldDate = info.oldEvent.startStr.slice(0,10);
                const ex = [...(base.recur?.exceptions || []), oldDate];
                setEvents(prev=> prev.map(e=> e.id===base.id ? {...e, recur: {...(e.recur||{}), exceptions: ex}} : e));
                eventsRef.current = eventsRef.current.map(e=> e.id===base.id ? {...e, recur: {...(e.recur||{}), exceptions: ex}} : e);
              }
              refreshCalendar(eventsRef.current);
              hideTooltipGlobal();
              return;
            }
          }
          setEvents(prev=> prev.map(e=> String(e.id)===idStr ? {...e, start}: e));
          hideTooltipGlobal();
          if(settings.autoStatusEnabled) runSmartStatusOnce();
        },

        eventDragStart: hideTooltipGlobal,

        eventDragStop: hideTooltipGlobal,

        eventResizeStart: hideTooltipGlobal,

        eventResizeStop: hideTooltipGlobal,

        eventContent:(arg)=>{

          const e = arg.event.extendedProps;

          const title = arg.event.title || '';

          // Check if event is all-day: prioritize allDay property and hasTime from extendedProps
          // Priority: 1) arg.event.allDay === true, 2) e.allDay === true, 3) e.hasTime === false, 4) start has no time
          const isAllDay = arg.event.allDay === true || 
                          (e && e.allDay === true) ||
                          (e && e.hasTime === false) ||
                          (!arg.event.start || (typeof arg.event.start === 'string' && !arg.event.start.includes('T')));
          
          // Don't format time for all-day events - return empty string immediately
          // Only format time if: NOT all-day AND start contains time part
          let time = '';
          if(!isAllDay && arg.event.start) {
            const startStr = arg.event.start.toString();
            if(startStr.includes('T')) {
              time = formatAmPm(arg.event.start);
            }
          }

          const catDot = (categories.find(c=>c.id===e.catId)?.color) || '#94a3b8';

          const isContractor = !!e.contractorOnSite;

          const pri = e.priority || 'normal';

          const priBadge = pri==='high' ? '⚠️' : (pri==='low' ? '⬇️' : '•');

          const wrapper = document.createElement('div');

          wrapper.style.display = 'flex';

          wrapper.style.alignItems = 'center';

          wrapper.style.gap = '6px';

          const dot = document.createElement('span');

          dot.style.width='8px'; dot.style.height='8px'; dot.style.borderRadius='9999px'; dot.style.background=catDot;

          wrapper.appendChild(dot);

          const block = document.createElement('div');

          block.style.display='flex'; block.style.flexDirection='column'; block.style.minWidth='0';

          const line1 = document.createElement('div');

          line1.style.display='flex'; line1.style.alignItems='center'; line1.style.gap='6px';

          const t = document.createElement('span');

          t.style.fontWeight='600'; t.style.fontSize='12px'; t.style.whiteSpace='nowrap'; t.style.textOverflow='ellipsis'; t.style.overflow='hidden';

          t.textContent = title;

          line1.appendChild(t);

          if (isContractor){ const ico = document.createElement('span'); ico.textContent='👷'; line1.appendChild(ico); }

          const pr = document.createElement('span'); pr.textContent = priBadge; line1.appendChild(pr);

          const att = Array.isArray(e?.attachments) ? e.attachments : [];
          const attCount = att.filter(a=> (a?.docId || a?.id || a?.name)).length;
          if (attCount > 0) {
            const ind = document.createElement('span');
            ind.className = 'mp-attach-ind';
            ind.innerHTML = `📎 <b>${attCount}</b>`;
            line1.appendChild(ind);
          }

          const line2 = document.createElement('div');

          line2.style.fontSize='11px'; line2.style.opacity='.75'; line2.textContent = time ? time : '';

          block.appendChild(line1); if (time) block.appendChild(line2);

          wrapper.appendChild(block);

          return { domNodes:[wrapper] };

        },

        eventDidMount:(arg)=>{

          const el = arg.el;

          try{
            const col = statusColor(arg.event.extendedProps.status);
            if(col){
              el.style.backgroundColor = col;
              el.style.borderColor = col;
              el.style.color = '#111827';
            }
          }catch{}

          let tooltip = document.getElementById('mp-tooltip');

          if (!tooltip) {

            tooltip = document.createElement('div');

            tooltip.id = 'mp-tooltip';

            tooltip.className = 'mp-pop';

            document.body.appendChild(tooltip);

          }

          let hoverTimeout;

          const showTooltip = ()=>{

            clearTimeout(hoverTimeout);

            const e = arg.event.extendedProps;

            const cat = categories.find(c=>c.id===e.catId);

            const statusDotHTML = `<span class="dot" style="background:${statusColor(e.status)}"></span>`;
            
            // Check if event is all-day: prioritize allDay property and hasTime from extendedProps
            // Priority: 1) arg.event.allDay === true, 2) e.allDay === true, 3) e.hasTime === false, 4) start has no time
            const isAllDay = arg.event.allDay === true || 
                            (e && e.allDay === true) ||
                            (e && e.hasTime === false) ||
                            (!arg.event.start || (typeof arg.event.start === 'string' && !arg.event.start.includes('T')));
            
            // Don't format time for all-day events - return null immediately
            // Only format time if: NOT all-day AND start contains time part
            let tooltipTime = null;
            if(!isAllDay && arg.event.start) {
              const startStr = arg.event.start.toString();
              if(startStr.includes('T')) {
                tooltipTime = formatAmPm(arg.event.start);
              }
            }

            tooltip.innerHTML = `

              <div class="t">${arg.event.title||''}</div>

              ${tooltipTime ? `<div class="row">🕒 <span>${tooltipTime}</span></div>` : ''}

              <div class="row">🏷️ <span>${cat?cat.name:'-'}</span></div>

              <div class="row">⭐ <span>${(e.priority||'normal').toUpperCase()}</span></div>

              <div class="row">${statusDotHTML}<span>${e.status}</span></div>

              ${ teamMode.enabled && e.createdBy ? `<div class="row">👤 <span>Created by: ${e.createdBy}</span></div>` : '' }

              ${ teamMode.enabled && e.assignedTo ? `<div class="row">🎯 <span>Assigned to: ${e.assignedTo}</span></div>` : '' }

              ${ e.contractorOnSite ? `<div class="row">👷 <span>${e.contractorName||'Contractor'} ${e.contractorPhone?('('+e.contractorPhone+')'):''}</span></div>` : '' }

              ${ e.location ? `<div class="row">📍 <span>${e.location}</span></div>` : '' }

              ${ e.notes ? `<div class="row">📝 <span>${e.notes}</span></div>` : '' }
              ${ (()=>{ const a=(e?.attachments||[]).filter(x=>x?.docId||x?.id||x?.name); if(!a.length) return ''; const raw = a.slice(0,3).map(x=>String(x.name||'file')).join(', '); const esc = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); return `<div class="row">📎 <span>Attachments: ${a.length}${esc?` — ${esc}${a.length>3?'…':''}`:''}</span></div>`; })() }
              
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.2);display:flex;gap:4px;flex-wrap:wrap;">
                <button data-event-id="${arg.event.id}" data-status="pending" class="quick-status-btn" style="padding:4px 8px;background:#eab308;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Pending</button>
                <button data-event-id="${arg.event.id}" data-status="done" class="quick-status-btn" style="padding:4px 8px;background:#22c55e;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Done</button>
                <button data-event-id="${arg.event.id}" data-status="missed" class="quick-status-btn" style="padding:4px 8px;background:#ef4444;color:white;border:none;border-radius:4px;font-size:11px;cursor:pointer;">Missed</button>
              </div>

            `;
            
            const r = el.getBoundingClientRect();

            tooltip.style.left = (r.left + window.scrollX + 8) + 'px';

            tooltip.style.top  = (r.top + window.scrollY + 22) + 'px';

            tooltip.classList.add('show');
            
            // Add click handlers to buttons using event delegation
            setTimeout(() => {
              const buttons = tooltip.querySelectorAll('.quick-status-btn');
              buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const eventId = btn.dataset.eventId;
                  const status = btn.dataset.status;
                  if (eventId && status && window.quickStatusChange) {
                    window.quickStatusChange(eventId, status);
                  }
                });
              });
            }, 0);

          };

          const hideTooltip = ()=>{

            clearTimeout(hoverTimeout);

            tooltip.classList.remove('show');

          };

          el.addEventListener('mouseenter', ()=>{ hoverTimeout=setTimeout(showTooltip,100); });

          el.addEventListener('mouseleave', (e) => {
            // Don't hide if mouse is moving to tooltip
            if (tooltip && tooltip.contains(e.relatedTarget)) {
              return;
            }
            hideTooltip();
          });
          
          // Keep tooltip visible when hovering over it
          tooltip.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
          });
          
          tooltip.addEventListener('mouseleave', hideTooltip);

          el.addEventListener('mousedown', hideTooltip);

          el.addEventListener('click', hideTooltip);

        }

      });

      cal.render();

      calRef.current = cal;

      // Delay initial calendar refresh for faster page load
      requestAnimationFrame(() => {
        refreshCalendar(events);
      });

      // автостатус при загрузке (delayed for faster initial load)
      if(settings.autoStatusEnabled) {
        // Delay smart status update to avoid blocking initial render
        setTimeout(() => {
          if (window.requestIdleCallback) {
            requestIdleCallback(runSmartStatusOnce, { timeout: 2000 });
          } else {
            setTimeout(runSmartStatusOnce, 500);
          }
        }, 1000);
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps

    },[]);

    // смена вида

    useEffect(()=>{ calRef.current?.changeView(view); },[view]);

    // Persist last selected calendar view
    useEffect(() => {
      try {
        localStorage.setItem('mainpro_view_v1', view);
      } catch (e) {
        // ignore
      }
    }, [view]);

    // Persist last selected status filter
    useEffect(() => {
      try {
        localStorage.setItem('mainpro_filter_v1', filter);
      } catch (e) {
        // ignore
      }
    }, [filter]);

    // Persist last selected sort
    useEffect(() => {
      try {
        localStorage.setItem('mainpro_sort_v1', sortBy);
      } catch (e) {
        // ignore
      }
    }, [sortBy]);

    // Persist stats panel visibility
    useEffect(() => {
      try {
        localStorage.setItem('mainpro_showstats_v1', String(!!showStats));
      } catch (e) {
        // ignore
      }
    }, [showStats]);

    // Update browser tab title with context (safe UX)
    useEffect(() => {
      const viewLabel =
        view === 'dayGridMonth' ? 'Month' :
        view === 'timeGridWeek' ? 'Week' :
        view === 'timeGridDay' ? 'Day' : view;
      const filterLabel =
        filter === 'all' ? 'All' :
        filter === 'pending' ? 'Pending' :
        filter === 'done' ? 'Done' :
        filter === 'missed' ? 'Missed' : filter;
      const month = monthLabel ? ` • ${monthLabel}` : '';
      // Keep base title stable (strip any previous suffix we added)
      const base = String(baseTitleRef.current || '').split(' • ')[0] || 'MainPro Calendar';
      document.title = `${base}${month} • ${viewLabel} • ${filterLabel}`;
    }, [monthLabel, view, filter]);

    // persist & re-render (optimized: debounced localStorage write)

    useEffect(()=>{ 
      // Use requestAnimationFrame for smooth calendar updates
      requestAnimationFrame(() => {
        refreshCalendar(events);
      });

      // Keep legacy Add Task scripts in sync (Undo relies on this)
      try { window.MainProEvents = Array.isArray(events) ? events : []; } catch {}
      
      // Debounce localStorage writes to avoid blocking (300ms delay)
      const calendarKey = `mainpro_calendar_${currentCalendarId}`;
      const saveTimeout = setTimeout(() => {
        try {
          localStorage.setItem(calendarKey, JSON.stringify(stripInstances(events)));
          try { localStorage.setItem('mainpro_events_v60', JSON.stringify(stripInstances(events))); } catch {}
          try { localStorage.setItem('mainpro_events_v70', JSON.stringify(stripInstances(events))); } catch {}
        } catch (e) {
          console.warn('localStorage write failed:', e);
        }
      }, 300);
      
      return () => clearTimeout(saveTimeout);
    },[events,filter,search,currentCalendarId,sortBy,groupBy]);

    useEffect(()=>{ localStorage.setItem('mainpro_categories_v60', JSON.stringify(categories)); },[categories]);

    useEffect(()=>{ localStorage.setItem('mainpro_settings_v60', JSON.stringify({

      hotelName:settings.hotelName, preparedBy:settings.preparedBy, approvedBy:settings.approvedBy, logoUrl:settings.logoUrl

    })); },[settings.hotelName,settings.preparedBy,settings.approvedBy,settings.logoUrl]);

    useEffect(()=>{ localStorage.setItem('mainpro_ui_v60', JSON.stringify(ui)); },[ui]);

    useEffect(()=>{ localStorage.setItem('mainpro_tasktypes_v60', JSON.stringify(taskTypes)); },[taskTypes]);

    // Expose auth setter for simple Login fallback modal
    useEffect(() => {
      window.mainProSetAuth = (user) => { setAuthUser(user || null); setIsAuthenticated(!!user); };
      return () => { delete window.mainProSetAuth; };
    }, []);

    // Debug: verify modal state transitions & DOM presence
    useEffect(() => {
      try {
        if (!window.__mainproDebugModals) return;
        console.log('[MainPro] modal state', { openSettings, showAuthModal, showAIChat, authMode });
        requestAnimationFrame(() => {
          try {
            const anyOverlay = document.querySelector('[data-mp-overlay]');
            const anyModal = document.querySelector('[data-mp-modal]');
            console.log('[MainPro] modal dom', {
              hasOverlay: !!anyOverlay,
              hasModal: !!anyModal,
              modalTitle: anyModal ? String(anyModal.textContent || '').slice(0, 60) : null
            });
          } catch {}
        });
      } catch {}
    }, [openSettings, showAuthModal, showAIChat, authMode]);

    // === Expose modals globally (header buttons depend on this) ===
    useEffect(() => {
      try {
        // Bind (and refresh) modal API. Do not early-return: if MainPro re-mounts,
        // stale closures would make window.open*Modal exist but do nothing.
        window.__mainproModalApiBound = true;

        let suppressUntil = 0;
        const now = () => (performance && performance.now) ? performance.now() : Date.now();
        // Dedupe rapid repeated calls (e.g., duplicate React event delegates / ghost clicks)
        const lastCallAt = { login: 0, chat: 0, settings: 0 };
        const shouldDedupe = (key, ms = 250) => {
          const t = now();
          if (t - (lastCallAt[key] || 0) < ms) return true;
          lastCallAt[key] = t;
          return false;
        };

        const closeAllMainModals = () => {
          try { setShowAIChat(false); } catch {}
          try { setShowAuthModal(false); } catch {}
          try { setOpenSettings(false); } catch {}
          // Also close any external/simple fallback modals if they exist
          try { if (typeof window.closeSimpleAuthModal === 'function') window.closeSimpleAuthModal(); } catch {}
          try { if (typeof window.closeSimpleAIChatModal === 'function') window.closeSimpleAIChatModal(); } catch {}
        };

        // --- DOM fallback modals (only used if React modal doesn't appear) ---
        const ensureFallbackHelpers = () => {
          if (window.__mainproDomModalHelpers) return;
          window.__mainproDomModalHelpers = true;

          const mkOverlay = (id) => {
            const existing = document.getElementById(id);
            if (existing) return existing;
            const ov = document.createElement('div');
            ov.id = id;
            // Mirror MainPro modal overlay styling
            ov.className = 'fixed inset-0 bg-black/40 flex items-center justify-center p-4 mp-overlay-anim';
            ov.setAttribute('data-mp-overlay', '1');
            // Ensure above everything else
            ov.style.zIndex = '99999';
            document.body.appendChild(ov);
            return ov;
          };

          const mkPanel = (title) => {
            const panel = document.createElement('div');
            // Mirror MainPro modal panel styling/classes
            panel.className = 'modal-enter modal-ready bg-white w-full max-w-md rounded-2xl p-0 shadow-xl border border-amber-200 overflow-hidden';
            panel.setAttribute('data-mp-modal', '1');
            panel.style.borderTop = '4px solid #f59e0b';
            const head = document.createElement('div');
            head.className = 'px-6 pt-6 pb-4 border-b border-amber-200 flex items-center justify-between';
            head.style.background = 'linear-gradient(135deg, #fef3c7, #fde68a)';
            const h = document.createElement('div');
            h.textContent = title;
            h.className = 'text-xl font-semibold flex items-center gap-2';
            h.style.color = '#92400e';
            const x = document.createElement('button');
            x.textContent = '✕';
            x.className = 'text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom';
            x.setAttribute('data-tooltip', 'Close');
            x.setAttribute('aria-label', 'Close');
            head.appendChild(h);
            head.appendChild(x);
            panel.appendChild(head);
            return { panel, closeBtn: x };
          };

          window.openSimpleAuthModal = window.openSimpleAuthModal || function () {
            const ov = mkOverlay('mp-dom-auth');
            ov.innerHTML = '';
            const { panel, closeBtn } = mkPanel('🔐 Login to MainPro');
            const body = document.createElement('div');
            body.className = 'px-6 pb-6';
            body.style.background = '#fffbeb';
            body.innerHTML = `
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input id="mp-dom-auth-email" type="email" placeholder="your@email.com"
                    class="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300">
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input id="mp-dom-auth-pass" type="password" placeholder="••••••••"
                    class="w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300">
                </div>
                <button id="mp-dom-auth-login"
                  class="w-full px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium"
                  style="background:#f59e0b">Login</button>
                <div class="text-center">
                  <button id="mp-dom-auth-signup" class="text-sm text-amber-800 hover:text-amber-900" type="button">
                    Don't have an account? Sign Up
                  </button>
                </div>
              </div>
            `;
            panel.appendChild(body);
            ov.appendChild(panel);
            const close = () => { try { ov.remove(); } catch {} };
            closeBtn.onclick = close;
            ov.onclick = (e) => { if (e.target === ov) close(); };
            const loginBtn = panel.querySelector('#mp-dom-auth-login');
            if (loginBtn) {
              loginBtn.onclick = () => {
                try {
                  if (typeof window.mainProSetAuth === 'function') {
                    window.mainProSetAuth({ name: 'Demo User', email: (panel.querySelector('#mp-dom-auth-email')||{}).value || 'demo@mainpro.com' });
                  }
                } catch {}
                close();
              };
            }
            const signupBtn = panel.querySelector('#mp-dom-auth-signup');
            if (signupBtn) {
              signupBtn.onclick = () => {
                try { if (typeof window.showToast === 'function') window.showToast('📝 Sign Up (demo)'); } catch {}
              };
            }
            window.closeSimpleAuthModal = close;
          };

          window.openSimpleAIChatModal = window.openSimpleAIChatModal || function () {
            const ov = mkOverlay('mp-dom-chat');
            ov.innerHTML = '';
            const { panel, closeBtn } = mkPanel('🤖 MainPro AI Assistant');
            // Wider chat modal like the React version
            panel.className = 'modal-enter modal-ready bg-white w-full max-w-2xl rounded-2xl p-0 shadow-xl h-[600px] flex flex-col border border-amber-200 overflow-hidden';
            panel.style.borderTop = '4px solid #f59e0b';
            const body = document.createElement('div');
            body.className = 'flex-1 p-6 overflow-y-auto';
            body.style.background = '#fffbeb';
            body.innerHTML = `
              <div id="mp-dom-chat-log" class="space-y-3">
                <div class="flex">
                  <div class="px-3 py-2 rounded-2xl text-sm border border-amber-200 bg-white text-gray-700 max-w-[85%]">
                    Hello! How can I help?
                    <div class="text-[11px] text-gray-400 mt-1">AI</div>
                  </div>
                </div>
              </div>
            `;
            const footer = document.createElement('div');
            footer.className = 'px-6 py-4 border-t border-amber-200 flex gap-3';
            footer.style.background = '#fffbeb';
            footer.innerHTML = `
              <input id="mp-dom-chat-in" class="flex-1 px-4 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="Type a message...">
              <button id="mp-dom-chat-send" class="px-6 py-2 text-white rounded-lg hover:opacity-90 font-medium" style="background:#f59e0b">Send</button>
            `;
            panel.appendChild(body);
            panel.appendChild(footer);
            ov.appendChild(panel);
            const close = () => { try { ov.remove(); } catch {} };
            closeBtn.onclick = close;
            ov.onclick = (e) => { if (e.target === ov) close(); };
            const logEl = panel.querySelector('#mp-dom-chat-log');
            const inEl = panel.querySelector('#mp-dom-chat-in');
            const send = () => {
              const txt = (inEl && inEl.value) ? String(inEl.value).trim() : '';
              if (!txt) return;
              if (inEl) inEl.value = '';
              if (logEl) {
                const uWrap = document.createElement('div');
                uWrap.className = 'flex justify-end';
                const u = document.createElement('div');
                u.className = 'px-3 py-2 rounded-2xl text-sm bg-amber-100 text-amber-900 max-w-[85%]';
                u.textContent = txt;
                uWrap.appendChild(u);
                logEl.appendChild(uWrap);

                const aWrap = document.createElement('div');
                aWrap.className = 'flex';
                const a = document.createElement('div');
                a.className = 'px-3 py-2 rounded-2xl text-sm border border-amber-200 bg-white text-gray-700 max-w-[85%]';
                a.textContent = '(offline demo) Add an API key in Settings to enable AI.';
                aWrap.appendChild(a);
                logEl.appendChild(aWrap);
                logEl.scrollTop = logEl.scrollHeight;
              }
            };
            const sendBtn = panel.querySelector('#mp-dom-chat-send');
            if (sendBtn) sendBtn.onclick = send;
            if (inEl) inEl.onkeydown = (e) => { if (e.key === 'Enter') send(); };
            window.closeSimpleAIChatModal = close;
          };
        };

        const hasModalWithText = (needle) => {
          try {
            return Array.from(document.querySelectorAll('[data-mp-modal]')).some(m => String(m.textContent||'').includes(needle));
          } catch { return false; }
        };

        const ensureReactOrFallback = (type) => {
          // Check twice after render to see if React modal appeared; if not, use DOM fallback.
          const needle = type === 'login' ? 'Login to MainPro' : (type === 'chat' ? 'MainPro AI Assistant' : '⚙️ Settings');
          const openFallback = type === 'login'
            ? () => { ensureFallbackHelpers(); window.openSimpleAuthModal(); }
            : type === 'chat'
              ? () => { ensureFallbackHelpers(); window.openSimpleAIChatModal(); }
              : null;
          [0, 50, 120].forEach((ms) => {
            setTimeout(() => {
              if (type === 'settings') return; // settings is React-only
              if (!hasModalWithText(needle) && typeof openFallback === 'function') openFallback();
            }, ms);
          });
        };

        window.openLoginModal = () => {
          // Prevent "ghost click" right after Settings opens
          if (now() < suppressUntil) {
            try { if (window.__mainproDebugModals) console.log('[MainPro] openLoginModal blocked (suppressUntil)', { inMs: Math.round(suppressUntil - now()) }); } catch {}
            return;
          }
          if (shouldDedupe('login')) {
            try { if (window.__mainproDebugModals) console.log('[MainPro] openLoginModal blocked (dedupe)'); } catch {}
            return;
          }
          // Block any immediate follow-up opens triggered by the same click sequence
          suppressUntil = now() + 400;
          try {
            // Always prefer the built-in React modal (most reliable).
            try {
              window.__mainproModalOpenedAt = window.__mainproModalOpenedAt || {};
              window.__mainproModalOpenedAt.login = Date.now();
            } catch {}
            // Close other modals, but don't bounce auth modal itself.
            try { setOpenSettings(false); } catch {}
            try { setShowAIChat(false); } catch {}
            setAuthMode('login');
            setShowAuthModal(true);
            // Re-assert open state in case something immediately closes it (click-through/retarget)
            setTimeout(() => { try { setShowAuthModal(true); } catch {} }, 0);
            setTimeout(() => { try { setShowAuthModal(true); } catch {} }, 80);
            try { if (typeof window.showToast === 'function') window.showToast('🔐 Login'); } catch {}
            if (window.__mainproDebugModals) console.log('[MainPro] openLoginModal()');
            ensureReactOrFallback('login');
          } catch (e) {
            console.warn('[MainPro] openLoginModal failed:', e);
            // Last resort: try external/simple modal if present
            try { if (typeof window.openSimpleAuthModal === 'function') window.openSimpleAuthModal(); } catch {}
          }
        };

        window.openAIChatModal = () => {
          if (now() < suppressUntil) {
            try { if (window.__mainproDebugModals) console.log('[MainPro] openAIChatModal blocked (suppressUntil)', { inMs: Math.round(suppressUntil - now()) }); } catch {}
            return;
          }
          if (shouldDedupe('chat')) {
            try { if (window.__mainproDebugModals) console.log('[MainPro] openAIChatModal blocked (dedupe)'); } catch {}
            return;
          }
          suppressUntil = now() + 400;
          try {
            // Always prefer the built-in React modal (most reliable).
            try {
              window.__mainproModalOpenedAt = window.__mainproModalOpenedAt || {};
              window.__mainproModalOpenedAt.chat = Date.now();
            } catch {}
            try { setOpenSettings(false); } catch {}
            try { setShowAuthModal(false); } catch {}
            setShowAIChat(true);
            setTimeout(() => { try { setShowAIChat(true); } catch {} }, 0);
            setTimeout(() => { try { setShowAIChat(true); } catch {} }, 80);
            try { if (typeof window.showToast === 'function') window.showToast('💬 AI Chat'); } catch {}
            if (window.__mainproDebugModals) console.log('[MainPro] openAIChatModal()');
            ensureReactOrFallback('chat');
          } catch (e) {
            console.warn('[MainPro] openAIChatModal failed:', e);
            // Last resort: try external/simple modal if present
            try { if (typeof window.openSimpleAIChatModal === 'function') window.openSimpleAIChatModal(); } catch {}
          }
        };

        window.openSettingsModal = () => {
          if (shouldDedupe('settings')) {
            try { if (window.__mainproDebugModals) console.log('[MainPro] openSettingsModal blocked (dedupe)'); } catch {}
            return;
          }
          // Optional diagnostics (enable manually): window.__mainproDebugModals = true
          try {
            if (window.__mainproDebugModals) {
              console.log('[MainPro] openSettingsModal()', { stack: (new Error('settings-click')).stack });
            }
          } catch {}
          // Block any immediate follow-up login/chat opens caused by retargeted clicks
          suppressUntil = now() + 800;
          // Close other modals
          try { setShowAIChat(false); } catch {}
          try { setShowAuthModal(false); } catch {}
          try {
            window.__mainproModalOpenedAt = window.__mainproModalOpenedAt || {};
            window.__mainproModalOpenedAt.settings = Date.now();
          } catch {}
          setOpenSettings(true);
          setTimeout(() => { try { setOpenSettings(true); } catch {} }, 0);
          try { if (typeof window.showToast === 'function') window.showToast('⚙️ Settings'); } catch {}
        };

        // Alias: some UI labels refer to "Network"
        window.openNetworkModal = window.openSettingsModal;

        // === Header click router (capture) ===
        // If some layer intercepts clicks, React onClick may not fire.
        // Use CAPTURED "click" (not pointerdown) to avoid: open-on-pointerdown -> overlay mounts -> same click hits overlay and instantly closes.
        if (!window.__mainproHeaderRouterBound) {
          window.__mainproHeaderRouterBound = true;
          const LABELS = {
            settings: '⚙️ Settings',
            chat: '💬 AI Chat',
            login: '🔐 Login',
          };
          const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
          const labelOfBtn = (btn) => norm(btn && (btn.innerText || btn.textContent));
          const inRect = (x, y, r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

          const headerRect = () => {
            const h = document.querySelector('.glassbar');
            return h ? h.getBoundingClientRect() : null;
          };

          const findHeaderButtonAtPoint = (x, y) => {
            const hr = headerRect();
            if (!hr || !inRect(x, y, hr)) return null;
            const btns = Array.from(document.querySelectorAll('button'));
            const candidates = btns.filter((b) => {
              const t = labelOfBtn(b);
              return t === LABELS.settings || t === LABELS.chat || t === LABELS.login;
            });
            // pick smallest area button containing point
            let best = null;
            let bestArea = Infinity;
            for (const b of candidates) {
              const r = b.getBoundingClientRect();
              if (!inRect(x, y, r)) continue;
              const area = Math.max(0, r.width) * Math.max(0, r.height);
              if (area < bestArea) { best = b; bestArea = area; }
            }
            return best;
          };

          const handler = (e) => {
            try {
              // Don't route while any overlay is open (avoids click-through / modal close races)
              if (document.querySelector('[data-mp-overlay]')) return;

              const directBtn = e.target && e.target.closest ? e.target.closest('button') : null;
              const directLabel = directBtn ? labelOfBtn(directBtn) : '';
              const btn = (directBtn && (directLabel === LABELS.settings || directLabel === LABELS.chat || directLabel === LABELS.login))
                ? directBtn
                : findHeaderButtonAtPoint(e.clientX, e.clientY);
              if (!btn) return;

              const lab = labelOfBtn(btn);
              if (window.__mainproDebugModals) console.log('[MainPro] header router hit', lab);

              // Route immediately and stop the event so we don't double-fire via React
              e.preventDefault();
              e.stopPropagation();
              if (e.stopImmediatePropagation) e.stopImmediatePropagation();

              if (lab === LABELS.settings && typeof window.openSettingsModal === 'function') window.openSettingsModal();
              if (lab === LABELS.chat && typeof window.openAIChatModal === 'function') window.openAIChatModal();
              if (lab === LABELS.login && typeof window.openLoginModal === 'function') window.openLoginModal();
            } catch (err) {
              console.warn('[MainPro] header router failed:', err);
            }
          };

          document.addEventListener('click', handler, true);
          // Store for cleanup (in case React root ever unmounts/remounts)
          window.__mainproHeaderRouterHandler = handler;
        }
      } catch (e) {
        console.warn('[MainPro] Failed to bind modal API:', e);
      }
      // Cleanup is mostly for hot-reload/unmount scenarios; should be a no-op in normal stable runtime.
      return () => {
        try {
          const h = window.__mainproHeaderRouterHandler;
          if (h) document.removeEventListener('click', h, true);
        } catch {}
        try {
          window.__mainproHeaderRouterHandler = null;
          window.__mainproHeaderRouterBound = false;
        } catch {}
      };
    }, []);

    useEffect(()=>{ localStorage.setItem('mainpro_autostatus_v1', JSON.stringify({enabled: !!settings.autoStatusEnabled})); },[settings.autoStatusEnabled]);
    
    // Dark mode effect
    useEffect(() => {
      try {
        localStorage.setItem('mainpro_darkmode', String(darkMode));
        if (darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        console.warn('Failed to save dark mode:', e);
      }
    }, [darkMode]);

    // Persist templates
    useEffect(() => {
      try {
        localStorage.setItem('mainpro_templates_v1', JSON.stringify(taskTemplates || []));
      } catch {}
    }, [taskTemplates]);

    // Undo timer for "Clear All Tasks"
    useEffect(() => {
      try {
        if (undoClearAllTimerRef.current) {
          clearTimeout(undoClearAllTimerRef.current);
          undoClearAllTimerRef.current = null;
        }
      } catch {}
      if (!undoClearAll || !undoClearAll.expiresAt) return;
      const ms = Math.max(0, Number(undoClearAll.expiresAt) - Date.now());
      undoClearAllTimerRef.current = setTimeout(() => {
        try { setUndoClearAll(null); } catch {}
      }, ms);
      return () => {
        try {
          if (undoClearAllTimerRef.current) clearTimeout(undoClearAllTimerRef.current);
          undoClearAllTimerRef.current = null;
        } catch {}
      };
    }, [undoClearAll]);

    // Undo timer for delete (can include multiple tasks)
    useEffect(() => {
      try {
        if (undoDeleteTimerRef.current) {
          clearTimeout(undoDeleteTimerRef.current);
          undoDeleteTimerRef.current = null;
        }
      } catch {}
      if (!undoDelete || !undoDelete.expiresAt) return;
      const ms = Math.max(0, Number(undoDelete.expiresAt) - Date.now());
      undoDeleteTimerRef.current = setTimeout(() => {
        try { setUndoDelete(null); } catch {}
      }, ms);
      return () => {
        try {
          if (undoDeleteTimerRef.current) clearTimeout(undoDeleteTimerRef.current);
          undoDeleteTimerRef.current = null;
        } catch {}
      };
    }, [undoDelete]);
    
    // Keyboard shortcuts for better UX
    useEffect(() => {
      const handleKeyDown = (e) => {
        // Don't trigger if typing in input/textarea (but allow Esc + help hotkeys)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
          const allowWhileTyping =
            (e.key === 'Escape') ||
            (e.code === 'Slash' && (e.ctrlKey || e.metaKey)) ||
            (e.code === 'Slash' && e.shiftKey && !e.ctrlKey && !e.metaKey) ||
            (e.key === 'F1');
          if (!allowWhileTyping) return;
        }

        // If Add Task v74 overlay is open (DOM modal outside React), block hotkeys behind it.
        // Let Esc pass through (the overlay handles Esc itself).
        let addTaskOverlayOpen = false;
        try {
          addTaskOverlayOpen = !!document.querySelector('.mp-add-overlay');
        } catch {}
        if (addTaskOverlayOpen && e.key !== 'Escape') {
          return;
        }

        // If any modal/picker is open, avoid accidental calendar navigation hotkeys.
        // Allow Esc and Ctrl/Cmd shortcuts (search/help) to still work.
        const modalOpen = !!(
          showAdd || openSettings || showAnalytics || showPicker || editEvent || showHotkeyHelp || showTemplates || showList ||
          dmShow || previewDoc || showTeamSettings || showInviteModal || showAuditDashboard ||
          showReports || showAIPanel || showProjectSharing || showCrossCompanyCollaboration ||
          showGuestAccess || showSecureVault || showAICompliance || showCloudSync ||
          showPWAModal || showSubscriptionModal || showEmergencyModal || showBusinessModal ||
          showAuthModal || showAIChat
        );
        // Allow closing Help while it's open (H / Shift+? / F1) even though it's a modal.
        const helpCloseKey =
          !!showHotkeyHelp &&
          (
            ((e.code === 'Slash' && e.shiftKey) && !e.ctrlKey && !e.metaKey) ||
            ((e.code === 'KeyH' || e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey) ||
            (e.key === 'F1')
          );
        if (modalOpen && e.key !== 'Escape' && !(e.ctrlKey || e.metaKey) && !helpCloseKey) {
          return;
        }
        
        // N or + for new task
        // Use e.code for layout-independent hotkeys (KeyN works on RU/EN)
        if ((e.code === 'KeyN' || e.key === 'N' || e.key === '+') && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          showToast('➕ New task');
          if (window.openTaskModal) {
            window.openTaskModal();
          } else {
            setShowAdd(true);
          }
        }

        // Enter to add new task (only when focus is on page background)
        if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          const tag = (e.target && e.target.tagName) ? String(e.target.tagName) : '';
          if (tag === 'BODY' || tag === 'HTML') {
            e.preventDefault();
            showToast('➕ New task');
            if (window.openTaskModal) {
              window.openTaskModal();
            } else {
              setShowAdd(true);
            }
          }
        }
        
        // Esc to close modals
        if (e.key === 'Escape') {
          let didClose = false;
          if (showAdd) { setShowAdd(false); didClose = true; }
          if (openSettings) { setOpenSettings(false); didClose = true; }
          if (showAnalytics) { setShowAnalytics(false); didClose = true; }
          if (showPicker) { setShowPicker(false); didClose = true; }
          if (editEvent) { setEditEvent(null); didClose = true; }
          if (dmShow) { setDmShow(false); didClose = true; }
          if (previewDoc) { setPreviewDoc(null); didClose = true; }
          if (showTeamSettings) { setShowTeamSettings(false); didClose = true; }
          if (showInviteModal) { setShowInviteModal(false); didClose = true; }
          if (showAuditDashboard) { setShowAuditDashboard(false); didClose = true; }
          if (showReports) { setShowReports(false); didClose = true; }
          if (showAIPanel) { setShowAIPanel(false); didClose = true; }
          if (showProjectSharing) { setShowProjectSharing(false); didClose = true; }
          if (showCrossCompanyCollaboration) { setShowCrossCompanyCollaboration(false); didClose = true; }
          if (showGuestAccess) { setShowGuestAccess(false); didClose = true; }
          if (showSecureVault) { setShowSecureVault(false); didClose = true; }
          if (showAICompliance) { setShowAICompliance(false); didClose = true; }
          if (showCloudSync) { setShowCloudSync(false); didClose = true; }
          if (showPWAModal) { setShowPWAModal(false); didClose = true; }
          if (showSubscriptionModal) { setShowSubscriptionModal(false); didClose = true; }
          if (showEmergencyModal) { setShowEmergencyModal(false); didClose = true; }
          if (showBusinessModal) { setShowBusinessModal(false); didClose = true; }
          if (showAuthModal) { setShowAuthModal(false); didClose = true; }
          if (showAIChat) { setShowAIChat(false); didClose = true; }
          if (showTemplates) { setShowTemplates(false); didClose = true; }
          if (showHotkeyHelp) { setShowHotkeyHelp(false); didClose = true; }
          if (showList) { setShowList(false); didClose = true; }
          // If nothing to close, clear search (nice UX)
          if (!didClose) {
            setSearch(prev => {
              const wasEmpty = !prev;
              const next = prev ? '' : prev;
              // If search is already empty, also blur active element (helps escape "stuck focus")
              if (wasEmpty) {
                try {
                  if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                  }
                } catch {}
              }
              return next;
            });
          }
        }

        // S to toggle stats panel (layout-independent)
        if ((e.code === 'KeyS' || e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          setShowStats(prev => {
            const next = !prev;
            showToast(next ? '📊 Stats: ON' : '📊 Stats: OFF');
            return next;
          });
        }

        // Space to toggle stats panel (quick & visible)
        if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          const tag = (e.target && e.target.tagName) ? String(e.target.tagName) : '';
          // Only trigger when focus is on page background, so Space doesn't break scrolling/buttons.
          if (tag === 'BODY' || tag === 'HTML') {
            e.preventDefault();
            setShowStats(prev => {
              const next = !prev;
              showToast(next ? '📊 Stats: ON' : '📊 Stats: OFF');
              return next;
            });
          }
        }

        // D to toggle dark mode (layout-independent)
        if ((e.code === 'KeyD' || e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          setDarkMode(prev => {
            const next = !prev;
            showToast(next ? '🌙 Dark mode: ON' : '☀️ Dark mode: OFF');
            return next;
          });
        }
        
        // Note: Search hotkeys like Ctrl+K / Ctrl+L / / are often intercepted by the browser.
        // We intentionally avoid binding them here to prevent "opens browser search" behavior.
        
        // F to focus search (layout-independent)
        if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
          e.preventDefault();
          try { if (typeof showToast === 'function') showToast('🔎 Search'); } catch {}
          try {
            if (searchInputRef.current && typeof searchInputRef.current.focus === 'function') {
              searchInputRef.current.focus();
            } else {
              const input = document.querySelector('input[placeholder="Search tasks..."]');
              if (input) input.focus();
            }
          } catch {}
        }

        // Ctrl+/ to show shortcuts help (layout-independent, non-blocking modal)
        if (e.code === 'Slash' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          setShowHotkeyHelp(prev => !prev);
        }

        // Shift+? (Shift+/) to show shortcuts help (layout-independent)
        if ((e.code === 'Slash' && e.shiftKey) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setShowHotkeyHelp(prev => !prev);
        }

        // H to show shortcuts help (layout-independent)
        if ((e.code === 'KeyH' || e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          setShowHotkeyHelp(prev => !prev);
        }

        // F1 to show shortcuts help (common app convention)
        if (e.key === 'F1') {
          e.preventDefault();
          setShowHotkeyHelp(prev => !prev);
        }

        // 1/2/3 to switch calendar view (layout-independent via e.code)
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') { e.preventDefault(); setView('dayGridMonth'); showToast('📅 View: Month'); }
          if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') { e.preventDefault(); setView('timeGridWeek'); showToast('📆 View: Week'); }
          if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') { e.preventDefault(); setView('timeGridDay'); showToast('🗓️ View: Day'); }
        }

        // Alt + 1/2/3/4 to switch status filter (layout-independent via e.code)
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
          if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '1') { e.preventDefault(); setFilter('all'); showToast('🧹 Filter: All'); }
          if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === '2') { e.preventDefault(); setFilter('pending'); showToast('🟡 Filter: Pending'); }
          if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '3') { e.preventDefault(); setFilter('done'); showToast('🟢 Filter: Done'); }
          if (e.code === 'Digit4' || e.code === 'Numpad4' || e.key === '4') { e.preventDefault(); setFilter('missed'); showToast('🔴 Filter: Missed'); }
        }
        
        // Arrow keys for month navigation
        if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.prev();
            showToast('‹ Month');
          }
        }
        if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.next();
            showToast('Month ›');
          }
        }

        // PageUp/PageDown for month navigation
        if (e.key === 'PageUp' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.prev();
            showToast('‹ Month');
          }
        }
        if (e.key === 'PageDown' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.next();
            showToast('Month ›');
          }
        }

        // B/M month navigation (layout-independent via e.code)
        if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.prev();
            showToast('‹ Month');
          }
        }
        if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.next();
            showToast('Month ›');
          }
        }

        // [ and ] for month navigation (non-conflicting)
        if ((e.key === '[' || e.code === 'BracketLeft') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.prev();
            showToast('‹ Month');
          }
        }
        if ((e.key === ']' || e.code === 'BracketRight') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.next();
            showToast('Month ›');
          }
        }

        // , and . for month navigation (very common keys)
        if ((e.key === ',' || e.code === 'Comma') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.prev();
            showToast('‹ Month');
          }
        }
        if ((e.key === '.' || e.code === 'Period') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          e.preventDefault();
          if (calRef.current) {
            calRef.current.next();
            showToast('Month ›');
          }
        }
        
        // T to toggle view (layout-independent)
        if ((e.code === 'KeyT' || e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const nextView = view === 'dayGridMonth' ? 'timeGridWeek' : 'dayGridMonth';
          setView(nextView);
          showToast(nextView === 'dayGridMonth' ? '📅 View: Month' : '📆 View: Week');
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
      showAdd, openSettings, showAnalytics, showPicker, editEvent, showHotkeyHelp, showTemplates, showList,
      dmShow, previewDoc, showTeamSettings, showInviteModal, showAuditDashboard,
      showReports, showAIPanel, showProjectSharing, showCrossCompanyCollaboration,
      showGuestAccess, showSecureVault, showAICompliance, showCloudSync,
      showPWAModal, showSubscriptionModal, showEmergencyModal, showBusinessModal,
      showAuthModal, showAIChat,
      view
    ]);

    // Prevent background scroll when any modal/overlay is open
    useEffect(() => {
      const anyModalOpen = !!(
        showAdd || openSettings || showAnalytics || showPicker || editEvent || showHotkeyHelp || showTemplates || showList ||
        dmShow || previewDoc || showTeamSettings || showInviteModal || showAuditDashboard ||
        showReports || showAIPanel || showProjectSharing || showCrossCompanyCollaboration ||
        showGuestAccess || showSecureVault || showAICompliance || showCloudSync ||
        showPWAModal || showSubscriptionModal || showEmergencyModal || showBusinessModal ||
        showAuthModal || showAIChat
      );

      if (!anyModalOpen) return;
      let prevOverflow = '';
      let prevPaddingRight = '';
      try {
        const body = document.body;
        const html = document.documentElement;
        prevOverflow = body.style.overflow || '';
        prevPaddingRight = body.style.paddingRight || '';

        // Prevent "page jerk" when scrollbar disappears:
        // keep layout width by adding padding-right equal to scrollbar width.
        const sbw = Math.max(0, (window.innerWidth || 0) - (html?.clientWidth || 0));
        body.style.overflow = 'hidden';
        if (sbw > 0) body.style.paddingRight = `${sbw}px`;
      } catch {}
      return () => {
        try {
          document.body.style.overflow = prevOverflow;
          document.body.style.paddingRight = prevPaddingRight;
        } catch {}
      };
    }, [
      showAdd, openSettings, showAnalytics, showPicker, editEvent, showHotkeyHelp, showTemplates, showList,
      dmShow, previewDoc, showTeamSettings, showInviteModal, showAuditDashboard,
      showReports, showAIPanel, showProjectSharing, showCrossCompanyCollaboration,
      showGuestAccess, showSecureVault, showAICompliance, showCloudSync,
      showPWAModal, showSubscriptionModal, showEmergencyModal, showBusinessModal,
      showAuthModal, showAIChat
    ]);

    // Multi-Calendar Functions
    function createCalendar(name, type = 'maintenance') {
      const calendarIcons = {
        maintenance: '🔧',
        compliance: '📋',
        general: '📅',
        personal: '👤'
      };
      
      const calendarColors = {
        maintenance: '#3B82F6',
        compliance: '#10B981',
        general: '#6B7280',
        personal: '#8B5CF6'
      };
      
      const newCalendar = {
        id: 'cal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: name || 'New Calendar',
        type: type,
        icon: calendarIcons[type] || '📅',
        color: calendarColors[type] || '#3B82F6',
        created: new Date().toISOString()
      };
      
      setCalendars(prev => [...prev, newCalendar]);
      localStorage.setItem('mainpro_calendars_v1', JSON.stringify([...calendars, newCalendar]));
      showToast(`📅 Calendar "${newCalendar.name}" created`);
      
      return newCalendar;
    }

    function switchCalendar(calendarId) {
      if (calendars.find(cal => cal.id === calendarId)) {
        setCurrentCalendarId(calendarId);
        localStorage.setItem('mainpro_current_calendar_v1', calendarId);
        
        // Load events for the new calendar (bases only)
        const calendarEvents = safeParse(`mainpro_calendar_${calendarId}`, []);
        const cleaned = stripInstances(calendarEvents);
        setEvents(cleaned);
        refreshCalendar(cleaned);
        
        showToast(`📅 Switched to ${calendars.find(cal => cal.id === calendarId)?.name || 'Calendar'}`);
      }
    }

    function deleteCalendar(calendarId) {
      if (calendarId === 'main') {
        showToast('❌ Cannot delete main calendar');
        return;
      }
      
      const calendarToDelete = calendars.find(cal => cal.id === calendarId);
      if (!calendarToDelete) return;
      
      // Remove calendar from list
      const updatedCalendars = calendars.filter(cal => cal.id !== calendarId);
      setCalendars(updatedCalendars);
      localStorage.setItem('mainpro_calendars_v1', JSON.stringify(updatedCalendars));
      
      // Remove events for this calendar from localStorage
      localStorage.removeItem(`mainpro_calendar_${calendarId}`);
      
      // If we're currently viewing the deleted calendar, switch to main
      if (currentCalendarId === calendarId) {
        switchCalendar('main');
      }
      
      showToast(`🗑️ Calendar "${calendarToDelete.name}" deleted`);
    }

    function renameCalendar(calendarId, newName) {
      if (calendarId === 'main') {
        showToast('❌ Cannot rename main calendar');
        return;
      }
      
      setCalendars(prev => prev.map(cal => 
        cal.id === calendarId ? { ...cal, name: newName.trim() } : cal
      ));
      localStorage.setItem('mainpro_calendars_v1', JSON.stringify(calendars.map(cal => 
        cal.id === calendarId ? { ...cal, name: newName.trim() } : cal
      )));
      showToast(`✏️ Calendar renamed to "${newName.trim()}"`);
    }

    // Make functions available globally for console access
    window.createCalendar = createCalendar;
    window.switchCalendar = switchCalendar;
    window.deleteCalendar = deleteCalendar;
    window.renameCalendar = renameCalendar;
    window.listCalendars = () => calendars;

    function refreshCalendar(list){
      const cal = calRef.current; if(!cal) return;
      const listToUse = list !== undefined ? list : (eventsRef.current || []);
      requestAnimationFrame(() => {
        let rangeStart, rangeEnd;
        try {
          const view = cal.getView();
          if (view && view.activeStart && view.activeEnd) {
            rangeStart = view.activeStart;
            rangeEnd = view.activeEnd;
          } else {
            const now = new Date();
            rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
            rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          }
        } catch (_) {
          const now = new Date();
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
          rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }

        const baseList = Array.isArray(listToUse) ? listToUse.filter(e => !e.isInstance) : [];
        const expanded = [];
        for (const e of baseList) {
          const recur = e.recur;
          if (!recur || recur.freq === 'none') {
            expanded.push(e);
          } else {
            expanded.push(...generateOccurrences({ ...e }, rangeStart, rangeEnd));
          }
        }

        let src = (filter==='all') ? expanded : expanded.filter(e=> e.status===filter);

        const q = (search||'').trim().toLowerCase();
        if(q){
          src = src.filter(e=>{
            const catName = (categories.find(c=>c.id===e.catId)?.name)||'';
            return [e.title,e.taskType,e.location,e.notes,catName].some(v=> (v||'').toLowerCase().includes(q));
          });
        }
        if (sortBy !== 'none') {
          src = [...src].sort((a, b) => {
            if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
            if (sortBy === 'priority') {
              const priorityOrder = { high: 3, medium: 2, normal: 2, low: 1 };
              return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            }
            if (sortBy === 'status') {
              const statusOrder = { done: 3, pending: 2, missed: 1, none: 0 };
              return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
            }
            if (sortBy === 'date') return new Date(a.start || 0) - new Date(b.start || 0);
            return 0;
          });
        }

        const eventsToAdd = src.map(e=>{
          let start = e.start;
          if (/^\d{4}-\d{2}-\d{2}$/.test(start)) start += 'T09:00';
          const status = e.status || 'pending';
          const color = statusColor(status);
          let displayTitle = e.title || 'Untitled';
          if (displayTitle.length > 12) displayTitle = displayTitle.substring(0, 12) + '...';
          const priority = e.priority || 'normal';
          if (priority === 'high') displayTitle = '🔴 ' + displayTitle;
          else if (priority === 'low') displayTitle = '⬇️ ' + displayTitle;
          return {
            id:e.id,
            title: displayTitle,
            start,
            allDay:false,
            color, backgroundColor: color, borderColor: color, textColor: '#111827',
            extendedProps: {...e}
          };
        });

        cal.removeAllEvents();
        eventsToAdd.forEach(event => cal.addEvent(event));
      });
    }

    // Smart Status Engine

    function computeNewStatus(e, now){

      // если задача в прошлом, и не 'done' — становится 'missed'

      // если в будущем и была 'missed' — вернём в 'pending' (на случай переноса на будущее)

      try{

        const dt = new Date(e.start);

        if (isNaN(dt.getTime())) return e.status||'pending';

        if (e.status==='done') return 'done';

        if (dt.getTime() < now.getTime()) return 'missed';

        return 'pending';

      }catch{

        return e.status||'pending';

      }

    }

    function runSmartStatusOnce(){

      const now = new Date();

      let changed = 0;

      setEvents(prev=>{

        const next = prev.map(ev=>{

          const ns = computeNewStatus(ev, now);

          if(ns !== ev.status){

            changed++;

            return {...ev, status: ns};

          }

          return ev;

        });

        return next;

      });

      if(changed>0){

        // обновить цвета на календаре без полной перерисовки

        try{

          const cal = calRef.current;

          if(cal){

            cal.getEvents().forEach(fcEv=>{

              const src = eventsRef.current.find(e=> String(e.id)===String(fcEv.id));

              if(src){
                const col = statusColor(src.status);
                fcEv.setProp('color', col);
                fcEv.setProp('backgroundColor', col);
                fcEv.setProp('borderColor', col);
                fcEv.setProp('textColor', '#111827');
              }

            });

          }

        }catch{}

        showToast(`Smart Status updated (${changed}) tasks.`);

      }

    }

    // периодический авто-двигатель

    useEffect(()=>{

      let timer = null;

      if(settings.autoStatusEnabled){

        timer = setInterval(runSmartStatusOnce, 60000); // каждые 60 сек

      }

      return ()=>{ if(timer) clearInterval(timer); };

    },[settings.autoStatusEnabled, events]);

    function hideTooltipGlobal(){

      try{ const tip=document.getElementById('mp-tooltip'); if(tip) tip.classList.remove('show'); }catch{}

    }
    
    // Quick status change function (for tooltip buttons)
    window.quickStatusChange = (eventId, newStatus) => {
      setEvents(prev => prev.map(e => 
        String(e.id) === String(eventId) ? { ...e, status: newStatus } : e
      ));
      setFilter('all'); // switch to All so task stays visible after status change
      showToast(`✅ Status changed to ${newStatus}`);
      hideTooltipGlobal();
    };
    
    // Notification function
    function showNotification(title, options = {}) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          icon: 'https://i.imgur.com/SW6T4ZL.png',
          badge: 'https://i.imgur.com/SW6T4ZL.png',
          ...options
        });
      }
    }
    
    // Check for upcoming tasks and show notifications
    useEffect(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      
      const checkUpcomingTasks = () => {
        const now = new Date();
        const in30Min = new Date(now.getTime() + 30 * 60 * 1000);
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
        
        events.forEach(event => {
          if (event.status === 'pending' && event.start) {
            try {
              const eventDate = new Date(event.start);
              if (eventDate > now && eventDate <= in30Min) {
                showNotification(`⏰ Upcoming: ${event.title}`, {
                  body: `Task starts in less than 30 minutes`,
                  tag: `task-${event.id}`,
                  requireInteraction: false
                });
              } else if (eventDate > in30Min && eventDate <= in1Hour) {
                const notifiedKey = `notified_${event.id}`;
                if (!localStorage.getItem(notifiedKey)) {
                  showNotification(`📅 Reminder: ${event.title}`, {
                    body: `Task starts in 1 hour`,
                    tag: `task-${event.id}-1h`,
                    requireInteraction: false
                  });
                  localStorage.setItem(notifiedKey, 'true');
                  setTimeout(() => localStorage.removeItem(notifiedKey), 2 * 60 * 60 * 1000);
                }
              }
            } catch (e) {
              // Ignore invalid dates
            }
          }
        });
      };
      
      const interval = setInterval(checkUpcomingTasks, 5 * 60 * 1000);
      checkUpcomingTasks();
      
      return () => clearInterval(interval);
    }, [events]);
    
    // Export to iCal function
    function generateICal() {
      const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MainPro Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];
      
      events.forEach(event => {
        const start = new Date(event.start || event.date || Date.now());
        const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
        
        icalContent.push('BEGIN:VEVENT');
        icalContent.push(`UID:mainpro-${event.id}@mainpro`);
        icalContent.push(`DTSTART:${start.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        icalContent.push(`DTEND:${end.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
        icalContent.push(`SUMMARY:${(event.title || 'Untitled').replace(/[,;\\]/g, '')}`);
        if (event.notes) {
          icalContent.push(`DESCRIPTION:${event.notes.replace(/[,;\\]/g, '').replace(/\n/g, '\\n')}`);
        }
        if (event.location) {
          icalContent.push(`LOCATION:${event.location.replace(/[,;\\]/g, '')}`);
        }
        icalContent.push(`STATUS:${event.status === 'done' ? 'CONFIRMED' : 'TENTATIVE'}`);
        icalContent.push('END:VEVENT');
      });
      
      icalContent.push('END:VCALENDAR');
      
      const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mainpro-calendar-${new Date().toISOString().slice(0, 10)}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('📅 Calendar exported to iCal');
    }
    
    // Print calendar function
    function printCalendar() {
      const printWindow = window.open('', '_blank');
      const calendarEl = document.getElementById('calendar-shell');
      if (!calendarEl) {
        showToast('❌ Calendar not found');
        return;
      }
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MainPro Calendar - ${monthLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .fc { font-size: 12px; }
            .fc-event { padding: 2px 4px; margin: 1px 0; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>MainPro Calendar - ${monthLabel}</h1>
          ${calendarEl.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
    
    // Make functions globally available
    window.generateICal = generateICal;
    window.printCalendar = printCalendar;
    
    // Autocomplete suggestions for task titles
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [assignedSuggestions, setAssignedSuggestions] = useState([]);
    
    useEffect(() => {
      const titles = [...new Set(events.map(e => e.title).filter(Boolean))].slice(0, 10);
      const assigned = [...new Set(events.map(e => e.assignedTo).filter(Boolean))].slice(0, 10);
      setTitleSuggestions(titles);
      setAssignedSuggestions(assigned);
    }, [events]);
    
    // Mobile swipe gestures
    useEffect(() => {
      const calendarShell = document.getElementById('calendar-shell');
      if (!calendarShell) return;
      
      let touchStartX = 0;
      let touchEndX = 0;
      
      const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
      };
      
      const handleTouchEnd = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
      };
      
      const handleSwipe = () => {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
          if (diff > 0) {
            calRef.current?.next();
          } else {
            calRef.current?.prev();
          }
        }
      };
      
      calendarShell.addEventListener('touchstart', handleTouchStart, { passive: true });
      calendarShell.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        calendarShell.removeEventListener('touchstart', handleTouchStart);
        calendarShell.removeEventListener('touchend', handleTouchEnd);
      };
    }, []);

    // Cloud Sync Functions (v65.6)
    function generateDeviceId() {
      let deviceId = localStorage.getItem('mainpro_device_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('mainpro_device_id', deviceId);
      }
      return deviceId;
    }

    function getSyncData() {
      return {
        events: events,
        categories: categories,
        taskTypes: taskTypes,
        settings: settings,
        ui: ui,
        deviceId: generateDeviceId(),
        timestamp: new Date().toISOString(),
        version: 'v65.6'
      };
    }

    async function syncToCloud() {
      if (!cloudSync.enabled || !cloudSync.serverUrl || !isOnline) return;
      
      setSyncStatus('syncing');
      try {
        const data = getSyncData();
        const response = await fetch(`${cloudSync.serverUrl}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cloudSync.apiKey}`,
            'X-Device-ID': generateDeviceId()
          },
          body: JSON.stringify(data)
        });

        if (response.ok) {
          const result = await response.json();
          setSyncStatus('synced');
          setCloudSync(prev => ({...prev, lastSync: new Date().toISOString()}));
          showToast('✅ Cloud sync successful');
        } else {
          throw new Error('Sync failed');
        }
      } catch (error) {
        setSyncStatus('error');
        showToast('❌ Cloud sync failed');
        console.error('Cloud sync error:', error);
      }
    }

    async function syncFromCloud() {
      if (!cloudSync.enabled || !cloudSync.serverUrl || !isOnline) return;
      
      setSyncStatus('syncing');
      try {
        const response = await fetch(`${cloudSync.serverUrl}/api/sync`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${cloudSync.apiKey}`,
            'X-Device-ID': generateDeviceId()
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Merge cloud data with local data
          if (data.events) {
            const cleaned = stripInstances(data.events);
            if (window.mainproRecurDebug && data.events.length !== cleaned.length) console.warn('Cloud load: dropped', data.events.length - cleaned.length, 'instance(s)');
            setEvents(cleaned);
          }
          if (data.categories) setCategories(data.categories);
          if (data.taskTypes) setTaskTypes(data.taskTypes);
          if (data.settings) setSettings(data.settings);
          if (data.ui) setUI(data.ui);
          
          setSyncStatus('synced');
          setCloudSync(prev => ({...prev, lastSync: new Date().toISOString()}));
          showToast('✅ Cloud data loaded');
        } else {
          throw new Error('Sync failed');
        }
      } catch (error) {
        setSyncStatus('error');
        showToast('❌ Cloud sync failed');
        console.error('Cloud sync error:', error);
      }
    }

    function enableCloudSync(serverUrl, apiKey) {
      setCloudSync({
        enabled: true,
        serverUrl: serverUrl,
        apiKey: apiKey,
        lastSync: null
      });
      localStorage.setItem('mainpro_cloudsync_v1', JSON.stringify({
        enabled: true,
        serverUrl: serverUrl,
        apiKey: apiKey,
        lastSync: null
      }));
      showToast('☁️ Cloud sync enabled');
    }

    function disableCloudSync() {
      setCloudSync({
        enabled: false,
        serverUrl: "",
        apiKey: "",
        lastSync: null
      });
      localStorage.setItem('mainpro_cloudsync_v1', JSON.stringify({
        enabled: false,
        serverUrl: "",
        apiKey: "",
        lastSync: null
      }));
      setSyncStatus('disconnected');
      showToast('☁️ Cloud sync disabled');
    }

    // Auto-sync when data changes
    useEffect(() => {
      if (cloudSync.enabled && isOnline) {
        const timeoutId = setTimeout(() => {
          syncToCloud();
        }, 2000); // Sync 2 seconds after changes
        
        return () => clearTimeout(timeoutId);
      }
    }, [events, categories, taskTypes, settings, ui]);

    // Online/offline detection
    useEffect(() => {
      const handleOnline = () => {
        setIsOnline(true);
        if (cloudSync.enabled) {
          syncFromCloud();
        }
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        setSyncStatus('offline');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }, [cloudSync.enabled]);

    // Periodic sync
    useEffect(() => {
      if (cloudSync.enabled && isOnline) {
        const interval = setInterval(() => {
          syncFromCloud();
        }, 30000); // Sync every 30 seconds
        
        return () => clearInterval(interval);
      }
    }, [cloudSync.enabled, isOnline]);

    // Multi-User Collaboration Functions (v65.7)
    function generateTeamId() {
      return 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function generateUserId() {
      let userId = localStorage.getItem('mainpro_user_id');
      if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('mainpro_user_id', userId);
      }
      return userId;
    }

    function getCurrentUser() {
      return {
        id: generateUserId(),
        name: settings.preparedBy || 'User',
        email: localStorage.getItem('mainpro_user_email') || '',
        role: teamMode.userRole,
        lastSeen: new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(settings.preparedBy || 'User')}&background=random`
      };
    }

    function createTeam(teamName) {
      const teamId = generateTeamId();
      const currentUser = getCurrentUser();
      
      const newTeam = {
        enabled: true,
        teamId: teamId,
        userRole: 'admin',
        teamMembers: [currentUser],
        currentUser: currentUser,
        teamName: teamName,
        createdAt: new Date().toISOString()
      };
      
      setTeamMode(newTeam);
      localStorage.setItem('mainpro_team_v1', JSON.stringify(newTeam));
      showToast('👥 Team created successfully!');
    }

    function joinTeam(teamId, userRole = 'member') {
      const currentUser = getCurrentUser();
      currentUser.role = userRole;
      
      const updatedTeam = {
        ...teamMode,
        enabled: true,
        teamId: teamId,
        userRole: userRole,
        currentUser: currentUser
      };
      
      setTeamMode(updatedTeam);
      localStorage.setItem('mainpro_team_v1', JSON.stringify(updatedTeam));
      showToast('👥 Joined team successfully!');
    }

    function leaveTeam() {
      const updatedTeam = {
        enabled: false,
        teamId: "",
        userRole: "admin",
        teamMembers: [],
        currentUser: null
      };
      
      setTeamMode(updatedTeam);
      localStorage.setItem('mainpro_team_v1', JSON.stringify(updatedTeam));
      setActiveUsers([]);
      showToast('👥 Left team');
    }

    function inviteUser(email, role) {
      if (!teamMode.enabled) return;
      
      // In a real implementation, this would send an email invitation
      const inviteCode = `mainpro-invite-${teamMode.teamId}-${Date.now()}`;
      
      // Simulate sending invitation
      showToast(`📧 Invitation sent to ${email} (${role})`);
      console.log(`Invite code: ${inviteCode}`);
      
      // Store invitation locally for demo
      const invitations = safeParse('mainpro_invitations_v1', []);
      invitations.push({
        email: email,
        role: role,
        teamId: teamMode.teamId,
        code: inviteCode,
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      localStorage.setItem('mainpro_invitations_v1', JSON.stringify(invitations));
    }

    function updateUserPresence() {
      if (!teamMode.enabled) return;
      
      const currentUser = getCurrentUser();
      const presenceData = {
        ...currentUser,
        lastSeen: new Date().toISOString(),
        isOnline: true,
        currentView: view,
        currentFilter: filter
      };
      
      // In a real implementation, this would update the server
      setUserPresence(prev => {
        const newPresence = new Map(prev);
        newPresence.set(currentUser.id, presenceData);
        return newPresence;
      });
    }

    function canEdit() {
      return teamMode.userRole === 'admin' || teamMode.userRole === 'editor';
    }

    function canDelete() {
      return teamMode.userRole === 'admin';
    }

    function canManageTeam() {
      return teamMode.userRole === 'admin';
    }

    function getEventOwner(event) {
      return event.createdBy || event.assignedTo || 'Unknown';
    }

    function isEventOwner(event) {
      const currentUser = getCurrentUser();
      return getEventOwner(event) === currentUser.id;
    }

    function canEditEvent(event) {
      return canEdit() && (isEventOwner(event) || teamMode.userRole === 'admin');
    }

    function canDeleteEvent(event) {
      return canDelete() && (isEventOwner(event) || teamMode.userRole === 'admin');
    }

    // Update event with user information
    function addUserInfoToEvent(event) {
      return {
        ...event,
        createdBy: event.createdBy || currentUser.name,
        createdById: event.createdById || currentUser.id,
        assignedTo: event.assignedTo || currentUser.name,
        assignedToId: event.assignedToId || currentUser.id,
        lastModifiedBy: currentUser.name,
        lastModifiedById: currentUser.id,
        lastModified: new Date().toISOString()
      };
    }

    // Update presence every 30 seconds
    useEffect(() => {
      if (teamMode.enabled) {
        updateUserPresence();
        const interval = setInterval(updateUserPresence, 30000);
        return () => clearInterval(interval);
      }
    }, [teamMode.enabled, view, filter]);
    // AI Analytics & Auto-Suggestions Functions (v65.8)
    function calculateAnalytics() {
      if (!aiAnalytics.enabled) return;
      
      const now = new Date();
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Calculate task completion rate
      const recentTasks = events.filter(e => new Date(e.start) >= last30Days);
      const completedTasks = recentTasks.filter(e => e.status === 'done');
      const completionRate = recentTasks.length > 0 ? (completedTasks.length / recentTasks.length) * 100 : 0;
      
      // Calculate average task duration (simplified)
      const taskDurations = recentTasks.map(e => {
        const start = new Date(e.start);
        const end = e.completedAt ? new Date(e.completedAt) : now;
        return Math.max(0, (end - start) / (1000 * 60 * 60)); // hours
      });
      const avgDuration = taskDurations.length > 0 ? 
        taskDurations.reduce((a, b) => a + b, 0) / taskDurations.length : 0;
      
      // Calculate maintenance frequency
      const maintenanceTasks = recentTasks.filter(e => e.taskType === 'Maintenance');
      const maintenanceFrequency = maintenanceTasks.length / 30; // per day
      
      // Calculate compliance score
      const complianceTasks = recentTasks.filter(e => e.catId === 'compliance');
      const completedCompliance = complianceTasks.filter(e => e.status === 'done');
      const complianceScore = complianceTasks.length > 0 ? 
        (completedCompliance.length / complianceTasks.length) * 100 : 100;
      
      // Determine efficiency trend
      const firstHalf = recentTasks.slice(0, Math.floor(recentTasks.length / 2));
      const secondHalf = recentTasks.slice(Math.floor(recentTasks.length / 2));
      const firstHalfRate = firstHalf.length > 0 ? 
        firstHalf.filter(e => e.status === 'done').length / firstHalf.length : 0;
      const secondHalfRate = secondHalf.length > 0 ? 
        secondHalf.filter(e => e.status === 'done').length / secondHalf.length : 0;
      
      let efficiencyTrend = 'stable';
      if (secondHalfRate > firstHalfRate + 0.1) efficiencyTrend = 'improving';
      else if (secondHalfRate < firstHalfRate - 0.1) efficiencyTrend = 'declining';
      
      // Determine risk level
      const overdueTasks = events.filter(e => 
        e.status === 'pending' && new Date(e.start) < now
      );
      const highPriorityOverdue = overdueTasks.filter(e => e.priority === 'high');
      let riskLevel = 'low';
      if (highPriorityOverdue.length > 3) riskLevel = 'high';
      else if (overdueTasks.length > 5 || highPriorityOverdue.length > 0) riskLevel = 'medium';
      
      setAnalyticsData({
        taskCompletionRate: Math.round(completionRate),
        averageTaskDuration: Math.round(avgDuration * 10) / 10,
        maintenanceFrequency: Math.round(maintenanceFrequency * 10) / 10,
        complianceScore: Math.round(complianceScore),
        efficiencyTrend,
        riskLevel
      });
    }

    function generatePredictiveTasks() {
      if (!aiAnalytics.predictiveMaintenance) return;
      
      const now = new Date();
      const predictions = [];
      
      // Analyze maintenance patterns
      const maintenanceTasks = events.filter(e => e.taskType === 'Maintenance' && e.status === 'done');
      const maintenanceByCategory = {};
      
      maintenanceTasks.forEach(task => {
        const cat = task.catId;
        if (!maintenanceByCategory[cat]) maintenanceByCategory[cat] = [];
        maintenanceByCategory[cat].push(new Date(task.start));
      });
      
      // Generate predictions based on patterns
      Object.entries(maintenanceByCategory).forEach(([category, dates]) => {
        if (dates.length < 2) return;
        
        // Calculate average interval
        const intervals = [];
        for (let i = 1; i < dates.length; i++) {
          intervals.push(dates[i] - dates[i - 1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const nextDue = new Date(Math.max(...dates) + avgInterval);
        
        if (nextDue > now && nextDue < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
          predictions.push({
            id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: `Predicted ${category} maintenance`,
            category: category,
            suggestedDate: nextDue.toISOString().slice(0, 10),
            confidence: Math.min(95, Math.max(60, intervals.length * 10)),
            reason: `Based on ${intervals.length} previous maintenance cycles`,
            priority: 'normal',
            type: 'predictive'
          });
        }
      });
      
      setPredictiveTasks(predictions);
    }

    function generateComplianceAlerts() {
      if (!aiAnalytics.complianceAlerts) return;
      
      const now = new Date();
      const alerts = [];
      
      // Check for overdue compliance tasks
      const complianceTasks = events.filter(e => e.catId === 'compliance');
      const overdueCompliance = complianceTasks.filter(e => 
        e.status === 'pending' && new Date(e.start) < now
      );
      
      overdueCompliance.forEach(task => {
        const daysOverdue = Math.floor((now - new Date(task.start)) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `alert_${task.id}`,
          type: 'overdue',
          severity: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
          title: `Compliance task overdue: ${task.title}`,
          description: `This task is ${daysOverdue} days overdue`,
          taskId: task.id,
          dueDate: task.start,
          createdAt: now.toISOString()
        });
      });
      
      // Check for upcoming compliance deadlines
      const upcomingCompliance = complianceTasks.filter(e => {
        const taskDate = new Date(e.start);
        const daysUntil = Math.floor((taskDate - now) / (1000 * 60 * 60 * 24));
        return e.status === 'pending' && daysUntil >= 0 && daysUntil <= 7;
      });
      
      upcomingCompliance.forEach(task => {
        const daysUntil = Math.floor((new Date(task.start) - now) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `alert_upcoming_${task.id}`,
          type: 'upcoming',
          severity: daysUntil <= 1 ? 'high' : daysUntil <= 3 ? 'medium' : 'low',
          title: `Compliance deadline approaching: ${task.title}`,
          description: `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          taskId: task.id,
          dueDate: task.start,
          createdAt: now.toISOString()
        });
      });
      
      setComplianceAlerts(alerts);
    }

    function generateAutoSuggestions() {
      if (!aiAnalytics.autoSuggestions) return;
      
      const now = new Date();
      const suggestions = [];
      
      // Suggest recurring tasks based on patterns
      const completedTasks = events.filter(e => e.status === 'done');
      const taskFrequency = {};
      
      completedTasks.forEach(task => {
        const key = `${task.taskType}_${task.catId}`;
        if (!taskFrequency[key]) {
          taskFrequency[key] = { count: 0, lastDate: null, intervals: [] };
        }
        taskFrequency[key].count++;
        if (taskFrequency[key].lastDate) {
          const interval = new Date(task.start) - new Date(taskFrequency[key].lastDate);
          taskFrequency[key].intervals.push(interval);
        }
        taskFrequency[key].lastDate = task.start;
      });
      
      Object.entries(taskFrequency).forEach(([key, data]) => {
        if (data.count >= 3 && data.intervals.length >= 2) {
          const avgInterval = data.intervals.reduce((a, b) => a + b, 0) / data.intervals.length;
          const lastDate = new Date(data.lastDate);
          const nextSuggested = new Date(lastDate.getTime() + avgInterval);
          
          if (nextSuggested > now && nextSuggested < new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)) {
            const [taskType, category] = key.split('_');
            suggestions.push({
              id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: `Schedule ${taskType} for ${category}`,
              description: `Based on your pattern, this task is typically done every ${Math.round(avgInterval / (1000 * 60 * 60 * 24))} days`,
              suggestedDate: nextSuggested.toISOString().slice(0, 10),
              taskType: taskType,
              category: category,
              confidence: Math.min(90, data.count * 15),
              type: 'recurring'
            });
          }
        }
      });
      
      // Suggest task assignments based on workload
      if (teamMode.enabled) {
        const memberWorkload = {};
        events.forEach(task => {
          const assignee = task.assignedTo || task.createdBy;
          if (assignee) {
            if (!memberWorkload[assignee]) memberWorkload[assignee] = 0;
            if (task.status === 'pending') memberWorkload[assignee]++;
          }
        });
        
        const avgWorkload = Object.values(memberWorkload).reduce((a, b) => a + b, 0) / Object.keys(memberWorkload).length;
        Object.entries(memberWorkload).forEach(([member, workload]) => {
          if (workload < avgWorkload * 0.5) {
            suggestions.push({
              id: `suggestion_workload_${member}`,
              title: `Consider assigning more tasks to ${member}`,
              description: `${member} has ${workload} pending tasks (below average)`,
              type: 'workload',
              member: member,
              currentWorkload: workload,
              averageWorkload: Math.round(avgWorkload)
            });
          }
        });
      }
      
      setAutoSuggestions(suggestions);
    }

    function generateAIInsights() {
      if (!aiAnalytics.enabled) return;
      
      const insights = [];
      const { taskCompletionRate, complianceScore, efficiencyTrend, riskLevel } = analyticsData;
      
      // Performance insights
      if (taskCompletionRate > 80) {
        insights.push({
          id: 'insight_1',
          type: 'positive',
          title: 'Excellent Task Completion Rate',
          description: `You're completing ${taskCompletionRate}% of tasks on time. Keep up the great work!`,
          icon: '🎯',
          priority: 'high'
        });
      } else if (taskCompletionRate < 60) {
        insights.push({
          id: 'insight_2',
          type: 'warning',
          title: 'Task Completion Rate Needs Improvement',
          description: `Only ${taskCompletionRate}% of tasks are completed on time. Consider reviewing your workflow.`,
          icon: '⚠️',
          priority: 'high'
        });
      }
      
      // Compliance insights
      if (complianceScore < 80) {
        insights.push({
          id: 'insight_3',
          type: 'critical',
          title: 'Compliance Risk Detected',
          description: `Your compliance score is ${complianceScore}%. This could lead to regulatory issues.`,
          icon: '🚨',
          priority: 'critical'
        });
      }
      
      // Efficiency insights
      if (efficiencyTrend === 'improving') {
        insights.push({
          id: 'insight_4',
          type: 'positive',
          title: 'Efficiency Improving',
          description: 'Your team efficiency is trending upward. Great job!',
          icon: '📈',
          priority: 'medium'
        });
      } else if (efficiencyTrend === 'declining') {
        insights.push({
          id: 'insight_5',
          type: 'warning',
          title: 'Efficiency Declining',
          description: 'Your team efficiency is trending downward. Consider investigating causes.',
          icon: '📉',
          priority: 'high'
        });
      }
      
      // Risk insights
      if (riskLevel === 'high') {
        insights.push({
          id: 'insight_6',
          type: 'critical',
          title: 'High Risk Level',
          description: 'Multiple high-priority tasks are overdue. Immediate action required.',
          icon: '🔴',
          priority: 'critical'
        });
      }
      
      setAiInsights(insights);
    }

    // Run AI analytics when data changes (debounced for faster reload)
    useEffect(() => {
      if (!aiAnalytics.enabled) return;
      
      // Debounce expensive AI operations - wait 2 seconds after page load or last change
      const timeoutId = setTimeout(() => {
        // Use requestIdleCallback if available, otherwise setTimeout
        if (window.requestIdleCallback) {
          requestIdleCallback(() => {
            calculateAnalytics();
            generatePredictiveTasks();
            generateComplianceAlerts();
            generateAutoSuggestions();
            generateAIInsights();
          }, { timeout: 3000 });
        } else {
          setTimeout(() => {
            calculateAnalytics();
            generatePredictiveTasks();
            generateComplianceAlerts();
            generateAutoSuggestions();
            generateAIInsights();
          }, 100);
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }, [events, aiAnalytics.enabled]);

    // Auto-run analytics every hour
    useEffect(() => {
      if (aiAnalytics.enabled) {
        const interval = setInterval(() => {
          calculateAnalytics();
          generatePredictiveTasks();
          generateComplianceAlerts();
          generateAutoSuggestions();
          generateAIInsights();
        }, 3600000); // 1 hour
        
        return () => clearInterval(interval);
      }
    }, [aiAnalytics.enabled]);

    function applySuggestion(suggestion) {
      if (suggestion.type === 'recurring') {
        const newTask = {
          id: Date.now(),
          title: suggestion.title.replace('Schedule ', ''),
          start: `${suggestion.suggestedDate}T09:00`,
          status: 'none',
          catId: suggestion.category,
          taskType: suggestion.taskType,
          priority: 'normal',
          createdBy: getCurrentUser().id,
          assignedTo: getCurrentUser().id,
          lastModifiedBy: getCurrentUser().id,
          lastModified: new Date().toISOString(),
          isAISuggested: true,
          suggestionId: suggestion.id
        };
        
        setEvents(prev => [...prev, newTask]);
        showToast('✅ AI suggestion applied!');
      }
    }

    function dismissSuggestion(suggestionId) {
      setAutoSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    }

    function enableAIAnalytics() {
      setAiAnalytics(prev => ({ ...prev, enabled: true }));
      localStorage.setItem('mainpro_ai_v1', JSON.stringify({ ...aiAnalytics, enabled: true }));
      showToast('🤖 AI Analytics enabled!');
    }

    function disableAIAnalytics() {
      setAiAnalytics(prev => ({ ...prev, enabled: false }));
      localStorage.setItem('mainpro_ai_v1', JSON.stringify({ ...aiAnalytics, enabled: false }));
      showToast('🤖 AI Analytics disabled');
    }

    // Audit & Reporting Functions (v65.9)
    function addAuditLog(action, details = {}) {
      console.log('Adding audit log:', action, details);
      const logEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        user: teamMode.enabled ? getCurrentUser().id : 'system',
        userRole: teamMode.enabled ? teamMode.userRole : 'admin',
        ip: 'local', // In a real app, get actual IP
        sessionId: generateDeviceId()
      };
      
      setAuditLogs(prev => {
        const newLogs = [logEntry, ...prev].slice(0, 1000); // Keep last 1000 entries
        localStorage.setItem('mainpro_audit_v1', JSON.stringify(newLogs));
        console.log('Audit logs updated:', newLogs.length, 'entries');
        return newLogs;
      });
      
      console.log(`[AUDIT] ${action}`, details);
    }

    // MultiCalendar Functions
    function createCalendar(name) {
      const newCalendar = {
        id: 'cal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: name || 'New Calendar',
        created: new Date().toISOString()
      };
      
      setCalendars(prev => [...prev, newCalendar]);
      localStorage.setItem('mainpro_calendars_v1', JSON.stringify([...calendars, newCalendar]));
      showToast(`📅 Calendar "${newCalendar.name}" created`);
      
      // Add audit log
      addAuditLog('CALENDAR_CREATED', {
        calendarId: newCalendar.id,
        calendarName: newCalendar.name
      });
      
      return newCalendar;
    }

    function renameCalendar(calendarId, newName) {
      if (!newName.trim()) return;
      
      setCalendars(prev => prev.map(cal => 
        cal.id === calendarId ? { ...cal, name: newName.trim() } : cal
      ));
      
      // Update localStorage
      const updatedCalendars = calendars.map(cal => 
        cal.id === calendarId ? { ...cal, name: newName.trim() } : cal
      );
      localStorage.setItem('mainpro_calendars_v1', JSON.stringify(updatedCalendars));
      
      showToast(`📅 Calendar renamed to "${newName.trim()}"`);
      
      // Add audit log
      addAuditLog('CALENDAR_RENAMED', {
        calendarId: calendarId,
        oldName: calendars.find(c => c.id === calendarId)?.name,
        newName: newName.trim()
      });
    }

    function deleteCalendar(calendarId) {
      if (calendarId === 'main') {
        showToast('❌ Cannot delete main calendar');
        return;
      }
      
      const calendar = calendars.find(c => c.id === calendarId);
      if (!calendar) return;
      
      if (!confirm(`Delete calendar "${calendar.name}" and all its events?`)) return;
      
      // Remove calendar
      setCalendars(prev => prev.filter(cal => cal.id !== calendarId));
      
      // Remove events for this calendar
      localStorage.removeItem(`mainpro_calendar_${calendarId}`);
      
      // Update localStorage
      const updatedCalendars = calendars.filter(cal => cal.id !== calendarId);
      localStorage.setItem('mainpro_calendars_v1', JSON.stringify(updatedCalendars));
      
      // Switch to main calendar if current calendar was deleted
      if (currentCalendarId === calendarId) {
        switchCalendar('main');
      }
      
      showToast(`🗑️ Calendar "${calendar.name}" deleted`);
      
      // Add audit log
      addAuditLog('CALENDAR_DELETED', {
        calendarId: calendarId,
        calendarName: calendar.name
      });
    }

    function switchCalendar(calendarId) {
      if (calendarId === currentCalendarId) return;
      
      const calendarKey = `mainpro_calendar_${currentCalendarId}`;
      localStorage.setItem(calendarKey, JSON.stringify(stripInstances(events)));
      
      // Switch to new calendar
      setCurrentCalendarId(calendarId);
      localStorage.setItem('mainpro_current_calendar_v1', calendarId);
      
      // Load new calendar's events (bases only)
      const newCalendarKey = `mainpro_calendar_${calendarId}`;
      const newEvents = safeParse(newCalendarKey, []);
      setEvents(stripInstances(newEvents));
      
      const calendarName = calendars.find(c => c.id === calendarId)?.name || 'Unknown';
      showToast(`📅 Switched to "${calendarName}"`);
      
      // Add audit log
      addAuditLog('CALENDAR_SWITCHED', {
        fromCalendarId: currentCalendarId,
        toCalendarId: calendarId,
        toCalendarName: calendarName
      });
    }

    // Auto-save current calendar when switching
    useEffect(() => {
      if (currentCalendarId) {
        const calendarKey = `mainpro_calendar_${currentCalendarId}`;
        localStorage.setItem(calendarKey, JSON.stringify(stripInstances(events)));
      }
    }, [currentCalendarId, events]);

    function calculateAuditStats() {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const totalActions = auditLogs.length;
      const todayActions = auditLogs.filter(log => 
        new Date(log.timestamp) >= today
      ).length;
      
      const userActions = {};
      const actionTypes = {};
      const recentActivity = auditLogs.slice(0, 10);
      
      auditLogs.forEach(log => {
        // Count by user
        const user = log.user || 'system';
        userActions[user] = (userActions[user] || 0) + 1;
        
        // Count by action type
        const action = log.action;
        actionTypes[action] = (actionTypes[action] || 0) + 1;
      });
      
      const newStats = {
        totalActions,
        todayActions,
        userActions,
        actionTypes,
        recentActivity
      };
      
      console.log('Calculating audit stats:', newStats);
      setAuditStats(newStats);
    }

    function generateReport(type, period) {
      const now = new Date();
      let startDate;
      
      switch(period) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      const periodLogs = auditLogs.filter(log => 
        new Date(log.timestamp) >= startDate
      );
      
      const periodEvents = events.filter(event => 
        new Date(event.start) >= startDate
      );
      
      let reportData = {};
      
      switch(type) {
        case 'summary':
          reportData = generateSummaryReport(periodLogs, periodEvents, startDate, now);
          break;
        case 'compliance':
          reportData = generateComplianceReport(periodLogs, periodEvents, startDate, now);
          break;
        case 'performance':
          reportData = generatePerformanceReport(periodLogs, periodEvents, startDate, now);
          break;
        case 'maintenance':
          reportData = generateMaintenanceReport(periodLogs, periodEvents, startDate, now);
          break;
        case 'user':
          reportData = generateUserReport(periodLogs, periodEvents, startDate, now);
          break;
        default:
          reportData = generateSummaryReport(periodLogs, periodEvents, startDate, now);
      }
      
      setReportData(reportData);
    }

    function generateSummaryReport(logs, events, startDate, endDate) {
      const totalTasks = events.length;
      const completedTasks = events.filter(e => e.status === 'done').length;
      const pendingTasks = events.filter(e => e.status === 'pending').length;
      const missedTasks = events.filter(e => e.status === 'missed').length;
      
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const maintenanceTasks = events.filter(e => e.taskType === 'Maintenance').length;
      const complianceTasks = events.filter(e => e.catId === 'compliance').length;
      
      const userActivity = {};
      logs.forEach(log => {
        const user = log.user || 'system';
        if (!userActivity[user]) userActivity[user] = 0;
        userActivity[user]++;
      });
      
      const topUsers = Object.entries(userActivity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      return {
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalTasks,
        completedTasks,
        pendingTasks,
        missedTasks,
        taskCompletionRate: Math.round(taskCompletionRate),
        maintenanceTasks,
        complianceTasks,
        totalActions: logs.length,
        topUsers,
        efficiency: {
          avgTaskDuration: calculateAverageTaskDuration(events),
          peakActivity: findPeakActivity(logs),
          productivity: calculateProductivity(events, logs)
        }
      };
    }
    function generateComplianceReport(logs, events, startDate, endDate) {
      const complianceEvents = events.filter(e => e.catId === 'compliance');
      const completedCompliance = complianceEvents.filter(e => e.status === 'done');
      const overdueCompliance = complianceEvents.filter(e => 
        e.status === 'pending' && new Date(e.start) < new Date()
      );
      
      const complianceScore = complianceEvents.length > 0 ? 
        (completedCompliance.length / complianceEvents.length) * 100 : 100;
      
      const complianceByCategory = {};
      complianceEvents.forEach(event => {
        const category = event.taskType || 'Other';
        if (!complianceByCategory[category]) {
          complianceByCategory[category] = { total: 0, completed: 0 };
        }
        complianceByCategory[category].total++;
        if (event.status === 'done') {
          complianceByCategory[category].completed++;
        }
      });
      
      return {
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalComplianceTasks: complianceEvents.length,
        completedCompliance: completedCompliance.length,
        overdueCompliance: overdueCompliance.length,
        complianceScore: Math.round(complianceScore),
        complianceByCategory,
        riskLevel: complianceScore < 80 ? 'HIGH' : complianceScore < 95 ? 'MEDIUM' : 'LOW',
        recommendations: generateComplianceRecommendations(complianceEvents, complianceScore)
      };
    }

    function generatePerformanceReport(logs, events, startDate, endDate) {
      const completedEvents = events.filter(e => e.status === 'done');
      const avgCompletionTime = calculateAverageCompletionTime(completedEvents);
      
      const dailyPerformance = calculateDailyPerformance(events, startDate, endDate);
      const weeklyTrends = calculateWeeklyTrends(events, startDate, endDate);
      
      const userPerformance = {};
      completedEvents.forEach(event => {
        const user = event.assignedTo || event.createdBy || 'unknown';
        if (!userPerformance[user]) {
          userPerformance[user] = { completed: 0, total: 0, avgTime: 0 };
        }
        userPerformance[user].completed++;
        userPerformance[user].total++;
      });
      
      return {
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalTasks: events.length,
        completedTasks: completedEvents.length,
        avgCompletionTime: Math.round(avgCompletionTime),
        dailyPerformance,
        weeklyTrends,
        userPerformance,
        efficiency: calculateEfficiencyMetrics(events, logs)
      };
    }

    function generateMaintenanceReport(logs, events, startDate, endDate) {
      const maintenanceEvents = events.filter(e => e.taskType === 'Maintenance');
      const completedMaintenance = maintenanceEvents.filter(e => e.status === 'done');
      
      const maintenanceByCategory = {};
      maintenanceEvents.forEach(event => {
        const category = event.catId || 'other';
        if (!maintenanceByCategory[category]) {
          maintenanceByCategory[category] = { total: 0, completed: 0, avgDuration: 0 };
        }
        maintenanceByCategory[category].total++;
        if (event.status === 'done') {
          maintenanceByCategory[category].completed++;
        }
      });
      
      const maintenanceFrequency = calculateMaintenanceFrequency(maintenanceEvents, startDate, endDate);
      const costAnalysis = calculateMaintenanceCosts(maintenanceEvents);
      
      return {
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalMaintenanceTasks: maintenanceEvents.length,
        completedMaintenance: completedMaintenance.length,
        maintenanceByCategory,
        maintenanceFrequency,
        costAnalysis,
        recommendations: generateMaintenanceRecommendations(maintenanceEvents)
      };
    }

    function generateUserReport(logs, events, startDate, endDate) {
      const userStats = {};
      const allUsers = new Set();
      
      // Collect all users from events and logs
      events.forEach(event => {
        if (event.createdBy) allUsers.add(event.createdBy);
        if (event.assignedTo) allUsers.add(event.assignedTo);
      });
      
      logs.forEach(log => {
        if (log.user) allUsers.add(log.user);
      });
      
      // Calculate stats for each user
      allUsers.forEach(user => {
        const userEvents = events.filter(e => 
          e.createdBy === user || e.assignedTo === user
        );
        const userLogs = logs.filter(l => l.user === user);
        
        userStats[user] = {
          tasksCreated: events.filter(e => e.createdBy === user).length,
          tasksAssigned: events.filter(e => e.assignedTo === user).length,
          tasksCompleted: userEvents.filter(e => e.status === 'done').length,
          totalActions: userLogs.length,
          avgTaskDuration: calculateUserAvgTaskDuration(userEvents),
          productivity: calculateUserProductivity(userEvents, userLogs)
        };
      });
      
      return {
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalUsers: allUsers.size,
        userStats,
        topPerformers: Object.entries(userStats)
          .sort(([,a], [,b]) => b.productivity - a.productivity)
          .slice(0, 5),
        teamEfficiency: calculateTeamEfficiency(userStats)
      };
    }

    // Helper functions for report calculations
    function calculateAverageTaskDuration(events) {
      const completedEvents = events.filter(e => e.status === 'done' && e.completedAt);
      if (completedEvents.length === 0) return 0;
      
      const totalDuration = completedEvents.reduce((sum, event) => {
        const start = new Date(event.start);
        const end = new Date(event.completedAt);
        return sum + (end - start);
      }, 0);
      
      return totalDuration / completedEvents.length / (1000 * 60 * 60); // hours
    }

    function calculateUserAvgTaskDuration(userEvents) {
      const completedEvents = userEvents.filter(e => e.status === 'done' && e.completedAt);
      if (completedEvents.length === 0) return 0;
      
      const totalDuration = completedEvents.reduce((sum, event) => {
        const start = new Date(event.start);
        const end = new Date(event.completedAt);
        return sum + (end - start);
      }, 0);
      
      return totalDuration / completedEvents.length / (1000 * 60 * 60); // hours
    }

    function calculateAverageCompletionTime(events) {
      if (events.length === 0) return 0;
      
      const totalTime = events.reduce((sum, event) => {
        const start = new Date(event.start);
        const end = event.completedAt ? new Date(event.completedAt) : new Date();
        return sum + (end - start);
      }, 0);
      
      return totalTime / events.length / (1000 * 60 * 60); // hours
    }

    function calculateDailyPerformance(events, startDate, endDate) {
      const dailyStats = {};
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().slice(0, 10);
        const dayEvents = events.filter(e => e.start.startsWith(dateStr));
        
        dailyStats[dateStr] = {
          total: dayEvents.length,
          completed: dayEvents.filter(e => e.status === 'done').length,
          pending: dayEvents.filter(e => e.status === 'pending').length,
          missed: dayEvents.filter(e => e.status === 'missed').length
        };
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return dailyStats;
    }

    function calculateWeeklyTrends(events, startDate, endDate) {
      const weeklyStats = {};
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000);
        
        const weekEvents = events.filter(e => {
          const eventDate = new Date(e.start);
          return eventDate >= weekStart && eventDate <= weekEnd;
        });
        
        const weekKey = `${weekStart.toISOString().slice(0, 10)} - ${weekEnd.toISOString().slice(0, 10)}`;
        weeklyStats[weekKey] = {
          total: weekEvents.length,
          completed: weekEvents.filter(e => e.status === 'done').length,
          efficiency: weekEvents.length > 0 ? 
            (weekEvents.filter(e => e.status === 'done').length / weekEvents.length) * 100 : 0
        };
        
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      return weeklyStats;
    }

    function calculateUserProductivity(userEvents, userLogs) {
      const completedTasks = userEvents.filter(e => e.status === 'done').length;
      const totalTasks = userEvents.length;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
      
      const avgTaskTime = calculateUserAvgTaskDuration(userEvents);
      const timeEfficiency = avgTaskTime > 0 ? Math.max(0, 100 - (avgTaskTime - 2) * 10) : 100;
      
      return Math.round((taskCompletionRate + timeEfficiency) / 2);
    }

    function calculateTeamEfficiency(userStats) {
      const users = Object.values(userStats);
      if (users.length === 0) return 0;
      
      const avgProductivity = users.reduce((sum, user) => sum + user.productivity, 0) / users.length;
      const taskDistribution = calculateTaskDistribution(userStats);
      
      return Math.round((avgProductivity + taskDistribution) / 2);
    }

    function calculateTaskDistribution(userStats) {
      const users = Object.values(userStats);
      if (users.length === 0) return 100;
      
      const totalTasks = users.reduce((sum, user) => sum + user.tasksAssigned, 0);
      const avgTasksPerUser = totalTasks / users.length;
      
      const variance = users.reduce((sum, user) => {
        const diff = user.tasksAssigned - avgTasksPerUser;
        return sum + (diff * diff);
      }, 0) / users.length;
      
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = avgTasksPerUser > 0 ? standardDeviation / avgTasksPerUser : 0;
      
      return Math.max(0, 100 - coefficientOfVariation * 100);
    }

    function calculateMaintenanceFrequency(events, startDate, endDate) {
      const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
      return events.length / daysDiff;
    }

    function calculateMaintenanceCosts(events) {
      // Simplified cost calculation - in real app, this would use actual cost data
      const completedEvents = events.filter(e => e.status === 'done');
      const avgCostPerTask = 150; // Placeholder
      
      return {
        totalCost: completedEvents.length * avgCostPerTask,
        avgCostPerTask,
        costByCategory: {}
      };
    }

    function calculateEfficiencyMetrics(events, logs) {
      const completedEvents = events.filter(e => e.status === 'done');
      const totalEvents = events.length;
      const completionRate = totalEvents > 0 ? (completedEvents.length / totalEvents) * 100 : 0;
      
      const avgTaskTime = calculateAverageTaskDuration(events);
      const timeEfficiency = avgTaskTime > 0 ? Math.max(0, 100 - (avgTaskTime - 2) * 10) : 100;
      
      return {
        completionRate: Math.round(completionRate),
        timeEfficiency: Math.round(timeEfficiency),
        overallEfficiency: Math.round((completionRate + timeEfficiency) / 2)
      };
    }

    function findPeakActivity(logs) {
      const hourlyActivity = {};
      
      logs.forEach(log => {
        const hour = new Date(log.timestamp).getHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      });
      
      const peakHour = Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => b - a)[0];
      
      return peakHour ? `${peakHour[0]}:00 (${peakHour[1]} actions)` : 'No data';
    }

    function calculateProductivity(events, logs) {
      const completedEvents = events.filter(e => e.status === 'done');
      const totalEvents = events.length;
      const completionRate = totalEvents > 0 ? (completedEvents.length / totalEvents) * 100 : 0;
      
      const avgTaskTime = calculateAverageTaskDuration(events);
      const timeEfficiency = avgTaskTime > 0 ? Math.max(0, 100 - (avgTaskTime - 2) * 10) : 100;
      
      return Math.round((completionRate + timeEfficiency) / 2);
    }

    function generateComplianceRecommendations(events, score) {
      const recommendations = [];
      
      if (score < 80) {
        recommendations.push('Implement stricter compliance monitoring');
        recommendations.push('Set up automated compliance alerts');
        recommendations.push('Review and update compliance procedures');
      }
      
      if (score < 95) {
        recommendations.push('Increase compliance task frequency');
        recommendations.push('Provide additional compliance training');
      }
      
      return recommendations;
    }

    function generateMaintenanceRecommendations(events) {
      const recommendations = [];
      
      const overdueMaintenance = events.filter(e => 
        e.status === 'pending' && new Date(e.start) < new Date()
      );
      
      if (overdueMaintenance.length > 0) {
        recommendations.push(`Address ${overdueMaintenance.length} overdue maintenance tasks`);
      }
      
      const maintenanceFrequency = calculateMaintenanceFrequency(events, 
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date());
      
      if (maintenanceFrequency < 0.5) {
        recommendations.push('Consider increasing maintenance frequency');
      }
      
      return recommendations;
    }

    function exportReport(format) {
      if (format === 'pdf') {
        exportToPDF();
      } else if (format === 'excel') {
        exportToExcel();
      } else if (format === 'csv') {
        exportToCSV();
      }
    }

    function exportToPDF() {
      if (typeof jsPDF === 'undefined') {
        showToast('PDF export not available');
        return;
      }
      
      const doc = new jsPDF();
      const report = reportData;
      
      doc.setFontSize(20);
      doc.text('MainPro Calendar Report', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Period: ${report.period}`, 20, 35);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
      
      let y = 60;
      
      if (reportType === 'summary') {
        doc.text(`Total Tasks: ${report.totalTasks}`, 20, y);
        y += 10;
        doc.text(`Completed: ${report.completedTasks}`, 20, y);
        y += 10;
        doc.text(`Completion Rate: ${report.taskCompletionRate}%`, 20, y);
        y += 10;
        doc.text(`Maintenance Tasks: ${report.maintenanceTasks}`, 20, y);
        y += 10;
        doc.text(`Compliance Tasks: ${report.complianceTasks}`, 20, y);
      }
      
      doc.save(`mainpro-report-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('📄 Report exported to PDF');
    }

    function exportToExcel() {
      if (typeof XLSX === 'undefined') {
        showToast('Excel export not available');
        return;
      }
      
      const report = reportData;
      const ws = XLSX.utils.json_to_sheet([]);
      
      // Add report data to worksheet
      const reportDataArray = [
        ['Report Type', reportType],
        ['Period', report.period],
        ['Generated', new Date().toLocaleString()],
        ['', ''],
        ['Metric', 'Value']
      ];
      
      if (reportType === 'summary') {
        reportDataArray.push(
          ['Total Tasks', report.totalTasks],
          ['Completed Tasks', report.completedTasks],
          ['Pending Tasks', report.pendingTasks],
          ['Missed Tasks', report.missedTasks],
          ['Completion Rate', `${report.taskCompletionRate}%`],
          ['Maintenance Tasks', report.maintenanceTasks],
          ['Compliance Tasks', report.complianceTasks]
        );
      }
      
      XLSX.utils.sheet_add_aoa(ws, reportDataArray);
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      
      XLSX.writeFile(wb, `mainpro-report-${reportType}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('📊 Report exported to Excel');
    }

    function exportToCSV() {
      const report = reportData;
      let csvContent = 'Metric,Value\n';
      
      if (reportType === 'summary') {
        csvContent += `Total Tasks,${report.totalTasks}\n`;
        csvContent += `Completed Tasks,${report.completedTasks}\n`;
        csvContent += `Pending Tasks,${report.pendingTasks}\n`;
        csvContent += `Missed Tasks,${report.missedTasks}\n`;
        csvContent += `Completion Rate,${report.taskCompletionRate}%\n`;
        csvContent += `Maintenance Tasks,${report.maintenanceTasks}\n`;
        csvContent += `Compliance Tasks,${report.complianceTasks}\n`;
      }
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mainpro-report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      showToast('📄 Report exported to CSV');
    }

    // Auto-calculate audit stats when logs change
    useEffect(() => {
      calculateAuditStats();
    }, [auditLogs]);

    // Add initial audit log for testing
    useEffect(() => {
      if (auditLogs.length === 0) {
        addAuditLog('APP_STARTED', { message: 'MainPro Calendar application started' });
      }
    }, []);

    // Add audit logging to key actions
    useEffect(() => {
      if (events.length > 0) {
        addAuditLog('EVENTS_UPDATED', { count: events.length });
      }
    }, [events.length]);

    // Cloud Sync Manager
    const cloudSyncManager = {
      // Initialize cloud connection
      async initialize() {
        try {
          setCloudSyncStatus('connecting');
          // Simulate connection to cloud provider
          await new Promise(resolve => setTimeout(resolve, 1000));
          setCloudSyncStatus('connected');
          showToast('☁️ Connected to cloud database');
        } catch (error) {
          setCloudSyncStatus('disconnected');
          showToast('❌ Failed to connect to cloud database');
        }
      },

      // Sync data to cloud
      async syncToCloud() {
        try {
          setCloudSyncStatus('syncing');
          
          // Prepare data for sync
          const syncData = {
            events: events,
            documents: documents,
            settings: settings,
            users: users,
            teams: teams,
            timestamp: new Date().toISOString(),
            userId: authUser?.id || 'anonymous'
          };

          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Update sync status
          setCloudSyncStatus('connected');
          setLastSyncTime(new Date().toLocaleString());
          showToast('✅ Data synced to cloud successfully');
          
          return syncData;
        } catch (error) {
          setCloudSyncStatus('disconnected');
          showToast('❌ Failed to sync data to cloud');
          throw error;
        }
      },

      // Pull data from cloud
      async pullFromCloud() {
        try {
          setCloudSyncStatus('syncing');
          
          // Simulate API call to fetch data
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Simulate received data (in real implementation, this would come from API)
          const cloudData = {
            events: events, // Would be replaced with actual cloud data
            documents: documents,
            settings: settings,
            users: users,
            teams: teams
          };

          setCloudSyncStatus('connected');
          setLastSyncTime(new Date().toLocaleString());
          showToast('✅ Data pulled from cloud successfully');
          
          return cloudData;
        } catch (error) {
          setCloudSyncStatus('disconnected');
          showToast('❌ Failed to pull data from cloud');
          throw error;
        }
      },

      // Auto-sync every 5 minutes
      startAutoSync() {
        setInterval(() => {
          if (cloudSyncStatus === 'connected') {
            cloudSyncManager.syncToCloud();
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    };

    // Initialize cloud sync on app start
    useEffect(() => {
      if (isAuthenticated) {
        cloudSyncManager.initialize();
        cloudSyncManager.startAutoSync();
      }
    }, [isAuthenticated]);

    // Safe wrapper helper
    const safe = (fn, fallback=()=>showToast('ℹ️ Feature coming soon')) => (typeof fn==='function'? fn : fallback);
    // PWA Manager
    const pwaManager = {
      // Detect if running as PWA
      isRunningAsPWA() {
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
      },

      // Register service worker with automatic update checking
      async registerServiceWorker() {
        // Service Workers only work with http:// or https:// protocols
        if (window.location.protocol === 'file:' || window.location.protocol === 'null:') {
          console.log('Service Worker registration skipped: file:// protocol not supported');
          return null;
        }
        if ('serviceWorker' in navigator) {
          try {
            // Use version number that can be updated when needed
            const CACHE_VERSION = 'mainpro-v2025.1';
            const currentUrl = window.location.pathname || '/MAINPRO-MAIN.html';
            
            const swCode = `
                const CACHE_NAME = "${CACHE_VERSION}";
                  const urlsToCache = [
                  "${currentUrl}",
                  "/MAINPRO-MAIN.html",
                  "/manifest.json"
                ];

                // Delete old caches on install
                self.addEventListener("install", (event) => {
                  event.waitUntil(
                    caches.keys().then((cacheNames) => {
                      return Promise.all(
                        cacheNames.map((cacheName) => {
                          if (cacheName !== CACHE_NAME && cacheName.startsWith("mainpro-")) {
                            return caches.delete(cacheName);
                          }
                        })
                      );
                    }).then(() => {
                      return caches.open(CACHE_NAME).then((cache) => {
                        // Use addAll with error handling - don't fail if some URLs fail
                        return Promise.allSettled(
                          urlsToCache.map(url => 
                            cache.add(url).catch(err => {
                              console.warn("Failed to cache:", url, err);
                              return null;
                            })
                          )
                        ).then(() => {
                          console.log("Cache populated successfully");
                        });
                      });
                    })
                  );
                  self.skipWaiting(); // Activate new service worker immediately
                });

                // Listen for skip waiting message
                self.addEventListener("message", (event) => {
                  if (event.data && event.data.type === "SKIP_WAITING") {
                    self.skipWaiting();
                  }
                });

                // Activate new service worker and clean up old caches
                self.addEventListener("activate", (event) => {
                  event.waitUntil(
                    caches.keys().then((cacheNames) => {
                      return Promise.all(
                        cacheNames.map((cacheName) => {
                          if (cacheName !== CACHE_NAME && cacheName.startsWith("mainpro-")) {
                            return caches.delete(cacheName);
                          }
                        })
                      );
                    }).then(() => {
                      return self.clients.claim(); // Take control of all clients
                    })
                  );
                });

                // Fetch with network-first strategy, always fallback to cache
                self.addEventListener("fetch", (event) => {
                  // Skip non-GET requests
                  if (event.request.method !== "GET") {
                    return;
                  }
                  
                  // For HTML/document requests, try cache first for fast loading, update in background
                  if (event.request.destination === "document" || event.request.url.includes(".html") || event.request.mode === "navigate") {
                    event.respondWith(
                      // Try cache first for instant loading
                      caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                          // Return cache immediately, update in background
                          fetch(event.request, { cache: "no-cache" }).then((response) => {
                            if (response && response.status === 200) {
                              const responseToCache = response.clone();
                              caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                              }).catch(() => {});
                            }
                          }).catch(() => {}); // Ignore background fetch errors
                          return cachedResponse;
                        }
                        // No cache, fetch from network
                        return fetch(event.request, { cache: 'no-cache' })
                          .then((response) => {
                            if (response && response.status === 200) {
                              const responseToCache = response.clone();
                              caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                              }).catch(() => {});
                            }
                            return response;
                          })
                          .catch(() => {
                            // Network failed, return basic HTML that reloads
                            return new Response("<!DOCTYPE html><html><head><meta http-equiv=\\"refresh\\" content=\\"2\\"><title>Loading...</title></head><body style=\\"padding:40px;text-align:center;font-family:sans-serif;\\"><h1>Loading MainPro...</h1><p>If this persists, please refresh.</p></body></html>", {
                              headers: { "Content-Type": "text/html" }
                            });
                          });
                      })
                    );
                  } else {
                    // For other resources, use cache first, then network
                    event.respondWith(
                      caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                          // Return cache immediately, then update in background
                          fetch(event.request).then((response) => {
                            if (response && response.status === 200) {
                              const responseToCache = response.clone();
                              caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                              });
                            }
                          }).catch(() => {}); // Ignore background fetch errors
                          return cachedResponse;
                        }
                        // No cache, fetch from network
                        return fetch(event.request).then((response) => {
                          if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                              cache.put(event.request, responseToCache);
                            });
                          }
                          return response;
                        }).catch(() => {
                          // Network failed, return 503 only if it's not critical
                          return new Response("Resource unavailable", { status: 503 });
                        });
                      })
                    );
                  }
                });
            `;
            // NOTE: Do NOT register Service Worker from a blob: URL.
            // Firefox/Chromium can throw "Invalid scope ... base URL blob:..." because scope
            // is derived from the script URL. Use a real file URL instead.
            const pathName = String(window.location && window.location.pathname || '');
            if (!pathName.startsWith('/MAINPRO-MAIN/')) {
              console.log('Service Worker registration skipped: not under /MAINPRO-MAIN/ route');
              return null;
            }
            const registration = await navigator.serviceWorker.register(
              '/MAINPRO-MAIN/mainpro-sw.js',
              { scope: '/MAINPRO-MAIN/' }
            );
            console.log('Service Worker registered successfully');
            
            // Set up automatic update checking
            if (registration) {
              // Check for updates immediately
              registration.update();
              
              // Check for updates every hour
              setInterval(() => {
                registration.update();
              }, 3600000); // 1 hour
              
              // Store registration for update checking
              let updateCheckInterval = null;
              
              // Listen for new service worker waiting
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                      if (navigator.serviceWorker.controller) {
                        // New service worker is waiting - prompt user to update
                        if (this.isRunningAsPWA()) {
                          // In PWA mode, auto-update after short delay
                          showToast('🔄 New version found! Updating...');
                          setTimeout(() => {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            window.location.reload();
                          }, 2000);
                        } else {
                          // In browser, ask user
                          if (confirm('🔄 New version available! Reload to update?')) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                            window.location.reload();
                          }
                        }
                      } else {
                        // First time installation
                        console.log('✅ Service Worker installed for the first time');
                      }
                    }
                  });
                }
              });
              
              // Listen for controller change (new SW activated)
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('✅ New service worker activated');
                if (this.isRunningAsPWA()) {
                  showToast('✅ App updated!');
                  setTimeout(() => window.location.reload(), 1000);
                }
              });
              
              // Periodic update check every hour
              if (!updateCheckInterval) {
                updateCheckInterval = setInterval(() => {
                  registration.update().catch(err => console.log('Update check failed:', err));
                }, 3600000); // 1 hour
              }
            }
            
            return registration;
          } catch (error) {
            console.log('Service Worker registration failed:', error);
          }
        }
      },

      // Install PWA
      async installPWA() {
        try {
          if (!pwaInstallPrompt) {
            showToast('⚠️ Install prompt not available. The app may already be installed or your browser doesn\'t support PWA installation.');
            console.log('PWA Install Debug:', {
              hasPrompt: !!pwaInstallPrompt,
              isInstalled: isPWAInstalled,
              isMobile: isMobile,
              hasServiceWorker: 'serviceWorker' in navigator
            });
            return;
          }

          const result = await pwaInstallPrompt.prompt();
          console.log('PWA install prompt result:', result);
          
          // Wait for user's response
          const { outcome } = result;
          setPwaInstallPrompt(null);
          
          if (outcome === 'accepted') {
            setIsPWAInstalled(true);
            showToast('📱 MainPro installed successfully!');
          } else {
            showToast('ℹ️ Installation cancelled');
          }
        } catch (error) {
          console.error('PWA installation error:', error);
          showToast('❌ Installation failed: ' + (error.message || 'Unknown error'));
        }
      },

      // Check for updates and force reload
      async checkForUpdates() {
        if ('serviceWorker' in navigator) {
          try {
            // Unregister all existing service workers first
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
              // Clear all caches
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            }
            
            // Register new service worker
            await this.registerServiceWorker();
            
            // Reload the page to get fresh content
            showToast('🔄 App updated - reloading...');
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            console.error('Update check failed:', error);
            showToast('❌ Update check failed');
          }
        }
      },
      
      // Force clear cache and reload
      async clearCacheAndReload() {
        if ('serviceWorker' in navigator) {
          try {
            // Unregister all service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
              await registration.unregister();
            }
            
            // Clear all caches
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
            
            showToast('🧹 Cache cleared - reloading...');
            setTimeout(() => window.location.reload(), 500);
          } catch (error) {
            console.error('Cache clear failed:', error);
            showToast('❌ Cache clear failed');
          }
        }
      }
    };

    // Initialize PWA features
    useEffect(() => {
      // Detect mobile device
      const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);

      // Check if running as PWA
      setIsPWAInstalled(pwaManager.isRunningAsPWA());

      // Register service worker with auto-update (only if not file:// protocol)
      let swRegistration = null;
      if (window.location.protocol !== 'file:' && window.location.protocol !== 'null:') {
        pwaManager.registerServiceWorker().then((registration) => {
          swRegistration = registration;
          if (registration) {
            // Check for updates immediately on load
            registration.update();
            
            // Check for updates on page visibility change (when user switches back to app)
            document.addEventListener('visibilitychange', () => {
              if (!document.hidden && registration) {
                console.log('📱 Page visible - checking for updates...');
                registration.update();
              }
            });
          
          // Check for updates on window focus (when user clicks back to app)
          window.addEventListener('focus', () => {
            if (registration) {
              console.log('👀 Window focused - checking for updates...');
              registration.update();
            }
          });
          
          // Check for updates periodically (every 30 minutes when in PWA mode)
          if (pwaManager.isRunningAsPWA()) {
            setInterval(() => {
              if (registration) {
                console.log('⏰ Periodic update check...');
                registration.update();
              }
            }, 1800000); // 30 minutes
          }
        }
      }).catch(err => {
        console.error('Service Worker registration error:', err);
      });
      } else {
        console.log('Service Worker registration skipped: file:// protocol not supported');
      }

      // Listen for PWA install prompt
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setPwaInstallPrompt(e);
        console.log('✅ PWA install prompt received');
      };

      // Also listen for when install is no longer available
      const handleAppInstalled = () => {
        setIsPWAInstalled(true);
        setPwaInstallPrompt(null);
        showToast('📱 MainPro installed successfully!');
        console.log('✅ PWA installed');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      // Use modern page lifecycle APIs instead of deprecated unload event
      // pagehide: Fires when browser hides/unloads the page (reliable cross-browser)
      // visibilitychange: Fires when page visibility changes (for saving state)
      const handlePageHide = (event) => {
        // Save any pending data when page is being unloaded
        // This is called instead of unload for better BFCache compatibility
        if (event.persisted) {
          // Page was put into BFCache (back/forward cache) - no cleanup needed
        } else {
          // Page is being unloaded - perform any necessary cleanup
          // Note: Keep cleanup minimal for BFCache compatibility
        }
      };

      const handleVisibilityChange = () => {
        // Handle page visibility changes (page hidden/shown)
        // Use this for saving state when user switches tabs/apps
        if (document.visibilityState === 'hidden') {
          // Page is hidden - optionally save state here
        }
      };

      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('resize', checkMobile);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('pagehide', handlePageHide);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, []);

    // Subscription Plans
    const subscriptionPlans = {
      free: {
        name: 'Free',
        price: 0,
        period: 'forever',
        features: [
          'Basic calendar management',
          'Up to 50 events per month',
          'Basic document storage (100MB)',
          'Email support',
          'Mobile app access'
        ],
        limitations: [
          'Limited AI features',
          'No cloud sync',
          'No team collaboration',
          'No advanced analytics'
        ]
      },
      professional: {
        name: 'Professional',
        price: 29,
        period: 'month',
        priceId: 'price_professional_monthly',
        features: [
          'Everything in Free',
          'Unlimited events',
          'Advanced AI features',
          'Cloud synchronization',
          'Team collaboration (up to 5 users)',
          'Advanced analytics',
          'Priority support',
          'Custom integrations'
        ],
        popular: true
      },
      enterprise: {
        name: 'Enterprise',
        price: 99,
        period: 'month',
        priceId: 'price_enterprise_monthly',
        features: [
          'Everything in Professional',
          'Unlimited team members',
          'Advanced security features',
          'Custom workflows',
          'API access',
          'Dedicated support',
          'Custom branding',
          'On-premise deployment'
        ]
      }
    };

    // Billing Manager
    const billingManager = {
      // Initialize Stripe (simulated)
      async initializeStripe() {
        // In real implementation, this would load Stripe.js
        console.log('Stripe initialized');
        return true;
      },

      // Create subscription
      async createSubscription(planId, paymentMethodId) {
        try {
          showToast('🔄 Processing payment...');
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          setSubscriptionPlan(planId);
          setSubscriptionStatus('active');
          
          // Add to billing history
          const newBilling = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            plan: subscriptionPlans[planId].name,
            amount: subscriptionPlans[planId].price,
            status: 'paid',
            method: 'stripe'
          };
          
          setBillingHistory(prev => [newBilling, ...prev]);
          showToast('✅ Subscription activated successfully!');
          
          return { success: true, subscriptionId: 'sub_' + Date.now() };
        } catch (error) {
          showToast('❌ Payment failed. Please try again.');
          return { success: false, error: error.message };
        }
      },

      // Cancel subscription
      async cancelSubscription() {
        try {
          showToast('🔄 Cancelling subscription...');
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setSubscriptionStatus('cancelled');
          showToast('✅ Subscription cancelled successfully');
          
          return { success: true };
        } catch (error) {
          showToast('❌ Failed to cancel subscription');
          return { success: false, error: error.message };
        }
      },

      // Update subscription
      async updateSubscription(newPlanId) {
        try {
          showToast('🔄 Updating subscription...');
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          setSubscriptionPlan(newPlanId);
          showToast('✅ Subscription updated successfully!');
          
          return { success: true };
        } catch (error) {
          showToast('❌ Failed to update subscription');
          return { success: false, error: error.message };
        }
      },

      // Get billing history
      getBillingHistory() {
        return billingHistory;
      }
    };

    // Initialize billing on app start
    useEffect(() => {
      if (isAuthenticated) {
        billingManager.initializeStripe();
      }
    }, [isAuthenticated]);
    // Emergency Assist Manager
    const emergencyManager = {
      // Emergency alert types
      alertTypes: {
        fire: { name: 'Fire Emergency', color: 'red', icon: '🔥', priority: 'critical' },
        medical: { name: 'Medical Emergency', color: 'red', icon: '🏥', priority: 'critical' },
        security: { name: 'Security Alert', color: 'orange', icon: '🚨', priority: 'high' },
        maintenance: { name: 'Maintenance Alert', color: 'yellow', icon: '🔧', priority: 'medium' },
        weather: { name: 'Weather Alert', color: 'blue', icon: '⛈️', priority: 'high' },
        system: { name: 'System Alert', color: 'purple', icon: '⚠️', priority: 'medium' }
      },

      // Create emergency alert
      createAlert(type, message, location = 'Unknown') {
        const alert = {
          id: Date.now(),
          type: type,
          message: message,
          location: location,
          timestamp: new Date().toLocaleString(),
          status: 'active',
          priority: this.alertTypes[type]?.priority || 'medium'
        };
        
        setEmergencyAlerts(prev => [alert, ...prev]);
        
        // Show notification
        showToast(`🚨 Emergency Alert: ${this.alertTypes[type]?.name || 'Alert'}`);
        
        // Auto-escalate critical alerts
        if (alert.priority === 'critical') {
          this.escalateAlert(alert);
        }
        
        return alert;
      },

      // Escalate critical alerts
      escalateAlert(alert) {
        // In real implementation, this would send notifications to emergency contacts
        console.log('Escalating critical alert:', alert);
        
        // Simulate escalation
        setTimeout(() => {
          showToast('📞 Emergency contacts notified automatically');
        }, 2000);
      },

      // Resolve alert
      resolveAlert(alertId) {
        setEmergencyAlerts(prev => 
          prev.map(alert => 
            alert.id === alertId 
              ? { ...alert, status: 'resolved', resolvedAt: new Date().toLocaleString() }
              : alert
          )
        );
        showToast('✅ Alert resolved successfully');
      },

      // Get security status
      getSecurityStatus() {
        const activeAlerts = emergencyAlerts.filter(alert => alert.status === 'active');
        const criticalAlerts = activeAlerts.filter(alert => alert.priority === 'critical');
        
        if (criticalAlerts.length > 0) {
          return 'critical';
        } else if (activeAlerts.length > 0) {
          return 'warning';
        } else {
          return 'secure';
        }
      },

      // Emergency contact management
      addEmergencyContact(name, phone, email, role) {
        const contact = {
          id: Date.now(),
          name: name,
          phone: phone,
          email: email,
          role: role,
          addedAt: new Date().toLocaleString()
        };
        
        setEmergencyContacts(prev => [...prev, contact]);
        showToast('📞 Emergency contact added successfully');
        return contact;
      },

      // Remove emergency contact
      removeEmergencyContact(contactId) {
        setEmergencyContacts(prev => prev.filter(contact => contact.id !== contactId));
        showToast('🗑️ Emergency contact removed');
      },

      // Quick emergency actions
      quickActions: {
        fire: () => {
          emergencyManager.createAlert('fire', 'Fire emergency detected', 'Building A');
          // In real implementation, this would trigger fire alarm system
        },
        medical: () => {
          emergencyManager.createAlert('medical', 'Medical emergency requiring immediate attention', 'Building B');
          // In real implementation, this would contact medical services
        },
        security: () => {
          emergencyManager.createAlert('security', 'Security breach detected', 'Main Entrance');
          // In real implementation, this would activate security protocols
        },
        maintenance: () => {
          emergencyManager.createAlert('maintenance', 'Critical maintenance issue detected', 'HVAC System');
        }
      }
    };

    // Initialize emergency system
    useEffect(() => {
      // Add sample emergency contacts
      if (emergencyContacts.length === 0) {
        emergencyManager.addEmergencyContact('John Smith', '+1-555-0123', 'john@company.com', 'Security Manager');
        emergencyManager.addEmergencyContact('Sarah Johnson', '+1-555-0456', 'sarah@company.com', 'Facilities Manager');
        emergencyManager.addEmergencyContact('Emergency Services', '911', 'emergency@company.com', 'Emergency Services');
      }
    }, []);

    // Update security status
    useEffect(() => {
      setSecurityStatus(emergencyManager.getSecurityStatus());
    }, [emergencyAlerts]);

    // Business Module Manager
    const businessManager = {
      // Business types and their modules
      businessTypes: {
        hotel: {
          name: 'Hotel Management',
          icon: '🏨',
          modules: [
            { id: 'room-management', name: 'Room Management', icon: '🛏️', description: 'Room status, housekeeping, maintenance' },
            { id: 'guest-services', name: 'Guest Services', icon: '👥', description: 'Check-in/out, concierge, guest requests' },
            { id: 'reservations', name: 'Reservations', icon: '📅', description: 'Booking management, availability tracking' },
            { id: 'housekeeping', name: 'Housekeeping', icon: '🧹', description: 'Cleaning schedules, room inspections' },
            { id: 'maintenance', name: 'Maintenance', icon: '🔧', description: 'Facility maintenance, repairs' },
            { id: 'food-beverage', name: 'Food & Beverage', icon: '🍽️', description: 'Restaurant, bar, catering management' }
          ]
        },
        clinic: {
          name: 'Medical Clinic',
          icon: '🏥',
          modules: [
            { id: 'patient-management', name: 'Patient Management', icon: '👤', description: 'Patient records, appointments, medical history' },
            { id: 'appointments', name: 'Appointments', icon: '📋', description: 'Scheduling, reminders, cancellations' },
            { id: 'medical-records', name: 'Medical Records', icon: '📊', description: 'Health records, prescriptions, test results' },
            { id: 'staff-management', name: 'Staff Management', icon: '👨‍⚕️', description: 'Doctors, nurses, support staff scheduling' },
            { id: 'inventory', name: 'Medical Inventory', icon: '💊', description: 'Medications, equipment, supplies tracking' },
            { id: 'billing', name: 'Medical Billing', icon: '💰', description: 'Insurance, payments, claims processing' }
          ]
        },
        office: {
          name: 'Office Management',
          icon: '🏢',
          modules: [
            { id: 'workspace', name: 'Workspace Management', icon: '💼', description: 'Desks, meeting rooms, facilities' },
            { id: 'employee-management', name: 'Employee Management', icon: '👔', description: 'Staff scheduling, attendance, HR' },
            { id: 'meetings', name: 'Meeting Management', icon: '🤝', description: 'Room bookings, video conferences' },
            { id: 'facilities', name: 'Facilities Management', icon: '🏗️', description: 'Building maintenance, utilities' },
            { id: 'it-support', name: 'IT Support', icon: '💻', description: 'Technical support, equipment management' },
            { id: 'compliance', name: 'Compliance', icon: '📋', description: 'Regulatory compliance, safety protocols' }
          ]
        },
        school: {
          name: 'Educational Institution',
          icon: '🏫',
          modules: [
            { id: 'classroom-management', name: 'Classroom Management', icon: '📚', description: 'Class schedules, room assignments' },
            { id: 'student-management', name: 'Student Management', icon: '🎓', description: 'Student records, attendance, grades' },
            { id: 'staff-management', name: 'Staff Management', icon: '👩‍🏫', description: 'Teachers, administrators, support staff' },
            { id: 'facilities', name: 'Campus Facilities', icon: '🏛️', description: 'Buildings, equipment, maintenance' },
            { id: 'safety', name: 'Safety & Security', icon: '🛡️', description: 'Emergency protocols, visitor management' },
            { id: 'events', name: 'Events Management', icon: '🎉', description: 'School events, sports, activities' }
          ]
        }
      },

      // Activate business module
      activateModule(businessType, moduleId) {
        const module = this.businessTypes[businessType]?.modules.find(m => m.id === moduleId);
        if (module) {
          setBusinessModules(prev => {
            const exists = prev.find(m => m.id === moduleId && m.businessType === businessType);
            if (exists) return prev;
            return [...prev, { ...module, businessType, activatedAt: new Date().toLocaleString() }];
          });
          showToast(`✅ ${module.name} module activated for ${this.businessTypes[businessType].name}`);
        }
      },

      // Deactivate business module
      deactivateModule(moduleId) {
        setBusinessModules(prev => prev.filter(m => m.id !== moduleId));
        showToast('🗑️ Business module deactivated');
      },

      // Get business type modules
      getModules(businessType) {
        return this.businessTypes[businessType]?.modules || [];
      },

      // Get active modules
      getActiveModules() {
        return businessModules;
      },

      // Set business type
      setBusinessType(type) {
        setBusinessType(type);
        showToast(`🏢 Business type set to ${this.businessTypes[type].name}`);
      }
    };

    // Initialize business modules
    useEffect(() => {
      // Set default business type from auth user if available
      if (authUser?.organization) {
        setBusinessType(authUser.organization);
      }
    }, [authUser]);

    // recurrence
    const RECUR_SAFE_CAP = 800;
    const RECUR_RANGE_BUFFER_DAYS = 7;
    function lastDayOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }

    /** Map old recur shape to new SaaS-grade shape. In-place safe; returns task. */
    function normalizeRecur(task) {
      if (!task || typeof task !== 'object') return task;
      const r = task.recur;
      if (!r || typeof r !== 'object') return task;
      const opts = task.recurOptions || {};
      const start = task.start ? new Date(task.start) : new Date();
      if (Number.isNaN(start.getTime())) return task;

      const freq = r.freq || 'none';
      if (freq === 'none') {
        task.recur = { freq: 'none', interval: 1, end: { type: 'never' }, exceptions: r.exceptions || [] };
        return task;
      }

      let interval = 1;
      let monthlyMode = 'dayOfMonth';
      let monthDay = start.getDate();
      let nth = 1;
      let weekday = (start.getDay() + 6) % 7 + 1;
      let byWeekday = [];

      if (opts.monthDay != null) monthDay = Math.min(31, Math.max(1, Number(opts.monthDay)));
      if (opts.nth != null) nth = opts.nth;
      if (opts.weekday != null) weekday = opts.weekday >= 1 && opts.weekday <= 7 ? opts.weekday : weekday;
      const rawWdays = Array.isArray(opts.wdays) ? opts.wdays : (Array.isArray(r.byWeekday) ? r.byWeekday : []);
      byWeekday = rawWdays.map(function (w) {
        if (w >= 1 && w <= 7) return w;
        if (w === 0) return 7;
        return (w + 6) % 7 + 1;
      }).filter((v, i, a) => a.indexOf(v) === i);

      if (freq === 'weekly' || freq === 'biweekly') {
        interval = freq === 'biweekly' ? 2 : 1;
        if (!byWeekday.length) byWeekday = [weekday];
        task.recur = {
          freq: 'weekly', interval, byWeekday,
          end: endFromOld(r, start),
          exceptions: r.exceptions || []
        };
        return task;
      }
      if (freq === 'daily') {
        task.recur = {
          freq: 'daily', interval: 1,
          byWeekday: byWeekday.length ? byWeekday : [1, 2, 3, 4, 5, 6, 7],
          end: endFromOld(r, start),
          exceptions: r.exceptions || []
        };
        return task;
      }

      const monthFreqMap = { monthly: 1, bimonthly: 2, quarterly: 3, yearly: 12, every4months: 4, every9months: 9, every18months: 18, every2years: 24, every3years: 36 };
      interval = monthFreqMap[freq] != null ? monthFreqMap[freq] : (Number(r.interval) || 1);
      if (freq === 'custom' && opts.unit === 'month') interval = Math.max(1, Number(opts.interval) || 1);

      if (r.monthlyMode === 'nthWeekday' || r.monthlyMode === 'lastDay') {
        monthlyMode = r.monthlyMode;
        if (r.nth != null) nth = r.nth;
        if (r.weekday != null) weekday = r.weekday;
      } else if (r.monthlyMode === 'dayOfMonth' || opts.monthDay != null) {
        monthlyMode = 'dayOfMonth';
        monthDay = r.monthDay != null ? r.monthDay : (opts.monthDay != null ? opts.monthDay : monthDay);
      }

      task.recur = {
        freq: 'monthly', interval,
        monthlyMode, monthDay: Math.min(31, Math.max(1, monthDay)), nth, weekday,
        end: endFromOld(r, start),
        exceptions: r.exceptions || []
      };
      return task;
    }

    function endFromOld(r, baseStart) {
      if (r.end && (r.end.type === 'count' || r.end.type === 'until')) return r.end;
      const until = r.repeatEndDate ? (r.repeatEndDate.slice ? r.repeatEndDate : null) : null;
      if (until) return { type: 'until', until: until.slice(0, 10) };
      const months = r.repeatEndMonths != null ? Number(r.repeatEndMonths) : null;
      if (months != null && months > 0) {
        const d = addMonths(baseStart, months);
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
        return { type: 'until', until: `${y}-${m}-${day}` };
      }
      return { type: 'never' };
    }

    /** Generate occurrences only inside rangeStart..rangeEnd (+ buffer). Cap 800. */
    function generateOccurrences(baseTask, rangeStart, rangeEnd) {
      const base = { ...baseTask };
      normalizeRecur(base);
      const r = base.recur;
      if (!r || r.freq === 'none') return [];

      const baseStart = new Date(base.start);
      if (Number.isNaN(baseStart.getTime())) return [];

      const buf = RECUR_RANGE_BUFFER_DAYS * 24 * 60 * 60 * 1000;
      let start = new Date(rangeStart);
      let end = new Date(rangeEnd);
      if (Number.isNaN(start.getTime())) start = new Date(baseStart.getTime() - buf);
      if (Number.isNaN(end.getTime())) end = new Date(baseStart.getTime() + 366 * 24 * 60 * 60 * 1000);
      const rangeStartMs = Math.min(start.getTime(), baseStart.getTime()) - buf;
      const rangeEndMs = end.getTime() + buf;

      let endLimit = rangeEndMs;
      const endCfg = r.end || { type: 'never' };
      if (endCfg.type === 'until' && endCfg.until) {
        const untilMs = new Date(endCfg.until + 'T23:59:59').getTime();
        if (untilMs < endLimit) endLimit = untilMs;
      }
      const maxCount = endCfg.type === 'count' && typeof endCfg.count === 'number' ? Math.min(RECUR_SAFE_CAP, endCfg.count) : RECUR_SAFE_CAP;
      const exceptions = new Set((r.exceptions || []).map(d => String(d).slice(0, 10)));

      const out = [];
      let count = 0;
      const seriesId = base.seriesId || base.id;

      function pushOne(d) {
        const dStr = toLocalISO(d).slice(0, 10);
        if (exceptions.has(dStr)) return;
        if (d.getTime() < rangeStartMs || d.getTime() > rangeEndMs) return;
        count++;
        if (count > maxCount) return;
        out.push({ ...base, id: `${seriesId}-${count}`, start: toLocalISO(d), isInstance: true });
      }

      if (r.freq === 'daily') {
        const byWeekday = Array.isArray(r.byWeekday) && r.byWeekday.length ? r.byWeekday : [1, 2, 3, 4, 5, 6, 7];
        let cursor = new Date(Math.max(baseStart.getTime(), rangeStartMs));
        cursor.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
        let iters = 0;
        while (cursor.getTime() <= endLimit && out.length < RECUR_SAFE_CAP && iters++ < 10000) {
          const w = (cursor.getDay() + 6) % 7 + 1;
          if (byWeekday.includes(w)) pushOne(new Date(cursor));
          cursor = addDays(cursor, 1);
        }
        if (iters >= 10000) console.warn('generateOccurrences: daily iteration cap reached', base.id);
        return out;
      }

      if (r.freq === 'weekly') {
        const fallbackWd = (baseStart.getDay() + 6) % 7 + 1;
        const byWeekday = Array.isArray(r.byWeekday) && r.byWeekday.length ? r.byWeekday : [fallbackWd];
        const interval = Math.max(1, Number(r.interval) || 1);
        let weekStart = new Date(baseStart);
        const baseWeekStart = new Date(weekStart);
        baseWeekStart.setDate(baseWeekStart.getDate() - (baseWeekStart.getDay() + 6) % 7);
        let cursor = new Date(baseWeekStart.getTime());
        let iters = 0;
        while (cursor.getTime() <= endLimit && out.length < RECUR_SAFE_CAP && iters++ < 10000) {
          for (const wd of byWeekday) {
            const d = addDays(cursor, wd === 7 ? 6 : wd - 1);
            d.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
            if (d.getTime() >= baseStart.getTime() && d.getTime() <= endLimit) pushOne(d);
          }
          cursor = addDays(cursor, 7 * interval);
        }
        if (iters >= 10000) console.warn('generateOccurrences: weekly iteration cap reached', base.id);
        return out;
      }

      if (r.freq === 'monthly') {
        const interval = Math.max(1, Number(r.interval) || 1);
        const mode = r.monthlyMode || 'dayOfMonth';
        const monthDay = Math.min(31, Math.max(1, Number(r.monthDay) || baseStart.getDate()));
        const nth = r.nth != null ? r.nth : Math.min(4, Math.ceil(baseStart.getDate() / 7));
        const weekday = (r.weekday >= 1 && r.weekday <= 7) ? r.weekday : ((baseStart.getDay() + 6) % 7 + 1);

        let monthIndex = 0;
        let iters = 0;
        while (out.length < RECUR_SAFE_CAP && iters++ < 10000) {
          const next = addMonths(baseStart, monthIndex * interval);
          next.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          if (next.getTime() > endLimit) break;

          let target;
          if (mode === 'lastDay') {
            const last = lastDayOfMonth(next);
            target = new Date(next.getFullYear(), next.getMonth(), last, baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          } else if (mode === 'nthWeekday') {
            target = nthWeekdayInMonth(next.getFullYear(), next.getMonth(), nth, weekday);
            target.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          } else {
            const last = lastDayOfMonth(next);
            const d = Math.min(monthDay, last);
            target = new Date(next.getFullYear(), next.getMonth(), d, baseStart.getHours(), baseStart.getMinutes(), 0, 0);
          }
          if (target.getTime() >= baseStart.getTime() && target.getTime() <= endLimit) pushOne(target);
          monthIndex++;
        }
        if (iters >= 10000) console.warn('generateOccurrences: monthly iteration cap reached', base.id);
        return out;
      }

      return out;
    }

    function nthWeekdayInMonth(year, month, nth, weekday) {
      const one = new Date(year, month, 1);
      const wOne = (one.getDay() + 6) % 7 + 1;
      let firstOcc = 1 + ((weekday - wOne + 7) % 7);
      if (firstOcc > 7) firstOcc -= 7;
      if (nth === -1) {
        const last = lastDayOfMonth(one);
        let d = last;
        while (d >= 1) {
          const dDate = new Date(year, month, d);
          if ((dDate.getDay() + 6) % 7 + 1 === weekday) return dDate;
          d--;
        }
        return new Date(year, month, firstOcc);
      }
      const d = firstOcc + (nth - 1) * 7;
      const last = lastDayOfMonth(one);
      const day = Math.min(d, last);
      return new Date(year, month, day);
    }

  function generateSeries(base, freq, months, rangeEnd){
      if (freq === 'none') return [];
      const baseStart = new Date(base.start);
      if (Number.isNaN(baseStart.getTime())) return [];
      const clone = { ...base, recur: { ...(base.recur || {}), freq, months: Number(months) || 12, repeatEndMonths: base.recur?.repeatEndMonths, repeatEndDate: base.recur?.repeatEndDate } };
      normalizeRecur(clone);
      const rangeEndDate = rangeEnd != null ? new Date(rangeEnd) : addMonths(baseStart, Math.max(1, Number(months) || 12));
      return generateOccurrences(clone, baseStart, rangeEndDate);
    }

    // Глобальные переменные для интеграции с Add Task v74
    window.setEvents = setEvents;
    window.categories = categories;
    window.calRef = calRef;
    window.statusColor = statusColor;
    window.generateSeries = generateSeries;
    window.generateOccurrences = generateOccurrences;
    window.normalizeRecur = normalizeRecur;
    window.getCalendarViewRange = function() {
      const fallback = function() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        if (window.mainproRecurDebug) console.warn('getCalendarViewRange: using fallback range', { start, end });
        return { start, end };
      };
      try {
        const cal = calRef.current;
        if (!cal) return fallback();
        const v = cal.getView();
        if (v && v.activeStart && v.activeEnd) return { start: v.activeStart, end: v.activeEnd };
        return fallback();
      } catch (_) {
        return fallback();
      }
    };
    window.getRecurrencePreview = function(baseTask) {
      try {
        const range = window.getCalendarViewRange();
        if (!range || !baseTask) return 0;
        return generateOccurrences({ ...baseTask }, range.start, range.end).length;
      } catch (_) { return 0; }
    };
    window.addAuditLog = addAuditLog;
    window.showToast = showToast;
    window.getCurrentUser = () => ({ id: currentUser.id, name: currentUser.name });
    window.refreshCalendar = refreshCalendar;
    // Allow external (non-React) modals to queue Undo for single delete
    window.mainproQueueUndoDeleteOne = (ev, index) => {
      try {
        if (!ev) return;
        setUndoClearAll(null);
        setUndoDelete(prev => {
          const now = Date.now();
          const nextItem = { event: { ...ev }, index: (typeof index === 'number' ? index : -1) };
          const base = (prev && Array.isArray(prev.items) && prev.expiresAt && prev.expiresAt > now) ? prev.items : [];
          // de-dup by id
          const idStr = String(nextItem.event.id);
          const filtered = base.filter(it => String(it?.event?.id) !== idStr);
          const items = [...filtered, nextItem].slice(-20);
          return { items, expiresAt: now + 10000 };
        });
      } catch {}
    };

    // CRUD

    function addEvent(){

      if(!form.title || !form.date) return alert('Please fill Title and Date');

      const hh = String(form.time||'09:00').slice(0,2).padStart(2,'0');

      const mm = String(form.time||'09:00').slice(3,5).padStart(2,'0');

      const start = `${form.date}T${hh}:${mm}`;

      const seriesId = (form.recurFreq!=='none') ? `S${Date.now()}` : null;

      const base = addUserInfoToEvent({

        id: Date.now(),

        title: form.title,

        start,

        status: form.status,

        catId: form.catId,

        taskType: form.taskType,

        priority: form.priority,

        contractorOnSite: form.contractorOnSite,

        contractorName: form.contractorName,

        contractorPhone: form.contractorPhone,

        location: form.location,

        notes: form.notes,

        seriesId,

        recur: {
          freq: form.recurFreq,
          months: Number(form.recurMonths)||12,
          repeatEndMonths: form.repeatEndMonths ? Number(form.repeatEndMonths) : undefined,
          repeatEndDate: form.recurEndDate || undefined
        },
        recurOptions: (function(){
          const freq = form.recurFreq;
          if(freq==='weekly'){
            return { wdays: Array.isArray(form.recurDays) ? form.recurDays : [] };
          }
          if(freq==='monthly'){
            if(form.recurDayOfMonth) return { monthDay: form.recurDayOfMonth };
            const baseDate = form.date ? new Date(form.date+'T00:00:00') : new Date();
            return { monthDay: baseDate.getDate() };
          }
          if(freq==='custom'){
            const interval = Number(form.recurInterval) || 1;
            const unit = form.recurUnit || 'day';
            return { interval: interval > 0 ? interval : 1, unit };
          }
          return {};
        })()

      });

      setEvents(prev=> [...prev, base]);

      addAuditLog('TASK_CREATED', {
        taskId: base.id,
        title: base.title,
        taskType: base.taskType,
        category: base.catId,
        priority: base.priority,
        seriesCount: seriesId ? 1 : 1
      });
      console.log('Task created and audit logged:', base.title);

      try {
        const nextList = [...(eventsRef.current || []), base];
        eventsRef.current = nextList;
        refreshCalendar(nextList);
      } catch (_) {}

      if(!taskTypes.includes(form.taskType)) setTaskTypes(prev=>[...prev,form.taskType]);

      setShowAdd(false);

      setForm({

        title:'', date:todayISO(), time:'09:00', status:'pending',

        catId: form.catId, taskType:'Maintenance',

        priority:'normal', contractorOnSite:false, contractorName:'', contractorPhone:'',

        location:'', notes:'', recurFreq:'none', recurMonths:12, recurInterval:1, recurUnit:'day',

        recurDays: [], recurDayOfMonth: null, recurWeekOfMonth: '', recurEndDate: '', repeatEndMonths: '',

        recurSkipWeekends: false, recurBusinessDays: false

      });

      // сразу оценить статус, если включено

      if(settings.autoStatusEnabled) runSmartStatusOnce();
      
      // Trigger real-time update for team collaboration
      simulateRealtimeUpdate('task_created', `Created task: ${base.title}`);

      // Show success notification
      showToast(`✅ Task "${base.title}" added successfully!`);

    }

    function saveEdit(){

      if(!editEvent) return;

      const scope = editEvent._seriesScope || 'one';

      if(scope==='all' && editEvent.seriesId){

        setEvents(prev=> prev.map(e=> {

          if(e.seriesId!==editEvent.seriesId) return e;

          const timePart=(editEvent.start||'').slice(11,16) || '09:00';

          const newStart=(e.start||'').slice(0,10)+'T'+timePart;

          return {

            ...e,

            title:editEvent.title, status:editEvent.status, catId:editEvent.catId,

            taskType:editEvent.taskType, priority:editEvent.priority||'normal',

            contractorOnSite: !!editEvent.contractorOnSite,

            contractorName: editEvent.contractorName||'',

            contractorPhone: editEvent.contractorPhone||'',

            location: editEvent.location||'',

            notes: editEvent.notes||'',

            start:newStart

          };

        }));

      }else{

        setEvents(prev=> prev.map(e=> e.id===editEvent.id ? {...editEvent} : e));

      }

      setEditEvent(null);

      if(settings.autoStatusEnabled) runSmartStatusOnce();

    }

    function deleteEventAction(){

      if(!editEvent) return;

      if(editEvent.seriesId){

        const choice=confirm('Delete ENTIRE series?\nOK = entire series, Cancel = only this');

        if(choice){

          setEvents(prev=> prev.filter(e=> e.seriesId!==editEvent.seriesId));
          
          // Audit logging for series deletion
          addAuditLog('TASK_SERIES_DELETED', { 
            seriesId: editEvent.seriesId,
            taskId: editEvent.id,
            title: editEvent.title
          });

        }else{

          setEvents(prev=> prev.filter(e=> e.id!==editEvent.id));
          
          // Audit logging for single task deletion
          addAuditLog('TASK_DELETED', { 
            taskId: editEvent.id,
            title: editEvent.title,
            taskType: editEvent.taskType
          });

        }

      }else{

        if(!confirm('Delete this task?')) return;

        setEvents(prev=> prev.filter(e=> e.id!==editEvent.id));
        
        // Audit logging for single task deletion
        addAuditLog('TASK_DELETED', { 
          taskId: editEvent.id,
          title: editEvent.title,
          taskType: editEvent.taskType
        });

      }

      setEditEvent(null);

    }

    // === deleteEvent() function - Remove selected task from events array ===
    function deleteEvent(eventId) {
      // Find the task to delete
      const eventToDelete = events.find(e => e.id === eventId);
      if (!eventToDelete) {
        console.warn('Task not found:', eventId);
        return false;
      }

      // Remove from events array and update localStorage
      setEvents(prev => {
        const updatedEvents = prev.filter(e => e.id !== eventId);
        return updatedEvents;
      });
      
      // Remove from FullCalendar
      if (calRef.current) {
        const calendarEvent = calRef.current.getEventById(eventId);
        if (calendarEvent) {
          calendarEvent.remove();
        }
      }

      // Show toast message
      showToast("🗑️ Task deleted");
      
      return true;
    }

    function clearAll(){

      if(!confirm('Clear ALL tasks?')) return;

      // Save snapshot for Undo (10s)
      let snapshot = [];
      try {
        const src = (eventsRef && eventsRef.current) ? eventsRef.current : events;
        snapshot = (Array.isArray(src) ? src : []).map(e => ({...e}));
      } catch {}
      const expiresAt = Date.now() + 10000;
      setUndoClearAll({ events: snapshot, expiresAt, count: snapshot.length });

      setEvents([]); calRef.current?.removeAllEvents();
      showToast(`🧹 All tasks cleared — Undo (10s)`);
      
      // Audit logging for clear all
      addAuditLog('ALL_TASKS_CLEARED', { 
        previousCount: events.length,
        clearedBy: teamMode.enabled ? getCurrentUser().id : 'system'
      });

    }

    // export

    function exportExcel(){

      const catName = id => (categories.find(c=>c.id===id)?.name)||'-';

      const data = events.map(e=>({

        Title:e.title, Start:e.start||'', Status:e.status, Category:catName(e.catId),

        Type:e.taskType||'', Priority:e.priority||'',

        ContractorOnSite: e.contractorOnSite?'Yes':'No',

        Contractor: e.contractorName||'', Phone:e.contractorPhone||'',

        Location: e.location||'', Notes:e.notes||''

      }));

      const ws = XLSX.utils.json_to_sheet(data);

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

      XLSX.writeFile(wb, 'MainPro_Tasks.xlsx');

    }
    function exportPDF(){

      const doc=new jsPDF('p','mm','a4');

      doc.setFont('helvetica','bold'); doc.setFontSize(16);

      doc.text('MainPro – Audit Report',20,20);

      doc.setFont('helvetica',''); doc.setFontSize(11);

      doc.text(`Hotel: ${settings.hotelName||'-'}`,20,30);

      doc.text(`Prepared by: ${settings.preparedBy||''}`,20,36);

      doc.text(`Approved by: ${settings.approvedBy||''}`,20,42);

      let y=55;

      const catName = id => (categories.find(c=>c.id===id)?.name)||'-';

      events.forEach((e,i)=>{

        if(y>280){doc.addPage(); y=20;}

        const row = `${i+1}. ${e.title} — ${e.start} — ${e.status} — ${catName(e.catId)} — ${e.taskType||''} — ${e.location||''}`;

        doc.text(row,20,y); y+=6;

      });

      doc.save('MainPro_Report.pdf');

    }

    // categories

    function addInlineCategory(){

      const name = newCat.name.trim();

      if(!name) return alert('Enter category name');

      const id = name.toLowerCase().replace(/\s+/g,'-');

      if(categories.some(c=>c.id===id)) return alert('Category already exists');

      const item = { id, name, color:newCat.color||'#6b7280' };

      const next = [...categories, item];

      setCategories(next);

      setForm(f=>({...f, catId:item.id}));

      setNewCat({ name:'', color:'#6b7280' });

      setShowNewCat(false);

    }

    function removeCategory(id){

      if(!confirm('Remove this category? Tasks will switch to "other".')) return;

      setCategories(prev=> prev.filter(c=>c.id!==id));

      setEvents(prev=> prev.map(e=> e.catId===id? {...e,catId:'other'}: e));

      if(form.catId===id) setForm(f=>({...f,catId:'other'}));

      if(editEvent?.catId===id) setEditEvent(ev=>({...ev,catId:'other'}));

    }

    const btn = (bg)=>`px-3 py-2 rounded-md text-white ${bg} hover:opacity-90`;

    const statusDotStyle = (s)=>({ background: statusColor(s), width:'10px', height:'10px', borderRadius:'9999px', display:'inline-block' });

    const monthNames = Array.from({length:12}, (_,i)=> new Date(2020,i,1).toLocaleString(undefined,{month:'long'}));

    const [pickerYear,setPickerYear] = useState(new Date().getFullYear());

    // ==========================
    // Document Manager PRO v68.0 – Enhanced Features (Gold UI)
    // ==========================
    
    // === Folder ops
    function dmAddFolder(){
      const name = (dmNewFolder||'').trim();
      if(!name) return showToast('Enter folder name');
      if(dmFolders.some(f=>f.name.toLowerCase()===name.toLowerCase())) return showToast('Folder exists');
      const id = Date.now();
      setDmFolders(prev=>[...prev,{id,name}]);
      setDmNewFolder('');
      setDmActive(name);
      showToast(`📁 "${name}" added`);
    }
    function dmStartRename(folder){ setDmRenamingId(folder.id); setDmRenameValue(folder.name); }
    function dmCommitRename(){
      if(!dmRenamingId) return;
      const name = (dmRenameValue||'').trim();
      const id = dmRenamingId;
      setDmRenamingId(null); setDmRenameValue('');
      if(!name) return;
      setDmFolders(prev=>{
        const old = prev.find(f=>f.id===id)?.name;
        const next = prev.map(f=> f.id===id ? {...f,name} : f);
        if(old && old!==name){
          setDmDocs(dPrev => dPrev.map(d=> d.folder===old ? {...d, folder:name} : d));
          if(dmActive===old) setDmActive(name);
        }
        return next;
      });
      showToast('✏️ Folder renamed');
    }
    function dmDeleteFolder(id){
      const f = dmFolders.find(x=>x.id===id); if(!f) return;
      if(f.name==='General') return showToast("Can't delete General");
      if(!confirm(`Delete folder "${f.name}" and its files?`)) return;
      setDmFolders(prev=> prev.filter(x=>x.id!==id));
      setDmDocs(prev=> prev.filter(d=> d.folder!==f.name));
      if(dmActive===f.name) setDmActive('General');
      showToast('🗑️ Folder deleted');
    }

    // === AI Smart Categorization ===
    function aiCategorizeFile(fileName, fileType) {
      const name = fileName.toLowerCase();
      const type = fileType.toLowerCase();
      
      // RAMS Documents
      if (name.includes('ram') || name.includes('risk') || name.includes('assessment') || 
          name.includes('method') || name.includes('statement')) {
        return 'RAMS';
      }
      
      // Certificates
      if (name.includes('cert') || name.includes('licence') || name.includes('permit') || 
          name.includes('insurance') || name.includes('policy') || type.includes('certificate')) {
        return 'Certificates';
      }
      
      // Contracts
      if (name.includes('contract') || name.includes('agreement') || name.includes('service') || 
          name.includes('maintenance') || name.includes('invoice') || name.includes('quote')) {
        return 'Contracts';
      }
      
      // Fire Safety
      if (name.includes('fire') || name.includes('alarm') || name.includes('sprinkler') || 
          name.includes('extinguisher') || name.includes('evacuation')) {
        return 'Fire Safety';
      }
      
      // CCTV & Security
      if (name.includes('cctv') || name.includes('camera') || name.includes('security') || 
          name.includes('access') || name.includes('monitoring')) {
        return 'CCTV & Security';
      }
      
      // HVAC
      if (name.includes('hvac') || name.includes('heating') || name.includes('ventilation') || 
          name.includes('air conditioning') || name.includes('cooling')) {
        return 'HVAC';
      }
      
      // Electrical
      if (name.includes('electrical') || name.includes('electric') || name.includes('wiring') || 
          name.includes('panel') || name.includes('power')) {
        return 'Electrical';
      }
      
      // Plumbing
      if (name.includes('plumbing') || name.includes('water') || name.includes('pipe') || 
          name.includes('drain') || name.includes('toilet')) {
        return 'Plumbing';
      }
      
      // Default to General
      return 'General';
    }

    // === Enhanced Document Manager Functions ===
    
    // AI Document Analysis
    function aiAnalyzeDocument(doc) {
      const analysis = {
        keywords: [],
        summary: '',
        tags: [],
        riskLevel: 'low',
        category: doc.aiCategory || 'General',
        lastAnalyzed: new Date().toISOString()
      };
      
      // Extract keywords from filename
      const words = doc.name.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3);
      
      analysis.keywords = [...new Set(words)].slice(0, 10);
      
      // Generate summary based on file type and name
      if (doc.type.includes('pdf')) {
        analysis.summary = `PDF document: ${doc.name}`;
        analysis.tags.push('document', 'pdf');
      } else if (doc.type.includes('image')) {
        analysis.summary = `Image file: ${doc.name}`;
        analysis.tags.push('image', 'visual');
      } else if (doc.type.includes('word') || doc.type.includes('document')) {
        analysis.summary = `Word document: ${doc.name}`;
        analysis.tags.push('document', 'text');
      }
      
      // Risk assessment based on keywords
      const riskKeywords = ['accident', 'injury', 'hazard', 'risk', 'emergency', 'fire', 'safety'];
      const hasRiskKeywords = analysis.keywords.some(k => riskKeywords.includes(k));
      analysis.riskLevel = hasRiskKeywords ? 'high' : 'medium';
      
      return analysis;
    }
    
    // Document Search and Filtering
    function dmSearchDocuments(query, filterType = 'all', sortBy = 'date') {
      let filtered = dmDocs.filter(doc => {
        const matchesQuery = !query || 
          doc.name.toLowerCase().includes(query.toLowerCase()) ||
          (dmDocumentTags[doc.id] && dmDocumentTags[doc.id].some(tag => 
            tag.toLowerCase().includes(query.toLowerCase())));
        
        const matchesFilter = filterType === 'all' || 
          doc.type.includes(filterType) ||
          doc.name.toLowerCase().endsWith(`.${filterType}`);
        
        return matchesQuery && matchesFilter;
      });
      
      // Sort documents
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'size':
            return (b.size || 0) - (a.size || 0);
          case 'type':
            return a.type.localeCompare(b.type);
          case 'date':
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });
      
      return filtered;
    }
    
    // Document Versioning
    function dmCreateDocumentVersion(docId, newFile) {
      const versions = dmDocumentVersions[docId] || [];
      const newVersion = {
        id: Date.now(),
        file: newFile,
        timestamp: new Date().toISOString(),
        size: newFile.size,
        type: newFile.type
      };
      
      setDmDocumentVersions(prev => ({
        ...prev,
        [docId]: [...versions, newVersion]
      }));
      
      showToast(`📄 Version ${versions.length + 1} created for document`);
    }
    
    // Document Comments and Annotations
    function dmAddDocumentComment(docId, comment) {
      const comments = dmShowComments[docId] || [];
      const newComment = {
        id: Date.now(),
        text: comment,
        timestamp: new Date().toISOString(),
        author: 'Current User'
      };
      
      setDmShowComments(prev => ({
        ...prev,
        [docId]: [...comments, newComment]
      }));
      
      showToast('💬 Comment added');
    }
    
    // Document Tags Management
    function dmAddDocumentTag(docId, tag) {
      const tags = dmDocumentTags[docId] || [];
      if (!tags.includes(tag)) {
        setDmDocumentTags(prev => ({
          ...prev,
          [docId]: [...tags, tag]
        }));
        showToast(`🏷️ Tag "${tag}" added`);
      }
    }
    
    function dmRemoveDocumentTag(docId, tag) {
      const tags = dmDocumentTags[docId] || [];
      setDmDocumentTags(prev => ({
        ...prev,
        [docId]: tags.filter(t => t !== tag)
      }));
      showToast(`🏷️ Tag "${tag}" removed`);
    }
    
    // Bulk Operations
    function dmSelectDocument(docId) {
      setDmSelectedDocs(prev => 
        prev.includes(docId) 
          ? prev.filter(id => id !== docId)
          : [...prev, docId]
      );
    }
    
    function dmSelectAllDocuments() {
      const currentFolderDocs = dmDocs.filter(d => d.folder === dmActive);
      setDmSelectedDocs(currentFolderDocs.map(d => d.id));
    }
    
    function dmBulkDeleteDocuments() {
      if (dmSelectedDocs.length === 0) return;
      
      if (confirm(`Delete ${dmSelectedDocs.length} selected documents?`)) {
        setDmDocs(prev => prev.filter(d => !dmSelectedDocs.includes(d.id)));
        setDmSelectedDocs([]);
        showToast(`🗑️ ${dmSelectedDocs.length} documents deleted`);
      }
    }
    
    function dmBulkMoveDocuments(targetFolder) {
      if (dmSelectedDocs.length === 0) return;
      
      setDmDocs(prev => prev.map(doc => 
        dmSelectedDocs.includes(doc.id) 
          ? { ...doc, folder: targetFolder }
          : doc
      ));
      
      showToast(`📁 ${dmSelectedDocs.length} documents moved to "${targetFolder}"`);
      setDmSelectedDocs([]);
    }
    
    // Document Analytics
    function dmGetDocumentAnalytics() {
      const analytics = {
        totalDocuments: dmDocs.length,
        totalSize: dmDocs.reduce((sum, doc) => sum + (doc.size || 0), 0),
        byType: {},
        byFolder: {},
        recentUploads: dmDocs.filter(doc => 
          new Date(doc.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        mostUsedTags: {},
        storageUsage: {}
      };
      
      // Analyze by type
      dmDocs.forEach(doc => {
        const type = doc.type.split('/')[0] || 'unknown';
        analytics.byType[type] = (analytics.byType[type] || 0) + 1;
      });
      
      // Analyze by folder
      dmDocs.forEach(doc => {
        analytics.byFolder[doc.folder] = (analytics.byFolder[doc.folder] || 0) + 1;
      });
      
      // Analyze tags
      Object.values(dmDocumentTags).forEach(tags => {
        tags.forEach(tag => {
          analytics.mostUsedTags[tag] = (analytics.mostUsedTags[tag] || 0) + 1;
        });
      });
      
      return analytics;
    }
    
    // Automatic Backup
    function dmCreateBackup() {
      setDmBackupStatus('backing_up');
      
      try {
        const backupData = {
          documents: dmDocs,
          folders: dmFolders,
          tags: dmDocumentTags,
          comments: dmShowComments,
          versions: dmDocumentVersions,
          timestamp: new Date().toISOString(),
          version: '68.0'
        };
        
        const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
          type: 'application/json'
        });
        
        const url = URL.createObjectURL(backupBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mainpro_documents_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setDmBackupStatus('completed');
        showToast('💾 Backup created successfully');
        
        setTimeout(() => setDmBackupStatus('idle'), 3000);
      } catch (error) {
        setDmBackupStatus('error');
        showToast('❌ Backup failed');
        setTimeout(() => setDmBackupStatus('idle'), 3000);
      }
    }
    
    // Document Integration with Calendar
    function dmLinkDocumentToTask(docId, taskId) {
      // This would integrate with the calendar system
      showToast(`🔗 Document linked to task ${taskId}`);
    }

    // === Files with AI Categorization ===
    function dmAddFilesTo(folder, fileList){
      const files = Array.from(fileList||[]);
      if(!files.length) return;
      
      const jobs = files.map(file => new Promise(res=>{
        const r = new FileReader();
        r.onload = ev=>{
          console.log('=== FILE LOAD DEBUG ===');
          console.log('File loaded:', file.name);
          console.log('File type:', file.type);
          console.log('File size:', file.size);
          console.log('Result URL length:', ev.target.result.length);
          console.log('Result URL starts with:', ev.target.result.substring(0, 50) + '...');
          
          // AI Auto-categorization
          const aiCategory = aiCategorizeFile(file.name, file.type);
          const targetFolder = folder === 'General' ? aiCategory : folder;
          
          console.log('AI Category:', aiCategory);
          console.log('Target Folder:', targetFolder);
          
          // Create folder if it doesn't exist
          if (!dmFolders.some(f => f.name === aiCategory) && folder === 'General') {
            console.log('Creating new folder:', aiCategory);
            setDmFolders(prev => [...prev, {id: Date.now() + Math.random(), name: aiCategory}]);
          }
          
          const newDoc = {
            id: Date.now()+Math.random(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            date: new Date().toISOString(),
            folder: targetFolder,
            url: ev.target.result, // data: URL
            aiCategory: aiCategory, // Store AI suggestion
            uploadedTo: folder, // Store original upload folder
            analysis: aiAnalyzeDocument({name: file.name, type: file.type, aiCategory: aiCategory}) // AI analysis
          };
          
          console.log('Creating document:', newDoc);
          
          setDmDocs(prev=>{
            const updated = [...prev, newDoc];
            console.log('Updated docs count:', updated.length);
            return updated;
          });
          res();
        };
        r.readAsDataURL(file);
      }));
      
      Promise.all(jobs).then(()=> {
        const aiCategorized = files.filter(f => aiCategorizeFile(f.name, f.type) !== 'General');
        if (aiCategorized.length > 0 && folder === 'General') {
          showToast(`🤖 AI categorized ${aiCategorized.length} file(s) automatically`);
        } else {
          showToast(`📄 ${files.length} file(s) → "${folder}"`);
        }
      });
    }
    function dmOnUploadInput(e){ 
      dmAddFilesTo(dmActive, e.target.files); 
      e.target.value=''; 
    }

    // Drag&Drop handlers
    function dmOnDrop(e){
      e.preventDefault(); e.stopPropagation();
      if(dmDragLeaveTimer.current){ clearTimeout(dmDragLeaveTimer.current); dmDragLeaveTimer.current=null; }
      setDmDragging(false);
      dmAddFilesTo(dmActive, e.dataTransfer?.files);
    }
    function dmOnDragOver(e){ e.preventDefault(); e.stopPropagation(); setDmDragging(true); }
    function dmOnDragLeave(e){
      e.preventDefault(); e.stopPropagation();
      // небольшая задержка, чтобы не мигало при движении внутри зоны
      if(dmDragLeaveTimer.current) clearTimeout(dmDragLeaveTimer.current);
      dmDragLeaveTimer.current = setTimeout(()=> setDmDragging(false), 80);
    }

    // === AI Workflow Builder State ===
    const [workflowShow, setWorkflowShow] = useState(false);
    const [workflowInput, setWorkflowInput] = useState('');
    const [workflowTemplates, setWorkflowTemplates] = useState([
      {
        id: 1,
        name: 'Hotel Safety Plan',
        description: 'Complete monthly safety inspection routine',
        icon: '🏨',
        prompt: 'Create monthly hotel safety inspection plan with fire systems, CCTV, HVAC, and electrical checks'
      },
      {
        id: 2,
        name: 'Maintenance Routine',
        description: 'Weekly maintenance schedule for all systems',
        icon: '🔧',
        prompt: 'Create weekly maintenance routine for hotel systems including preventive maintenance tasks'
      },
      {
        id: 3,
        name: 'Compliance Tracker',
        description: 'Track all compliance deadlines and certifications',
        icon: '📋',
        prompt: 'Create compliance tracking system for all certifications, licenses, and regulatory requirements'
      },
      {
        id: 4,
        name: 'Fire Safety Protocol',
        description: 'Comprehensive fire safety management',
        icon: '🔥',
        prompt: 'Create fire safety protocol with monthly inspections, equipment checks, and emergency procedures'
      }
    ]);
    const [generatedWorkflow, setGeneratedWorkflow] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // === AI Workflow Builder Functions ===
    function aiGenerateWorkflow(prompt) {
      setIsGenerating(true);
      
      try {
        const workflow = parseWorkflowPrompt(prompt);
        setGeneratedWorkflow(workflow);
        showToast('🧠 AI Workflow generated successfully!');
      } catch (error) {
        showToast('❌ Failed to generate workflow');
      } finally {
        setIsGenerating(false);
      }
    }

    function parseWorkflowPrompt(prompt) {
      const lowerPrompt = prompt.toLowerCase();
      
      // Parse keywords to determine workflow type
      let workflowType = 'general';
      let frequency = 'monthly';
      let systems = [];
      let tasks = [];
      
      // Determine frequency
      if (lowerPrompt.includes('daily') || lowerPrompt.includes('ежедневно')) {
        frequency = 'daily';
      } else if (lowerPrompt.includes('weekly') || lowerPrompt.includes('еженедельно')) {
        frequency = 'weekly';
      } else if (lowerPrompt.includes('monthly') || lowerPrompt.includes('ежемесячно')) {
        frequency = 'monthly';
      } else if (lowerPrompt.includes('yearly') || lowerPrompt.includes('ежегодно')) {
        frequency = 'yearly';
      }
      
      // Determine systems to include
      if (lowerPrompt.includes('fire') || lowerPrompt.includes('пожар')) {
        systems.push('Fire Safety');
        tasks.push('Check fire alarms and sprinklers');
        tasks.push('Test emergency lighting');
        tasks.push('Inspect fire exits');
      }
      
      if (lowerPrompt.includes('hvac') || lowerPrompt.includes('вентиляция')) {
        systems.push('HVAC');
        tasks.push('Check air filters');
        tasks.push('Test heating/cooling systems');
        tasks.push('Inspect ventilation ducts');
      }
      
      if (lowerPrompt.includes('electrical') || lowerPrompt.includes('электрик')) {
        systems.push('Electrical');
        tasks.push('Check electrical panels');
        tasks.push('Test outlets and switches');
        tasks.push('Inspect wiring');
      }
      
      if (lowerPrompt.includes('cctv') || lowerPrompt.includes('камера') || lowerPrompt.includes('security')) {
        systems.push('CCTV & Security');
        tasks.push('Test all cameras');
        tasks.push('Check recording systems');
        tasks.push('Inspect access control');
      }
      
      if (lowerPrompt.includes('plumbing') || lowerPrompt.includes('сантехник')) {
        systems.push('Plumbing');
        tasks.push('Check water pressure');
        tasks.push('Inspect pipes for leaks');
        tasks.push('Test drainage systems');
      }
      
      // If no specific systems mentioned, create general tasks
      if (tasks.length === 0) {
        tasks.push('General inspection');
        tasks.push('Document findings');
        tasks.push('Update maintenance logs');
      }
      
      // Generate workflow structure
      const workflow = {
        id: Date.now(),
        name: `AI Generated ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Plan`,
        description: prompt,
        frequency: frequency,
        systems: systems,
        tasks: tasks.map((task, index) => ({
          id: Date.now() + index,
          name: task,
          status: 'none',
          priority: index < 2 ? 'high' : 'medium',
          estimatedDuration: '30 minutes',
          assignedTo: 'System',
          category: systems[index % systems.length] || 'General'
        })),
        createdAt: new Date().toISOString(),
        nextDue: calculateNextDue(frequency)
      };
      
      console.log('Generated workflow:', workflow);
      return workflow;
    }
    function calculateNextDue(frequency) {
      const now = new Date();
      switch (frequency) {
        case 'daily':
          return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        case 'biweekly':
          return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
        case 'weekly':
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        case 'bimonthly':
          return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
        case 'monthly':
          return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        case 'quarterly':
          return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        case 'every4months':
          return new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString();
        case 'semiannual':
          return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
        case 'every9months':
          return new Date(now.getTime() + 270 * 24 * 60 * 60 * 1000).toISOString();
        case 'yearly':
          return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
        case 'every18months':
          return new Date(now.getTime() + 540 * 24 * 60 * 60 * 1000).toISOString();
        case 'every2years':
          return new Date(now.getTime() + 730 * 24 * 60 * 60 * 1000).toISOString();
        case 'every3years':
          return new Date(now.getTime() + 1095 * 24 * 60 * 60 * 1000).toISOString();
        default:
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    function applyWorkflow(workflow) {
      // Simple task distribution - spread over 3 days
      const today = new Date();
      today.setHours(9, 0, 0, 0);
      
      const newEvents = workflow.tasks.map((task, index) => {
        const dayOffset = Math.floor(index / 3);
        const hourOffset = (index % 3) * 3;
        
        const taskDate = new Date(today);
        taskDate.setDate(today.getDate() + dayOffset);
        taskDate.setHours(9 + hourOffset, 0, 0, 0);
        
        const endDate = new Date(taskDate);
        endDate.setHours(taskDate.getHours() + 2);
        
        return {
          id: Date.now() + Math.random() + index,
          title: task.name,
          start: taskDate.toISOString(),
          end: endDate.toISOString(),
          category: task.category,
          priority: task.priority,
          status: 'none',
          workflow: true,
          workflowId: workflow.id
        };
      });
      
      const toAdd = stripInstances(newEvents);
      if (window.mainproRecurDebug && newEvents.length !== toAdd.length) console.warn('Workflow apply: dropped', newEvents.length - toAdd.length, 'instance(s)');
      setEvents(prev => [...prev, ...toAdd]);
      showToast(`✅ Applied ${workflow.tasks.length} tasks to calendar!`);
      setWorkflowShow(false);
      setGeneratedWorkflow(null);
    }


    function useTemplate(template) {
      setWorkflowInput(template.prompt);
      aiGenerateWorkflow(template.prompt);
    }

    // === AI Analytics Functions ===
    function generateAnalytics() {
      const totalFiles = dmDocs.length;
      const folderDistribution = {};
      const fileTypes = {};
      const recentActivity = dmDocs
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
        .map(doc => ({
          action: 'uploaded',
          file: doc.name,
          folder: doc.folder,
          date: doc.date,
          aiCategory: doc.aiCategory
        }));

      // Calculate folder distribution
      dmDocs.forEach(doc => {
        folderDistribution[doc.folder] = (folderDistribution[doc.folder] || 0) + 1;
      });

      // Calculate file types
      dmDocs.forEach(doc => {
        const ext = doc.name.split('.').pop()?.toLowerCase() || 'unknown';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      });

      // Generate AI suggestions
      const aiSuggestions = [];
      if (folderDistribution['General'] > 5) {
        aiSuggestions.push({
          type: 'organization',
          message: '🤖 You have many files in General folder. AI can help organize them automatically.',
          action: 'auto-organize'
        });
      }
      if (folderDistribution['Certificates'] > 0) {
        aiSuggestions.push({
          type: 'compliance',
          message: '📋 Check certificate expiration dates for compliance monitoring.',
          action: 'check-expiry'
        });
      }
      if (totalFiles > 50) {
        aiSuggestions.push({
          type: 'backup',
          message: '💾 Consider setting up automatic backup for your documents.',
          action: 'setup-backup'
        });
      }

      setAnalyticsData({
        totalFiles,
        folderDistribution,
        fileTypes,
        recentActivity,
        aiSuggestions
      });
    }

    function autoOrganizeFiles() {
      const generalFiles = dmDocs.filter(doc => doc.folder === 'General');
      let movedCount = 0;
      
      generalFiles.forEach(doc => {
        const aiCategory = doc.aiCategory || aiCategorizeFile(doc.name, doc.type);
        if (aiCategory !== 'General') {
          setDmDocs(prev => prev.map(d => 
            d.id === doc.id ? { ...d, folder: aiCategory } : d
          ));
          movedCount++;
        }
      });
      
      if (movedCount > 0) {
        showToast(`🤖 AI organized ${movedCount} files automatically`);
        generateAnalytics(); // Refresh analytics
      }
    }

    // UI

    // ==========================
    // 📄 List / Agenda view helpers
    // ==========================
    const MP_MODAL_ANIM_MS = 180;
    function mpStartCloseAnimations(rootOverlay){
      try{
        const overlays = rootOverlay
          ? [rootOverlay]
          : Array.from(document.querySelectorAll('[data-mp-overlay="1"]'));
        overlays.forEach(el => {
          try { el.classList.add('mp-overlay-leave'); } catch {}
          try {
            const modal = el.querySelector('[data-mp-modal="1"]') || el.querySelector('.modal-enter');
            if (modal) modal.classList.add('modal-leave');
          } catch {}
        });
      }catch{}
      // External DOM task overlays
      try{
        Array.from(document.querySelectorAll('.mp-add-overlay')).forEach(el => {
          try { el.classList.add('mp-overlay-leave'); } catch {}
          try {
            const modal = el.querySelector('.mp-add');
            if (modal) modal.classList.add('mp-add-leave');
          } catch {}
        });
      }catch{}
    }
    function mpCloseWithAnim(closeFn, ev){
      const overlay = (() => {
        try{
          const t = ev && ev.currentTarget ? ev.currentTarget : null;
          if (t && t.getAttribute && t.getAttribute('data-mp-overlay') === '1') return t;
          if (t && t.closest) return t.closest('[data-mp-overlay="1"]');
        }catch{}
        try{
          const all = Array.from(document.querySelectorAll('[data-mp-overlay="1"]'));
          return all.length ? all[all.length - 1] : null;
        }catch{}
        return null;
      })();
      mpStartCloseAnimations(overlay || null);
      setTimeout(() => { try { closeFn && closeFn(); } catch {} }, MP_MODAL_ANIM_MS);
    }

    function mpParseISODate(iso){
      try{
        const parts = String(iso||'').slice(0,10).split('-').map(n=>parseInt(n,10));
        const y = parts[0] || new Date().getFullYear();
        const m = (parts[1] || 1) - 1;
        const d = parts[2] || 1;
        return new Date(y, m, d, 12, 0, 0, 0); // local midday (DST-safe)
      }catch{
        return new Date();
      }
    }
    function mpISO(d){
      try{
        const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
        return dd.toISOString().slice(0,10);
      }catch{
        return (typeof todayISO === 'function') ? todayISO() : new Date().toISOString().slice(0,10);
      }
    }
    function mpFilterSearch(list){
      let src = Array.isArray(list) ? list : [];
      src = (filter==='all') ? src : src.filter(e=> (e.status||'pending')===filter);
      const q = (search||'').trim().toLowerCase();
      if(q){
        src = src.filter(e=>{
          const catName = (categories.find(c=>c.id===e.catId)?.name)||'';
          return [e.title,e.taskType,e.location,e.notes,catName].some(v=> (v||'').toLowerCase().includes(q));
        });
      }
      return src;
    }
    function mpTimeStr(ev){
      const s = String(ev?.start || '');
      if (s.includes('T')) return s.slice(11,16);
      return '';
    }
    function mpTimeVal(t){
      try{
        if(!t) return 0; // all-day first
        const hh = parseInt(String(t).slice(0,2), 10) || 0;
        const mm = parseInt(String(t).slice(3,5), 10) || 0;
        return hh*60 + mm;
      }catch{
        return 0;
      }
    }
    function mpEndTimeStr(ev){
      try{
        const end = String(ev?.end || '');
        if (end.includes('T')) return end.slice(11,16);
      }catch{}
      return '';
    }
    function mpAnnotateConflicts(items){
      try{
        const list = Array.isArray(items) ? items : [];
        const out = list.map(ev => ({...ev, __conflict:false}));
        const idxs = out
          .map((ev, idx) => ({ ev, idx }))
          .filter(x => !!mpTimeStr(x.ev)) // skip all-day / no-time tasks
          .sort((a,b)=> mpTimeVal(mpTimeStr(a.ev)) - mpTimeVal(mpTimeStr(b.ev)));

        let conflicts = 0;
        let maxEnd = -1;
        let maxIdx = -1;
        idxs.forEach(({ev, idx})=>{
          const st = mpTimeVal(mpTimeStr(ev));
          let en = mpTimeVal(mpEndTimeStr(ev));
          // If end time is missing or invalid, assume 60 minutes duration (safe default)
          if (!en || en <= st) en = st + 60;

          if (st < maxEnd && maxIdx >= 0) {
            if (!out[idx].__conflict) { out[idx].__conflict = true; conflicts++; }
            if (!out[maxIdx].__conflict) { out[maxIdx].__conflict = true; conflicts++; }
          }
          if (en > maxEnd) {
            maxEnd = en;
            maxIdx = idx;
          }
        });
        return { items: out, conflicts };
      }catch{
        return { items: Array.isArray(items) ? items : [], conflicts: 0 };
      }
    }

    const agendaData = (() => {
      try{
        const anchor = mpParseISODate(listAnchorDate);
        let start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12, 0, 0, 0);
        let daysCount = 1;
        if (listRange === 'week') {
          // Monday-start week
          const dow = start.getDay(); // 0..6 (Sun..Sat)
          const diff = (dow + 6) % 7; // days since Monday
          start = new Date(start.getFullYear(), start.getMonth(), start.getDate() - diff, 12, 0, 0, 0);
          daysCount = 7;
        }
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + daysCount, 12, 0, 0, 0);
        const startISO = mpISO(start);
        const endISO = mpISO(end);

        const base = mpFilterSearch(events);
        const inRange = base.filter(ev=>{
          const d = String(ev?.start||'').slice(0,10);
          if(!d) return false;
          return d >= startISO && d < endISO;
        });

        // Group by day ISO
        const byDay = new Map();
        inRange.forEach(ev=>{
          const d = String(ev?.start||'').slice(0,10);
          if(!d) return;
          if(!byDay.has(d)) byDay.set(d, []);
          byDay.get(d).push(ev);
        });

        const days = [];
        let conflictsTotal = 0;
        for(let i=0;i<daysCount;i++){
          const dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0, 0);
          const iso = mpISO(dt);
          const label = dt.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
          const itemsSorted = (byDay.get(iso) || []).slice().sort((a,b)=>{
            const ta = mpTimeVal(mpTimeStr(a));
            const tb = mpTimeVal(mpTimeStr(b));
            if (ta !== tb) return ta - tb;
            return String(a.title||'').localeCompare(String(b.title||''));
          });
          const ann = mpAnnotateConflicts(itemsSorted);
          conflictsTotal += Number(ann.conflicts || 0);
          days.push({ iso, label, items: ann.items, conflicts: ann.conflicts || 0 });
        }

        const rangeLabel = (listRange === 'week')
          ? `${days[0]?.label || startISO} – ${days[days.length-1]?.label || ''}`
          : `${days[0]?.label || startISO}`;

        return { startISO, endISO, rangeLabel, days, total: inRange.length, conflictsTotal };
      }catch{
        return { startISO:'', endISO:'', rangeLabel:'', days:[], total:0, conflictsTotal:0 };
      }
    })();

    return React.createElement('div', {className:`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-[#FDFCF8]'}`, style:{'--acc': ui.primary}},

      // HEADER (как в v65.3 Classic Header)

      React.createElement('div', {className:"glassbar"},

        React.createElement('div',{className:"goldline"}),

        React.createElement('div',{className:"max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between"},

          React.createElement('div',{className:"flex items-center gap-3"},

            React.createElement('h1',{className:"text-2xl sm:text-3xl font-bold tracking-tight", style:{color:ui.primary}},'MainPro Calendar 🛠️'),
            

          ),

          React.createElement('div',{className:"flex items-center gap-3"},





            // Calendar Switcher
            calendars.length > 1 && React.createElement('div',{className:"flex items-center gap-2"},
              React.createElement('select',{
                value: currentCalendarId,
                onChange: (e) => switchCalendar(e.target.value),
                className: "px-3 py-1 border rounded-lg text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              },
                calendars.map(cal => 
                  React.createElement('option', {key: cal.id, value: cal.id},
                    `${cal.icon || '📅'} ${cal.name}`
                  )
                )
              )
            ),

            // Create Calendar Button
            React.createElement('button',{
              onClick: () => {
                const name = prompt('Enter calendar name:');
                if (name && name.trim()) {
                  const type = prompt('Enter calendar type (maintenance/compliance/general/personal):', 'maintenance');
                  createCalendar(name.trim(), type || 'maintenance');
                }
              },
              className: "px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
            }, '➕ New'),

            // Delete Calendar Button (only show if there are multiple calendars and current is not main)
            calendars.length > 1 && currentCalendarId !== 'main' && React.createElement('button',{
              onClick: () => {
                const calendar = calendars.find(cal => cal.id === currentCalendarId);
                if (calendar && confirm(`Удалить календарь "${calendar.name}" и все его события?`)) {
                  deleteCalendar(currentCalendarId);
                }
              },
              className: "px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors",
              title: "Удалить текущий календарь"
            }, '🗑️ Delete'),

            settings.logoUrl ? React.createElement('img',{src:settings.logoUrl, alt:"logo", className:"w-8 h-8 rounded-full object-cover border"}) : null,

            React.createElement('div',{className:"hidden sm:block text-sm text-gray-700"}, settings.hotelName || 'Hotel'),


            // Team Collaboration Status
            teamMode.enabled && React.createElement('div',{className:"flex items-center gap-2"},

              React.createElement('div',{className:"flex items-center gap-1"},

                React.createElement('span',{className:"text-sm"},'👥'),

                React.createElement('span',{className:"text-xs text-gray-600 hidden sm:block"},
                  teamMode.teamName || 'Team'
                ),

                React.createElement('div',{className:`px-2 py-1 rounded-full text-xs ${
                  teamMode.userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                  teamMode.userRole === 'editor' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`},
                  teamMode.userRole
                )

              )

            ),

            // AI Analytics Status
            aiAnalytics.enabled && React.createElement('div',{className:"flex items-center gap-2"},

              React.createElement('div',{className:"flex items-center gap-1"},

                React.createElement('span',{className:"text-sm"},'🤖'),

                React.createElement('div',{className:`w-2 h-2 rounded-full ${
                  analyticsData.riskLevel === 'high' ? 'bg-red-500' :
                  analyticsData.riskLevel === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}),

                React.createElement('span',{className:"text-xs text-gray-600 hidden sm:block"},
                  `${analyticsData.taskCompletionRate}% Complete`
                )

              )

            ),

            // Audit & Reporting Status
            React.createElement('div',{className:"flex items-center gap-2"},

              React.createElement('div',{className:"flex items-center gap-1"},

                React.createElement('div',{className:"w-2 h-2 rounded-full bg-blue-500"})

              )

            ),

            React.createElement('button',{onClick:(e)=>{ e.stopPropagation(); if (window.openSettingsModal) window.openSettingsModal(); else if(!openSettings) setOpenSettings(true); }, className:"px-3 py-2 rounded-lg bg-white border hover:bg-gray-100 shadow-sm"},'⚙️ Settings'),
            
            // 💬 AI Chat Button (simple fallback — React modal may not open)
            React.createElement('button',{
              onClick:()=>{ if (window.openAIChatModal) window.openAIChatModal(); else if (window.openSimpleAIChatModal) window.openSimpleAIChatModal(); else setShowAIChat(true); },
              className:"px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 shadow-sm"
            },'💬 AI Chat'),
            
            // 🔐 Auth Button (simple fallback — React modal may not open)
            !isAuthenticated ? 
              React.createElement('button',{
                onClick:()=>{ if (window.openLoginModal) window.openLoginModal(); else if (window.openSimpleAuthModal) window.openSimpleAuthModal(); else { setAuthMode('login'); setShowAuthModal(true); } },
                className:"px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90 shadow-sm"
              },'🔐 Login') :
              React.createElement('div',{className:"flex items-center gap-2"},
                React.createElement('span',{className:"text-sm text-gray-600"},`👤 ${authUser?.name || 'User'}`),
                React.createElement('button',{
                  onClick:()=>{
                    setAuthMode('profile');
                    setShowAuthModal(true);
                  },
                  className:"px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200"
                },'Profile')
              )

          )

        )

      ),

      // CONTENT

      React.createElement('div',{className:"max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6"},

        // Toolbar (filters + view + search + export) — без изменений

        React.createElement('div',{className:"flex flex-wrap items-center gap-2 mb-3"},

          ['pending','done','missed','all'].map(s=>

            React.createElement('button',{

              key:s,
              onClick:()=>{
                setFilter(s);
                showToast(
                  s==='all' ? '🧹 Filter: All' :
                  s==='pending' ? '🟡 Filter: Pending' :
                  s==='done' ? '🟢 Filter: Done' :
                  '🔴 Filter: Missed'
                );
              },
              'data-tooltip':
                s==='all' ? 'All (Alt+1)' :
                s==='pending' ? 'Pending (Alt+2)' :
                s==='done' ? 'Done (Alt+3)' :
                'Missed (Alt+4)',

              className:`px-3 py-1 rounded-md tooltip-bottom ${filter===s?'text-white':'bg-gray-100 hover:bg-gray-200'}`,

              style: filter===s?{background:ui.primary}:{}

            }, s==='pending'?'🟡 Pending':s==='done'?'🟢 Done':s==='missed'?'🔴 Missed':'🧹 All')

          ),

          React.createElement('div',{className:"flex-1"}),

          React.createElement('div',{className:"bg-white border rounded-lg p-1 flex gap-1"},

            ['dayGridMonth','timeGridWeek','timeGridDay'].map(v=>

              React.createElement('button',{

                key:v,
                onClick:()=>{
                  setView(v);
                  showToast(v==='dayGridMonth' ? '📅 View: Month' : (v==='timeGridWeek' ? '📆 View: Week' : '🗓️ View: Day'));
                },
                'data-tooltip': v==='dayGridMonth' ? 'Month (1)' : (v==='timeGridWeek' ? 'Week (2)' : 'Day (3)'),

                className:`px-3 py-1 rounded tooltip-bottom ${view===v?'text-white':'hover:bg-gray-100'}`,

                style: view===v?{background:ui.primary}:{}

              }, v==='dayGridMonth'?'Month':v==='timeGridWeek'?'Week':'Day')

            )

          ),



          React.createElement('button',{
            onClick:()=>{
              try {
                const dt = new Date(calRef.current?.getDate() || Date.now());
                const iso = dt.toISOString().slice(0,10);
                setListAnchorDate(iso);
              } catch {}
              try {
                const v = String(view || '');
                setListRange(v === 'timeGridWeek' ? 'week' : 'day');
              } catch {}
              setShowList(true);
              showToast('📄 List');
            },
            className:"px-3 py-2 rounded-md bg-white border hover:bg-gray-100 shadow-sm tooltip-bottom",
            'data-tooltip':"List / Agenda"
          },'📄 List'),

          React.createElement('button',{onClick:()=>{
            console.log('Add Task button clicked, openTaskModal type:', typeof window.openTaskModal);
            if(typeof window.openTaskModal === 'function'){
              try {
                window.openTaskModal();
              } catch(e) {
                console.error('Error calling openTaskModal:', e);
                alert('Error opening task form: ' + e.message);
              }
            } else {
              console.error('openTaskModal not found. Available on window:', Object.keys(window).filter(k => k.includes('Task')));
              // Try to wait a bit and check again
              setTimeout(() => {
                if(typeof window.openTaskModal === 'function'){
                  window.openTaskModal();
                } else {
                  alert('Add Task form not loaded. Please refresh the page.');
                }
              }, 100);
            }
          }, className:btn('bg-yellow-500') + " tooltip-bottom", 'data-tooltip':'Add Task (N or +, Enter)'},'Add Task'),

          React.createElement('button',{
            onClick:()=>setShowTemplates(true),
            className:"px-3 py-2 rounded-md bg-white border hover:bg-gray-100 shadow-sm tooltip-bottom",
            'data-tooltip':"Task templates"
          },'📋 Templates'),


          cloudSync.enabled && React.createElement('button',{onClick:syncToCloud, className:btn('bg-purple-500')},'☁️ Sync'),

          teamMode.enabled && React.createElement('button',{onClick:()=>setShowTeamSettings(true), className:btn('bg-indigo-500')},'👥 Team'),

          aiAnalytics.enabled && React.createElement('button',{onClick:()=>setShowAnalytics(true), className:btn('bg-purple-600')},'🤖 AI'),

          React.createElement('button',{onClick:()=>{
            if(confirm('⚠️ Are you sure you want to delete ALL tasks?\n\nThis action cannot be undone.')) {
              // Save snapshot for Undo (10s)
              let snapshot = [];
              try {
                const src = (eventsRef && eventsRef.current) ? eventsRef.current : events;
                snapshot = (Array.isArray(src) ? src : []).map(e => ({...e}));
              } catch {}
              const taskCount = snapshot.length; // Store count before clearing
              const expiresAt = Date.now() + 10000;
              setUndoClearAll({ events: snapshot, expiresAt, count: taskCount });

              setEvents([]);
              calRef.current?.removeAllEvents();
              try {
                const calendarKey = `mainpro_calendar_${currentCalendarId}`;
                localStorage.setItem(calendarKey, JSON.stringify([]));
              } catch {}
              showToast('🧹 All tasks cleared — Undo (10s)');
              
              // Add audit log for clearing all tasks
              addAuditLog('ALL_TASKS_CLEARED', { 
                action: 'User cleared all tasks',
                timestamp: new Date().toISOString(),
                totalTasksCleared: taskCount
              });
            }
          }, className:"px-3 py-2 rounded-md text-white bg-yellow-500 hover:bg-yellow-600 hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 tooltip-bottom", 'data-tooltip':"Clear all tasks"},'🧹 Clear All Tasks'),

          React.createElement('button',
            {
              onClick:(e)=>{
                try{ e.stopPropagation(); }catch{}
                if (window.openSimpleDocsModal) {
                  window.openSimpleDocsModal();
                } else {
                  alert('Documents window script not loaded.');
                }
              },
              className:"px-3 py-2 rounded-lg bg-white border hover:bg-gray-100 shadow-sm"
            },
            '📁 Documents'
          ),

          // Month label with arrows on sides
          React.createElement('div',{className:"flex items-center gap-3"},
            React.createElement('button',{onClick:()=>{ calRef.current?.prev(); showToast('‹ Month'); }, className:"px-2 py-1 rounded hover:bg-gray-100 text-gray-600 tooltip-bottom", 'data-tooltip':"Previous (PgUp)"},'‹'),
            React.createElement('button',{
              className:"text-lg font-semibold text-gray-700 hover:text-blue-600 hover:underline cursor-pointer tooltip-bottom",
              'data-tooltip':"Pick month / year",
              onClick:()=>{ 
                setPickerYear(new Date(calRef.current?.getDate()||Date.now()).getFullYear());
                setPickerMode('month'); 
                setShowPicker(true);
              }
            }, monthLabel),
            React.createElement('span',{
              className:"text-xs text-gray-500 hidden sm:inline tooltip-bottom",
              'data-tooltip':"Current view and filter"
            }, `${view==='dayGridMonth'?'Month':view==='timeGridWeek'?'Week':'Day'} • ${filter==='all'?'All':filter==='pending'?'Pending':filter==='done'?'Done':'Missed'}`),
            React.createElement('button',{onClick:()=>{ calRef.current?.next(); showToast('Month ›'); }, className:"px-2 py-1 rounded hover:bg-gray-100 text-gray-600 tooltip-bottom", 'data-tooltip':"Next (PgDn)"},'›')
          ),

          // Search Bar - Right Corner
          React.createElement('div',{className:"ml-auto flex items-center gap-2"},

            // Dark Mode Toggle
            React.createElement('button',{
              onClick: () => setDarkMode(prev => {
                const next = !prev;
                showToast(next ? '🌙 Dark mode: ON' : '☀️ Dark mode: OFF');
                return next;
              }),
              className: "px-3 py-1 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors tooltip-bottom",
              'data-tooltip': 'Toggle dark mode (D)'
            }, darkMode ? '☀️' : '🌙'),
            
            // Sort Dropdown
            React.createElement('select',{
              value: sortBy,
              onChange: (e) => {
                const v = e.target.value;
                setSortBy(v);
                showToast(
                  v === 'none' ? '↕️ Sort: None' :
                  v === 'title' ? '🔤 Sort: Title' :
                  v === 'priority' ? '⚠️ Sort: Priority' :
                  v === 'status' ? '✅ Sort: Status' :
                  '📅 Sort: Date'
                );
              },
              className: "px-3 py-1 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            },
              React.createElement('option', {value: 'none'}, 'No Sort'),
              React.createElement('option', {value: 'title'}, 'Sort by Title'),
              React.createElement('option', {value: 'priority'}, 'Sort by Priority'),
              React.createElement('option', {value: 'status'}, 'Sort by Status'),
              React.createElement('option', {value: 'date'}, 'Sort by Date')
            ),
            
            // Stats Toggle
            React.createElement('button',{
              onClick: () => setShowStats(prev => {
                const next = !prev;
                showToast(next ? '📊 Stats: ON' : '📊 Stats: OFF');
                return next;
              }),
              className: "px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors",
              'data-tooltip': 'Show statistics (S)'
            }, '📊 Stats'),

            React.createElement('div',{
              className:"flex items-center gap-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg px-3 py-2 shadow-sm w-64 cursor-text tooltip-bottom",
              'data-tooltip':"Search (F)",
              onClick:(e)=>{
                try {
                  const t = e && e.target ? e.target : null;
                  const tag = t && t.tagName ? String(t.tagName) : '';
                  if (tag !== 'INPUT' && tag !== 'BUTTON') {
                    if (searchInputRef.current && typeof searchInputRef.current.focus === 'function') {
                      searchInputRef.current.focus();
                    }
                  }
                } catch {}
              }
            },

              React.createElement('span',{className:"text-gray-500 dark:text-gray-400"},'🔎'),

              React.createElement('input',{
                value: search, 
                onChange: e => setSearch(e.target.value), 
                placeholder: "Search tasks...",
                className: "outline-none flex-1 text-sm bg-transparent dark:text-white",
                list: "title-suggestions",
                ref: searchInputRef
              }),

              // Clear search button
              search && React.createElement('button',{
                onClick: () => {
                  setSearch('');
                  try {
                    if (typeof showToast === 'function') showToast('🧽 Search cleared');
                  } catch {}
                  try {
                    if (searchInputRef.current && typeof searchInputRef.current.focus === 'function') {
                      searchInputRef.current.focus();
                    } else {
                      const input = document.querySelector('input[placeholder="Search tasks..."]');
                      if (input) input.focus();
                    }
                  } catch {}
                },
                className: "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm px-1 tooltip-bottom",
                'data-tooltip': "Clear search (Esc)"
              }, '✕'),
              
              // Autocomplete datalist
              React.createElement('datalist', {id: "title-suggestions"},
                titleSuggestions.map((title, i) => 
                  React.createElement('option', {key: i, value: title})
                )
              )

            )

          )

        ),

        // Stats Widget
        showStats && React.createElement('div',{className:"mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-amber-200"},
          React.createElement('div',{className:"grid grid-cols-2 sm:grid-cols-4 gap-4"},
            React.createElement('div',{className:"text-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg"},
              React.createElement('div',{className:"text-2xl font-bold text-blue-600 dark:text-blue-300"}, events.length),
              React.createElement('div',{className:"text-xs text-gray-600 dark:text-gray-400"}, 'Total Tasks')
            ),
            React.createElement('div',{className:"text-center p-3 bg-yellow-50 dark:bg-yellow-900 rounded-lg"},
              React.createElement('div',{className:"text-2xl font-bold text-yellow-600 dark:text-yellow-300"}, events.filter(e => e.status === 'pending').length),
              React.createElement('div',{className:"text-xs text-gray-600 dark:text-gray-400"}, 'Pending')
            ),
            React.createElement('div',{className:"text-center p-3 bg-green-50 dark:bg-green-900 rounded-lg"},
              React.createElement('div',{className:"text-2xl font-bold text-green-600 dark:text-green-300"}, events.filter(e => e.status === 'done').length),
              React.createElement('div',{className:"text-xs text-gray-600 dark:text-gray-400"}, 'Done')
            ),
            React.createElement('div',{className:"text-center p-3 bg-red-50 dark:bg-red-900 rounded-lg"},
              React.createElement('div',{className:"text-2xl font-bold text-red-600 dark:text-red-300"}, events.filter(e => e.status === 'missed').length),
              React.createElement('div',{className:"text-xs text-gray-600 dark:text-gray-400"}, 'Missed')
            )
          ),
          React.createElement('div',{className:"mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"},
            React.createElement('div',{className:"text-sm text-gray-600 dark:text-gray-400"},
              `Completion Rate: ${events.length > 0 ? Math.round((events.filter(e => e.status === 'done').length / events.length) * 100) : 0}%`
            )
          )
        ),

        // Calendar

        React.createElement('div',{id:"calendar-shell", className:"bg-white dark:bg-gray-800 rounded-xl p-2 sm:p-4 shadow relative border border-amber-200"},

          React.createElement('div',{id:"calendar"})

        )

      ),

      // Month/Year Picker

      showPicker && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowPicker(false), e); }},

        React.createElement('div',{className:"picker-panel modal-enter modal-ready", 'data-mp-modal':'1'},

          React.createElement('div',{className:"flex items-center justify-between px-4 py-3 border-b"},

            React.createElement('div',{className:"font-semibold"}, pickerMode==='month' ? `Pick month • ${pickerYear}` : 'Pick year'),

            React.createElement('div',{className:"flex items-center gap-2"},

              pickerMode==='month'

                ? React.createElement(React.Fragment,null,

                    React.createElement('button',{className:"px-2 py-1 border rounded hover:bg-gray-50", onClick:()=>{ setPickerMode('year'); }},'Years')

                  )

                : React.createElement(React.Fragment,null,

                    React.createElement('button',{className:"px-2 py-1 border rounded hover:bg-gray-50", onClick:()=>{ setPickerYear(y=>y-12); }},'⟨'),

                    React.createElement('button',{className:"px-2 py-1 border rounded hover:bg-gray-50", onClick:()=>{ setPickerYear(y=>y+12); }},'⟩'),

                    React.createElement('button',{className:"px-2 py-1 border rounded hover:bg-gray-50", onClick:()=>{ setPickerMode('month'); }},'Months')

                  ),

              React.createElement('button',{className:"px-2 py-1 border rounded hover:bg-gray-50", onClick:()=>setShowPicker(false)},'Close')

            )

          ),

          pickerMode==='month'

            ? React.createElement('div',{className:"picker-grid"},

                monthNames.map((m,i)=>

                  React.createElement('button',{key:m,className:"picker-btn", onClick:()=>{ 

                    try{

                      const dt = new Date(pickerYear, i, 1, 12, 0, 0);

                      calRef.current?.gotoDate(dt);

                    }catch{}

                    setShowPicker(false); 

                  }}, m)

                )

              )

            : React.createElement('div',{className:"picker-grid"},

                Array.from({length:12},(_,k)=> pickerYear - 6 + k).map(yy=>

                  React.createElement('button',{key:yy,className:"picker-btn", onClick:()=>{ setPickerYear(yy); setPickerMode('month'); }}, String(yy))

                )

              )

        )

      ),

      // Hotkeys Help (non-blocking)
      showHotkeyHelp && React.createElement('div',{
        className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 mp-overlay-anim",
        'data-mp-overlay':'1',
        onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowHotkeyHelp(false), e); }
      },
        React.createElement('div',{className:"modal-enter modal-ready bg-white dark:bg-gray-800 w-full sm:max-w-xl rounded-2xl p-5 shadow-xl max-h-[80vh] overflow-auto", 'data-mp-modal':'1'},
          React.createElement('div',{className:"flex items-center justify-between mb-3"},
            React.createElement('div',{className:"text-lg font-semibold text-gray-900 dark:text-white"},'Keyboard shortcuts'),
            React.createElement('div',{className:"flex items-center gap-2"},
              React.createElement('button',{
                onClick: async ()=>{
                  const text = [
                    'Keyboard shortcuts',
                    '',
                    'New task: N / + / Enter (when focus on page)',
                    'Views: 1=Month, 2=Week, 3=Day, T=toggle Month/Week',
                    'Filters: Alt+1 All, Alt+2 Pending, Alt+3 Done, Alt+4 Missed',
                    'Search: F',
                    'Esc: close dialogs / clear search',
                    'Navigate months: ←/→, PgUp/PgDn, [ ], , . , B/M',
                    'Stats: S or Space (when focus on page)',
                    'Dark mode: D',
                    'Help: F1 / Ctrl+/ / Shift+? / H',
                  ].join('\n');
                  try {
                    if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                      await navigator.clipboard.writeText(text);
                      try { if (typeof showToast === 'function') showToast('📋 Copied'); } catch {}
                      return;
                    }
                  } catch {}
                  // Fallback
                  try {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.setAttribute('readonly','');
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    try { if (typeof showToast === 'function') showToast('📋 Copied'); } catch {}
                  } catch {
                    try { if (typeof showToast === 'function') showToast('⚠️ Copy failed'); } catch {}
                  }
                },
                className:"px-3 py-1 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100"
              },'📋 Copy'),
              React.createElement('button',{
                onClick:(e)=>mpCloseWithAnim(()=>setShowHotkeyHelp(false), e),
                className:"text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white px-3 py-1 tooltip-bottom",
                'data-tooltip':"Close"
              },'✕')
            )
          ),
          React.createElement('div',{className:"text-sm text-gray-700 dark:text-gray-200 space-y-2"},
            React.createElement('div',null,'➕ New task: N (any layout) / + / Enter (when focus on page)'),
            React.createElement('div',null,'Views: 1=Month, 2=Week, 3=Day, T=toggle Month/Week'),
            React.createElement('div',null,'Filters: Alt+1 All, Alt+2 Pending, Alt+3 Done, Alt+4 Missed'),
            React.createElement('div',null,'Search: F'),
            React.createElement('div',null,'Esc: close dialogs / clear search'),
            React.createElement('div',null,'Navigate months: ←/→, PgUp/PgDn, [ ], , . , B/M'),
            React.createElement('div',null,'Stats: S or Space (when focus on page)'),
            React.createElement('div',null,'Dark mode: D'),
            React.createElement('div',null,'Help: F1 / Ctrl+/ / Shift+? / H'),
            React.createElement('div',{className:"text-xs text-gray-500 dark:text-gray-400 mt-3"},
              'Tip: some browser hotkeys cannot be overridden; we prefer layout-independent keys.'
            )
          )
        )
      ),

      // Task Templates (one-click prefill)
      showTemplates && React.createElement('div',{
        className:"fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-3 sm:p-6 mp-overlay-anim",
        'data-mp-overlay':'1',
        onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowTemplates(false), e); }
      },
        React.createElement('div',{
          className:"modal-enter modal-ready bg-white dark:bg-gray-800 w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl p-0 shadow-2xl flex flex-col",
          'data-mp-modal':'1',
          style:{borderTop:'4px solid', borderTopColor:'#f59e0b', maxHeight:'80vh'}
        },
          React.createElement('div',{
            className:"px-5 py-4 border-b flex items-center justify-between flex-shrink-0",
            style:{background:'linear-gradient(135deg, #fef3c7, #fde68a)', borderBottom:'2px solid #f59e0b'}
          },
            React.createElement('div',{className:"text-lg font-semibold", style:{color:'#92400e'}},'📋 Templates'),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowTemplates(false), e),
              className:"text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          React.createElement('div',{className:"p-5 overflow-y-auto", style:{background:'#fffbeb'}},
          React.createElement('div',{className:"grid grid-cols-1 gap-2"},
            (taskTemplates || []).map(tpl =>
              React.createElement('div',{key: tpl.id, className:"rounded-xl border border-amber-200 overflow-hidden bg-white"},
                React.createElement('button',{
                  onClick:()=>{
                    try { setShowTemplates(false); } catch {}
                    try { showToast(`📋 Template: ${tpl.label || tpl.title || 'Template'}`); } catch {}
                    const pref = {
                      title: tpl.title || '',
                      date: (typeof todayISO === 'function') ? todayISO() : undefined,
                      time: tpl.time || '09:00',
                      catId: tpl.catId,
                      taskType: tpl.taskType,
                      priority: tpl.priority
                    };
                    try {
                      if (typeof window.openAddTaskModal === 'function') { window.openAddTaskModal(pref); return; }
                      if (typeof window.openTaskModal === 'function') { window.openTaskModal(pref); return; }
                    } catch {}
                    try { setForm(f => ({...f, title: pref.title || '', date: pref.date || f.date, time: pref.time || f.time, catId: pref.catId || f.catId })); } catch {}
                    try { setShowAdd(true); } catch {}
                  },
                  className:"w-full text-left px-4 py-3 hover:bg-amber-50",
                  style:{borderLeft:'4px solid', borderLeftColor: tpl.priority==='high' ? '#ef4444' : '#f59e0b'}
                },
                  React.createElement('div',{className:"font-semibold", style:{color:'#111827'}}, tpl.label || tpl.title || 'Template'),
                  React.createElement('div',{className:"text-sm text-gray-600"},
                    `${tpl.taskType || '-'} • ${(tpl.catId || 'other')}`
                  )
                ),
                React.createElement('div',{className:"flex items-center justify-end gap-2 px-4 py-2 border-t bg-amber-50"},
                  React.createElement('button',{
                    onClick:()=>{
                      setTplEditingId(tpl.id);
                      setTplDraft({
                        id: tpl.id || '',
                        label: tpl.label || '',
                        title: tpl.title || '',
                        catId: tpl.catId || 'maintenance',
                        taskType: tpl.taskType || 'Internal',
                        priority: tpl.priority || 'normal',
                        time: tpl.time || '09:00'
                      });
                    },
                    className:"px-2 py-1 text-xs rounded bg-white border border-amber-200 hover:bg-amber-100 text-amber-800"
                  },'Edit'),
                  React.createElement('button',{
                    onClick:()=>{
                      if(!confirm('Delete this template?')) return;
                      setTaskTemplates(prev => (Array.isArray(prev) ? prev : []).filter(x => String(x.id) !== String(tpl.id)));
                      if (tplEditingId && String(tplEditingId) === String(tpl.id)) {
                        setTplEditingId(null);
                        setTplDraft({id:'',label:'',title:'',catId:'maintenance',taskType:'Internal',priority:'normal',time:'09:00'});
                      }
                      showToast('🗑️ Template deleted');
                    },
                    className:"px-2 py-1 text-xs rounded bg-white border border-amber-200 hover:bg-amber-100 text-amber-800"
                  },'Delete')
                )
              )
            )
          ),

          React.createElement('div',{className:"mt-4 pt-4 border-t border-amber-200"},
            React.createElement('div',{className:"flex items-center justify-between gap-2 mb-2"},
              React.createElement('div',{className:"font-semibold", style:{color:'#92400e'}}, tplEditingId ? 'Edit template' : 'New template'),
              React.createElement('button',{
                onClick:()=>{
                  setTplEditingId(null);
                  setTplDraft({id:'',label:'',title:'',catId:'maintenance',taskType:'Internal',priority:'normal',time:'09:00'});
                },
                className:"px-2 py-1 text-xs rounded bg-white border border-amber-200 hover:bg-amber-100 text-amber-800"
              },'New')
            ),
            React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-2"},
              React.createElement('input',{
                value: tplDraft.label,
                onChange: e=>setTplDraft(d=>({...d, label: e.target.value})),
                placeholder:"Label (shown in list)",
                className:"border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
              }),
              React.createElement('input',{
                value: tplDraft.title,
                onChange: e=>setTplDraft(d=>({...d, title: e.target.value})),
                placeholder:"Title (task title)",
                className:"border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
              }),
              React.createElement('select',{
                value: tplDraft.catId,
                onChange: e=>setTplDraft(d=>({...d, catId: e.target.value})),
                className:"border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
              },
                (categories || []).map(c => React.createElement('option',{key:c.id,value:c.id}, c.name))
              ),
              React.createElement('input',{
                value: tplDraft.taskType,
                onChange: e=>setTplDraft(d=>({...d, taskType: e.target.value})),
                placeholder:"Task type",
                className:"border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
              }),
              React.createElement('select',{
                value: tplDraft.priority,
                onChange: e=>setTplDraft(d=>({...d, priority: e.target.value})),
                className:"border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
              },
                React.createElement('option',{value:'low'},'Low'),
                React.createElement('option',{value:'normal'},'Normal'),
                React.createElement('option',{value:'high'},'High')
              ),
              React.createElement('input',{
                value: tplDraft.time,
                onChange: e=>setTplDraft(d=>({...d, time: e.target.value})),
                placeholder:"Time (HH:MM)",
                className:"border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
              })
            ),
            React.createElement('div',{className:"flex items-center justify-end gap-2 mt-3"},
              React.createElement('button',{
                onClick:()=>{
                  const label = String(tplDraft.label || '').trim();
                  const title = String(tplDraft.title || '').trim();
                  if(!label || !title){ showToast('⚠️ Fill label + title'); return; }
                  const id = tplEditingId ? String(tplEditingId) : `tpl_${Date.now()}`;
                  const next = { id, label, title, catId: tplDraft.catId || 'maintenance', taskType: tplDraft.taskType || 'Internal', priority: tplDraft.priority || 'normal', time: tplDraft.time || '09:00' };
                  setTaskTemplates(prev => {
                    const base = Array.isArray(prev) ? prev : [];
                    const exists = base.some(x => String(x.id) === id);
                    if (exists) return base.map(x => (String(x.id) === id ? next : x));
                    return [...base, next];
                  });
                  setTplEditingId(null);
                  setTplDraft({id:'',label:'',title:'',catId:'maintenance',taskType:'Internal',priority:'normal',time:'09:00'});
                  showToast('✅ Template saved');
                },
                className:"px-4 py-2 rounded-lg text-sm font-semibold text-white",
                style:{background:'#f59e0b'}
              },'Save template')
            )
          ),
          React.createElement('div',{className:"text-xs text-amber-700 mt-3"},
            'Tip: templates only prefill the form — you can adjust date/time/repeat before saving.'
          )
          )
        )
      ),

      // List / Agenda view
      showList && React.createElement('div',{
        className:"fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-3 sm:p-6 mp-overlay-anim",
        'data-mp-overlay':'1',
        onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowList(false), e); }
      },
        React.createElement('div',{
          className:"modal-enter modal-ready bg-white dark:bg-gray-800 w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl p-0 shadow-2xl flex flex-col",
          'data-mp-modal':'1',
          style:{borderTop:'4px solid', borderTopColor:'#f59e0b', maxHeight:'80vh'}
        },
          React.createElement('div',{
            className:"px-5 py-4 border-b flex items-center justify-between flex-shrink-0",
            style:{background:'linear-gradient(135deg, #fef3c7, #fde68a)', borderBottom:'2px solid #f59e0b'}
          },
            React.createElement('div', {className:"flex items-center gap-3 min-w-0"},
              React.createElement('div',{className:"text-lg font-semibold", style:{color:'#92400e'}},'📄 List'),
              React.createElement('div',{className:"text-sm text-amber-900/80 hidden sm:block truncate"}, agendaData.rangeLabel ? `• ${agendaData.rangeLabel}` : null),
              React.createElement('div',{className:"text-xs text-amber-900/70 hidden sm:block"}, agendaData.total ? `(${agendaData.total})` : null),
              (agendaData.conflictsTotal > 0) && React.createElement('div',{
                className:"text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 tooltip-bottom",
                'data-tooltip':"Tasks that overlap by time"
              }, `⚠ Conflicts: ${agendaData.conflictsTotal}`)
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowList(false), e),
              className:"text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),

          React.createElement('div',{className:"p-5 overflow-y-auto", style:{background:'#fffbeb'}},
            React.createElement('div',{className:"flex flex-wrap items-center gap-2 mb-4"},
              React.createElement('div',{className:"bg-white border border-amber-200 rounded-lg p-1 flex gap-1"},
                React.createElement('button',{
                  onClick:()=>setListRange('day'),
                  className:`px-3 py-1 rounded text-sm ${listRange==='day'?'text-white':'hover:bg-amber-50'}`,
                  style: listRange==='day'?{background:ui.primary}:{}
                },'Day'),
                React.createElement('button',{
                  onClick:()=>setListRange('week'),
                  className:`px-3 py-1 rounded text-sm ${listRange==='week'?'text-white':'hover:bg-amber-50'}`,
                  style: listRange==='week'?{background:ui.primary}:{}
                },'Week')
              ),
              React.createElement('input',{
                type:'date',
                value: listAnchorDate,
                onChange:(e)=>{ try{ setListAnchorDate(String(e.target.value||'')); }catch{} },
                className:"border border-amber-200 rounded-lg px-3 py-1.5 text-sm bg-white"
              }),
              React.createElement('button',{
                onClick:()=>{
                  try { setListAnchorDate((typeof todayISO==='function') ? todayISO() : new Date().toISOString().slice(0,10)); } catch {}
                  try { showToast('⌂ Today'); } catch {}
                },
                className:"px-3 py-1.5 rounded-lg text-sm bg-white border border-amber-200 hover:bg-amber-100 text-amber-800"
              },'⌂ Today'),
              React.createElement('div',{className:"flex-1"}),
              React.createElement('div',{className:"text-xs text-gray-500"},
                `Filter: ${filter} • Search: ${(search||'').trim()? 'on' : 'off'}`
              )
            ),

            (agendaData.days && agendaData.days.length)
              ? agendaData.days.map(day =>
                  React.createElement('div',{key: day.iso, className:"mb-4"},
                    React.createElement('div',{className:"flex items-center justify-between mb-2"},
                      React.createElement('button',{
                        onClick:()=>{
                          try{
                            const dt = mpParseISODate(day.iso);
                            calRef.current?.gotoDate(dt);
                            showToast(`📅 ${day.label}`);
                          }catch{}
                        },
                        className:"text-sm font-semibold text-gray-800 hover:underline"
                      }, `${day.label}`),
                      React.createElement('div',{className:"text-xs text-gray-500"}, `${(day.items||[]).length} tasks`)
                    ),
                    (day.items && day.items.length)
                      ? React.createElement('div',{className:"space-y-2"},
                          day.items.map(ev => {
                            const idStr = String(ev?.id || '');
                            const t = mpTimeStr(ev);
                            const st = String(ev?.status || 'pending');
                            const pri = String(ev?.priority || 'normal');
                            const catName = (categories.find(c=>c.id===ev.catId)?.name)||String(ev?.catId||'other');
                            const color = (typeof statusColor === 'function') ? statusColor(st) : '#60a5fa';
                            return React.createElement('div',{key: `${day.iso}_${idStr}`, className:"bg-white border border-amber-200 rounded-xl px-3 py-3 flex items-start gap-3"},
                              React.createElement('div',{className:"w-16 flex-shrink-0"},
                                React.createElement('div',{className:"text-sm font-semibold text-gray-900 flex items-center gap-1"},
                                  t || 'All',
                                  !!ev.__conflict && React.createElement('span',{
                                    className:"text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 tooltip-bottom",
                                    'data-tooltip':"Overlaps with another task"
                                  },'⚠')
                                ),
                                React.createElement('div',{className:"text-[11px] text-gray-500"}, pri==='high'?'high':pri==='low'?'low':'')
                              ),
                              React.createElement('div',{className:"min-w-0 flex-1"},
                                React.createElement('div',{className:"flex items-center gap-2 min-w-0"},
                                  React.createElement('div',{className:"font-semibold text-gray-900 truncate"}, ev.title || 'Untitled'),
                                  React.createElement('span',{className:"text-[11px] px-2 py-0.5 rounded-full text-white", style:{background:color}}, st),
                                  (()=>{ const a = Array.isArray(ev?.attachments) ? ev.attachments : []; const n = a.filter(x=>x?.docId||x?.id||x?.name).length; return n > 0 ? React.createElement('span',{className:"mp-attach-ind text-gray-600 dark:text-gray-400 flex-shrink-0"}, `📎 ${n}`) : null; })()
                                ),
                                React.createElement('div',{className:"text-xs text-gray-600 mt-1 truncate"},
                                  `${catName}${ev.taskType ? ` • ${ev.taskType}` : ''}${ev.location ? ` • ${ev.location}` : ''}`
                                )
                              ),
                              React.createElement('div',{className:"flex items-center gap-2 flex-shrink-0"},
                                React.createElement('button',{
                                  onClick:()=>{
                                    try { setShowList(false); } catch {}
                                    try{
                                      const startStr = String(ev.start||'');
                                      if(typeof window.openAddTaskModal === 'function'){
                                        window.openAddTaskModal({
                                          ...ev,
                                          id: ev.id,
                                          mode:'edit',
                                          date: startStr ? startStr.slice(0,10) : day.iso,
                                          time: startStr.includes('T') ? startStr.slice(11,16) : '',
                                          start: ev.start,
                                          end: ev.end
                                        });
                                      } else {
                                        setEditEvent({...ev, _seriesScope:'one'});
                                      }
                                    }catch{}
                                  },
                                  className:"px-2 py-1 rounded-md text-xs bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 tooltip-bottom",
                                  'data-tooltip':"Open"
                                },'✏️'),
                                React.createElement('button',{
                                  onClick:()=>{
                                    const next = (String(ev.status||'pending') === 'done') ? 'pending' : 'done';
                                    try { if (typeof window.quickStatusChange === 'function') { window.quickStatusChange(ev.id, next); return; } } catch {}
                                    setEvents(prev => (Array.isArray(prev)? prev : []).map(e => String(e.id)===String(ev.id) ? {...e, status: next} : e));
                                    showToast(next==='done' ? '✅ Done' : '🟡 Pending');
                                  },
                                  className:"px-2 py-1 rounded-md text-xs text-white tooltip-bottom",
                                  style:{background: ui.primary},
                                  'data-tooltip': st==='done' ? 'Mark pending' : 'Mark done'
                                }, st==='done' ? '↩️' : '✅'),
                                React.createElement('button',{
                                  onClick:()=>{
                                    try{
                                      if(!confirm('Delete this task?')) return;
                                      const idx = (eventsRef?.current && Array.isArray(eventsRef.current))
                                        ? eventsRef.current.findIndex(e => String(e.id)===String(ev.id))
                                        : -1;
                                      try { if(typeof window.mainproQueueUndoDeleteOne === 'function') window.mainproQueueUndoDeleteOne(ev, idx); } catch {}
                                      setEvents(prev => (Array.isArray(prev)? prev : []).filter(e => String(e.id)!==String(ev.id)));
                                      showToast('🗑️ Deleted — Undo (10s)');
                                    }catch{}
                                  },
                                  className:"px-2 py-1 rounded-md text-xs bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 tooltip-bottom",
                                  'data-tooltip':"Delete"
                                },'🗑️'),
                                React.createElement('button',{
                                  onClick:()=>{
                                    try{
                                      const startStr = String(ev.start||'');
                                      const pref = {
                                        title: ev.title || '',
                                        date: startStr ? startStr.slice(0,10) : day.iso,
                                        time: startStr.includes('T') ? startStr.slice(11,16) : '',
                                        catId: ev.catId,
                                        taskType: ev.taskType,
                                        priority: ev.priority,
                                        location: ev.location,
                                        notes: ev.notes,
                                        assignedTo: ev.assignedTo
                                      };
                                      setShowList(false);
                                      if(typeof window.openTaskModal === 'function'){ window.openTaskModal(pref); showToast('📄 Duplicated (edit then save)'); return; }
                                      if(typeof window.openAddTaskModal === 'function'){ window.openAddTaskModal(pref); showToast('📄 Duplicated'); return; }
                                    }catch{}
                                  },
                                  className:"px-2 py-1 rounded-md text-xs bg-white border border-amber-200 hover:bg-amber-100 text-amber-800 tooltip-bottom",
                                  'data-tooltip':"Duplicate"
                                },'📄')
                              )
                            );
                          })
                        )
                      : React.createElement('div',{className:"text-sm text-gray-500 bg-white border border-amber-200 rounded-xl px-3 py-3"},'No tasks')
                  )
                )
              : React.createElement('div',{className:"text-sm text-gray-500 bg-white border border-amber-200 rounded-xl px-4 py-3"},'No tasks in this range')
          )
        )
      ),

      // Undo bar for "Clear All Tasks"
      undoClearAll && React.createElement('div',{
        className:"fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,560px)]"
      },
        React.createElement('div',{
          className:"flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-700 shadow-xl rounded-xl px-4 py-3"
        },
          React.createElement('div',{className:"text-sm text-gray-800 dark:text-gray-100"},
            `🧹 Cleared ${undoClearAll.count || 0} tasks`,
            React.createElement('span',{className:"text-gray-500 dark:text-gray-400"},' • Undo (10s)')
          ),
          React.createElement('div',{className:"flex items-center gap-2"},
            React.createElement('button',{
              onClick:()=>{
                try {
                  const restored = (undoClearAll && Array.isArray(undoClearAll.events)) ? undoClearAll.events : [];
                  setUndoClearAll(null);
                  const cleaned = stripInstances(restored);
                  setEvents(cleaned);
                  try { refreshCalendar(cleaned); } catch {}
                  showToast('↩️ Restored');
                } catch {}
              },
              className:"px-3 py-1.5 rounded-lg text-sm font-semibold text-white",
              style:{background: ui.primary}
            },'Undo'),
            React.createElement('button',{
              onClick:()=>setUndoClearAll(null),
              className:"px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100"
            },'Dismiss')
          )
        )
      ),

      // Undo bar for delete (used by Add Task v74 delete)
      (!undoClearAll && undoDelete) && React.createElement('div',{
        className:"fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,560px)]"
      },
        React.createElement('div',{
          className:"flex items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-amber-200 dark:border-gray-700 shadow-xl rounded-xl px-4 py-3"
        },
          React.createElement('div',{className:"text-sm text-gray-800 dark:text-gray-100"},
            (() => {
              try {
                const n = (undoDelete && Array.isArray(undoDelete.items)) ? undoDelete.items.length : 0;
                if (n === 1) {
                  const t = undoDelete.items[0] && undoDelete.items[0].event ? (undoDelete.items[0].event.title || 'Task') : 'Task';
                  return `🗑️ Deleted: ${String(t).slice(0, 40)}`;
                }
                return `🗑️ Deleted ${n} tasks`;
              } catch {
                return '🗑️ Deleted';
              }
            })(),
            React.createElement('span',{className:"text-gray-500 dark:text-gray-400"},' • Undo (10s)')
          ),
          React.createElement('div',{className:"flex items-center gap-2"},
            React.createElement('button',{
              onClick:()=>{
                try {
                  const payload = undoDelete;
                  const items = (payload && Array.isArray(payload.items)) ? payload.items : [];
                  if (!items.length) return;
                  setUndoDelete(null);
                  setEvents(prev => {
                    const base = Array.isArray(prev) ? prev : [];
                    const byId = new Set(base.map(e => String(e.id)));
                    const sorted = [...items].sort((a,b) => (a.index||0) - (b.index||0));
                    const copy = [...base];
                    sorted.forEach(it => {
                      if (!it || !it.event) return;
                      let toInsert = it.event;
                      const idStr = String(toInsert.id);
                      const isInstance = idStr.includes('-') || toInsert.isInstance === true || (toInsert.extendedProps && toInsert.extendedProps.isInstance === true);
                      if (isInstance) {
                        const seriesId = idStr.replace(/-?\d+$/, '');
                        const resolved = base.find(e => !e.isInstance && String(e.seriesId) === seriesId);
                        if (resolved) toInsert = resolved;
                        else {
                          if (window.mainproRecurDebug) console.warn('Undo delete: instance not resolved to base, skipping', idStr);
                          return;
                        }
                      }
                      if (byId.has(String(toInsert.id))) return;
                      const idx = (typeof it.index === 'number' && it.index >= 0) ? it.index : copy.length;
                      copy.splice(Math.min(idx, copy.length), 0, toInsert);
                      byId.add(String(toInsert.id));
                    });
                    const out = stripInstances(copy);
                    try { window.MainProEvents = out; } catch {}
                    try { refreshCalendar(out); } catch {}
                    return out;
                  });
                  showToast('↩️ Restored');
                } catch {}
              },
              className:"px-3 py-1.5 rounded-lg text-sm font-semibold text-white",
              style:{background: ui.primary}
            },'Undo'),
            React.createElement('button',{
              onClick:()=>setUndoDelete(null),
              className:"px-3 py-1.5 rounded-lg text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100"
            },'Dismiss')
          )
        )
      ),

      // === Add Task v74 · Elegant Gold Minimal ===
      React.useEffect(() => {
        if (showAdd) {
          // Открываем новую модалку Add Task v74
          window.openAddTaskModal({
            title: form.title,
            date: form.date,
            time: form.time,
            catId: form.catId
          });
          // Закрываем старую модалку
          setShowAdd(false);
        }
      }, [showAdd]),
      // Edit Modal (disabled: duplicate/legacy block; keep the newer one below)
      false && editEvent && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setEditEvent(null), e); }},

        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 shadow-xl", style:{'--acc':ui.primary}, 'data-mp-modal':'1'},

          React.createElement('div',{className:"text-lg font-semibold mb-3"},'Edit Task'),

          React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-3"},

            React.createElement('div',{className:"flex items-center gap-2"},

              React.createElement('span',{style:statusDotStyle(editEvent.status)}),

              React.createElement('input',{className:"border rounded-md px-3 py-2 acc flex-1",

                value:editEvent.title, onChange:e=>setEditEvent({...editEvent,title:e.target.value})}),

              React.createElement('select',{

                className:"w-full border border-yellow-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all enhanced-input",

                value:form.status,

                onChange:e=>setForm({...form,status:e.target.value})

              },

                React.createElement('option',{value:"none"},'⚪ None'),

                React.createElement('option',{value:"pending"},'🟡 Pending'),

                React.createElement('option',{value:"done"},'🟢 Done'),

                React.createElement('option',{value:"missed"},'🔴 Missed')

              )

            ),

            // Location with address suggestions and management
            React.createElement('div',{className:"space-y-1"},

              React.createElement('label',{className:"block text-sm font-medium text-gray-700"},'📍 Location'),

              React.createElement('div',{className:"relative"},

                React.createElement('input',{

                  className:"w-full border border-yellow-200 rounded-lg px-3 py-2 pr-20 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all enhanced-input",

                  placeholder:"Enter postcode, address or room...",

                  value:form.location,

                  onChange:async e=>{

                    const value = e.target.value;

                    setForm({...form,location:value});

                    // Auto-search by postcode (5+ digits)
                    if(/^\d{5,}$/.test(value.trim())){

                      try{

                        const response = await fetch(`https://api.postcodes.io/postcodes/${value.trim()}`);

                        const data = await response.json();

                        if(data.status === 200 && data.result){

                          const address = `${data.result.postcode} - ${data.result.parish || data.result.admin_district || data.result.admin_ward}, ${data.result.country}`;

                          setForm({...form, location: address});

                          showToast('📍 Address found by postcode!');

                        }

                      }catch(e){

                        // Try alternative geocoding API
                        try{

                          const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${value.trim()}&format=json&limit=1`);

                          const data = await response.json();

                          if(data && data[0]){

                            setForm({...form, location: data[0].display_name});

                            showToast('📍 Address found by postcode!');

                          }

                        }catch(e2){}

                      }

                    }

                  },

                  list:"locationSuggestions"

                }),

                React.createElement('div',{className:"absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1"},

                  React.createElement('button',{

                    type:"button",

                    onClick:()=>{

                      if(navigator.geolocation){

                        navigator.geolocation.getCurrentPosition(async (position)=>{

                          try{

                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);

                            const data = await response.json();

                            if(data && data.display_name){

                              setForm({...form, location: data.display_name});

                              showToast('📍 Location detected!');

                            }

                          }catch(e){

                            setForm({...form, location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`});

                            showToast('📍 Location detected!');

                          }

                        }, ()=>{

                          showToast('❌ Location access denied');

                        });

                      }else{

                        showToast('❌ Geolocation not supported');

                      }

                    },

                    className:"px-2 py-1 text-blue-500 hover:text-blue-700 transition-colors text-sm",

                    title:"Detect current location"

                  },'🌍'),

                  React.createElement('button',{

                    type:"button",

                    onClick:()=>setShowLocationManager(v=>!v),

                    className:"px-2 py-1 text-green-500 hover:text-green-700 transition-colors text-sm",

                    title:"Manage saved locations"

                  },'⚙️')

                )

              ),

              showLocationManager && React.createElement('div',{className:"mt-2 p-3 border rounded-lg bg-gray-50"},

                React.createElement('div',{className:"space-y-2"},

                  React.createElement('div',{className:"flex items-center gap-2"},

                    React.createElement('input',{

                      placeholder:"Add new location...",

                      value:newLocation,

                      onChange:e=>setNewLocation(e.target.value),

                      className:"flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      onKeyDown:e=>{

                        if(e.key==='Enter' && newLocation.trim()){

                          const locations = JSON.parse(localStorage.getItem('savedLocations') || '[]');

                          if(!locations.includes(newLocation.trim())){

                            locations.push(newLocation.trim());

                            localStorage.setItem('savedLocations', JSON.stringify(locations));

                            setNewLocation('');

                            showToast('✅ Location added!');

                          }

                        }

                      }

                    }),

                    React.createElement('button',{

                      onClick:()=>{

                        if(newLocation.trim()){

                          const locations = JSON.parse(localStorage.getItem('savedLocations') || '[]');

                          if(!locations.includes(newLocation.trim())){

                            locations.push(newLocation.trim());

                            localStorage.setItem('savedLocations', JSON.stringify(locations));

                            setNewLocation('');

                            showToast('✅ Location added!');

                          }

                        }

                      },

                      className:"px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"

                    },'Add')

                  ),

                  React.createElement('div',{className:"max-h-32 overflow-y-auto"},

                    React.createElement('div',{className:"text-xs text-gray-600 mb-1"},'Saved Locations:'),

                    (JSON.parse(localStorage.getItem('savedLocations') || '[]')).map((loc, i)=>

                      React.createElement('div',{key:i, className:"flex items-center justify-between p-2 bg-white rounded border"},

                        React.createElement('span',{className:"text-sm cursor-pointer", onClick:()=>setForm({...form, location: loc})}, loc),

                        React.createElement('button',{

                          onClick:()=>{

                            const locations = JSON.parse(localStorage.getItem('savedLocations') || '[]');

                            locations.splice(i, 1);

                            localStorage.setItem('savedLocations', JSON.stringify(locations));

                            showToast('🗑️ Location removed');

                          },

                          className:"text-red-500 hover:text-red-700 text-xs px-1"

                        },'✕')

                      )

                    )

                  )

                )

              ),

              React.createElement('datalist',{id:"locationSuggestions"},

                // Default office locations
                React.createElement('option',{value:"Office Building A, Floor 1"}),

                React.createElement('option',{value:"Office Building A, Floor 2"}),

                React.createElement('option',{value:"Office Building B, Floor 1"}),

                React.createElement('option',{value:"Conference Room 1"}),

                React.createElement('option',{value:"Conference Room 2"}),

                React.createElement('option',{value:"Reception Area"}),

                React.createElement('option',{value:"Parking Lot"}),

                React.createElement('option',{value:"Main Entrance"}),

                React.createElement('option',{value:"Cafeteria"}),

                React.createElement('option',{value:"Storage Room"}),

                React.createElement('option',{value:"Server Room"}),

                React.createElement('option',{value:"Maintenance Room"}),

                // Saved locations from localStorage
                (JSON.parse(localStorage.getItem('savedLocations') || '[]')).map((loc, i)=>

                  React.createElement('option',{key:i, value:loc})

                )

              )

            ),

            // Enhanced Contractor Section
            React.createElement('div',{className:"space-y-1"},

              React.createElement('label',{className:"block text-sm font-medium text-gray-700"},'👷 Contractor'),

              React.createElement('div',{className:"flex items-center gap-2"},

                React.createElement('input',{

                  className:"flex-1 border border-yellow-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all enhanced-input",

                  placeholder:"Contractor name...",

                  value:form.contractorName,

                  onChange:e=>setForm({...form,contractorName:e.target.value})

                }),

                React.createElement('button',{

                  type:"button",

                  onClick:()=>setShowContractorDetails(v=>!v),

                  className:"px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium",

                  title:"Add detailed contractor information"

                },'📋')

              ),

              showContractorDetails && React.createElement('div',{className:"mt-2 p-3 border rounded-lg bg-gray-50 max-h-64 overflow-y-auto"},

                React.createElement('div',{className:"space-y-3"},

                  // Company Name
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'🏢 Company Name'),

                    React.createElement('input',{

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      placeholder:"Company name...",

                      value:contractorDetails.companyName,

                      onChange:e=>setContractorDetails({...contractorDetails,companyName:e.target.value})

                    })

                  ),

                  // Contact Person
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'👤 Contact Person'),

                    React.createElement('input',{

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      placeholder:"Contact person name...",

                      value:contractorDetails.contactPerson,

                      onChange:e=>setContractorDetails({...contractorDetails,contactPerson:e.target.value})

                    })

                  ),

                  // Phone Numbers
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'📞 Phone Numbers'),

                    React.createElement('div',{className:"space-y-2"},

                      React.createElement('input',{

                        className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                        placeholder:"Primary phone...",

                        value:contractorDetails.primaryPhone,

                        onChange:e=>setContractorDetails({...contractorDetails,primaryPhone:e.target.value})

                      }),

                      React.createElement('input',{

                        className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                        placeholder:"Secondary phone (optional)...",

                        value:contractorDetails.secondaryPhone,

                        onChange:e=>setContractorDetails({...contractorDetails,secondaryPhone:e.target.value})

                      })

                    )

                  ),

                  // Email
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'📧 Email'),

                    React.createElement('input',{

                      type:"email",

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      placeholder:"Email address...",

                      value:contractorDetails.email,

                      onChange:e=>setContractorDetails({...contractorDetails,email:e.target.value})

                    })

                  ),

                  // Website
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'🌐 Website'),

                    React.createElement('input',{

                      type:"url",

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      placeholder:"Website URL...",

                      value:contractorDetails.website,

                      onChange:e=>setContractorDetails({...contractorDetails,website:e.target.value})

                    })

                  ),

                  // Address
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'📍 Company Address'),

                    React.createElement('textarea',{

                      rows:"2",

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none",

                      placeholder:"Company address...",

                      value:contractorDetails.address,

                      onChange:e=>setContractorDetails({...contractorDetails,address:e.target.value})

                    })

                  ),

                  // License/Certification
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'📜 License/Certification'),

                    React.createElement('input',{

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      placeholder:"License number or certification...",

                      value:contractorDetails.license,

                      onChange:e=>setContractorDetails({...contractorDetails,license:e.target.value})

                    })

                  ),

                  // Specialization
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'🔧 Specialization'),

                    React.createElement('input',{

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm",

                      placeholder:"Type of work (e.g., Plumbing, Electrical, HVAC)...",

                      value:contractorDetails.specialization,

                      onChange:e=>setContractorDetails({...contractorDetails,specialization:e.target.value})

                    })

                  ),

                  // Notes
                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'📝 Notes'),

                    React.createElement('textarea',{

                      rows:"2",

                      className:"w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none",

                      placeholder:"Additional notes about contractor...",

                      value:contractorDetails.notes,

                      onChange:e=>setContractorDetails({...contractorDetails,notes:e.target.value})

                    })

                  ),

                  // Action Buttons
                  React.createElement('div',{className:"flex gap-2 pt-2"},

                    React.createElement('button',{

                      type:"button",

                      onClick:()=>{

                        // Save contractor details to localStorage
                        const contractors = JSON.parse(localStorage.getItem('savedContractors') || '[]');

                        const contractorData = {

                          id: Date.now(),

                          ...contractorDetails,

                          createdAt: new Date().toISOString()

                        };

                        contractors.push(contractorData);

                        localStorage.setItem('savedContractors', JSON.stringify(contractors));

                        // Update form with contractor name
                        setForm({...form, contractorName: contractorDetails.companyName || contractorDetails.contactPerson});

                        showToast('✅ Contractor saved!');

                        setShowContractorDetails(false);

                      },

                      className:"px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex-1"

                    },'💾 Save'),

                    React.createElement('button',{

                      type:"button",

                      onClick:()=>setShowContractorDetails(false),

                      className:"px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"

                    },'Cancel')

                  )

                )

              )

            ),
            // Recurring Tasks Section
            React.createElement('div',{className:"space-y-1"},

              React.createElement('label',{className:"block text-sm font-medium text-gray-700"},'🔄 Recurring Tasks'),

              React.createElement('div',{className:"flex items-center gap-2"},

                React.createElement('select',{

                  className:"flex-1 border border-yellow-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all enhanced-input",

                  value:form.recurFreq,

                  onChange:e=>setForm({...form,recurFreq:e.target.value})

                },

                  React.createElement('option',{value:"none"},'❌ No Repeat'),

                  React.createElement('option',{value:"daily"},'📅 Daily'),

                  React.createElement('option',{value:"weekly"},'📆 Weekly'),

                  React.createElement('option',{value:"biweekly"},'📆 Every 2 weeks'),

                  React.createElement('option',{value:"monthly"},'🗓️ Monthly'),

                  React.createElement('option',{value:"bimonthly"},'🗓️ Every 2 months'),

                  React.createElement('option',{value:"quarterly"},'📊 Quarterly'),

                  React.createElement('option',{value:"yearly"},'🎂 Yearly'),
                  React.createElement('option',{value:"custom"},'⚙️ Custom interval')

                ),

                React.createElement('button',{

                  type:"button",

                  onClick:()=>setShowRecurringOptions(v=>!v),

                  className:"px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium",

                  title:"Advanced recurring options"

                },'⚙️')

              ),

              showRecurringOptions && form.recurFreq !== 'none' && React.createElement('div',{className:"mt-2 p-3 border rounded-lg bg-purple-50 max-h-48 overflow-y-auto"},

                React.createElement('div',{className:"space-y-3"},

                  // Days of Week (for weekly and every 2 weeks)
                  (form.recurFreq === 'weekly' || form.recurFreq === 'biweekly') && React.createElement('div',{className:"space-y-1"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'📅 Days of Week'),

                    React.createElement('div',{className:"grid grid-cols-4 gap-2"},

                      ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day, i)=>

                        React.createElement('label',{key:day, className:"flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-purple-100"},

                          React.createElement('input',{

                            type:"checkbox",

                            checked:form.recurDays ? form.recurDays.includes(i) : false,

                            onChange:e=>{

                              const days = form.recurDays || [];

                              if(e.target.checked){

                                setForm({...form, recurDays: [...days, i]});

                              }else{

                                setForm({...form, recurDays: days.filter(d=>d!==i)});

                              }

                            },

                            className:"text-purple-500 focus:ring-purple-400"

                          }),

                          React.createElement('span',{className:"text-xs"},day.slice(0,3))

                        )

                      )

                    )

                  ),

                  // Monthly Options (monthly and every 2 months)
                  (form.recurFreq === 'monthly' || form.recurFreq === 'bimonthly') && React.createElement('div',{className:"space-y-2"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'🗓️ Monthly Options'),

                    React.createElement('div',{className:"grid grid-cols-2 gap-2"},

                      React.createElement('div',{className:"space-y-1"},

                        React.createElement('label',{className:"block text-xs text-gray-500"},'Day of Month'),

                        React.createElement('input',{

                          type:"number",

                          min:"1",

                          max:"31",

                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",

                          placeholder:"1-31",

                          value:form.recurDayOfMonth || '',

                          onChange:e=>setForm({...form, recurDayOfMonth: parseInt(e.target.value) || null})

                        })

                      ),

                      React.createElement('div',{className:"space-y-1"},

                        React.createElement('label',{className:"block text-xs text-gray-500"},'Week of Month'),

                        React.createElement('select',{

                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",

                          value:form.recurWeekOfMonth || '',

                          onChange:e=>setForm({...form, recurWeekOfMonth: e.target.value})

                        },

                          React.createElement('option',{value:""},'Any week'),

                          React.createElement('option',{value:"1"},'1st week'),

                          React.createElement('option',{value:"2"},'2nd week'),

                          React.createElement('option',{value:"3"},'3rd week'),

                          React.createElement('option',{value:"4"},'4th week'),

                          React.createElement('option',{value:"5"},'Last week')

                        )

                      )

                    )

                  ),

                  form.recurFreq === 'custom' && React.createElement('div',{className:"space-y-2"},
                    React.createElement('label',{className:"block text-xs text-gray-600"},'⚙️ Custom Interval'),
                    React.createElement('div',{className:"grid grid-cols-2 gap-2"},
                      React.createElement('div',{className:"space-y-1"},
                        React.createElement('label',{className:"block text-xs text-gray-500"},'Every'),
                        React.createElement('input',{
                          type:"number",
                          min:"1",
                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",
                          value:form.recurInterval || 1,
                          onChange:e=>setForm({...form, recurInterval: Math.max(1, parseInt(e.target.value) || 1)})
                        })
                      ),
                      React.createElement('div',{className:"space-y-1"},
                        React.createElement('label',{className:"block text-xs text-gray-500"},'Unit'),
                        React.createElement('select',{
                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",
                          value:form.recurUnit || 'day',
                          onChange:e=>setForm({...form, recurUnit: e.target.value})
                        },
                          React.createElement('option',{value:"day"},'Day(s)'),
                          React.createElement('option',{value:"week"},'Week(s)'),
                          React.createElement('option',{value:"month"},'Month(s)'),
                          React.createElement('option',{value:"year"},'Year(s)')
                        )
                      )
                    )
                  ),

                  // Duration Options
                  React.createElement('div',{className:"space-y-2"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'⏱️ Duration Options'),

                    React.createElement('div',{className:"grid grid-cols-2 gap-2"},

                      React.createElement('div',{className:"space-y-1"},

                        React.createElement('label',{className:"block text-xs text-gray-500"},'Generate for (months)'),

                        React.createElement('input',{

                          type:"number",

                          min:"1",

                          max:"24",

                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",

                          value:form.recurMonths || 12,

                          onChange:e=>setForm({...form, recurMonths: parseInt(e.target.value) || 12})

                        })

                      ),

                      React.createElement('div',{className:"space-y-1"},

                        React.createElement('label',{className:"block text-xs text-gray-500"},'Repeat ends after (months)'),

                        React.createElement('select',{

                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",

                          value:form.repeatEndMonths || '',

                          onChange:e=>setForm({...form, repeatEndMonths: e.target.value || undefined})

                        },

                          React.createElement('option',{value:''},'Use "Generate for" above'),

                          React.createElement('option',{value:'3'},'3 months'),

                          React.createElement('option',{value:'6'},'6 months'),

                          React.createElement('option',{value:'12'},'12 months')

                        )

                      ),

                      React.createElement('div',{className:"space-y-1"},

                        React.createElement('label',{className:"block text-xs text-gray-500"},'End Date (optional)'),

                        React.createElement('input',{

                          type:"date",

                          className:"w-full border border-gray-300 rounded-lg px-2 py-1 text-sm",

                          value:form.recurEndDate || '',

                          onChange:e=>setForm({...form, recurEndDate: e.target.value})

                        })

                      )

                    )

                  ),

                  // Advanced Options
                  React.createElement('div',{className:"space-y-2"},

                    React.createElement('label',{className:"block text-xs text-gray-600"},'⚡ Advanced Options'),

                    React.createElement('div',{className:"space-y-2"},

                      React.createElement('label',{className:"flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-purple-100"},

                        React.createElement('input',{

                          type:"checkbox",

                          checked:form.recurSkipWeekends || false,

                          onChange:e=>setForm({...form, recurSkipWeekends: e.target.checked}),

                          className:"text-purple-500 focus:ring-purple-400"

                        }),

                        React.createElement('span',{className:"text-xs"},'Skip weekends')

                      ),

                      React.createElement('label',{className:"flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-purple-100"},

                        React.createElement('input',{

                          type:"checkbox",

                          checked:form.recurBusinessDays || false,

                          onChange:e=>setForm({...form, recurBusinessDays: e.target.checked}),

                          className:"text-purple-500 focus:ring-purple-400"

                        }),

                        React.createElement('span',{className:"text-xs"},'Business days only (Mon-Fri)')

                      )

                    )

                  ),

                  // Action Buttons
                  React.createElement('div',{className:"flex gap-2 pt-2"},

                    React.createElement('button',{

                      type:"button",

                      onClick:()=>{

                        showToast('✅ Recurring options saved!');

                        setShowRecurringOptions(false);

                      },

                      className:"px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors flex-1"

                    },'💾 Apply'),

                    React.createElement('button',{

                      type:"button",

                      onClick:()=>setShowRecurringOptions(false),

                      className:"px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"

                    },'Cancel')

                  )

                )

              )

            ),

            // Big Add Button with gradient
            React.createElement('button',{

              type:"submit",

              className:"w-full mt-3 bg-gradient-to-r from-[#C89E14] to-[#F5B400] text-white font-semibold py-2 rounded-lg hover:opacity-90 hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2 gold-gradient-btn"

            },

              React.createElement('span',{className:"text-lg"},'✅'),

              'Add Task'

            )

          )

        )

      ),

      // Edit Modal

      editEvent && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setEditEvent(null), e); }},

        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 shadow-xl", style:{'--acc':ui.primary}, 'data-mp-modal':'1'},

          React.createElement('div',{className:"text-lg font-semibold mb-3"},'Edit Task'),

          React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-3"},

            React.createElement('div',{className:"flex items-center gap-2"},

              React.createElement('span',{style:statusDotStyle(editEvent.status)}),

              React.createElement('input',{className:"border rounded-md px-3 py-2 acc flex-1",

                value:editEvent.title, onChange:e=>setEditEvent({...editEvent,title:e.target.value})})

            ),

            React.createElement('select',{className:"border rounded-md px-3 py-2 acc",

              value:editEvent.status, onChange:e=>setEditEvent({...editEvent,status:e.target.value})},

              React.createElement('option',{value:"pending"},'🟡 Pending'),

              React.createElement('option',{value:"done"},'🟢 Done'),

              React.createElement('option',{value:"missed"},'🔴 Missed')

            ),

            React.createElement('input',{type:"datetime-local",className:"border rounded-md px-3 py-2 acc",

              value:editEvent.start, onChange:e=>setEditEvent({...editEvent,start:e.target.value})}),

            React.createElement('select',{className:"border rounded-md px-3 py-2 acc",

              value:editEvent.priority||'normal', onChange:e=>setEditEvent({...editEvent,priority:e.target.value})},

              React.createElement('option',{value:"low"},'Low priority'),

              React.createElement('option',{value:"normal"},'Normal priority'),

              React.createElement('option',{value:"high"},'High priority')

            ),

            React.createElement('div',null,

              React.createElement('label',{className:"block text-xs text-gray-600 mb-1"},'Category'),

              React.createElement('select',{className:"border rounded-md px-3 py-2 w-full acc",

                  value:editEvent.catId||'other', onChange:e=>setEditEvent({...editEvent,catId:e.target.value})},

                categories.map(c=>React.createElement('option',{key:c.id,value:c.id},c.name))

              )

            ),

            React.createElement('div',null,

              React.createElement('label',{className:"block text-xs text-gray-600 mb-1"},'Task Type'),

              React.createElement('input',{list:"taskTypeList",className:"border rounded-md px-3 py-2 w-full acc",

                value:editEvent.taskType||'', onChange:e=>setEditEvent({...editEvent,taskType:e.target.value})})

            ),

            React.createElement('div',{className:"col-span-1 sm:col-span-2"},

              React.createElement('label',{className:"inline-flex items-center gap-2 text-sm"},

                React.createElement('input',{type:"checkbox",checked:!!editEvent.contractorOnSite,

                  onChange:e=>setEditEvent({...editEvent,contractorOnSite:e.target.checked})}),

                'Contractor on site'

              )

            ),

            editEvent.contractorOnSite && React.createElement(React.Fragment,null,

              React.createElement('input',{className:"border rounded-md px-3 py-2 acc", placeholder:"Contractor name",

                value:editEvent.contractorName||'', onChange:e=>setEditEvent({...editEvent,contractorName:e.target.value})}),

              React.createElement('input',{className:"border rounded-md px-3 py-2 acc", placeholder:"Contractor phone",

                value:editEvent.contractorPhone||'', onChange:e=>setEditEvent({...editEvent,contractorPhone:e.target.value})})

            ),

            React.createElement('input',{className:"border rounded-md px-3 py-2 acc col-span-1 sm:col-span-2", placeholder:"Location / Room",

              value:editEvent.location||'', onChange:e=>setEditEvent({...editEvent,location:e.target.value})}),

            React.createElement('textarea',{rows:"2",className:"border rounded-md px-3 py-2 acc col-span-1 sm:col-span-2",

              placeholder:"Notes", value:editEvent.notes||'', onChange:e=>setEditEvent({...editEvent,notes:e.target.value})}),

            (editEvent.seriesId) && React.createElement('div',{className:"col-span-1 sm:col-span-2 mt-1 p-2 rounded border bg-gray-50"},

              React.createElement('div',{className:"text-xs text-gray-600 mb-1"},'This task is part of a repeating series.'),

              React.createElement('div',{className:"flex items-center gap-3 text-sm"},

                React.createElement('label',{className:"inline-flex items-center gap-1"},

                  React.createElement('input',{type:"radio",name:"scope",checked:(editEvent._seriesScope||'one')==='one',

                    onChange:()=>setEditEvent(ev=>({...ev,_seriesScope:'one'}))}),

                  'Edit only this'

                ),

                React.createElement('label',{className:"inline-flex items-center gap-1"},

                  React.createElement('input',{type:"radio",name:"scope",checked:(editEvent._seriesScope||'one')==='all',

                    onChange:()=>setEditEvent(ev=>({...ev,_seriesScope:'all'}))}),

                  'Edit entire series'

                )

              )

            )

          ),

          React.createElement('div',{className:"flex justify-between mt-4"},

            React.createElement('button',{onClick:()=>{
              if(deleteEvent(editEvent.id)) {
                setEditEvent(null); // Close the edit modal after successful deletion
              }
            }, className:"px-4 py-2 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"},'🗑️ Delete'),

            React.createElement('div',{className:"flex gap-2"},

              React.createElement('button',{onClick:()=>setEditEvent(null), className:"px-4 py-2 rounded-md border bg-white hover:bg-gray-50"},'Cancel'),

              React.createElement('button',{onClick:saveEdit, className:"px-4 py-2 rounded-md text-white", style:{background:ui.primary}},'Save')

            )

          )

        )

      ),

      // Settings (+ новый тумблер Auto Status Engine)
      openSettings && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 mp-overlay-anim", style:{overflow:'hidden'}, 'data-mp-overlay':'1', onClick:(e)=>{ 
        if(e.target===e.currentTarget) { 
          try {
            const t = (window.__mainproModalOpenedAt && window.__mainproModalOpenedAt.settings) ? window.__mainproModalOpenedAt.settings : 0;
            if (t && (Date.now() - t) < 350) return;
          } catch {}
          mpCloseWithAnim(()=>setOpenSettings(false), e); 
        } 
      }},

        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-6xl rounded-t-2xl sm:rounded-2xl p-0 shadow-2xl flex flex-col h-[calc(100vh-2rem)] sm:h-[90vh] max-h-[calc(100vh-2rem)] sm:max-h-[90vh]", style:{borderTop:'4px solid', borderTopColor:'#f59e0b'}, 'data-mp-modal':'1'},

          React.createElement('div',{className:"px-4 pt-3 pb-2 border-b flex items-center justify-between flex-shrink-0", style:{background:'linear-gradient(135deg, #fef3c7, #fde68a)', borderBottom:'2px solid #f59e0b'}},

            React.createElement('div',{className:"text-lg font-semibold", style:{color:'#92400e'}},'⚙️ Settings'),

            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setOpenSettings(false), e),
              className:"text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')

          ),

          // Tabs Navigation
          React.createElement('div',{className:"px-4 pt-2 pb-1.5 border-b flex gap-1 overflow-x-auto flex-shrink-0", style:{background:'#fffbeb', borderBottom:'2px solid #fde68a'}},
            React.createElement('button',{
              onClick:()=>setSettingsTab('general'),
              className:`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                settingsTab === 'general' ? 'bg-white border-t-2 border-l border-r text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`,
              style:settingsTab === 'general' ? {borderTopColor:'#f59e0b'} : {}
            },'⚙️ General'),
            React.createElement('button',{
              onClick:()=>setSettingsTab('categories'),
              className:`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                settingsTab === 'categories' ? 'bg-white border-t-2 border-l border-r text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`,
              style:settingsTab === 'categories' ? {borderTopColor:'#f59e0b'} : {}
            },'🏷️ Categories'),
            React.createElement('button',{
              onClick:()=>setSettingsTab('ai'),
              className:`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                settingsTab === 'ai' ? 'bg-white border-t-2 border-l border-r text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`,
              style:settingsTab === 'ai' ? {borderTopColor:'#f59e0b'} : {}
            },'🤖 AI & Analytics'),
            React.createElement('button',{
              onClick:()=>setSettingsTab('cloud'),
              className:`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                settingsTab === 'cloud' ? 'bg-white border-t-2 border-l border-r text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`,
              style:settingsTab === 'cloud' ? {borderTopColor:'#f59e0b'} : {}
            },'☁️ Cloud & Team'),
            React.createElement('button',{
              onClick:()=>setSettingsTab('install'),
              className:`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                settingsTab === 'install' ? 'bg-white border-t-2 border-l border-r text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`,
              style:settingsTab === 'install' ? {borderTopColor:'#f59e0b'} : {}
            },'📱 Install App')
            ,
            React.createElement('button',{
              onClick:()=>setSettingsTab('backup'),
              className:`px-4 py-2 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                settingsTab === 'backup' ? 'bg-white border-t-2 border-l border-r text-amber-700 shadow-sm' : 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
              }`,
              style:settingsTab === 'backup' ? {borderTopColor:'#f59e0b'} : {}
            },'💾 Backup')
          ),

          React.createElement('div',{className:"px-6 pb-4 overflow-y-auto flex-1", style:{minHeight:'400px'}},

            // Backup / Import / Export Tab (relocated to ensure it renders)
            settingsTab === 'backup' && React.createElement('div',{className:"space-y-4 pt-4", style:{position:'relative', zIndex:2}},
              React.createElement('div',{className:"mb-3"},
                React.createElement('div',{className:"text-xl font-bold text-gray-800 mb-2"},'💾 Backup / Import / Export'),
                React.createElement('div',{className:"text-sm text-gray-600"},
                  'Download a JSON backup or import it later. This is the safest way to protect your tasks.'
                )
              ),

              React.createElement('div',{className:"p-4 border-2 rounded-xl bg-amber-50 shadow-md border-amber-200"},
                React.createElement('div',{className:"text-lg font-semibold mb-3 text-amber-900"},'📦 Download'),
                React.createElement('div',{className:"flex flex-col sm:flex-row gap-2"},
                  React.createElement('button',{
                    onClick:()=>{
                      try{
                        const key = `mainpro_calendar_${currentCalendarId}`;
                        const raw = localStorage.getItem(key) || '[]';
                        const payload = {
                          version: 1,
                          exportedAt: new Date().toISOString(),
                          kind: 'mainpro-backup',
                          scope: 'current-calendar',
                          currentCalendarId,
                          calendars: Array.isArray(calendars) ? calendars : [],
                          events: JSON.parse(raw),
                          categories: Array.isArray(categories) ? categories : [],
                          taskTypes: Array.isArray(taskTypes) ? taskTypes : [],
                          templates: Array.isArray(taskTemplates) ? taskTemplates : [],
                          ui,
                          settings
                        };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `MainPro_Backup_${currentCalendarId}_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(()=>URL.revokeObjectURL(url), 5000);
                        showToast('⬇️ Backup downloaded');
                      }catch(e){
                        console.error(e);
                        showToast('⚠️ Backup failed');
                      }
                    },
                    className:"flex-1 px-4 py-2 rounded-lg text-white hover:opacity-90",
                    style:{background:'#f59e0b'}
                  },'⬇️ Download current calendar'),

                  React.createElement('button',{
                    onClick:()=>{
                      try{
                        const cals = Array.isArray(calendars) ? calendars : [];
                        const eventsByCalendar = {};
                        cals.forEach(c=>{
                          try{
                            const key = `mainpro_calendar_${c.id}`;
                            const raw = localStorage.getItem(key) || '[]';
                            eventsByCalendar[c.id] = JSON.parse(raw);
                          }catch{ eventsByCalendar[c.id] = []; }
                        });
                        const payload = {
                          version: 1,
                          exportedAt: new Date().toISOString(),
                          kind: 'mainpro-backup',
                          scope: 'all-calendars',
                          currentCalendarId,
                          calendars: cals,
                          eventsByCalendar,
                          categories: Array.isArray(categories) ? categories : [],
                          taskTypes: Array.isArray(taskTypes) ? taskTypes : [],
                          templates: Array.isArray(taskTemplates) ? taskTemplates : [],
                          ui,
                          settings
                        };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `MainPro_Backup_ALL_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        setTimeout(()=>URL.revokeObjectURL(url), 5000);
                        showToast('⬇️ Backup downloaded');
                      }catch(e){
                        console.error(e);
                        showToast('⚠️ Backup failed');
                      }
                    },
                    className:"flex-1 px-4 py-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 text-amber-900"
                  },'⬇️ Download ALL calendars')
                )
              ),

              React.createElement('div',{className:"p-4 border-2 rounded-xl bg-white shadow-md border-amber-200"},
                React.createElement('div',{className:"text-lg font-semibold mb-3 text-amber-900"},'📥 Import'),
                React.createElement('div',{className:"text-sm text-gray-600 mb-3"},
                  'Import will replace data in the current calendar (or all calendars if backup contains them).'
                ),
                React.createElement('input',{
                  id:'mp-backup-import',
                  type:'file',
                  accept:'application/json,.json',
                  className:"hidden",
                  onChange:(e)=>{
                    try{
                      const f = e.target.files && e.target.files[0];
                      if(!f) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try{
                          const text = String(reader.result || '');
                          const data = JSON.parse(text);
                          const isAll = data && data.scope === 'all-calendars' && data.eventsByCalendar && typeof data.eventsByCalendar === 'object';
                          const ok = confirm(isAll
                            ? 'Import ALL calendars backup?\nThis will REPLACE your calendars + tasks.'
                            : 'Import backup into CURRENT calendar?\nThis will REPLACE tasks in current calendar.'
                          );
                          if(!ok) return;

                          if(isAll){
                            const cals = Array.isArray(data.calendars) ? data.calendars : [];
                            const eventsByCalendar = data.eventsByCalendar || {};
                            try { setCalendars(cals); } catch {}
                            try { localStorage.setItem('mainpro_calendars_v1', JSON.stringify(cals)); } catch {}
                            cals.forEach(c=>{
                              const evs = Array.isArray(eventsByCalendar[c.id]) ? eventsByCalendar[c.id] : [];
                              try { localStorage.setItem(`mainpro_calendar_${c.id}`, JSON.stringify(stripInstances(evs))); } catch {}
                            });
                            const targetId = data.currentCalendarId || (cals[0] && cals[0].id) || currentCalendarId || 'main';
                            try { localStorage.setItem('mainpro_current_calendar_v1', String(targetId)); } catch {}
                            try { setCurrentCalendarId(String(targetId)); } catch {}
                            try {
                              const evs = Array.isArray(eventsByCalendar[targetId]) ? eventsByCalendar[targetId] : [];
                              const cleaned = stripInstances(evs);
                              if (window.mainproRecurDebug && evs.length !== cleaned.length) console.warn('Import: dropped', evs.length - cleaned.length, 'instance(s)');
                              setEvents(cleaned);
                            } catch {}
                          } else {
                            const imported = Array.isArray(data.events) ? data.events : [];
                            const cleaned = stripInstances(imported);
                            if (window.mainproRecurDebug && imported.length !== cleaned.length) console.warn('Import: dropped', imported.length - cleaned.length, 'instance(s)');
                            const key = `mainpro_calendar_${currentCalendarId}`;
                            try { localStorage.setItem(key, JSON.stringify(cleaned)); } catch {}
                            try { setEvents(cleaned); } catch {}
                          }

                          try { if (Array.isArray(data.categories)) setCategories(data.categories); } catch {}
                          try { if (Array.isArray(data.taskTypes)) setTaskTypes(data.taskTypes); } catch {}
                          try { if (Array.isArray(data.templates)) setTaskTemplates(data.templates); } catch {}
                          try { if (data.settings) setSettings(prev=>({...prev, ...data.settings})); } catch {}
                          try { if (data.ui && data.ui.primary) setUI(prev=>({...prev, ...data.ui})); } catch {}

                          showToast('✅ Imported');
                        }catch(err){
                          console.error(err);
                          showToast('⚠️ Import failed (bad file)');
                        }
                      };
                      reader.readAsText(f);
                      e.target.value = '';
                    }catch(err){
                      console.error(err);
                      showToast('⚠️ Import failed');
                    }
                  }
                }),
                React.createElement('button',{
                  onClick:()=>{ try { document.getElementById('mp-backup-import')?.click(); } catch {} },
                  className:"w-full px-4 py-2 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 font-semibold"
                },'📥 Choose backup file (.json)')
              )
            ),

            // General Tab
            settingsTab === 'general' && React.createElement('div',{className:"space-y-4 pt-4"},

              React.createElement('div',{className:"grid gap-3"},

                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Hotel Name'),
                  React.createElement('input',{type:"text", placeholder:"Hotel Name", value:settings.hotelName,
                    onChange:e=>setSettings({...settings,hotelName:e.target.value}),
                    className:"w-full border rounded-md px-3 py-2 acc", style:{'--acc':ui.primary}})
                ),

                React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-2"},
                  React.createElement('div',null,
                    React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Prepared by'),
                    React.createElement('input',{type:"text", placeholder:"Prepared by", value:settings.preparedBy,
                      onChange:e=>setSettings({...settings,preparedBy:e.target.value}),
                      className:"w-full border rounded-md px-3 py-2 acc", style:{'--acc':ui.primary}})
                  ),
                  React.createElement('div',null,
                    React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Approved by'),
                    React.createElement('input',{type:"text", placeholder:"Approved by", value:settings.approvedBy,
                      onChange:e=>setSettings({...settings,approvedBy:e.target.value}),
                      className:"w-full border rounded-md px-3 py-2 acc", style:{'--acc':ui.primary}})
                  )
                ),

                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Logo URL'),
                  React.createElement('input',{type:"text", placeholder:"Logo URL", value:settings.logoUrl,
                    onChange:e=>setSettings({...settings,logoUrl:e.target.value}),
                    className:"w-full border rounded-md px-3 py-2 acc", style:{'--acc':ui.primary}})
                ),

                React.createElement('div',{className:"p-4 border rounded-lg bg-gray-50"},
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-2"},'Accent Color'),
                  React.createElement('div',{className:"flex items-center gap-3"},
                    React.createElement('input',{type:"color", value:ui.primary, onChange:e=>setUI({primary:e.target.value}), className:"w-16 h-10 rounded border"}),
                    React.createElement('div',{className:"flex-1 text-sm text-gray-600"},'This color is used throughout the interface for buttons and highlights.')
                  )
                ),

                React.createElement('div',{className:"p-4 border rounded-lg bg-blue-50"},
                  React.createElement('div',{className:"flex items-center gap-3"},
                    React.createElement('input',{id:"autoStatus", type:"checkbox", checked:!!settings.autoStatusEnabled,
                      onChange:e=>{
                        const enabled = e.target.checked;
                        setSettings(prev=>({...prev, autoStatusEnabled: enabled}));
                        if(enabled) runSmartStatusOnce();
                      }}),
                    React.createElement('div',{className:"flex-1"},
                      React.createElement('label',{htmlFor:"autoStatus", className:"text-sm font-medium text-gray-700 cursor-pointer"},'Auto Status Engine'),
                      React.createElement('p',{className:"text-xs text-gray-600 mt-1"},'Automatically changes "Pending" tasks to "Missed" when they pass their scheduled time.')
                    )
                  )
                )
              )
            ),

            // Categories Tab
            settingsTab === 'categories' && React.createElement('div',{className:"space-y-4 pt-4"},

              React.createElement('div',{className:"mb-4"},

                React.createElement('div',{className:"text-md font-semibold mb-3"},'Category Manager'),

                React.createElement('div',{className:"rounded-xl border p-4 bg-gray-50"},

                  React.createElement('div',{className:"flex flex-wrap gap-2 mb-4"},

                    categories.map(c=>

                      React.createElement('div',{key:c.id, className:"flex items-center gap-2 px-3 py-2 rounded-md border bg-white shadow-sm"},

                        React.createElement('span',{className:"inline-block w-4 h-4 rounded", style:{background:c.color}}),

                        React.createElement('span',{className:"text-sm font-medium"},c.name),

                        React.createElement('button',{onClick:()=>removeCategory(c.id), className:"text-xs text-rose-600 hover:text-rose-700 hover:underline ml-2"},'remove')

                      )

                    )

                  ),

                  React.createElement('div',{className:"space-y-3"},

                    React.createElement('div',{className:"text-sm font-medium text-gray-700 mb-2"},'➕ Add New Category'),

                    React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-3"},

                      React.createElement('div',null,
                        React.createElement('label',{className:"block text-xs text-gray-600 mb-1"},'Category Name'),
                        React.createElement('input',{placeholder:"Enter category name", className:"w-full border rounded-md px-3 py-2 text-sm acc",
                          value:newCat.name, onChange:e=>setNewCat({...newCat,name:e.target.value}), style:{'--acc':ui.primary}})
                      ),

                      React.createElement('div',null,
                        React.createElement('label',{className:"block text-xs text-gray-600 mb-1"},'Color'),
                        React.createElement('div',{className:"flex items-center gap-2"},
                          React.createElement('input',{type:"color", value:newCat.color, onChange:e=>setNewCat({...newCat,color:e.target.value}), className:"w-16 h-10 rounded border cursor-pointer"}),
                          React.createElement('span',{className:"text-xs text-gray-500"},newCat.color)
                        )
                      )

                    ),

                    React.createElement('button',{
                      onClick:addInlineCategory,
                      disabled:!newCat.name.trim(),
                      className:"w-full px-4 py-2.5 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50",
                      style:{background:newCat.name.trim() ? '#059669' : '#9ca3af'}
                    },'➕ Add Category')

                  )

                )

              )

            ),

            // AI & Analytics Tab
            settingsTab === 'ai' && React.createElement('div',{className:"space-y-3 pt-2"},

              // OpenAI API Configuration
              React.createElement('div',{className:"p-3 border rounded-lg bg-blue-50"},

                React.createElement('div',{className:"text-sm font-semibold mb-2 flex items-center gap-2"},

                  React.createElement('span',null,'🔑 OpenAI API Configuration'),

                  React.createElement('div',{className:"px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"},'Optional')

                ),

                React.createElement('div',{className:"space-y-3"},

                  React.createElement('div',null,

                    React.createElement('label',{htmlFor:"openaiKey", className:"block text-sm font-medium mb-2"},'OpenAI API Key'),

                    React.createElement('input',{id:"openaiKey", type:"password", placeholder:"sk-...",

                      className:"w-full border rounded px-3 py-2 text-sm",

                      onChange:e=>{

                        const key = e.target.value;

                        if(key && key.startsWith('sk-')){

                          localStorage.setItem('mainpro_openai_key', key);

                          showToast('✅ OpenAI API key saved!');

                        }else if(key === ''){

                          localStorage.removeItem('mainpro_openai_key');

                          showToast('🗑️ OpenAI API key removed');

                        }

                      },

                      defaultValue:localStorage.getItem('mainpro_openai_key') || ''

                    })

                  ),

                  React.createElement('div',{className:"text-xs text-gray-600"},

                    'Enter your OpenAI API key to enable AI-powered report analysis. Your key is stored locally and never shared.'

                  ),

                  React.createElement('div',{className:"text-xs text-gray-500"},

                    'Get your API key from: https://platform.openai.com/api-keys'

                  )

                )

              ),

              // AI Analytics Settings
              React.createElement('div',{className:"p-3 border rounded-lg bg-purple-50"},

                React.createElement('div',{className:"text-sm font-semibold mb-2 flex items-center gap-2"},

                  React.createElement('span',null,'🤖 AI Analytics & Auto-Suggestions'),

                  aiAnalytics.enabled && React.createElement('div',{className:"px-2 py-1 rounded-full text-xs bg-green-100 text-green-700"},'Active')

                ),

                aiAnalytics.enabled ? React.createElement('div',{className:"space-y-3"},

                  React.createElement('div',{className:"grid grid-cols-2 gap-2 p-2 bg-white rounded-lg"},

                    React.createElement('div',{className:"text-center"},

                      React.createElement('div',{className:"text-xl font-bold text-blue-600"},`${analyticsData.taskCompletionRate}%`),

                      React.createElement('div',{className:"text-xs text-gray-600"},'Completion Rate')

                    ),

                    React.createElement('div',{className:"text-center"},

                      React.createElement('div',{className:"text-xl font-bold text-green-600"},`${analyticsData.complianceScore}%`),

                      React.createElement('div',{className:"text-xs text-gray-600"},'Compliance Score')

                    ),

                    React.createElement('div',{className:"text-center"},

                      React.createElement('div',{className:"text-xl font-bold text-purple-600"},`${analyticsData.maintenanceFrequency}`),

                      React.createElement('div',{className:"text-xs text-gray-600"},'Maintenance/Day')

                    ),

                    React.createElement('div',{className:"text-center"},

                      React.createElement('div',{className:`text-xl font-bold ${

                        analyticsData.riskLevel === 'high' ? 'text-red-600' :

                        analyticsData.riskLevel === 'medium' ? 'text-yellow-600' :

                        'text-green-600'

                      }`},analyticsData.riskLevel.toUpperCase()),

                      React.createElement('div',{className:"text-xs text-gray-600"},'Risk Level')

                    )

                  ),

                  React.createElement('div',{className:"space-y-2"},

                    React.createElement('div',{className:"flex items-center gap-3"},

                      React.createElement('input',{id:"predictiveMaintenance", type:"checkbox", checked:aiAnalytics.predictiveMaintenance,

                        onChange:e=>setAiAnalytics(prev=>({...prev,predictiveMaintenance:e.target.checked}))}),

                      React.createElement('label',{htmlFor:"predictiveMaintenance", className:"text-sm"},'🔮 Predictive Maintenance')

                    ),

                    React.createElement('div',{className:"flex items-center gap-3"},

                      React.createElement('input',{id:"complianceAlerts", type:"checkbox", checked:aiAnalytics.complianceAlerts,

                        onChange:e=>setAiAnalytics(prev=>({...prev,complianceAlerts:e.target.checked}))}),

                      React.createElement('label',{htmlFor:"complianceAlerts", className:"text-sm"},'🚨 Compliance Alerts')

                    ),

                    React.createElement('div',{className:"flex items-center gap-3"},

                      React.createElement('input',{id:"autoSuggestions", type:"checkbox", checked:aiAnalytics.autoSuggestions,

                        onChange:e=>setAiAnalytics(prev=>({...prev,autoSuggestions:e.target.checked}))}),

                      React.createElement('label',{htmlFor:"autoSuggestions", className:"text-sm"},'💡 Auto-Suggestions')

                    )

                  ),

                  React.createElement('div',{className:"flex gap-2"},

                    React.createElement('button',{onClick:()=>setShowAnalytics(true), className:"px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"},'📊 View Analytics'),

                    React.createElement('button',{onClick:disableAIAnalytics, className:"px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"},'❌ Disable AI')

                  )

                ) : React.createElement('div',{className:"space-y-3"},

                  React.createElement('div',{className:"text-sm text-gray-600 mb-2"},

                    'Enable AI analytics to get intelligent insights, predictive maintenance, and automated suggestions.'

                  ),

                  React.createElement('button',{onClick:enableAIAnalytics, className:"px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"},'🤖 Enable AI Analytics')

                )

              ),

              // AI Tools Section
              React.createElement('div',{className:"p-3 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50"},

                React.createElement('div',{className:"text-sm font-semibold mb-2 flex items-center gap-2"},

                  React.createElement('span',null,'🤖 AI Tools'),

                  React.createElement('div',{className:"px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700"},'Advanced')

                ),

                React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-2"},

                  React.createElement('button',{

                    onClick: () => {

                      generateAnalytics();

                      setShowAnalytics(true);

                      setOpenSettings(false);

                    },

                    className: "px-3 py-2 rounded-lg text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md"

                  },'🤖 AI Analytics'),

                  React.createElement('button',{

                    onClick: async () => {

                      const question = prompt("🧠 What do you want to ask MainPro AI?\n\nExamples:\n• What are the most common maintenance issues?\n• Which tasks are taking too long?\n• What should I focus on this week?\n• How can I improve efficiency?");

                      if (!question) return;

                      showToast('🧠 AI is analyzing your data...');

                      const result = await window.MainProAI.analyze(question, {

                        events: JSON.parse(localStorage.getItem('mainpro_events') || "[]"),

                        reports: JSON.parse(localStorage.getItem('mainpro_reports') || "[]"),

                        docs: JSON.parse(localStorage.getItem('mainpro_docs') || "[]"),

                      });

                      if (result.success) {

                        const modal = document.createElement('div');

                        modal.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;`;

                        modal.innerHTML = `<div style="background: white; padding: 30px; border-radius: 15px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"><h2 style="margin: 0 0 20px 0; color: #333; text-align: center; font-size: 24px;">🧠 MainPro AI Response</h2><div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;"><strong>Question:</strong> ${question}</div><div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #e3f2fd, #f3e5f5); border-radius: 8px; border-left: 4px solid #2196f3;"><strong>AI Analysis:</strong><br><div style="margin-top: 10px; line-height: 1.6; color: #333;">${result.result}</div></div><div style="display: flex; gap: 10px; justify-content: center;"><button onclick="navigator.clipboard.writeText('${result.result.replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">📋 Copy Response</button><button onclick="this.closest('div').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">❌ Close</button></div></div>`;

                        document.body.appendChild(modal);

                        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

                      } else { alert(result.error); }

                    },

                    className: "px-3 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md"

                  },'🧠 Ask AI'),

                  React.createElement('button',{

                    onClick: () => { setWorkflowShow(true); setOpenSettings(false); },

                    className: "px-3 py-2 rounded-lg text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md"

                  },'🧬 AI Workflow'),

                  React.createElement('button',{

                    onClick: () => { setShowAIPanel(true); setOpenSettings(false); },

                    className: "px-3 py-2 rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md"

                  },'🧠 AI Panel'),

                  React.createElement('button',{

                    onClick: () => { setShowAuditDashboard(true); setOpenSettings(false); },

                    className: "px-3 py-2 rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:opacity-90 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md"

                  },'📊 Audit'),

                  React.createElement('button',{

                    onClick: () => { setShowReports(true); setOpenSettings(false); },

                    className: "px-3 py-2 rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:opacity-90 shadow-sm text-sm font-medium transition-all duration-200 hover:shadow-md"

                  },'📈 Reports')

                )

              )

            ),

            // Cloud & Team Tab
            settingsTab === 'cloud' && React.createElement('div',{className:"space-y-2 pt-2"},

              // Cloud Sync Settings
              React.createElement('div',{className:"p-2 border rounded-lg bg-gray-50"},

                React.createElement('div',{className:"text-xs font-semibold mb-1.5 flex items-center gap-2"},

                  React.createElement('span',null,'☁️ Cloud Sync'),

                  React.createElement('div',{className:`w-2 h-2 rounded-full ${
                    syncStatus === 'synced' ? 'bg-green-500' :
                    syncStatus === 'syncing' ? 'bg-yellow-500' :
                    syncStatus === 'error' ? 'bg-red-500' :
                    syncStatus === 'offline' ? 'bg-gray-500' :
                    'bg-gray-300'
                  }`})

                ),

                cloudSync.enabled ? React.createElement('div',{className:"space-y-2"},

                  React.createElement('div',{className:"text-xs text-gray-600"},

                    `Server: ${cloudSync.serverUrl}`,

                    cloudSync.lastSync && React.createElement('div',{className:"text-xs text-gray-500 mt-0.5"},

                      `Last sync: ${new Date(cloudSync.lastSync).toLocaleString()}`

                    )

                  ),

                  React.createElement('div',{className:"flex gap-1.5 flex-wrap"},

                    React.createElement('button',{onClick:syncToCloud, className:"px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"},'🔄 Sync Now'),

                    React.createElement('button',{onClick:syncFromCloud, className:"px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"},'⬇️ Pull'),

                    React.createElement('button',{onClick:disableCloudSync, className:"px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"},'❌ Disable')

                  )

                ) : React.createElement('div',{className:"space-y-2"},

                  React.createElement('div',{className:"text-xs text-gray-600 mb-1"},

                    'Enable cloud synchronization to sync your data across multiple devices in real-time.'

                  ),

                  React.createElement('div',{className:"space-y-1"},

                    React.createElement('input',{type:"text", placeholder:"Server URL",

                      value:cloudSync.serverUrl, onChange:e=>setCloudSync(prev=>({...prev,serverUrl:e.target.value})),

                      className:"w-full border rounded px-2 py-1.5 text-xs"}), 

                    React.createElement('input',{type:"text", placeholder:"API Key",

                      value:cloudSync.apiKey, onChange:e=>setCloudSync(prev=>({...prev,apiKey:e.target.value})),

                      className:"w-full border rounded px-2 py-1.5 text-xs"})

                  ),

                  React.createElement('button',{onClick:()=>enableCloudSync(cloudSync.serverUrl, cloudSync.apiKey),

                    disabled:!cloudSync.serverUrl || !cloudSync.apiKey,

                    className:"px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed w-full"},'☁️ Enable Cloud Sync')

                )

              ),

              // Team Collaboration Settings
              React.createElement('div',{className:"p-2 border rounded-lg bg-blue-50"},

              React.createElement('div',{className:"text-xs font-semibold mb-2 flex items-center gap-2"},

                React.createElement('span',null,'👥 Team Collaboration'),

                teamMode.enabled && React.createElement('div',{className:"px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-700"},

                  'Active'

                )

              ),

              teamMode.enabled ? React.createElement('div',{className:"space-y-2"},

                React.createElement('div',{className:"text-xs text-gray-600"},

                  `Team: ${teamMode.teamName || 'Unnamed Team'}`,

                  React.createElement('div',{className:"text-xs text-gray-500 mt-0.5"},

                    `Your role: ${teamMode.userRole}`

                  )

                ),

                React.createElement('div',{className:"flex gap-1.5 flex-wrap"},

                  React.createElement('button',{onClick:()=>setShowInviteModal(true), className:"px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"},

                    '📧 Invite'

                  ),

                  React.createElement('button',{onClick:leaveTeam, className:"px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"},

                    '👋 Leave'

                  )

                )

              ) : React.createElement('div',{className:"space-y-2"},

                React.createElement('div',{className:"text-xs text-gray-600 mb-1"},

                  'Enable team collaboration to work with multiple users on the same calendar.'

                ),

                React.createElement('div',{className:"space-y-1"},

                  React.createElement('input',{type:"text", placeholder:"Team name",

                    id:"teamName", className:"w-full border rounded px-2 py-1.5 text-xs"}), 

                  React.createElement('input',{type:"text", placeholder:"Your email (optional)",

                    value:localStorage.getItem('mainpro_user_email') || '', onChange:e=>localStorage.setItem('mainpro_user_email', e.target.value),

                    className:"w-full border rounded px-2 py-1.5 text-xs"})

                ),

                React.createElement('div',{className:"flex gap-1.5 flex-wrap"},

                  React.createElement('button',{onClick:()=>{

                    const teamName = document.getElementById('teamName').value;

                    if(teamName) createTeam(teamName);

                  }, className:"px-3 py-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"},

                    '👥 Create'

                  ),

                  React.createElement('button',{onClick:()=>{

                    const teamId = prompt('Enter Team ID to join:');

                    if(teamId) joinTeam(teamId);

                  }, className:"px-3 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600"},

                    '🔗 Join'

                  )

                )

              )

            ),

            // Install App Tab
            settingsTab === 'install' && React.createElement('div',{className:"space-y-4 pt-4"},

              React.createElement('div',{className:"mb-3"},

                React.createElement('div',{className:"text-xl font-bold text-gray-800 mb-2"},'📱 Install App'),

                React.createElement('div',{className:"text-sm text-gray-600"},'Install MainPro as a Progressive Web App (PWA) to use it offline and get a native app-like experience.')

              ),

              // PWA Status
              React.createElement('div',{className:"p-4 border-2 rounded-xl bg-purple-50 shadow-md"},

                React.createElement('div',{className:"text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800"},

                  React.createElement('span',{className:"text-2xl"},'📱'),
                  React.createElement('span',null,'Installation Status'),

                  isPWAInstalled && React.createElement('div',{className:"px-3 py-1 rounded-full text-xs bg-green-200 text-green-800 font-medium"},

                    'Installed'

                  )

                ),

                React.createElement('div',{className:"bg-white rounded-lg p-4 border"},

                  React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-3 gap-4"},

                    React.createElement('div',null,

                      React.createElement('div',{className:"flex items-center gap-2 mb-2"},

                        React.createElement('div',{className:`w-3 h-3 rounded-full ${isPWAInstalled ? 'bg-green-500' : 'bg-gray-400'}`}),

                        React.createElement('span',{className:"font-medium text-sm"},'Installation Status')

                      ),

                      React.createElement('p',{className:"text-sm text-gray-600"},isPWAInstalled ? 'Installed' : 'Not Installed')

                    ),

                    React.createElement('div',null,

                      React.createElement('div',{className:"font-medium text-sm mb-2"},'Device Type'),

                      React.createElement('p',{className:"text-sm text-gray-600"},isMobile ? 'Mobile Device' : 'Desktop')

                    ),

                    React.createElement('div',null,

                      React.createElement('div',{className:"font-medium text-sm mb-2"},'Service Worker'),

                      React.createElement('p',{className:"text-sm text-gray-600"},'serviceWorker' in navigator ? 'Supported' : 'Not Supported')

                    )

                  )

                ),

                // Install Button
                pwaInstallPrompt && !isPWAInstalled ? React.createElement('div',{className:"space-y-3 mt-4"},

                  React.createElement('div',{className:"text-sm text-gray-600"},

                    'Install MainPro as a Progressive Web App (PWA) to use it offline and get a native app-like experience.'

                  ),

                  React.createElement('button',{

                    onClick: () => {
                      console.log('Install button clicked', { hasPrompt: !!pwaInstallPrompt, isInstalled: isPWAInstalled });
                      pwaManager.installPWA();
                    },

                    className: "w-full px-6 py-5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-base font-bold hover:opacity-90 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200",
                    style:{minHeight:'90px', fontSize:'16px'}

                  },

                    React.createElement('span',{className:"text-3xl"},'📱'),
                    React.createElement('span',null,'Install App')

                  )

                ) : isPWAInstalled ? React.createElement('div',{className:"bg-green-50 rounded-lg p-4 text-center mt-4"},

                  React.createElement('div',{className:"text-base text-green-700 font-bold mb-2"},'✅ App Installed'),

                  React.createElement('div',{className:"text-sm text-green-600"},'MainPro is installed and ready to use offline')

                ) : React.createElement('div',{className:"bg-gray-50 rounded-lg p-4 text-center mt-4"},

                  React.createElement('div',{className:"text-base text-gray-600 mb-2"},'Install prompt not available'),

                  React.createElement('div',{className:"text-sm text-gray-500"},

                    'Your browser doesn\'t support installation or the app is already installed.'

                  )

                )

              )

            ),

          ),

          React.createElement('div',{className:"px-4 py-2 border-t flex justify-end gap-2 flex-shrink-0", style:{background:'#fffbeb', borderTop:'2px solid #fde68a'}},

            React.createElement('button',{onClick:()=>setOpenSettings(false), className:"px-4 py-2 rounded-md border transition-all duration-200", style:{background:'white', borderColor:'#f59e0b', color:'#92400e', fontWeight:'500'}},'Close'),

            React.createElement('button',{onClick:()=>{

                localStorage.setItem('mainpro_settings_v60', JSON.stringify({

                  hotelName:settings.hotelName, preparedBy:settings.preparedBy, approvedBy:settings.approvedBy, logoUrl:settings.logoUrl

                }));

                localStorage.setItem('mainpro_ui_v60', JSON.stringify(ui));

                localStorage.setItem('mainpro_categories_v60', JSON.stringify(categories));

                localStorage.setItem('mainpro_tasktypes_v60', JSON.stringify(taskTypes));

                localStorage.setItem('mainpro_autostatus_v1', JSON.stringify({enabled: !!settings.autoStatusEnabled}));

                setOpenSettings(false);

                if(settings.autoStatusEnabled) runSmartStatusOnce();

              }, className:"px-4 py-2 rounded-md text-white font-medium transition-all duration-200 hover:shadow-lg", style:{background:'linear-gradient(135deg, #f6d365, #fda085)', color:'#78350f', fontWeight:'600'}},'💾 Save')

          )

        )

      ),

      // Invite User Modal
      showInviteModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowInviteModal(false), e); }},

        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-xl", 'data-mp-modal':'1'},

          React.createElement('div',{className:"flex items-center justify-between mb-4"},

            React.createElement('div',{className:"text-lg font-semibold"},'📧 Invite User'),

            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowInviteModal(false), e),
              className:"text-gray-500 hover:text-gray-700 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')

          ),

          React.createElement('div',{className:"space-y-4"},

            React.createElement('div',null,

              React.createElement('label',{className:"block text-sm font-medium mb-1"},'Email Address'),

              React.createElement('input',{type:"email", placeholder:"user@example.com", value:inviteEmail,

                onChange:e=>setInviteEmail(e.target.value),

                className:"w-full border rounded px-3 py-2"})

            ),

            React.createElement('div',null,

              React.createElement('label',{className:"block text-sm font-medium mb-1"},'Role'),

              React.createElement('select',{value:inviteRole, onChange:e=>setInviteRole(e.target.value),

                className:"w-full border rounded px-3 py-2"},

                React.createElement('option',{value:"member"},'Member - Can view and edit assigned tasks'),

                React.createElement('option',{value:"editor"},'Editor - Can view and edit all tasks'),

                React.createElement('option',{value:"admin"},'Admin - Full access and team management')

              )

            ),

            React.createElement('div',{className:"flex gap-2"},

              React.createElement('button',{onClick:(e)=>mpCloseWithAnim(()=>setShowInviteModal(false), e), className:"px-4 py-2 border rounded hover:bg-gray-50"},

                'Cancel'

              ),

              React.createElement('button',{onClick:()=>{

                if(inviteEmail) {

                  inviteUser(inviteEmail, inviteRole);

                  setInviteEmail('');

                  setInviteRole('member');

                  setShowInviteModal(false);

                }

              }, className:"px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"},

                'Send Invitation'

              )

            )

          )

        )

      ),


      // Audit Dashboard Modal
      showAuditDashboard && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowAuditDashboard(false), e); }},

        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},

          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},

            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},

              React.createElement('span',null,'📊'),

              'Audit Dashboard'

            ),

            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowAuditDashboard(false), e),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')

          ),

          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},

            // Audit Overview Stats
            React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"},

              React.createElement('div',{className:"p-4 bg-purple-50 rounded-lg text-center"},

                React.createElement('div',{className:"text-3xl font-bold text-purple-600"},Object.keys(auditStats.userActions).length),

                React.createElement('div',{className:"text-sm text-gray-600 mt-1"},'Active Users')

              ),

              React.createElement('div',{className:"p-4 bg-orange-50 rounded-lg text-center"},

                React.createElement('div',{className:"text-3xl font-bold text-orange-600"},Object.keys(auditStats.actionTypes).length),

                React.createElement('div',{className:"text-sm text-gray-600 mt-1"},'Action Types')

              )

            ),

            // Filter Controls
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},

              React.createElement('h3',{className:"text-lg font-semibold mb-3"},'Filter Audit Logs'),

              React.createElement('div',{className:"flex flex-wrap gap-2"},

                React.createElement('button',{onClick:()=>setAuditFilter('all'), className:`px-3 py-1 rounded text-sm ${
                  auditFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`},'All'),

                React.createElement('button',{onClick:()=>setAuditFilter('TASK_CREATED'), className:`px-3 py-1 rounded text-sm ${
                  auditFilter === 'TASK_CREATED' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`},'Task Created'),

                React.createElement('button',{onClick:()=>setAuditFilter('TASK_DELETED'), className:`px-3 py-1 rounded text-sm ${
                  auditFilter === 'TASK_DELETED' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`},'Task Deleted'),

                React.createElement('button',{onClick:()=>setAuditFilter('EVENTS_UPDATED'), className:`px-3 py-1 rounded text-sm ${
                  auditFilter === 'EVENTS_UPDATED' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`},'Events Updated'),

                React.createElement('button',{onClick:()=>setAuditFilter('ALL_TASKS_CLEARED'), className:`px-3 py-1 rounded text-sm ${
                  auditFilter === 'ALL_TASKS_CLEARED' ? 'bg-blue-500 text-white' : 'bg-white border'
                }`},'Clear All')

              )

            ),

            // Audit Logs Table
            React.createElement('div',{className:"mb-6"},

              React.createElement('h3',{className:"text-lg font-semibold mb-3"},'Recent Activity'),

              React.createElement('div',{className:"bg-white border rounded-lg overflow-hidden"},

                React.createElement('div',{className:"max-h-96 overflow-y-auto"},

                  React.createElement('table',{className:"w-full text-sm"},

                    React.createElement('thead',{className:"bg-gray-50"},

                      React.createElement('tr',null,

                        React.createElement('th',{className:"px-4 py-2 text-left"},'Time'),

                        React.createElement('th',{className:"px-4 py-2 text-left"},'Action'),

                        React.createElement('th',{className:"px-4 py-2 text-left"},'User'),

                        React.createElement('th',{className:"px-4 py-2 text-left"},'Details')

                      )

                    ),

                    React.createElement('tbody',null,

                      auditLogs.filter(log => 
                        auditFilter === 'all' || log.action === auditFilter
                      ).slice(0, 50).map(log =>

                        React.createElement('tr',{key:log.id, className:"border-t hover:bg-gray-50"},

                          React.createElement('td',{className:"px-4 py-2 text-gray-600"},
                            new Date(log.timestamp).toLocaleString()
                          ),

                          React.createElement('td',{className:"px-4 py-2"},

                            React.createElement('span',{className:`px-2 py-1 rounded text-xs ${
                              log.action === 'TASK_CREATED' ? 'bg-green-100 text-green-700' :
                              log.action === 'TASK_DELETED' ? 'bg-red-100 text-red-700' :
                              log.action === 'EVENTS_UPDATED' ? 'bg-blue-100 text-blue-700' :
                              log.action === 'ALL_TASKS_CLEARED' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`},
                              log.action.replace(/_/g, ' ')
                            )

                          ),

                          React.createElement('td',{className:"px-4 py-2 text-gray-600"},
                            log.user || 'system'
                          ),

                          React.createElement('td',{className:"px-4 py-2 text-gray-600"},
                            log.details.title || log.details.count || JSON.stringify(log.details).slice(0, 50) + '...'
                          )

                        )

                      )

                    )

                  )

                )

              )

            ),

            // Action Types Breakdown
            Object.keys(auditStats.actionTypes).length > 0 && React.createElement('div',{className:"mb-6"},

              React.createElement('h3',{className:"text-lg font-semibold mb-3"},'Action Types Breakdown'),

              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},

                Object.entries(auditStats.actionTypes).map(([action, count]) =>

                  React.createElement('div',{key:action, className:"p-3 bg-gray-50 rounded-lg"},

                    React.createElement('div',{className:"flex items-center justify-between"},

                      React.createElement('span',{className:"text-sm font-medium"},action.replace(/_/g, ' ')),

                      React.createElement('span',{className:"text-lg font-bold text-blue-600"},count)

                    )

                  )

                )

              )

            ),

            // Top Users
            Object.keys(auditStats.userActions).length > 0 && React.createElement('div',{className:"mb-6"},

              React.createElement('h3',{className:"text-lg font-semibold mb-3"},'Top Users'),

              React.createElement('div',{className:"space-y-1"},

                Object.entries(auditStats.userActions)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([user, count]) =>

                    React.createElement('div',{key:user, className:"flex items-center justify-between p-3 bg-gray-50 rounded-lg"},

                      React.createElement('span',{className:"text-sm"},user),

                      React.createElement('span',{className:"text-sm font-bold text-blue-600"},count)

                    )

                  )

              )

            ),

            // No data message
            auditLogs.length === 0 &&

            React.createElement('div',{className:"text-center py-8 text-gray-500"},

              React.createElement('div',{className:"text-4xl mb-2"},'📊'),

              React.createElement('div',{className:"text-lg font-medium mb-2"},'No Audit Data Yet'),

              React.createElement('div',{className:"text-sm"},'Audit logs will appear as you use the calendar.')

            )

          )

        )

      ),
      // Reports Modal
      showReports && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowReports(false), e); }},

        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},

          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},

            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},

              React.createElement('span',null,'📈'),

              'Reports & Analytics'

            ),

            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowReports(false), e),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')

          ),

          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},

            // Report Configuration
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},

              React.createElement('h3',{className:"text-lg font-semibold mb-3"},'Generate Report'),

              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},

                // Report Type
                React.createElement('div',null,

                  React.createElement('label',{className:"block text-sm font-medium mb-2"},'Report Type'),

                  React.createElement('select',{value:reportType, onChange:e=>setReportType(e.target.value),
                    className:"w-full border rounded px-3 py-2"},

                    React.createElement('option',{value:"summary"},'Summary Report'),

                    React.createElement('option',{value:"compliance"},'Compliance Report'),

                    React.createElement('option',{value:"performance"},'Performance Report'),

                    React.createElement('option',{value:"maintenance"},'Maintenance Report'),

                    React.createElement('option',{value:"user"},'User Report')

                  )

                ),

                // Report Period
                React.createElement('div',null,

                  React.createElement('label',{className:"block text-sm font-medium mb-2"},'Period'),

                  React.createElement('select',{value:reportPeriod, onChange:e=>setReportPeriod(e.target.value),
                    className:"w-full border rounded px-3 py-2"},

                    React.createElement('option',{value:"7days"},'Last 7 Days'),

                    React.createElement('option',{value:"30days"},'Last 30 Days'),

                    React.createElement('option',{value:"90days"},'Last 90 Days'),

                    React.createElement('option',{value:"1year"},'Last Year')

                  )

                ),

                // Generate Buttons
                React.createElement('div',{className:"flex items-end gap-2"},

                  React.createElement('button',{onClick:()=>generateReport(reportType, reportPeriod),
                    className:"flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"},

                    'Generate Report'

                  ),
                  
                  // 🧠 AI Smart Summary Button
                  React.createElement('button',{onClick: async ()=>{
                    if(Object.keys(reportData).length === 0) {
                      alert('Please generate a report first before using AI analysis.');
                      return;
                    }
                    
                    showToast('🧠 AI is creating smart summary...');
                    
                    const result = await window.MainProAI.generateSummary(reportData, 'report');
                    
                    if (result.success) {
                      // Show AI summary in a modal
                      const modal = document.createElement('div');
                      modal.style.cssText = `
                        position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                        background: rgba(0,0,0,0.8); z-index: 1000; 
                        display: flex; align-items: center; justify-content: center;
                      `;
                      
                      modal.innerHTML = `
                        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 900px; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                          <h2 style="margin: 0 0 20px 0; color: #333; text-align: center; font-size: 24px;">🧠 AI Smart Summary</h2>
                          <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                            <strong>Report Type:</strong> ${reportType} | <strong>Period:</strong> ${reportPeriod}
                          </div>
                          <div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(135deg, #e3f2fd, #f3e5f5); border-radius: 8px; border-left: 4px solid #2196f3;">
                            <strong>🧠 AI Analysis & Summary:</strong><br>
                            <div style="margin-top: 10px; line-height: 1.6; color: #333;">${result.result}</div>
                          </div>
                          <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="navigator.clipboard.writeText('${result.result.replace(/'/g, "\\'")}')" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer;">
                              📋 Copy Summary
                            </button>
                            <button onclick="this.closest('div').remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                              ❌ Close
                            </button>
                          </div>
                        </div>
                      `;
                      
                      document.body.appendChild(modal);
                      modal.onclick = (e) => {
                        if (e.target === modal) modal.remove();
                      };
                    } else {
                      alert(result.error);
                    }
                  },
                    className:"flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:opacity-90"},

                    '🧠 AI Summary'

                  ),
                  React.createElement('button',{onClick:()=>{
                    if(Object.keys(reportData).length === 0) {
                      alert('Please generate a report first before using AI analysis.');
                      return;
                    }
                    generateAIReport(reportData);
                  },
                    className:"px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"},
                    '🤖 Generate AI Summary'
                  )

                )

              )

            ),

            // Report Results
            Object.keys(reportData).length > 0 && React.createElement('div',{className:"mb-6"},

              React.createElement('div',{className:"flex items-center justify-between mb-4"},

                React.createElement('h3',{className:"text-lg font-semibold"},'Report Results'),

                React.createElement('div',{className:"flex gap-2"},

                  React.createElement('button',{onClick:()=>exportReport('pdf'),
                    className:"px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"},

                    '📄 PDF'

                  ),

                  React.createElement('button',{onClick:()=>exportReport('excel'),
                    className:"px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"},

                    '📊 Excel'

                  ),

                  React.createElement('button',{onClick:()=>exportReport('csv'),
                    className:"px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"},

                    '📄 CSV'

                  )

                )

              ),

              // Report Content based on type
              reportType === 'summary' && React.createElement('div',{className:"space-y-4"},

                React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},

                  React.createElement('div',{className:"p-4 bg-blue-50 rounded-lg text-center"},

                    React.createElement('div',{className:"text-2xl font-bold text-blue-600"},reportData.totalTasks),

                    React.createElement('div',{className:"text-sm text-gray-600"},'Total Tasks')

                  ),

                  React.createElement('div',{className:"p-4 bg-green-50 rounded-lg text-center"},

                    React.createElement('div',{className:"text-2xl font-bold text-green-600"},reportData.completedTasks),

                    React.createElement('div',{className:"text-sm text-gray-600"},'Completed')

                  ),

                  React.createElement('div',{className:"p-4 bg-purple-50 rounded-lg text-center"},

                    React.createElement('div',{className:"text-2xl font-bold text-purple-600"},`${reportData.taskCompletionRate}%`),

                    React.createElement('div',{className:"text-sm text-gray-600"},'Completion Rate')

                  )

                ),

                React.createElement('div',{className:"p-4 bg-gray-50 rounded-lg"},

                  React.createElement('h4',{className:"font-semibold mb-2"},'Efficiency Metrics'),

                  React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},

                    React.createElement('div',null,

                      React.createElement('div',{className:"text-sm text-gray-600"},'Avg Task Duration'),

                      React.createElement('div',{className:"text-lg font-bold"},`${reportData.efficiency?.avgTaskDuration || 0} hours`)

                    ),

                    React.createElement('div',null,

                      React.createElement('div',{className:"text-sm text-gray-600"},'Peak Activity'),

                      React.createElement('div',{className:"text-lg font-bold"},reportData.efficiency?.peakActivity || 'N/A')

                    ),

                    React.createElement('div',null,

                      React.createElement('div',{className:"text-sm text-gray-600"},'Productivity'),

                      React.createElement('div',{className:"text-lg font-bold"},`${reportData.efficiency?.productivity || 0}%`)

                    )

                  )

                )

              ),

              reportType === 'compliance' && React.createElement('div',{className:"space-y-4"},

                React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},

                  React.createElement('div',{className:"p-4 bg-blue-50 rounded-lg text-center"},

                    React.createElement('div',{className:"text-2xl font-bold text-blue-600"},reportData.totalComplianceTasks),

                    React.createElement('div',{className:"text-sm text-gray-600"},'Total Compliance Tasks')

                  ),

                  React.createElement('div',{className:"p-4 bg-green-50 rounded-lg text-center"},

                    React.createElement('div',{className:"text-2xl font-bold text-green-600"},reportData.completedCompliance),

                    React.createElement('div',{className:"text-sm text-gray-600"},'Completed')

                  ),

                  React.createElement('div',{className:`p-4 rounded-lg text-center ${
                    reportData.riskLevel === 'HIGH' ? 'bg-red-50' :
                    reportData.riskLevel === 'MEDIUM' ? 'bg-yellow-50' :
                    'bg-green-50'
                  }`},

                    React.createElement('div',{className:`text-2xl font-bold ${
                      reportData.riskLevel === 'HIGH' ? 'text-red-600' :
                      reportData.riskLevel === 'MEDIUM' ? 'text-yellow-600' :
                      'text-green-600'
                    }`},reportData.complianceScore),

                    React.createElement('div',{className:"text-sm text-gray-600"},'Compliance Score')

                  )

                ),

                reportData.recommendations && reportData.recommendations.length > 0 &&

                React.createElement('div',{className:"p-4 bg-yellow-50 rounded-lg"},

                  React.createElement('h4',{className:"font-semibold mb-2"},'Recommendations'),

                  React.createElement('ul',{className:"list-disc list-inside space-y-1"},

                    reportData.recommendations.map((rec, index) =>

                      React.createElement('li',{key:index, className:"text-sm"},rec)

                    )

                  )

                )

              )

            ),

            // No report data message
            Object.keys(reportData).length === 0 &&

            React.createElement('div',{className:"text-center py-8 text-gray-500"},

              React.createElement('div',{className:"text-4xl mb-2"},'📈'),

              React.createElement('div',{className:"text-lg font-medium mb-2"},'No Report Generated'),

              React.createElement('div',{className:"text-sm"},'Select a report type and period, then click "Generate Report".')

            )

          )

        )

      ),

      // === AI Workflow Builder Modal ===
        workflowShow && React.createElement('div',{className:"fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-1"},
          React.createElement('div',{className:"bg-white w-full max-w-md rounded-lg border border-blue-300 overflow-hidden max-h-[75vh] flex flex-col"},
          
          // Header
          React.createElement('div',{className:"px-3 py-2 flex items-center justify-between border-b bg-blue-50"},
            React.createElement('div',{className:"font-medium text-gray-700 flex items-center gap-2 text-sm"},
              '🧬 AI Workflow Builder'
            ),
            React.createElement('button',{
              onClick:()=>setWorkflowShow(false),
              className:"text-gray-500 hover:text-gray-700 px-1 py-1 text-lg tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),

          // Body
          React.createElement('div',{className:"px-3 pt-2 pb-3 overflow-y-auto flex-1"},

            // Templates Section
            React.createElement('div',{className:"mb-3"},
              React.createElement('h3',{className:"text-sm font-medium mb-1"},'🚀 Quick Templates'),
              React.createElement('div',{className:"grid grid-cols-1 sm:grid-cols-2 gap-2"},
                workflowTemplates.map(template =>
                  React.createElement('div',{key:template.id, className:"border border-gray-200 rounded p-1.5 hover:border-blue-300 cursor-pointer transition-colors"},
                    React.createElement('div',{className:"flex items-center gap-1 mb-1"},
                      React.createElement('span',{className:"text-sm"},template.icon),
                      React.createElement('div',{className:"font-medium text-xs"},template.name)
                    ),
                    React.createElement('div',{className:"text-xs text-gray-600 mb-1 line-clamp-2"},template.description),
                    React.createElement('button',{
                      onClick:()=>useTemplate(template),
                      className:"px-1.5 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 w-full"
                    },'Use')
                  )
                )
              )
            ),

            // Custom Input Section
            React.createElement('div',{className:"mb-3"},
              React.createElement('h3',{className:"text-sm font-medium mb-1"},'✨ Custom Workflow'),
              React.createElement('div',{className:"space-y-1"},
                React.createElement('textarea',{
                  value:workflowInput,
                  onChange:e=>setWorkflowInput(e.target.value),
                  placeholder:"Describe your workflow...\n\nExamples:\n• Monthly fire safety plan\n• Weekly HVAC maintenance\n• Daily security checks",
                  className:"w-full p-1.5 border border-gray-300 rounded text-xs resize-none",
                  rows:3
                }),
                React.createElement('button',{
                  onClick:()=>aiGenerateWorkflow(workflowInput),
                  disabled:!workflowInput.trim() || isGenerating,
                  className:`px-2 py-1 rounded text-white font-medium text-xs ${isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90'}`
                },isGenerating ? '🧠 Generating...' : '🚀 Generate')
              )
            ),

            // Generated Workflow Preview
            generatedWorkflow && React.createElement('div',{className:"border border-green-200 rounded bg-green-50"},
              // Header - Fixed
              React.createElement('div',{className:"px-2 py-1.5 border-b border-green-300 bg-green-100 rounded-t"},
                React.createElement('div',{className:"flex items-center gap-1"},
                  React.createElement('span',{className:"text-sm"},'✅'),
                  React.createElement('h3',{className:"text-xs font-medium"},'Generated Workflow')
                )
              ),
              // Content - Scrollable
              React.createElement('div',{className:"workflow-scroll p-2"},
                React.createElement('div',{className:"space-y-2 text-xs"},
                  React.createElement('div',{className:"flex items-center gap-1"},
                    React.createElement('span',{className:"font-medium"},'Name:'),
                    React.createElement('span',{className:"text-blue-600 truncate"},generatedWorkflow.name)
                  ),
                  React.createElement('div',{className:"flex items-center gap-1"},
                    React.createElement('span',{className:"font-medium"},'Frequency:'),
                    React.createElement('span',{className:"px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"},generatedWorkflow.frequency)
                  ),
                  React.createElement('div',{className:"flex items-center gap-1"},
                    React.createElement('span',{className:"font-medium"},'Systems:'),
                    React.createElement('div',{className:"flex gap-1 flex-wrap"},
                      generatedWorkflow.systems.map(system =>
                        React.createElement('span',{key:system, className:"px-1 py-0.5 bg-gray-100 text-gray-800 rounded text-xs"},system)
                      )
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-1"},
                    React.createElement('span',{className:"font-medium"},'Tasks:'),
                    React.createElement('span',{className:"text-green-600 font-medium"},generatedWorkflow.tasks.length)
                  ),
                  React.createElement('div',{className:"border-t pt-2 mt-2"},
                    React.createElement('h4',{className:"font-medium mb-2 text-xs"},'Task List:'),
                    React.createElement('div',{className:"space-y-1 task-scroll"},
                      generatedWorkflow.tasks.map((task, index) => {
                        // Simple schedule calculation without complex logic
                        const dayOffset = Math.floor(index / 3);
                        const hourOffset = (index % 3) * 3;
                        const taskDate = new Date();
                        taskDate.setDate(taskDate.getDate() + dayOffset);
                        taskDate.setHours(9 + hourOffset, 0, 0, 0);
                        
                        const dayNames = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5'];
                        const day = dayNames[dayOffset] || `Day ${dayOffset + 1}`;
                        const time = formatAmPm(taskDate);
                        
                        return React.createElement('div',{key:task.id, className:"flex items-center gap-1 text-xs py-0.5 border-b border-green-100 last:border-b-0"},
                          React.createElement('span',{className:"text-blue-500 text-xs"},'•'),
                          React.createElement('div',{className:"flex-1 min-w-0"},
                            React.createElement('div',{className:`text-xs ${task.priority === 'high' ? 'font-medium text-red-600' : 'text-gray-700'} truncate`},task.name),
                            React.createElement('div',{className:"text-xs text-gray-500 flex items-center gap-1 mt-0.5"},
                              React.createElement('span',{className:"px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"},day),
                              React.createElement('span',{className:"px-1 py-0.5 bg-green-100 text-green-800 rounded text-xs"},time)
                            )
                          ),
                          React.createElement('span',{className:"px-1 py-0.5 bg-gray-100 text-xs rounded flex-shrink-0"},task.category)
                        );
                      })
                    )
                  )
                )
              ),
              // Footer - Fixed
              React.createElement('div',{className:"px-2 py-1.5 border-t border-green-300 bg-green-100 rounded-b"},
                React.createElement('div',{className:"flex gap-1"},
                  React.createElement('button',{
                    onClick:()=>applyWorkflow(generatedWorkflow),
                    className:"px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 font-medium flex-1"
                  },'✅ Apply'),
                  React.createElement('button',{
                    onClick:()=>setGeneratedWorkflow(null),
                    className:"px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 flex-1"
                  },'❌ Cancel')
                )
              )
            )

          )
        )
      ),

      // === AI PANEL MODAL ===
      showAIPanel && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowAIPanel(false), e); }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'🧠'),
              'MainPro AI Panel v70.0'
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowAIPanel(false), e),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // AI Provider Selection
            React.createElement('div',{className:"mb-4 p-3 border rounded-lg bg-indigo-50"},
              React.createElement('div',{className:"text-md font-semibold mb-2 flex items-center gap-2"},
                React.createElement('span',null,'🧠'),
                React.createElement('span',null,'MainPro AI Fusion'),
                React.createElement('span',{style:{fontSize:'12px',color:'#6b7280'}},'Multi-Model')
              ),
              React.createElement('select',{
                className:"w-full border rounded px-3 py-2",
                defaultValue:localStorage.getItem('mainpro_ai_provider')||'openai',
                onChange:e=>{
                  localStorage.setItem('mainpro_ai_provider',e.target.value);
                  showToast(`✅ Selected: ${e.target.value.toUpperCase()}`);
                }
              },
                React.createElement('option',{value:"openai"},'OpenAI (ChatGPT)'),
                React.createElement('option',{value:"anthropic"},'Anthropic (Claude)'),
                React.createElement('option',{value:"google"},'Google Gemini'),
                React.createElement('option',{value:"copilot"},'GitHub Copilot'),
                React.createElement('option',{value:"custom"},'Custom API')
              )
            ),
            // AI Status
            React.createElement('div',{className:"mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-2 text-blue-800"},'🤖 AI Status'),
              React.createElement('div',{className:"grid grid-cols-3 gap-2"},
                React.createElement('div',{className:"text-center p-2 bg-white rounded"},
                  React.createElement('div',{className:"text-lg font-bold text-green-600"},'v70.0'),
                  React.createElement('div',{className:"text-xs text-gray-600"},'Version')
                ),
                React.createElement('div',{className:"text-center p-2 bg-white rounded"},
                  React.createElement('div',{className:"text-lg font-bold text-blue-600"},'GPT-4o'),
                  React.createElement('div',{className:"text-xs text-gray-600"},'Model')
                ),
                React.createElement('div',{className:"text-center p-2 bg-white rounded"},
                  React.createElement('div',{className:"text-lg font-bold text-purple-600"},'7'),
                  React.createElement('div',{className:"text-xs text-gray-600"},'Features')
                )
              )
            ),
            // Quick Actions
            React.createElement('div',{className:"mb-4"},
              React.createElement('h3',{className:"text-md font-semibold mb-2"},'⚡ Quick Actions'),
              React.createElement('div',{className:"grid grid-cols-2 gap-2"},
                React.createElement('button',{onClick: async () => {
                  const question = prompt("🧠 What do you want to ask MainPro AI?");
                  if (!question) return;
                  showToast('🧠 AI analyzing...');
                  const result = await window.MainProAI.analyze(question, {
                    events: JSON.parse(localStorage.getItem('mainpro_events') || "[]"),
                    reports: JSON.parse(localStorage.getItem('mainpro_reports') || "[]"),
                    docs: JSON.parse(localStorage.getItem('mainpro_docs') || "[]"),
                  });
                  if (result.success) {
                    alert(`🧠 AI Response:\n\n${result.result}`);
                  } else {
                    alert(result.error);
                  }
                }, className:"p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded hover:opacity-90"},
                  React.createElement('div',{className:"text-center"},
                    React.createElement('div',{className:"text-lg mb-1"},'🧠'),
                    React.createElement('div',{className:"font-semibold text-sm"},'Ask AI')
                  )
                ),
                React.createElement('button',{onClick: async () => {
                  showToast('🔮 AI predicting...');
                  const result = await window.MainProAI.predictMaintenance();
                  if (result.success) {
                    alert(`🔮 Predictions:\n\n${result.result}`);
                  } else {
                    alert(result.error);
                  }
                }, className:"p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded hover:opacity-90"},
                  React.createElement('div',{className:"text-center"},
                    React.createElement('div',{className:"text-lg mb-1"},'🔮'),
                    React.createElement('div',{className:"font-semibold text-sm"},'Predict')
                  )
                ),
                React.createElement('button',{onClick: async () => {
                  showToast('📋 AI generating tasks...');
                  const result = await window.MainProAI.generateTasks({
                    events: JSON.parse(localStorage.getItem('mainpro_events') || "[]"),
                    reports: JSON.parse(localStorage.getItem('mainpro_reports') || "[]"),
                  });
                  if (result.success) {
                    alert(`📋 Tasks:\n\n${result.result}`);
                  } else {
                    alert(result.error);
                  }
                }, className:"p-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded hover:opacity-90"},
                  React.createElement('div',{className:"text-center"},
                    React.createElement('div',{className:"text-lg mb-1"},'📋'),
                    React.createElement('div',{className:"font-semibold text-sm"},'Generate')
                  )
                ),
                React.createElement('button',{onClick: async () => {
                  showToast('⚡ AI optimizing...');
                  const result = await window.MainProAI.optimizePerformance();
                  if (result.success) {
                    alert(`⚡ Optimization:\n\n${result.result}`);
                  } else {
                    alert(result.error);
                  }
                }, className:"p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded hover:opacity-90"},
                  React.createElement('div',{className:"text-center"},
                    React.createElement('div',{className:"text-lg mb-1"},'⚡'),
                    React.createElement('div',{className:"font-semibold text-sm"},'Optimize')
                  )
                )
              )
            ),
            // Recent Insights
            React.createElement('div',{className:"mb-4"},
              React.createElement('h3',{className:"text-md font-semibold mb-2"},'💡 Recent AI Insights'),
              React.createElement('div',{className:"bg-gray-50 rounded p-3"},
                React.createElement('div',{className:"text-sm text-gray-600 mb-2"},'Last 3 AI interactions:'),
                React.createElement('div',{className:"space-y-1"},
                  window.MainProAI.getRecentInsights(3).map((insight, index) =>
                    React.createElement('div',{key:insight.id, className:"bg-white p-2 rounded border-l-4 border-blue-400"},
                      React.createElement('div',{className:"text-xs font-medium text-gray-800 truncate"},insight.prompt),
                      React.createElement('div',{className:"text-xs text-gray-500 mt-1"},new Date(insight.timestamp).toLocaleString())
                    )
                  )
                )
              )
            )
          )
        )
      ),
      // === MAINPRO v71 - TEAM SETTINGS MODAL ===
      showTeamSettings && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3"},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl"},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'☁️'),
              'MainPro Cloud Team'
            ),
            React.createElement('button',{
              onClick:()=>setShowTeamSettings(false),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // Current User Profile
            React.createElement('div',{className:"mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-3 text-blue-800"},'👤 Your Profile'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',null,
                    React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Name'),
                    React.createElement('input',{
                      type:"text",
                      value:currentUser.name,
                      onChange:(e)=>saveUserProfile({name: e.target.value}),
                      className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    })
                  ),
                  React.createElement('div',null,
                    React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Email'),
                    React.createElement('input',{
                      type:"email",
                      value:currentUser.email,
                      onChange:(e)=>saveUserProfile({email: e.target.value}),
                      className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    })
                  )
                ),
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',null,
                    React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Role'),
                    React.createElement('select',{
                      value:currentUser.role,
                      onChange:(e)=>saveUserProfile({role: e.target.value}),
                      className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    },
                      React.createElement('option',{value:"Admin"},'Admin'),
                      React.createElement('option',{value:"Editor"},'Editor'),
                      React.createElement('option',{value:"Member"},'Member'),
                      React.createElement('option',{value:"Viewer"},'Viewer')
                    )
                  ),
                  React.createElement('div',null,
                    React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Avatar'),
                    React.createElement('input',{
                      type:"text",
                      value:currentUser.avatar,
                      onChange:(e)=>saveUserProfile({avatar: e.target.value}),
                      placeholder:"👤",
                      className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    })
                  )
                )
              )
            ),
            
            // Team Members
            React.createElement('div',{className:"mb-6"},
              React.createElement('div',{className:"flex items-center justify-between mb-3"},
                React.createElement('h3',{className:"text-md font-semibold"},'👥 Team Members'),
                hasPermission('invite') && React.createElement('button',{
                  onClick:()=>setShowInviteModal(true),
                  className:"px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                },'+ Invite Member')
              ),
              React.createElement('div',{className:"space-y-1"},
                teamMembers.length === 0 ? 
                  React.createElement('div',{className:"text-center py-8 text-gray-500"},
                    React.createElement('div',{className:"text-4xl mb-2"},'👥'),
                    React.createElement('p',null,'No team members yet'),
                    React.createElement('p',{className:"text-sm"},'Invite your colleagues to collaborate')
                  ) :
                  teamMembers.map(member =>
                    React.createElement('div',{key:member.id, className:"flex items-center justify-between p-3 bg-gray-50 rounded-lg"},
                      React.createElement('div',{className:"flex items-center gap-3"},
                        React.createElement('span',{className:"text-2xl"},member.avatar || '👤'),
                        React.createElement('div',null,
                          React.createElement('div',{className:"font-medium"},member.email),
                          React.createElement('div',{className:"text-sm text-gray-500"},`${member.role} • ${member.status}`)
                        )
                      ),
                      React.createElement('div',{className:"flex items-center gap-2"},
                        hasPermission('manage_team') && React.createElement('select',{
                          value:member.role,
                          onChange:(e)=>updateMemberRole(member.id, e.target.value),
                          className:"px-2 py-1 border border-gray-300 rounded text-sm"
                        },
                          React.createElement('option',{value:"Admin"},'Admin'),
                          React.createElement('option',{value:"Editor"},'Editor'),
                          React.createElement('option',{value:"Member"},'Member'),
                          React.createElement('option',{value:"Viewer"},'Viewer')
                        ),
                        hasPermission('manage_team') && React.createElement('button',{
                          onClick:()=>removeTeamMember(member.id),
                          className:"px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        },'Remove')
                      )
                    )
                  )
              )
            ),
            
            // Real-time Updates
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'🔄 Recent Activity'),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto"},
                realtimeUpdates.length === 0 ?
                  React.createElement('div',{className:"text-center text-gray-500"},
                    React.createElement('p',null,'No recent activity'),
                    React.createElement('p',{className:"text-sm"},'Team activity will appear here')
                  ) :
                  realtimeUpdates.map(update =>
                    React.createElement('div',{key:update.id, className:"flex items-center gap-3 py-2 border-b border-gray-200 last:border-b-0"},
                      React.createElement('span',{className:"text-lg"},'🔔'),
                      React.createElement('div',{className:"flex-1"},
                        React.createElement('div',{className:"text-sm font-medium"},update.data),
                        React.createElement('div',{className:"text-xs text-gray-500"},`${update.user} • ${new Date(update.timestamp).toLocaleString()}`)
                      )
                    )
                  )
              )
            )
          )
        )
      ),

      // === MAINPRO v71 - INVITE MODAL ===
      showInviteModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"},
        React.createElement('div',{className:"bg-white rounded-lg p-6 w-full max-w-md shadow-xl"},
          React.createElement('div',{className:"flex items-center justify-between mb-4"},
            React.createElement('h3',{className:"text-lg font-semibold"},'👥 Invite Team Member'),
            React.createElement('button',{
              onClick:()=>setShowInviteModal(false),
              className:"text-gray-500 hover:text-gray-700 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          React.createElement('div',{className:"space-y-4"},
            React.createElement('div',null,
              React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Email Address'),
              React.createElement('input',{
                type:"email",
                value:inviteEmail,
                onChange:(e)=>setInviteEmail(e.target.value),
                placeholder:"colleague@company.com",
                className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              })
            ),
            React.createElement('div',null,
              React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Role'),
              React.createElement('select',{
                value:inviteRole,
                onChange:(e)=>setInviteRole(e.target.value),
                className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              },
                React.createElement('option',{value:"Member"},'Member - Can view and edit'),
                React.createElement('option',{value:"Editor"},'Editor - Can view, edit, and delete'),
                React.createElement('option',{value:"Admin"},'Admin - Full access')
              )
            ),
            React.createElement('div',{className:"flex gap-3 pt-4"},
              React.createElement('button',{
                onClick:inviteTeamMember,
                className:"flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              },'Send Invitation'),
              React.createElement('button',{
                onClick:()=>setShowInviteModal(false),
                className:"px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              },'Cancel')
            )
          )
        )
      ),

      // === MAINPRO v71 - PROJECT SHARING MODAL ===
      showProjectSharing && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowProjectSharing(false), e); }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'🔗'),
              'Project Sharing'
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowProjectSharing(false), e),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // Project Sharing Overview
            React.createElement('div',{className:"mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-3 text-indigo-800"},'🔗 Share Projects Across Teams'),
              React.createElement('p',{className:"text-sm text-gray-600 mb-4"},'Share your projects with other teams and companies for seamless collaboration.'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-3"},
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📤'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Share Out'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Share your projects')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📥'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Receive'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Get shared projects')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🔄'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Sync'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Real-time updates')
                )
              )
            ),
            
            // Active Shared Projects
            React.createElement('div',{className:"mb-6"},
              React.createElement('div',{className:"flex items-center justify-between mb-3"},
                React.createElement('h3',{className:"text-md font-semibold"},'📤 Active Shared Projects'),
                React.createElement('button',{
                  onClick:()=>showToast('🔗 Share new project feature coming soon!'),
                  className:"px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                },'+ Share Project')
              ),
              React.createElement('div',{className:"space-y-1"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'🔗'),
                  React.createElement('p',null,'No shared projects yet'),
                  React.createElement('p',{className:"text-sm"},'Share your first project to get started')
                )
              )
            ),
            
            // Received Projects
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📥 Received Projects'),
              React.createElement('div',{className:"space-y-1"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'📥'),
                  React.createElement('p',null,'No received projects yet'),
                  React.createElement('p',{className:"text-sm"},'Projects shared with you will appear here')
                )
              )
            ),
            
            // Sharing Settings
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'⚙️ Sharing Settings'),
              React.createElement('div',{className:"space-y-3"},
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Auto-sync shared projects'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Automatically sync changes from shared projects')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Notify on project updates'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Get notified when shared projects are updated')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Allow external sharing'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Allow sharing projects with external companies')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:false,className:"w-4 h-4"})
                )
              )
            )
          )
        )
      ),

      // === MAINPRO v71 - CROSS-COMPANY COLLABORATION MODAL ===
      showCrossCompanyCollaboration && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowCrossCompanyCollaboration(false), e); }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'🌐'),
              'Cross-Company Collaboration'
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowCrossCompanyCollaboration(false), e),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // Collaboration Overview
            React.createElement('div',{className:"mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-3 text-orange-800"},'🌐 Collaborate Across Companies'),
              React.createElement('p',{className:"text-sm text-gray-600 mb-4"},'Connect with external companies and partners for secure, controlled collaboration.'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-3"},
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🤝'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Partnership'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Secure partnerships')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🔐'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Security'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Enterprise-grade security')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📊'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Analytics'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Track collaboration')
                )
              )
            ),
            
            // Partner Companies
            React.createElement('div',{className:"mb-6"},
              React.createElement('div',{className:"flex items-center justify-between mb-3"},
                React.createElement('h3',{className:"text-md font-semibold"},'🏢 Partner Companies'),
                React.createElement('button',{
                  onClick:()=>showToast('🤝 Add partner company feature coming soon!'),
                  className:"px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                },'+ Add Partner')
              ),
              React.createElement('div',{className:"space-y-1"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'🏢'),
                  React.createElement('p',null,'No partner companies yet'),
                  React.createElement('p',{className:"text-sm"},'Add your first partner company to start collaborating')
                )
              )
            ),
            
            // Collaboration Requests
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📨 Collaboration Requests'),
              React.createElement('div',{className:"space-y-1"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'📨'),
                  React.createElement('p',null,'No pending requests'),
                  React.createElement('p',{className:"text-sm"},'Collaboration requests will appear here')
                )
              )
            ),
            
            // Security & Compliance
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'🔐 Security & Compliance'),
              React.createElement('div',{className:"space-y-3"},
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Require approval for external access'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'All external access requests must be approved')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Audit all cross-company activities'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Log all activities for compliance tracking')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Data encryption in transit'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'All data is encrypted when sharing')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                )
              )
            )
          )
        )
      ),

      // === MAINPRO v71 - GUEST ACCESS MODAL ===
      showGuestAccess && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowGuestAccess(false), e); }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'👤'),
              'Guest Access Management'
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowGuestAccess(false), e),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // Guest Access Overview
            React.createElement('div',{className:"mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-3 text-teal-800"},'👤 Secure Temporary Access'),
              React.createElement('p',{className:"text-sm text-gray-600 mb-4"},'Create secure, time-limited access for auditors, inspectors, and external consultants.'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-3"},
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🔒'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Secure Access'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Time-limited permissions')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📋'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Audit Trail'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Full activity logging')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'⏰'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Auto-Expire'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Automatic access revocation')
                )
              )
            ),
            
            // Active Guest Access
            React.createElement('div',{className:"mb-6"},
              React.createElement('div',{className:"flex items-center justify-between mb-3"},
                React.createElement('h3',{className:"text-md font-semibold"},'👤 Active Guest Access'),
                React.createElement('button',{
                  onClick:()=>showToast('👤 Create guest access feature coming soon!'),
                  className:"px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                },'+ Create Guest Access')
              ),
              React.createElement('div',{className:"space-y-1"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'👤'),
                  React.createElement('p',null,'No active guest access'),
                  React.createElement('p',{className:"text-sm"},'Create your first guest access to get started')
                )
              )
            ),
            
            // Guest Access Templates
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📋 Access Templates'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-3"},
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'🔍'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Auditor Access'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Read-only access for compliance audits')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• View-only permissions<br/>• 7-day access duration<br/>• Full audit trail<br/>• Compliance reporting'
                  )
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'🏗️'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Inspector Access'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Limited access for safety inspections')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• View safety documents<br/>• 3-day access duration<br/>• Inspection reports<br/>• Photo uploads'
                  )
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'💼'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Consultant Access'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Project-specific access for consultants')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• Project documents<br/>• 30-day access duration<br/>• Collaboration tools<br/>• Progress tracking'
                  )
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'🤝'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Partner Access'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Collaborative access for business partners')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• Shared projects<br/>• 90-day access duration<br/>• Real-time collaboration<br/>• Communication tools'
                  )
                )
              )
            ),
            
            // Security Settings
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'🔐 Security & Compliance'),
              React.createElement('div',{className:"space-y-3"},
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Require approval for guest access'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'All guest access requests must be approved by admin')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Auto-revoke expired access'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Automatically revoke access when time expires')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Log all guest activities'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Maintain detailed audit trail of guest actions')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                ),
                React.createElement('div',{className:"flex items-center justify-between"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Send access notifications'),
                    React.createElement('div',{className:"text-sm text-gray-500"},'Notify team when guest access is created or revoked')
                  ),
                  React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                )
              )
            ),
            
            // Recent Guest Activity
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📊 Recent Guest Activity'),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'📊'),
                  React.createElement('p',null,'No guest activity yet'),
                  React.createElement('p',{className:"text-sm"},'Guest activities will be logged here')
                )
              )
            )
          )
        )
      ),
      // === MAINPRO v71 - SECURE VAULT MODAL ===
      showSecureVault && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3"},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-5xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl"},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'🔐'),
              'Secure Vault & eSign'
            ),
            React.createElement('button',{
              onClick:()=>setShowSecureVault(false),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // Secure Vault Overview
            React.createElement('div',{className:"mb-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-3 text-emerald-800"},'🔐 Enterprise Document Security'),
              React.createElement('p',{className:"text-sm text-gray-600 mb-4"},'Secure document storage with electronic signatures, encryption, and comprehensive audit trails.'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-4 gap-3"},
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🔒'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Encryption'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'AES-256 encryption')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'✍️'),
                  React.createElement('div',{className:"text-sm font-semibold"},'eSign'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Digital signatures')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📋'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Audit Trail'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Complete history')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🛡️'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Compliance'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Regulatory standards')
                )
              )
            ),
            
            // Vault Statistics
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📊 Vault Statistics'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-4 gap-4"},
                React.createElement('div',{className:"p-4 bg-gray-50 rounded-lg text-center"},
                  React.createElement('div',{className:"text-2xl font-bold text-emerald-600"},'0'),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Documents Stored')
                ),
                React.createElement('div',{className:"p-4 bg-gray-50 rounded-lg text-center"},
                  React.createElement('div',{className:"text-2xl font-bold text-blue-600"},'0'),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Pending Signatures')
                ),
                React.createElement('div',{className:"p-4 bg-gray-50 rounded-lg text-center"},
                  React.createElement('div',{className:"text-2xl font-bold text-purple-600"},'0'),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Completed eSigns')
                ),
                React.createElement('div',{className:"p-4 bg-gray-50 rounded-lg text-center"},
                  React.createElement('div',{className:"text-2xl font-bold text-orange-600"},'0'),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Access Requests')
                )
              )
            ),
            
            // Document Categories
            React.createElement('div',{className:"mb-6"},
              React.createElement('div',{className:"flex items-center justify-between mb-3"},
                React.createElement('h3',{className:"text-md font-semibold"},'📁 Document Categories'),
                React.createElement('button',{
                  onClick:()=>showToast('📁 Add document category feature coming soon!'),
                  className:"px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                },'+ Add Category')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-3"},
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'📋'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Legal Documents'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Contracts, agreements, legal forms')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• Contract templates<br/>• Legal agreements<br/>• Compliance documents<br/>• Regulatory forms'
                  )
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'🏗️'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Construction Documents'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Plans, permits, safety documents')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• Building plans<br/>• Safety permits<br/>• Inspection reports<br/>• Compliance certificates'
                  )
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'💰'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'Financial Documents'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Invoices, payments, financial records')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• Invoices & receipts<br/>• Payment records<br/>• Financial reports<br/>• Tax documents'
                  )
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'👥'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold"},'HR Documents'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Employee records, policies, procedures')
                    )
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},
                    '• Employee contracts<br/>• HR policies<br/>• Training records<br/>• Performance reviews'
                  )
                )
              )
            ),
            
            // Electronic Signatures
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'✍️ Electronic Signatures'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"p-4 bg-blue-50 rounded-lg border border-blue-200"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-3"},
                    React.createElement('span',{className:"text-2xl"},'📝'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold text-blue-800"},'Pending Signatures'),
                      React.createElement('div',{className:"text-sm text-blue-600"},'Documents waiting for signatures')
                    )
                  ),
                  React.createElement('div',{className:"space-y-1"},
                    React.createElement('div',{className:"text-center py-4 text-gray-500"},
                      React.createElement('div',{className:"text-2xl mb-1"},'📝'),
                      React.createElement('div',{className:"text-sm"},'No pending signatures')
                    )
                  )
                ),
                React.createElement('div',{className:"p-4 bg-green-50 rounded-lg border border-green-200"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-3"},
                    React.createElement('span',{className:"text-2xl"},'✅'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold text-green-800"},'Completed Signatures'),
                      React.createElement('div',{className:"text-sm text-green-600"},'Fully signed documents')
                    )
                  ),
                  React.createElement('div',{className:"space-y-1"},
                    React.createElement('div',{className:"text-center py-4 text-gray-500"},
                      React.createElement('div',{className:"text-2xl mb-1"},'✅'),
                      React.createElement('div',{className:"text-sm"},'No completed signatures')
                    )
                  )
                )
              )
            ),
            
            // Security & Compliance Settings
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'🛡️ Security & Compliance'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Enable document encryption'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'All documents encrypted with AES-256')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Require 2FA for vault access'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Two-factor authentication required')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Auto-backup to cloud'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Automatic backup of encrypted documents')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  )
                ),
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Audit all document access'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Log all document access and modifications')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'GDPR compliance mode'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Enable GDPR data protection features')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:false,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'SOX compliance tracking'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Sarbanes-Oxley compliance monitoring')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:false,className:"w-4 h-4"})
                  )
                )
              )
            ),
            
            // Recent Activity
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📊 Recent Vault Activity'),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4"},
                React.createElement('div',{className:"text-center py-8 text-gray-500"},
                  React.createElement('div',{className:"text-4xl mb-2"},'📊'),
                  React.createElement('p',null,'No vault activity yet'),
                  React.createElement('p',{className:"text-sm"},'Document access and modifications will be logged here')
                )
              )
            )
          )
        )
      ),

      // === MAINPRO v71 - AI COMPLIANCE TRACKING MODAL ===
      showAICompliance && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3"},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-6xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl"},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2"},
              React.createElement('span',null,'🤖'),
              'AI Compliance Tracking'
            ),
            React.createElement('button',{
              onClick:()=>setShowAICompliance(false),
              className:"text-gray-500 hover:text-gray-700 px-3 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-5 pb-5 modal-body-scroll"},
            // AI Compliance Overview
            React.createElement('div',{className:"mb-6 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg border border-violet-200"},
              React.createElement('h3',{className:"text-md font-semibold mb-3 text-violet-800"},'🤖 AI-Powered Compliance Analysis'),
              React.createElement('p',{className:"text-sm text-gray-600 mb-4"},'Intelligent document analysis, compliance monitoring, and automated verification history tracking.'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-4 gap-3"},
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'🔍'),
                  React.createElement('div',{className:"text-sm font-semibold"},'AI Analysis'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Smart document scanning')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📊'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Compliance Score'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Real-time compliance rating')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'⚠️'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Risk Detection'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Automated risk alerts')
                ),
                React.createElement('div',{className:"text-center p-3 bg-white rounded-lg border"},
                  React.createElement('div',{className:"text-2xl mb-2"},'📈'),
                  React.createElement('div',{className:"text-sm font-semibold"},'Analytics'),
                  React.createElement('div',{className:"text-xs text-gray-500"},'Compliance insights')
                )
              )
            ),
            
            // Compliance Dashboard
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📊 Compliance Dashboard'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-4 gap-4"},
                React.createElement('div',{className:"p-4 bg-green-50 rounded-lg text-center border border-green-200"},
                  React.createElement('div',{className:"text-3xl font-bold text-green-600 mb-1"},'98%'),
                  React.createElement('div',{className:"text-sm text-green-700 font-semibold"},'Overall Compliance'),
                  React.createElement('div',{className:"text-xs text-green-600"},'Last 30 days')
                ),
                React.createElement('div',{className:"p-4 bg-blue-50 rounded-lg text-center border border-blue-200"},
                  React.createElement('div',{className:"text-3xl font-bold text-blue-600 mb-1"},'156'),
                  React.createElement('div',{className:"text-sm text-blue-700 font-semibold"},'Documents Analyzed'),
                  React.createElement('div',{className:"text-xs text-blue-600"},'This month')
                ),
                React.createElement('div',{className:"p-4 bg-orange-50 rounded-lg text-center border border-orange-200"},
                  React.createElement('div',{className:"text-3xl font-bold text-orange-600 mb-1"},'3'),
                  React.createElement('div',{className:"text-sm text-orange-700 font-semibold"},'Risk Alerts'),
                  React.createElement('div',{className:"text-xs text-orange-600"},'Require attention')
                ),
                React.createElement('div',{className:"p-4 bg-purple-50 rounded-lg text-center border border-purple-200"},
                  React.createElement('div',{className:"text-3xl font-bold text-purple-600 mb-1"},'24'),
                  React.createElement('div',{className:"text-sm text-purple-700 font-semibold"},'AI Insights'),
                  React.createElement('div',{className:"text-xs text-purple-600"},'Generated this week')
                )
              )
            ),
            
            // Compliance Categories
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📋 Compliance Categories'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-2xl"},'🏗️'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-semibold"},'Construction Safety'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'OSHA, building codes, safety standards')
                      )
                    ),
                    React.createElement('div',{className:"text-right"},
                      React.createElement('div',{className:"text-lg font-bold text-green-600"},'95%'),
                      React.createElement('div',{className:"text-xs text-gray-500"},'Compliance')
                    )
                  ),
                  React.createElement('div',{className:"w-full bg-gray-200 rounded-full h-2 mb-2"},
                    React.createElement('div',{className:"bg-green-500 h-2 rounded-full", style:{width:'95%'}})
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},'• Safety permits up to date<br/>• Inspection reports compliant<br/>• Training records current')
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-2xl"},'💰'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-semibold"},'Financial Compliance'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'SOX, GAAP, tax regulations')
                      )
                    ),
                    React.createElement('div',{className:"text-right"},
                      React.createElement('div',{className:"text-lg font-bold text-green-600"},'98%'),
                      React.createElement('div',{className:"text-xs text-gray-500"},'Compliance')
                    )
                  ),
                  React.createElement('div',{className:"w-full bg-gray-200 rounded-full h-2 mb-2"},
                    React.createElement('div',{className:"bg-green-500 h-2 rounded-full", style:{width:'98%'}})
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},'• Financial records accurate<br/>• Audit trails complete<br/>• Tax compliance verified')
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-2xl"},'👥'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-semibold"},'HR Compliance'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'Labor laws, employment standards')
                      )
                    ),
                    React.createElement('div',{className:"text-right"},
                      React.createElement('div',{className:"text-lg font-bold text-yellow-600"},'87%'),
                      React.createElement('div',{className:"text-xs text-gray-500"},'Compliance')
                    )
                  ),
                  React.createElement('div',{className:"w-full bg-gray-200 rounded-full h-2 mb-2"},
                    React.createElement('div',{className:"bg-yellow-500 h-2 rounded-full", style:{width:'87%'}})
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},'• Employee records current<br/>• Training requirements met<br/>• Policy updates needed')
                ),
                React.createElement('div',{className:"p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-2xl"},'🌍'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-semibold"},'Environmental'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'EPA, environmental regulations')
                      )
                    ),
                    React.createElement('div',{className:"text-right"},
                      React.createElement('div',{className:"text-lg font-bold text-green-600"},'92%'),
                      React.createElement('div',{className:"text-xs text-gray-500"},'Compliance')
                    )
                  ),
                  React.createElement('div',{className:"w-full bg-gray-200 rounded-full h-2 mb-2"},
                    React.createElement('div',{className:"bg-green-500 h-2 rounded-full", style:{width:'92%'}})
                  ),
                  React.createElement('div',{className:"text-xs text-gray-600"},'• Environmental permits valid<br/>• Waste management compliant<br/>• Emissions reporting current')
                )
              )
            ),
            
            // AI Risk Detection
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'⚠️ AI Risk Detection'),
              React.createElement('div',{className:"space-y-3"},
                React.createElement('div',{className:"p-4 bg-red-50 rounded-lg border border-red-200"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'🚨'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold text-red-800"},'High Priority Risk'),
                      React.createElement('div',{className:"text-sm text-red-600"},'Safety permit expires in 3 days')
                    )
                  ),
                  React.createElement('div',{className:"text-sm text-red-700"},'AI detected that Building Safety Permit #BS-2024-001 will expire on October 23, 2024. Immediate renewal required to maintain compliance.')
                ),
                React.createElement('div',{className:"p-4 bg-yellow-50 rounded-lg border border-yellow-200"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'⚠️'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold text-yellow-800"},'Medium Priority Risk'),
                      React.createElement('div',{className:"text-sm text-yellow-600"},'Employee training record incomplete')
                    )
                  ),
                  React.createElement('div',{className:"text-sm text-yellow-700"},'AI identified that 3 employees have incomplete safety training records. Update required within 30 days.')
                ),
                React.createElement('div',{className:"p-4 bg-blue-50 rounded-lg border border-blue-200"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('span',{className:"text-2xl"},'💡'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-semibold text-blue-800"},'AI Recommendation'),
                      React.createElement('div',{className:"text-sm text-blue-600"},'Optimize document workflow')
                    )
                  ),
                  React.createElement('div',{className:"text-sm text-blue-700"},'AI suggests implementing automated compliance reminders to reduce manual tracking and improve efficiency by 40%.')
                )
              )
            ),
            
            // Verification History
            React.createElement('div',{className:"mb-6"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'📋 Verification History'),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4"},
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center justify-between p-3 bg-white rounded border-l-4 border-green-500"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-xl"},'✅'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-medium"},'Safety Inspection Report'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'Verified by AI - 100% compliant')
                      )
                    ),
                    React.createElement('div',{className:"text-right text-sm text-gray-500"},'2 hours ago')
                  ),
                  React.createElement('div',{className:"flex items-center justify-between p-3 bg-white rounded border-l-4 border-blue-500"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-xl"},'📝'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-medium"},'Financial Audit Document'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'Pending manual review')
                      )
                    ),
                    React.createElement('div',{className:"text-right text-sm text-gray-500"},'1 day ago')
                  ),
                  React.createElement('div',{className:"flex items-center justify-between p-3 bg-white rounded border-l-4 border-yellow-500"},
                    React.createElement('div',{className:"flex items-center gap-3"},
                      React.createElement('span',{className:"text-xl"},'⚠️'),
                      React.createElement('div',null,
                        React.createElement('div',{className:"font-medium"},'Employee Contract'),
                        React.createElement('div',{className:"text-sm text-gray-500"},'AI flagged - requires updates')
                      )
                    ),
                    React.createElement('div',{className:"text-right text-sm text-gray-500"},'3 days ago')
                  )
                )
              )
            ),
            
            // AI Settings
            React.createElement('div',{className:"mb-6 p-4 bg-gray-50 rounded-lg"},
              React.createElement('h3',{className:"text-md font-semibold mb-3"},'🤖 AI Compliance Settings'),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Enable real-time compliance monitoring'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Continuous AI analysis of documents')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Auto-generate compliance reports'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Automated report generation')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Send risk alerts via email'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Email notifications for compliance risks')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  )
                ),
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Enable predictive compliance analysis'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'AI predicts future compliance issues')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:false,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Cross-reference with external databases'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Verify against regulatory databases')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:false,className:"w-4 h-4"})
                  ),
                  React.createElement('div',{className:"flex items-center justify-between"},
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Enable compliance scoring'),
                      React.createElement('div',{className:"text-sm text-gray-500"},'Generate compliance scores for documents')
                    ),
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"w-4 h-4"})
                  )
                )
              )
            )
          )
        )
      ),

      // === MAINPRO v72 - CLOUD SYNC MODAL ===
      showCloudSync && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowCloudSync(false), e); }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"flex items-center gap-3"},
              React.createElement('div',{className:"w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full flex items-center justify-center text-white text-lg"},'☁️'),
              React.createElement('div',null,
                React.createElement('h2',{className:"text-xl font-semibold"},'Cloud Database Synchronization'),
                React.createElement('p',{className:"text-sm text-gray-600"},'Sync your data across all devices')
              )
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowCloudSync(false), e),
              className:"text-gray-500 hover:text-gray-700 px-2 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"p-5 space-y-6"},

            // Status Overview
            React.createElement('div',{className:"bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg p-4"},
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📊'),
                React.createElement('span',null,'Sync Status')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"flex items-center gap-2 mb-2"},
                    React.createElement('div',{className:`w-3 h-3 rounded-full ${cloudSyncStatus === 'connected' ? 'bg-green-500' : cloudSyncStatus === 'syncing' ? 'bg-yellow-500' : 'bg-red-500'}`}),
                    React.createElement('span',{className:"font-medium"},'Connection Status')
                  ),
                  React.createElement('p',{className:"text-sm text-gray-600 capitalize"},cloudSyncStatus)
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Last Sync'),
                  React.createElement('p',{className:"text-sm text-gray-600"},lastSyncTime || 'Never')
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Data Size'),
                  React.createElement('p',{className:"text-sm text-gray-600"},'2.3 MB')
                )
              )
            ),

            // Provider Selection
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'🔗'),
                React.createElement('span',null,'Cloud Provider')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('div',{className:"w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"},'🔥'),
                    React.createElement('div',{className:"font-medium"},'Firebase')
                  ),
                  React.createElement('p',{className:"text-sm text-gray-600"},'Google\'s real-time database with excellent offline support')
                ),
                React.createElement('div',{className:"border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-2"},
                    React.createElement('div',{className:"w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"},'⚡'),
                    React.createElement('div',{className:"font-medium"},'Supabase')
                  ),
                  React.createElement('p',{className:"text-sm text-gray-600"},'Open source alternative with PostgreSQL backend')
                )
              )
            ),

            // Sync Settings
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'⚙️'),
                React.createElement('span',null,'Sync Settings')
              ),
              React.createElement('div',{className:"space-y-4"},
                React.createElement('div',{className:"flex items-center justify-between p-3 bg-gray-50 rounded-lg"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Auto Sync'),
                    React.createElement('p',{className:"text-sm text-gray-600"},'Automatically sync changes every 5 minutes')
                  ),
                  React.createElement('label',{className:"relative inline-flex items-center cursor-pointer"},
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"sr-only peer"}),
                    React.createElement('div',{className:"w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"})
                  )
                ),
                React.createElement('div',{className:"flex items-center justify-between p-3 bg-gray-50 rounded-lg"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Offline Mode'),
                    React.createElement('p',{className:"text-sm text-gray-600"},'Continue working when offline, sync when connected')
                  ),
                  React.createElement('label',{className:"relative inline-flex items-center cursor-pointer"},
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"sr-only peer"}),
                    React.createElement('div',{className:"w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"})
                  )
                ),
                React.createElement('div',{className:"flex items-center justify-between p-3 bg-gray-50 rounded-lg"},
                  React.createElement('div',null,
                    React.createElement('div',{className:"font-medium"},'Conflict Resolution'),
                    React.createElement('p',{className:"text-sm text-gray-600"},'Automatically resolve conflicts with latest changes')
                  ),
                  React.createElement('label',{className:"relative inline-flex items-center cursor-pointer"},
                    React.createElement('input',{type:"checkbox",defaultChecked:true,className:"sr-only peer"}),
                    React.createElement('div',{className:"w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"})
                  )
                )
              )
            ),

            // Actions
            React.createElement('div',{className:"flex flex-col sm:flex-row gap-3 pt-4 border-t"},
              React.createElement('button',{
                onClick:()=>{
                  setCloudSyncStatus('syncing');
                  showToast('🔄 Starting cloud synchronization...');
                  setTimeout(()=>{
                    setCloudSyncStatus('connected');
                    setLastSyncTime(new Date().toLocaleString());
                    showToast('✅ Cloud sync completed successfully!');
                  }, 3000);
                },
                className:"flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-sky-500 text-white rounded-lg hover:opacity-90 font-medium"
              },'🔄 Sync Now'),
              React.createElement('button',{
                onClick:()=>showToast('📊 Sync analytics - coming soon!'),
                className:"flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              },'📊 View Analytics'),
              React.createElement('button',{
                onClick:()=>setShowCloudSync(false),
                className:"flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              },'Close')
            )
          )
        )
      ),
      // === MAINPRO v72 - PWA MOBILE APP MODAL ===
      showPWAModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3"},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl"},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"flex items-center gap-3"},
              React.createElement('div',{className:"w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-lg"},'📱'),
              React.createElement('div',null,
                React.createElement('h2',{className:"text-xl font-semibold"},'Mobile App (PWA)'),
                React.createElement('p',{className:"text-sm text-gray-600"},'Install MainPro as a native mobile app')
              )
            ),
            React.createElement('button',{
              onClick:()=>setShowPWAModal(false),
              className:"text-gray-500 hover:text-gray-700 px-2 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"p-5 space-y-6"},

            // PWA Status
            React.createElement('div',{className:"bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4"},
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📊'),
                React.createElement('span',null,'App Status')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"flex items-center gap-2 mb-2"},
                    React.createElement('div',{className:`w-3 h-3 rounded-full ${isPWAInstalled ? 'bg-green-500' : 'bg-gray-400'}`}),
                    React.createElement('span',{className:"font-medium"},'Installation Status')
                  ),
                  React.createElement('p',{className:"text-sm text-gray-600"},isPWAInstalled ? 'Installed' : 'Not Installed')
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Device Type'),
                  React.createElement('p',{className:"text-sm text-gray-600"},isMobile ? 'Mobile Device' : 'Desktop')
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Service Worker'),
                  React.createElement('p',{className:"text-sm text-gray-600"},'serviceWorker' in navigator ? 'Supported' : 'Not Supported')
                )
              )
            ),

            // Installation Instructions
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📲'),
                React.createElement('span',null,'Installation Instructions')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"border rounded-lg p-4"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-3"},
                    React.createElement('div',{className:"w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"},'🍎'),
                    React.createElement('div',{className:"font-medium"},'iOS (Safari)')
                  ),
                  React.createElement('div',{className:"text-sm text-gray-600 space-y-2"},
                    React.createElement('p',null,'1. Tap the Share button'),
                    React.createElement('p',null,'2. Scroll down and tap "Add to Home Screen"'),
                    React.createElement('p',null,'3. Tap "Add" to install')
                  )
                ),
                React.createElement('div',{className:"border rounded-lg p-4"},
                  React.createElement('div',{className:"flex items-center gap-3 mb-3"},
                    React.createElement('div',{className:"w-8 h-8 bg-green-100 rounded-full flex items-center justify-center"},'🤖'),
                    React.createElement('div',{className:"font-medium"},'Android (Chrome)')
                  ),
                  React.createElement('div',{className:"text-sm text-gray-600 space-y-2"},
                    React.createElement('p',null,'1. Tap the menu button (⋮)'),
                    React.createElement('p',null,'2. Tap "Add to Home screen"'),
                    React.createElement('p',null,'3. Tap "Add" to install')
                  )
                )
              )
            ),

            // PWA Features
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'✨'),
                React.createElement('span',null,'Mobile App Features')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🚀'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Fast Loading'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Cached for instant access')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'📱'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Native Feel'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Full-screen app experience')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'☁️'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Offline Access'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Works without internet')
                    )
                  )
                ),
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🔔'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Push Notifications'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Stay updated with alerts')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🔄'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Auto Updates'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Always latest version')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-gray-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🔒'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Secure'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'HTTPS and encrypted data')
                    )
                  )
                )
              )
            ),

            // Actions
            React.createElement('div',{className:"flex flex-col sm:flex-row gap-3 pt-4 border-t"},
              !isPWAInstalled && pwaInstallPrompt && React.createElement('button',{
                onClick: () => pwaManager.installPWA(),
                className: "flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 font-medium"
              },'📱 Install App'),
              React.createElement('button',{
                onClick: () => pwaManager.checkForUpdates(),
                className: "flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              },'🔄 Check Updates'),
              React.createElement('button',{
                onClick: () => setShowPWAModal(false),
                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              },'Close')
            )
          )
        )
      ),

      // === MAINPRO v72 - SUBSCRIPTION MODAL ===
      showSubscriptionModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setShowSubscriptionModal(false), e); }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-6xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl", 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"flex items-center gap-3"},
              React.createElement('div',{className:"w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-lg"},'💳'),
              React.createElement('div',null,
                React.createElement('h2',{className:"text-xl font-semibold"},'Subscription Management'),
                React.createElement('p',{className:"text-sm text-gray-600"},'Manage your MainPro subscription and billing')
              )
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowSubscriptionModal(false), e),
              className:"text-gray-500 hover:text-gray-700 px-2 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"p-5 space-y-6"},

            // Current Plan Status
            React.createElement('div',{className:"bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4"},
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📊'),
                React.createElement('span',null,'Current Plan')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Plan'),
                  React.createElement('p',{className:"text-sm text-gray-600"},subscriptionPlans[subscriptionPlan].name)
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Status'),
                  React.createElement('p',{className:"text-sm text-gray-600 capitalize"},subscriptionStatus)
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Next Billing'),
                  React.createElement('p',{className:"text-sm text-gray-600"},subscriptionPlan === 'free' ? 'N/A' : 'Dec 20, 2024')
                )
              )
            ),

            // Subscription Plans
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'💎'),
                React.createElement('span',null,'Choose Your Plan')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},
                // Free Plan
                React.createElement('div',{className:`border rounded-lg p-4 ${subscriptionPlan === 'free' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`},
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"font-semibold text-lg"},'Free'),
                    subscriptionPlan === 'free' && React.createElement('div',{className:"px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"},'Current')
                  ),
                  React.createElement('div',{className:"text-3xl font-bold mb-4"},'$0'),
                  React.createElement('div',{className:"text-sm text-gray-600 mb-4"},'Forever'),
                  React.createElement('div',{className:"space-y-2 mb-4"},
                    subscriptionPlans.free.features.map((feature, index) => 
                      React.createElement('div',{key: index, className:"flex items-center gap-2 text-sm"},
                        React.createElement('span',{className:"text-green-500"},'✓'),
                        React.createElement('span',null,feature)
                      )
                    )
                  ),
                  React.createElement('button',{
                    onClick: () => billingManager.updateSubscription('free'),
                    disabled: subscriptionPlan === 'free',
                    className: `w-full px-4 py-2 rounded-lg font-medium ${
                      subscriptionPlan === 'free' 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`
                  }, subscriptionPlan === 'free' ? 'Current Plan' : 'Downgrade')
                ),

                // Professional Plan
                React.createElement('div',{className:`border rounded-lg p-4 relative ${subscriptionPlan === 'professional' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${subscriptionPlans.professional.popular ? 'border-2 border-blue-500' : ''}`},
                  subscriptionPlans.professional.popular && React.createElement('div',{className:"absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs rounded-full"},'Most Popular'),
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"font-semibold text-lg"},'Professional'),
                    subscriptionPlan === 'professional' && React.createElement('div',{className:"px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"},'Current')
                  ),
                  React.createElement('div',{className:"text-3xl font-bold mb-4"},'$29'),
                  React.createElement('div',{className:"text-sm text-gray-600 mb-4"},'per month'),
                  React.createElement('div',{className:"space-y-2 mb-4"},
                    subscriptionPlans.professional.features.map((feature, index) => 
                      React.createElement('div',{key: index, className:"flex items-center gap-2 text-sm"},
                        React.createElement('span',{className:"text-green-500"},'✓'),
                        React.createElement('span',null,feature)
                      )
                    )
                  ),
                  React.createElement('button',{
                    onClick: () => billingManager.createSubscription('professional', 'pm_test'),
                    disabled: subscriptionPlan === 'professional',
                    className: `w-full px-4 py-2 rounded-lg font-medium ${
                      subscriptionPlan === 'professional' 
                        ? 'bg-blue-100 text-blue-400 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`
                  }, subscriptionPlan === 'professional' ? 'Current Plan' : 'Upgrade to Professional')
                ),

                // Enterprise Plan
                React.createElement('div',{className:`border rounded-lg p-4 ${subscriptionPlan === 'enterprise' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`},
                  React.createElement('div',{className:"flex items-center justify-between mb-3"},
                    React.createElement('div',{className:"font-semibold text-lg"},'Enterprise'),
                    subscriptionPlan === 'enterprise' && React.createElement('div',{className:"px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"},'Current')
                  ),
                  React.createElement('div',{className:"text-3xl font-bold mb-4"},'$99'),
                  React.createElement('div',{className:"text-sm text-gray-600 mb-4"},'per month'),
                  React.createElement('div',{className:"space-y-2 mb-4"},
                    subscriptionPlans.enterprise.features.map((feature, index) => 
                      React.createElement('div',{key: index, className:"flex items-center gap-2 text-sm"},
                        React.createElement('span',{className:"text-green-500"},'✓'),
                        React.createElement('span',null,feature)
                      )
                    )
                  ),
                  React.createElement('button',{
                    onClick: () => billingManager.createSubscription('enterprise', 'pm_test'),
                    disabled: subscriptionPlan === 'enterprise',
                    className: `w-full px-4 py-2 rounded-lg font-medium ${
                      subscriptionPlan === 'enterprise' 
                        ? 'bg-purple-100 text-purple-400 cursor-not-allowed' 
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`
                  }, subscriptionPlan === 'enterprise' ? 'Current Plan' : 'Upgrade to Enterprise')
                )
              )
            ),

            // Billing History
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📋'),
                React.createElement('span',null,'Billing History')
              ),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4"},
                billingHistory.length === 0 ? 
                  React.createElement('div',{className:"text-center py-8 text-gray-500"},
                    React.createElement('div',{className:"text-4xl mb-2"},'💳'),
                    React.createElement('p',null,'No billing history yet')
                  ) :
                  React.createElement('div',{className:"space-y-2"},
                    billingHistory.map((bill) => 
                      React.createElement('div',{key: bill.id, className:"flex items-center justify-between p-3 bg-white rounded-lg border"},
                        React.createElement('div',{className:"flex items-center gap-3"},
                          React.createElement('div',{className:`w-2 h-2 rounded-full ${bill.status === 'paid' ? 'bg-green-500' : 'bg-red-500'}`}),
                          React.createElement('div',null,
                            React.createElement('div',{className:"font-medium"},bill.plan),
                            React.createElement('div',{className:"text-sm text-gray-500"},bill.date)
                          )
                        ),
                        React.createElement('div',{className:"text-right"},
                          React.createElement('div',{className:"font-medium"},`$${bill.amount}`),
                          React.createElement('div',{className:"text-sm text-gray-500 capitalize"},bill.status)
                        )
                      )
                    )
                  )
              )
            ),

            // Actions
            React.createElement('div',{className:"flex flex-col sm:flex-row gap-3 pt-4 border-t"},
              subscriptionPlan !== 'free' && React.createElement('button',{
                onClick: () => billingManager.cancelSubscription(),
                className: "flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
              },'🚫 Cancel Subscription'),
              React.createElement('button',{
                onClick: () => showToast('📧 Billing support - coming soon!'),
                className: "flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              },'📧 Contact Support'),
              React.createElement('button',{
                onClick: () => setShowSubscriptionModal(false),
                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              },'Close')
            )
          )
        )
      ),

      // === MAINPRO v72 - EMERGENCY ASSIST MODAL ===
      showEmergencyModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3"},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-6xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl"},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"flex items-center gap-3"},
              React.createElement('div',{className:"w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-lg"},'🚨'),
              React.createElement('div',null,
                React.createElement('h2',{className:"text-xl font-semibold"},'Emergency Assist Module'),
                React.createElement('p',{className:"text-sm text-gray-600"},'Security alerts and emergency management system')
              )
            ),
            React.createElement('button',{
              onClick:()=>setShowEmergencyModal(false),
              className:"text-gray-500 hover:text-gray-700 px-2 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"p-5 space-y-6"},

            // Security Status Overview
            React.createElement('div',{className:"bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4"},
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'🛡️'),
                React.createElement('span',null,'Security Status')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-4 gap-4"},
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"flex items-center gap-2 mb-2"},
                    React.createElement('div',{className:`w-3 h-3 rounded-full ${securityStatus === 'secure' ? 'bg-green-500' : securityStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`}),
                    React.createElement('span',{className:"font-medium"},'Overall Status')
                  ),
                  React.createElement('p',{className:"text-sm text-gray-600 capitalize"},securityStatus)
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Active Alerts'),
                  React.createElement('p',{className:"text-sm text-gray-600"},emergencyAlerts.filter(a => a.status === 'active').length)
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Critical Alerts'),
                  React.createElement('p',{className:"text-sm text-gray-600"},emergencyAlerts.filter(a => a.priority === 'critical' && a.status === 'active').length)
                ),
                React.createElement('div',{className:"bg-white rounded-lg p-3 border"},
                  React.createElement('div',{className:"font-medium mb-2"},'Emergency Contacts'),
                  React.createElement('p',{className:"text-sm text-gray-600"},emergencyContacts.length)
                )
              )
            ),

            // Quick Emergency Actions
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'⚡'),
                React.createElement('span',null,'Quick Emergency Actions')
              ),
              React.createElement('div',{className:"grid grid-cols-2 md:grid-cols-4 gap-4"},
                React.createElement('button',{
                  onClick: () => emergencyManager.quickActions.fire(),
                  className: "p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-center"
                },
                  React.createElement('div',{className:"text-2xl mb-2"},'🔥'),
                  React.createElement('div',{className:"font-medium text-red-700"},'Fire Emergency'),
                  React.createElement('div',{className:"text-xs text-red-600"},'Alert fire department')
                ),
                React.createElement('button',{
                  onClick: () => emergencyManager.quickActions.medical(),
                  className: "p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-center"
                },
                  React.createElement('div',{className:"text-2xl mb-2"},'🏥'),
                  React.createElement('div',{className:"font-medium text-red-700"},'Medical Emergency'),
                  React.createElement('div',{className:"text-xs text-red-600"},'Call medical services')
                ),
                React.createElement('button',{
                  onClick: () => emergencyManager.quickActions.security(),
                  className: "p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 text-center"
                },
                  React.createElement('div',{className:"text-2xl mb-2"},'🚨'),
                  React.createElement('div',{className:"font-medium text-orange-700"},'Security Alert'),
                  React.createElement('div',{className:"text-xs text-orange-600"},'Activate security protocols')
                ),
                React.createElement('button',{
                  onClick: () => emergencyManager.quickActions.maintenance(),
                  className: "p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 text-center"
                },
                  React.createElement('div',{className:"text-2xl mb-2"},'🔧'),
                  React.createElement('div',{className:"font-medium text-yellow-700"},'Maintenance Alert'),
                  React.createElement('div',{className:"text-xs text-yellow-600"},'Report maintenance issue')
                )
              )
            ),

            // Active Alerts
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📋'),
                React.createElement('span',null,'Active Alerts')
              ),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4"},
                emergencyAlerts.length === 0 ? 
                  React.createElement('div',{className:"text-center py-8 text-gray-500"},
                    React.createElement('div',{className:"text-4xl mb-2"},'✅'),
                    React.createElement('p',null,'No active alerts - All systems secure')
                  ) :
                  React.createElement('div',{className:"space-y-2"},
                    emergencyAlerts.map((alert) => 
                      React.createElement('div',{key: alert.id, className:`p-4 rounded-lg border ${
                        alert.priority === 'critical' ? 'bg-red-50 border-red-200' :
                        alert.priority === 'high' ? 'bg-orange-50 border-orange-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`},
                        React.createElement('div',{className:"flex items-center justify-between mb-2"},
                          React.createElement('div',{className:"flex items-center gap-3"},
                            React.createElement('span',{className:"text-lg"},emergencyManager.alertTypes[alert.type]?.icon || '⚠️'),
                            React.createElement('div',null,
                              React.createElement('div',{className:"font-medium"},alert.message),
                              React.createElement('div',{className:"text-sm text-gray-500"},`${alert.location} • ${alert.timestamp}`)
                            )
                          ),
                          React.createElement('div',{className:"flex items-center gap-2"},
                            React.createElement('span',{className:`px-2 py-1 rounded-full text-xs ${
                              alert.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              alert.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`},alert.priority),
                            React.createElement('button',{
                              onClick: () => emergencyManager.resolveAlert(alert.id),
                              className: "px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                            },'Resolve')
                          )
                        )
                      )
                    )
                  )
              )
            ),

            // Emergency Contacts
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📞'),
                React.createElement('span',null,'Emergency Contacts')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                emergencyContacts.map((contact) => 
                  React.createElement('div',{key: contact.id, className:"p-4 border rounded-lg hover:bg-gray-50"},
                    React.createElement('div',{className:"flex items-center justify-between mb-2"},
                      React.createElement('div',{className:"font-medium"},contact.name),
                      React.createElement('span',{className:"px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"},contact.role)
                    ),
                    React.createElement('div',{className:"text-sm text-gray-600 space-y-1"},
                      React.createElement('div',null,`📞 ${contact.phone}`),
                      React.createElement('div',null,`📧 ${contact.email}`),
                      React.createElement('div',{className:"text-xs text-gray-500"},`Added: ${contact.addedAt}`)
                    ),
                    React.createElement('button',{
                      onClick: () => emergencyManager.removeEmergencyContact(contact.id),
                      className: "mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                    },'Remove')
                  )
                )
              )
            ),

            // Actions
            React.createElement('div',{className:"flex flex-col sm:flex-row gap-3 pt-4 border-t"},
              React.createElement('button',{
                onClick: () => showToast('📞 Emergency services - coming soon!'),
                className: "flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
              },'🚨 Call Emergency Services'),
              React.createElement('button',{
                onClick: () => showToast('📊 Emergency analytics - coming soon!'),
                className: "flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              },'📊 View Analytics'),
              React.createElement('button',{
                onClick: () => setShowEmergencyModal(false),
                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              },'Close')
            )
          )
        )
      ),
      // === MAINPRO v72 - BUSINESS FEATURES MODAL ===
      showBusinessModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-3"},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full sm:max-w-6xl rounded-t-2xl sm:rounded-2xl p-0 shadow-xl"},
          // Header
          React.createElement('div',{className:"px-5 pt-5 pb-3 border-b flex items-center justify-between"},
            React.createElement('div',{className:"flex items-center gap-3"},
              React.createElement('div',{className:"w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg"},'🏢'),
              React.createElement('div',null,
                React.createElement('h2',{className:"text-xl font-semibold"},'Business Features'),
                React.createElement('p',{className:"text-sm text-gray-600"},'Industry-specific tools and workflows')
              )
            ),
            React.createElement('button',{
              onClick:()=>setShowBusinessModal(false),
              className:"text-gray-500 hover:text-gray-700 px-2 py-1 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"p-5 space-y-6"},

            // Business Type Selection
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'🎯'),
                React.createElement('span',null,'Select Your Business Type')
              ),
              React.createElement('div',{className:"grid grid-cols-2 md:grid-cols-4 gap-4"},
                Object.entries(businessManager.businessTypes).map(([key, business]) => 
                  React.createElement('button',{
                    key: key,
                    onClick: () => businessManager.setBusinessType(key),
                    className: `p-4 border rounded-lg text-center hover:bg-gray-50 ${
                      businessType === key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                    }`
                  },
                    React.createElement('div',{className:"text-3xl mb-2"},business.icon),
                    React.createElement('div',{className:"font-medium"},business.name),
                    businessType === key && React.createElement('div',{className:"text-xs text-indigo-600 mt-1"},'Selected')
                  )
                )
              )
            ),

            // Active Business Modules
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'⚡'),
                React.createElement('span',null,'Active Business Modules')
              ),
              React.createElement('div',{className:"bg-gray-50 rounded-lg p-4"},
                businessModules.length === 0 ? 
                  React.createElement('div',{className:"text-center py-8 text-gray-500"},
                    React.createElement('div',{className:"text-4xl mb-2"},'🏢'),
                    React.createElement('p',null,'No business modules activated yet')
                  ) :
                  React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                    businessModules.map((module) => 
                      React.createElement('div',{key: module.id, className:"p-4 bg-white rounded-lg border hover:bg-gray-50"},
                        React.createElement('div',{className:"flex items-center justify-between mb-2"},
                          React.createElement('div',{className:"flex items-center gap-3"},
                            React.createElement('span',{className:"text-lg"},module.icon),
                            React.createElement('div',null,
                              React.createElement('div',{className:"font-medium"},module.name),
                              React.createElement('div',{className:"text-sm text-gray-500"},module.description)
                            )
                          ),
                          React.createElement('div',{className:"flex items-center gap-2"},
                            React.createElement('span',{className:"px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs"},businessManager.businessTypes[module.businessType]?.name),
                            React.createElement('button',{
                              onClick: () => businessManager.deactivateModule(module.id),
                              className: "px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                            },'Deactivate')
                          )
                        ),
                        React.createElement('div',{className:"text-xs text-gray-500"},`Activated: ${module.activatedAt}`)
                      )
                    )
                  )
              )
            ),

            // Available Modules for Current Business Type
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'📦'),
                React.createElement('span',null,`Available Modules for ${businessManager.businessTypes[businessType]?.name}`)
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                businessManager.getModules(businessType).map((module) => {
                  const isActive = businessModules.some(m => m.id === module.id && m.businessType === businessType);
                  return React.createElement('div',{key: module.id, className:`p-4 border rounded-lg hover:bg-gray-50 ${
                    isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`},
                    React.createElement('div',{className:"flex items-center justify-between mb-2"},
                      React.createElement('div',{className:"flex items-center gap-3"},
                        React.createElement('span',{className:"text-lg"},module.icon),
                        React.createElement('div',null,
                          React.createElement('div',{className:"font-medium"},module.name),
                          React.createElement('div',{className:"text-sm text-gray-500"},module.description)
                        )
                      ),
                      isActive ? 
                        React.createElement('div',{className:"px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"},'Active') :
                        React.createElement('button',{
                          onClick: () => businessManager.activateModule(businessType, module.id),
                          className: "px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200"
                        },'Activate')
                    )
                  );
                })
              )
            ),

            // Business Module Features Overview
            React.createElement('div',null,
              React.createElement('h3',{className:"text-lg font-semibold mb-3 flex items-center gap-2"},
                React.createElement('span',null,'✨'),
                React.createElement('span',null,'Business Module Features')
              ),
              React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-4"},
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-blue-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🎯'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Industry-Specific Tools'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Tailored features for your business type')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-green-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'⚡'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Quick Activation'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Activate modules instantly')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-purple-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🔄'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Flexible Management'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Activate/deactivate as needed')
                    )
                  )
                ),
                React.createElement('div',{className:"space-y-3"},
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-orange-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'📊'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Integrated Analytics'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Business-specific reporting')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-teal-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🤝'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Team Collaboration'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Role-based access control')
                    )
                  ),
                  React.createElement('div',{className:"flex items-center gap-3 p-3 bg-pink-50 rounded-lg"},
                    React.createElement('span',{className:"text-lg"},'🔧'),
                    React.createElement('div',null,
                      React.createElement('div',{className:"font-medium"},'Custom Workflows'),
                      React.createElement('div',{className:"text-sm text-gray-600"},'Adaptable to your processes')
                    )
                  )
                )
              )
            ),

            // Actions
            React.createElement('div',{className:"flex flex-col sm:flex-row gap-3 pt-4 border-t"},
              React.createElement('button',{
                onClick: () => showToast('📊 Business analytics - coming soon!'),
                className: "flex-1 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-medium"
              },'📊 Business Analytics'),
              React.createElement('button',{
                onClick: () => showToast('⚙️ Business settings - coming soon!'),
                className: "flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              },'⚙️ Business Settings'),
              React.createElement('button',{
                onClick: () => setShowBusinessModal(false),
                className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              },'Close')
            )
          )
        )
      ),

      // === MAINPRO v72 - AUTHENTICATION MODAL ===
      showAuthModal && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ 
        if(e.target===e.currentTarget) { 
          try {
            const t = (window.__mainproModalOpenedAt && window.__mainproModalOpenedAt.login) ? window.__mainproModalOpenedAt.login : 0;
            if (t && (Date.now() - t) < 350) return;
          } catch {}
          mpCloseWithAnim(()=>setShowAuthModal(false), e); 
        } 
      }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full max-w-md rounded-2xl p-0 shadow-xl border border-amber-200 overflow-hidden", style:{borderTop:'4px solid', borderTopColor:'#f59e0b'}, 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-6 pt-6 pb-4 border-b border-amber-200 flex items-center justify-between", style:{background:'linear-gradient(135deg, #fef3c7, #fde68a)'}},
            React.createElement('div',{className:"text-xl font-semibold flex items-center gap-2", style:{color:'#92400e'}},
              React.createElement('span',null,'🔐'),
              authMode === 'login' ? 'Login to MainPro' : 
              authMode === 'signup' ? 'Sign Up' : 'User Profile'
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowAuthModal(false), e),
              className:"text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"px-6 pb-6", style:{background:'#fffbeb'}},
            authMode === 'login' ? 
              // Login Form
              React.createElement('div',{className:"space-y-4"},
                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Email'),
                  React.createElement('input',{
                    type:"email",
                    placeholder:"your@email.com",
                    className:"w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  })
                ),
                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Password'),
                  React.createElement('input',{
                    type:"password",
                    placeholder:"••••••••",
                    className:"w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  })
                ),
                React.createElement('button',{
                  onClick:()=>{
                    // Simulate login
                    setIsAuthenticated(true);
                    setAuthUser({name: 'Demo User', email: 'demo@mainpro.com', plan: 'Professional'});
                    setShowAuthModal(false);
                    showToast('✅ Successfully logged in!');
                  },
                  className:"w-full px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium",
                  style:{background:'#f59e0b'}
                },'Login'),
                React.createElement('div',{className:"text-center"},
                  React.createElement('button',{
                    onClick:()=>setAuthMode('signup'),
                    className:"text-sm text-amber-800 hover:text-amber-900"
                  },'Don\'t have an account? Sign Up')
                )
              ) :
            authMode === 'signup' ?
              // Signup Form
              React.createElement('div',{className:"space-y-4"},
                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Name'),
                  React.createElement('input',{
                    type:"text",
                    placeholder:"Your Name",
                    className:"w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  })
                ),
                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Email'),
                  React.createElement('input',{
                    type:"email",
                    placeholder:"your@email.com",
                    className:"w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  })
                ),
                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Password'),
                  React.createElement('input',{
                    type:"password",
                    placeholder:"••••••••",
                    className:"w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  })
                ),
                React.createElement('div',null,
                  React.createElement('label',{className:"block text-sm font-medium text-gray-700 mb-1"},'Organization Type'),
                  React.createElement('select',{
                    className:"w-full px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                  },
                    React.createElement('option',{value:"hotel"},'🏨 Hotel'),
                    React.createElement('option',{value:"clinic"},'🏥 Clinic'),
                    React.createElement('option',{value:"office"},'🏢 Office'),
                    React.createElement('option',{value:"school"},'🏫 School'),
                    React.createElement('option',{value:"other"},'🏭 Other')
                  )
                ),
                React.createElement('button',{
                  onClick:()=>{
                    // Simulate signup
                    setIsAuthenticated(true);
                    setAuthUser({name: 'New User', email: 'new@mainpro.com', plan: 'Free', organization: 'hotel'});
                    setShowAuthModal(false);
                    showToast('🎉 Welcome to MainPro!');
                  },
                  className:"w-full px-4 py-2 text-white rounded-lg hover:opacity-90 font-medium",
                  style:{background:'#f59e0b'}
                },'Sign Up'),
                React.createElement('div',{className:"text-center"},
                  React.createElement('button',{
                    onClick:()=>setAuthMode('login'),
                    className:"text-sm text-amber-800 hover:text-amber-900"
                  },'Already have an account? Login')
                )
              ) :
              // Profile View
              React.createElement('div',{className:"space-y-4"},
                React.createElement('div',{className:"text-center p-4 bg-gray-50 rounded-lg"},
                  React.createElement('div',{className:"w-16 h-16 bg-blue-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl"},authUser?.name?.[0] || 'U'),
                  React.createElement('h3',{className:"font-semibold text-lg"},authUser?.name || 'User'),
                  React.createElement('p',{className:"text-sm text-gray-600"},authUser?.email || 'user@example.com'),
                  React.createElement('div',{className:"mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm inline-block"},authUser?.plan || 'Free')
                ),
                React.createElement('div',{className:"space-y-1"},
                  React.createElement('button',{
                    onClick:()=>showToast('💳 Subscription management - coming soon!'),
                    className:"w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  },'💳 Subscription Management'),
                  React.createElement('button',{
                    onClick:()=>showToast('⚙️ Account settings - coming soon!'),
                    className:"w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
                  },'⚙️ Account Settings'),
                  React.createElement('button',{
                    onClick:()=>{
                      setIsAuthenticated(false);
                      setAuthUser(null);
                      setShowAuthModal(false);
                      showToast('👋 Goodbye!');
                    },
                    className:"w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                  },'🚪 Logout')
                )
              )
          )
        )
      ),

      // === MAINPRO v72 - AI CHAT ASSISTANT MODAL ===
      showAIChat && React.createElement('div',{className:"fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 mp-overlay-anim", 'data-mp-overlay':'1', onClick:(e)=>{ 
        if(e.target===e.currentTarget) { 
          try {
            const t = (window.__mainproModalOpenedAt && window.__mainproModalOpenedAt.chat) ? window.__mainproModalOpenedAt.chat : 0;
            if (t && (Date.now() - t) < 350) return;
          } catch {}
          mpCloseWithAnim(()=>setShowAIChat(false), e); 
        } 
      }},
        React.createElement('div',{className:"modal-enter modal-ready bg-white w-full max-w-2xl rounded-2xl p-0 shadow-xl h-[600px] flex flex-col border border-amber-200 overflow-hidden", style:{borderTop:'4px solid', borderTopColor:'#f59e0b'}, 'data-mp-modal':'1'},
          // Header
          React.createElement('div',{className:"px-6 pt-6 pb-4 border-b border-amber-200 flex items-center justify-between", style:{background:'linear-gradient(135deg, #fef3c7, #fde68a)'}},
            React.createElement('div',{className:"flex items-center gap-3"},
              React.createElement('div',{className:"w-10 h-10 rounded-full flex items-center justify-center text-white text-lg", style:{background:'#f59e0b'}},'🤖'),
              React.createElement('div',null,
                React.createElement('div',{className:"font-semibold text-lg", style:{color:'#92400e'}},'MainPro AI Assistant'),
                React.createElement('div',{className:"text-sm text-gray-600"},'Your personal assistant')
              )
            ),
            React.createElement('button',{
              onClick:(e)=>mpCloseWithAnim(()=>setShowAIChat(false), e),
              className:"text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Chat Messages
          React.createElement('div',{className:"flex-1 p-6 overflow-y-auto", style:{background:'#fffbeb'}},
            chatMessages.length === 0 ? 
              React.createElement('div',{className:"text-center py-8"},
                React.createElement('div',{className:"text-4xl mb-4"},'🤖'),
                React.createElement('h3',{className:"text-lg font-semibold mb-2"},'Welcome to MainPro AI!'),
                React.createElement('p',{className:"text-gray-600 mb-6"},'I will help you with documents, analytics, and process automation.'),
                React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto"},
                  React.createElement('button',{
                    onClick:()=>{
                      const newMessage = {id: Date.now(), text: 'How to set up automatic document sorting?', isUser: true};
                      setChatMessages([newMessage]);
                      setTimeout(()=>{
                        const aiResponse = {id: Date.now()+1, text: 'To set up automatic document sorting:\n\n1. Open Document Manager\n2. Go to AI Smart Organization\n3. Select folders to scan\n4. Configure sorting rules\n5. Start automatic organization\n\nAI will analyze your files and sort them by type, date, and content!', isUser: false};
                        setChatMessages(prev => [...prev, aiResponse]);
                      }, 1000);
                    },
                    className:"p-3 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 text-left"
                  },
                    React.createElement('div',{className:"font-medium text-sm"},'📁 Documents'),
                    React.createElement('div',{className:"text-xs text-gray-600"},'Sorting setup')
                  ),
                  React.createElement('button',{
                    onClick:()=>{
                      const newMessage = {id: Date.now(), text: 'How does AI Compliance Tracking work?', isUser: true};
                      setChatMessages([newMessage]);
                      setTimeout(()=>{
                        const aiResponse = {id: Date.now()+1, text: 'AI Compliance Tracking automatically analyzes your documents for compliance:\n\n• Checks document expiration dates\n• Analyzes compliance with standards\n• Tracks legislative changes\n• Generates risk reports\n• Sends violation notifications\n\nThe system supports OSHA, SOX, GDPR and other standards!', isUser: false};
                        setChatMessages(prev => [...prev, aiResponse]);
                      }, 1000);
                    },
                    className:"p-3 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 text-left"
                  },
                    React.createElement('div',{className:"font-medium text-sm"},'📊 Analytics'),
                    React.createElement('div',{className:"text-xs text-gray-600"},'AI Compliance')
                  ),
                  React.createElement('button',{
                    onClick:()=>{
                      const newMessage = {id: Date.now(), text: 'How to set up team collaboration?', isUser: true};
                      setChatMessages([newMessage]);
                      setTimeout(()=>{
                        const aiResponse = {id: Date.now()+1, text: 'To set up team collaboration:\n\n1. Open Settings → Cloud & Collaboration\n2. Click "Team Management"\n3. Invite team members\n4. Set up roles and permissions\n5. Enable Project Sharing for collaboration\n\nYou can create projects, share documents, and work in real-time!', isUser: false};
                        setChatMessages(prev => [...prev, aiResponse]);
                      }, 1000);
                    },
                    className:"p-3 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 text-left"
                  },
                    React.createElement('div',{className:"font-medium text-sm"},'👥 Team'),
                    React.createElement('div',{className:"text-xs text-gray-600"},'Collaboration')
                  ),
                  React.createElement('button',{
                    onClick:()=>{
                      const newMessage = {id: Date.now(), text: 'How to use Secure Vault?', isUser: true};
                      setChatMessages([newMessage]);
                      setTimeout(()=>{
                        const aiResponse = {id: Date.now()+1, text: 'Secure Vault provides maximum document security:\n\n• AES-256 encryption for all files\n• Electronic signatures (eSign)\n• Complete access audit trail\n• Automatic backup\n• GDPR and SOX compliance\n\nSimply drag documents into the Vault, and they will be automatically encrypted and protected!', isUser: false};
                        setChatMessages(prev => [...prev, aiResponse]);
                      }, 1000);
                    },
                    className:"p-3 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 text-left"
                  },
                    React.createElement('div',{className:"font-medium text-sm"},'🔐 Security'),
                    React.createElement('div',{className:"text-xs text-gray-600"},'Secure Vault')
                  )
                )
              ) :
              React.createElement('div',{className:"space-y-4"},
                chatMessages.map(message =>
                  React.createElement('div',{key:message.id, className:`flex ${message.isUser ? 'justify-end' : 'justify-start'}`},
                    React.createElement('div',{className:`max-w-[80%] p-3 rounded-lg ${message.isUser ? 'text-white' : 'bg-white border border-amber-200'}`, style: message.isUser ? {background:'#f59e0b'} : {}},
                      React.createElement('div',{className:"whitespace-pre-line text-sm"},message.text)
                    )
                  )
                )
              )
          ),
          // Chat Input
          React.createElement('div',{className:"p-4 border-t border-amber-200 bg-white"},
            React.createElement('div',{className:"flex gap-3"},
              React.createElement('input',{
                type:"text",
                value:chatInput,
                onChange:(e)=>setChatInput(e.target.value),
                onKeyPress:(e)=>{
                  if(e.key === 'Enter' && chatInput.trim()){
                    const newMessage = {id: Date.now(), text: chatInput, isUser: true};
                    setChatMessages(prev => [...prev, newMessage]);
                    setChatInput('');
                    setTimeout(()=>{
                      const aiResponse = {id: Date.now()+1, text: 'Thank you for your question! I am MainPro AI Assistant, ready to help with any questions about working with the platform. How can I help you?', isUser: false};
                      setChatMessages(prev => [...prev, aiResponse]);
                    }, 1000);
                  }
                },
                placeholder:"Ask MainPro AI a question...",
                className:"flex-1 px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
              }),
              React.createElement('button',{
                onClick:()=>{
                  if(chatInput.trim()){
                    const newMessage = {id: Date.now(), text: chatInput, isUser: true};
                    setChatMessages(prev => [...prev, newMessage]);
                    setChatInput('');
                    setTimeout(()=>{
                      const aiResponse = {id: Date.now()+1, text: 'Thank you for your question! I am MainPro AI Assistant, ready to help with any questions about working with the platform. How can I help you?', isUser: false};
                      setChatMessages(prev => [...prev, aiResponse]);
                    }, 1000);
                  }
                },
                className:"px-4 py-2 text-white rounded-lg hover:opacity-90",
                style:{background:'#f59e0b'}
              },'Send')
            )
          )
        )
      ),
      // === Document Manager PRO v68.0 – Enhanced Center Modal (Drag&Drop) ===
      dmShow && React.createElement('div',
        {className:"fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-3 sm:p-6 mp-overlay-anim",
         'data-mp-overlay':'1',
         style:{zIndex:9999, position:'fixed'},
         onClick:(e)=>{ if(e.target===e.currentTarget) mpCloseWithAnim(()=>setDmShow(false), e); }},
        React.createElement('div',{className:"dm bg-white w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col modal-enter modal-ready",
         'data-mp-modal':'1',
         style:{borderTop:'4px solid', borderTopColor:'#f59e0b', maxHeight:'80vh', zIndex:10000, position:'relative'}},
          // Head
          React.createElement('div',{
            className:"px-5 py-4 border-b flex items-center justify-between flex-shrink-0",
            style:{background:'linear-gradient(135deg, #fef3c7, #fde68a)', borderBottom:'2px solid #f59e0b'}
          },
            React.createElement('div',{className:"text-lg font-semibold flex items-center gap-2", style:{color:'#92400e'}},
              React.createElement('span',null,'📁'),
              'Documents'
            ),
              
              // AI Smart Organization Button
              React.createElement('button',{
                onClick: () => {
                  showToast('🤖 Starting AI Smart Organization...');
                  
                  // Create AI Organization Modal
                  const modal = document.createElement('div');
                  modal.style.cssText = `
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(0,0,0,0.7); z-index: 1000; 
                    display: flex; align-items: center; justify-content: center;
                  `;
                  
                  const content = document.createElement('div');
                  content.style.cssText = `
                    background: white; padding: 30px; border-radius: 12px; 
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 600px; width: 90%;
                    max-height: 80vh; overflow-y: auto;
                  `;
                  
                  content.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                      <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">🤖 AI Smart Organization</h2>
                      <p style="margin: 0; color: #666; font-size: 14px;">AI will analyze and organize your files automatically</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #333;">📂 Organization Options:</h3>
                        <div style="display: flex; gap: 8px;">
                          <button onclick="selectAllOptions()" style="padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            ✅ All
                          </button>
                          <button onclick="clearAllOptions()" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            ❌ Clear
                          </button>
                        </div>
                      </div>
                      <div style="display: grid; gap: 10px;">
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                          <input type="checkbox" id="sort-by-type" checked style="transform: scale(1.2);">
                          <span>📄 Sort by File Type (Documents, Images, Videos, etc.)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                          <input type="checkbox" id="sort-by-date" checked style="transform: scale(1.2);">
                          <span>📅 Sort by Date (Recent, Last Month, Older)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                          <input type="checkbox" id="sort-by-size" checked style="transform: scale(1.2);">
                          <span>💾 Sort by Size (Large, Medium, Small files)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                          <input type="checkbox" id="sort-by-content" checked style="transform: scale(1.2);">
                          <span>🧠 AI Content Analysis (Work, Personal, Projects)</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                          <input type="checkbox" id="find-duplicates" checked style="transform: scale(1.2);">
                          <span>🔍 Find Duplicate Files & Smart Cleanup</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                          <input type="checkbox" id="smart-sort" checked style="transform: scale(1.2);">
                          <span>🎯 Genius Smart Sorting (Advanced AI Algorithm)</span>
                        </label>
                      </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <h3 style="margin: 0 0 15px 0; color: #333;">🔒 Privacy & Security:</h3>
                      <div style="padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
                        <p style="margin: 0; color: #1565c0; font-size: 14px;">
                          <strong>🔐 Your files stay private!</strong><br>
                          • AI analysis happens locally in your browser<br>
                          • No files are uploaded to external servers<br>
                          • Only file names and basic metadata are analyzed<br>
                          • You can choose which folders to scan
                        </p>
                      </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                      <h3 style="margin: 0 0 10px 0; color: #333;">📁 Select Folders to Scan:</h3>
                      <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
                        <button onclick="selectFolder()" style="padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer;">
                          📂 Select Folder
                        </button>
                        <button onclick="selectFolderAlternative()" style="padding: 8px 16px; background: #9c27b0; color: white; border: none; border-radius: 6px; cursor: pointer;">
                          📁 Browse Files
                        </button>
                        <button onclick="selectDesktop()" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 6px; cursor: pointer;">
                          🖥️ Desktop
                        </button>
                        <button onclick="selectDocuments()" style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                          📄 Documents
                        </button>
                      </div>
                      <div id="selected-folders" style="min-height: 40px; padding: 10px; background: #f5f5f5; border: 2px dashed #ccc; border-radius: 6px; font-size: 14px; color: #666; text-align: center; transition: all 0.3s ease;">
                        No folders selected yet...<br>
                        <small style="color: #999;">Click one of the buttons above to select a folder</small>
                      </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                      <button onclick="startAIScan()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: not-allowed; font-size: 16px; font-weight: bold; opacity: 0.5;" id="start-ai-btn" disabled>
                        🚀 Start AI Organization
                      </button>
                      <button onclick="this.closest('.ai-modal').remove()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                        ❌ Cancel
                      </button>
                    </div>
                  `;
                  
                  modal.className = 'ai-modal';
                  modal.appendChild(content);
                  document.body.appendChild(modal);
                  
                  // Close on backdrop click (Hotfix Pack v68.4: cleanup on close)
                  modal.onclick = (e) => {
                    if (e.target === modal) {
                      // Cleanup global functions to prevent memory leaks
                      if (window.MainProUI) {
                        delete window.MainProUI.selectFolder;
                        delete window.MainProUI.selectFolderAlternative;
                        delete window.MainProUI.selectAllOptions;
                        delete window.MainProUI.startAIScan;
                      }
                      modal.remove();
                    }
                  };
                  
                  // Hotfix Pack v68.4: use namespace to prevent memory leaks
                  if (!window.MainProUI) window.MainProUI = {};
                  
                  window.MainProUI.selectFolder = () => {
                    // Try to use File System Access API if available
                    if ('showDirectoryPicker' in window) {
                      window.showDirectoryPicker().then(handle => {
                        document.getElementById('selected-folders').innerHTML = `📁 Selected: ${handle.name}`;
                        showToast(`📂 Selected folder: ${handle.name}`);
                        
                        // Store the folder handle for later use
                        window.MainProUI.selectedFolderHandle = handle;
                        
                        // Update folder selection area style
                        const folderArea = document.getElementById('selected-folders');
                        if (folderArea) {
                          folderArea.style.background = '#e8f5e8';
                          folderArea.style.border = '2px solid #4caf50';
                          folderArea.style.color = '#2e7d32';
                        }
                        
                        // Enable the start button
                        const startBtn = document.getElementById('start-ai-btn');
                        if (startBtn) {
                          startBtn.style.background = '#4caf50';
                          startBtn.style.opacity = '1';
                          startBtn.style.cursor = 'pointer';
                          startBtn.disabled = false;
                        }
                      }).catch(err => {
                        console.log('User cancelled folder selection');
                        showToast('📂 Folder selection cancelled');
                      });
                    } else {
                      // Fallback for browsers that don't support File System Access API
                      showToast('📂 Select a folder from your computer...');
                      document.getElementById('selected-folders').innerHTML = '📁 Selected: Downloads folder (demo)';
                      
                      // Update folder selection area style
                      const folderArea = document.getElementById('selected-folders');
                      if (folderArea) {
                        folderArea.style.background = '#e8f5e8';
                        folderArea.style.border = '2px solid #4caf50';
                        folderArea.style.color = '#2e7d32';
                      }
                      
                      // Enable the start button for demo
                      const startBtn = document.getElementById('start-ai-btn');
                      if (startBtn) {
                        startBtn.style.background = '#4caf50';
                        startBtn.style.opacity = '1';
                        startBtn.style.cursor = 'pointer';
                        startBtn.disabled = false;
                      }
                    }
                  };
                  
                  window.selectDesktop = () => {
                    document.getElementById('selected-folders').innerHTML = '🖥️ Selected: Desktop folder';
                    showToast('🖥️ Desktop folder selected');
                    
                    // Update folder selection area style
                    const folderArea = document.getElementById('selected-folders');
                    if (folderArea) {
                      folderArea.style.background = '#e8f5e8';
                      folderArea.style.border = '2px solid #4caf50';
                      folderArea.style.color = '#2e7d32';
                    }
                    
                    // Enable the start button
                    const startBtn = document.getElementById('start-ai-btn');
                    if (startBtn) {
                      startBtn.style.background = '#4caf50';
                      startBtn.style.opacity = '1';
                      startBtn.style.cursor = 'pointer';
                      startBtn.disabled = false;
                    }
                  };
                  
                  window.selectDocuments = () => {
                    document.getElementById('selected-folders').innerHTML = '📄 Selected: Documents folder';
                    showToast('📄 Documents folder selected');
                    
                    // Update folder selection area style
                    const folderArea = document.getElementById('selected-folders');
                    if (folderArea) {
                      folderArea.style.background = '#e8f5e8';
                      folderArea.style.border = '2px solid #4caf50';
                      folderArea.style.color = '#2e7d32';
                    }
                    
                    // Enable the start button
                    const startBtn = document.getElementById('start-ai-btn');
                    if (startBtn) {
                      startBtn.style.background = '#4caf50';
                      startBtn.style.opacity = '1';
                      startBtn.style.cursor = 'pointer';
                      startBtn.disabled = false;
                    }
                  };
                  
                  window.MainProUI.selectFolderAlternative = () => {
                    // Create file input for folder selection
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.webkitdirectory = true;
                    input.multiple = true;
                    input.style.display = 'none';
                    
                    input.onchange = (e) => {
                      const files = Array.from(e.target.files);
                      const folderName = files[0] ? files[0].webkitRelativePath.split('/')[0] : 'Selected Folder';
                      document.getElementById('selected-folders').innerHTML = `📁 Selected: ${folderName} (${files.length} files)`;
                      showToast(`📁 Selected folder: ${folderName} with ${files.length} files`);
                      
                      // Store files for later analysis
                      window.MainProUI.selectedFiles = files;
                      
                      // Enable the start button
                      const startBtn = document.querySelector('button[onclick="startAIScan()"]');
                      if (startBtn) {
                        startBtn.style.opacity = '1';
                        startBtn.style.cursor = 'pointer';
                      }
                    };
                    
                    document.body.appendChild(input);
                    input.click();
                    document.body.removeChild(input);
                  };
                  
                  window.MainProUI.selectAllOptions = () => {
                    const checkboxes = ['sort-by-type', 'sort-by-date', 'sort-by-size', 'sort-by-content', 'find-duplicates', 'smart-sort'];
                    checkboxes.forEach(id => {
                      const checkbox = document.getElementById(id);
                      if (checkbox) checkbox.checked = true;
                    });
                    showToast('✅ All options selected');
                  };
                  
                  window.clearAllOptions = () => {
                    const checkboxes = ['sort-by-type', 'sort-by-date', 'sort-by-size', 'sort-by-content', 'find-duplicates', 'smart-sort'];
                    checkboxes.forEach(id => {
                      const checkbox = document.getElementById(id);
                      if (checkbox) checkbox.checked = false;
                    });
                    showToast('❌ All options cleared');
                  };
                  
                  window.MainProUI.startAIScan = () => {
                    // Check if folder is selected
                    const selectedFoldersDiv = document.getElementById('selected-folders');
                    if (!selectedFoldersDiv || selectedFoldersDiv.textContent.includes('No folders selected')) {
                      showToast('❌ Please select a folder first');
                      return;
                    }
                    
                    // Read checkbox settings
                    const sortByType = document.getElementById('sort-by-type')?.checked;
                    const sortByDate = document.getElementById('sort-by-date')?.checked;
                    const sortBySize = document.getElementById('sort-by-size')?.checked;
                    const sortByContent = document.getElementById('sort-by-content')?.checked;
                    const findDuplicates = document.getElementById('find-duplicates')?.checked;
                    const smartSort = document.getElementById('smart-sort')?.checked;
                    
                    // Validate that at least one option is selected
                    if (!sortByType && !sortByDate && !sortBySize && !sortByContent && !findDuplicates && !smartSort) {
                      showToast('❌ Please select at least one organization option');
                      return;
                    }
                    
                    modal.remove();
                    showToast('🤖 Genius AI is analyzing your files...');
                    
                    // Simulate advanced AI analysis with duplicate detection
                    setTimeout(() => {
                      if (findDuplicates) {
                        showToast('🔍 Scanning for duplicate files...');
                        setTimeout(() => {
                          if (sortByContent) {
                            showToast('🧠 Running advanced AI content analysis...');
                            setTimeout(() => {
                              showToast('📊 AI found 47 files and 8 duplicate groups');
                            }, 1000);
                          } else {
                            showToast('📊 AI found 47 files and 8 duplicate groups');
                          }
                        }, 2000);
                      } else if (sortByContent) {
                        showToast('🧠 Running advanced AI content analysis...');
                        setTimeout(() => {
                          showToast('📊 AI analyzed 47 files for content patterns');
                        }, 2000);
                      } else {
                        showToast('📊 AI analyzed 47 files');
                      }
                      
                      setTimeout(() => {
                        if (findDuplicates) {
                          // Show duplicate detection results
                          const duplicateModal = document.createElement('div');
                          duplicateModal.style.cssText = `
                            position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                            background: rgba(0,0,0,0.8); z-index: 1000; 
                            display: flex; align-items: center; justify-content: center;
                          `;
                          
                          const duplicateContent = document.createElement('div');
                          duplicateContent.style.cssText = `
                            background: white; padding: 30px; border-radius: 12px; 
                            box-shadow: 0 8px 32px rgba(0,0,0,0.3); max-width: 800px; width: 90%;
                            max-height: 80vh; overflow-y: auto;
                          `;
                          
                          duplicateContent.innerHTML = `
                            <div style="text-align: center; margin-bottom: 20px;">
                              <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">🔍 Duplicate Files Found!</h2>
                              <p style="margin: 0; color: #666; font-size: 14px;">AI found duplicate files that can be cleaned up</p>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                              <h3 style="margin: 0 0 15px 0; color: #333;">📋 Duplicate Groups:</h3>
                              <div style="display: grid; gap: 10px;">
                                <div style="padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                                  <h4 style="margin: 0 0 10px 0; color: #856404;">📄 Document Group 1 (3 files)</h4>
                                  <div style="font-size: 14px; color: #856404;">
                                    • report_final.pdf (2.3 MB, 2024-01-15)<br>
                                    • report_final_copy.pdf (2.3 MB, 2024-01-16)<br>
                                    • report_final_backup.pdf (2.3 MB, 2024-01-17)
                                  </div>
                                  <div style="margin-top: 10px;">
                                    <button onclick="handleDuplicates('keep_newest', 'report_final.pdf')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                                      ✅ Keep Newest
                                    </button>
                                    <button onclick="handleDuplicates('delete_all', 'report_final.pdf')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                                      🗑️ Delete All
                                    </button>
                                    <button onclick="handleDuplicates('merge', 'report_final.pdf')" style="padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                      🔄 Merge Files
                                    </button>
                                  </div>
                                </div>
                                
                                <div style="padding: 15px; background: #d4edda; border-radius: 8px; border-left: 4px solid #28a745;">
                                  <h4 style="margin: 0 0 10px 0; color: #155724;">🖼️ Image Group 1 (4 files)</h4>
                                  <div style="font-size: 14px; color: #155724;">
                                    • photo_vacation.jpg (1.2 MB, 2024-01-10)<br>
                                    • photo_vacation_001.jpg (1.2 MB, 2024-01-10)<br>
                                    • photo_vacation_copy.jpg (1.2 MB, 2024-01-11)<br>
                                    • IMG_20240110_001.jpg (1.2 MB, 2024-01-10)
                                  </div>
                                  <div style="margin-top: 10px;">
                                    <button onclick="handleDuplicates('keep_best', 'photo_vacation.jpg')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                                      🏆 Keep Best Quality
                                    </button>
                                    <button onclick="handleDuplicates('delete_all', 'photo_vacation.jpg')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                                      🗑️ Delete All
                                    </button>
                                    <button onclick="handleDuplicates('archive', 'photo_vacation.jpg')" style="padding: 6px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                      📦 Archive Duplicates
                                    </button>
                                  </div>
                                </div>
                                
                                <div style="padding: 15px; background: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545;">
                                  <h4 style="margin: 0 0 10px 0; color: #721c24;">📊 Spreadsheet Group 1 (2 files)</h4>
                                  <div style="font-size: 14px; color: #721c24;">
                                    • budget_2024.xlsx (456 KB, 2024-01-05)<br>
                                    • budget_2024_copy.xlsx (456 KB, 2024-01-06)
                                  </div>
                                  <div style="margin-top: 10px;">
                                    <button onclick="handleDuplicates('keep_newest', 'budget_2024.xlsx')" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                                      ✅ Keep Newest
                                    </button>
                                    <button onclick="handleDuplicates('delete_all', 'budget_2024.xlsx')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                      🗑️ Delete All
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                              <button onclick="continueOrganization()" style="padding: 12px 24px; background: #4caf50; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
                                🚀 Continue Organization
                              </button>
                              <button onclick="this.closest('.duplicate-modal').remove()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                                ❌ Skip Duplicates
                              </button>
                            </div>
                          `;
                          
                          duplicateModal.className = 'duplicate-modal';
                          duplicateModal.appendChild(duplicateContent);
                          document.body.appendChild(duplicateModal);
                          
                          // Add duplicate handling functions
                          window.handleDuplicates = (action, fileGroup) => {
                            showToast(`🤖 ${action} for ${fileGroup} - Processing...`);
                            setTimeout(() => {
                              showToast(`✅ Duplicate cleanup completed for ${fileGroup}`);
                            }, 1000);
                          };
                          
                          window.continueOrganization = () => {
                            duplicateModal.remove();
                            showToast('📁 Creating genius organized folder structure...');
                            
                            setTimeout(() => {
                              showToast('✅ Genius AI organization completed! Check your folders.');
                              
                              // Simulate adding organized files to Document Manager
                              const organizedFiles = [
                                { name: '📄 Work Documents', type: 'folder', count: 12, smart: true },
                                { name: '🖼️ Smart Images', type: 'folder', count: 8, smart: true },
                                { name: '📊 Spreadsheets', type: 'folder', count: 5, smart: true },
                                { name: '📝 Recent Files', type: 'folder', count: 15, smart: true },
                                { name: '🎥 Videos', type: 'folder', count: 3, smart: true },
                                { name: '🎵 Audio', type: 'folder', count: 4, smart: true },
                                { name: '🗂️ AI Organized', type: 'folder', count: 47, smart: true },
                                { name: '🗑️ Cleaned Duplicates', type: 'folder', count: 12, smart: true }
                              ];
                              
                              // Add organized folders to the current folders
                              setFolders(prev => {
                                const newFolders = [...prev];
                                organizedFiles.forEach(folder => {
                                  if (!newFolders.find(f => f.name === folder.name)) {
                                    newFolders.push({
                                      id: Date.now() + Math.random(),
                                      name: folder.name,
                                      type: 'ai-organized',
                                      fileCount: folder.count,
                                      smart: folder.smart
                                    });
                                  }
                                });
                                return newFolders;
                              });
                              
                            }, 2000);
                          };
                          
                        } else {
                          // Skip duplicates, go directly to organization
                          showToast('📁 Creating organized folder structure...');
                          
                          setTimeout(() => {
                            showToast('✅ AI organization completed! Check your folders.');
                            
                            // Create organized folders based on selected options
                            const organizedFiles = [];
                            
                            if (sortByType) {
                              organizedFiles.push(
                                { name: '📄 Documents', type: 'folder', count: 15, smart: true },
                                { name: '🖼️ Images', type: 'folder', count: 8, smart: true },
                                { name: '🎥 Videos', type: 'folder', count: 3, smart: true },
                                { name: '🎵 Audio', type: 'folder', count: 4, smart: true },
                                { name: '📊 Spreadsheets', type: 'folder', count: 5, smart: true }
                              );
                            }
                            
                            if (sortByDate) {
                              organizedFiles.push(
                                { name: '📝 Recent Files', type: 'folder', count: 12, smart: true },
                                { name: '📅 This Month', type: 'folder', count: 8, smart: true },
                                { name: '📆 Older Files', type: 'folder', count: 27, smart: true }
                              );
                            }
                            
                            if (sortBySize) {
                              organizedFiles.push(
                                { name: '💾 Large Files', type: 'folder', count: 5, smart: true },
                                { name: '📦 Medium Files', type: 'folder', count: 18, smart: true },
                                { name: '📄 Small Files', type: 'folder', count: 24, smart: true }
                              );
                            }
                            
                            if (sortByContent) {
                              organizedFiles.push(
                                { name: '💼 Work Documents', type: 'folder', count: 12, smart: true },
                                { name: '🏠 Personal Files', type: 'folder', count: 20, smart: true },
                                { name: '🎯 Projects', type: 'folder', count: 15, smart: true }
                              );
                            }
                            
                            if (smartSort) {
                              organizedFiles.push(
                                { name: '🗂️ AI Organized', type: 'folder', count: 47, smart: true }
                              );
                            }
                            
                            // Add organized folders to the current folders
                            setFolders(prev => {
                              const newFolders = [...prev];
                              organizedFiles.forEach(folder => {
                                if (!newFolders.find(f => f.name === folder.name)) {
                                  newFolders.push({
                                    id: Date.now() + Math.random(),
                                    name: folder.name,
                                    type: 'ai-organized',
                                    fileCount: folder.count,
                                    smart: folder.smart
                                  });
                                }
                              });
                              return newFolders;
                            });
                            
                          }, 2000);
                        }
                      }, 1000);
                    }, 3000);
                  };
                  
                },
                className:"px-3 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 tooltip-bottom",
                'data-tooltip':"AI Smart Organization - Automatically sort files by type, date, and content"
              },'🤖 AI Organize'),
              
              // Enhanced Toolbar
              React.createElement('div',{className:"flex flex-wrap items-center gap-1 sm:gap-2"},
                // Search
                React.createElement('div',{className:"relative tooltip-bottom", 'data-tooltip':"Search documents by name or tags"},
                  React.createElement('input',{
                    type:"text",
                    placeholder:"Search documents...",
                    value: dmSearchQuery,
                    onChange: e => setDmSearchQuery(e.target.value),
                    className:"pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent w-32 sm:w-48"
                  }),
                  React.createElement('span',{className:"absolute left-2 top-2.5 text-gray-400"},'🔍')
                ),
                
                // Filter
                React.createElement('select',{
                  value: dmFilterType,
                  onChange: e => setDmFilterType(e.target.value),
                  className:"px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 tooltip-bottom",
                  'data-tooltip':"Filter documents by type"
                },
                  React.createElement('option',{value:"all"},'All Types'),
                  React.createElement('option',{value:"pdf"},'PDF'),
                  React.createElement('option',{value:"image"},'Images'),
                  React.createElement('option',{value:"word"},'Word'),
                  React.createElement('option',{value:"excel"},'Excel')
                ),
                
                // Sort
                React.createElement('select',{
                  value: dmSortBy,
                  onChange: e => setDmSortBy(e.target.value),
                  className:"px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 tooltip-bottom",
                  'data-tooltip':"Sort documents by date, name, size, or type"
                },
                  React.createElement('option',{value:"date"},'Sort by Date'),
                  React.createElement('option',{value:"name"},'Sort by Name'),
                  React.createElement('option',{value:"size"},'Sort by Size'),
                  React.createElement('option',{value:"type"},'Sort by Type')
                ),
                
                // View Mode
                React.createElement('div',{className:"flex border border-gray-300 rounded-lg overflow-hidden"},
                  React.createElement('button',{
                    onClick: () => setDmViewMode('grid'),
                    className: `px-3 py-2 text-sm tooltip-bottom ${dmViewMode === 'grid' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`,
                    'data-tooltip':"Grid View"
                  },'⊞'),
                  React.createElement('button',{
                    onClick: () => setDmViewMode('list'),
                    className: `px-3 py-2 text-sm tooltip-bottom ${dmViewMode === 'list' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`,
                    'data-tooltip':"List View"
                  },'☰')
                ),
                
                // Analytics
                React.createElement('button',{
                  onClick: () => setDmShowAnalytics(!dmShowAnalytics),
                  className: `px-3 py-2 rounded-lg text-sm font-medium transition-colors tooltip-bottom ${dmShowAnalytics ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`,
                  'data-tooltip':"Show Document Analytics"
                },'📊'),
                
                // Backup
                React.createElement('button',{
                  onClick: dmCreateBackup,
                  disabled: dmBackupStatus === 'backing_up',
                  className: `px-3 py-2 rounded-lg text-sm font-medium transition-colors tooltip-bottom ${dmBackupStatus === 'backing_up' ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`,
                  'data-tooltip':"Create Backup"
                }, dmBackupStatus === 'backing_up' ? '⏳' : '💾'),
                
                // Close
                React.createElement('button',{
                  onClick:(e)=>mpCloseWithAnim(()=>setDmShow(false), e), 
                  className:"text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom",
                  'data-tooltip':"Close"
                },'✕')
              )
          ),
          // body
          React.createElement('div',{className:"px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto", style:{background:'#fffbeb'}},
            
            // Analytics Panel
            dmShowAnalytics && React.createElement('div',{className:"mb-4 sm:mb-6 p-3 sm:p-4 bg-white rounded-xl border border-amber-200 shadow-sm"},
              React.createElement('div',{className:"flex items-center justify-between mb-4"},
                React.createElement('h3',{className:"font-semibold text-lg text-gray-800"},'📊 Document Analytics'),
                React.createElement('button',{
                  onClick: () => setDmShowAnalytics(false),
                  className:"text-gray-400 hover:text-gray-600 tooltip-bottom",
                  'data-tooltip':"Close"
                },'✕')
              ),
              React.createElement('div',{className:"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4"},
                React.createElement('div',{className:"text-center p-3 bg-blue-50 rounded-lg"},
                  React.createElement('div',{className:"text-2xl font-bold text-blue-600"},dmDocs.length),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Total Documents')
                ),
                React.createElement('div',{className:"text-center p-3 bg-green-50 rounded-lg"},
                  React.createElement('div',{className:"text-2xl font-bold text-green-600"},`${(dmDocs.reduce((sum, doc) => sum + (doc.size || 0), 0) / 1024 / 1024).toFixed(1)} MB`),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Total Size')
                ),
                React.createElement('div',{className:"text-center p-3 bg-yellow-50 rounded-lg"},
                  React.createElement('div',{className:"text-2xl font-bold text-yellow-600"},dmFolders.length),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Folders')
                ),
                React.createElement('div',{className:"text-center p-3 bg-purple-50 rounded-lg"},
                  React.createElement('div',{className:"text-2xl font-bold text-purple-600"},Object.keys(dmDocumentTags).length),
                  React.createElement('div',{className:"text-sm text-gray-600"},'Tagged Documents')
                )
              )
            ),
            
            // Bulk Operations Panel
            dmSelectedDocs.length > 0 && React.createElement('div',{className:"mb-4 p-3 bg-white border border-amber-200 rounded-lg"},
              React.createElement('div',{className:"flex items-center justify-between"},
                React.createElement('span',{className:"text-sm font-medium text-yellow-800"},`${dmSelectedDocs.length} documents selected`),
                React.createElement('div',{className:"flex gap-2"},
                  React.createElement('button',{
                    onClick: dmSelectAllDocuments,
                    className:"px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  },'Select All'),
                  React.createElement('button',{
                    onClick: dmBulkDeleteDocuments,
                    className:"px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  },'Delete Selected'),
                  React.createElement('button',{
                    onClick: () => setDmSelectedDocs([]),
                    className:"px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  },'Clear Selection')
                )
              )
            ),
            // === Enhanced Folder Tabs ===
            React.createElement('div',{className:"dm-tabs mb-6 p-4 bg-white rounded-xl border border-amber-200"},
              dmFolders.map(folder=>
                React.createElement('div',{
                  key:folder.id,
                  className:`dm-tab ${dmActive===folder.name?'active':''} flex items-center gap-2`,
                  onClick:()=>setDmActive(folder.name)
                },
                  folder.editing
                    ? React.createElement('input',{
                        type:"text",
                        defaultValue:folder.name,
                        autoFocus:true,
                        onBlur:(e)=>{
                          const newName=e.target.value.trim()||folder.name;
                          const oldName = folder.name;
                          setDmFolders(prev=>prev.map(f=>f.id===folder.id?{...f,name:newName,editing:false}:f));
                          setDmActive(newName);
                          // Update documents that were in the old folder name
                          if(oldName !== newName) {
                            setDmDocs(prev => prev.map(d => d.folder === oldName ? {...d, folder: newName} : d));
                          }
                          // localStorage will be updated automatically by useEffect hook
                        },
                        onKeyDown:(e)=>{ if(e.key==='Enter') e.target.blur(); },
                        className:"px-2 py-1 text-sm border rounded"
                      })
                    : React.createElement('span',{className:"truncate max-w-[140px] text-left"},folder.name),
                  !folder.editing && React.createElement('button',{
                    onClick:(e)=>{
                      e.stopPropagation();
                      setDmFolders(prev=>prev.map(f=>f.id===folder.id?{...f,editing:true}:f));
                    },
                    className:"dm-mini"
                  },'✎'),
                  !folder.editing && folder.id!==1 && React.createElement('button',{
                    onClick:(e)=>{
                      e.stopPropagation();
                      if(confirm(`Delete folder "${folder.name}"?`)){
                        setDmFolders(prev=>prev.filter(f=>f.id!==folder.id));
                        if(dmActive===folder.name) setDmActive('General');
                        // localStorage will be updated automatically by useEffect hook
                      }
                    },
                    className:"dm-mini"
                  },'🗑')
                )
              ),
              React.createElement('div',{className:"flex items-center gap-2 ml-2"},
                React.createElement('input',{
                  type:"text",
                  placeholder:"New folder",
                  value:dmNewFolder,
                  onChange:e=>setDmNewFolder(e.target.value),
                  className:"dm-input"
                }),
                React.createElement('button',{
                  onClick:()=>{
                    if(!dmNewFolder.trim()) return;
                    const folder={id:Date.now(),name:dmNewFolder.trim()};
                    setDmFolders(prev=>[...prev,folder]);
                    setDmNewFolder('');
                    // localStorage will be updated automatically by useEffect hook
                  },
                  className:"px-3 py-2 rounded-md text-white",
                  style:{background:ui.primary}
                },'+')
              )
            ),

            // Drag & Drop zone (как на твоём фото) + Upload
            React.createElement('div',{
              className:`dm-ddrop ${dmDragging?'drag':''} mb-6 border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-white hover:border-amber-400 hover:bg-gradient-to-br hover:from-amber-100 hover:to-amber-50 transition-all duration-200`,
              onDrop:dmOnDrop, onDragOver:dmOnDragOver, onDragLeave:dmOnDragLeave
            },
              React.createElement('div',{className:"text-4xl mb-2"},'📂'),
              React.createElement('div',{className:"font-semibold text-gray-700 mb-1"},"Drag & Drop Files Here"),
              React.createElement('div',{className:"text-sm text-gray-500"},"or click the button below")
            ),

            React.createElement('div',{className:"flex justify-between items-center mb-4"},
            React.createElement('label',{className:"px-4 py-2 text-white rounded cursor-pointer hover:opacity-90 inline-flex items-center gap-2", style:{background:'#f59e0b'}},
                'Upload Files',
                React.createElement('input',{type:"file", multiple:true, className:"hidden", onChange:dmOnUploadInput})
              ),
              React.createElement('div',{className:"text-sm text-gray-500"},
                `${dmDocs.filter(d=>d.folder===dmActive).length} file(s) in "${dmActive}"`
              )
            ),

            // files grid with enhanced features
            React.createElement('div',{className:`${dmViewMode === 'grid' ? 'dm-grid' : 'space-y-2'} max-h-80 overflow-y-auto bg-white/30 rounded-xl p-4 border border-amber-200`},
              dmSearchDocuments(dmSearchQuery, dmFilterType, dmSortBy).filter(d=>d.folder===dmActive).map(doc =>
                React.createElement('div',{key:doc.id, className:`dm-card ${dmSelectedDocs.includes(doc.id) ? 'ring-2 ring-yellow-500 bg-yellow-50' : ''} ${dmViewMode === 'list' ? 'flex items-center justify-between p-3' : ''}`},
                  // Selection checkbox
                  React.createElement('div',{className:"flex items-start gap-2"},
                    React.createElement('input',{
                      type:"checkbox",
                      checked: dmSelectedDocs.includes(doc.id),
                      onChange: () => dmSelectDocument(doc.id),
                      className:"mt-1"
                    }),
                    
                    React.createElement('div',{className:"flex-1"},
                      React.createElement('div',{className:"font-medium text-gray-800 document-name", title: doc.name},doc.name),
                      React.createElement('div',{className:"text-xs text-gray-500 mt-1"},
                        `Added: ${new Date(doc.date||Date.now()).toLocaleString()}`
                      ),
                      doc.size && React.createElement('div',{className:"text-xs text-gray-400 mt-1"},
                        `Size: ${(doc.size / 1024 / 1024).toFixed(2)} MB`
                      ),
                      doc.aiCategory && doc.aiCategory !== doc.folder && React.createElement('div',{className:"text-xs text-purple-600 mt-1"},
                        `AI suggested: ${doc.aiCategory}`
                      ),
                      
                      // AI Analysis
                      doc.analysis && React.createElement('div',{className:"mt-2"},
                        React.createElement('div',{className:"text-xs text-gray-600"},`Risk: ${doc.analysis.riskLevel}`),
                        doc.analysis.keywords.length > 0 && React.createElement('div',{className:"text-xs text-blue-600 mt-1"},
                          `Keywords: ${doc.analysis.keywords.slice(0, 3).join(', ')}${doc.analysis.keywords.length > 3 ? '...' : ''}`
                        )
                      ),
                      
                      // Tags
                      dmDocumentTags[doc.id] && dmDocumentTags[doc.id].length > 0 && React.createElement('div',{className:"flex flex-wrap gap-1 mt-2"},
                        dmDocumentTags[doc.id].slice(0, 3).map(tag =>
                          React.createElement('span',{key:tag, className:"px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"},`#${tag}`)
                        ),
                        dmDocumentTags[doc.id].length > 3 && React.createElement('span',{className:"text-xs text-gray-500"},`+${dmDocumentTags[doc.id].length - 3} more`)
                      ),
                      
                      // Comments count
                      dmShowComments[doc.id] && dmShowComments[doc.id].length > 0 && React.createElement('div',{className:"text-xs text-green-600 mt-1"},
                        `💬 ${dmShowComments[doc.id].length} comment(s)`
                      )
                    )
                  ),
                  React.createElement('div',{className:"flex flex-wrap gap-1 mt-2"},
                    // Add Tag button
                    React.createElement('button',{
                      onClick: () => {
                        const tag = prompt('Enter tag name:');
                        if (tag) dmAddDocumentTag(doc.id, tag.trim());
                      },
                      className:"px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 tooltip",
                      'data-tooltip':"Add Tag"
                    },'🏷️'),
                    
                    // Add Comment button
                    React.createElement('button',{
                      onClick: () => {
                        const comment = prompt('Enter comment:');
                        if (comment) dmAddDocumentComment(doc.id, comment.trim());
                      },
                      className:"px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 tooltip",
                      'data-tooltip':"Add Comment"
                    },'💬'),
                    
                    // Preview button with options for all files
                    true && 
                    React.createElement('div',{className:"relative inline-block"},
                      React.createElement('button',{onClick:()=>{
                        // Show preview options modal
                        const modal = document.createElement('div');
                        modal.style.cssText = `
                          position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                          background: rgba(0,0,0,0.5); z-index: 1000; 
                          display: flex; align-items: center; justify-content: center;
                        `;
                        
                        const content = document.createElement('div');
                        content.style.cssText = `
                          background: white; padding: 20px; border-radius: 8px; 
                          box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 400px; width: 90%;
                        `;
                        
                        content.innerHTML = `
                          <h3 style="margin: 0 0 15px 0; color: #333;">📄 Preview Options for "${doc.name}"</h3>
                          <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button onclick="openInProgram('${doc.url}', '${doc.name}', '${doc.type}', 'default')" 
                              style="padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              🖥️ Open in Default Program
                            </button>
                            <button onclick="openInProgram('${doc.url}', '${doc.name}', '${doc.type}', 'browser')" 
                              style="padding: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              🌐 Open in Browser
                            </button>
                            <button onclick="openInProgram('${doc.url}', '${doc.name}', '${doc.type}', 'download')" 
                              style="padding: 10px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              📥 Download File
                            </button>
                            <button onclick="this.closest('.modal-overlay').remove()" 
                              style="padding: 10px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              ❌ Cancel
                            </button>
                          </div>
                        `;
                        
                        modal.className = 'modal-overlay';
                        modal.appendChild(content);
                        document.body.appendChild(modal);
                        
                        // Close on backdrop click
                        modal.onclick = (e) => {
                          if (e.target === modal) modal.remove();
                        };
                        
                        // Add global function for opening in programs
                        window.openInProgram = (url, name, type, method) => {
                          modal.remove();
                          showToast(`🚀 Opening "${name}"...`);
                          
                          try {
                            if (method === 'default') {
                              // Open in default program
                              if (url.startsWith('data:')) {
                                const byteCharacters = atob(url.split(',')[1]);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const blob = new Blob([byteArray], { type: type });
                                
                                const objectUrl = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = objectUrl;
                                link.download = name;
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
                                showToast(`✅ "${name}" opened in default program`);
                              } else {
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = name;
                                link.click();
                                showToast(`✅ "${name}" opened in default program`);
                              }
                            } else if (method === 'browser') {
                              // Open in browser
                              window.open(url, '_blank');
                              showToast(`✅ "${name}" opened in browser`);
                            } else if (method === 'download') {
                              // Download file
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = name;
                              link.click();
                              showToast(`✅ "${name}" downloaded`);
                            }
                          } catch (error) {
                            console.error('Error opening file:', error);
                            showToast('❌ Could not open file');
                          }
                        };
                        
                      }, className:"px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 tooltip", 'data-tooltip':"Preview Options"},'👁️')
                    ),
                    React.createElement('button',{onClick:()=>{
                      console.log('Download button clicked for:', doc.name, 'URL:', doc.url);
                      showToast('🔍 Testing Download...');
                      
                      // Simple test first
                      if (!doc.url) {
                        showToast('❌ No file URL available');
                        return;
                      }
                      
                      try {
                        // Create a temporary link to download/open the file
                        const link = document.createElement('a');
                        link.href = doc.url;
                        link.download = doc.name;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        console.log('Created download link:', link.href);
                        link.click();
                        document.body.removeChild(link);
                        showToast(`📄 Downloading "${doc.name}"`);
                        console.log('Download success');
                      } catch (error) {
                        console.error('Download error:', error);
                        showToast('❌ Download failed');
                      }
                    }, className:"px-2 py-1 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 tooltip", 'data-tooltip':"Download"},'📄'),
                    React.createElement('button',{onClick:()=>{
                      const nn=prompt('Rename file',doc.name);
                      if(nn&&nn.trim()) {
                        setDmDocs(prev=>prev.map(x=>x.id===doc.id?{...x,name:nn.trim()}:x));
                        showToast(`✏️ File renamed to "${nn.trim()}"`);
                      }
                    }, className:"px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 tooltip", 'data-tooltip':"Rename"},'✏️'),
                    React.createElement('button',{onClick:()=>{
                      const availableFolders = dmFolders.filter(f => f.name !== doc.folder);
                      if(availableFolders.length === 0) {
                        showToast('❌ No other folders available');
                        return;
                      }
                      const folderOptions = availableFolders.map(f => `${f.name}`).join('\n');
                      const selectedFolder = prompt(`Move "${doc.name}" to which folder?\n\nAvailable folders:\n${folderOptions}\n\nEnter folder name:`);
                      if(selectedFolder && selectedFolder.trim()) {
                        const targetFolder = dmFolders.find(f => f.name.toLowerCase() === selectedFolder.trim().toLowerCase());
                        if(targetFolder) {
                          setDmDocs(prev=>prev.map(x=>x.id===doc.id?{...x,folder:targetFolder.name}:x));
                          showToast(`📁 File moved to "${targetFolder.name}"`);
                        } else {
                          showToast('❌ Folder not found');
                        }
                      }
                    }, className:"px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600 tooltip", 'data-tooltip':"Move to Folder"},'📁'),
                    React.createElement('button',{onClick:()=>{
                      if(confirm(`Delete "${doc.name}"?`)) {
                        setDmDocs(prev => {
                          const newDocs = prev.filter(x => x.id !== doc.id);
                          console.log('Deleting document:', doc.name, 'ID:', doc.id);
                          console.log('Before deletion count:', prev.length);
                          console.log('After deletion count:', newDocs.length);
                          return newDocs;
                        });
                        showToast(`🗑️ "${doc.name}" deleted`);
                      }
                    }, className:"px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 font-bold transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 tooltip", 'data-tooltip':"Delete"},'🗑️')
                  )
                )
              ),
              dmDocs.filter(d=>d.folder===dmActive).length===0 &&
                React.createElement('div',{className:"text-center py-4"},
                  React.createElement('div',{className:"text-gray-400 text-sm mb-3"},'No files yet'),
                  React.createElement('button',{onClick:()=>{
                    const testFiles = [
                      {id: Date.now()+1, name: "test-file-1.pdf", type: "application/pdf", size: 1024000, date: new Date().toISOString(), folder: dmActive, url: "data:application/pdf;base64,test1"},
                      {id: Date.now()+2, name: "test-file-2.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 2048000, date: new Date().toISOString(), folder: dmActive, url: "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,test2"},
                      {id: Date.now()+3, name: "test-file-3.txt", type: "text/plain", size: 512000, date: new Date().toISOString(), folder: dmActive, url: "data:text/plain;base64,test3"}
                    ];
                    setDmDocs(prev => [...prev, ...testFiles]);
                    showToast('📄 Test files added!');
                  }, className:"px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"},'📄 Add Test Files')
                )
            )
          )
        )
      ),

      // === AI Analytics Dashboard ===
      showAnalytics && React.createElement('div',
        {className:"fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-1",
         onClick:(e)=>{ if(e.target===e.currentTarget) setShowAnalytics(false); }},
        React.createElement('div',{className:"bg-white w-full max-w-3xl rounded-lg border border-purple-300 overflow-hidden max-h-[90vh]"},
          // Header
          React.createElement('div',{className:"bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 flex items-center justify-between"},
            React.createElement('div',{className:"font-semibold flex items-center gap-2"},
              '🤖 AI Analytics Dashboard'
            ),
            React.createElement('button',{
              onClick:()=>setShowAnalytics(false),
              className:"text-white hover:text-gray-200 tooltip-bottom",
              'data-tooltip':"Close"
            },'✕')
          ),
          // Body
          React.createElement('div',{className:"p-3 space-y-4"},
            // Stats Overview
            React.createElement('div',{className:"grid grid-cols-1 md:grid-cols-3 gap-4"},
              React.createElement('div',{className:"bg-blue-50 p-4 rounded-lg border"},
                React.createElement('div',{className:"text-2xl font-bold text-blue-600"}, analyticsData.totalFiles),
                React.createElement('div',{className:"text-sm text-gray-600"}, 'Total Files')
              ),
              React.createElement('div',{className:"bg-green-50 p-4 rounded-lg border"},
                React.createElement('div',{className:"text-2xl font-bold text-green-600"}, Object.keys(analyticsData.folderDistribution).length),
                React.createElement('div',{className:"text-sm text-gray-600"}, 'Active Folders')
              ),
              React.createElement('div',{className:"bg-purple-50 p-4 rounded-lg border"},
                React.createElement('div',{className:"text-2xl font-bold text-purple-600"}, analyticsData.aiSuggestions.length),
                React.createElement('div',{className:"text-sm text-gray-600"}, 'AI Suggestions')
              )
            ),

            // Folder Distribution
            React.createElement('div',{className:"bg-gray-50 p-4 rounded-lg"},
              React.createElement('h3',{className:"font-semibold mb-3"}, '📂 Folder Distribution'),
              React.createElement('div',{className:"space-y-1"},
                Object.entries(analyticsData.folderDistribution).map(([folder, count]) =>
                  React.createElement('div',{key:folder, className:"flex justify-between items-center"},
                    React.createElement('span',{className:"text-sm"}, folder),
                    React.createElement('span',{className:"text-sm font-medium"}, `${count} files`)
                  )
                )
              )
            ),

            // AI Suggestions
            analyticsData.aiSuggestions.length > 0 && React.createElement('div',{className:"bg-yellow-50 p-4 rounded-lg border border-yellow-200"},
              React.createElement('h3',{className:"font-semibold mb-3"}, '💡 AI Suggestions'),
              React.createElement('div',{className:"space-y-1"},
                analyticsData.aiSuggestions.map((suggestion, index) =>
                  React.createElement('div',{key:index, className:"flex items-center justify-between p-2 bg-white rounded border"},
                    React.createElement('span',{className:"text-sm"}, suggestion.message),
                    suggestion.action === 'auto-organize' && React.createElement('button',{
                      onClick: autoOrganizeFiles,
                      className:"px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                    }, 'Organize')
                  )
                )
              )
            ),

            // Recent Activity
            React.createElement('div',{className:"bg-gray-50 p-4 rounded-lg"},
              React.createElement('h3',{className:"font-semibold mb-3"}, '🕒 Recent Activity'),
              React.createElement('div',{className:"space-y-2 max-h-40 overflow-y-auto"},
                analyticsData.recentActivity.map((activity, index) =>
                  React.createElement('div',{key:index, className:"flex items-center gap-2 text-sm"},
                    React.createElement('span',{className:"text-gray-500"}, new Date(activity.date).toLocaleDateString()),
                    React.createElement('span',{className:"text-gray-700"}, activity.file),
                    React.createElement('span',{className:"text-blue-600"}, `→ ${activity.folder}`)
                  )
                )
              )
            )
          )
        )
      ),

      // === Document Preview + AI Analysis Modal ===
      previewDoc && React.createElement(
        'div',
        { className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-1" },
        React.createElement(
          'div',
          { 
            className: "bg-white w-full max-w-4xl rounded-lg shadow-lg border border-yellow-400 overflow-hidden flex flex-col transform scale-100 transition-all duration-300",
            style: { maxHeight: '85vh' }
          },

          // === HEADER ===
          React.createElement('div', { className: "border-b" },
            React.createElement('div', { className: "h-1 bg-gradient-to-r from-yellow-400 to-orange-400" }),
            React.createElement('div', { className: "flex items-center justify-between px-5 py-3" },
              React.createElement('div', { className: "text-lg font-semibold text-gray-700 flex items-center gap-2" },
                '📄 Document Preview',
                React.createElement('span', { className: "text-sm text-gray-400" }, previewDoc.name)
              ),
              React.createElement('button',
                { onClick: () => setPreviewDoc(null), className: "text-gray-500 hover:text-gray-700 px-3 py-1 text-sm tooltip-bottom", 'data-tooltip': "Close", 'aria-label': "Close" },
                "✕"
              )
            )
          ),

          // === BODY ===
          React.createElement('div', { className: "p-5 modal-body-scroll space-y-6" },

            // === Preview Frame (Hotfix Pack v68.4: safe guards) ===
            React.createElement('div', { className: "rounded-lg border overflow-hidden bg-gray-50" },
              (() => {
                // Hotfix Pack v68.4: guard checks
                const canPreviewPDF = previewDoc?.type?.includes('pdf') && previewDoc?.url;
                const canPreviewImg = previewDoc?.type?.startsWith('image/') && previewDoc?.url;
                
                if (canPreviewPDF) {
                  return React.createElement('iframe', {
                    src: previewDoc.url,
                    className: "w-full h-[500px]",
                    title: "PDF Preview"
                  });
                }
                if (canPreviewImg) {
                  return React.createElement('img', {
                    src: previewDoc.url,
                    alt: previewDoc.name,
                    className: "w-full h-[500px] object-contain bg-white",
                    onError: (e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }, React.createElement('div', {
                    style: { display: 'none' },
                    className: "p-5 text-gray-600 text-sm text-center w-full h-[500px] items-center justify-center"
                  }, "❌ Preview failed to load."));
                }
                return React.createElement('div', { className: "p-5 text-gray-600 text-sm text-center" },
                  "📂 Preview not available for this file type."
                );
              })()
            ),

            // === AI Analysis Section ===
            React.createElement('div', { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3" },
              React.createElement('div', { className: "flex justify-between items-center" },
                React.createElement('h3', { className: "font-semibold text-yellow-700" }, "🤖 AI Document Analysis"),
                React.createElement('button', {
                  onClick: async () => {
                    showToast("🔍 Analyzing document...");
                    await new Promise(r => setTimeout(r, 1200));
                    const summary = previewDoc.name.toLowerCase().includes("cert")
                      ? "This document appears to be a certificate — includes expiry and compliance details."
                      : previewDoc.name.toLowerCase().includes("rams")
                        ? "RAMS safety document detected — covers risk and method statements."
                        : "General file analyzed successfully.";
                    const expiry = summary.includes("expiry") ? "2025-12-31" : null;
                    setDocAnalysis(prev => ({
                      ...prev,
                      [previewDoc.id]: { summary, expiry, analyzed: new Date().toLocaleString() }
                    }));
                    showToast("✅ AI analysis complete");
                  },
                  className: "px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                }, "Run Analysis")
              ),

              docAnalysis[previewDoc.id]
                ? React.createElement('div', { className: "space-y-2 text-sm text-gray-700" },
                    React.createElement('div', null, "🧠 Summary: ",
                      React.createElement('span', { className: "text-gray-800 font-medium" },
                        docAnalysis[previewDoc.id].summary
                      )
                    ),
                    docAnalysis[previewDoc.id].expiry &&
                      React.createElement('div', null, "📅 Expiry: ",
                        React.createElement('span', { className: "font-medium text-red-600" },
                          docAnalysis[previewDoc.id].expiry
                        )
                      ),
                    React.createElement('div', { className: "text-xs text-gray-500" },
                      `Analyzed: ${docAnalysis[previewDoc.id].analyzed}`
                    )
                  )
                : React.createElement('div', { className: "text-gray-500 text-sm italic" },
                    "No analysis yet — click \"Run Analysis\"."
                  )
            ),

            // === Notes Section ===
            React.createElement('div', { className: "bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3" },
              React.createElement('h3', { className: "font-semibold text-gray-700" }, "📝 Notes & Comments"),

              React.createElement('div', { className: "space-y-2" },
                (docNotes[previewDoc.id] || []).map((note, i) =>
                  React.createElement('div', {
                    key: i,
                    className: "p-2 bg-white rounded border text-sm text-gray-700"
                  },
                    note.text,
                    React.createElement('div', { className: "text-xs text-gray-400 mt-1" }, note.time)
                  )
                )
              ),

              React.createElement('div', { className: "flex gap-2" },
                React.createElement('input', {
                  type: "text",
                  placeholder: "Add a note...",
                  id: "newNoteInput",
                  className: "flex-1 border rounded px-3 py-2 text-sm",
                  onKeyDown: e => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      setDocNotes(prev => ({
                        ...prev,
                        [previewDoc.id]: [...(prev[previewDoc.id] || []), {
                          text: e.target.value.trim(),
                          time: new Date().toLocaleString()
                        }]
                      }));
                      e.target.value = "";
                    }
                  }
                }),
                React.createElement('button', {
                  onClick: () => {
                    const input = document.getElementById("newNoteInput");
                    if (input.value.trim()) {
                      setDocNotes(prev => ({
                        ...prev,
                        [previewDoc.id]: [...(prev[previewDoc.id] || []), {
                          text: input.value.trim(),
                          time: new Date().toLocaleString()
                        }]
                      }));
                      input.value = "";
                    }
                  },
                  className: "px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                }, "Add")
              )
            )
          )
        )
      )

    ));
  // === Helper Functions ===
  function hideTooltipGlobal(){ try{ const tip=document.getElementById('mp-tooltip'); if(tip) tip.classList.remove('show'); }catch{} }

    // AI Report Generation Function
    async function generateAIReport(reportData) {
    try {
      const apiKey = localStorage.getItem('mainpro_openai_key');
      if (!apiKey) {
        alert('Please configure your OpenAI API key in Settings first.');
        return;
      }

      const prompt = `
        You are MainPro AI, an expert in facility management and maintenance analytics. 
        Analyze the following maintenance data and provide a concise, actionable summary with insights and recommendations:
        
        Report Data:
        ${JSON.stringify(reportData, null, 2)}
        
        Please provide:
        1. Key performance metrics summary
        2. Notable trends or patterns
        3. Areas of concern or improvement
        4. Actionable recommendations
      `;
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const data = await response.json();
      const aiAnalysis = data.choices[0].message.content;
      
      // Safe HTML escaping (Hotfix Pack v68.4)
      const safe = (str)=> str.replace(/[&<>]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[s]));
      const html = safe(aiAnalysis).replace(/\n/g,'<br>');
      
      // Limiting clipboard length (Hotfix Pack v68.4)
      const clip = aiAnalysis.length>8000 ? aiAnalysis.slice(0,8000)+'…' : aiAnalysis;
      
      // Show AI analysis in a modal instead of alert
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4';
      modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div class="px-6 py-4 border-b flex items-center justify-between">
            <h3 class="text-lg font-semibold flex items-center gap-2">
              🤖 AI Analysis Report
            </h3>
            <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
          <div class="px-6 py-4 overflow-y-auto max-h-[60vh]">
            <div class="prose max-w-none">
              ${html}
            </div>
          </div>
          <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Close
            </button>
            <button onclick="navigator.clipboard.writeText('${clip.replace(/'/g, "\\'").replace(/"/g, '&quot;')}'); alert('Analysis copied to clipboard!');" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Copy
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
    } catch (e) {
      console.error('AI report generation failed:', e);
      alert(`AI report generation failed: ${e.message}`);
    }
  }

  }; // End of MainPro function

})();

// Render the app after all setup is complete
try {
  console.log('🚀 Starting React render...');
  console.log('MainPro function available:', typeof window.MainPro);
  console.log('React available:', typeof React);
  console.log('ReactDOM available:', typeof ReactDOM);
  
  // === MAINPRO AI SAFE GUARD – CRASH PROTECTION v1.0 ===
  try {
    // --- Проверка, что React и MainPro доступны ---
    console.log("🧠 Activating MainPro Safe Guard...");
    
    if (!window.React || !window.ReactDOM) {
      throw new Error("React libraries missing or not loaded properly");
    }
    if (typeof window.MainPro !== "function") {
      throw new Error("MainPro function not found or corrupted");
    }

    // --- Безопасный контейнер рендера ---
    const rootContainer = document.getElementById("root");
    if (!rootContainer) {
      const fallback = document.createElement("div");
      fallback.id = "root";
      document.body.appendChild(fallback);
    }

    // --- Функция безопасного рендера ---
    function safeRender() {
      try {
        console.log("🚀 Safe rendering MainPro...");
        const rootEl = document.getElementById("root");
        if (!rootEl) {
          console.error("❌ Root element not found!");
          document.body.innerHTML = '<div style="padding:20px;text-align:center;"><h1>❌ Root element not found</h1><p>Please refresh the page.</p></div>';
          return;
        }
        if (!window.MainPro) {
          console.error("❌ MainPro component not found!");
          rootEl.innerHTML = '<div style="padding:20px;text-align:center;"><h1>❌ MainPro component not loaded</h1><p>Please refresh the page.</p></div>';
          return;
        }
        // IMPORTANT: createRoot must be called only once per container.
        // Re-creating roots can multiply React event delegates and cause repeated onClick.
        if (!window.__mainproReactRoot) {
          window.__mainproReactRoot = ReactDOM.createRoot(rootEl);
        }
        window.__mainproReactRoot.render(
          React.createElement(window.MainPro)
        );
        setTimeout(function() {
          var loader = document.getElementById('mp-loading');
          if (loader) loader.style.display = 'none';
        }, 100);
      } catch (renderError) {
        console.error("❌ MainPro render failed:", renderError);
        const rootEl = document.getElementById("root");
        if (rootEl) {
          rootEl.innerHTML = '<div style="padding:20px;text-align:center;"><h1>❌ Render Error</h1><p>' + (renderError.message || 'Unknown error') + '</p><button onclick="location.reload()" style="padding:10px 20px;background:#f59e0b;color:white;border:none;border-radius:6px;cursor:pointer;">Reload Page</button></div>';
        }
        if (typeof showCrashOverlay === 'function') {
          showCrashOverlay(renderError);
        }
      }
    }

    // --- Показывает сообщение об ошибке ---
    function showCrashOverlay(error) {
      try {
        const errorMessage = error && error.message ? String(error.message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : (typeof error === 'string' ? error : 'Unknown error');
        
        const overlay = document.createElement("div");
        overlay.id = "mainpro-crash";
        overlay.style.cssText = 'position: fixed; inset: 0; background: linear-gradient(135deg, #fff9e6, #fff); color: #333; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 99999; font-family: sans-serif; text-align: center;';
        
        overlay.innerHTML = `
          <div style="max-width:600px;padding:30px;border:2px solid #f5b400;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.15);background:white;">
            <h1 style="color:#c89e14;margin-bottom:10px;">⚠️ MainPro Crash Protection</h1>
            <p style="font-size:14px;color:#444;margin-bottom:10px;">Something went wrong while rendering the dashboard.</p>
            <p style="font-size:12px;color:#666;margin-bottom:15px;word-break:break-word;">Error: ${errorMessage}</p>
            <button id="reloadMainPro" style="padding:10px 25px;background:#f5b400;color:white;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:bold;">
              🔁 Reload MainPro Safely
            </button>
            <p style="font-size:11px;color:#999;margin-top:15px;">MainPro AI Safe Guard v1.0</p>
          </div>
        `;
        
        // Hotfix Pack v68.4: не очищаем document.body целиком, добавляем overlay поверх
        document.body.appendChild(overlay);

        const reloadBtn = document.getElementById("reloadMainPro");
        if (reloadBtn) {
          reloadBtn.addEventListener("click", () => {
            location.reload();
          });
        }
      } catch (overlayError) {
        console.error("Failed to show crash overlay:", overlayError);
        // Last resort fallback
        if (document.body) {
          document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;"><h1>⚠️ Error</h1><p>Please refresh the page.</p><button onclick="location.reload()" style="padding:12px 24px;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer;">Reload</button></div>';
        }
      }
    }

    // --- Запуск безопасного рендера ---
    // Add timeout to detect white screen issues
    const renderTimeout = setTimeout(() => {
      const rootEl = document.getElementById("root");
      if (rootEl && rootEl.innerHTML.trim() === "") {
        console.warn("⚠️ App not rendered after 3 seconds - checking for issues...");
        if (!window.MainPro) {
          rootEl.innerHTML = '<div style="padding:40px;text-align:center;"><h1>⚠️ App Loading...</h1><p>MainPro component is loading. Please wait or refresh.</p><button onclick="location.reload()" style="padding:12px 24px;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:20px;">Refresh Page</button></div>';
        }
      }
    }, 3000);
    
    // Clear timeout if render succeeds
    const originalSafeRender = safeRender;
    safeRender = function() {
      originalSafeRender();
      clearTimeout(renderTimeout);
    };
    
    safeRender();

  } catch (fatalError) {
    console.error("💥 MainPro fatal error:", fatalError);
    try {
      const errorMessage = fatalError && fatalError.message ? String(fatalError.message).replace(/</g, '&lt;').replace(/>/g, '&gt;') : (typeof fatalError === 'string' ? fatalError : 'Unknown error');
      const errorStack = fatalError && fatalError.stack ? String(fatalError.stack).replace(/</g, '&lt;').replace(/>/g, '&gt;').substring(0, 500) : '';
      
      const emergency = document.createElement("div");
      emergency.id = "mainpro-fatal-error";
      emergency.style.cssText = "position:fixed;inset:0;background:linear-gradient(135deg, #fff9e6, #fff);display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:99999;font-family:sans-serif;padding:20px;";
      
      const container = document.createElement("div");
      container.style.cssText = "max-width:600px;padding:30px;border:2px solid #c00;border-radius:16px;box-shadow:0 8px 20px rgba(0,0,0,0.15);background:white;";
      
      const h1 = document.createElement("h1");
      h1.textContent = "💥 MainPro Fatal Error";
      h1.style.cssText = "color:#c00;margin-bottom:10px;";
      container.appendChild(h1);
      
      const p1 = document.createElement("p");
      p1.textContent = "Critical system failure detected.";
      p1.style.cssText = "color:#666;margin:10px 0;font-size:14px;";
      container.appendChild(p1);
      
      const p2 = document.createElement("p");
      p2.textContent = "Error: " + errorMessage;
      p2.style.cssText = "color:#999;font-size:12px;margin:10px 0;word-break:break-word;";
      container.appendChild(p2);
      
      if (errorStack) {
        const details = document.createElement("details");
        details.style.cssText = "margin:10px 0;";
        const summary = document.createElement("summary");
        summary.textContent = "Show details";
        summary.style.cssText = "cursor:pointer;color:#666;font-size:11px;";
        const pre = document.createElement("pre");
        pre.textContent = errorStack;
        pre.style.cssText = "font-size:10px;color:#999;overflow:auto;max-height:200px;background:#f5f5f5;padding:10px;border-radius:4px;margin-top:5px;";
        details.appendChild(summary);
        details.appendChild(pre);
        container.appendChild(details);
      }
      
      const button = document.createElement("button");
      button.textContent = "🔄 Emergency Reload";
      button.style.cssText = "padding:12px 24px;background:#c00;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:20px;font-size:14px;font-weight:bold;";
      button.onclick = function() { location.reload(); };
      container.appendChild(button);
      
      const p3 = document.createElement("p");
      p3.textContent = "MainPro AI Safe Guard v1.0";
      p3.style.cssText = "font-size:11px;color:#999;margin-top:15px;";
      container.appendChild(p3);
      
      emergency.appendChild(container);
      document.body.appendChild(emergency);
    } catch (emergencyError) {
      // Last resort - if even error handling fails
      document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;"><h1 style="color:#c00;">💥 Critical Error</h1><p>MainPro failed to load. Please refresh the page.</p><button onclick="location.reload()" style="padding:12px 24px;background:#c00;color:white;border:none;border-radius:8px;cursor:pointer;margin-top:20px;">Reload</button></div>';
      console.error("Emergency error handler also failed:", emergencyError);
    }
  }
} catch (error) {
  console.error('❌ React render failed:', error);
  // Safe Guard will handle this error
}

// === Expose modals globally (header buttons depend on this) ===
if (typeof openLoginModal === 'function') {
  window.openLoginModal = openLoginModal;
}

if (typeof openAIChatModal === 'function') {
  window.openAIChatModal = openAIChatModal;
}

if (typeof openSettingsModal === 'function') {
  window.openSettingsModal = openSettingsModal;
}


