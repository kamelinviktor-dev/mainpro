// === MainPro v68.4 – Settings Integrated Dashboard Customizer ===
// Author: Viktor & ChatGPT (MainPro Gold Harmony Edition)

(() => {
  const defaultButtons = [
    { id: "addTask", label: "Add Task", color: "#F5B400", icon: "➕", visible: true, action: "setShowAdd" },
    { id: "exportPDF", label: "Export PDF", color: "#2563EB", icon: "📄", visible: true, action: "exportPDF" },
    { id: "exportExcel", label: "Export Excel", color: "#16A34A", icon: "📊", visible: true, action: "exportExcel" },
    { id: "audit", label: "Audit", color: "#3B82F6", icon: "📋", visible: true, action: "setShowAuditDashboard" },
    { id: "reports", label: "Reports", color: "#4F46E5", icon: "📈", visible: true, action: "setShowReports" },
    { id: "aiAnalytics", label: "AI Analytics", color: "#A855F7", icon: "🤖", visible: true, action: "setShowAnalytics" },
    { id: "aiWorkflow", label: "AI Workflow", color: "#0EA5E9", icon: "🧬", visible: true, action: "setWorkflowShow" },
    { id: "documents", label: "Documents", color: "#FACC15", icon: "📁", visible: true, action: "setDmShow" }
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
    
    const newButton = {
      id: `custom_${Date.now()}`,
      label: label,
      icon: icon || "🔧",
      color: color || "#6B7280",
      visible: true,
      action: "customAction"
    };
    
    userButtons.push(newButton);
    saveToolbar();
    renderToolbar();
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
    toggleCustomizeMode
  };

  // === Запуск при загрузке ===
  document.addEventListener("DOMContentLoaded", () => {
    // Ждем, пока MainPro загрузится
    setTimeout(() => {
      renderToolbar();
    }, 1000);
  });
})();
