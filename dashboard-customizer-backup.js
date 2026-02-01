// === MainPro Dashboard Customizer Module ===
// Author: AI Assistant for MainPro Gold Harmony Edition
// Version: 1.0.0

(() => {
  'use strict';

  // === Configuration ===
  const CONFIG = {
    localStorageKey: 'mainpro_custom_buttons',
    buttonSelector: '.flex.flex-wrap.items-center.gap-2.mb-3 button, .flex.flex-wrap.items-center.gap-2.mb-3 .flex.items-center',
    customizeButtonId: 'mainpro-customize-btn',
    editModalId: 'mainpro-edit-modal',
    transitionDuration: '0.3s'
  };

  // === State Management ===
  let customizeMode = false;
  let originalButtons = [];
  let customButtons = [];
  let draggedElement = null;

  // === Default Button Configuration ===
  const defaultButtons = [
    { id: 'pending', label: '🟡 Pending', icon: '🟡', color: '#F5B400', visible: true, type: 'filter' },
    { id: 'done', label: '🟢 Done', icon: '🟢', color: '#10B981', visible: true, type: 'filter' },
    { id: 'missed', label: '🔴 Missed', icon: '🔴', color: '#EF4444', visible: true, type: 'filter' },
    { id: 'all', label: '🧹 All', icon: '🧹', color: '#6B7280', visible: true, type: 'filter' },
    { id: 'month', label: 'Month', icon: '📅', color: '#3B82F6', visible: true, type: 'view' },
    { id: 'week', label: 'Week', icon: '📊', color: '#8B5CF6', visible: true, type: 'view' },
    { id: 'day', label: 'Day', icon: '📋', color: '#06B6D4', visible: true, type: 'view' },
    { id: 'search', label: '🔎 Search', icon: '🔎', color: '#F59E0B', visible: true, type: 'search' },
    { id: 'exportPDF', label: 'Export PDF', icon: '📄', color: '#2563EB', visible: true, type: 'export' },
    { id: 'exportExcel', label: 'Export Excel', icon: '📊', color: '#16A34A', visible: true, type: 'export' },
    { id: 'addTask', label: 'Add Task', icon: '➕', color: '#F5B400', visible: true, type: 'action' },
    { id: 'audit', label: '📊 Audit', icon: '📊', color: '#3B82F6', visible: true, type: 'action' },
    { id: 'reports', label: '📈 Reports', icon: '📈', color: '#10B981', visible: true, type: 'action' },
    { id: 'ai', label: '🤖 AI', icon: '🤖', color: '#A855F7', visible: true, type: 'action' },
    { id: 'clear', label: 'Clear', icon: '🧹', color: '#EF4444', visible: true, type: 'action' }
  ];

  // === Utility Functions ===
  const safeParse = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const saveButtons = () => {
    localStorage.setItem(CONFIG.localStorageKey, JSON.stringify(customButtons));
  };

  const loadButtons = () => {
    const stored = safeParse(CONFIG.localStorageKey, defaultButtons);
    customButtons = stored.length > 0 ? stored : defaultButtons;
  };

  // === DOM Manipulation ===
  const createElement = (tag, props = {}, children = []) => {
    const element = document.createElement(tag);
    Object.assign(element, props);
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
    return element;
  };

  const addStyles = () => {
    const style = createElement('style', {}, [`
      .mainpro-customize-mode {
        border: 2px dashed #F5B400 !important;
        background: rgba(245, 180, 0, 0.05) !important;
        border-radius: 12px !important;
        padding: 8px !important;
        transition: all ${CONFIG.transitionDuration} ease !important;
      }
      
      .mainpro-draggable {
        cursor: grab !important;
        transition: all ${CONFIG.transitionDuration} ease !important;
        position: relative !important;
      }
      
      .mainpro-draggable:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(245, 180, 0, 0.3) !important;
      }
      
      .mainpro-draggable.dragging {
        cursor: grabbing !important;
        opacity: 0.7 !important;
        transform: rotate(5deg) !important;
        z-index: 1000 !important;
      }
      
      .mainpro-edit-btn {
        position: absolute !important;
        top: -8px !important;
        right: -8px !important;
        width: 20px !important;
        height: 20px !important;
        background: #F5B400 !important;
        color: white !important;
        border: none !important;
        border-radius: 50% !important;
        font-size: 10px !important;
        cursor: pointer !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 100 !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
      }
      
      .mainpro-draggable:hover .mainpro-edit-btn {
        display: flex !important;
      }
      
      .mainpro-add-btn {
        background: linear-gradient(135deg, #10B981, #059669) !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 8px 16px !important;
        font-size: 14px !important;
        cursor: pointer !important;
        transition: all ${CONFIG.transitionDuration} ease !important;
        box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3) !important;
      }
      
      .mainpro-add-btn:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.4) !important;
      }
      
      .mainpro-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.5) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 10000 !important;
        opacity: 0 !important;
        transition: opacity ${CONFIG.transitionDuration} ease !important;
      }
      
      .mainpro-modal.show {
        opacity: 1 !important;
      }
      
      .mainpro-modal-content {
        background: white !important;
        border-radius: 16px !important;
        padding: 24px !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
        max-width: 400px !important;
        width: 90% !important;
        transform: scale(0.9) !important;
        transition: transform ${CONFIG.transitionDuration} ease !important;
      }
      
      .mainpro-modal.show .mainpro-modal-content {
        transform: scale(1) !important;
      }
      
      .mainpro-form-group {
        margin-bottom: 16px !important;
      }
      
      .mainpro-form-label {
        display: block !important;
        margin-bottom: 6px !important;
        font-weight: 600 !important;
        color: #374151 !important;
        font-size: 14px !important;
      }
      
      .mainpro-form-input {
        width: 100% !important;
        padding: 10px 12px !important;
        border: 2px solid #E5E7EB !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        transition: border-color ${CONFIG.transitionDuration} ease !important;
        box-sizing: border-box !important;
      }
      
      .mainpro-form-input:focus {
        outline: none !important;
        border-color: #F5B400 !important;
        box-shadow: 0 0 0 3px rgba(245, 180, 0, 0.1) !important;
      }
      
      .mainpro-color-picker {
        width: 60px !important;
        height: 40px !important;
        border: none !important;
        border-radius: 8px !important;
        cursor: pointer !important;
      }
      
      .mainpro-toggle {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
      }
      
      .mainpro-toggle input[type="checkbox"] {
        width: 18px !important;
        height: 18px !important;
        accent-color: #F5B400 !important;
      }
      
      .mainpro-modal-actions {
        display: flex !important;
        gap: 12px !important;
        justify-content: flex-end !important;
        margin-top: 24px !important;
      }
      
      .mainpro-btn {
        padding: 10px 20px !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all ${CONFIG.transitionDuration} ease !important;
      }
      
      .mainpro-btn-primary {
        background: linear-gradient(135deg, #F5B400, #D97706) !important;
        color: white !important;
        box-shadow: 0 2px 4px rgba(245, 180, 0, 0.3) !important;
      }
      
      .mainpro-btn-primary:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(245, 180, 0, 0.4) !important;
      }
      
      .mainpro-btn-secondary {
        background: #F3F4F6 !important;
        color: #374151 !important;
      }
      
      .mainpro-btn-secondary:hover {
        background: #E5E7EB !important;
      }
      
      .mainpro-btn-danger {
        background: linear-gradient(135deg, #EF4444, #DC2626) !important;
        color: white !important;
        box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3) !important;
      }
      
      .mainpro-btn-danger:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 8px rgba(239, 68, 68, 0.4) !important;
      }
    `]);
    document.head.appendChild(style);
  };

  // === Modal Management ===
  const createEditModal = () => {
    const modal = createElement('div', {
      id: CONFIG.editModalId,
      className: 'mainpro-modal'
    });

    const content = createElement('div', {
      className: 'mainpro-modal-content'
    }, [
      createElement('h3', {
        style: { margin: '0 0 20px 0', color: '#111827', fontSize: '18px', fontWeight: '700' }
      }, ['Edit Button']),
      
      createElement('div', { className: 'mainpro-form-group' }, [
        createElement('label', { className: 'mainpro-form-label' }, ['Label']),
        createElement('input', {
          type: 'text',
          id: 'edit-label',
          className: 'mainpro-form-input',
          placeholder: 'Button label'
        })
      ]),
      
      createElement('div', { className: 'mainpro-form-group' }, [
        createElement('label', { className: 'mainpro-form-label' }, ['Icon/Emoji']),
        createElement('input', {
          type: 'text',
          id: 'edit-icon',
          className: 'mainpro-form-input',
          placeholder: '🎯'
        })
      ]),
      
      createElement('div', { className: 'mainpro-form-group' }, [
        createElement('label', { className: 'mainpro-form-label' }, ['Color']),
        createElement('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, [
          createElement('input', {
            type: 'color',
            id: 'edit-color',
            className: 'mainpro-color-picker',
            value: '#F5B400'
          }),
          createElement('input', {
            type: 'text',
            id: 'edit-color-hex',
            className: 'mainpro-form-input',
            style: { width: '100px' },
            placeholder: '#F5B400'
          })
        ])
      ]),
      
      createElement('div', { className: 'mainpro-form-group' }, [
        createElement('div', { className: 'mainpro-toggle' }, [
          createElement('input', {
            type: 'checkbox',
            id: 'edit-visible',
            checked: true
          }),
          createElement('label', { className: 'mainpro-form-label', style: { margin: 0 } }, ['Visible'])
        ])
      ]),
      
      createElement('div', { className: 'mainpro-modal-actions' }, [
        createElement('button', {
          className: 'mainpro-btn mainpro-btn-secondary',
          onclick: hideEditModal
        }, ['Cancel']),
        createElement('button', {
          className: 'mainpro-btn mainpro-btn-danger',
          id: 'delete-btn',
          onclick: deleteButton
        }, ['Delete']),
        createElement('button', {
          className: 'mainpro-btn mainpro-btn-primary',
          id: 'save-btn',
          onclick: saveButton
        }, ['Save'])
      ])
    ]);

    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideEditModal();
      }
    });

    // Color picker sync
    const colorPicker = document.getElementById('edit-color');
    const colorHex = document.getElementById('edit-color-hex');
    
    colorPicker.addEventListener('input', (e) => {
      colorHex.value = e.target.value;
    });
    
    colorHex.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        colorPicker.value = e.target.value;
      }
    });

    return modal;
  };

  const showEditModal = (button) => {
    const modal = document.getElementById(CONFIG.editModalId);
    if (!modal) {
      createEditModal();
    }

    const labelInput = document.getElementById('edit-label');
    const iconInput = document.getElementById('edit-icon');
    const colorInput = document.getElementById('edit-color');
    const colorHexInput = document.getElementById('edit-color-hex');
    const visibleInput = document.getElementById('edit-visible');
    const deleteBtn = document.getElementById('delete-btn');

    labelInput.value = button.label;
    iconInput.value = button.icon;
    colorInput.value = button.color;
    colorHexInput.value = button.color;
    visibleInput.checked = button.visible;

    // Show/hide delete button based on button type
    if (button.type === 'custom') {
      deleteBtn.style.display = 'inline-block';
    } else {
      deleteBtn.style.display = 'none';
    }

    modal.classList.add('show');
    
    // Store current button being edited
    modal.currentButton = button;
  };

  const hideEditModal = () => {
    const modal = document.getElementById(CONFIG.editModalId);
    if (modal) {
      modal.classList.remove('show');
      modal.currentButton = null;
    }
  };

  // === Button Management ===
  const findButtonConfig = (element) => {
    const buttonId = element.getAttribute('data-button-id');
    return customButtons.find(btn => btn.id === buttonId);
  };

  const updateButtonElement = (element, config) => {
    // Update button appearance based on config
    if (config.icon) {
      const iconMatch = element.textContent.match(/^[^\s]+/);
      if (iconMatch) {
        element.textContent = element.textContent.replace(/^[^\s]+/, config.icon);
      } else {
        element.textContent = config.icon + ' ' + config.label.replace(/^[^\s]+\s/, '');
      }
    }
    
    if (config.color && element.style) {
      if (element.classList.contains('bg-gray-100')) {
        element.style.background = config.visible ? config.color : '#E5E7EB';
      } else {
        element.style.background = config.color;
      }
    }
    
    element.style.display = config.visible ? '' : 'none';
  };

  const saveButton = () => {
    const modal = document.getElementById(CONFIG.editModalId);
    if (!modal || !modal.currentButton) return;

    const labelInput = document.getElementById('edit-label');
    const iconInput = document.getElementById('edit-icon');
    const colorInput = document.getElementById('edit-color');
    const visibleInput = document.getElementById('edit-visible');

    const buttonConfig = modal.currentButton;
    buttonConfig.label = labelInput.value || buttonConfig.label;
    buttonConfig.icon = iconInput.value || buttonConfig.icon;
    buttonConfig.color = colorInput.value;
    buttonConfig.visible = visibleInput.checked;

    // Update all button elements with this ID
    const elements = document.querySelectorAll(`[data-button-id="${buttonConfig.id}"]`);
    elements.forEach(element => {
      updateButtonElement(element, buttonConfig);
    });

    saveButtons();
    hideEditModal();
    showToast('✅ Button updated successfully!');
  };

  const deleteButton = () => {
    const modal = document.getElementById(CONFIG.editModalId);
    if (!modal || !modal.currentButton) return;

    const buttonConfig = modal.currentButton;
    
    if (confirm(`Are you sure you want to delete "${buttonConfig.label}"?`)) {
      // Remove from config
      customButtons = customButtons.filter(btn => btn.id !== buttonConfig.id);
      
      // Remove from DOM
      const elements = document.querySelectorAll(`[data-button-id="${buttonConfig.id}"]`);
      elements.forEach(element => {
        element.remove();
      });

      saveButtons();
      hideEditModal();
      showToast('🗑️ Button deleted successfully!');
    }
  };

  const addNewButton = () => {
    const label = prompt('Enter button label:');
    if (!label) return;

    const icon = prompt('Enter emoji/icon:', '🎯');
    if (!icon) return;

    const color = prompt('Enter color (hex):', '#F5B400');
    if (!color) return;

    const newButton = {
      id: `custom_${Date.now()}`,
      label: label,
      icon: icon,
      color: color,
      visible: true,
      type: 'custom'
    };

    customButtons.push(newButton);
    saveButtons();
    
    // Add to DOM
    addButtonToToolbar(newButton);
    showToast('➕ New button added successfully!');
  };

  const addButtonToToolbar = (buttonConfig) => {
    const toolbar = document.querySelector(CONFIG.buttonSelector.split(',')[0]);
    if (!toolbar) return;

    const button = createElement('button', {
      'data-button-id': buttonConfig.id,
      className: 'mainpro-draggable px-3 py-2 rounded-md text-white font-medium shadow hover:opacity-90 transition-all cursor-pointer',
      style: {
        background: buttonConfig.color,
        position: 'relative'
      },
      onclick: customizeMode ? () => showEditModal(buttonConfig) : () => {
        // Default action for custom buttons
        showToast(`Clicked: ${buttonConfig.label}`);
      }
    }, [buttonConfig.label]);

    const editBtn = createElement('button', {
      className: 'mainpro-edit-btn',
      onclick: (e) => {
        e.stopPropagation();
        showEditModal(buttonConfig);
      }
    }, ['✏️']);

    button.appendChild(editBtn);
    toolbar.appendChild(button);

    if (customizeMode) {
      makeDraggable(button);
    }
  };

  // === Drag and Drop ===
  const makeDraggable = (element) => {
    element.classList.add('mainpro-draggable');
    element.draggable = true;

    element.addEventListener('dragstart', (e) => {
      draggedElement = element;
      element.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', element.outerHTML);
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
      draggedElement = null;
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedElement && draggedElement !== element) {
        const toolbar = element.parentNode;
        const draggedIndex = Array.from(toolbar.children).indexOf(draggedElement);
        const targetIndex = Array.from(toolbar.children).indexOf(element);
        
        if (draggedIndex < targetIndex) {
          toolbar.insertBefore(draggedElement, element.nextSibling);
        } else {
          toolbar.insertBefore(draggedElement, element);
        }
        
        // Update button order in config
        updateButtonOrder();
      }
    });
  };

  const updateButtonOrder = () => {
    const toolbar = document.querySelector(CONFIG.buttonSelector.split(',')[0]);
    if (!toolbar) return;

    const orderedButtons = [];
    const children = Array.from(toolbar.children);
    
    children.forEach(child => {
      const buttonId = child.getAttribute('data-button-id');
      if (buttonId) {
        const config = customButtons.find(btn => btn.id === buttonId);
        if (config) {
          orderedButtons.push(config);
        }
      }
    });

    // Add any remaining buttons that weren't in the toolbar
    customButtons.forEach(config => {
      if (!orderedButtons.find(btn => btn.id === config.id)) {
        orderedButtons.push(config);
      }
    });

    customButtons = orderedButtons;
    saveButtons();
  };

  // === Customize Mode ===
  const enableCustomizeMode = () => {
    customizeMode = true;
    const toolbar = document.querySelector(CONFIG.buttonSelector.split(',')[0]);
    if (!toolbar) return;

    // Add customize mode styling
    toolbar.classList.add('mainpro-customize-mode');

    // Make all buttons draggable and add edit buttons
    const buttons = toolbar.querySelectorAll('button, .flex.items-center');
    buttons.forEach(button => {
      const buttonId = button.getAttribute('data-button-id') || 
                      button.textContent.trim().toLowerCase().replace(/\s+/g, '');
      
      // Add button ID if not present
      if (!button.getAttribute('data-button-id')) {
        button.setAttribute('data-button-id', buttonId);
      }

      makeDraggable(button);

      // Add edit button if not present
      if (!button.querySelector('.mainpro-edit-btn')) {
        const editBtn = createElement('button', {
          className: 'mainpro-edit-btn',
          onclick: (e) => {
            e.stopPropagation();
            const config = findButtonConfig(button) || {
              id: buttonId,
              label: button.textContent.trim(),
              icon: button.textContent.match(/^[^\s]+/)?.[0] || '🎯',
              color: button.style.background || '#F5B400',
              visible: true,
              type: 'existing'
            };
            showEditModal(config);
          }
        }, ['✏️']);
        button.appendChild(editBtn);
      }
    });

    // Add "Add Button" option
    const addButton = createElement('button', {
      className: 'mainpro-add-btn',
      onclick: addNewButton
    }, ['➕ Add Button']);
    
    toolbar.appendChild(addButton);

    showToast('🎨 Customize Mode enabled! Drag buttons to reorder, click ✏️ to edit.');
  };

  const disableCustomizeMode = () => {
    customizeMode = false;
    const toolbar = document.querySelector(CONFIG.buttonSelector.split(',')[0]);
    if (!toolbar) return;

    // Remove customize mode styling
    toolbar.classList.remove('mainpro-customize-mode');

    // Remove drag functionality
    const buttons = toolbar.querySelectorAll('.mainpro-draggable');
    buttons.forEach(button => {
      button.classList.remove('mainpro-draggable');
      button.draggable = false;
      
      // Remove edit buttons
      const editBtn = button.querySelector('.mainpro-edit-btn');
      if (editBtn) {
        editBtn.remove();
      }
    });

    // Remove "Add Button"
    const addBtn = toolbar.querySelector('.mainpro-add-btn');
    if (addBtn) {
      addBtn.remove();
    }

    showToast('✅ Customize Mode disabled. Changes saved!');
  };

  const toggleCustomizeMode = () => {
    if (customizeMode) {
      disableCustomizeMode();
    } else {
      enableCustomizeMode();
    }
  };

  const restoreDefaultLayout = () => {
    if (confirm('Are you sure you want to restore the default layout? This will remove all custom buttons.')) {
      customButtons = [...defaultButtons];
      saveButtons();
      location.reload();
    }
  };

  // === Settings Integration ===
  const addCustomizeButton = () => {
    const settingsModal = document.querySelector('[class*="modal"]');
    if (!settingsModal) return;

    // Look for existing settings buttons
    const settingsButtons = settingsModal.querySelectorAll('button');
    let customizeBtn = null;

    // Check if button already exists
    settingsButtons.forEach(btn => {
      if (btn.textContent.includes('Customize Dashboard')) {
        customizeBtn = btn;
      }
    });

    if (!customizeBtn) {
      // Find a good place to add the button (usually near other action buttons)
      const buttonContainer = settingsModal.querySelector('.flex.flex-wrap.gap-2, .grid.grid-cols-2.gap-2') || 
                             settingsModal.querySelector('.flex') ||
                             settingsModal;

      customizeBtn = createElement('button', {
        className: 'px-4 py-2 rounded-md text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 shadow-sm text-sm',
        onclick: toggleCustomizeMode
      }, ['⚙️ Customize Dashboard']);

      buttonContainer.appendChild(customizeBtn);
    }

    // Add restore button
    let restoreBtn = null;
    settingsButtons.forEach(btn => {
      if (btn.textContent.includes('Restore Default')) {
        restoreBtn = btn;
      }
    });

    if (!restoreBtn && customizeBtn) {
      restoreBtn = createElement('button', {
        className: 'px-4 py-2 rounded-md text-white bg-red-500 hover:bg-red-600 shadow-sm text-sm',
        onclick: restoreDefaultLayout
      }, ['🔄 Restore Default Layout']);
      
      customizeBtn.parentNode.appendChild(restoreBtn);
    }
  };

  // === Toast Notifications ===
  const showToast = (message) => {
    const toast = createElement('div', {
      style: {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'linear-gradient(135deg, #F5B400, #D97706)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(245, 180, 0, 0.3)',
        zIndex: '10001',
        fontSize: '14px',
        fontWeight: '600',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
      }
    }, [message]);

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  };

  // === Initialization ===
  const initialize = () => {
    addStyles();
    loadButtons();
    
    // Wait for MainPro to be ready
    const checkMainPro = () => {
      const settingsButton = document.querySelector('button[onclick*="setOpenSettings"], button:contains("Settings")');
      if (settingsButton) {
        // Add click listener to settings button
        settingsButton.addEventListener('click', () => {
          setTimeout(addCustomizeButton, 100);
        });
        
        // Try to add immediately if settings is already open
        setTimeout(addCustomizeButton, 500);
        return true;
      }
      return false;
    };

    // Try to initialize immediately
    if (!checkMainPro()) {
      // Use MutationObserver to watch for MainPro elements
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.querySelector && node.querySelector('button[onclick*="setOpenSettings"]')) {
                setTimeout(addCustomizeButton, 100);
                observer.disconnect();
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  };

  // === Start ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // === Global API ===
  window.MainProCustomizer = {
    toggleCustomizeMode,
    enableCustomizeMode,
    disableCustomizeMode,
    addNewButton,
    restoreDefaultLayout,
    showEditModal,
    hideEditModal
  };

})();
