// === MainPro v68.4 – Settings Integrated Dashboard Customizer ===
// Author: Viktor & ChatGPT (MainPro Gold Harmony Edition)

(() => {
  const defaultButtons = [
    { id: "addTask", label: "Add Task", color: "#F5B400", icon: "➕", visible: true, action: "setShowAdd", category: "main" },
    { id: "exportPDF", label: "Export PDF", color: "#2563EB", icon: "📄", visible: true, action: "exportPDF", category: "export" },
    { id: "exportExcel", label: "Export Excel", color: "#16A34A", icon: "📊", visible: true, action: "exportExcel", category: "export" },
    { id: "audit", label: "Audit", color: "#3B82F6", icon: "📋", visible: true, action: "setShowAuditDashboard", category: "analytics" },
    { id: "reports", label: "Reports", color: "#4F46E5", icon: "📈", visible: true, action: "setShowReports", category: "analytics" },
    { id: "aiAnalytics", label: "AI Analytics", color: "#A855F7", icon: "🤖", visible: true, action: "setShowAnalytics", category: "ai" },
    { id: "aiWorkflow", label: "AI Workflow", color: "#0EA5E9", icon: "🧬", visible: true, action: "setWorkflowShow", category: "ai" },
    { id: "documents", label: "Documents", color: "#FACC15", icon: "📁", visible: true, action: "setDmShow", category: "management" },
    { id: "settings", label: "Settings", color: "#6B7280", icon: "⚙️", visible: true, action: "setOpenSettings", category: "system" },
    { id: "team", label: "Team", color: "#8B5CF6", icon: "👥", visible: true, action: "setShowTeamSettings", category: "collaboration" },
    { id: "calendar", label: "Calendar", color: "#10B981", icon: "📅", visible: true, action: "setView", category: "main" },
    { id: "search", label: "Search", color: "#F59E0B", icon: "🔍", visible: true, action: "focusSearch", category: "tools" }
  ];

  let userButtons = JSON.parse(localStorage.getItem("mainpro_custom_buttons")) || defaultButtons.slice();
  let isCustomizeMode = false;

  // === Отрисовка панели ===
  function renderToolbar() {
    const toolbar = document.getElementById("customToolbar");
    if (!toolbar) return;
    toolbar.innerHTML = "";

    userButtons.forEach((btn, index) => {
      if (!btn.visible) return;
      const el = document.createElement("button");
      el.innerText = `${btn.icon} ${btn.label}`;
      el.style.background = btn.color;
      el.className =
        "px-3 py-2 rounded-md text-white font-medium shadow hover:opacity-90 transition-all cursor-pointer";
      el.draggable = isCustomizeMode;
      el.ondragstart = (e) => e.dataTransfer.setData("dragIndex", index);
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => {
        const from = e.dataTransfer.getData("dragIndex");
        const to = index;
        const moved = userButtons.splice(from, 1)[0];
        userButtons.splice(to, 0, moved);
        saveToolbar();
        renderToolbar();
      };
      if (isCustomizeMode) {
        el.onclick = () => openButtonEditor(index);
      } else {
        // Execute the button action when not in customize mode
        el.onclick = () => executeButtonAction(btn);
      }
      toolbar.appendChild(el);
    });
  }

  // === Выполнение действия кнопки ===
  function executeButtonAction(btn) {
    try {
      // Get the MainPro API instance
      const mainProInstance = window.MainPro && window.MainPro();
      
      if (mainProInstance && mainProInstance[btn.action]) {
        if (btn.action === 'exportPDF' || btn.action === 'exportExcel') {
          // Execute export functions
          mainProInstance[btn.action]();
        } else if (btn.action === 'setView') {
          // Special handling for calendar view
          mainProInstance[btn.action]('month');
        } else if (btn.action === 'focusSearch') {
          // Focus search input
          const searchInput = document.querySelector('input[placeholder*="search" i], input[type="search"]');
          if (searchInput) {
            searchInput.focus();
          } else {
            alert('Search functionality not available');
          }
        } else {
          // Execute state setters (pass true to open modals)
          mainProInstance[btn.action](true);
        }
      } else {
        console.warn(`Action ${btn.action} not found in MainPro API`);
        alert(`Button action "${btn.action}" is not available.`);
      }
    } catch (error) {
      console.error('Error executing button action:', error);
      alert('Error executing button action. Please try again.');
    }
  }

  // === Редактирование кнопки ===
  function openButtonEditor(index) {
    const btn = userButtons[index];
    const newLabel = prompt("Button label:", btn.label);
    const newIcon = prompt("Icon (emoji):", btn.icon);
    const newColor = prompt("Button color (hex):", btn.color);
    const visible = confirm("Show this button? (OK=yes / Cancel=no)");

    userButtons[index] = {
      ...btn,
      label: newLabel || btn.label,
      icon: newIcon || btn.icon,
      color: newColor || btn.color,
      visible,
    };
    saveToolbar();
    renderToolbar();
  }

  // === Сохранить изменения ===
  function saveToolbar() {
    localStorage.setItem("mainpro_custom_buttons", JSON.stringify(userButtons));
  }

  // === Включить/выключить режим редактирования ===
  function toggleCustomizeMode() {
    isCustomizeMode = !isCustomizeMode;
    alert(isCustomizeMode ? "🛠️ Customize Mode ON" : "✅ Customize Mode OFF");
    renderToolbar();
  }

  // === Переключить видимость кастомной панели ===
  function toggleCustomizer() {
    const toolbar = document.getElementById("customToolbar");
    if (toolbar) {
      if (toolbar.style.display === 'none' || toolbar.style.display === '') {
        toolbar.style.display = 'flex';
        renderToolbar();
      } else {
        toolbar.style.display = 'none';
      }
    }
  }

  // === Добавить новую кнопку ===
  function addButton() {
    const label = prompt("Button label:");
    if (!label) return;
    
    const icon = prompt("Icon (emoji):", "🔧");
    const color = prompt("Button color (hex):", "#6B7280");
    const category = prompt("Category (main/export/analytics/ai/management/system/collaboration/tools):", "tools");
    
    // Available actions for custom buttons
    const availableActions = [
      "setShowAdd", "exportPDF", "exportExcel", "setShowAuditDashboard", 
      "setShowReports", "setShowAnalytics", "setWorkflowShow", "setDmShow",
      "setOpenSettings", "setShowTeamSettings", "setView", "focusSearch"
    ];
    
    const action = prompt(`Action (${availableActions.join(", ")}):`, "setShowAdd");
    
    const newButton = {
      id: `custom_${Date.now()}`,
      label: label,
      icon: icon || "🔧",
      color: color || "#6B7280",
      visible: true,
      action: availableActions.includes(action) ? action : "setShowAdd",
      category: category || "tools"
    };
    
    userButtons.push(newButton);
    saveToolbar();
    renderToolbar();
  }

  // === Фильтр по категориям ===
  function filterByCategory(category) {
    const toolbar = document.getElementById("customToolbar");
    if (!toolbar) return;
    
    const filteredButtons = userButtons.filter(btn => 
      category === 'all' || btn.category === category
    );
    
    toolbar.innerHTML = "";
    
    filteredButtons.forEach((btn, index) => {
      if (!btn.visible) return;
      const el = document.createElement("button");
      el.innerText = `${btn.icon} ${btn.label}`;
      el.style.background = btn.color;
      el.className = "px-3 py-2 rounded-md text-white font-medium shadow hover:opacity-90 transition-all cursor-pointer";
      el.draggable = isCustomizeMode;
      el.ondragstart = (e) => e.dataTransfer.setData("dragIndex", index);
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => {
        const from = e.dataTransfer.getData("dragIndex");
        const to = index;
        const moved = userButtons.splice(from, 1)[0];
        userButtons.splice(to, 0, moved);
        saveToolbar();
        renderToolbar();
      };
      if (isCustomizeMode) {
        el.onclick = () => openButtonEditor(index);
      } else {
        el.onclick = () => executeButtonAction(btn);
      }
      toolbar.appendChild(el);
    });
  }

  // === Изменить размер кнопок ===
  function changeButtonSize(size) {
    const toolbar = document.getElementById("customToolbar");
    if (!toolbar) return;
    
    const buttons = toolbar.querySelectorAll("button");
    buttons.forEach(btn => {
      if (size === 'small') {
        btn.className = "px-2 py-1 rounded text-xs text-white font-medium shadow hover:opacity-90 transition-all cursor-pointer";
      } else if (size === 'large') {
        btn.className = "px-4 py-3 rounded-lg text-lg text-white font-medium shadow hover:opacity-90 transition-all cursor-pointer";
      } else {
        btn.className = "px-3 py-2 rounded-md text-sm text-white font-medium shadow hover:opacity-90 transition-all cursor-pointer";
      }
    });
  }

  // === Изменить расположение панели ===
  function changeToolbarPosition(position) {
    const toolbar = document.getElementById("customToolbar");
    if (!toolbar) return;
    
    toolbar.className = toolbar.className.replace(/justify-\w+/, '');
    
    if (position === 'left') {
      toolbar.className += ' justify-start';
    } else if (position === 'right') {
      toolbar.className += ' justify-end';
    } else if (position === 'center') {
      toolbar.className += ' justify-center';
    } else {
      toolbar.className += ' justify-between';
    }
  }

  // === Экспорт конфигурации ===
  function exportConfiguration() {
    try {
      const config = {
        buttons: userButtons,
        timestamp: new Date().toISOString(),
        version: 'v68.4'
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mainpro-customizer-config.json';
      a.click();
      URL.revokeObjectURL(url);
      
      alert('Configuration exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }

  // === Импорт конфигурации ===
  function importConfiguration() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          if (config.buttons && Array.isArray(config.buttons)) {
            userButtons = config.buttons;
            saveToolbar();
            renderToolbar();
            alert('Configuration imported successfully!');
          } else {
            alert('Invalid configuration file.');
          }
        } catch (error) {
          console.error('Import failed:', error);
          alert('Import failed. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // === Удалить кнопку ===
  function removeButton(index) {
    if (confirm("Remove this button?")) {
      userButtons.splice(index, 1);
      saveToolbar();
      renderToolbar();
    }
  }

  // === Экспорт в глобальную область ===
  window.MainProCustomizer = {
    toggleCustomizer,
    renderToolbar,
    openButtonEditor,
    addButton,
    removeButton,
    saveToolbar,
    toggleCustomizeMode,
    filterByCategory,
    changeButtonSize,
    changeToolbarPosition,
    exportConfiguration,
    importConfiguration,
    executeButtonAction
  };

  // === Запуск при загрузке ===
  document.addEventListener("DOMContentLoaded", () => {
    // Ждем, пока MainPro загрузится
    setTimeout(() => {
      renderToolbar();
    }, 1000);
  });
})();
