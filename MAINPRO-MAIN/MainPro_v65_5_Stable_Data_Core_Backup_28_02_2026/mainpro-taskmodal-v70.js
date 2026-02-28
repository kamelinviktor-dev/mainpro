
// Expose function immediately before IIFE
window.openTaskModal = function(dateISO){
  console.warn('openTaskModal called before initialization - script may still be loading');
  setTimeout(() => {
    if(typeof window.openTaskModal === 'function' && window.openTaskModal._initialized){
      window.openTaskModal(dateISO);
    } else {
      alert('Task form is still loading. Please wait a moment and try again.');
    }
  }, 200);
};
(function(){

  // =============================
  // STORAGE LAYER
  // =============================
  function getActiveCalendarKey(){
    try{
      const calId = localStorage.getItem('mainpro_current_calendar_v1') || 'main';
      return `mainpro_calendar_${calId}`;
    }catch{
      return 'mainpro_calendar_main';
    }
  }

  function loadEvents() {
    try {
      const key = getActiveCalendarKey();
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // fallback (legacy mirrors)
    try {
      const parsed2 = JSON.parse(localStorage.getItem('mainpro_events_v60') || '[]');
      if (Array.isArray(parsed2)) return parsed2;
    } catch {}
    try {
      const parsed3 = JSON.parse(localStorage.getItem('mainpro_events_v70') || '[]');
      if (Array.isArray(parsed3)) return parsed3;
    } catch {}
    return [];
  }

  function saveEvents(arr) {
    try{
      const key = getActiveCalendarKey();
      localStorage.setItem(key, JSON.stringify(arr || []));
    }catch{}
    try { localStorage.setItem('mainpro_events_v60', JSON.stringify(arr || [])); } catch {}
    try { localStorage.setItem('mainpro_events_v70', JSON.stringify(arr || [])); } catch {}
  }

  // keep global cache for legacy/external code.
  // If React state is present, it will continuously sync window.MainProEvents already.
  try{
    if (typeof window.setEvents !== 'function') {
      window.MainProEvents = loadEvents();
    } else {
      if (!Array.isArray(window.MainProEvents)) window.MainProEvents = [];
    }
  }catch{}

  // =============================
  // MODAL STATE (in-memory, per open)
  // =============================

  let modalOverlay = null;
  let editId = null; // if editing existing event later

  // default blank form data
  function getBlankForm(dateISO){
    return {
      eventType: 'task',          // "task" | "contractor" | "meeting" | "service" | "other"
      date: dateISO || todayISO(),
      hasTime: false,
      startTime: '09:00',
      endTime: '',
      status: 'pending',
      catId: 'maintenance',
      reminder: 'none',
      recurFreq: 'none',
      recurMonths: 12,
      recurOptions: {},
      // universal
      title: '',
      description: '',
      priority: 'normal',         // for task
      assignedTo: '',
      // contractor visit
      companyName: '',
      contactPerson: '',
      phone: '',
      email: '',
      serviceType: '',
      equipment: '',
      frequency: 'one-off',       // ["one-off","daily","biweekly","weekly","bimonthly","monthly","quarterly","every4months","semiannual","every9months","yearly","every18months","every2years","every3years"]
      weekdays: [],               // Array of selected weekday numbers (0=Sun, 1=Mon, ..., 6=Sat)
      duration: '60',             // Duration in minutes (default: 60 = 1 hour)
      // meeting
      participants: '',
      location: '',
      // equipment service
      serialTag: '',
      engineer: '',
      nextDueDate: '',
      note: '',
      // attachments: link to Document Manager docs
      attachments: [],            // Array of {docId, name, folder, mime, size, addedAt}
      subtasks: []
    };
  }

  // utility date ISO today
  function todayISO(){
    return new Date().toISOString().slice(0,10);
  }

  // =============================
  // PUBLIC API:
  //   window.openTaskModal(dateISO?)
  // =============================

  // Replace the temporary function with the real one
  window.openTaskModal = function(input){
    try {
      if (modalOverlay) {
        // one modal at a time
        return;
      }

      let config = {};
      if (input && typeof input === 'object' && !Array.isArray(input) && !(input instanceof Date)) {
        config = {...input};
      }

      let baseDate;
      if (config.date) {
        baseDate = String(config.date).slice(0,10);
      } else if (config.start) {
        baseDate = String(config.start).slice(0,10);
      } else if (typeof input === 'string') {
        baseDate = input.slice(0,10);
      } else if (input instanceof Date) {
        baseDate = input.toISOString().slice(0,10);
      } else {
        baseDate = todayISO();
      }

      const formData = {...getBlankForm(baseDate)};
      formData.date = baseDate;

      if (config.title) formData.title = config.title;
      if (config.description) formData.description = config.description;
      if (config.notes) formData.description = config.notes;
      if (config.note) formData.note = config.note;
      if (config.priority) formData.priority = config.priority;
      if (config.assignedTo) formData.assignedTo = config.assignedTo;
      if (config.location) formData.location = config.location;

      if (config.eventType) {
        formData.eventType = config.eventType;
      } else if (config.taskType) {
        const lower = String(config.taskType).toLowerCase();
        if (lower.includes('contractor')) formData.eventType = 'contractor';
        else if (lower.includes('meeting')) formData.eventType = 'meeting';
        else if (lower.includes('service')) formData.eventType = 'service';
        else formData.eventType = 'task';
      }

      formData.status = config.status || formData.status;
      formData.catId = config.catId || formData.catId;
      formData.reminder = config.reminder || formData.reminder;
      formData.recurFreq = config.recur?.freq || config.recurFreq || formData.recurFreq;
      formData.recurMonths = config.recur?.months || config.recurMonths || formData.recurMonths;
      formData.recurOptions = config.recurOptions || formData.recurOptions || {};

      const allDay = !!config.allDay;
      formData.hasTime = config.hasTime !== undefined ? !!config.hasTime : !allDay;
      if (formData.hasTime) {
        let startTime = config.time || config.startTime;
        if (!startTime && config.start && String(config.start).includes('T')) {
          startTime = String(config.start).slice(11,16);
        }
        if (startTime) formData.startTime = startTime;

        let endTime = config.endTime;
        if (!endTime && config.end && String(config.end).includes('T')) {
          endTime = String(config.end).slice(11,16);
        }
        if (endTime) formData.endTime = endTime;
      } else {
        if (config.time) formData.startTime = config.time;
        formData.endTime = '';
      }

      if (Array.isArray(config.subtasks)) formData.subtasks = [...config.subtasks];
      if (Array.isArray(config.attachments)) formData.attachments = [...config.attachments];

      if (config.companyName) formData.companyName = config.companyName;
      if (config.contactPerson) formData.contactPerson = config.contactPerson;
      if (config.phone) formData.phone = config.phone;
      if (config.email) formData.email = config.email;
      if (config.serviceType) formData.serviceType = config.serviceType;
      if (config.equipment) formData.equipment = config.equipment;
      if (config.frequency) formData.frequency = config.frequency;
      if (config.participants) formData.participants = config.participants;
      if (config.serialTag) formData.serialTag = config.serialTag;
      if (config.engineer) formData.engineer = config.engineer;
      if (config.nextDueDate) formData.nextDueDate = config.nextDueDate;

      formData.__pref = config;

      if (config && (config.mode === 'edit' || config.isEdit || config.id || config.eventId || config.uuid)) {
        editId = config.id ?? config.eventId ?? config.uuid ?? null;
        formData._seriesScope = config._seriesScope || 'one';
        formData.seriesId = config.seriesId || null;
      } else {
        editId = null;
      }

      renderModal(formData);
    } catch(e) {
      console.error('Error in openTaskModal:', e);
      alert('Error opening task form: ' + e.message);
    }
  };
  
  // Mark as initialized
  window.openTaskModal._initialized = true;
  console.log('✅ openTaskModal function initialized');

  // (future) edit existing
  window.editTaskModal = function(eventId){
    if (modalOverlay) return;
    const existing = window.MainProEvents.find(ev=>ev.id===eventId);
    if (!existing) return;
    editId = eventId;
    // clone
    const formData = JSON.parse(JSON.stringify(existing));
    renderModal(formData);
  };

  // =============================
  // MODAL RENDER
  // =============================

  function renderModal(state){
    // build overlay using old Add Task v74 design
    modalOverlay = document.createElement('div');
    modalOverlay.className = 'mp-add-overlay';
    modalOverlay.innerHTML = `
      <div class="mp-add" role="dialog" aria-modal="true">
        <div class="mp-head">
          <div class="mp-title"><span class="mp-dot"></span> ${editId ? 'Edit Event' : 'Add Event'}</div>
          <button class="mp-close tooltip-bottom" id="mpTaskCloseBtn" aria-label="Close" data-tooltip="Close">✕</button>
        </div>
        <div class="mp-body">
          <!-- dynamic form goes here -->
        </div>
        <div class="mp-footer">
          <div class="mp-left">
            <button class="mp-btn mp-btn-danger" id="mpTaskDeleteBtn">Delete</button>
            <button class="mp-btn mp-btn-ghost tooltip-bottom" id="mpTaskDupBtn" type="button" data-tooltip="Duplicate (prefill only)">Duplicate</button>
          </div>
          <div class="mp-suffix">
            <button class="mp-btn mp-btn-gold" id="mpTaskSaveBtn">Save Event</button>
          </div>
        </div>
      </div>
    `;

    // mount
    document.body.appendChild(modalOverlay);

    // Add animation class after mount for smooth fade-in
    setTimeout(() => {
      const mpAddEl = modalOverlay.querySelector('.mp-add');
      if (mpAddEl) {
        mpAddEl.classList.add('mp-add-ready');
      }
    }, 10);

    // mount dynamic form
    const bodyEl = modalOverlay.querySelector('.mp-body');
    drawForm(bodyEl, state);

    // listeners
    modalOverlay.querySelector('#mpTaskCloseBtn').onclick = closeModal;
    modalOverlay.querySelector('#mpTaskSaveBtn').onclick = ()=>onSave(state);

    const dupBtn = modalOverlay.querySelector('#mpTaskDupBtn');
    if (dupBtn) {
      if (editId) {
        dupBtn.style.display = '';
      } else {
        dupBtn.style.display = 'none';
      }
      dupBtn.onclick = () => {
        try {
          if (!editId) return;
          let cfg = {};
          try { cfg = JSON.parse(JSON.stringify(state || {})); } catch { cfg = {...(state||{})}; }
          try { delete cfg.__pref; } catch {}
          try { delete cfg.id; delete cfg.eventId; delete cfg.uuid; } catch {}
          try { delete cfg.seriesId; delete cfg._seriesScope; } catch {}
          cfg.mode = 'add';
          cfg.isEdit = false;
          if (!cfg.date && state && state.date) cfg.date = state.date;
          if (!cfg.time && state && state.startTime) cfg.time = state.startTime;
          closeModal();
          setTimeout(() => {
            try {
              if (typeof window.openTaskModal === 'function') {
                window.openTaskModal(cfg);
                try { if (window.showToast) window.showToast('📄 Duplicated (edit then save)'); } catch {}
              }
            } catch {}
          }, 30);
        } catch {}
      };
    }

    const deleteBtn = modalOverlay.querySelector('#mpTaskDeleteBtn');
    if(deleteBtn){
      if(editId){
        deleteBtn.textContent = 'Delete Task';
      } else {
        deleteBtn.textContent = 'Close';
      }
      deleteBtn.onclick = ()=>{
        if(!editId){
          closeModal();
          return;
        }

        const baseId = editId || state.id || state.eventId || state.uuid;
        const seriesId = state.seriesId || state.recur?.seriesId || state.__pref?.seriesId || null;
        if(!baseId){
          window?.showToast?.('вљ пёЏ Cannot delete task: missing identifier');
          closeModal();
          return;
        }

        let deleteSeries = false;
        if(seriesId){
          // Safer default: OK = delete only this task. Entire series requires explicit confirm.
          const onlyThis = confirm('Delete ONLY this task?\nOK = only this task, Cancel = choose series delete');
          if(onlyThis){
            // continue as single delete
          } else {
            if(!confirm('Delete ENTIRE series?\nThis may remove MANY tasks.')) return;
            deleteSeries = true;
          }
        } else {
          if(!confirm('Delete this task?')) return;
        }

        const baseIdStr = String(baseId);

        // Queue Undo for single delete (series delete has no Undo)
        try{
          if(!deleteSeries && typeof window.mainproQueueUndoDeleteOne === 'function' && Array.isArray(window.MainProEvents)){
            const idx = window.MainProEvents.findIndex(e => String(e.id) === baseIdStr);
            const evDel = idx >= 0 ? window.MainProEvents[idx] : null;
            if(evDel) window.mainproQueueUndoDeleteOne(evDel, idx);
          }
        }catch{}

        if(typeof window.setEvents === 'function'){
          window.setEvents(prev => prev.filter(e => deleteSeries ? e.seriesId !== seriesId : String(e.id) !== baseIdStr));
        }

        try{
          const key = (() => {
            try {
              const calId = localStorage.getItem('mainpro_current_calendar_v1') || 'main';
              return `mainpro_calendar_${calId}`;
            } catch {
              return 'mainpro_calendar_main';
            }
          })();
          let arr=[];
          try{ arr = JSON.parse(localStorage.getItem(key)||'[]'); }catch{}
          // Queue Undo for single delete (series delete has no Undo)
          try{
            if(!deleteSeries && typeof window.mainproQueueUndoDeleteOne === 'function'){
              const idx = arr.findIndex(e => String(e.id) === baseIdStr);
              const evDel = idx >= 0 ? arr[idx] : null;
              if(evDel) window.mainproQueueUndoDeleteOne(evDel, idx);
            }
          }catch{}
          arr = arr.filter(e => deleteSeries ? e.seriesId !== seriesId : String(e.id) !== baseIdStr);
          localStorage.setItem(key, JSON.stringify(arr));
          try { localStorage.setItem('mainpro_events_v60', JSON.stringify(arr)); } catch {}
          try { localStorage.setItem('mainpro_events_v70', JSON.stringify(arr)); } catch {}
        }catch(err){
          console.error('Failed to update localStorage after delete:', err);
        }

        if(Array.isArray(window.MainProEvents)){
          window.MainProEvents = window.MainProEvents.filter(e => deleteSeries ? e.seriesId !== seriesId : String(e.id) !== baseIdStr);
        }

        try{
          const cal = window.calRef?.current;
          if(cal){
            if(deleteSeries){
              cal.getEvents().forEach(ev=>{
                if(ev.extendedProps?.seriesId === seriesId){
                  ev.remove();
                }
              });
            } else {
              const ev = cal.getEventById(baseIdStr) || cal.getEventById(baseId);
              ev?.remove();
            }
            cal.render?.();
          }
        }catch(err){
          console.error('Failed to update calendar after delete:', err);
        }

        if(deleteSeries){
          window.addAuditLog?.('TASK_SERIES_DELETED', {
            seriesId,
            taskId: baseId,
            title: state.title || state.__pref?.title || ''
          });
          window?.showToast?.('🗑️ Task series deleted');
        }else{
          window.addAuditLog?.('TASK_DELETED', {
            taskId: baseId,
            title: state.title || state.__pref?.title || '',
            taskType: state.taskType || state.__pref?.taskType || 'Task'
          });
          window?.showToast?.('🗑️ Task deleted');
        }

        closeModal();
      };
    }

    // Close on overlay click (outside modal)
    modalOverlay.addEventListener('click', (e)=>{ 
      if(e.target===modalOverlay || e.target.classList.contains('mp-add-overlay')) { 
        closeModal(); 
      } 
    });

    // small helper to sync inputs <-> state
    bodyEl.addEventListener('input', e=>{
      const t = e.target;
      const name = t.getAttribute('data-field');
      if(!name) return;

      if(t.type === 'checkbox'){
        state[name] = t.checked;
        // If hasTime checkbox changed, update time inputs visibility
        if(name === 'hasTime'){
          // Find time inputs container - try multiple selectors
          let timeInputs = bodyEl.querySelector('.mp-time-inputs');
          if(!timeInputs) {
            timeInputs = bodyEl.querySelector('.mp-field .mp-inline');
          }
          if(!timeInputs) {
            // Last resort - find by data-field attribute
            const startTimeInput = bodyEl.querySelector('input[data-field="startTime"]');
            if(startTimeInput && startTimeInput.parentElement) {
              timeInputs = startTimeInput.parentElement;
            }
          }
          if(timeInputs){
            const startTimeInput = timeInputs.querySelector('input[data-field="startTime"]');
            const endTimeInput = timeInputs.querySelector('input[data-field="endTime"]');
            if(t.checked){
              // Enable time inputs
              if(startTimeInput) {
                startTimeInput.disabled = false;
                startTimeInput.removeAttribute('readonly');
                startTimeInput.style.cursor = 'text';
                startTimeInput.style.opacity = '1';
              }
              if(endTimeInput) {
                endTimeInput.disabled = false;
                endTimeInput.removeAttribute('readonly');
                endTimeInput.style.cursor = 'text';
                endTimeInput.style.opacity = '1';
              }
            } else {
              // Disable time inputs
              if(startTimeInput) {
                startTimeInput.disabled = true;
                startTimeInput.style.cursor = 'not-allowed';
                startTimeInput.style.opacity = '0.6';
              }
              if(endTimeInput) {
                endTimeInput.disabled = true;
                endTimeInput.style.cursor = 'not-allowed';
                endTimeInput.style.opacity = '0.6';
              }
            }
          }
        }
      } else {
        state[name] = t.value;
      }

      // if user switches eventType, smoothly redraw the card
      if(name === 'eventType'){
        // Update state immediately
        state.eventType = t.value;
        // Use debounce for smooth transition
        clearTimeout(state._redrawTimer);
        state._redrawTimer = setTimeout(() => {
          drawForm(bodyEl, state);
        }, 100);
      }
    });

    // Handle weekday selection
    bodyEl.addEventListener('change', e=>{
      const t = e.target;
      const weekday = t.getAttribute('data-weekday');
      if(weekday !== null){
        if(!state.weekdays) state.weekdays = [];
        const wday = parseInt(weekday, 10);
        if(t.checked){
          if(!state.weekdays.includes(wday)){
            state.weekdays.push(wday);
          }
        } else {
          state.weekdays = state.weekdays.filter(d => d !== wday);
        }
        return;
      }
      const name = t.getAttribute('data-field');
      if(!name) return;

      if(t.type === 'checkbox'){
        state[name] = t.checked;
        // If hasTime checkbox changed, update time inputs visibility
        if(name === 'hasTime'){
          // Find time inputs container - try multiple selectors
          let timeInputs = bodyEl.querySelector('.mp-time-inputs');
          if(!timeInputs) {
            timeInputs = bodyEl.querySelector('.mp-field .mp-inline');
          }
          if(!timeInputs) {
            // Last resort - find by data-field attribute
            const startTimeInput = bodyEl.querySelector('input[data-field="startTime"]');
            if(startTimeInput && startTimeInput.parentElement) {
              timeInputs = startTimeInput.parentElement;
            }
          }
          if(timeInputs){
            const startTimeInput = timeInputs.querySelector('input[data-field="startTime"]');
            const endTimeInput = timeInputs.querySelector('input[data-field="endTime"]');
            if(t.checked){
              // Enable time inputs
              if(startTimeInput) {
                startTimeInput.disabled = false;
                startTimeInput.removeAttribute('readonly');
                startTimeInput.style.cursor = 'text';
                startTimeInput.style.opacity = '1';
              }
              if(endTimeInput) {
                endTimeInput.disabled = false;
                endTimeInput.removeAttribute('readonly');
                endTimeInput.style.cursor = 'text';
                endTimeInput.style.opacity = '1';
              }
            } else {
              // Disable time inputs
              if(startTimeInput) {
                startTimeInput.disabled = true;
                startTimeInput.style.cursor = 'not-allowed';
                startTimeInput.style.opacity = '0.6';
              }
              if(endTimeInput) {
                endTimeInput.disabled = true;
                endTimeInput.style.cursor = 'not-allowed';
                endTimeInput.style.opacity = '0.6';
              }
            }
          }
        }
      } else {
        state[name] = t.value;
      }

      // if user switches eventType, smoothly redraw the card
      if(name === 'eventType'){
        // Update state immediately
        state.eventType = t.value;
        // Use debounce for smooth transition
        clearTimeout(state._redrawTimer);
        state._redrawTimer = setTimeout(() => {
          drawForm(bodyEl, state);
        }, 100);
      }
    });

    // Escape key handler
    document.addEventListener('keydown', function escHandler(e){
      if(e.key==='Escape'){
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });

  }

  function closeModal(){
    if(modalOverlay){
      try { modalOverlay.classList.add('mp-overlay-leave'); } catch {}
      try {
        const mpAddEl = modalOverlay.querySelector('.mp-add');
        if (mpAddEl) mpAddEl.classList.add('mp-add-leave');
      } catch {}
      setTimeout(() => {
        try { if (modalOverlay) modalOverlay.remove(); } catch {}
        modalOverlay = null;
        editId = null;
      }, 180);
    }
  }

  // =============================
  // DRAW FORM CONTENT
  // =============================

  // helper to create input group using old Add Task styling - shared across all functions
  function fieldBlock(label, html){
    const wrap = document.createElement('div');
    wrap.className = 'mp-field';
    wrap.innerHTML = `
      <div class="mp-label">${label}</div>
      ${html}
    `;
    return wrap;
  }

  // helper function for escaping HTML in template strings
  function x(str){
    // basic safe text
    if(!str) return '';
    return String(str).replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function drawForm(container,state){
    // Find existing card section for smooth fade-out
    const existingCard = container.querySelector('.event-card-section');
    if (existingCard) {
      existingCard.style.opacity = '0';
      existingCard.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        drawFormContent(container, state);
      }, 150);
    } else {
      drawFormContent(container, state);
    }
  }

  function drawFormContent(container,state){

    // Clear only the dynamic parts (keep basic structure on redraw)
    const existingCard = container.querySelector('.event-card-section');
    const eventTypeField = container.querySelector('[data-field="eventType"]');
    const existingNoteField = container.querySelector('[data-field="note"]');
    // Remove existing attachments section if it exists
    const existingAttachmentsSection = container.querySelector('.mp-attachments-section');
    if (existingAttachmentsSection) {
      existingAttachmentsSection.remove();
    }
    
    // If redrawing, remove only the card and note, keep event type selector
    if(existingCard){
      if(existingCard.parentNode) existingCard.parentNode.removeChild(existingCard);
    }
    if(existingNoteField){
      const noteParent = existingNoteField.closest('.mp-field');
      if(noteParent && noteParent.parentNode) noteParent.parentNode.removeChild(noteParent);
    }

    // If first time, add event type selector and date/time row
    if(!eventTypeField){
      container.innerHTML = '';

      // common: eventType selector
      const selType = `
        <select class="mp-select" data-field="eventType" id="mp_event_type_select">
          <option value="task" ${state.eventType==='task'?'selected':''}>🧰 Internal Task</option>
          <option value="contractor" ${state.eventType==='contractor'?'selected':''}>🚚 Contractor Visit</option>
          <option value="meeting" ${state.eventType==='meeting'?'selected':''}>📝 Meeting / Interview</option>
          <option value="service" ${state.eventType==='service'?'selected':''}>🛠 Equipment Service</option>
          <option value="other" ${state.eventType==='other'?'selected':''}>📌 Other</option>
        </select>
      `;
      container.appendChild(fieldBlock('Event Type', selType));
      
      // Add direct change listener to select (will be re-added after redraw too)
      setTimeout(() => attachEventTypeListener(container, state), 10);
    } else {
      // Update existing select value if it exists
      const existingSelect = container.querySelector('[data-field="eventType"]');
      if(existingSelect && existingSelect.value !== state.eventType){
        existingSelect.value = state.eventType;
      }
      // Re-attach listener after redraw
      setTimeout(() => attachEventTypeListener(container, state), 10);
    }

    // Helper function to attach event type change listener
    function attachEventTypeListener(container, state){
      const selectEl = container.querySelector('[data-field="eventType"]');
      if(selectEl && !selectEl._hasListener){
        selectEl._hasListener = true;
        selectEl.addEventListener('change', function(e){
          state.eventType = e.target.value;
          // Remove the listener flag so it can be reattached after redraw
          selectEl._hasListener = false;
          clearTimeout(state._redrawTimer);
          state._redrawTimer = setTimeout(() => {
            drawForm(container, state);
          }, 100);
        });
      }
    }

    // date and time in a row (only add if first time)
    if(!eventTypeField){
      // date and time in a row
      const row1 = document.createElement('div');
      row1.className = 'mp-row';
      
      const dateField = `
        <input type="date" data-field="date" value="${state.date||todayISO()}" class="mp-input">
      `;
      const dateWrap = fieldBlock('Date', dateField);
      row1.appendChild(dateWrap);

      // TIME BLOCK
      const timeWrap = document.createElement('div');
      timeWrap.className = 'mp-field';
      const hasTimeLabel = document.createElement('div');
      hasTimeLabel.className = 'mp-label mp-inline';
      hasTimeLabel.innerHTML = `
        <input type="checkbox" data-field="hasTime" ${state.hasTime?'checked':''} style="accent-color:#f4c14f;">
        <span>Specific time?</span>
      `;
      timeWrap.appendChild(hasTimeLabel);

      const timeInputs = document.createElement('div');
      timeInputs.className = 'mp-inline mp-time-inputs';
      timeInputs.style.cssText = 'gap:10px; display:flex; flex-wrap:wrap;';
      timeInputs.innerHTML = `
        <div style="flex:1; min-width:120px;">
          <div class="mp-label" style="font-size:.82rem; margin-bottom:4px;">Start Time</div>
          <input type="time" data-field="startTime" value="${state.startTime||'09:00'}" class="mp-input" ${state.hasTime?'':'disabled'} style="width:100%; cursor:${state.hasTime?'text':'not-allowed'};">
        </div>
        <div style="flex:1; min-width:120px;">
          <div class="mp-label" style="font-size:.82rem; margin-bottom:4px;">End Time</div>
          <input type="time" data-field="endTime" value="${state.endTime||''}" class="mp-input" ${state.hasTime?'':'disabled'} style="width:100%; cursor:${state.hasTime?'text':'not-allowed'};">
        </div>
      `;
      timeWrap.appendChild(timeInputs);
      row1.appendChild(timeWrap);
      container.appendChild(row1);
    }

    // DYNAMIC CARDS - Each event type gets its own card
    const cardSection = document.createElement('div');
    cardSection.className = 'event-card-section';
    cardSection.style.cssText = `
      opacity:0;
      transform:translateY(10px);
      transition:opacity 0.2s ease-out, transform 0.2s ease-out;
      margin:12px 0;
    `;
    
    if(state.eventType === 'task'){
      drawTaskSection(cardSection,state);
      cardSection.classList.add('task-card');
    } else if (state.eventType === 'contractor'){
      drawContractorSection(cardSection,state);
      cardSection.classList.add('contractor-card');
    } else if (state.eventType === 'meeting'){
      drawMeetingSection(cardSection,state);
      cardSection.classList.add('meeting-card');
    } else if (state.eventType === 'service'){
      drawServiceSection(cardSection,state);
      cardSection.classList.add('service-card');
    } else {
      drawOtherSection(cardSection,state);
      cardSection.classList.add('other-card');
    }
    
    container.appendChild(cardSection);
    
    // Trigger fade-in animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardSection.style.opacity = '1';
        cardSection.style.transform = 'translateY(0)';
      });
    });

    // NOTE (common extra free notes)
    const noteField = `
      <input type="text" data-field="note" value="${x(state.note||'')}"
        placeholder="Internal note (optional)"
        class="mp-input">
    `;
    container.appendChild(fieldBlock('Note', noteField));
    
    // ATTACHMENTS (documents)
    drawAttachmentsSection(container, state);
  }
  // Draw attachments section — link to Document Manager docs
  function drawAttachmentsSection(container, state){
    const uniqueId = 'mp-att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const fmtSize = (n) => {
      const v = Number(n || 0);
      if (!v) return '';
      if (v < 1024) return v + ' B';
      if (v < 1024 * 1024) return (v / 1024).toFixed(1) + ' KB';
      return (v / (1024 * 1024)).toFixed(1) + ' MB';
    };
    const normAtt = (a) => ({
      docId: a.docId || a.id,
      name: a.name || 'untitled',
      folder: a.folder || '',
      mime: a.mime || a.type || '',
      size: Number(a.size || 0),
      addedAt: a.addedAt || a.date || new Date().toISOString()
    });

    const attachmentsSection = document.createElement('div');
    attachmentsSection.className = 'mp-attachments-section';
    attachmentsSection.style.cssText = `
      background:linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border:2px solid #d1d5db;
      border-radius:12px;
      padding:16px;
      margin:12px 0;
      box-shadow:0 2px 8px rgba(0,0,0,0.1);
    `;
    attachmentsSection.innerHTML = `
      <div style="font-weight:700;color:#374151;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:1.2em;">📎</span> Attachments
      </div>
    `;

    const attachmentsContainer = document.createElement('div');
    attachmentsContainer.className = 'mp-attachments-container';
    attachmentsContainer.id = uniqueId + '-container';
    attachmentsContainer.style.cssText = 'margin-bottom:12px;';

    const renderAttList = () => {
      attachmentsContainer.innerHTML = '';
      const atts = (state.attachments || []).map(normAtt);
      if (atts.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'mp-attachments-empty';
        emptyMsg.style.cssText = 'text-align:center;color:#9ca3af;font-size:0.875rem;padding:12px;';
        emptyMsg.textContent = 'No documents attached';
        attachmentsContainer.appendChild(emptyMsg);
        return;
      }
      atts.forEach((att) => {
        const docId = att.docId || att.id;
        const attItem = document.createElement('div');
        attItem.className = 'mp-attachment-item';
        attItem.dataset.docId = docId;
        attItem.style.cssText = `
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:8px 12px;
          background:white;
          border-radius:6px;
          margin-bottom:6px;
          border:1px solid #e5e7eb;
        `;
        attItem.innerHTML = `
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;color:#374151;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${x(att.name)}</div>
            <div style="font-size:0.75rem;color:#6b7280;">${x(att.folder)} ${att.size ? '• ' + fmtSize(att.size) : ''}</div>
          </div>
          <div style="display:flex;gap:4px;">
            <button type="button" class="mp-att-open-btn" data-doc-id="${x(docId)}" style="padding:4px 8px;background:#3b82f6;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;">Open</button>
            <button type="button" class="mp-attachment-remove-btn" data-doc-id="${x(docId)}" style="padding:4px 8px;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.75rem;">Remove</button>
          </div>
        `;
        attachmentsContainer.appendChild(attItem);
      });
    };
    renderAttList();
    attachmentsSection.appendChild(attachmentsContainer);

    const attachBtn = document.createElement('button');
    attachBtn.type = 'button';
    attachBtn.className = 'mp-attach-doc-btn';
    attachBtn.style.cssText = 'padding:8px 16px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.875rem;font-weight:500;display:inline-flex;align-items:center;gap:6px;';
    attachBtn.innerHTML = '<span>📎</span> Attach document';
    attachmentsSection.appendChild(attachBtn);

    container.appendChild(attachmentsSection);

    attachBtn.onclick = () => {
      const listMeta = window.MainProDocs?.listMeta;
      if (typeof listMeta !== 'function') {
        (window.showToast || alert)('Document Manager not loaded. Open Documents first.');
        return;
      }
      let docs = listMeta();
      const existingIds = new Set((state.attachments || []).map(a => String(a.docId || a.id)));

      const selOverlay = document.createElement('div');
      selOverlay.className = 'mp-doc-selector-overlay';
      selOverlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px;';
      selOverlay.innerHTML = `
        <div class="mp-doc-selector" style="background:white;border-radius:12px;max-width:480px;width:100%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,0.2);">
          <div style="padding:16px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;font-size:1rem;margin-bottom:12px;">Select document</div>
            <input type="text" id="mp-doc-sel-search" placeholder="Search name, folder, tags..." style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;margin-bottom:8px;">
            <select id="mp-doc-sel-folder" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:0.875rem;">
              <option value="">All folders</option>
            </select>
          </div>
          <div id="mp-doc-sel-list" style="flex:1;overflow-y:auto;padding:12px;min-height:120px;"></div>
          <div style="padding:12px;border-top:1px solid #e5e7eb;">
            <button type="button" id="mp-doc-sel-cancel" style="padding:8px 16px;background:#6b7280;color:white;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
          </div>
        </div>
      `;
      document.body.appendChild(selOverlay);

      const folders = [...new Set(docs.map(d => d.folder || 'General'))].filter(Boolean).sort();
      const folderSel = selOverlay.querySelector('#mp-doc-sel-folder');
      folders.forEach(f => {
        const o = document.createElement('option');
        o.value = f;
        o.textContent = f;
        folderSel.appendChild(o);
      });

      const renderList = () => {
        const q = (selOverlay.querySelector('#mp-doc-sel-search').value || '').trim().toLowerCase();
        const folder = folderSel.value || '';
        let filtered = docs;
        if (folder) filtered = filtered.filter(d => String(d.folder || 'General') === folder);
        if (q) {
          filtered = filtered.filter(d => {
            const hay = [d.name, d.folder, (d.tags || []).join(' '), d.notes].map(s => String(s || '').toLowerCase()).join(' ');
            return hay.includes(q);
          });
        }
        const listEl = selOverlay.querySelector('#mp-doc-sel-list');
        listEl.innerHTML = '';
        if (filtered.length === 0) {
          listEl.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:24px;">No documents found</div>';
          return;
        }
        filtered.forEach(d => {
          const already = existingIds.has(String(d.docId || d.id));
          const row = document.createElement('div');
          row.style.cssText = 'padding:10px 12px;border-radius:6px;margin-bottom:4px;cursor:' + (already ? 'not-allowed' : 'pointer') + ';background:' + (already ? '#f3f4f6' : '#f9fafb') + ';opacity:' + (already ? '0.7' : '1') + ';';
          row.innerHTML = `
            <div style="font-weight:500;font-size:0.875rem;">${x(d.name)}</div>
            <div style="font-size:0.75rem;color:#6b7280;">${x(d.folder)} • ${fmtSize(d.size)}</div>
            ${already ? '<div style="font-size:0.7rem;color:#9ca3af;">Already attached</div>' : ''}
          `;
          if (!already) {
            row.onclick = () => {
              const newAtt = normAtt({ docId: d.docId || d.id, name: d.name, folder: d.folder, mime: d.mime, size: d.size, addedAt: d.addedAt || new Date().toISOString() });
              state.attachments = [...(state.attachments || []), newAtt];
              renderAttList();
              selOverlay.remove();
            };
          }
          listEl.appendChild(row);
        });
      };

      selOverlay.querySelector('#mp-doc-sel-search').oninput = renderList;
      selOverlay.querySelector('#mp-doc-sel-search').onkeyup = (e) => { if (e.key === 'Escape') selOverlay.remove(); };
      folderSel.onchange = renderList;
      selOverlay.querySelector('#mp-doc-sel-cancel').onclick = () => selOverlay.remove();
      selOverlay.onclick = (e) => { if (e.target === selOverlay) selOverlay.remove(); };
      renderList();
    };

    attachmentsSection.addEventListener('click', (e) => {
      const openBtn = e.target.closest('.mp-att-open-btn');
      const removeBtn = e.target.closest('.mp-attachment-remove-btn');
      if (openBtn) {
        const docId = openBtn.getAttribute('data-doc-id');
        if (docId && window.MainProDocs?.openDocById) {
          window.MainProDocs.openDocById(docId);
        } else if (docId && window.MainProDocs?.openDocsModalAtDoc) {
          window.MainProDocs.openDocsModalAtDoc(docId);
        }
      }
      if (removeBtn) {
        const docId = removeBtn.getAttribute('data-doc-id');
        if (docId) {
          state.attachments = (state.attachments || []).filter(a => String(a.docId || a.id) !== String(docId));
          renderAttList();
        }
      }
    });
  }

  // --- Each section ---

  function drawTaskSection(container,state){
    container.style.cssText = `
      background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border:2px solid #f4c14f;
      border-radius:12px;
      padding:16px;
      margin:12px 0;
      box-shadow:0 4px 12px rgba(244,193,79,0.2);
    `;
    container.innerHTML = '<div style="font-weight:700;color:#92400e;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:1.2em;">🧰</span> Internal Task Details</div>';
    
    const taskFields = document.createElement('div');
    taskFields.style.cssText = 'display:grid;gap:10px;';

    taskFields.appendChild(fieldBlock('Title', `
      <input type="text" data-field="title" value="${x(state.title||'')}"
        placeholder="Example: Check Fire Alarm Panel"
        class="mp-input">
    `));

    taskFields.appendChild(fieldBlock('Description', `
      <textarea data-field="description" rows="2"
        placeholder="Short info or steps"
        class="mp-textarea">${x(state.description||'')}</textarea>
    `));

    // priority row
    const priRow = document.createElement('div');
    priRow.className = 'mp-row';
    priRow.appendChild(fieldBlock('Priority', `
      <select data-field="priority" class="mp-select">
        <option value="low" ${state.priority==='low'?'selected':''}>Low</option>
        <option value="normal" ${state.priority==='normal'?'selected':''}>Normal</option>
        <option value="high" ${state.priority==='high'?'selected':''}>High</option>
        <option value="urgent" ${state.priority==='urgent'?'selected':''}>URGENT 🚨</option>
      </select>
    `));
    
    priRow.appendChild(fieldBlock('Status', `
      <select data-field="status" class="mp-select">
        <option value="none" ${!state.status || state.status==='none'?'selected':''}>вљЄ No Status</option>
        <option value="pending" ${state.status==='pending'?'selected':''}>🟡 Pending</option>
        <option value="done" ${state.status==='done'?'selected':''}>🟢 Done</option>
        <option value="missed" ${state.status==='missed'?'selected':''}>🔴 Missed</option>
      </select>
    `));
    taskFields.appendChild(priRow);

    const assignRow = document.createElement('div');
    assignRow.className = 'mp-row';
    assignRow.appendChild(fieldBlock('Assigned To', `
      <input type="text" data-field="assignedTo" value="${x(state.assignedTo||'')}"
        placeholder="Name or team"
        class="mp-input">
    `));
    taskFields.appendChild(assignRow);

    taskFields.appendChild(fieldBlock('Frequency', `
      <select data-field="frequency" class="mp-select">
        <option value="one-off" ${state.frequency==='one-off'?'selected':''}>One-off</option>
        <option value="daily" ${state.frequency==='daily'?'selected':''}>Daily</option>
        <option value="biweekly" ${state.frequency==='biweekly'?'selected':''}>Every 2 weeks</option>
        <option value="weekly" ${state.frequency==='weekly'?'selected':''}>Weekly</option>
        <option value="bimonthly" ${state.frequency==='bimonthly'?'selected':''}>Every 2 months</option>
        <option value="monthly" ${state.frequency==='monthly'?'selected':''}>Monthly</option>
        <option value="quarterly" ${state.frequency==='quarterly'?'selected':''}>Every 3 months</option>
        <option value="every4months" ${state.frequency==='every4months'?'selected':''}>Every 4 months</option>
        <option value="semiannual" ${state.frequency==='semiannual'?'selected':''}>Every 6 months</option>
        <option value="every9months" ${state.frequency==='every9months'?'selected':''}>Every 9 months</option>
        <option value="yearly" ${state.frequency==='yearly'?'selected':''}>Yearly</option>
        <option value="every18months" ${state.frequency==='every18months'?'selected':''}>Every 18 months</option>
        <option value="every2years" ${state.frequency==='every2years'?'selected':''}>Every 2 years</option>
        <option value="every3years" ${state.frequency==='every3years'?'selected':''}>Every 3 years</option>
      </select>
    `));

    // Weekday selection for all frequencies - improved UI
    taskFields.appendChild(createWeekdayPicker(state));
    
    container.appendChild(taskFields);
  }

  // Helper function to create improved weekday picker
  function createWeekdayPicker(state) {
    const weekdaysField = document.createElement('div');
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekdayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun order
    const checkedWeekdays = state.weekdays || [];
    
    weekdaysField.innerHTML = `
      <div class="mp-label" style="margin-bottom:10px; display:flex; align-items:center; gap:8px;">
        <span>📝 Repeat on</span>
        <span class="mp-mini" style="margin-left:auto;">Select days of week</span>
      </div>
      <div class="picker-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:8px;">
        ${weekdayOrder.map(wd => {
          const isChecked = checkedWeekdays.includes(wd);
          const dayName = weekdays[wd];
          return `
          <label class="weekday-option" data-wd="${wd}" style="
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            cursor:pointer;
            padding:10px 8px;
            border-radius:10px;
            border:2px solid ${isChecked ? '#f4c14f' : '#e5e7eb'};
            background:${isChecked ? '#fffef5' : '#ffffff'};
            transition:all 0.2s ease;
            position:relative;
            min-height:50px;
            font-weight:${isChecked ? '600' : '500'};
            color:${isChecked ? '#92400e' : '#374151'};
            box-shadow:${isChecked ? '0 2px 8px rgba(244,193,79,0.25)' : '0 1px 3px rgba(0,0,0,0.05)'};
          " 
          onmouseover="if(!this.querySelector('input').checked){this.style.background='#f9fafb';this.style.borderColor='#d1d5db';this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'}" 
          onmouseout="if(!this.querySelector('input').checked){this.style.background='#ffffff';this.style.borderColor='#e5e7eb';this.style.transform='translateY(0)';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'}"
          onclick="const cb=this.querySelector('input');cb.checked=!cb.checked;const evt=new Event('change',{bubbles:true});cb.dispatchEvent(evt);">
            <input type="checkbox" data-weekday="${wd}" ${isChecked?'checked':''} style="position:absolute;opacity:0;pointer-events:none;">
            <span style="font-size:0.75rem;font-weight:600;letter-spacing:0.5px;color:${isChecked ? '#f4c14f' : '#9ca3af'};margin-bottom:4px;">${dayName.substring(0,1)}</span>
            <span style="font-size:0.875rem;user-select:none;">${dayName}</span>
          </label>
          `;
        }).join('')}
      </div>
      ${checkedWeekdays.length > 0 ? `
      <div class="mp-mini weekday-summary" style="margin-top:8px;color:#059669;font-weight:500;display:flex;align-items:center;gap:4px;">
        ✓ ${checkedWeekdays.length} day${checkedWeekdays.length > 1 ? 's' : ''} selected
      </div>
      ` : `
      <div class="mp-mini weekday-summary" style="margin-top:8px;color:#6b7280;">
        Select days when task repeats
      </div>
      `}
    `;
    
    // Add click handler for better UX
    setTimeout(() => {
      weekdaysField.querySelectorAll('.weekday-option').forEach(label => {
        const cb = label.querySelector('input[data-weekday]');
        cb.addEventListener('change', function() {
          const isChecked = this.checked;
          const labelEl = this.closest('.weekday-option');
          if(isChecked) {
            labelEl.style.background = '#fffef5';
            labelEl.style.borderColor = '#f4c14f';
            labelEl.style.color = '#92400e';
            labelEl.style.fontWeight = '600';
            labelEl.style.boxShadow = '0 2px 8px rgba(244,193,79,0.25)';
          } else {
            labelEl.style.background = '#ffffff';
            labelEl.style.borderColor = '#e5e7eb';
            labelEl.style.color = '#374151';
            labelEl.style.fontWeight = '500';
            labelEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
          }
          // Update summary
          const allChecked = Array.from(weekdaysField.querySelectorAll('input[data-weekday]')).filter(c => c.checked);
          const summaryEl = weekdaysField.querySelector('.weekday-summary');
          if(summaryEl) {
            if(allChecked.length > 0) {
              summaryEl.textContent = `✓ ${allChecked.length} day${allChecked.length > 1 ? 's' : ''} selected`;
              summaryEl.style.color = '#059669';
            } else {
              summaryEl.textContent = 'Select days when task repeats';
              summaryEl.style.color = '#6b7280';
            }
          }
        });
      });
    }, 0);
    
    return weekdaysField;
  }

  function drawContractorSection(container,state){
    container.style.cssText = `
      background:linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%);
      border:2px solid #3b82f6;
      border-radius:12px;
      padding:16px;
      margin:12px 0;
      box-shadow:0 4px 12px rgba(59,130,246,0.2);
    `;
    container.innerHTML = '<div style="font-weight:700;color:#1e40af;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:1.2em;">🚚</span> Contractor Visit - Company & Contact Details</div>';
    
    const contractorFields = document.createElement('div');
    contractorFields.style.cssText = 'display:grid;gap:10px;';

    const row1 = document.createElement('div');
    row1.className = 'mp-row';
    row1.appendChild(fieldBlock('Company Name', `
      <input type="text" data-field="companyName" value="${x(state.companyName||'')}"
        placeholder="Example: ABC Fire Systems Ltd"
        class="mp-input">
    `));
    row1.appendChild(fieldBlock('Contact Person', `
      <input type="text" data-field="contactPerson" value="${x(state.contactPerson||'')}"
        placeholder="John Smith"
        class="mp-input">
    `));
    contractorFields.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'mp-row';
    row2.appendChild(fieldBlock('Phone', `
      <input type="text" data-field="phone" value="${x(state.phone||'')}"
        placeholder="+44..."
        class="mp-input">
    `));
    row2.appendChild(fieldBlock('Email', `
      <input type="email" data-field="email" value="${x(state.email||'')}"
        placeholder="service@company.com"
        class="mp-input">
    `));
    contractorFields.appendChild(row2);

    contractorFields.appendChild(fieldBlock('Visit Type / Service', `
      <input type="text" data-field="serviceType" value="${x(state.serviceType||'')}"
        placeholder="Quarterly AHU filter change"
        class="mp-input">
    `));

    contractorFields.appendChild(fieldBlock('Equipment / Area', `
      <input type="text" data-field="equipment" value="${x(state.equipment||'')}"
        placeholder="Boiler #2 / Plant Room B2"
        class="mp-input">
    `));

    contractorFields.appendChild(fieldBlock('Status', `
      <select data-field="status" class="mp-select">
        <option value="none" ${!state.status || state.status==='none'?'selected':''}>вљЄ No Status</option>
        <option value="pending" ${state.status==='pending'?'selected':''}>🟡 Pending</option>
        <option value="done" ${state.status==='done'?'selected':''}>🟢 Done</option>
        <option value="missed" ${state.status==='missed'?'selected':''}>🔴 Missed</option>
      </select>
    `));

    contractorFields.appendChild(fieldBlock('Frequency', `
      <select data-field="frequency" class="mp-select">
        <option value="one-off" ${state.frequency==='one-off'?'selected':''}>One-off</option>
        <option value="daily" ${state.frequency==='daily'?'selected':''}>Daily</option>
        <option value="biweekly" ${state.frequency==='biweekly'?'selected':''}>Every 2 weeks</option>
        <option value="weekly" ${state.frequency==='weekly'?'selected':''}>Weekly</option>
        <option value="bimonthly" ${state.frequency==='bimonthly'?'selected':''}>Every 2 months</option>
        <option value="monthly" ${state.frequency==='monthly'?'selected':''}>Monthly</option>
        <option value="quarterly" ${state.frequency==='quarterly'?'selected':''}>Every 3 months</option>
        <option value="every4months" ${state.frequency==='every4months'?'selected':''}>Every 4 months</option>
        <option value="semiannual" ${state.frequency==='semiannual'?'selected':''}>Every 6 months</option>
        <option value="every9months" ${state.frequency==='every9months'?'selected':''}>Every 9 months</option>
        <option value="yearly" ${state.frequency==='yearly'?'selected':''}>Yearly</option>
        <option value="every18months" ${state.frequency==='every18months'?'selected':''}>Every 18 months</option>
        <option value="every2years" ${state.frequency==='every2years'?'selected':''}>Every 2 years</option>
        <option value="every3years" ${state.frequency==='every3years'?'selected':''}>Every 3 years</option>
      </select>
    `));

    // Weekday selection - improved UI
    contractorFields.appendChild(createWeekdayPicker(state));
    
    container.appendChild(contractorFields);
  }

  function drawMeetingSection(container,state){
    container.style.cssText = `
      background:linear-gradient(135deg, #f3e8ff 0%, #d8b4fe 100%);
      border:2px solid #a855f7;
      border-radius:12px;
      padding:16px;
      margin:12px 0;
      box-shadow:0 4px 12px rgba(168,85,247,0.2);
    `;
    container.innerHTML = '<div style="font-weight:700;color:#6b21a8;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:1.2em;">📝</span> Meeting / Interview Details</div>';
    
    const meetingFields = document.createElement('div');
    meetingFields.style.cssText = 'display:grid;gap:10px;';

    meetingFields.appendChild(fieldBlock('Title', `
      <input type="text" data-field="title" value="${x(state.title||'')}"
        placeholder="Interview with candidate"
        class="mp-input">
    `));

    const row1 = document.createElement('div');
    row1.className = 'mp-row';
    row1.appendChild(fieldBlock('Participants', `
      <input type="text" data-field="participants" value="${x(state.participants||'')}"
        placeholder="Me, Chief Engineer, Candidate"
        class="mp-input">
    `));
    row1.appendChild(fieldBlock('Location', `
      <input type="text" data-field="location" value="${x(state.location||'')}"
        placeholder="Plant Room L1 / Office / Teams Call"
        class="mp-input">
    `));
    meetingFields.appendChild(row1);

    meetingFields.appendChild(fieldBlock('Status', `
      <select data-field="status" class="mp-select">
        <option value="none" ${!state.status || state.status==='none'?'selected':''}>вљЄ No Status</option>
        <option value="pending" ${state.status==='pending'?'selected':''}>🟡 Pending</option>
        <option value="done" ${state.status==='done'?'selected':''}>🟢 Done</option>
        <option value="missed" ${state.status==='missed'?'selected':''}>🔴 Missed</option>
      </select>
    `));

    meetingFields.appendChild(fieldBlock('Frequency', `
      <select data-field="frequency" class="mp-select">
        <option value="one-off" ${state.frequency==='one-off'?'selected':''}>One-off</option>
        <option value="daily" ${state.frequency==='daily'?'selected':''}>Daily</option>
        <option value="biweekly" ${state.frequency==='biweekly'?'selected':''}>Every 2 weeks</option>
        <option value="weekly" ${state.frequency==='weekly'?'selected':''}>Weekly</option>
        <option value="bimonthly" ${state.frequency==='bimonthly'?'selected':''}>Every 2 months</option>
        <option value="monthly" ${state.frequency==='monthly'?'selected':''}>Monthly</option>
        <option value="quarterly" ${state.frequency==='quarterly'?'selected':''}>Every 3 months</option>
        <option value="every4months" ${state.frequency==='every4months'?'selected':''}>Every 4 months</option>
        <option value="semiannual" ${state.frequency==='semiannual'?'selected':''}>Every 6 months</option>
        <option value="every9months" ${state.frequency==='every9months'?'selected':''}>Every 9 months</option>
        <option value="yearly" ${state.frequency==='yearly'?'selected':''}>Yearly</option>
        <option value="every18months" ${state.frequency==='every18months'?'selected':''}>Every 18 months</option>
        <option value="every2years" ${state.frequency==='every2years'?'selected':''}>Every 2 years</option>
        <option value="every3years" ${state.frequency==='every3years'?'selected':''}>Every 3 years</option>
      </select>
    `));

    // Weekday selection - improved UI
    meetingFields.appendChild(createWeekdayPicker(state));
    
    container.appendChild(meetingFields);
  }

  function drawServiceSection(container,state){
    container.style.cssText = `
      background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border:2px solid #f4c14f;
      border-radius:12px;
      padding:16px;
      margin:12px 0;
      box-shadow:0 4px 12px rgba(244,193,79,0.2);
    `;
    container.innerHTML = '<div style="font-weight:700;color:#92400e;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:1.2em;">🛠</span> Equipment Service Log & Certification</div>';
    
    const serviceFields = document.createElement('div');
    serviceFields.style.cssText = 'display:grid;gap:10px;';

    const row1 = document.createElement('div');
    row1.className = 'mp-row';
    row1.appendChild(fieldBlock('Equipment Name', `
      <input type="text" data-field="equipment" value="${x(state.equipment||'')}"
        placeholder="Chiller 1"
        class="mp-input">
    `));
    row1.appendChild(fieldBlock('Serial / Tag / Asset ID', `
      <input type="text" data-field="serialTag" value="${x(state.serialTag||'')}"
        placeholder="CHLR-001 / SN443299"
        class="mp-input">
    `));
    serviceFields.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'mp-row';
    row2.appendChild(fieldBlock('Engineer', `
      <input type="text" data-field="engineer" value="${x(state.engineer||'')}"
        placeholder="External: Carrier Tech / Internal: Alex"
        class="mp-input">
    `));
    row2.appendChild(fieldBlock('Next Due Date', `
      <input type="date" data-field="nextDueDate" value="${x(state.nextDueDate||'')}"
        class="mp-input">
    `));
    serviceFields.appendChild(row2);

    serviceFields.appendChild(fieldBlock('Service Type', `
      <input type="text" data-field="serviceType" value="${x(state.serviceType||'')}"
        placeholder="Annual certification / Leak check / Filter change"
        class="mp-input">
    `));

    serviceFields.appendChild(fieldBlock('Status', `
      <select data-field="status" class="mp-select">
        <option value="none" ${!state.status || state.status==='none'?'selected':''}>вљЄ No Status</option>
        <option value="pending" ${state.status==='pending'?'selected':''}>🟡 Pending</option>
        <option value="done" ${state.status==='done'?'selected':''}>🟢 Done</option>
        <option value="missed" ${state.status==='missed'?'selected':''}>🔴 Missed</option>
      </select>
    `));

    serviceFields.appendChild(fieldBlock('Frequency', `
      <select data-field="frequency" class="mp-select">
        <option value="one-off" ${state.frequency==='one-off'?'selected':''}>One-off</option>
        <option value="daily" ${state.frequency==='daily'?'selected':''}>Daily</option>
        <option value="biweekly" ${state.frequency==='biweekly'?'selected':''}>Every 2 weeks</option>
        <option value="weekly" ${state.frequency==='weekly'?'selected':''}>Weekly</option>
        <option value="bimonthly" ${state.frequency==='bimonthly'?'selected':''}>Every 2 months</option>
        <option value="monthly" ${state.frequency==='monthly'?'selected':''}>Monthly</option>
        <option value="quarterly" ${state.frequency==='quarterly'?'selected':''}>Every 3 months</option>
        <option value="every4months" ${state.frequency==='every4months'?'selected':''}>Every 4 months</option>
        <option value="semiannual" ${state.frequency==='semiannual'?'selected':''}>Every 6 months</option>
        <option value="every9months" ${state.frequency==='every9months'?'selected':''}>Every 9 months</option>
        <option value="yearly" ${state.frequency==='yearly'?'selected':''}>Yearly</option>
        <option value="every18months" ${state.frequency==='every18months'?'selected':''}>Every 18 months</option>
        <option value="every2years" ${state.frequency==='every2years'?'selected':''}>Every 2 years</option>
        <option value="every3years" ${state.frequency==='every3years'?'selected':''}>Every 3 years</option>
      </select>
    `));

    // Weekday selection - improved UI
    serviceFields.appendChild(createWeekdayPicker(state));

    serviceFields.appendChild(fieldBlock('Description / Notes', `
      <textarea data-field="description" rows="3"
        placeholder="Findings, parts replaced, certifications issued, etc."
        class="mp-textarea">${x(state.description||'')}</textarea>
    `));
    
    container.appendChild(serviceFields);
  }

  function drawOtherSection(container,state){
    container.style.cssText = `
      background:linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border:2px solid #9ca3af;
      border-radius:12px;
      padding:16px;
      margin:12px 0;
      box-shadow:0 4px 12px rgba(156,163,175,0.2);
    `;
    container.innerHTML = '<div style="font-weight:700;color:#374151;font-size:1rem;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="font-size:1.2em;">📌</span> Other / General Note</div>';
    
    const otherFields = document.createElement('div');
    otherFields.style.cssText = 'display:grid;gap:10px;';

    otherFields.appendChild(fieldBlock('Title', `
      <input type="text" data-field="title" value="${x(state.title||'')}"
        placeholder="Something to remember"
        class="mp-input">
    `));

    otherFields.appendChild(fieldBlock('Details', `
      <textarea data-field="description" rows="3"
        placeholder="Details about this event"
        class="mp-textarea">${x(state.description||'')}</textarea>
    `));

    otherFields.appendChild(fieldBlock('Status', `
      <select data-field="status" class="mp-select">
        <option value="none" ${!state.status || state.status==='none'?'selected':''}>вљЄ No Status</option>
        <option value="pending" ${state.status==='pending'?'selected':''}>🟡 Pending</option>
        <option value="done" ${state.status==='done'?'selected':''}>🟢 Done</option>
        <option value="missed" ${state.status==='missed'?'selected':''}>🔴 Missed</option>
      </select>
    `));

    otherFields.appendChild(fieldBlock('Frequency', `
      <select data-field="frequency" class="mp-select">
        <option value="one-off" ${state.frequency==='one-off'?'selected':''}>One-off</option>
        <option value="daily" ${state.frequency==='daily'?'selected':''}>Daily</option>
        <option value="biweekly" ${state.frequency==='biweekly'?'selected':''}>Every 2 weeks</option>
        <option value="weekly" ${state.frequency==='weekly'?'selected':''}>Weekly</option>
        <option value="bimonthly" ${state.frequency==='bimonthly'?'selected':''}>Every 2 months</option>
        <option value="monthly" ${state.frequency==='monthly'?'selected':''}>Monthly</option>
        <option value="quarterly" ${state.frequency==='quarterly'?'selected':''}>Every 3 months</option>
        <option value="every4months" ${state.frequency==='every4months'?'selected':''}>Every 4 months</option>
        <option value="semiannual" ${state.frequency==='semiannual'?'selected':''}>Every 6 months</option>
        <option value="every9months" ${state.frequency==='every9months'?'selected':''}>Every 9 months</option>
        <option value="yearly" ${state.frequency==='yearly'?'selected':''}>Yearly</option>
        <option value="every18months" ${state.frequency==='every18months'?'selected':''}>Every 18 months</option>
        <option value="every2years" ${state.frequency==='every2years'?'selected':''}>Every 2 years</option>
        <option value="every3years" ${state.frequency==='every3years'?'selected':''}>Every 3 years</option>
      </select>
    `));

    // Weekday selection - improved UI
    otherFields.appendChild(createWeekdayPicker(state));

    container.appendChild(otherFields);
  }

  // =============================
  // SAVE HANDLER
  // =============================

  function onSave(state){
    // build event object to store
    const newEvent = {
      id: editId || ('ev_'+Date.now()),
      eventType: state.eventType,
      date: state.date,
      hasTime: !!state.hasTime,
      startTime: state.hasTime ? state.startTime || '' : '',
      endTime: state.hasTime ? state.endTime || '' : '',
      // generic
      title: state.title || '',
      description: state.description || '',
      note: state.note || '',
      status: state.status || 'none',
      catId: state.catId || 'maintenance',
      // task stuff
      priority: state.priority || 'normal',
      assignedTo: state.assignedTo || '',
      // contractor stuff
      companyName: state.companyName || '',
      contactPerson: state.contactPerson || '',
      phone: state.phone || '',
      email: state.email || '',
      serviceType: state.serviceType || '',
      equipment: state.equipment || '',
      frequency: state.frequency || 'one-off',
      weekdays: state.weekdays || [],
      duration: state.duration || '60',
      // meeting stuff
      participants: state.participants || '',
      location: state.location || '',
      // service stuff
      serialTag: state.serialTag || '',
      engineer: state.engineer || '',
      nextDueDate: state.nextDueDate || '',
      // attachments
      attachments: state.attachments || []
    };

    // Source of truth: React state (keeps FullCalendar + storage in sync)
    if (typeof window.setEvents === 'function') {
      // Convert v70.6 format to legacy format for compatibility
      const legacyEvent = convertToLegacyFormat(newEvent);
      
      // Generate recurring events if frequency is not one-off
      let additions = [];
      if (legacyEvent.seriesId && typeof window.generateSeries === 'function') {
        try {
          const freq = legacyEvent.recur?.freq || (newEvent.frequency && newEvent.frequency !== 'one-off' ? newEvent.frequency : 'none');
          const months = legacyEvent.recur?.months || 12;
          if(freq !== 'none') {
            additions = window.generateSeries({...legacyEvent}, freq, months);
            console.log(`✅ Generated ${additions.length} recurring events for frequency: ${freq}`);
          }
        } catch(e) {
          console.error('Failed to generate recurring events:', e);
        }
      }
      
      const eventsToAdd = [legacyEvent, ...additions];
      window.setEvents(prev => {
        const base = Array.isArray(prev) ? prev : [];
        const filtered = editId ? base.filter(e => {
          if (legacyEvent.seriesId && e.seriesId === legacyEvent.seriesId) return false;
          return String(e.id) !== String(editId);
        }) : base;
        const next = [...filtered, ...eventsToAdd];
        try { saveEvents(next); } catch {}
        try { window.MainProEvents = next; } catch {}
        try { if (typeof window.refreshCalendar === 'function') window.refreshCalendar(next); } catch {}
        return next;
      });
    } else {
      // Fallback: local-only save (when setEvents not available)
      const legacyEvent = convertToLegacyFormat(newEvent);
      try { window.MainProEvents = Array.isArray(window.MainProEvents) ? window.MainProEvents : []; } catch {}
      if(editId){
        window.MainProEvents = window.MainProEvents.map(ev => String(ev.id)===String(editId) ? legacyEvent : ev);
      } else {
        window.MainProEvents.push(legacyEvent);
      }
      saveEvents(window.MainProEvents);
      try { if (typeof window.refreshCalendar === 'function') window.refreshCalendar(window.MainProEvents); } catch {}
    }

    // toast
    if (window.showToast){
      window.showToast('✅ Event saved');
    } else {
      alert('Saved');
    }

    // let calendar / dashboard refresh itself if we wire it later
    if (window.MainProCalendar && typeof window.MainProCalendar.refresh === 'function') {
      window.MainProCalendar.refresh();
    }

    closeModal();
  }

  // Convert v70.6 format to legacy format for compatibility
  function convertToLegacyFormat(v70Event) {
    const date = v70Event.date || todayISO();
    const hasTime = v70Event.hasTime === true && v70Event.startTime;
    
    // If no time specified, create all-day event
    let startISO, endISO;
    if (hasTime) {
      const startTime = v70Event.startTime || '09:00';
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10) || 9);
      startISO = `${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      
      // Calculate end time
      endISO = startISO;
      if (v70Event.endTime) {
        endISO = `${date}T${v70Event.endTime}`;
      } else {
        const endDate = new Date(`${date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
        endDate.setHours(endDate.getHours() + 1); // Default 1 hour
        endISO = endDate.toISOString().slice(0, 16);
      }
    } else {
      // All-day event: just date without time
      startISO = date;
      endISO = date;
    }

    return {
      id: v70Event.id,
      title: v70Event.title || (v70Event.eventType === 'contractor' ? `${v70Event.companyName || 'Contractor Visit'}` : 
                                 v70Event.eventType === 'meeting' ? `${v70Event.title || 'Meeting'}` :
                                 v70Event.eventType === 'service' ? `${v70Event.equipment || 'Service'}` : 
                                 'Task'),
      start: startISO,
      end: endISO,
      allDay: !hasTime, // Set allDay based on hasTime
      status: v70Event.status || 'none',
      catId: v70Event.catId || 'maintenance',
      taskType: v70Event.eventType === 'contractor' ? 'Contractor' :
                v70Event.eventType === 'meeting' ? 'Meeting' :
                v70Event.eventType === 'service' ? 'Service' : 'Maintenance',
      priority: v70Event.priority || 'normal',
      location: v70Event.location || v70Event.equipment || '',
      notes: v70Event.description || v70Event.note || '',
      assignedTo: v70Event.assignedTo || '',
      contractorName: v70Event.contactPerson || '',
      contractorPhone: v70Event.phone || '',
      // Recurrence options
      recur: v70Event.frequency && v70Event.frequency !== 'one-off' ? {
        freq: v70Event.frequency,
        months: 12
      } : undefined,
      recurOptions: (() => {
        if(!v70Event.frequency || v70Event.frequency === 'one-off') return undefined;
        
        // Convert weekdays from v70.6 format to legacy format
        if((v70Event.frequency === 'weekly' || v70Event.frequency === 'biweekly' || v70Event.frequency === 'daily') && v70Event.weekdays && Array.isArray(v70Event.weekdays) && v70Event.weekdays.length > 0){
          return { wdays: v70Event.weekdays };
        }
        
        // For monthly frequencies, extract monthDay from date if available
        if(v70Event.date && (v70Event.frequency === 'monthly' || v70Event.frequency === 'bimonthly' || v70Event.frequency === 'quarterly' || v70Event.frequency === 'semiannual' || v70Event.frequency === 'yearly')){
          try {
            const d = new Date(v70Event.date + 'T00:00:00');
            if(!Number.isNaN(d.getTime())){
              return { monthDay: d.getDate() };
            }
          } catch {}
        }
        
        return undefined;
      })(),
      seriesId: v70Event.frequency && v70Event.frequency !== 'one-off' ? `S${v70Event.id}` : null,
      attachments: Array.isArray(v70Event.attachments) ? v70Event.attachments.map(a => ({
        docId: a.docId || a.id,
        name: a.name || 'untitled',
        folder: a.folder || '',
        mime: a.mime || a.type || '',
        size: Number(a.size || 0),
        addedAt: a.addedAt || a.date || new Date().toISOString()
      })) : [],
      // Extended props for v70.6 data
      extendedProps: {
        ...v70Event,
        // Ensure hasTime and startTime are preserved for proper all-day detection
        hasTime: v70Event.hasTime,
        startTime: v70Event.startTime,
        endTime: v70Event.endTime
      }
    };
  }

  // =============================
  // STYLE ANIMATION KEYFRAMES (uses existing Add Task v74 styles)
  // =============================
  // Styles are already defined in the Add Task v74 section at the top of the file
  // Ensure function is available even if there were errors
  if(!window.openTaskModal){
    console.error('openTaskModal not defined - there may be a JavaScript error above');
    window.openTaskModal = function(dateISO){
      alert('Error: Task form failed to load. Please check console for errors.');
      console.error('openTaskModal fallback called');
    };
  }

})();

// Fallback if IIFE fails
if(typeof window.openTaskModal === 'undefined'){
  console.warn('openTaskModal undefined after IIFE - defining fallback');
  window.openTaskModal = function(dateISO){
    alert('Task form is still loading. Please wait a moment and try again.');
  };
}


