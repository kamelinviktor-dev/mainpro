
(function(){
  // -------- Helpers --------
  const fmtISO = (d)=> new Date(d).toISOString().slice(0,16); // yyyy-mm-ddThh:mm
  const pad = (n)=> String(n).padStart(2,'0');

  // expose open function
  window.openAddTaskModal = function(pref={}) {
    const overlay = document.createElement('div');
    overlay.className = 'mp-add-overlay';
    overlay.innerHTML = `
      <div class="mp-add" role="dialog" aria-modal="true">
        <div class="mp-head">
          <div class="mp-title"><span class="mp-dot"></span> Add Task</div>
          <button class="mp-close tooltip-bottom" id="mp_close_btn" aria-label="Close" data-tooltip="Close">✕</button>
        </div>

        <div class="mp-body">
          <div class="mp-field">
            <div class="mp-label">Task title</div>
            <input class="mp-input" id="mp_title" placeholder="Enter task title…" value="${pref.title||''}">
          </div>

          <div class="mp-row">
            <div class="mp-field" style="flex:1;">
              <div class="mp-label">Date</div>
              <input class="mp-input" type="date" id="mp_date" style="width:100%;">
              <div class="mp-mini" id="mp_date_info"></div>
            </div>
            <div class="mp-field" style="flex:1;">
              <div class="mp-label mp-inline" style="margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
                <span>Time</span>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.875rem; font-weight:normal;">
                  <input type="checkbox" id="mp_all_day" style="cursor:pointer; accent-color:#f4c14f;">
                  <span>All day</span>
                </label>
              </div>
              <div class="mp-inline" id="mp_time_container" style="gap:8px; align-items:center;">
                <div style="flex:1; min-width:0;">
                  <input class="mp-input" type="time" id="mp_start" value="${pref.time||'09:00'}" style="width:100%;">
                </div>
                <span style="color:#6b7280; font-size:0.875rem; white-space:nowrap;">—</span>
                <div style="flex:1; min-width:0;">
                  <input class="mp-input" type="time" id="mp_end" value="${pref.endTime||pref.end||''}" style="width:100%;">
                </div>
              </div>
              <div class="mp-mini" style="margin-top:4px; display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="mp-btn mp-btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="quickTime('30')">30m</button>
                <button type="button" class="mp-btn mp-btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="quickTime('60')">1h</button>
                <button type="button" class="mp-btn mp-btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="quickTime('90')">1.5h</button>
                <button type="button" class="mp-btn mp-btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="quickTime('120')">2h</button>
                <button type="button" class="mp-btn mp-btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="quickTime('180')">3h</button>
              </div>
            </div>
          </div>

          <div class="mp-row">
            <div class="mp-field">
              <div class="mp-label">Category</div>
              <div class="mp-inline mp-suffix">
                <select class="mp-select" id="mp_cat"></select>
                <button class="mp-btn mp-btn-ghost" id="mp_cat_new" title="New category">+ New</button>
              </div>
            </div>
            <div class="mp-field">
              <div class="mp-label">Priority</div>
              <div class="mp-pri" id="mp_pris">
                <button class="mp-chip" data-val="none">None</button>
                <button class="mp-chip" data-val="low">Low</button>
                <button class="mp-chip" data-val="normal" data-active="1">Normal</button>
                <button class="mp-chip" data-val="high">High</button>
              </div>
            </div>
          </div>

          <div class="mp-row">
            <div class="mp-field">
              <div class="mp-label">Location</div>
              <input class="mp-input" id="mp_loc" placeholder="Room / Area">
            </div>
            <div class="mp-field">
              <div class="mp-label">Assignee</div>
              <select class="mp-select" id="mp_assignee">
                <option value="me">Me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          <div class="mp-field">
            <div class="mp-label mp-inline">Description / Notes
              <span class="mp-mini">Use AI to prefill.</span>
            </div>
            <textarea class="mp-textarea" id="mp_desc" placeholder="What needs to be done? Steps, checks, acceptance criteria…"></textarea>
            <div class="mp-inline">
              <button class="mp-btn mp-btn-ghost" id="mp_ai">✨ AI Assist</button>
              <span class="mp-mini" id="mp_ai_hint"></span>
            </div>
          </div>

          <div class="mp-field">
            <div class="mp-label">Subtasks</div>
            <div class="mp-sublist" id="mp_sublist"></div>
            <button class="mp-btn mp-btn-ghost" id="mp_add_sub">+ Add subtask</button>
          </div>

          <div class="mp-line"></div>

          <div class="mp-row">
            <div class="mp-field">
              <div class="mp-label">Repeat</div>
              <div class="mp-inline" style="gap:8px; align-items:center;">
                <select class="mp-select" id="mp_repeat">
                <option value="none" selected>No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
                <option value="bimonthly">Every 2 months</option>
                <option value="quarterly">Every 3 months</option>
                <option value="yearly">Yearly</option>
                <option value="internal_daily">Internal task — daily</option>
                <option value="internal_weekly">Internal task — weekly</option>
                <option value="internal_monthly">Internal task — monthly</option>
                <option value="contractor_weekly">Contractor visit — weekly</option>
                <option value="contractor_monthly">Contractor visit — monthly</option>
                <option value="meeting_weekly">Meetings — weekly</option>
                <option value="meeting_monthly">Meetings — monthly</option>
                <option value="custom">Custom interval…</option>
                </select>
                <button class="mp-btn mp-btn-ghost" type="button" id="mp_repeat_templates_btn" title="Quick templates">Templates</button>
              </div>
              <div class="mp-template-panel" id="mp_repeat_templates" style="display:none;">
                <div class="mp-template-grid" id="mp_repeat_templates_list"></div>
              </div>
            </div>
            <div class="mp-field" id="mp_repeat_opts" style="display:none">
              <div class="mp-label">Repeat options</div>
              <div id="mp_weekly_opts" style="display:none">
                <div class="picker-grid">
                  <label><input type="checkbox" data-wday="1"> Mon</label>
                  <label><input type="checkbox" data-wday="2"> Tue</label>
                  <label><input type="checkbox" data-wday="3"> Wed</label>
                  <label><input type="checkbox" data-wday="4"> Thu</label>
                  <label><input type="checkbox" data-wday="5"> Fri</label>
                  <label><input type="checkbox" data-wday="6"> Sat</label>
                  <label><input type="checkbox" data-wday="0"> Sun</label>
                </div>
              </div>
              <div id="mp_monthly_opts" style="display:none">
                <div class="mp-row" style="gap:8px; align-items:center">
                  <span class="mp-mini">Day of month</span>
                  <input class="mp-input" id="mp_month_day" type="number" min="1" max="31" style="width:100px" />
                </div>
              </div>
              <div id="mp_custom_opts" style="display:none">
                <div class="mp-row" style="gap:8px; align-items:center">
                  <span class="mp-mini">Every</span>
                  <input class="mp-input" id="mp_custom_interval" type="number" min="1" value="1" style="width:90px" />
                  <select class="mp-select" id="mp_custom_unit" style="width:140px">
                    <option value="day">Day(s)</option>
                    <option value="week">Week(s)</option>
                    <option value="month">Month(s)</option>
                    <option value="year">Year(s)</option>
                  </select>
                </div>
              </div>
              <div class="mp-mini" style="margin-top:8px; display:flex; align-items:center; gap:8px;">
                <span>Generate for</span>
                <input class="mp-input" id="mp_repeat_months" type="number" min="1" max="60" value="${pref.recur?.months || pref.recurMonths || 12}" style="width:80px" />
                <span>month(s)</span>
                <button type="button" class="mp-btn mp-btn-ghost" id="mp_full_year_btn" title="Set to 12 months">Full year</button>
              </div>
            </div>
            <div class="mp-field">
              <div class="mp-label">Reminder</div>
              <select class="mp-select" id="mp_rem">
                <option value="none" selected>No reminder</option>
                <option value="5">5 min before</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>
          </div>

          <div class="mp-field">
            <div class="mp-label">Attachments</div>
            <input class="mp-input" type="file" id="mp_files" multiple>
          </div>
        </div>

        <div class="mp-footer">
          <div class="mp-left">
            <button class="mp-btn mp-btn-danger" id="mp_delete">Delete</button>
          </div>
          <div class="mp-suffix">
            <button class="mp-btn mp-btn-danger" id="mp_clear">Clear</button>
            <button class="mp-btn mp-btn-gold" id="mp_save">Save Task</button>
          </div>
        </div>
      </div>
    `;

    // mount
    document.body.appendChild(overlay);

    // Add animation class after mount for smooth fade-in
    setTimeout(() => {
      const mpAddEl = overlay.querySelector('.mp-add');
      if (mpAddEl) {
        mpAddEl.classList.add('mp-add-ready');
      }
    }, 10);

    const isEditMode = !!(pref && (pref.mode === 'edit' || pref.isEdit || pref.id));

    // defaults
    const todayISO = new Date();
    const dEl = overlay.querySelector('#mp_date');
    const dayInfoEl = overlay.querySelector('#mp_date_info');
    const timeInput = overlay.querySelector('#mp_start');
    const endTimeInput = overlay.querySelector('#mp_end');
    const allDayCheckbox = overlay.querySelector('#mp_all_day');
    const timeContainer = overlay.querySelector('#mp_time_container');
    const repeatMonthsInput = overlay.querySelector('#mp_repeat_months');

    // Quick time buttons handler
    window.quickTime = function(minutes) {
      if(!timeInput || !endTimeInput) return;
      const startTime = timeInput.value || '09:00';
      const [sh, sm] = startTime.split(':').map(n => parseInt(n, 10));
      const startDate = new Date();
      startDate.setHours(sh, sm, 0, 0);
      const endDate = new Date(startDate.getTime() + parseInt(minutes, 10) * 60000);
      const eh = String(endDate.getHours()).padStart(2, '0');
      const em = String(endDate.getMinutes()).padStart(2, '0');
      endTimeInput.value = `${eh}:${em}`;
    };

    // All day toggle handler
    if(allDayCheckbox && timeContainer) {
      const updateTimeVisibility = () => {
        const isAllDay = allDayCheckbox.checked;
        timeContainer.style.display = isAllDay ? 'none' : 'flex';
        if(timeInput) timeInput.disabled = isAllDay;
        if(endTimeInput) endTimeInput.disabled = isAllDay;
      };
      allDayCheckbox.addEventListener('change', updateTimeVisibility);
      // Set initial state from pref
      if(pref && pref.allDay !== undefined) {
        allDayCheckbox.checked = !!pref.allDay;
        updateTimeVisibility();
      }
    }

    // Auto-update end time when start time changes
    if(timeInput && endTimeInput) {
      timeInput.addEventListener('change', () => {
        if(!endTimeInput.value) {
          // If no end time set, default to 1 hour
          window.quickTime('60');
        }
      });
    }
    const fullYearBtn = overlay.querySelector('#mp_full_year_btn');
    const saveBtn = overlay.querySelector('#mp_save');
    const deleteBtn = overlay.querySelector('#mp_delete');
    // Handle date input - support both date string and Date object
    if (pref.date) {
      try {
        const dateValue = typeof pref.date === 'string' ? pref.date : pref.date.toISOString().split('T')[0];
        dEl.value = dateValue;
      } catch(e) {
        dEl.valueAsDate = todayISO;
      }
    } else {
      dEl.valueAsDate = todayISO;
    }
    const updateDateInfo = ()=>{
      if(!dayInfoEl) return;
      const value = dEl.value;
      if(!value){
        dayInfoEl.textContent = '';
        return;
      }
      const d = new Date(value+'T00:00:00');
      if(Number.isNaN(d.getTime())){
        dayInfoEl.textContent = '';
        return;
      }
      const weekday = d.toLocaleDateString(undefined,{weekday:'long'});
      const formatted = d.toLocaleDateString(undefined,{year:'numeric', month:'long', day:'numeric'});
      dayInfoEl.textContent = `${weekday} • ${formatted}`;
    };
    dEl.addEventListener('change', updateDateInfo);
    updateDateInfo();
    if(fullYearBtn && repeatMonthsInput){
      fullYearBtn.addEventListener('click', (e)=>{
        e.preventDefault();
        repeatMonthsInput.value = '12';
      });
    }
    // Repeat UI wiring
    const repeatSel = overlay.querySelector('#mp_repeat');
    const repeatBox = overlay.querySelector('#mp_repeat_opts');
    const weeklyBox = overlay.querySelector('#mp_weekly_opts');
    const monthlyBox = overlay.querySelector('#mp_monthly_opts');
    const customBox = overlay.querySelector('#mp_custom_opts');
    const monthDayInput = overlay.querySelector('#mp_month_day');
    const customIntervalInput = overlay.querySelector('#mp_custom_interval');
    const customUnitSelect = overlay.querySelector('#mp_custom_unit');

    const repeatTemplates = {
      internal_daily:    { freq:'daily',    taskType:'Internal Task',    icon:'🏠', label:'Internal task • Daily',    hint:'Daily in-house routines' },
      internal_weekly:   { freq:'weekly',   taskType:'Internal Task',    icon:'🏠', label:'Internal task • Weekly',   hint:'Weekly team duties' },
      internal_monthly:  { freq:'monthly',  taskType:'Internal Task',    icon:'🏠', label:'Internal task • Monthly',  hint:'Monthly internal check' },
      contractor_weekly: { freq:'weekly',   taskType:'Contractor Visit', icon:'🛠️', label:'Contractor visit • Weekly', hint:'Weekly vendor visits' },
      contractor_monthly:{ freq:'monthly',  taskType:'Contractor Visit', icon:'🛠️', label:'Contractor visit • Monthly',hint:'Monthly contractor work' },
      meeting_weekly:    { freq:'weekly',   taskType:'Meeting',          icon:'🗓️', label:'Meeting • Weekly',         hint:'Weekly meetings' },
      meeting_monthly:   { freq:'monthly',  taskType:'Meeting',          icon:'🗓️', label:'Meeting • Monthly',        hint:'Monthly meetings' }
    };

    const normalizeRepeatValue = (value)=> (repeatTemplates[value]?.freq) || value;
    const findTemplateFor = (freq, type)=>{
      const entry = Object.entries(repeatTemplates).find(([,cfg])=>cfg.freq===freq && cfg.taskType===type);
      return entry ? entry[0] : null;
    };
    const templateBtn = overlay.querySelector('#mp_repeat_templates_btn');
    const templatePanel = overlay.querySelector('#mp_repeat_templates');
    const templateList = overlay.querySelector('#mp_repeat_templates_list');

    function updateTemplateActive(){
      if(!templateList) return;
      templateList.querySelectorAll('[data-template]').forEach(btn=>{
        btn.dataset.active = (btn.dataset.template === repeatSel.value) ? '1' : '0';
      });
    }

    if(templateList){
      templateList.innerHTML = '';
      Object.entries(repeatTemplates).forEach(([value, meta])=>{
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mp-template-btn';
        btn.dataset.template = value;
        btn.innerHTML = `
          <span class="mp-template-meta">
            <span class="mp-template-label">${meta.icon || '🔁'} ${meta.label}</span>
            ${meta.hint ? `<span class="mp-template-hint">${meta.hint}</span>` : ''}
          </span>
          <span class="mp-template-apply">Use</span>
        `;
        templateList.appendChild(btn);
      });
    }

    templateBtn?.addEventListener('click', (e)=>{
      e.preventDefault();
      if(!templatePanel) return;
      const showing = templatePanel.style.display !== 'none';
      templatePanel.style.display = showing ? 'none' : '';
      updateTemplateActive();
    });

    templateList?.addEventListener('click', (e)=>{
      const target = e.target.closest('[data-template]');
      if(!target) return;
      const key = target.dataset.template;
      const tpl = repeatTemplates[key];
      if(!tpl) return;
      repeatSel.value = key;
      taskType = tpl.taskType;
      updateRepeatUI();
      updateTemplateActive();
      if(templatePanel) templatePanel.style.display = 'none';
      window?.showToast?.(`🔁 Template applied: ${tpl.label}`);
    });

    // Bind overlay click handler once
    if (overlay.dataset.bound === "1") return;
    overlay.dataset.bound = "1";

    overlay.addEventListener('click', (e)=>{
      // 1) Close repeat templates panel when clicking outside it
      if(templatePanel && templatePanel.style.display !== 'none'){
        if(!(templatePanel.contains(e.target) || templateBtn?.contains(e.target))){
          templatePanel.style.display = 'none';
        }
      }

      // 2) Close modal when clicking outside modal content
      if(e.target===overlay || e.target.classList.contains('mp-add-overlay')) { 
        close(); 
      } 
    });

    function updateRepeatUI(){
      const mode = normalizeRepeatValue(repeatSel.value);
      repeatBox.style.display = (mode==='weekly'||mode==='biweekly'||mode==='monthly'||mode==='bimonthly'||mode==='custom') ? '' : 'none';
      weeklyBox.style.display = (mode==='weekly'||mode==='biweekly') ? '' : 'none';
      monthlyBox.style.display = (mode==='monthly'||mode==='bimonthly') ? '' : 'none';
      customBox.style.display = (mode==='custom') ? '' : 'none';
      if(mode==='weekly'||mode==='biweekly'){
        // Preselect the weekday of chosen date if none selected yet
        const checks = overlay.querySelectorAll('[data-wday]');
        const anyChecked = Array.from(checks).some(c=>c.checked);
        if(!anyChecked){
          const dateStr = overlay.querySelector('#mp_date')?.value;
          const d = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
          const w = d.getDay();
          checks.forEach(c=>{ c.checked = Number(c.getAttribute('data-wday'))===w; });
        }
      }
      if(mode==='monthly'||mode==='bimonthly'){
        // Default to selected date's day
        if(!monthDayInput.value){
          const dateStr = overlay.querySelector('#mp_date')?.value;
          const d = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
          monthDayInput.value = String(d.getDate());
        }
      }
      if(mode==='custom'){
        if(!customIntervalInput.value || Number(customIntervalInput.value) < 1){
          customIntervalInput.value = '1';
        }
        if(!customUnitSelect.value){
          customUnitSelect.value = 'day';
        }
      }
    }
    repeatSel.addEventListener('change', ()=>{
      updateRepeatUI();
      const tpl = repeatTemplates[repeatSel.value];
      if(tpl){
        taskType = tpl.taskType;
      }
      updateTemplateActive();
      if(templatePanel) templatePanel.style.display = 'none';
    });
    updateRepeatUI();
    updateTemplateActive();

    // populate categories (from your app if present)
    const catSel = overlay.querySelector('#mp_cat');
    const cats = (window.categories && Array.isArray(window.categories) && window.categories.length)
      ? window.categories
      : [{id:'maintenance',name:'Maintenance',color:'#f59e0b'},{id:'compliance',name:'Compliance',color:'#38bdf8'},{id:'other',name:'Other',color:'#6b7280'}];
    cats.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c.id; opt.textContent=c.name;
      catSel.appendChild(opt);
    });
    if(pref.catId){ catSel.value = pref.catId; }

    // task type & priority
    let taskType = pref.taskType || 'Maintenance';
    let priority = pref.priority || 'normal';
    const priorityButtons = overlay.querySelectorAll('#mp_pris .mp-chip');
    priorityButtons.forEach(btn=>{
      btn.dataset.active = btn.dataset.val === priority ? '1' : '0';
      btn.addEventListener('click',()=>{
        priorityButtons.forEach(b=>b.dataset.active='0');
        btn.dataset.active='1';
        priority = btn.dataset.val;
      });
    });

    // subtasks
    const sublist = overlay.querySelector('#mp_sublist');
    const addSub = (val='')=>{
      const row=document.createElement('div');
      row.className='mp-sub';
      row.innerHTML=`<input class="mp-input" type="text" placeholder="SubtaskвЂ¦" value="${val}">
                     <span class="mp-x" title="Remove">Г—</span>`;
      row.querySelector('.mp-x').onclick=()=> row.remove();
      sublist.appendChild(row);
    };
    overlay.querySelector('#mp_add_sub').onclick=()=>addSub();
    if(pref.subtasks && Array.isArray(pref.subtasks) && pref.subtasks.length){
      pref.subtasks.forEach(sub=>addSub(sub));
    } else {
      addSub(); addSub();
    }

    // new category quick add
    overlay.querySelector('#mp_cat_new').onclick=()=>{
      const name = prompt('New category name:');
      if(!name) return;
      const id = name.toLowerCase().trim().replace(/\s+/g,'-');
      if(window.categories){
        if(window.categories.some(c=>c.id===id)){ alert('Category exists'); return; }
        const item = {id, name, color:'#6b7280'};
        window.categories = [...window.categories, item];
      }
      const opt=document.createElement('option'); opt.value=id; opt.textContent=name;
      catSel.appendChild(opt); catSel.value=id;
      window?.showToast?.(`📁 Category "${name}" added`);
    };

    if(saveBtn){
      saveBtn.textContent = isEditMode ? 'Update Task' : 'Save Task';
    }
    if(deleteBtn){
      deleteBtn.style.display = '';
    }

    const titleInput = overlay.querySelector('#mp_title');
    const locationInput = overlay.querySelector('#mp_loc');
    const descInput = overlay.querySelector('#mp_desc');
    const assigneeSelect = overlay.querySelector('#mp_assignee');
    const reminderSelect = overlay.querySelector('#mp_rem');

    if(pref.title && titleInput){
      titleInput.value = pref.title;
    }
    if(locationInput){
      locationInput.value = pref.location || '';
    }
    if(descInput){
      descInput.value = pref.notes || pref.description || '';
    }
    if(assigneeSelect){
      const currentUserId = window.getCurrentUser?.().id;
      if(pref.assignedTo){
        if(currentUserId && pref.assignedTo === currentUserId){
          assigneeSelect.value = 'me';
        } else {
          const existingOption = Array.from(assigneeSelect.options).find(opt => opt.value === pref.assignedTo);
          if(!existingOption){
            const opt = document.createElement('option');
            opt.value = pref.assignedTo;
            opt.textContent = pref.assignedTo;
            assigneeSelect.appendChild(opt);
          }
          assigneeSelect.value = pref.assignedTo;
        }
      } else {
        assigneeSelect.value = 'unassigned';
      }
    }
    if(reminderSelect && pref.reminder){
      reminderSelect.value = pref.reminder;
    }
    if(pref.time && timeInput){
      timeInput.value = pref.time;
    } else if(pref.start && timeInput){
      const startDate = new Date(pref.start);
      if(!Number.isNaN(startDate.getTime())){
        timeInput.value = startDate.toISOString().slice(11,16);
      }
    }
    if(pref.start){
      const startDate = new Date(pref.start);
      if(!Number.isNaN(startDate.getTime())){
        dEl.value = startDate.toISOString().slice(0,10);
        updateDateInfo();
      }
    }
    if(pref && pref.end && endTimeInput){
      const endDate = new Date(pref.end);
      if(!Number.isNaN(endDate.getTime())){
        const eh = String(endDate.getHours()).padStart(2, '0');
        const em = String(endDate.getMinutes()).padStart(2, '0');
        endTimeInput.value = `${eh}:${em}`;
      }
    } else if(endTimeInput && !endTimeInput.value) {
      // Set default end time to 1 hour after start
      if(timeInput && timeInput.value) {
        window.quickTime('60');
      }
    }
    if(repeatMonthsInput){
      repeatMonthsInput.value = pref.recur?.months || pref.recurMonths || repeatMonthsInput.value || '12';
    }
    if(pref.recur){
      if(pref.recur.freq){
        repeatSel.value = pref.recur.freq;
      }
    } else if(pref.recurFreq){
      repeatSel.value = pref.recurFreq;
    }
    const presetKey = findTemplateFor(normalizeRepeatValue(repeatSel.value), taskType);
    if(presetKey){
      repeatSel.value = presetKey;
      taskType = repeatTemplates[presetKey].taskType;
    }
    updateRepeatUI();
    updateTemplateActive();
    if(pref.recurOptions){
      if(Array.isArray(pref.recurOptions.wdays)){
        overlay.querySelectorAll('[data-wday]').forEach(cb=>{
          const val = Number(cb.getAttribute('data-wday'));
          cb.checked = pref.recurOptions.wdays.includes(val);
        });
      }
      if(typeof pref.recurOptions.monthDay === 'number' && !Number.isNaN(pref.recurOptions.monthDay)){
        monthDayInput.value = pref.recurOptions.monthDay;
      }
      if(pref.recurOptions.interval){
        customIntervalInput.value = pref.recurOptions.interval;
      }
      if(pref.recurOptions.unit){
        customUnitSelect.value = pref.recurOptions.unit;
      }
    }

    if(deleteBtn){
      deleteBtn.addEventListener('click', ()=>{
        if(!isEditMode){
          close();
          return;
        }
        const baseId = pref?.id ?? pref?.eventId ?? pref?.uuid ?? pref?.extendedProps?.id ?? pref?.extendedProps?.eventId;
        const seriesId = pref?.seriesId || pref?.extendedProps?.seriesId || null;
        if(!baseId){
          window?.showToast?.('вљ пёЏ Cannot delete task: missing identifier');
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
            }else{
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
            title: pref?.title || ''
          });
          window?.showToast?.('🗑️ Task series deleted');
        }else{
          window.addAuditLog?.('TASK_DELETED', {
            taskId: baseId,
            title: pref?.title || '',
            taskType: pref?.taskType || taskType || 'Task'
          });
          window?.showToast?.('🗑️ Task deleted');
        }

        close();
      });
    }

    // AI Assist (no external key; local heuristic)
    const aiBtn = overlay.querySelector('#mp_ai');
    const aiHint= overlay.querySelector('#mp_ai_hint');
    aiBtn.onclick = ()=>{
      const title = overlay.querySelector('#mp_title').value.trim() || 'Task';
      const catName = (cats.find(x=>x.id===catSel.value)||{}).name || 'General';
      const start = overlay.querySelector('#mp_start').value || '09:00';
      aiHint.textContent = 'ThinkingвЂ¦';
      const draft =
`Auto plan for "${title}".
Category: ${catName}. 
Checklist:
вЂў Preparation & safety checks
вЂў Perform task according to SOP
вЂў Photos / notes of outcomes
вЂў Short report & next steps
Time: start at ${start}.`;
      overlay.querySelector('#mp_desc').value = draft;
      setTimeout(()=> aiHint.textContent='Prefilled. Edit if needed.', 150);
    };

    // clear
    overlay.querySelector('#mp_clear').onclick=()=>{
      overlay.querySelector('#mp_title').value='';
      overlay.querySelector('#mp_desc').value='';
      overlay.querySelectorAll('#mp_sublist .mp-sub').forEach(x=>x.remove());
      addSub();
    };

    // cancel & close
    function escClose(e){ 
      if(e.key==='Escape'){ 
        close(); 
        document.removeEventListener('keydown',escClose); 
      } 
    }
    
    const close = ()=> {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
      // Remove escape listener
      document.removeEventListener('keydown', escClose);
    };
    
    // Close button in header
    const closeBtn = overlay.querySelector('#mp_close_btn');
    if (closeBtn) {
      closeBtn.onclick = close;
    }
    
    // Close on overlay click handled выше (single handler)
    
    document.addEventListener('keydown', escClose);

    // save
    overlay.querySelector('#mp_save').onclick = async ()=>{
      const title = titleInput.value.trim();
      if(!title){ alert('Enter title'); return; }

      const dateStr = dEl.value; // yyyy-mm-dd
      if(!dateStr){ alert('Select a date'); return; }
      const startTime = timeInput.value || '09:00';
      const allDay = allDayCheckbox ? allDayCheckbox.checked : false;
      let startISO, endISO;
      if(allDay) {
        startISO = `${dateStr}T00:00`;
        endISO = `${dateStr}T23:59`;
      } else {
        const [sh,sm] = startTime.split(':').map(n=>parseInt(n,10));
        const endTime = endTimeInput ? (endTimeInput.value || '10:00') : '10:00';
        const [eh,em] = endTime.split(':').map(n=>parseInt(n,10));
        startISO = `${dateStr}T${pad(sh)}:${pad(sm)}`;
        endISO = `${dateStr}T${pad(eh)}:${pad(em)}`;
      }

      const catId = catSel.value || 'other';
      const location = locationInput?.value.trim() || '';
      const desc = descInput?.value.trim() || '';
      const assignee = assigneeSelect?.value || 'unassigned';
      const repeatValue = repeatSel.value;
      const repeatTemplate = repeatTemplates[repeatValue];
      const repeat = normalizeRepeatValue(repeatValue);
      if(repeatTemplate){
        taskType = repeatTemplate.taskType;
      }
      const reminder = reminderSelect?.value || 'none';
      const repeatMonths = parseInt(repeatMonthsInput?.value || '12',10) || 12;

      const subtasks = [...overlay.querySelectorAll('#mp_sublist input')].map(i=>i.value.trim()).filter(Boolean);
      const files = overlay.querySelector('#mp_files').files;

      const baseId = isEditMode ? (pref.id ?? pref.eventId ?? pref.uuid ?? Date.now()) : Date.now();
      const previousSeriesId = pref?.seriesId || null;
      const seriesSeed = isEditMode ? baseId : Date.now();
      const seriesId = repeat!=='none' ? (previousSeriesId || `S${seriesSeed}`) : null;

      let assignedToValue = null;
      if(assignee === 'me'){
        assignedToValue = window.getCurrentUser?.().id || 'me';
      } else if(assignee !== 'unassigned'){
        assignedToValue = assignee;
      }

      const recurOptions = (()=>{
        const mode = repeat;
        
        // Get weekdays from card sections (state.weekdays) - improved UI
        const cardWeekdays = [];
        overlay.querySelectorAll('[data-weekday]').forEach(cb => {
          if(cb.checked){
            const wd = parseInt(cb.getAttribute('data-weekday'), 10);
            if(!isNaN(wd)) cardWeekdays.push(wd);
          }
        });
        
        // Also try old format for compatibility
        const oldWdays = [...overlay.querySelectorAll('[data-wday]')]
          .filter(i=>i.checked)
          .map(i=> Number(i.getAttribute('data-wday')));
        
        const finalWeekdays = cardWeekdays.length > 0 ? cardWeekdays : oldWdays;
        
        if(mode==='weekly' || mode==='biweekly' || mode==='daily'){
          let wdays = finalWeekdays;
          
          // If no weekdays selected and mode is weekly/biweekly, auto-select based on date
          if(wdays.length === 0 && (mode === 'weekly' || mode === 'biweekly') && dEl.value){
            const selectedDate = new Date(dEl.value + 'T00:00:00');
            if(!Number.isNaN(selectedDate.getTime())){
              const dayOfWeek = selectedDate.getDay();
              wdays = [dayOfWeek];
            }
          }
          
          return wdays.length > 0 ? { wdays } : {};
        }
        if(mode==='monthly' || mode==='bimonthly' || mode==='quarterly' || mode==='every4months' || mode==='semiannual' || mode==='every9months' || mode==='every18months' || mode==='yearly' || mode==='every2years' || mode==='every3years'){
          const md = parseInt((overlay.querySelector('#mp_month_day')?.value||''),10);
          if(!isNaN(md) && md > 0) return { monthDay: md };
          // Auto-select day of month from selected date
          if(dEl.value){
            const selectedDate = new Date(dEl.value + 'T00:00:00');
            if(!Number.isNaN(selectedDate.getTime())){
              return { monthDay: selectedDate.getDate() };
            }
          }
          return { monthDay: null };
        }
        if(mode==='custom'){
          const intervalEl = overlay.querySelector('#mp_custom_interval');
          const unitEl = overlay.querySelector('#mp_custom_unit');
          const interval = parseInt(intervalEl?.value || '1', 10);
          const unit = unitEl?.value || 'day';
          return {
            interval: Number.isFinite(interval) && interval > 0 ? interval : 1,
            unit
          };
        }
        return {};
      })();

      const base = {
        id: baseId,
        title,
        start: startISO,
        end: endISO,
        status: pref?.status || 'none',
        catId,
        taskType,
        priority,
        location,
        notes: desc,
        assignedTo: assignedToValue,
        createdBy: pref?.createdBy || window.getCurrentUser?.().id || 'me',
        lastModifiedBy: window.getCurrentUser?.().id || 'me',
        lastModified: new Date().toISOString(),
        subtasks,
        reminder,
        recur: { freq: repeat, months: repeatMonths },
        recurOptions,
        seriesId,
        isAISuggested: pref?.isAISuggested || false
      };

      // Attachments -> add to notes (simple, to avoid file persistence chaos)
      if(files && files.length){
        const names = [...files].map(f=>f.name).join(', ');
        base.notes = (base.notes? base.notes+'\n':'') + `Attachments: ${names}`;
      }

      // Generate series if app provides helper
      let additions = [];
      if(seriesId && typeof window.generateSeries === 'function'){
        try{ additions = window.generateSeries({...base}, repeat, repeatMonths); }catch{}
      }

      const eventsToAdd = [base, ...additions];
      const baseIdStr = String(baseId);

      // 1) React way: setEvents if exists
      if(typeof window.setEvents === 'function'){
        if(isEditMode){
          window.setEvents(prev => {
            const filtered = prev.filter(e=>{
              if(previousSeriesId){
                return e.seriesId !== previousSeriesId;
              }
              return String(e.id) !== baseIdStr;
            });
            return [...filtered, ...eventsToAdd];
          });
          window?.showToast?.('вњ… Task updated');
        } else {
          window.setEvents(prev => [...prev, ...eventsToAdd]);
          window?.showToast?.('вњ… Task saved');
        }
      } else {
        // 2) localStorage fallback
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
        if(isEditMode){
          arr = arr.filter(e=>{
            if(previousSeriesId){
              return e.seriesId !== previousSeriesId;
            }
            return String(e.id) !== baseIdStr;
          });
        }
        arr.push(...eventsToAdd);
        localStorage.setItem(key, JSON.stringify(arr));
        window?.showToast?.(isEditMode ? 'вњ… Task updated' : 'вњ… Task saved');
      }

      // 3) Add to FullCalendar if available
      try{
        const cal = window.calRef?.current || document.getElementById('calendar')?._fullCalendar;
        if(window.calRef?.current){
          if(isEditMode){
            if(previousSeriesId){
              window.calRef.current.getEvents().forEach(ev=>{
                if(ev.extendedProps?.seriesId === previousSeriesId){
                  ev.remove();
                }
              });
            } else {
              const existing = window.calRef.current.getEventById(baseIdStr) || window.calRef.current.getEventById(baseId);
              existing?.remove();
            }
          }
          eventsToAdd.forEach(e=>{
            let s = e.start; 
            if(/^\d{4}-\d{2}-\d{2}$/.test(s)) s+='T09:00';
            if(!s.includes('T')) s += 'T09:00';
            window.calRef.current.addEvent({
              id:String(e.id),
              title:e.title,
              start:s,
              end:e.end,
              allDay:false,
              color: window.statusColor ? window.statusColor(e.status) : undefined,
              backgroundColor: window.statusColor ? window.statusColor(e.status) : undefined,
              borderColor: window.statusColor ? window.statusColor(e.status) : undefined,
              textColor:'#111827',
              extendedProps: {...e}
            });
          });
          // Refresh calendar display
          window.calRef.current.render();
        }
      }catch(e){
        console.error('Failed to add to FullCalendar:', e);
      }

      // audit if available
      if(isEditMode){
        window.addAuditLog?.('TASK_UPDATED', {
          taskId: base.id, title: base.title, taskType: base.taskType,
          category: base.catId, priority: base.priority,
          seriesCount: eventsToAdd.length
        });
      } else {
        window.addAuditLog?.('TASK_CREATED', {
          taskId: base.id, title: base.title, taskType: base.taskType,
          category: base.catId, priority: base.priority,
          seriesCount: eventsToAdd.length
        });
      }

      close();
    };
  };

  // Ensure all existing "Add Task" entry points use the new modal
  // Optional: wire your existing "Add Task" button automatically (if text matches)
  // РЈР±РёСЂР°РµРј РґСѓР±Р»РёСЂРѕРІР°РЅРЅС‹Р№ РѕР±СЂР°Р±РѕС‚С‡РёРє - РёСЃРїРѕР»СЊР·СѓРµРј С‚РѕР»СЊРєРѕ React useEffect
  // window.addEventListener('DOMContentLoaded', ()=>{
  //   const btns=[...document.querySelectorAll('button')];
  //   const add = btns.find(b=>/add task/i.test(b.textContent||''));
  //   if(add && !add.dataset.mpBound){
  //     add.dataset.mpBound='1';
  //     add.addEventListener('click', ()=> window.openAddTaskModal());
  //   }
  // });
})();

