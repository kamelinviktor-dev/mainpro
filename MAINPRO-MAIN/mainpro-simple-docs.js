// ===== Documents (simple mode) — PRO-grade fallback (independent of React) =====
(function(){
  try {
    if (window.openSimpleDocsModal) return; // already defined

    const LS_DOCS_KEY = 'mainpro_documents';
    const LS_FOLDERS_KEY = 'mainpro_folders';
    const DB_NAME = 'mainpro_docs_db';
    const DB_VERSION = 1;
    const DB_STORE = 'blobs'; // key: docId, value: { id, blob, type, name, size, lastModified }

    const nowISO = () => {
      try { return new Date().toISOString(); } catch { return String(Date.now()); }
    };

    const safeJsonParse = (raw, fallback) => {
      try {
        const v = JSON.parse(raw);
        return (v === undefined || v === null) ? fallback : v;
      } catch { return fallback; }
    };

    const readLSArray = (key) => {
      try {
        const raw = localStorage.getItem(key) || '[]';
        const parsed = safeJsonParse(raw, []);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    };

    const writeLS = (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    };

    const ensureDefaultFolders = () => {
      let cur = readLSArray(LS_FOLDERS_KEY);
      if (!cur.length) {
        const defaults = [
          { id: 1, name: 'General', parentId: null },
          { id: 2, name: 'RAMS', parentId: null },
          { id: 3, name: 'Certificates', parentId: null },
          { id: 4, name: 'Contracts', parentId: null },
        ];
        writeLS(LS_FOLDERS_KEY, defaults);
        return defaults;
      }
      let changed = false;
      cur = cur.map(f => { if (f.parentId === undefined) { changed = true; return { ...f, parentId: null }; } return f; });
      if (!cur.some(f => String(f?.name || '') === 'General')) { cur = [{ id: 1, name: 'General', parentId: null }, ...cur]; changed = true; }
      if (changed) writeLS(LS_FOLDERS_KEY, cur);
      return cur;
    };

    const getFolderById = (id) => ensureDefaultFolders().find(f => String(f?.id) === String(id));
    const getFolderPath = (folder) => {
      if (!folder) return '';
      const parts = [];
      let f = folder;
      while (f) {
        parts.unshift(String(f?.name || ''));
        const pid = f?.parentId;
        if (pid == null || pid === '') break;
        f = getFolderById(pid);
      }
      return parts.join('/');
    };
    const getFolderByPath = (path) => ensureDefaultFolders().find(f => getFolderPath(f) === path);
    const getFolderChildren = (parentId) => {
      const folders = ensureDefaultFolders();
      const pid = parentId == null || parentId === '' ? null : parentId;
      return folders.filter(f => String(f?.parentId ?? '') === String(pid ?? ''));
    };
    const getAllFolderPaths = () => ensureDefaultFolders().map(f => getFolderPath(f)).filter(Boolean).sort((a,b) => ((a.match(/\//g)||[]).length - (b.match(/\//g)||[]).length) || a.localeCompare(b));

    const getDocs = () => readLSArray(LS_DOCS_KEY);
    const setDocs = (docs) => writeLS(LS_DOCS_KEY, Array.isArray(docs) ? docs : []);

    const genId = () => {
      // Stable-enough unique id for local docs
      return 'doc_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
    };

    const fmtBytes = (n) => {
      const v = Number(n || 0);
      if (!v) return '0 B';
      const units = ['B','KB','MB','GB'];
      let i = 0;
      let x = v;
      while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
      return `${x.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
    };

    const extOf = (name) => {
      const s = String(name || '');
      const i = s.lastIndexOf('.');
      return (i >= 0 ? s.slice(i + 1) : '').toLowerCase();
    };

    const typeGroup = (mime, name) => {
      const t = String(mime || '').toLowerCase();
      const ext = extOf(name);
      if (t.startsWith('image/')) return 'image';
      if (t.includes('pdf') || ext === 'pdf') return 'pdf';
      if (t.startsWith('text/') || ['txt','md','csv','log','json','xml','html','htm','yaml','yml','js','ts','mjs','cjs','css','scss','sass','less','svg','ini','cfg','config','env','sh','bat','ps1','py','rb','php','sql','graphql'].includes(ext)) return 'text';
      if (['doc','docx','rtf','odt'].includes(ext)) return 'doc';
      if (['xls','xlsx','ods'].includes(ext)) return 'sheet';
      if (['ppt','pptx','odp'].includes(ext)) return 'slides';
      if (['zip','rar','7z'].includes(ext)) return 'archive';
      return t ? t.split('/')[0] : 'file';
    };

    const toast = (msg) => {
      try {
        if (typeof window.showToast === 'function') return window.showToast(msg);
      } catch {}
      try { console.log('[Documents]', msg); } catch {}
    };

    const openDb = () => new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(DB_STORE)) {
            db.createObjectStore(DB_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
      } catch (e) { reject(e); }
    });

    const dbPutBlob = async (id, file) => {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(DB_STORE, 'readwrite');
          tx.oncomplete = () => { try { db.close(); } catch {} ; resolve(true); };
          tx.onerror = () => { try { db.close(); } catch {} ; reject(tx.error || new Error('IndexedDB tx failed')); };
          const store = tx.objectStore(DB_STORE);
          store.put({
            id,
            blob: file,
            type: file.type || '',
            name: file.name || '',
            size: file.size || 0,
            lastModified: file.lastModified || Date.now(),
          });
        } catch (e) { try { db.close(); } catch {} ; reject(e); }
      });
    };

    const dbGetBlob = async (id) => {
      const db = await openDb();
      return await new Promise((resolve) => {
        try {
          const tx = db.transaction(DB_STORE, 'readonly');
          const store = tx.objectStore(DB_STORE);
          const req = store.get(id);
          req.onsuccess = () => {
            const v = req.result || null;
            try { db.close(); } catch {}
            resolve(v && v.blob ? v : null);
          };
          req.onerror = () => { try { db.close(); } catch {} ; resolve(null); };
        } catch { try { db.close(); } catch {} ; resolve(null); }
      });
    };

    const dbDelBlob = async (id) => {
      const db = await openDb();
      return await new Promise((resolve) => {
        try {
          const tx = db.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          const req = store.delete(id);
          req.onsuccess = () => { try { db.close(); } catch {} ; resolve(true); };
          req.onerror = () => { try { db.close(); } catch {} ; resolve(false); };
        } catch { try { db.close(); } catch {} ; resolve(false); }
      });
    };

    const sha256 = async (blob) => {
      try {
        const buf = await blob.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buf);
        const arr = Array.from(new Uint8Array(digest));
        return arr.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch { return ''; }
    };

    // --- UI shell (MainPro-like) ---
    const overlay = document.createElement('div');
    overlay.id = 'mp-simple-docs-overlay';
    overlay.setAttribute('data-mp-overlay', '1');
    // Push modal down so the app header remains visible.
    overlay.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-[99999] p-4 sm:p-6 mp-overlay-anim overflow-y-auto';
    overlay.style.display = 'none';
    // IMPORTANT: Tailwind CDN may not support arbitrary z-[...] classes reliably.
    // Force the overlay above FullCalendar event layers.
    overlay.style.zIndex = '2147483647';

    const modal = document.createElement('div');
    modal.setAttribute('data-mp-modal', '1');
    modal.className = 'mp-docs-modal modal-enter modal-ready flex flex-col';

    const header = document.createElement('div');
    header.className = 'mp-docs-header';

    // Local tooltip CSS for this modal:
    // - Always above all modal content (high z-index)
    // - Avoids clipping/stacking issues where global tooltip styles can get hidden
    try {
      if (!document.getElementById('mp-docs-tooltip-style')) {
        const st = document.createElement('style');
        st.id = 'mp-docs-tooltip-style';
        st.textContent = `
          #mp-simple-docs-overlay button{ opacity: 1 !important; }
          #mp-simple-docs-overlay button[disabled]{ opacity: 1 !important; }
          .mp-docs-tt::after,.mp-docs-tt::before{ display:none !important; }
          /* Safety: if any element still uses global tooltip-bottom inside this modal */
          #mp-simple-docs-overlay .min-h-0 { min-height: 0 !important; }
          .mp-docs-action-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; }
          .mp-docs-action-btn:hover { transform: scale(1.06); }
          .mp-docs-action-btn[data-action="preview"]:hover { background: #0ea5e9 !important; border-color: #0ea5e9 !important; }
          .mp-docs-action-btn[data-action="download"]:hover { background: #22c55e !important; border-color: #22c55e !important; }
          .mp-docs-action-btn[data-action="delete"]:hover { background: #ef4444 !important; border-color: #ef4444 !important; }
          /* Scroll — always visible */
          #mp-simple-docs-overlay .mp-docs-scroll {
            overflow-y: scroll !important;
            overflow-x: hidden !important;
            min-height: 0 !important;
            -webkit-overflow-scrolling: touch;
          }
          #mp-simple-docs-overlay .mp-docs-scroll::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          #mp-simple-docs-overlay .mp-docs-scroll::-webkit-scrollbar-track {
            background: #fef3c7;
            border-radius: 6px;
          }
          #mp-simple-docs-overlay .mp-docs-scroll::-webkit-scrollbar-thumb {
            background: #f59e0b;
            border-radius: 6px;
            border: 2px solid #fef3c7;
          }
          #mp-simple-docs-overlay .mp-docs-scroll::-webkit-scrollbar-thumb:hover {
            background: #d97706;
          }
          #mp-simple-docs-overlay .mp-docs-scroll {
            scrollbar-width: auto;
            scrollbar-color: #f59e0b #fef3c7;
          }
          .mp-doc-selected { border-color: #f59e0b !important; background-color: #fef3c7 !important; }
        `;
        document.head.appendChild(st);
      }
    } catch {}

    const title = document.createElement('div');
    title.className = 'mp-docs-title';
    title.innerHTML = '<span>📁</span><span>Documents</span>';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'mp-docs-tt mp-docs-btn mp-docs-btn-secondary';
    closeBtn.setAttribute('data-tooltip', 'Close');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.padding = '6px 12px';

    const headerRight = document.createElement('div');
    headerRight.className = 'mp-docs-header-actions';

    const actionBtn = (label, tooltip, primary) => {
      const b = document.createElement('button');
      b.className = 'mp-docs-btn mp-docs-tt ' + (primary ? 'mp-docs-btn-primary' : 'mp-docs-btn-secondary');
      b.setAttribute('data-tooltip', tooltip || label);
      b.textContent = label;
      return b;
    };

    const addBtn = actionBtn('＋ Add', 'Add files', true);
    addBtn.classList.add('mp-docs-tt-left', 'mp-docs-tt-top');
    const newFolderHeaderBtn = actionBtn('＋ Folder', 'New folder', false);
    newFolderHeaderBtn.classList.add('mp-docs-tt-left', 'mp-docs-tt-top');
    const importBtn = actionBtn('Import', 'Import JSON', false);
    const exportBtn = actionBtn('Export', 'Export JSON', false);
    exportBtn.classList.add('mp-docs-tt-right');
    closeBtn.classList.add('mp-docs-tt-right');

    headerRight.appendChild(addBtn);
    headerRight.appendChild(newFolderHeaderBtn);
    headerRight.appendChild(importBtn);
    headerRight.appendChild(exportBtn);
    headerRight.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'mp-docs-body';

    const sidebar = document.createElement('div');
    sidebar.className = 'mp-docs-sidebar';
    const main = document.createElement('div');
    main.className = 'mp-docs-main';
    const preview = document.createElement('div');
    preview.className = 'mp-docs-preview';

    body.appendChild(sidebar);
    body.appendChild(main);
    body.appendChild(preview);

    header.appendChild(title);
    header.appendChild(headerRight);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const tooltipEl = document.createElement('div');
    tooltipEl.id = 'mp-docs-global-tooltip';
    tooltipEl.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;visibility:hidden;background:#92400e;color:#fff;padding:5px 10px;border-radius:6px;font-size:11px;white-space:nowrap;filter:drop-shadow(0 4px 12px rgba(146,64,14,.4));';
    overlay.appendChild(tooltipEl);
    let tooltipHideT = 0;
    overlay.addEventListener('mouseover', (e) => {
      clearTimeout(tooltipHideT);
      const t = e.target?.closest?.('.mp-docs-tt');
      if (!t) { tooltipEl.style.visibility = 'hidden'; return; }
      const text = t.getAttribute('data-tooltip');
      if (!text) { tooltipEl.style.visibility = 'hidden'; return; }
      tooltipEl.textContent = text;
      const rect = t.getBoundingClientRect();
      tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
      tooltipEl.style.transform = 'translateX(-50%)';
      tooltipEl.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
      tooltipEl.style.visibility = 'visible';
    });
    overlay.addEventListener('mouseout', (e) => {
      if (e.relatedTarget && overlay.contains(e.relatedTarget) && e.relatedTarget.closest?.('.mp-docs-tt')) return;
      tooltipHideT = setTimeout(() => { tooltipEl.style.visibility = 'hidden'; }, 50);
    });
    overlay.addEventListener('scroll', () => { tooltipEl.style.visibility = 'hidden'; }, true);

    // --- Blob URL tracking (prevent memory leak) ---
    const activeBlobUrls = [];
    let currentPreviewUrl = null;
    const revokeBlobUrls = () => {
      if (currentPreviewUrl) {
        try { URL.revokeObjectURL(currentPreviewUrl); } catch {}
        currentPreviewUrl = null;
      }
      activeBlobUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
      activeBlobUrls.length = 0;
      if (state.__thumbUrls) {
        Object.values(state.__thumbUrls || {}).forEach(u => { try { URL.revokeObjectURL(u); } catch {} });
        state.__thumbUrls = {};
      }
    };

    // --- State ---
    const state = {
      folder: 'General',
      q: '',
      type: 'all', // all|pdf|image|text|doc|sheet|slides|archive|file
      tagFilter: '', // '' = all
      sort: 'date_desc', // date_desc|date_asc|name_asc|name_desc|size_desc|size_asc
      view: 'list', // list|grid
      mode: 'library', // library | trash
      selected: new Set(),
      activeId: null,
      pendingFiles: [],
      __thumbUrls: {},
    };

    ensureDefaultFolders();

    // --- Sidebar UI ---
    const sideTitle = document.createElement('div');
    sideTitle.className = 'mp-docs-sidebar-title';
    sideTitle.textContent = 'Folders';

    const newFolderRow = document.createElement('div');
    newFolderRow.className = 'mp-docs-newfolder';
    const newFolderBtn = document.createElement('button');
    newFolderBtn.type = 'button';
    newFolderBtn.className = 'mp-docs-newfolder-btn mp-docs-tt';
    newFolderBtn.textContent = '＋ New folder';
    newFolderBtn.setAttribute('data-tooltip', 'New folder');
    newFolderRow.appendChild(newFolderBtn);

    const foldersBox = document.createElement('div');
    foldersBox.className = 'mp-docs-folders';

    sidebar.appendChild(sideTitle);
    sidebar.appendChild(newFolderRow);
    sidebar.appendChild(foldersBox);

    // --- Main UI (toolbar + list) ---
    const toolbar = document.createElement('div');
    toolbar.className = 'mp-docs-toolbar';

    const searchGrp = document.createElement('div');
    searchGrp.className = 'mp-docs-toolbar-group mp-docs-toolbar-search';
    const searchIn = document.createElement('input');
    searchIn.className = 'mp-docs-search-input flex-1 min-w-[160px]';
    searchIn.placeholder = 'Search documents...';
    searchIn.title = 'Search documents';
    searchGrp.appendChild(searchIn);

    const filterGrp = document.createElement('div');
    filterGrp.className = 'mp-docs-toolbar-group';
    const typeSel = document.createElement('select');
    typeSel.title = 'Filter by type';
    [
      ['all','All types'],
      ['pdf','PDF'],
      ['image','Images'],
      ['text','Text'],
      ['doc','Docs'],
      ['sheet','Sheets'],
      ['slides','Slides'],
      ['archive','Archives'],
      ['file','Other'],
    ].forEach(([v,l]) => {
      const o = document.createElement('option'); o.value=v; o.textContent=l; typeSel.appendChild(o);
    });
    filterGrp.appendChild(typeSel);

    const sortSel = document.createElement('select');
    sortSel.title = 'Sort order';
    [
      ['date_desc','Newest'],
      ['date_asc','Oldest'],
      ['name_asc','Name A→Z'],
      ['name_desc','Name Z→A'],
      ['size_desc','Largest'],
      ['size_asc','Smallest'],
    ].forEach(([v,l]) => {
      const o = document.createElement('option'); o.value=v; o.textContent=l; sortSel.appendChild(o);
    });
    filterGrp.appendChild(sortSel);

    const div1 = document.createElement('div');
    div1.className = 'mp-docs-toolbar-divider';
    const actionsGrp = document.createElement('div');
    actionsGrp.className = 'mp-docs-toolbar-group';
    const viewBtn = actionBtn('View', 'List/Grid', false);
    viewBtn.classList.add('mp-docs-tt-top');
    const analyticsBtn = actionBtn('Analytics', 'Library stats', false);
    analyticsBtn.classList.add('mp-docs-tt-top');
    const renameBtn = actionBtn('Rename', 'Rename selected', false);
    renameBtn.classList.add('mp-docs-tt-top');
    renameBtn.disabled = true;
    renameBtn.style.opacity = '1';
    const moveSel = document.createElement('select');
    moveSel.title = 'Target folder';
    const moveBtn = actionBtn('Move', 'Move to folder', false);
    moveBtn.classList.add('mp-docs-tt-top');
    moveBtn.disabled = true;
    moveBtn.style.opacity = '1';
    const restoreBtn = actionBtn('Restore', 'Restore from Trash', false);
    restoreBtn.classList.add('mp-docs-tt-top');
    restoreBtn.disabled = true;
    restoreBtn.style.opacity = '1';
    const delForeverBtn = actionBtn('Delete forever', 'Permanent delete', false);
    delForeverBtn.classList.add('mp-docs-tt-top');
    delForeverBtn.disabled = true;
    delForeverBtn.style.opacity = '1';
    const bulkDelBtn = actionBtn('Delete', 'Delete selected', false);
    bulkDelBtn.classList.add('mp-docs-tt-top');
    bulkDelBtn.disabled = true;
    bulkDelBtn.style.opacity = '1';

    const div2 = document.createElement('div');
    div2.className = 'mp-docs-toolbar-divider';
    const trashGrp = document.createElement('div');
    trashGrp.className = 'mp-docs-toolbar-group';
    const trashBtn = document.createElement('button');
    trashBtn.className = 'mp-docs-btn mp-docs-btn-secondary mp-docs-tt mp-docs-tt-top mp-docs-tt-right';
    trashBtn.textContent = 'Trash';
    trashBtn.setAttribute('data-tooltip', 'Trash');

    actionsGrp.appendChild(viewBtn);
    actionsGrp.appendChild(analyticsBtn);
    actionsGrp.appendChild(renameBtn);
    actionsGrp.appendChild(moveSel);
    actionsGrp.appendChild(moveBtn);
    actionsGrp.appendChild(restoreBtn);
    actionsGrp.appendChild(delForeverBtn);
    actionsGrp.appendChild(bulkDelBtn);

    toolbar.appendChild(searchGrp);
    toolbar.appendChild(div1);
    toolbar.appendChild(filterGrp);
    toolbar.appendChild(actionsGrp);
    toolbar.appendChild(div2);
    toolbar.appendChild(trashGrp);
    trashGrp.appendChild(trashBtn);

    const tagsBar = document.createElement('div');
    tagsBar.className = 'mp-docs-toolbar mp-docs-tags-bar flex flex-wrap items-center gap-2';

    const listWrap = document.createElement('div');
    listWrap.className = 'mp-docs-list mp-docs-scroll flex-1 min-h-0';
    const list = document.createElement('div');
    list.className = 'p-3 space-y-2';
    listWrap.appendChild(list);

    const footer = document.createElement('div');
    footer.className = 'mp-docs-footer';
    const footLeft = document.createElement('div');
    const footRight = document.createElement('div');
    footer.appendChild(footLeft);
    footer.appendChild(footRight);

    main.appendChild(toolbar);
    main.appendChild(tagsBar);
    main.appendChild(listWrap);
    main.appendChild(footer);

    // --- Preview UI ---
    const prevHead = document.createElement('div');
    prevHead.className = 'mp-docs-preview-head';
    const prevTitle = document.createElement('div');
    prevTitle.className = 'mp-docs-preview-title';
    prevTitle.textContent = 'Preview';
    const prevActions = document.createElement('div');
    prevActions.className = 'mp-docs-preview-actions flex items-center gap-2';
    const clearPrevBtn = document.createElement('button');
    clearPrevBtn.type = 'button';
    clearPrevBtn.className = 'mp-docs-preview-clear mp-docs-tt mp-docs-tt-top';
    clearPrevBtn.innerHTML = '×';
    clearPrevBtn.setAttribute('data-tooltip', 'Deselect');
    clearPrevBtn.style.cssText = 'width:28px;height:28px;padding:0;border:none;border-radius:6px;background:transparent;color:#92400e;font-size:18px;cursor:pointer;display:none;align-items:center;justify-content:center;';
    clearPrevBtn.onclick = () => { state.activeId = null; renderAll(true); };
    const openInTabBtn = document.createElement('button');
    openInTabBtn.type = 'button';
    openInTabBtn.className = 'mp-docs-btn mp-docs-btn-secondary mp-docs-tt mp-docs-tt-top';
    openInTabBtn.textContent = '↗';
    openInTabBtn.setAttribute('data-tooltip', 'Open in new tab');
    openInTabBtn.style.cssText = 'padding:6px 10px;font-size:12px;display:none;';
    const dlBtn = actionBtn('Download', 'Download', false);
    dlBtn.classList.add('mp-docs-tt-top', 'mp-docs-tt-right');
    dlBtn.disabled = true;
    dlBtn.style.opacity = '1';
    prevActions.appendChild(clearPrevBtn);
    prevActions.appendChild(openInTabBtn);
    prevActions.appendChild(dlBtn);
    prevHead.appendChild(prevTitle);
    prevHead.appendChild(prevActions);

    const prevBody = document.createElement('div');
    prevBody.className = 'mp-docs-preview-body mp-docs-scroll flex-1 min-h-0';
    prevBody.innerHTML = `<div class="text-sm text-gray-500">Select a document to preview.</div>`;
    preview.appendChild(prevHead);
    preview.appendChild(prevBody);

    // --- Hidden inputs (upload/import) ---
    const fileIn = document.createElement('input');
    fileIn.type = 'file';
    fileIn.multiple = true;
    fileIn.style.display = 'none';

    const importIn = document.createElement('input');
    importIn.type = 'file';
    importIn.accept = 'application/json';
    importIn.style.display = 'none';

    modal.appendChild(fileIn);
    modal.appendChild(importIn);

    // --- Rendering helpers ---
    const currentFolders = () => ensureDefaultFolders();

    const getFolderDocCount = (path) => getDocs().filter(d => !isTrashed(d) && String(d?.folder || 'General') === String(path)).length;

    const showNewFolderPopup = (opts) => {
      const { title = 'New folder', placeholder = 'Folder name', onOk } = opts || {};
      const wrap = document.createElement('div');
      wrap.className = 'mp-docs-popup-wrap';
      wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483648;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);';
      const box = document.createElement('div');
      box.className = 'mp-docs-newfolder mp-docs-popup-box';
      box.style.cssText = 'min-width:280px;max-width:90vw;padding:20px;margin:16px;';
      const lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:14px;font-weight:600;color:#92400e;margin-bottom:12px;';
      lbl.textContent = title;
      const inp = document.createElement('input');
      inp.placeholder = placeholder;
      inp.autofocus = true;
      const btns = document.createElement('div');
      btns.style.cssText = 'display:flex;gap:10px;margin-top:14px;';
      const okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'mp-docs-newfolder-btn';
      okBtn.textContent = 'Create';
      okBtn.style.cssText = 'flex:1;margin:0;';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'mp-docs-btn mp-docs-btn-secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'flex:1;padding:10px 14px;cursor:pointer;';
      const close = () => { wrap.remove(); };
      okBtn.onclick = () => {
        const name = String(inp.value || '').trim();
        if (!name) return;
        close();
        if (onOk) onOk(name);
      };
      cancelBtn.onclick = close;
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); okBtn.click(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelBtn.click(); }
      };
      wrap.onclick = (e) => { if (e.target === wrap) cancelBtn.click(); };
      btns.appendChild(okBtn);
      btns.appendChild(cancelBtn);
      box.appendChild(lbl);
      box.appendChild(inp);
      box.appendChild(btns);
      wrap.appendChild(box);
      overlay.appendChild(wrap);
      setTimeout(() => inp.focus(), 50);
    };

    const addSubfolderIn = (parentId, parentPath) => {
      showNewFolderPopup({
        title: 'New subfolder',
        placeholder: 'Subfolder name',
        onOk: (name) => {
          const newPath = parentPath ? parentPath + '/' + name : name;
          const folders = currentFolders();
          if (folders.some(f => getFolderPath(f) === newPath)) { toast('⚠️ Folder exists'); return; }
          folders.push({ id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2), name, parentId });
          writeLS(LS_FOLDERS_KEY, folders);
          localStorage.setItem('mp_docs_expanded_' + parentId, '1');
          state.folder = newPath;
          toast('📁 Subfolder added');
          renderFolders();
          renderAll(false);
        }
      });
    };

    const renderFolderTree = (parentId, depth) => {
      const children = getFolderChildren(parentId);
      children.forEach(f => {
        const path = getFolderPath(f);
        const row = document.createElement('div');
        row.className = 'mp-docs-folder-row mp-docs-folder-tree-row';
        row.style.paddingLeft = (depth * 18 + 8) + 'px';
        const inner = document.createElement('div');
        inner.className = 'mp-docs-folder-tree-inner';
        const hasChildren = getFolderChildren(f.id).length > 0;
        const isExpanded = localStorage.getItem('mp_docs_expanded_' + f.id) !== '0';
        const expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = 'mp-docs-folder-expand mp-docs-tt mp-docs-tt-top' + (hasChildren ? '' : ' mp-docs-folder-expand-empty');
        expandBtn.setAttribute('data-tooltip', hasChildren ? 'Expand/Collapse' : 'No subfolders');
        expandBtn.innerHTML = hasChildren ? (isExpanded ? '▼' : '▶') : '○';
        expandBtn.onclick = (e) => { e.stopPropagation(); if (!hasChildren) return; localStorage.setItem('mp_docs_expanded_' + f.id, isExpanded ? '0' : '1'); renderFolders(); };
        const b = document.createElement('button');
        const active = String(state.folder) === String(path);
        b.className = 'mp-docs-folder-btn' + (active ? ' active' : '');
        b.setAttribute('data-tooltip', path);
        b.classList.add('mp-docs-tt', 'mp-docs-tt-top');
        b.innerHTML = `<span class="mp-docs-folder-icon">📁</span><span class="mp-docs-folder-name">${String(f.name).replace(/</g,'&lt;')}</span>`;
        b.onclick = () => { state.folder = path; state.selected.clear(); state.activeId = null; if (path.includes('/')) { const parts = path.split('/'); for (let i = 1; i < parts.length; i++) { const p = getFolderByPath(parts.slice(0,i).join('/')); if (p) localStorage.setItem('mp_docs_expanded_' + p.id, '1'); } } renderAll(); };
        const actions = document.createElement('div');
        actions.className = 'mp-docs-folder-actions';
        const addSubBtn = document.createElement('button');
        addSubBtn.type = 'button';
        addSubBtn.className = 'mp-docs-folder-add-sub mp-docs-tt mp-docs-tt-top';
        addSubBtn.setAttribute('data-tooltip', 'Add subfolder');
        addSubBtn.textContent = '+';
        addSubBtn.onclick = (e) => { e.stopPropagation(); addSubfolderIn(f.id, path); };
        const isGeneral = path === 'General';
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'mp-docs-folder-del mp-docs-tt mp-docs-tt-top';
        delBtn.setAttribute('data-tooltip', 'Delete folder');
        delBtn.textContent = '×';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          const cnt = getFolderDocCount(path);
          const msg = cnt > 0 ? `Delete "${path}"? ${cnt} doc(s) → General.` : `Delete "${path}"?`;
          if (!confirm(msg)) return;
          const allPaths = getAllFolderPaths();
          const toDelete = allPaths.filter(p => p === path || p.startsWith(path + '/'));
          const folders = currentFolders().filter(x => !toDelete.includes(getFolderPath(x)));
          writeLS(LS_FOLDERS_KEY, folders);
          setDocs(getDocs().map(d => toDelete.includes(String(d?.folder || '')) ? { ...d, folder: 'General' } : d));
          if (toDelete.includes(state.folder)) state.folder = 'General';
          state.selected.clear(); state.activeId = null;
          toast('📁 Deleted');
          renderFolders();
          renderAll();
        };
        inner.appendChild(expandBtn);
        inner.appendChild(b);
        actions.appendChild(addSubBtn);
        if (!isGeneral) actions.appendChild(delBtn);
        inner.appendChild(actions);
        row.appendChild(inner);
        row.setAttribute('data-folder-path', path);
        row.classList.add('mp-docs-folder-drop-target');
        row.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; row.classList.add('mp-docs-folder-drag-over'); };
        row.ondragenter = (e) => { e.preventDefault(); row.classList.add('mp-docs-folder-drag-over'); };
        row.ondragleave = (e) => { if (!row.contains(e.relatedTarget)) row.classList.remove('mp-docs-folder-drag-over'); };
        row.ondrop = (e) => {
          e.preventDefault();
          row.classList.remove('mp-docs-folder-drag-over');
          const idsJson = e.dataTransfer.getData('application/json');
          if (!idsJson) return;
          try {
            const { ids } = JSON.parse(idsJson);
            if (!Array.isArray(ids) || !ids.length) return;
            const targetPath = row.getAttribute('data-folder-path');
            if (!targetPath) return;
            const docs = getDocs().map(d => {
              const id = String(d?.id || '');
              if (!ids.includes(id)) return d;
              if (d?.deletedAt) return d;
              return { ...(d || {}), folder: targetPath };
            });
            setDocs(docs);
            state.selected.clear();
            if (ids.includes(state.activeId)) state.activeId = null;
            toast(`📁 Moved to ${targetPath}`);
            renderAll();
          } catch {}
        };
        foldersBox.appendChild(row);
        if (hasChildren && isExpanded) renderFolderTree(f.id, depth + 1);
      });
    };

    const renderFolders = () => {
      foldersBox.innerHTML = '';
      if (state.mode === 'trash') {
        const backRow = document.createElement('div');
        backRow.className = 'mp-docs-folder-row';
        const backBtn = document.createElement('button');
        backBtn.className = 'mp-docs-folder-btn active mp-docs-folder-back';
        backBtn.innerHTML = '<span class="mp-docs-folder-icon">←</span><span class="mp-docs-folder-name">Library</span>';
        backBtn.title = 'Back to Library';
        backBtn.onclick = () => { state.mode = 'library'; state.selected.clear(); state.activeId = null; toast('📁 Library'); renderAll(); };
        backRow.appendChild(backBtn);
        foldersBox.appendChild(backRow);
        return;
      }
      const curPath = String(state.folder || 'General');
      if (curPath.includes('/')) {
        const parts = curPath.split('/');
        for (let i = 1; i < parts.length; i++) {
          const p = getFolderByPath(parts.slice(0, i).join('/'));
          if (p) localStorage.setItem('mp_docs_expanded_' + p.id, '1');
        }
      }
      renderFolderTree(null, 0);
    };

    const matchesQ = (d) => {
      const q = String(state.q || '').trim().toLowerCase();
      if (!q) return true;
      const g = typeGroup(d?.mime || d?.type || '', d?.name || '');
      const hay = [
        d?.name,
        d?.folder,
        d?.type,
        g,
        (d?.tags || []).join(' '),
        d?.notes
      ].map(x => String(x || '').toLowerCase()).join(' ');
      return hay.includes(q);
    };

    const matchesType = (d) => {
      if (state.type === 'all') return true;
      const g = typeGroup(d?.mime || d?.type || '', d?.name || '');
      return g === state.type;
    };

    const matchesTag = (d) => {
      const t = String(state.tagFilter || '').trim();
      if (!t) return true;
      const tags = Array.isArray(d?.tags) ? d.tags : [];
      return tags.map(x => String(x || '')).includes(t);
    };

    const isTrashed = (d) => {
      try { return !!(d && d.deletedAt); } catch { return false; }
    };

    const sortDocs = (arr) => {
      const a = Array.isArray(arr) ? arr.slice() : [];
      const by = state.sort;
      const nameKey = (d) => String(d?.name || '').toLowerCase();
      const dateKey = (d) => {
        const t = d?.addedAt || d?.createdAt || d?.timestamp || 0;
        const n = Date.parse(t);
        return Number.isFinite(n) ? n : (typeof t === 'number' ? t : 0);
      };
      const sizeKey = (d) => Number(d?.size || 0);
      a.sort((x,y) => {
        if (by === 'date_desc') return dateKey(y) - dateKey(x);
        if (by === 'date_asc') return dateKey(x) - dateKey(y);
        if (by === 'name_asc') return nameKey(x).localeCompare(nameKey(y));
        if (by === 'name_desc') return nameKey(y).localeCompare(nameKey(x));
        if (by === 'size_desc') return sizeKey(y) - sizeKey(x);
        if (by === 'size_asc') return sizeKey(x) - sizeKey(y);
        return 0;
      });
      return a;
    };

    const filteredDocs = () => {
      const docs = getDocs();
      if (state.mode === 'trash') {
        const trashed = docs.filter(d => isTrashed(d));
        return sortDocs(trashed.filter(d => matchesQ(d) && matchesType(d) && matchesTag(d)));
      }
      const inFolder = docs.filter(d => !isTrashed(d) && String(d?.folder || 'General') === String(state.folder));
      return sortDocs(inFolder.filter(d => matchesQ(d) && matchesType(d) && matchesTag(d)));
    };

    const setBulkEnabled = () => {
      const has = state.selected.size > 0;
      bulkDelBtn.disabled = !has;
      bulkDelBtn.style.opacity = '1';
      moveBtn.disabled = !has;
      moveBtn.style.opacity = '1';
      renameBtn.disabled = !has || state.mode === 'trash';
      renameBtn.style.opacity = '1';
      restoreBtn.disabled = !(has && state.mode === 'trash');
      restoreBtn.style.opacity = '1';
      delForeverBtn.disabled = !(has && state.mode === 'trash');
      delForeverBtn.style.opacity = '1';
      // Move/Delete are not used in Trash mode
      if (state.mode === 'trash') {
        moveBtn.disabled = true;
        bulkDelBtn.disabled = true;
      }
    };

    const renderTagsBar = () => {
      try {
        const all = getDocs().filter(d => {
          if (state.mode === 'trash') return isTrashed(d);
          return !isTrashed(d) && String(d?.folder || 'General') === String(state.folder);
        });
        const freq = {};
        all.forEach(d => {
          (Array.isArray(d?.tags) ? d.tags : []).forEach(t => {
            const k = String(t || '').trim();
            if (!k) return;
            freq[k] = (freq[k] || 0) + 1;
          });
        });
        const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, 12);
        tagsBar.innerHTML = '';

        const label = document.createElement('div');
        label.className = 'text-xs font-semibold text-gray-600 mr-1';
        label.textContent = 'TAGS';

        const allBtn = document.createElement('button');
        const activeAll = !String(state.tagFilter || '').trim();
        allBtn.className = `text-xs px-2 py-1 rounded-full border ${activeAll ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-amber-200 hover:bg-amber-50 text-gray-700'}`;
        allBtn.textContent = 'All';
        allBtn.onclick = () => { state.tagFilter = ''; renderAll(false); };

        tagsBar.appendChild(label);
        tagsBar.appendChild(allBtn);

        if (!top.length) {
          const empty = document.createElement('div');
          empty.className = 'text-xs text-gray-400 ml-2';
          empty.textContent = 'No tags yet';
          tagsBar.appendChild(empty);
          return;
        }

        top.forEach(([t, count]) => {
          const b = document.createElement('button');
          const active = String(state.tagFilter || '') === String(t);
          b.className = `text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${active ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-amber-200 hover:bg-amber-50 text-gray-700'}`;
          b.innerHTML = `<span>${String(t).replace(/</g,'&lt;')}</span><span class="opacity-70">${count}</span>`;
          b.onclick = () => { state.tagFilter = active ? '' : t; renderAll(false); };
          tagsBar.appendChild(b);
        });
      } catch {}
    };

    const renderMoveFolders = () => {
      try {
        // Move is only relevant in library mode
        moveSel.style.display = (state.mode === 'trash') ? 'none' : '';
        moveBtn.style.display = (state.mode === 'trash') ? 'none' : '';
        bulkDelBtn.style.display = (state.mode === 'trash') ? 'none' : '';
        restoreBtn.style.display = (state.mode === 'trash') ? '' : 'none';
        delForeverBtn.style.display = (state.mode === 'trash') ? '' : 'none';
        trashBtn.textContent = state.mode === 'trash' ? '← Library' : 'Trash';
        trashBtn.setAttribute('data-tooltip', state.mode === 'trash' ? '← Library' : 'Trash');

        const paths = getAllFolderPaths();
        moveSel.innerHTML = '';
        paths.forEach(p => {
          const o = document.createElement('option');
          o.value = p;
          o.textContent = p;
          moveSel.appendChild(o);
        });
        moveSel.value = state.folder;
      } catch {}
    };

    const renderList = () => {
      const docs = filteredDocs();
      list.innerHTML = '';

      const total = docs.length;
      const totalSize = docs.reduce((s,d)=>s + Number(d?.size||0), 0);
      footLeft.textContent = state.mode === 'trash'
        ? `Trash • ${total} item(s) • ${fmtBytes(totalSize)}`
        : `${total} item(s) • ${fmtBytes(totalSize)} • folder: ${state.folder}`;
      footRight.textContent = state.selected.size ? `${state.selected.size} selected` : '';

      if (!docs.length) {
        list.innerHTML = state.mode === 'trash'
          ? `<div class="mp-docs-empty">Trash is empty.</div>`
          : `<div class="mp-docs-empty">Drop files or click <strong>＋ Add</strong> to upload.</div>`;
        return;
      }

      // Grid view
      if (state.view === 'grid') {
        // Cleanup old thumb URLs
        try {
          if (state.__thumbUrls) {
            Object.values(state.__thumbUrls).forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
          }
          state.__thumbUrls = {};
        } catch {}

        list.className = 'p-3 pt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3';

        docs.forEach((d) => {
          const id = String(d?.id || '');
          const isSel = state.selected.has(id);
          const isActive = state.activeId === id;
          const mime = d?.mime || d?.type || '';
          const g = typeGroup(mime, d?.name || '');
          const icon = g === 'pdf' ? '📄' : g === 'image' ? '🖼️' : g === 'text' ? '📝' : g === 'sheet' ? '📊' : g === 'slides' ? '📽️' : g === 'archive' ? '🗜️' : '📎';

          const card = document.createElement('div');
          card.className = `mp-docs-card overflow-hidden cursor-pointer ${isActive ? 'mp-doc-selected selected' : ''}`;

          const top = document.createElement('div');
          top.className = 'relative h-28 sm:h-32 bg-amber-50 flex items-center justify-center';

          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = isSel;
          cb.className = 'absolute top-2 left-2';
          cb.onclick = (ev) => {
            ev.stopPropagation();
            if (cb.checked) state.selected.add(id); else state.selected.delete(id);
            setBulkEnabled();
            renderAll(false);
          };

          const badge = document.createElement('div');
          badge.className = 'absolute top-2 right-2 text-[11px] px-2 py-1 rounded-full bg-white/90 border border-amber-200 text-gray-700';
          badge.textContent = g.toUpperCase();

          const iconEl = document.createElement('div');
          iconEl.className = 'text-4xl';
          iconEl.textContent = icon;

          top.appendChild(cb);
          top.appendChild(badge);
          top.appendChild(iconEl);

          // Async thumbnail for images (best-effort)
          if (g === 'image') {
            (async () => {
              try {
                const rec = await dbGetBlob(String(d.id));
                if (!rec || !rec.blob) return;
                const oldUrl = state.__thumbUrls?.[id];
                if (oldUrl) { try { URL.revokeObjectURL(oldUrl); } catch {} }
                const url = URL.createObjectURL(rec.blob);
                state.__thumbUrls[id] = url;
                activeBlobUrls.push(url);
                top.innerHTML = '';
                top.appendChild(cb);
                top.appendChild(badge);
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'thumb';
                img.className = 'w-full h-full object-cover';
                top.appendChild(img);
              } catch {}
            })();
          }

          const info = document.createElement('div');
          info.className = 'p-3';
          const name = document.createElement('div');
          name.className = 'font-semibold text-sm text-gray-800 truncate';
          name.textContent = d?.name || '(no name)';
          const meta = document.createElement('div');
          meta.className = 'text-xs text-gray-500 mt-1';
          meta.textContent = `${fmtBytes(d?.size || 0)}${d?.addedAt ? ' • ' + String(d.addedAt).slice(0,10) : ''}`;
          const tags = document.createElement('div');
          tags.className = 'mt-2 flex flex-wrap gap-1';
          (Array.isArray(d?.tags) ? d.tags : []).slice(0,2).forEach(t => {
            const pill = document.createElement('span');
            pill.className = 'text-[11px] px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-900/80';
            pill.textContent = t;
            tags.appendChild(pill);
          });
          const cardActions = document.createElement('div');
          cardActions.className = 'mt-2 flex gap-1.5';
          const icoEye = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
          const icoDown = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
          const icoTrash = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
          const mkCardBtn = (ico, title, action, fn) => {
            const b = document.createElement('button');
            b.className = 'mp-docs-action-btn mp-docs-tt mp-docs-tt-top';
            b.setAttribute('data-tooltip', title);
            b.setAttribute('data-action', action);
            b.innerHTML = ico;
            b.onclick = (e) => { e.stopPropagation(); fn(); };
            return b;
          };
          cardActions.appendChild(mkCardBtn(icoEye, 'Preview', 'preview', () => { state.activeId = id; renderAll(false); renderPreview(); }));
          cardActions.appendChild(mkCardBtn(icoDown, 'Download', 'download', async () => {
            const rec = await dbGetBlob(id);
            if (rec?.blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(rec.blob); a.download = d?.name || 'document'; a.click(); URL.revokeObjectURL(a.href); toast('⬇ Downloaded'); } else toast('⚠️ No file');
          }));
          cardActions.appendChild(mkCardBtn(icoTrash, state.mode === 'trash' ? 'Delete forever' : 'Delete', 'delete', async () => {
            if (!confirm(state.mode === 'trash' ? 'Delete permanently?' : 'Move to Trash?')) return;
            if (state.mode === 'trash') { setDocs(getDocs().filter(x => String(x?.id) !== id)); await dbDelBlob(id); }
            else { const updated = getDocs().map(x => String(x?.id) === id ? { ...x, deletedAt: nowISO() } : x); setDocs(updated); }
            if (state.activeId === id) state.activeId = null;
            toast(state.mode === 'trash' ? '🗑️ Deleted' : '🗑️ Moved to Trash');
            renderAll();
          }));
          info.appendChild(name);
          info.appendChild(meta);
          info.appendChild(tags);
          info.appendChild(cardActions);

          card.appendChild(top);
          card.appendChild(info);
          card.draggable = state.mode !== 'trash';
          if (state.mode !== 'trash') {
            card.ondragstart = (e) => {
              const ids = state.selected.has(id) ? Array.from(state.selected) : [id];
              e.dataTransfer.setData('application/json', JSON.stringify({ ids }));
              e.dataTransfer.effectAllowed = 'move';
            };
          }
          card.onclick = () => { state.activeId = id; renderAll(false); renderPreview(); };
          list.appendChild(card);
        });
        return;
      }

      // List view
      list.className = 'p-3 pt-14 space-y-2';
      docs.forEach((d) => {
        const id = String(d?.id || '');
        const isSel = state.selected.has(id);
        const isActive = state.activeId === id;
        const mime = d?.mime || d?.type || '';
        const g = typeGroup(mime, d?.name || '');
        const icon = g === 'pdf' ? '📄' : g === 'image' ? '🖼️' : g === 'text' ? '📝' : g === 'sheet' ? '📊' : g === 'slides' ? '📽️' : g === 'archive' ? '🗜️' : '📎';
        const row = document.createElement('div');
        row.className = `mp-docs-card rounded-xl p-3 flex items-center gap-3 cursor-pointer ${isActive ? 'mp-doc-selected selected' : ''}`;

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isSel;
        cb.onclick = (ev) => {
          ev.stopPropagation();
          if (cb.checked) state.selected.add(id); else state.selected.delete(id);
          setBulkEnabled();
          renderAll(false);
        };

        const left = document.createElement('div');
        left.className = 'text-2xl';
        left.textContent = icon;

        const mid = document.createElement('div');
        mid.className = 'flex-1 min-w-0';
        const name = document.createElement('div');
        name.className = 'font-semibold text-sm text-gray-800 truncate';
        name.textContent = d?.name || '(no name)';
        const meta = document.createElement('div');
        meta.className = 'text-xs text-gray-500 flex flex-wrap gap-x-2 gap-y-1';
        const added = d?.addedAt ? String(d.addedAt).slice(0, 10) : '';
        const del = d?.deletedAt ? String(d.deletedAt).slice(0, 10) : '';
        meta.textContent = state.mode === 'trash'
          ? `${fmtBytes(d?.size || 0)} • ${g}${del ? ' • deleted ' + del : ''}`
          : `${fmtBytes(d?.size || 0)} • ${g}${added ? ' • ' + added : ''}`;
        mid.appendChild(name);
        mid.appendChild(meta);

        const tag = document.createElement('div');
        tag.className = 'hidden sm:flex flex-wrap gap-1 max-w-[140px] justify-end';
        (Array.isArray(d?.tags) ? d.tags : []).slice(0,3).forEach(t => {
          const pill = document.createElement('span');
          pill.className = 'text-[11px] px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-900/80';
          pill.textContent = t;
          tag.appendChild(pill);
        });

        const actions = document.createElement('div');
        actions.className = 'flex gap-1.5 flex-shrink-0';
        const icoEye = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        const icoDown = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        const icoTrash = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        const prevBtn = document.createElement('button');
        prevBtn.className = 'mp-docs-action-btn mp-docs-tt mp-docs-tt-top';
        prevBtn.setAttribute('data-tooltip', 'Preview');
        prevBtn.setAttribute('data-action', 'preview');
        prevBtn.innerHTML = icoEye;
        prevBtn.onclick = (e) => { e.stopPropagation(); state.activeId = id; renderAll(false); renderPreview(); };
        const dlBtnRow = document.createElement('button');
        dlBtnRow.className = 'mp-docs-action-btn mp-docs-tt mp-docs-tt-top';
        dlBtnRow.setAttribute('data-tooltip', 'Download');
        dlBtnRow.setAttribute('data-action', 'download');
        dlBtnRow.innerHTML = icoDown;
        dlBtnRow.onclick = async (e) => {
          e.stopPropagation();
          const rec = await dbGetBlob(id);
          if (rec?.blob) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(rec.blob);
            a.download = d?.name || 'document';
            a.click();
            URL.revokeObjectURL(a.href);
            toast('⬇ Downloaded');
          } else toast('⚠️ No file');
        };
        const delBtnRow = document.createElement('button');
        delBtnRow.className = 'mp-docs-action-btn mp-docs-tt mp-docs-tt-top';
        delBtnRow.setAttribute('data-tooltip', state.mode === 'trash' ? 'Delete forever' : 'Delete');
        delBtnRow.setAttribute('data-action', 'delete');
        delBtnRow.innerHTML = icoTrash;
        delBtnRow.onclick = async (e) => {
          e.stopPropagation();
          if (state.mode === 'trash') {
            if (!confirm('Delete permanently?')) return;
            setDocs(getDocs().filter(x => String(x?.id) !== id));
            await dbDelBlob(id);
            if (state.activeId === id) state.activeId = null;
            toast('🗑️ Deleted');
          } else {
            if (!confirm('Move to Trash?')) return;
            const updated = getDocs().map(x => String(x?.id) === id ? { ...x, deletedAt: nowISO() } : x);
            setDocs(updated);
            if (state.activeId === id) state.activeId = null;
            toast('🗑️ Moved to Trash');
          }
          renderAll();
        };

        row.appendChild(cb);
        row.appendChild(left);
        row.appendChild(mid);
        row.appendChild(tag);
        actions.appendChild(prevBtn);
        actions.appendChild(dlBtnRow);
        actions.appendChild(delBtnRow);
        row.appendChild(actions);
        row.draggable = state.mode !== 'trash';
        if (state.mode !== 'trash') {
          row.ondragstart = (e) => {
            const ids = state.selected.has(id) ? Array.from(state.selected) : [id];
            e.dataTransfer.setData('application/json', JSON.stringify({ ids }));
            e.dataTransfer.effectAllowed = 'move';
          };
        }
        row.onclick = () => { state.activeId = id; renderAll(false); renderPreview(); };
        list.appendChild(row);
      });
    };

    const renderPreview = async () => {
      if (!state.activeId) {
        if (currentPreviewUrl) { try { URL.revokeObjectURL(currentPreviewUrl); } catch {}; currentPreviewUrl = null; }
        clearPrevBtn.style.display = 'none';
        openInTabBtn.style.display = 'none';
        prevBody.innerHTML = `<div class="mp-docs-preview-empty">
          <div class="mp-docs-preview-empty-icon">📄</div>
          <div class="mp-docs-preview-empty-title">Select a document</div>
          <div class="mp-docs-preview-empty-hint">Click a document in the list to preview and edit metadata.</div>
        </div>`;
        dlBtn.disabled = true; dlBtn.style.opacity = '1';
        return;
      }
      clearPrevBtn.style.display = 'flex';
      const docs = getDocs();
      const d = docs.find(x => String(x?.id||'') === String(state.activeId));
      if (!d) {
        if (currentPreviewUrl) { try { URL.revokeObjectURL(currentPreviewUrl); } catch {}; currentPreviewUrl = null; }
        clearPrevBtn.style.display = 'none';
        openInTabBtn.style.display = 'none';
        prevBody.innerHTML = `<div class="mp-docs-preview-empty">
          <div class="mp-docs-preview-empty-icon">📄</div>
          <div class="mp-docs-preview-empty-title">Select a document</div>
          <div class="mp-docs-preview-empty-hint">Click a document in the list to preview and edit metadata.</div>
        </div>`;
        dlBtn.disabled = true; dlBtn.style.opacity = '1';
        return;
      }
      const g = typeGroup(d?.mime || d?.type || '', d?.name || '');
      prevTitle.textContent = d?.name ? `Preview — ${d.name}` : 'Preview';
      const blobRec = await dbGetBlob(String(d.id));
      if (!blobRec || !blobRec.blob) {
        if (currentPreviewUrl) { try { URL.revokeObjectURL(currentPreviewUrl); } catch {}; currentPreviewUrl = null; }
        openInTabBtn.style.display = 'none';
        prevBody.innerHTML = `<div class="mp-docs-preview-empty">
          <div class="mp-docs-preview-empty-icon">📎</div>
          <div class="mp-docs-preview-empty-title">No file stored</div>
          <div class="mp-docs-preview-empty-hint">This item has metadata only. Re-upload the file to enable preview and download.</div>
        </div>`;
        dlBtn.disabled = true; dlBtn.style.opacity = '1';
        return;
      }
      let blob = blobRec.blob;
      const mime = d?.mime || d?.type || blob?.type || '';
      if (g === 'pdf' && (!blob.type || !blob.type.includes('pdf'))) {
        try {
          const buf = await blob.arrayBuffer();
          blob = new Blob([buf], { type: 'application/pdf' });
        } catch {}
      }
      if (currentPreviewUrl) { try { URL.revokeObjectURL(currentPreviewUrl); } catch {}; currentPreviewUrl = null; }
      const url = URL.createObjectURL(blob);
      currentPreviewUrl = url;
      dlBtn.disabled = false; dlBtn.style.opacity = '1';
      dlBtn.onclick = () => {
        try{
          const a = document.createElement('a');
          a.href = url;
          a.download = d?.name || 'document';
          document.body.appendChild(a);
          a.click();
          a.remove();
        }catch{}
      };
      openInTabBtn.style.display = 'inline-flex';
      openInTabBtn.onclick = () => { try { window.open(url, '_blank'); } catch {} };
      if (g === 'pdf') {
        // continue to render controls + preview
      }
      if (g === 'image') {
        // continue
      }
      if (g === 'text') {
        // continue
      }

      // Controls (rename/move/tags/notes) + preview area
      const esc = (s) => String(s || '').replace(/</g,'&lt;').replace(/"/g,'&quot;');
      const folderPaths = getAllFolderPaths();
      const folderOptions = folderPaths.map(p => `<option value="${esc(p)}"${String(d.folder||'General')===p?' selected':''}>${esc(p)}</option>`).join('');
      const tags = Array.isArray(d?.tags) ? d.tags.map(t => String(t||'').trim()).filter(Boolean) : [];

      const typeIcons = { pdf: '📄', image: '🖼️', text: '📝', doc: '📃', sheet: '📊', slides: '📽️', archive: '📦', file: '📎' };
      const typeIcon = typeIcons[g] || '📎';
      const infoDate = d?.addedAt ? String(d.addedAt).slice(0, 10) : '';
      prevBody.innerHTML = `
        <div class="mp-docs-preview-layout">
          <div id="mp-doc-preview" class="mp-docs-preview-main"></div>
          <div class="mp-docs-preview-meta">
            <div class="mp-docs-preview-info-card">
              <span class="mp-docs-preview-type-badge">${typeIcon} ${g}</span>
              <span class="mp-docs-preview-info-item">${fmtBytes(d?.size || 0)}</span>
              ${infoDate ? `<span class="mp-docs-preview-info-item">${infoDate}</span>` : ''}
            </div>
            <details class="mp-docs-preview-details" open>
              <summary>Details & metadata</summary>
              <div class="p-3 rounded-xl border border-amber-200 bg-amber-50 mt-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <div class="text-[11px] text-gray-500 mb-1">Name</div>
                    <input id="mp-doc-name" class="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" value="${esc(d.name||'')}"/>
                  </div>
                  <div>
                    <div class="text-[11px] text-gray-500 mb-1">Folder</div>
                    <select id="mp-doc-folder" class="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 bg-white">${folderOptions}</select>
                  </div>
                </div>
                <div class="mt-2">
                  <div class="text-[11px] text-gray-500 mb-1">Tags</div>
                  <div id="mp-doc-tags" class="flex flex-wrap gap-1"></div>
                  <div class="mt-2 flex gap-2">
                    <input id="mp-doc-tag-in" class="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" placeholder="Add tag"/>
                    <button id="mp-doc-tag-add" class="px-3 py-2 text-sm rounded-lg bg-amber-500 text-white hover:opacity-90">Add</button>
                  </div>
                </div>
                <div class="mt-2">
                  <div class="text-[11px] text-gray-500 mb-1">Notes</div>
                  <textarea id="mp-doc-notes" class="w-full px-3 py-2 text-sm rounded-lg border border-amber-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-300" rows="3" placeholder="Notes...">${esc(d.notes||'')}</textarea>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button id="mp-doc-save" class="px-3 py-2 text-sm rounded-lg bg-white border border-amber-200 hover:bg-amber-50">Save</button>
                  <button id="mp-doc-quick-tag" class="px-3 py-2 text-sm rounded-lg bg-white border border-amber-200 hover:bg-amber-50">Use as filter</button>
                </div>
              </div>
            </details>
            <div class="mp-docs-preview-hint">Esc to deselect</div>
          </div>
        </div>
      `;

      const tagsBox = prevBody.querySelector('#mp-doc-tags');
      const renderTagChips = () => {
        if (!tagsBox) return;
        tagsBox.innerHTML = '';
        const cur = Array.isArray(tags) ? tags : [];
        if (!cur.length) {
          tagsBox.innerHTML = `<div class="text-xs text-gray-400">No tags</div>`;
          return;
        }
        cur.forEach((t) => {
          const chip = document.createElement('button');
          chip.className = 'text-[11px] px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-900/80 flex items-center gap-1 hover:bg-amber-50';
          chip.innerHTML = `<span>${String(t).replace(/</g,'&lt;')}</span><span class="text-gray-400">✕</span>`;
          chip.onclick = () => {
            const idx = tags.indexOf(t);
            if (idx >= 0) tags.splice(idx, 1);
            renderTagChips();
          };
          tagsBox.appendChild(chip);
        });
      };
      renderTagChips();

      const tagIn = prevBody.querySelector('#mp-doc-tag-in');
      const tagAdd = prevBody.querySelector('#mp-doc-tag-add');
      const addTag = () => {
        const v = String((tagIn && tagIn.value) || '').trim();
        if (!v) return;
        if (!tags.includes(v)) tags.push(v);
        if (tagIn) tagIn.value = '';
        renderTagChips();
      };
      if (tagAdd) tagAdd.onclick = addTag;
      if (tagIn) tagIn.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } };

      const saveBtn = prevBody.querySelector('#mp-doc-save');
      if (saveBtn) {
        saveBtn.onclick = () => {
          try {
            const newName = String((prevBody.querySelector('#mp-doc-name')||{}).value || '').trim() || (d.name || 'document');
            const newFolder = String((prevBody.querySelector('#mp-doc-folder')||{}).value || d.folder || 'General');
            const newNotes = String((prevBody.querySelector('#mp-doc-notes')||{}).value || '');
            const updated = getDocs().map(x => {
              if (String(x?.id||'') !== String(d.id)) return x;
              return { ...(x||{}), name: newName, folder: newFolder, tags: tags.slice(0, 50), notes: newNotes };
            });
            setDocs(updated);
            toast('✅ Saved');
            // If moved out of current folder, refresh view accordingly
            if (String(newFolder) !== String(state.folder)) {
              state.selected.delete(String(d.id));
              state.activeId = null;
            }
            renderAll(true);
          } catch {
            toast('⚠️ Save failed');
          }
        };
      }

      const filterBtn = prevBody.querySelector('#mp-doc-quick-tag');
      if (filterBtn) {
        filterBtn.onclick = () => {
          // If exactly one tag exists, use it; otherwise keep current filter
          if (tags.length === 1) state.tagFilter = tags[0];
          toast(state.tagFilter ? `🏷️ Filter: ${state.tagFilter}` : '🏷️ Filter: All');
          renderAll(false);
        };
      }

      const prevBox = prevBody.querySelector('#mp-doc-preview');
      if (prevBox) {
        if (g === 'image') {
          prevBox.innerHTML = `<div class="mp-docs-preview-img-wrap"><img class="mp-docs-preview-img" src="${url}" alt="preview"/></div>`;
        } else if (g === 'pdf') {
          prevBox.innerHTML = `<iframe class="mp-docs-preview-pdf" src="${url}" title="PDF preview"></iframe>`;
        } else if (g === 'text') {
          try {
            const txt = await blob.text();
            const escaped = String(txt || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            const maxLines = 500;
            const lines = escaped.split('\n');
            const show = lines.length > maxLines ? lines.slice(0, maxLines).join('\n') + '\n\n… (' + (lines.length - maxLines) + ' more lines)' : escaped;
            prevBox.innerHTML = `<div class="mp-docs-preview-text-wrap"><div class="mp-docs-preview-text-bar"><button type="button" class="mp-docs-preview-copy">Copy</button></div><pre class="mp-docs-preview-text">${show}</pre></div>`;
            const copyBtn = prevBox.querySelector('.mp-docs-preview-copy');
            if (copyBtn) copyBtn.onclick = () => { try { navigator.clipboard.writeText(txt); toast('📋 Copied'); } catch { toast('⚠️ Copy failed'); } };
          } catch {
            prevBox.innerHTML = `<div class="mp-docs-preview-no">Could not read text content</div>`;
          }
        } else {
          try {
            const txt = await blob.text();
            const hasNull = txt.includes('\0');
            const reasonableSize = txt.length < 500000;
            if (!hasNull && reasonableSize && txt.trim().length > 0) {
              const escaped = String(txt || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
              const maxLines = 300;
              const lines = escaped.split('\n');
              const show = lines.length > maxLines ? lines.slice(0, maxLines).join('\n') + '\n\n… (' + (lines.length - maxLines) + ' more lines)' : escaped;
              prevBox.innerHTML = `<div class="mp-docs-preview-text-wrap"><div class="mp-docs-preview-text-bar"><span class="text-[11px] text-amber-700">Preview as text</span><button type="button" class="mp-docs-preview-copy">Copy</button></div><pre class="mp-docs-preview-text">${show}</pre></div>`;
              const copyBtn = prevBox.querySelector('.mp-docs-preview-copy');
              if (copyBtn) copyBtn.onclick = () => { try { navigator.clipboard.writeText(txt); toast('📋 Copied'); } catch { toast('⚠️ Copy failed'); } };
            } else {
              prevBox.innerHTML = `<div class="mp-docs-preview-no">No preview available for this file type. Use Download or Open in new tab.</div>`;
            }
          } catch {
            prevBox.innerHTML = `<div class="mp-docs-preview-no">No preview available for this file type. Use Download or Open in new tab.</div>`;
          }
        }
      }
    };

    const renderAll = (doPreview = true) => {
      renderFolders();
      searchIn.value = state.q;
      typeSel.value = state.type;
      // Reflect current view mode in the button label (keep "View" visible)
      try { viewBtn.textContent = `View: ${state.view === 'grid' ? 'Grid' : 'List'}`; } catch {}
      renderTagsBar();
      renderMoveFolders();
      sortSel.value = state.sort;
      setBulkEnabled();
      renderList();
      if (doPreview) renderPreview();
    };

    // --- Events ---
    searchIn.oninput = () => { state.q = searchIn.value; renderAll(false); };
    typeSel.onchange = () => { state.type = typeSel.value; renderAll(false); };
    sortSel.onchange = () => { state.sort = sortSel.value; renderAll(false); };
    viewBtn.onclick = () => {
      state.view = (state.view === 'list') ? 'grid' : 'list';
      toast(state.view === 'list' ? '📄 View: List' : '🧩 View: Grid');
      // Re-render immediately (otherwise it updates only after other actions like selecting a file)
      try { renderAll(false); } catch {}
    };

    const showAnalytics = () => {
      try {
        const all = getDocs();
        const inFolder = all.filter(d => String(d?.folder || 'General') === String(state.folder));
        const total = inFolder.length;
        const totalSize = inFolder.reduce((s,d)=>s + Number(d?.size||0), 0);
        const byType = {};
        inFolder.forEach(d => {
          const g = typeGroup(d?.mime || d?.type || '', d?.name || '');
          byType[g] = (byType[g] || 0) + 1;
        });
        const topTypes = Object.entries(byType).sort((a,b)=>b[1]-a[1]).slice(0,8)
          .map(([k,v])=>`<div class="flex items-center justify-between text-sm"><span>${k}</span><span class="font-semibold">${v}</span></div>`)
          .join('');
        prevBody.innerHTML = `
          <div class="space-y-3">
            <div class="text-sm font-semibold text-gray-800">Analytics — ${String(state.folder)}</div>
            <div class="grid grid-cols-2 gap-2">
              <div class="p-3 rounded-xl border border-amber-200 bg-white">
                <div class="text-xs text-gray-500">Documents</div>
                <div class="text-2xl font-bold text-amber-700">${total}</div>
              </div>
              <div class="p-3 rounded-xl border border-amber-200 bg-white">
                <div class="text-xs text-gray-500">Total size</div>
                <div class="text-2xl font-bold text-amber-700">${fmtBytes(totalSize)}</div>
              </div>
            </div>
            <div class="p-3 rounded-xl border border-amber-200 bg-white">
              <div class="text-xs text-gray-500 mb-2">By type</div>
              <div class="space-y-1">${topTypes || '<div class="text-sm text-gray-500">No data</div>'}</div>
            </div>
            <div class="text-xs text-gray-500">Tip: upload PDFs/images to enable preview & download.</div>
          </div>
        `;
        dlBtn.disabled = true; dlBtn.style.opacity = '1';
        state.activeId = null;
      } catch {
        toast('⚠️ Analytics failed');
      }
    };

    analyticsBtn.onclick = showAnalytics;

    bulkDelBtn.onclick = async () => {
      const ids = Array.from(state.selected);
      if (!ids.length) return;
      // Soft-delete to Trash (safer; can restore later)
      if (!confirm(`Move ${ids.length} document(s) to Trash?`)) return;
      const docs = getDocs().map(d => {
        const id = String(d?.id || '');
        if (!state.selected.has(id)) return d;
        if (d && d.deletedAt) return d;
        return { ...(d||{}), deletedAt: nowISO() };
      });
      setDocs(docs);
      state.selected.clear();
      if (ids.includes(state.activeId)) state.activeId = null;
      toast('🗑️ Moved to Trash');
      renderAll();
    };

    restoreBtn.onclick = () => {
      const ids = Array.from(state.selected);
      if (!ids.length) return;
      const docs = getDocs();
      let firstFolder = 'General';
      const updated = docs.map(d => {
        const id = String(d?.id || '');
        if (!state.selected.has(id)) return d;
        if (firstFolder === 'General') firstFolder = String(d?.folder || 'General');
        const copy = { ...(d||{}) };
        delete copy.deletedAt;
        return copy;
      });
      setDocs(updated);
      state.selected.clear();
      if (ids.includes(state.activeId)) state.activeId = null;
      state.mode = 'library';
      state.folder = firstFolder;
      toast('✅ Restored to ' + firstFolder);
      renderAll();
    };

    delForeverBtn.onclick = async () => {
      const ids = Array.from(state.selected);
      if (!ids.length) return;
      if (!confirm(`Permanently delete ${ids.length} document(s)? This cannot be undone.`)) return;
      const docs = getDocs().filter(d => !state.selected.has(String(d?.id||'')));
      setDocs(docs);
      for (const id of ids) { try { await dbDelBlob(String(id)); } catch {} }
      state.selected.clear();
      if (ids.includes(state.activeId)) state.activeId = null;
      toast('🗑️ Deleted forever');
      renderAll();
    };

    const openBatchRename = () => {
      try {
        if (state.mode === 'trash') return;
        const ids = Array.from(state.selected || []);
        if (!ids.length) { toast('Select at least 1 document'); return; }

        const docsAll = getDocs();
        const selectedDocs = docsAll.filter(d => ids.includes(String(d?.id || '')));
        if (!selectedDocs.length) { toast('Select at least 1 document'); return; }

        const splitName = (name) => {
          const s = String(name || '');
          const i = s.lastIndexOf('.');
          if (i > 0 && i < s.length - 1) return { base: s.slice(0, i), ext: s.slice(i + 1) };
          return { base: s, ext: '' };
        };
        const padNum = (n, w) => String(n).padStart(Math.max(1, (w|0)), '0');
        const todayYMD = () => {
          try {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}${m}${dd}`;
          } catch { return String(Date.now()); }
        };

        const panelOv = document.createElement('div');
        panelOv.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;padding:16px;';

        const panel = document.createElement('div');
        panel.style.cssText = 'width:min(760px,95vw);max-height:min(80vh,720px);overflow:hidden;background:#fff;border-radius:16px;box-shadow:0 24px 80px rgba(15,23,42,0.45);border:1px solid #fde68a;border-top:4px solid #f59e0b;display:flex;flex-direction:column;';

        const head = document.createElement('div');
        head.style.cssText = 'padding:14px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #fed7aa;background:linear-gradient(135deg,#fef3c7,#fde68a);';
        const hTitle = document.createElement('div');
        hTitle.style.cssText = 'font-weight:700;color:#92400e;font-size:14px;';
        hTitle.textContent = `✍️ Batch rename (${selectedDocs.length})`;
        const x = document.createElement('button');
        x.textContent = '✕';
        x.className = 'mp-docs-tt';
        x.setAttribute('data-tooltip', 'Close');
        x.setAttribute('aria-label', 'Close');
        x.style.cssText = 'border:none;background:transparent;cursor:pointer;padding:6px 10px;border-radius:10px;color:#4b5563;font-size:14px;';
        head.appendChild(hTitle);
        head.appendChild(x);

        const body = document.createElement('div');
        body.style.cssText = 'padding:14px 16px;overflow:auto;background:#fffbeb;';

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;';

        const mkLabel = (txt) => {
          const l = document.createElement('div');
          l.style.cssText = 'font-size:11px;color:#6b7280;margin-bottom:4px;font-weight:600;';
          l.textContent = txt;
          return l;
        };
        const mkField = (label, el) => {
          const w = document.createElement('div');
          w.style.cssText = 'min-width:160px;flex:1;';
          w.appendChild(mkLabel(label));
          w.appendChild(el);
          return w;
        };
        const inputCls = 'width:100%;padding:8px 10px;border:1px solid #fde68a;border-radius:10px;background:#fff;font-size:13px;outline:none;';

        const modeSel = document.createElement('select');
        modeSel.style.cssText = inputCls;
        [
          ['overwrite','Replace name (full)'],
          ['prefix','Prefix'],
          ['suffix','Suffix'],
          ['replace','Find/Replace'],
          ['template','Template'],
        ].forEach(([v,l]) => { const o=document.createElement('option'); o.value=v; o.textContent=l; modeSel.appendChild(o); });

        const overIn = document.createElement('input'); overIn.id = 'mp-br-over'; overIn.placeholder = 'New name (e.g. Report or Report-{n})'; overIn.style.cssText = inputCls;
        const prefixIn = document.createElement('input'); prefixIn.id = 'mp-br-prefix'; prefixIn.placeholder = 'Prefix...'; prefixIn.style.cssText = inputCls;
        const suffixIn = document.createElement('input'); suffixIn.id = 'mp-br-suffix'; suffixIn.placeholder = 'Suffix...'; suffixIn.style.cssText = inputCls;
        const findIn = document.createElement('input'); findIn.id = 'mp-br-find'; findIn.placeholder = 'Find...'; findIn.style.cssText = inputCls;
        const replIn = document.createElement('input'); replIn.id = 'mp-br-repl'; replIn.placeholder = 'Replace with...'; replIn.style.cssText = inputCls;
        const tmplIn = document.createElement('input'); tmplIn.id = 'mp-br-tmpl'; tmplIn.placeholder = 'e.g. INV-{date}-{n}-{name}'; tmplIn.value = '{name}'; tmplIn.style.cssText = inputCls;
        const startIn = document.createElement('input'); startIn.id = 'mp-br-start'; startIn.type = 'number'; startIn.value = '1'; startIn.style.cssText = inputCls;
        const padIn = document.createElement('input'); padIn.id = 'mp-br-pad'; padIn.type = 'number'; padIn.value = '3'; padIn.style.cssText = inputCls;

        const keepExt = document.createElement('input'); keepExt.type = 'checkbox'; keepExt.checked = true;
        const keepExtWrap = document.createElement('label');
        keepExtWrap.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #fde68a;border-radius:10px;background:#fff;font-size:13px;color:#374151;cursor:pointer;';
        keepExtWrap.appendChild(keepExt);
        const keepExtTxt = document.createElement('span'); keepExtTxt.textContent = 'Keep extension';
        keepExtWrap.appendChild(keepExtTxt);

        const help = document.createElement('div');
        help.style.cssText = 'margin-top:10px;font-size:12px;color:#6b7280;';
        help.innerHTML = '<strong>Replace name (full)</strong> — полностью заменяет имя. Остальные режимы — добавляют к имени. Токены: <code>{name}</code>, <code>{ext}</code>, <code>{n}</code>, <code>{date}</code>';

        const previewBox = document.createElement('div');
        previewBox.style.cssText = 'margin-top:12px;border:1px solid #fde68a;border-radius:12px;background:#fff;overflow:hidden;';
        const previewHead = document.createElement('div');
        previewHead.style.cssText = 'padding:10px 12px;border-bottom:1px solid #fee2e2;font-size:12px;color:#6b7280;font-weight:600;';
        previewHead.textContent = 'Preview (first 10)';
        const previewList = document.createElement('div');
        previewList.style.cssText = 'max-height:260px;overflow:auto;';
        previewBox.appendChild(previewHead);
        previewBox.appendChild(previewList);

        const actions = document.createElement('div');
        actions.style.cssText = 'margin-top:12px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding:10px 14px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;color:#374151;font-weight:600;cursor:pointer;';
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply rename';
        applyBtn.style.cssText = 'padding:10px 14px;border-radius:12px;border:none;background:#f59e0b;color:#fff;font-weight:700;cursor:pointer;';
        actions.appendChild(cancelBtn);
        actions.appendChild(applyBtn);

        const modeRow = document.createElement('div');
        modeRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;';
        modeRow.appendChild(mkField('Mode', modeSel));
        modeRow.appendChild(mkField('Keep', keepExtWrap));

        const fieldsRow = document.createElement('div');
        fieldsRow.style.cssText = 'margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;';

        const ruleLine = document.createElement('div');
        ruleLine.style.cssText = 'margin-top:10px;font-size:12px;color:#374151;';

        const focusIfPossible = (el) => {
          try {
            if (!el || typeof el.focus !== 'function') return;
            el.focus();
            // keep caret at end if possible
            if (typeof el.selectionStart === 'number') {
              const len = String(el.value || '').length;
              el.setSelectionRange(len, len);
            }
          } catch {}
        };

        const setFields = (force = false) => {
          const m = String(modeSel.value || 'prefix');
          if (!force && fieldsRow.dataset.mode === m) return;
          // Preserve focus on mode change (detach/attach can drop it)
          let activeId = '';
          try { activeId = (document.activeElement && document.activeElement.id) ? String(document.activeElement.id) : ''; } catch {}

          fieldsRow.innerHTML = '';
          if (m === 'overwrite') { fieldsRow.appendChild(mkField('New name', overIn)); fieldsRow.appendChild(mkField('Start', startIn)); fieldsRow.appendChild(mkField('Pad', padIn)); }
          if (m === 'prefix') fieldsRow.appendChild(mkField('Prefix', prefixIn));
          if (m === 'suffix') fieldsRow.appendChild(mkField('Suffix', suffixIn));
          if (m === 'replace') { fieldsRow.appendChild(mkField('Find', findIn)); fieldsRow.appendChild(mkField('Replace', replIn)); }
          if (m === 'template') { fieldsRow.appendChild(mkField('Template', tmplIn)); fieldsRow.appendChild(mkField('Start', startIn)); fieldsRow.appendChild(mkField('Pad', padIn)); }
          fieldsRow.dataset.mode = m;

          // Restore focus (or focus the main field for this mode)
          const byId = (id) => { try { return id ? panel.querySelector('#' + CSS.escape(id)) : null; } catch { return null; } };
          const stillThere = byId(activeId);
          if (stillThere) return focusIfPossible(stillThere);
          if (m === 'overwrite') return focusIfPossible(overIn);
          if (m === 'prefix') return focusIfPossible(prefixIn);
          if (m === 'suffix') return focusIfPossible(suffixIn);
          if (m === 'replace') return focusIfPossible(findIn);
          if (m === 'template') return focusIfPossible(tmplIn);
        };

        const computeName = (doc, idx) => {
          const { base, ext } = splitName(doc?.name || '');
          const m = String(modeSel.value || 'prefix');
          let next = base;
          if (m === 'overwrite') {
            const n = Number(startIn.value || '1') + idx;
            const pad = Number(padIn.value || '3');
            const raw = String(overIn.value || '').trim() || 'document';
            next = raw
              .split('{name}').join(base)
              .split('{ext}').join(ext)
              .split('{date}').join(todayYMD())
              .split('{n}').join(padNum(n, pad));
          }
          if (m === 'prefix') next = String(prefixIn.value || '') + base;
          if (m === 'suffix') next = base + String(suffixIn.value || '');
          if (m === 'replace') {
            const f = String(findIn.value || '');
            const r = String(replIn.value || '');
            next = f ? base.split(f).join(r) : base;
          }
          if (m === 'template') {
            const n = Number(startIn.value || '1') + idx;
            const pad = Number(padIn.value || '3');
            const tok = (tmplIn.value || '{name}');
            next = String(tok)
              .split('{name}').join(base)
              .split('{ext}').join(ext)
              .split('{date}').join(todayYMD())
              .split('{n}').join(padNum(n, pad));
          }
          next = String(next || '').trim() || base || 'document';
          if (keepExt.checked && ext) {
            // keep original extension unless user typed one explicitly
            if (!next.includes('.')) next = `${next}.${ext}`;
          }
          return next;
        };

        const renderPreview = () => {
          try {
            // Do NOT rebuild fields here (that would drop focus on every keystroke).
            // Fields are rebuilt only when Mode changes.
            const max = Math.min(10, selectedDocs.length);
            const lines = [];
            for (let i = 0; i < max; i++) {
              const d = selectedDocs[i];
              const oldN = String(d?.name || '');
              const newN = computeName(d, i);
              const same = oldN === newN;
              lines.push(`<div style="padding:8px 12px;border-bottom:1px solid #fef2f2;font-size:13px;">
                <div style="color:#374151;"><strong>${oldN.replace(/</g,'&lt;')}</strong></div>
                <div style="color:${same ? '#9ca3af' : '#6b7280'};">→ ${newN.replace(/</g,'&lt;')}${same ? ' (no change yet)' : ''}</div>
              </div>`);
            }
            previewList.innerHTML = lines.join('') || '<div style="padding:10px 12px;color:#6b7280;font-size:13px;">No preview</div>';

            // Explain what changes
            const m = String(modeSel.value || 'prefix');
            const rule =
              m === 'prefix' ? `Rule: add prefix "${String(prefixIn.value||'')}"` :
              m === 'suffix' ? `Rule: add suffix "${String(suffixIn.value||'')}"` :
              m === 'replace' ? `Rule: replace "${String(findIn.value||'')}" → "${String(replIn.value||'')}"` :
              `Rule: template "${String(tmplIn.value||'')}" (start ${String(startIn.value||'1')}, pad ${String(padIn.value||'3')})`;
            ruleLine.textContent = rule;
          } catch {}
        };

        modeSel.onchange = () => { setFields(true); renderPreview(); };
        [prefixIn, suffixIn, findIn, replIn, tmplIn, startIn, padIn].forEach((el) => { try { el.oninput = renderPreview; } catch {} });
        keepExt.onchange = renderPreview;

        const closePanel = () => { try { panelOv.remove(); } catch {} };
        x.onclick = closePanel;
        cancelBtn.onclick = closePanel;
        panelOv.onclick = (e) => { if (e.target === panelOv) closePanel(); };

        applyBtn.onclick = () => {
          try {
            const idsNow = Array.from(state.selected || []);
            const docs = getDocs().map(d => {
              const id = String(d?.id || '');
              if (!idsNow.includes(id)) return d;
              const idx = idsNow.indexOf(id);
              const name = computeName(d, Math.max(0, idx));
              return { ...(d || {}), name };
            });
            setDocs(docs);
            toast('✅ Renamed');
            renderAll(true);
            closePanel();
          } catch {
            toast('⚠️ Rename failed');
          }
        };

        body.appendChild(modeRow);
        body.appendChild(fieldsRow);
        body.appendChild(help);
        body.appendChild(ruleLine);
        body.appendChild(previewBox);
        body.appendChild(actions);

        panel.appendChild(head);
        panel.appendChild(body);
        panelOv.appendChild(panel);
        document.body.appendChild(panelOv);
        setFields(true);
        renderPreview();
      } catch (e) {
        console.warn('Batch rename failed', e);
      }
    };

    renameBtn.onclick = openBatchRename;

    moveBtn.onclick = () => {
      const ids = Array.from(state.selected);
      if (!ids.length) return;
      const target = String(moveSel.value || '').trim();
      if (!target) return;
      const paths = getAllFolderPaths();
      if (!paths.includes(target)) {
        toast('⚠️ Unknown folder');
        return;
      }
      const docs = getDocs().map(d => {
        const id = String(d?.id || '');
        if (state.selected.has(id)) return { ...(d||{}), folder: target };
        return d;
      });
      setDocs(docs);
      // Keep selection; update current view if user moved out of current folder
      if (target !== state.folder) {
        state.selected.clear();
        state.activeId = null;
      }
      toast(`📁 Moved to ${target}`);
      renderAll();
    };

    trashBtn.onclick = () => {
      state.mode = (state.mode === 'trash') ? 'library' : 'trash';
      state.selected.clear();
      state.activeId = null;
      // Trash view is global; ignore folder selection while in trash
      toast(state.mode === 'trash' ? '🗑️ Trash' : '📁 Library');
      renderAll();
    };

    const doAddFolderAtRoot = (name) => {
      const folders = currentFolders();
      if (folders.some(f => getFolderPath(f) === name)) {
        toast('⚠️ Folder already exists');
        return;
      }
      folders.push({ id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2), name, parentId: null });
      writeLS(LS_FOLDERS_KEY, folders);
      state.folder = name;
      toast('📁 Folder created');
      renderFolders();
      renderAll(false);
    };
    newFolderBtn.onclick = () => showNewFolderPopup({ title: 'New folder', placeholder: 'Folder name', onOk: doAddFolderAtRoot });
    newFolderHeaderBtn.onclick = () => showNewFolderPopup({ title: 'New folder', placeholder: 'Folder name', onOk: doAddFolderAtRoot });

    addBtn.onclick = () => { try { fileIn.click(); } catch {} };
    importBtn.onclick = () => { try { importIn.click(); } catch {} };
    exportBtn.onclick = () => {
      try{
        const payload = { folders: currentFolders(), documents: getDocs(), exportedAt: nowISO(), version: 1 };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mainpro_documents_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        try { URL.revokeObjectURL(url); } catch {}
        toast('📤 Exported');
      }catch(e){
        toast('⚠️ Export failed');
      }
    };

    importIn.onchange = async () => {
      const f = importIn.files && importIn.files[0];
      importIn.value = '';
      if (!f) return;
      try{
        const txt = await f.text();
        const payload = safeJsonParse(txt, null);
        if (!payload || !Array.isArray(payload.documents)) throw new Error('Invalid export');
        if (Array.isArray(payload.folders)) {
          const migrated = payload.folders.map(f => f.parentId === undefined ? { ...f, parentId: null } : f);
          writeLS(LS_FOLDERS_KEY, migrated);
        }
        setDocs(payload.documents);
        toast('📥 Imported');
        renderAll();
      }catch{
        toast('⚠️ Import failed');
      }
    };

    const handleFiles = async (files) => {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      if (state.mode === 'trash') {
        toast('⚠️ Upload is disabled in Trash. Switch back to Library.');
        return;
      }
      const folderPath = String(state.folder || 'General');
      const ensureFolderPath = (path) => {
        if (getAllFolderPaths().includes(path)) return;
        const parts = String(path || '').split('/').filter(Boolean);
        let parentId = null;
        for (let i = 0; i < parts.length; i++) {
          const p = parts.slice(0, i + 1).join('/');
          const existing = getFolderByPath(p);
          if (existing) {
            parentId = existing.id;
          } else {
            const folders = currentFolders();
            const fid = 'f_' + Date.now() + '_' + i + '_' + Math.random().toString(36).slice(2);
            folders.push({ id: fid, name: parts[i], parentId });
            writeLS(LS_FOLDERS_KEY, folders);
            parentId = fid;
          }
        }
      };
      ensureFolderPath(folderPath);
      const docs = getDocs();
      let added = 0;
      for (const file of arr) {
        const id = genId();
        const mime = file.type || '';
        const doc = {
          id,
          name: file.name || 'untitled',
          folder: folderPath,
          size: file.size || 0,
          mime,
          addedAt: nowISO(),
          tags: [],
          notes: '',
        };
        // Deduplicate (best-effort) by hash if small enough; otherwise skip hashing.
        try {
          if (file.size <= 15 * 1024 * 1024) {
            const h = await sha256(file);
            if (h) {
              doc.sha256 = h;
              const dup = docs.find(d => d && d.sha256 && d.sha256 === h);
              if (dup) {
                toast(`⚠️ Duplicate skipped: ${file.name}`);
                continue;
              }
            }
          }
        } catch {}
        try { await dbPutBlob(id, file); } catch (e) {
          toast('⚠️ Storage full? Saved metadata only.');
        }
        docs.push(doc);
        added++;
      }
      setDocs(docs);
      toast(`✅ Added ${added} file(s)`);
      renderAll();
    };

    fileIn.onchange = async () => {
      const files = Array.from(fileIn.files || []);
      fileIn.value = '';
      await handleFiles(files);
    };

    // Drag & drop onto list area
    const prevent = (e) => { try { e.preventDefault(); e.stopPropagation(); } catch {} };
    [listWrap, modal].forEach((el) => {
      el.addEventListener('dragenter', prevent);
      el.addEventListener('dragover', prevent);
      el.addEventListener('drop', async (e) => {
        prevent(e);
        const files = e.dataTransfer ? e.dataTransfer.files : null;
        await handleFiles(files);
      });
    });

    function open() {
      overlay.style.display = 'flex';
      renderAll();
      // Show preview column if wide enough
      try {
        const w = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        preview.style.display = (w >= 1024) ? 'flex' : 'none';
      } catch {}
      try {
        if (!window.__mpDocsSimpleKeyBound) {
          window.__mpDocsSimpleKeyBound = true;
          window.addEventListener('keydown', (e) => {
            try {
              if (e.key !== 'Escape') return;
              if (overlay.style.display !== 'flex') return;
              if (state.activeId) {
                state.activeId = null;
                renderAll(true);
                e.preventDefault();
              } else {
                close();
              }
            } catch {}
          });
        }
      } catch {}
    }
    function close() {
      revokeBlobUrls();
      overlay.style.display = 'none';
    }

    overlay.addEventListener('click', (e)=>{
      if (e.target === overlay) close();
    });
    closeBtn.addEventListener('click', close);

    window.openSimpleDocsModal = open;
    window.closeSimpleDocsModal = close;

    // MainProDocs API for Task Modal attachments (link existing docs)
    // Safe orphan blob cleanup — deletes blobs NOT referenced by any event.attachments
    async function cleanupOrphanBlobs() {
      const usedDocIds = new Set();
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mainpro_calendar_')) {
            const raw = localStorage.getItem(key) || '[]';
            const events = safeJsonParse(raw, []);
            if (Array.isArray(events)) {
              events.forEach(ev => {
                const atts = ev?.attachments || ev?.extendedProps?.attachments || [];
                atts.forEach(a => {
                  const id = a?.docId || a?.id;
                  if (id) usedDocIds.add(String(id));
                });
              });
            }
          }
        }
        ['mainpro_events_v60', 'mainpro_events_v70'].forEach(k => {
          const raw = localStorage.getItem(k) || '[]';
          const events = safeJsonParse(raw, []);
          if (Array.isArray(events)) {
            events.forEach(ev => {
              const atts = ev?.attachments || ev?.extendedProps?.attachments || [];
              atts.forEach(a => {
                const id = a?.docId || a?.id;
                if (id) usedDocIds.add(String(id));
              });
            });
          }
        });
        getDocs().forEach(d => { if (d?.id) usedDocIds.add(String(d.id)); }); // docs in library
      } catch (e) {
        console.warn('cleanupOrphanBlobs: failed to collect used docIds', e);
        return;
      }
      const db = await openDb();
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const keys = await new Promise((resolve, reject) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error || new Error('getAllKeys failed'));
      });
      for (const key of keys) {
        if (!usedDocIds.has(String(key))) {
          store.delete(key);
          console.log('Deleted orphan blob:', key);
        }
      }
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => { try { db.close(); } catch {}; resolve(); };
        tx.onerror = () => { try { db.close(); } catch {}; reject(tx.error); };
      });
    }

    window.mainproCleanupStorage = async function () {
      await cleanupOrphanBlobs();
      alert('Storage cleanup completed');
    };

    window.MainProDocs = {
      listMeta: function () {
        try {
          const docs = getDocs().filter(d => !d?.deletedAt);
          return docs.map(d => ({
            docId: d.id,
            id: d.id,
            name: d.name || 'untitled',
            folder: String(d?.folder || 'General'),
            mime: d.mime || d.type || '',
            size: Number(d?.size || 0),
            addedAt: d.addedAt || '',
            tags: Array.isArray(d.tags) ? d.tags : [],
            notes: String(d?.notes || '')
          }));
        } catch { return []; }
      },
      openDocById: async function (docId) {
        try {
          const v = await dbGetBlob(docId);
          if (!v || !v.blob) return;
          const url = URL.createObjectURL(v.blob);
          window.open(url, '_blank');
          setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 60000);
        } catch {}
      },
      openDocsModalAtDoc: function (docId) {
        try {
          open();
          if (docId && state) state.activeId = docId;
        } catch {}
      }
    };
  } catch (e) {
    console.error('Simple Documents modal init failed', e);
  }
})();

