// Add Task v74 wrapper (extracted from MAINPRO-MAIN.html)
(function(){
  const legacyAddTask = window.openAddTaskModal;
  function normalizePref(pref){
    if(!pref || typeof pref !== 'object') return {};
    const cfg = {...pref};
    if(pref.date && pref.time && !pref.start){
      cfg.start = `${pref.date}T${pref.time}`;
    }
    if(pref.recur && !cfg.recur){
      cfg.recur = {...pref.recur};
    } else if(pref.recurFreq){
      cfg.recur = { freq: pref.recurFreq, months: pref.recurMonths || 12 };
    }
    cfg._seriesScope = pref?._seriesScope || cfg._seriesScope || 'one';
    return cfg;
  }
  window.openAddTaskModal = function(pref = {}){
    const cfg = normalizePref(pref);
    // Prefer legacy Add Task UI (mainpro-addtask-ui-v74) to avoid recursion with openTaskModal
    if (typeof legacyAddTask === 'function'){
      legacyAddTask(cfg);
    } else if(typeof window.openTaskModal === 'function'){
      window.openTaskModal(cfg);
    } else {
      console.warn('Task modal not available yet.');
      alert('Task form is still loading. Please try again shortly.');
    }
  };
})();
