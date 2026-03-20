// STABILITY LOCK: recurrence-only changes

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
        <header class="mp-head">
          <h2 class="mp-title"><span class="mp-dot" aria-hidden="true"></span><span id="mp_modal_title">Add Task</span></h2>
          <button type="button" class="mp-close tooltip-bottom" id="mp_close_btn" aria-label="Close" data-tooltip="Close">×</button>
        </header>

        <div class="mp-body">
          <section class="mp-section">
            <div class="mp-field mp-field-hero">
              <label class="mp-label" for="mp_title">Task title</label>
              <input class="mp-input mp-input-hero" id="mp_title" placeholder="What needs to be done?" value="${(pref.title||'').replace(/"/g,'&quot;')}">
            </div>
            <div class="mp-date-time-block">
              <div class="mp-date-time-labels">
                <label class="mp-label" for="mp_date">Date</label>
                <div class="mp-label-row">
                  <label class="mp-label" for="mp_start">Time</label>
                  <label class="mp-check-wrap"><input type="checkbox" id="mp_all_day"> All day</label>
                </div>
              </div>
              <div class="mp-date-time-line">
                <input class="mp-input mp-input-equal" type="date" id="mp_date">
                <div class="mp-time-inline" id="mp_time_container">
                  <span class="mp-time-sep">–</span>
                  <input class="mp-input mp-input-equal" type="time" id="mp_start" value="${pref.time||'09:00'}">
                  <input class="mp-input mp-input-equal" type="time" id="mp_end" value="${pref.endTime||pref.end||''}">
                </div>
              </div>
              <div class="mp-date-time-extra">
                <div class="mp-mini" id="mp_date_info"></div>
                <div class="mp-quick-time">
                  <button type="button" class="mp-pill" onclick="quickTime('30')">30m</button>
                  <button type="button" class="mp-pill" onclick="quickTime('60')">1h</button>
                  <button type="button" class="mp-pill" onclick="quickTime('90')">1.5h</button>
                  <button type="button" class="mp-pill" onclick="quickTime('120')">2h</button>
                  <button type="button" class="mp-pill" onclick="quickTime('180')">3h</button>
                </div>
              </div>
            </div>
          </section>

          <section class="mp-section">
            <h3 class="mp-section-title">Details</h3>
            <div class="mp-row">
              <div class="mp-field">
                <label class="mp-label" for="mp_cat">Category</label>
                <div class="mp-inline mp-field-inline">
                  <select class="mp-select" id="mp_cat"></select>
                  <button type="button" class="mp-btn mp-btn-ghost mp-btn-icon" id="mp_cat_new" title="New category">+ New</button>
                </div>
              </div>
              <div class="mp-field">
                <label class="mp-label">Priority</label>
                <div class="mp-pri" id="mp_pris">
                  <button type="button" class="mp-chip" data-val="none">None</button>
                  <button type="button" class="mp-chip" data-val="low">Low</button>
                  <button type="button" class="mp-chip" data-val="normal" data-active="1">Normal</button>
                  <button type="button" class="mp-chip" data-val="high">High</button>
                </div>
              </div>
            </div>
            <div class="mp-row">
              <div class="mp-field">
                <label class="mp-label" for="mp_loc">Location</label>
                <input class="mp-input" id="mp_loc" placeholder="Room / Area">
              </div>
              <div class="mp-field">
                <label class="mp-label" for="mp_assignee">Assignee</label>
                <select class="mp-select" id="mp_assignee">
                  <option value="me">Me</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>
          </section>

          <section class="mp-section">
            <h3 class="mp-section-title">Notes</h3>
            <div class="mp-field">
              <textarea class="mp-textarea" id="mp_desc" placeholder="Steps, acceptance criteria, links…"></textarea>
              <div class="mp-field-actions">
                <button type="button" class="mp-btn mp-btn-ghost mp-btn-sm" id="mp_ai">✨ AI Assist</button>
                <span class="mp-mini" id="mp_ai_hint"></span>
              </div>
            </div>
          </section>

          <section class="mp-section">
            <div class="mp-field">
              <label class="mp-label">Subtasks</label>
              <div class="mp-sublist" id="mp_sublist"></div>
              <button type="button" class="mp-btn mp-btn-ghost mp-btn-sm" id="mp_add_sub">+ Add subtask</button>
            </div>
          </section>

          <section class="mp-section mp-section-schedule">
            <h3 class="mp-section-title">Schedule & reminder</h3>

            <div class="mp-row">
              <div class="mp-field">
                <label class="mp-label" for="mp_repeat">Repeat</label>
                <div class="mp-inline mp-field-inline">
                  <select class="mp-select" id="mp_repeat">
                    <option value="none" selected>No repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                    <option value="bimonthly">Every 2 months</option>
                    <option value="quarterly">Every 3 months</option>
                    <option value="yearly">Yearly</option>
                    <option value="internal_daily">Internal — daily</option>
                    <option value="internal_weekly">Internal — weekly</option>
                    <option value="internal_monthly">Internal — monthly</option>
                    <option value="contractor_weekly">Contractor — weekly</option>
                    <option value="contractor_monthly">Contractor — monthly</option>
                    <option value="meeting_weekly">Meetings — weekly</option>
                    <option value="meeting_monthly">Meetings — monthly</option>
                    <option value="custom">Custom…</option>
                  </select>
                  <button type="button" class="mp-btn mp-btn-ghost mp-btn-icon" id="mp_repeat_templates_btn" title="Templates">Templates</button>
                </div>
                <div class="mp-template-panel" id="mp_repeat_templates" style="display:none;">
                  <div class="mp-template-grid" id="mp_repeat_templates_list"></div>
                </div>
                <div class="mp-repeat-opts" id="mp_repeat_opts" style="display:none">
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
                <div class="mp-mini" style="margin-bottom:6px">Monthly pattern</div>
                <select class="mp-select" id="mp_monthly_pattern" style="width:100%; margin-bottom:6px">
                  <option value="dayOfMonth">On day of month</option>
                  <option value="nthWeekday">On the nth weekday</option>
                  <option value="lastDay">Last day of month</option>
                </select>
                <div id="mp_monthly_day_row" class="mp-row" style="gap:8px; align-items:center">
                  <span class="mp-mini">Day</span>
                  <input class="mp-input" id="mp_month_day" type="number" min="1" max="31" style="width:60px" />
                </div>
                <div id="mp_monthly_nth_row" class="mp-row" style="gap:8px; align-items:center; display:none">
                  <select class="mp-select" id="mp_monthly_nth" style="width:90px"><option value="1">1st</option><option value="2">2nd</option><option value="3">3rd</option><option value="4">4th</option><option value="-1">Last</option></select>
                  <select class="mp-select" id="mp_monthly_weekday" style="width:100px"><option value="1">Mon</option><option value="2">Tue</option><option value="3">Wed</option><option value="4">Thu</option><option value="5">Fri</option><option value="6">Sat</option><option value="7">Sun</option></select>
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
              <div class="mp-mini" style="margin-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span>Repeat ends:</span>
                <select class="mp-select" id="mp_repeat_end_type" style="width:auto;">
                  <option value="never">Never</option>
                  <option value="count">After N occurrences</option>
                  <option value="until">On date</option>
                </select>
                <span id="mp_repeat_end_count_wrap" style="display:none">After</span>
                <input class="mp-input" id="mp_repeat_end_count" type="number" min="1" max="999" value="10" style="width:60px; display:none" />
                <span id="mp_repeat_end_count_label" style="display:none">occurrences</span>
                <input class="mp-input" id="mp_repeat_end_date" type="date" style="width:140px; display:none" />
              </div>
              <div class="mp-mini" style="margin-top:6px; color:var(--mp-muted);" id="mp_recur_preview">Preview: —</div>
                </div>
              </div>
              <div class="mp-field">
                <label class="mp-label" for="mp_rem">Reminder</label>
                <select class="mp-select" id="mp_rem">
                  <option value="none" selected>None</option>
                  <option value="5">5 min before</option>
                  <option value="15">15 min before</option>
                  <option value="30">30 min before</option>
                  <option value="60">1 hour before</option>
                  <option value="1440">1 day before</option>
                </select>
              </div>
            </div>
          </section>

          <section class="mp-section mp-section-attach">
            <label class="mp-label" for="mp_files">Attachments</label>
            <input class="mp-input mp-input-file" type="file" id="mp_files" multiple accept="image/*,.pdf,.doc,.docx">
          </section>
        </div>

        <footer class="mp-footer">
          <div class="mp-footer-left">
            <button type="button" class="mp-btn mp-btn-danger-outline" id="mp_delete">Delete</button>
            <button type="button" class="mp-btn mp-btn-ghost" id="mp_clear">Clear</button>
          </div>
          <div class="mp-footer-right">
            <button type="button" class="mp-btn mp-btn-ghost" id="mp_cancel">Cancel</button>
            <button type="button" class="mp-btn mp-btn-primary" id="mp_save">Save Task</button>
          </div>
        </footer>
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
    const monthlyPatternSel = overlay.querySelector('#mp_monthly_pattern');
    const monthlyNthSel = overlay.querySelector('#mp_monthly_nth');
    const monthlyWeekdaySel = overlay.querySelector('#mp_monthly_weekday');
    const monthlyDayRow = overlay.querySelector('#mp_monthly_day_row');
    const monthlyNthRow = overlay.querySelector('#mp_monthly_nth_row');
    const repeatEndTypeSel = overlay.querySelector('#mp_repeat_end_type');
    const repeatEndCountInput = overlay.querySelector('#mp_repeat_end_count');
    const repeatEndCountWrap = overlay.querySelector('#mp_repeat_end_count_wrap');
    const repeatEndCountLabel = overlay.querySelector('#mp_repeat_end_count_label');
    const repeatEndDateInput = overlay.querySelector('#mp_repeat_end_date');
    const recurPreviewEl = overlay.querySelector('#mp_recur_preview');
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
      const isMonthly = (mode==='monthly'||mode==='bimonthly'||mode==='quarterly'||mode==='yearly');
      repeatBox.style.display = (mode==='weekly'||mode==='biweekly'||mode==='monthly'||mode==='bimonthly'||mode==='quarterly'||mode==='yearly'||mode==='custom') ? '' : 'none';
      weeklyBox.style.display = (mode==='weekly'||mode==='biweekly') ? '' : 'none';
      monthlyBox.style.display = isMonthly ? '' : 'none';
      customBox.style.display = (mode==='custom') ? '' : 'none';
      if(monthlyDayRow) monthlyDayRow.style.display = (monthlyPatternSel&&monthlyPatternSel.value==='dayOfMonth') ? '' : 'none';
      if(monthlyNthRow) monthlyNthRow.style.display = (monthlyPatternSel&&monthlyPatternSel.value==='nthWeekday') ? '' : 'none';
      if(repeatEndTypeSel){
        const endType = repeatEndTypeSel.value;
        if(repeatEndCountWrap) repeatEndCountWrap.style.display = endType==='count' ? '' : 'none';
        if(repeatEndCountInput) repeatEndCountInput.style.display = endType==='count' ? '' : 'none';
        if(repeatEndCountLabel) repeatEndCountLabel.style.display = endType==='count' ? '' : 'none';
        if(repeatEndDateInput) repeatEndDateInput.style.display = endType==='until' ? '' : 'none';
      }
      if(mode==='weekly'||mode==='biweekly'){
        const checks = overlay.querySelectorAll('[data-wday]');
        const anyChecked = Array.from(checks).some(c=>c.checked);
        if(!anyChecked){
          const dateStr = overlay.querySelector('#mp_date')?.value;
          const d = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
          const w = d.getDay();
          checks.forEach(c=>{ c.checked = Number(c.getAttribute('data-wday'))===w; });
        }
      }
      if(isMonthly){
        if(!monthDayInput.value){
          const dateStr = overlay.querySelector('#mp_date')?.value;
          const d = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
          monthDayInput.value = String(d.getDate());
        }
        if(monthlyPatternSel&&monthlyPatternSel.value==='nthWeekday'&&monthlyWeekdaySel){
          const dateStr = overlay.querySelector('#mp_date')?.value;
          const d = dateStr ? new Date(dateStr+'T00:00:00') : new Date();
          const w = (d.getDay()+6)%7+1;
          if(!monthlyWeekdaySel.value) monthlyWeekdaySel.value = String(w);
        }
      }
      if(mode==='custom'){
        if(!customIntervalInput.value || Number(customIntervalInput.value) < 1) customIntervalInput.value = '1';
        if(!customUnitSelect.value) customUnitSelect.value = 'day';
      }
      updateRecurPreview();
    }
    function updateRecurPreview(){
      if(!recurPreviewEl) return;
      const mode = normalizeRepeatValue(repeatSel.value);
      if(mode==='none'){ recurPreviewEl.textContent = 'Preview in view: —'; return; }
      const dateStr = overlay.querySelector('#mp_date')?.value;
      const timeStr = overlay.querySelector('#mp_time')?.value || '09:00';
      if(!dateStr){ recurPreviewEl.textContent = 'Preview in view: —'; return; }
      const startISO = dateStr + 'T' + (timeStr.length===5 ? timeStr : '09:00');
      const base = { start: startISO, seriesId: 'preview', recur: buildRecurFromForm(), recurOptions: buildRecurOptionsFromForm() };
      if(typeof window.getRecurrencePreview === 'function'){
        const n = window.getRecurrencePreview(base);
        recurPreviewEl.textContent = 'Preview in view: ' + n + ' occurrence' + (n!==1?'s':'');
      } else {
        recurPreviewEl.textContent = 'Preview in view: —';
      }
    }
    function buildRecurOptionsFromForm(){
      const mode = normalizeRepeatValue(repeatSel.value);
      const wdays = [];
      overlay.querySelectorAll('[data-wday]').forEach(c=>{ if(c.checked) wdays.push(Number(c.getAttribute('data-wday'))===0 ? 7 : Number(c.getAttribute('data-wday'))); });
      if(mode==='monthly'||mode==='bimonthly'||mode==='quarterly'||mode==='yearly'){
        const pattern = monthlyPatternSel ? monthlyPatternSel.value : 'dayOfMonth';
        let monthDay = parseInt(monthDayInput?.value||'1',10); if(monthDay<1||monthDay>31) monthDay = 1;
        const nth = monthlyNthSel ? parseInt(monthlyNthSel.value,10) : 1;
        const weekday = monthlyWeekdaySel ? parseInt(monthlyWeekdaySel.value,10) : 1;
        return { monthDay, nth, weekday, monthlyMode: pattern };
      }
      if(mode==='weekly'||mode==='biweekly') return wdays.length ? { wdays } : {};
      if(mode==='custom') return { interval: parseInt(customIntervalInput?.value||'1',10)||1, unit: customUnitSelect?.value||'day' };
      return {};
    }
    function buildRecurFromForm(){
      const mode = normalizeRepeatValue(repeatSel.value);
      if(mode==='none') return { freq: 'none', interval: 1, end: { type: 'never' }, exceptions: [] };
      const intervalMap = { monthly:1, bimonthly:2, quarterly:3, yearly:12 };
      const interval = intervalMap[mode] || 1;
      const endType = repeatEndTypeSel ? repeatEndTypeSel.value : 'never';
      const end = { type: endType };
      if(endType==='count') end.count = Math.max(1, parseInt(repeatEndCountInput?.value||'10',10));
      if(endType==='until' && repeatEndDateInput?.value) end.until = repeatEndDateInput.value.slice(0,10);
      const opts = buildRecurOptionsFromForm();
      const recur = { freq: (mode==='weekly'||mode==='biweekly') ? 'weekly' : (mode==='daily' ? 'daily' : 'monthly'), interval: (mode==='biweekly' ? 2 : (mode==='weekly'?1:interval)), end, exceptions: [] };
      if(recur.freq==='weekly') recur.byWeekday = opts.wdays && opts.wdays.length ? opts.wdays : [(new Date(overlay.querySelector('#mp_date')?.value||new Date()).getDay()+6)%7+1];
      if(recur.freq==='monthly'){ recur.monthlyMode = opts.monthlyMode||'dayOfMonth'; recur.monthDay = opts.monthDay||1; recur.nth = opts.nth||1; recur.weekday = opts.weekday||1; }
      return recur;
    }
    repeatSel.addEventListener('change', ()=>{ updateRepeatUI(); const tpl = repeatTemplates[repeatSel.value]; if(tpl) taskType = tpl.taskType; updateTemplateActive(); if(templatePanel) templatePanel.style.display = 'none'; });
    monthlyPatternSel?.addEventListener('change', updateRepeatUI);
    repeatEndTypeSel?.addEventListener('change', updateRepeatUI);
    [monthDayInput, monthlyNthSel, monthlyWeekdaySel, repeatEndCountInput, repeatEndDateInput].forEach(el=> el?.addEventListener('change', updateRecurPreview));
    overlay.querySelector('#mp_date')?.addEventListener('change', updateRecurPreview);
    overlay.querySelector('#mp_time')?.addEventListener('change', updateRecurPreview);
    updateRepeatUI();
    updateTemplateActive();

    // populate categories (from your app if present)
    const catSel = overlay.querySelector('#mp_cat');
    const cats = (window.categories && Array.isArray(window.categories) && window.categories.length)
      ? window.categories
      : [{id:'maintenance',name:'Maintenance',color:'#f59e0b'},{id:'compliance',name:'Compliance',color:'#38bdf8'},{id:'other',name:'Other',color:'#6b7280'}];
    cats.forEach(c=>{
      const opt=document.createElement('option');
      opt.value=c.id; opt.textContent=c.name||c.id;
      catSel.appendChild(opt);
    });
    // Category: only select value. Saved at submit from #mp_cat.value (see save handler).
    const catId = pref.catId || pref.category || 'other';
    if(catId && Array.from(catSel.options).some(o=>o.value===catId)){ catSel.value = catId; }
    else { catSel.value = 'other'; }

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
        if (typeof window.setCategories === 'function') window.setCategories(function(prev){ return [...(prev||[]), item]; });
      }
      const opt=document.createElement('option'); opt.value=id; opt.textContent=name;
      catSel.appendChild(opt); catSel.value=id;
      window?.showToast?.(`📁 Category "${name}" added`);
    };

    if(saveBtn){
      saveBtn.textContent = isEditMode ? 'Update Task' : 'Save Task';
    }
    const modalTitleEl = overlay.querySelector('#mp_modal_title');
    if (modalTitleEl) modalTitleEl.textContent = isEditMode ? 'Edit Task' : 'Add Task';
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
      const r = pref.recur;
      if(r.freq){
        if(r.freq==='monthly' && r.interval===2) repeatSel.value = 'bimonthly';
        else if(r.freq==='monthly' && r.interval===3) repeatSel.value = 'quarterly';
        else if(r.freq==='monthly' && r.interval===12) repeatSel.value = 'yearly';
        else if(r.freq==='weekly' && r.interval===2) repeatSel.value = 'biweekly';
        else repeatSel.value = r.freq;
      }
      if(monthlyPatternSel && r.monthlyMode) monthlyPatternSel.value = r.monthlyMode;
      if(monthlyNthSel && r.nth != null) monthlyNthSel.value = String(r.nth);
      if(monthlyWeekdaySel && r.weekday != null) monthlyWeekdaySel.value = String(r.weekday);
      if(monthDayInput && r.monthDay != null) monthDayInput.value = String(r.monthDay);
      if(repeatEndTypeSel){
        if(r.end && r.end.type) repeatEndTypeSel.value = r.end.type;
        else if(r.repeatEndDate) repeatEndTypeSel.value = 'until';
        else if(r.repeatEndMonths != null) repeatEndTypeSel.value = 'until';
        else repeatEndTypeSel.value = 'never';
      }
      if(repeatEndCountInput && r.end && r.end.count != null) repeatEndCountInput.value = String(r.end.count);
      if(repeatEndDateInput && (r.end?.until || r.repeatEndDate)) repeatEndDateInput.value = (r.end?.until || r.repeatEndDate).slice(0,10);
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
          cb.checked = pref.recurOptions.wdays.includes(val) || (val === 0 && pref.recurOptions.wdays.includes(7));
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

        const baseIdStr = String(baseId);
        const dateFromForm = overlay.querySelector('#mp_date')?.value || null;
        let occurrenceStart = dateFromForm || pref?.start || pref?.date || null;
        if (occurrenceStart != null && occurrenceStart !== '') {
          const v = String(occurrenceStart).trim();
          if (v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v)) occurrenceStart = v.slice(0, 10);
          else {
            const d = new Date(occurrenceStart);
            if (!isNaN(d.getTime())) occurrenceStart = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          }
        }
        const hasSeries = !!seriesId;

        // Показать окно выбора с кнопками (MainPro): только это / вся серия
        if(typeof window.showDeleteChoiceModal === 'function'){
          try{
            if(typeof window.mainproQueueUndoDeleteOne === 'function' && Array.isArray(window.MainProEvents)){
              const idx = window.MainProEvents.findIndex(e => String(e.id) === baseIdStr);
              const evDel = idx >= 0 ? window.MainProEvents[idx] : null;
              if(evDel) window.mainproQueueUndoDeleteOne(evDel, idx);
            }
          }catch(e){}
          window.showDeleteChoiceModal(baseIdStr, occurrenceStart, hasSeries, (scope)=>{
            if(scope === 'all'){
              window.addAuditLog?.('TASK_SERIES_DELETED', { seriesId, taskId: baseId, title: pref?.title || '' });
              window?.showToast?.('🗑️ Task series deleted');
            }else{
              window.addAuditLog?.('TASK_DELETED', { taskId: baseId, title: pref?.title || '', taskType: pref?.taskType || taskType || 'Task' });
              window?.showToast?.('🗑️ Task deleted');
            }
            close();
          });
          return;
        }

        // Fallback: confirm + deleteEvent
        let deleteSeries = false;
        if(seriesId){
          const onlyThis = confirm('Delete ONLY this task?\nOK = only this task, Cancel = choose series delete');
          if(!onlyThis){
            if(!confirm('Delete ENTIRE series?\nThis may remove MANY tasks.')) return;
            deleteSeries = true;
          }
        } else {
          if(!confirm('Delete this task?')) return;
        }

        if(typeof window.deleteEvent === 'function'){
          try{
            if(!deleteSeries && typeof window.mainproQueueUndoDeleteOne === 'function' && Array.isArray(window.MainProEvents)){
              const idx = window.MainProEvents.findIndex(e => String(e.id) === baseIdStr);
              const evDel = idx >= 0 ? window.MainProEvents[idx] : null;
              if(evDel) window.mainproQueueUndoDeleteOne(evDel, idx);
            }
          }catch{}
          const scope = deleteSeries ? 'all' : 'one';
          if(window.deleteEvent(baseIdStr, scope, occurrenceStart, true)){
            if(deleteSeries){
              window.addAuditLog?.('TASK_SERIES_DELETED', { seriesId, taskId: baseId, title: pref?.title || '' });
              window?.showToast?.('🗑️ Task series deleted');
            }else{
              window.addAuditLog?.('TASK_DELETED', { taskId: baseId, title: pref?.title || '', taskType: pref?.taskType || taskType || 'Task' });
              window?.showToast?.('🗑️ Task deleted');
            }
          }
          close();
          return;
        }

        // Fallback when deleteEvent not available
        try{
          if(!deleteSeries && typeof window.mainproQueueUndoDeleteOne === 'function' && Array.isArray(window.MainProEvents)){
            const idx = window.MainProEvents.findIndex(e => String(e.id) === baseIdStr);
            const evDel = idx >= 0 ? window.MainProEvents[idx] : null;
            if(evDel) window.mainproQueueUndoDeleteOne(evDel, idx);
          }
        }catch{}

        if(typeof window.setEvents === 'function'){
          window.setEvents(prev => {
            if(!Array.isArray(prev)) return prev;
            if(deleteSeries && seriesId){
              return prev.filter(e => String(e.seriesId || '') !== String(seriesId) && String(e.id) !== baseIdStr);
            }
            return prev.filter(e => String(e.id) !== baseIdStr);
          });
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
          try{
            if(!deleteSeries && typeof window.mainproQueueUndoDeleteOne === 'function'){
              const idx = arr.findIndex(e => String(e.id) === baseIdStr);
              const evDel = idx >= 0 ? arr[idx] : null;
              if(evDel) window.mainproQueueUndoDeleteOne(evDel, idx);
            }
          }catch{}
          arr = deleteSeries && seriesId
            ? arr.filter(e => String(e.seriesId || '') !== String(seriesId) && String(e.id) !== baseIdStr)
            : arr.filter(e => String(e.id) !== baseIdStr);
          localStorage.setItem(key, JSON.stringify(arr));
        }catch(err){
          console.error('Failed to update localStorage after delete:', err);
        }

        if(Array.isArray(window.MainProEvents)){
          window.MainProEvents = deleteSeries && seriesId
            ? window.MainProEvents.filter(e => String(e.seriesId || '') !== String(seriesId) && String(e.id) !== baseIdStr)
            : window.MainProEvents.filter(e => String(e.id) !== baseIdStr);
        }

        try{
          const cal = window.calRef?.current;
          if(cal){
            if(deleteSeries && seriesId){
              cal.getEvents().forEach(ev=>{
                if(String(ev.extendedProps?.seriesId || '') === String(seriesId)) ev.remove();
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
    if (closeBtn) closeBtn.onclick = close;
    const cancelBtn = overlay.querySelector('#mp_cancel');
    if (cancelBtn) cancelBtn.onclick = close;

    // Close on overlay click handled выше (single handler)
    
    document.addEventListener('keydown', escClose);

    // save
    overlay.querySelector('#mp_save').onclick = async ()=>{
      // Category: single source — value of #mp_cat at save time
      var catSelEl = overlay.querySelector('#mp_cat');
      var catIdToSave = (catSelEl && catSelEl.value && String(catSelEl.value).trim()) ? String(catSelEl.value).trim() : 'other';

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
        catId: catIdToSave,
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
        recur: (repeat!=='none' ? buildRecurFromForm() : { freq: 'none', interval: 1, end: { type: 'never' }, exceptions: [] }),
        recurOptions: (repeat!=='none' ? buildRecurOptionsFromForm() : {}),
        seriesId,
        isAISuggested: pref?.isAISuggested || false
      };

      // Attachments -> add to notes (simple, to avoid file persistence chaos)
      if(files && files.length){
        const names = [...files].map(f=>f.name).join(', ');
        base.notes = (base.notes? base.notes+'\n':'') + `Attachments: ${names}`;
      }

      const eventsToAdd = [base];
      const baseIdStr = String(baseId);
      var originalOccurrenceDate = (pref.start && String(pref.start).length >= 10) ? String(pref.start).slice(0, 10) : '';

      if(typeof window.setEvents === 'function'){
        if(isEditMode){
          window.setEvents(prev => {
            var list = Array.isArray(prev) ? prev : [];
            var next;
            var isEditingOneOccurrence = previousSeriesId && originalOccurrenceDate;
            if (isEditingOneOccurrence) {
              var baseEvent = list.find(function(e){ return String(e.seriesId) === String(previousSeriesId) || String(e.id) === baseIdStr; });
              if (baseEvent) {
                var exceptions = Array.isArray(baseEvent.recur && baseEvent.recur.exceptions) ? baseEvent.recur.exceptions.slice() : [];
                if (exceptions.indexOf(originalOccurrenceDate) === -1) exceptions.push(originalOccurrenceDate);
                var updatedBase = Object.assign({}, baseEvent, { recur: Object.assign({}, baseEvent.recur || {}, { exceptions: exceptions }) });
                var singleTask = Object.assign({}, base, {
                  id: baseIdStr + '-ex-' + originalOccurrenceDate,
                  seriesId: null,
                  catId: catIdToSave,
                  start: startISO,
                  end: endISO,
                  recur: { freq: 'none', interval: 1, end: { type: 'never' }, exceptions: [] },
                  recurOptions: {}
                });
                next = list.map(function(e){
                  if (String(e.id) === String(baseEvent.id)) return updatedBase;
                  return e;
                });
                next.push(singleTask);
              } else {
                next = list.map(function(e){ return String(e.id) !== baseIdStr ? e : base; });
                if (!list.some(function(e){ return String(e.id) === baseIdStr; })) next = next.concat(eventsToAdd);
              }
            } else {
              next = list.map(function(e){
                if (String(e.id) !== baseIdStr) return e;
                return base;
              });
              if (!list.some(function(e){ return String(e.id) === baseIdStr; })) next = next.concat(eventsToAdd);
            }
            if (window.eventsRef) window.eventsRef.current = next;
            if (typeof window.refreshCalendar === 'function') window.refreshCalendar(next);
            return next;
          });
          window?.showToast?.('Task updated');
        } else {
          window.setEvents(prev => {
            var list = Array.isArray(prev) ? prev : [];
            var next = list.concat(eventsToAdd);
            if (window.eventsRef) window.eventsRef.current = next;
            if (typeof window.refreshCalendar === 'function') window.refreshCalendar(next);
            return next;
          });
          window?.showToast?.('Task saved');
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

      // 3) FullCalendar already updated via refreshCalendar(next) above when using setEvents
      if (typeof window.setEvents !== 'function') {
        try{
          if(window.calRef?.current){
            if(isEditMode){
              const existing = window.calRef.current.getEventById(baseIdStr) || window.calRef.current.getEventById(baseId);
              existing?.remove();
            }
            eventsToAdd.forEach(e=>{
              var s = e.start;
              if(/^\d{4}-\d{2}-\d{2}$/.test(s)) s+='T09:00';
              if(!s || !s.includes('T')) s = (s || '').slice(0,10) + 'T09:00';
              window.calRef.current.addEvent({
                id: String(e.id),
                title: e.title,
                start: s,
                end: e.end || s,
                allDay: false,
                extendedProps: e
              });
            });
            window.calRef.current.render();
          }
        }catch(err){
          console.error('FullCalendar fallback:', err);
        }
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

