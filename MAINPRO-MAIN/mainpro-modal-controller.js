/**
 * MainPro — shared modal open/close controller (exclusive overlays).
 * React windows register via init; window.open*Modal APIs stay for header / legacy scripts.
 */

import { showToast } from './src/modules/utils.js';

export const MAINPRO_MODAL_ID = {
  SETTINGS: 'settings',
  LOGIN: 'login',
  AI_CHAT: 'aiChat',
  TEMPLATES: 'templates',
  ADD_TASK: 'addTask',
  DOCUMENTS_REACT: 'documentsReact',
  DOCUMENTS_SIMPLE: 'documentsSimple',
};

const registry = new Map();

let suppressUntil = 0;
const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const lastCallAt = Object.create(null);

/** @type {() => object} */
let getApi = () => ({});

/** @type {() => boolean} */
let isDebug = () => false;

export function mainProFlushSync(fn) {
  try {
    const rd = typeof ReactDOM !== 'undefined' ? ReactDOM : window.ReactDOM;
    if (rd && typeof rd.flushSync === 'function') rd.flushSync(fn);
    else fn();
  } catch {
    try {
      fn();
    } catch (_) {}
  }
}

export function mainProModalShouldDedupe(key, ms = 250) {
  const t = now();
  if (t - (lastCallAt[key] || 0) < ms) return true;
  lastCallAt[key] = t;
  return false;
}

function closeNonRegisteredOverlays() {
  try {
    if (typeof window.closeSimpleAuthModal === 'function') window.closeSimpleAuthModal();
  } catch (_) {}
  try {
    if (typeof window.closeSimpleAIChatModal === 'function') window.closeSimpleAIChatModal();
  } catch (_) {}
  try {
    if (typeof window.closeSimpleDocsModal === 'function') window.closeSimpleDocsModal();
  } catch (_) {}
  try {
    document.querySelectorAll('.mp-add-overlay').forEach((el) => {
      try {
        el.remove();
      } catch (_) {}
    });
  } catch (_) {}
}

/**
 * Close every registered modal + DOM fallbacks, except one id (if passed).
 */
export function mainProModalCloseOthers(exceptId) {
  for (const [id, rec] of registry) {
    if (exceptId && id === exceptId) continue;
    try {
      if (rec.close) rec.close();
    } catch (_) {}
  }
  if (!exceptId || exceptId !== MAINPRO_MODAL_ID.DOCUMENTS_SIMPLE) {
    try {
      if (typeof window.closeSimpleDocsModal === 'function') window.closeSimpleDocsModal();
    } catch (_) {}
  }
  try {
    if (typeof window.closeSimpleAuthModal === 'function') window.closeSimpleAuthModal();
  } catch (_) {}
  try {
    if (typeof window.closeSimpleAIChatModal === 'function') window.closeSimpleAIChatModal();
  } catch (_) {}
  if (!exceptId || exceptId !== MAINPRO_MODAL_ID.ADD_TASK) {
    try {
      document.querySelectorAll('.mp-add-overlay').forEach((el) => {
        try {
          el.remove();
        } catch (_) {}
      });
    } catch (_) {}
  }
}

export function mainProModalCloseAll() {
  mainProModalCloseOthers(null);
}

/** Call before opening DOM Add Task (v74) so only one main overlay stack is active. */
export function mainProModalNotifyExclusiveDomAddTask() {
  mainProModalCloseOthers(MAINPRO_MODAL_ID.ADD_TASK);
}

function hasModalWithText(needle) {
  try {
    return Array.from(document.querySelectorAll('[data-mp-modal]')).some((m) =>
      String(m.textContent || '').includes(needle)
    );
  } catch {
    return false;
  }
}

function ensureFallbackHelpers() {
  if (window.__mainproDomModalHelpers) return;
  window.__mainproDomModalHelpers = true;

  const mkOverlay = (id) => {
    const existing = document.getElementById(id);
    if (existing) return existing;
    const ov = document.createElement('div');
    ov.id = id;
    ov.className = 'fixed inset-0 bg-black/40 flex items-center justify-center p-4 mp-overlay-anim';
    ov.setAttribute('data-mp-overlay', '1');
    ov.style.zIndex = '99999';
    document.body.appendChild(ov);
    return ov;
  };

  const mkPanel = (title) => {
    const panel = document.createElement('div');
    panel.className =
      'modal-enter modal-ready bg-white w-full max-w-md rounded-2xl p-0 shadow-xl border border-amber-200 overflow-hidden';
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
    x.className =
      'text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/50 transition-colors flex-shrink-0 tooltip-bottom';
    x.setAttribute('data-tooltip', 'Close');
    x.setAttribute('aria-label', 'Close');
    head.appendChild(h);
    head.appendChild(x);
    panel.appendChild(head);
    return { panel, closeBtn: x };
  };

  window.openSimpleAuthModal =
    window.openSimpleAuthModal ||
    function () {
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
      const close = () => {
        try {
          ov.remove();
        } catch (_) {}
      };
      closeBtn.onclick = close;
      ov.onclick = (e) => {
        if (e.target === ov) close();
      };
      const loginBtn = panel.querySelector('#mp-dom-auth-login');
      if (loginBtn) {
        loginBtn.onclick = () => {
          try {
            if (typeof window.mainProSetAuth === 'function') {
              window.mainProSetAuth({
                name: 'Demo User',
                email: (panel.querySelector('#mp-dom-auth-email') || {}).value || 'demo@mainpro.com',
              });
            }
          } catch (_) {}
          close();
        };
      }
      const signupBtn = panel.querySelector('#mp-dom-auth-signup');
      if (signupBtn) {
        signupBtn.onclick = () => {
          try {
            if (typeof showToast === 'function') showToast('📝 Sign Up (demo)');
          } catch (_) {}
        };
      }
      window.closeSimpleAuthModal = close;
    };

  window.openSimpleAIChatModal =
    window.openSimpleAIChatModal ||
    function () {
      const ov = mkOverlay('mp-dom-chat');
      ov.innerHTML = '';
      const { panel, closeBtn } = mkPanel('🤖 MainPro AI Assistant');
      panel.className =
        'modal-enter modal-ready bg-white w-full max-w-2xl rounded-2xl p-0 shadow-xl h-[600px] flex flex-col border border-amber-200 overflow-hidden';
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
      const close = () => {
        try {
          ov.remove();
        } catch (_) {}
      };
      closeBtn.onclick = close;
      ov.onclick = (e) => {
        if (e.target === ov) close();
      };
      const logEl = panel.querySelector('#mp-dom-chat-log');
      const inEl = panel.querySelector('#mp-dom-chat-in');
      const send = () => {
        const txt = inEl && inEl.value ? String(inEl.value).trim() : '';
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
          a.className =
            'px-3 py-2 rounded-2xl text-sm border border-amber-200 bg-white text-gray-700 max-w-[85%]';
          a.textContent = '(offline demo) Add an API key in Settings to enable AI.';
          aWrap.appendChild(a);
          logEl.appendChild(aWrap);
          logEl.scrollTop = logEl.scrollHeight;
        }
      };
      const sendBtn = panel.querySelector('#mp-dom-chat-send');
      if (sendBtn) sendBtn.onclick = send;
      if (inEl)
        inEl.onkeydown = (e) => {
          if (e.key === 'Enter') send();
        };
      window.closeSimpleAIChatModal = close;
    };
}

function ensureReactOrFallback(type) {
  if (type === 'settings') return;
  const needle =
    type === 'login' ? 'Login to MainPro' : type === 'chat' ? 'MainPro AI Assistant' : '';
  const openFallback =
    type === 'login'
      ? () => {
          ensureFallbackHelpers();
          window.openSimpleAuthModal();
        }
      : type === 'chat'
        ? () => {
            ensureFallbackHelpers();
            window.openSimpleAIChatModal();
          }
        : null;
  setTimeout(() => {
    try {
      if (!needle || !openFallback) return;
      if (hasModalWithText(needle)) return;
      openFallback();
    } catch (_) {}
  }, 480);
}

function registerDefaults() {
  registry.clear();

  registry.set(MAINPRO_MODAL_ID.SETTINGS, {
    dedupeKey: 'settings',
    open: () => {
      const a = getApi();
      try {
        if (isDebug()) console.log('[MainPro] openSettingsModal()', { stack: new Error('settings-click').stack });
      } catch (_) {}
      try {
        a.setOpenSettings(true);
      } catch (_) {}
      setTimeout(() => {
        try {
          a.setOpenSettings(true);
        } catch (_) {}
      }, 0);
    },
    close: () => {
      try {
        getApi().setOpenSettings(false);
      } catch (_) {}
    },
    toast: '⚙️ Settings',
    openedAtKey: 'settings',
    suppressAfterOpenMs: 800,
  });

  registry.set(MAINPRO_MODAL_ID.LOGIN, {
    dedupeKey: 'login',
    guard: () => {
      if (now() < suppressUntil) {
        if (isDebug())
          try {
            console.log('[MainPro] openLoginModal blocked (suppressUntil)', {
              inMs: Math.round(suppressUntil - now()),
            });
          } catch (_) {}
        return false;
      }
      return true;
    },
    open: () => {
      const a = getApi();
      suppressUntil = now() + 400;
      try {
        window.__mainproModalOpenedAt = window.__mainproModalOpenedAt || {};
        window.__mainproModalOpenedAt.login = Date.now();
      } catch (_) {}
      try {
        a.setOpenSettings(false);
      } catch (_) {}
      try {
        a.setShowAIChat(false);
      } catch (_) {}
      try {
        a.setAuthMode('login');
      } catch (_) {}
      try {
        a.setShowAuthModal(true);
      } catch (_) {}
      setTimeout(() => {
        try {
          a.setShowAuthModal(true);
        } catch (_) {}
      }, 0);
      setTimeout(() => {
        try {
          a.setShowAuthModal(true);
        } catch (_) {}
      }, 80);
      try {
        if (typeof showToast === 'function') showToast('🔐 Login');
      } catch (_) {}
      if (isDebug()) try {
        console.log('[MainPro] openLoginModal()');
      } catch (_) {}
      ensureReactOrFallback('login');
    },
    close: () => {
      try {
        getApi().setShowAuthModal(false);
      } catch (_) {}
    },
  });

  registry.set(MAINPRO_MODAL_ID.AI_CHAT, {
    dedupeKey: 'chat',
    guard: () => {
      if (now() < suppressUntil) {
        if (isDebug())
          try {
            console.log('[MainPro] openAIChatModal blocked (suppressUntil)', {
              inMs: Math.round(suppressUntil - now()),
            });
          } catch (_) {}
        return false;
      }
      return true;
    },
    open: () => {
      const a = getApi();
      suppressUntil = now() + 400;
      try {
        window.__mainproModalOpenedAt = window.__mainproModalOpenedAt || {};
        window.__mainproModalOpenedAt.chat = Date.now();
      } catch (_) {}
      try {
        a.setOpenSettings(false);
      } catch (_) {}
      try {
        a.setShowAuthModal(false);
      } catch (_) {}
      try {
        a.setShowAIChat(true);
      } catch (_) {}
      setTimeout(() => {
        try {
          a.setShowAIChat(true);
        } catch (_) {}
      }, 0);
      setTimeout(() => {
        try {
          a.setShowAIChat(true);
        } catch (_) {}
      }, 80);
      try {
        if (typeof showToast === 'function') showToast('💬 AI Chat');
      } catch (_) {}
      if (isDebug()) try {
        console.log('[MainPro] openAIChatModal()');
      } catch (_) {}
      ensureReactOrFallback('chat');
    },
    close: () => {
      try {
        getApi().setShowAIChat(false);
      } catch (_) {}
    },
  });

  registry.set(MAINPRO_MODAL_ID.TEMPLATES, {
    dedupeKey: 'templates',
    open: () => {
      try {
        getApi().setShowTemplates(true);
      } catch (_) {}
    },
    close: () => {
      try {
        getApi().setShowTemplates(false);
      } catch (_) {}
    },
  });

  registry.set(MAINPRO_MODAL_ID.ADD_TASK, {
    open: () => {
      try {
        getApi().setShowAdd(true);
      } catch (_) {}
    },
    close: () => {
      try {
        getApi().setShowAdd(false);
      } catch (_) {}
    },
  });

  registry.set(MAINPRO_MODAL_ID.DOCUMENTS_REACT, {
    open: () => {
      try {
        getApi().setDmShow(true);
      } catch (_) {}
    },
    close: () => {
      try {
        getApi().setDmShow(false);
      } catch (_) {}
    },
  });

  registry.set(MAINPRO_MODAL_ID.DOCUMENTS_SIMPLE, {
    open: () => {
      try {
        if (typeof window.openSimpleDocsModal === 'function') window.openSimpleDocsModal();
      } catch (_) {}
    },
    close: () => {
      try {
        if (typeof window.closeSimpleDocsModal === 'function') window.closeSimpleDocsModal();
      } catch (_) {}
    },
  });
}

/**
 * Open a registered modal: closes all others first (single modal policy).
 * @param {string} id MAINPRO_MODAL_ID.*
 * @returns {boolean} whether open ran (false if deduped / guarded)
 */
export function mainProModalOpen(id) {
  const rec = registry.get(id);
  if (!rec || typeof rec.open !== 'function') return false;
  if (rec.guard && rec.guard() === false) return false;
  if (rec.dedupeKey && mainProModalShouldDedupe(rec.dedupeKey)) {
    if (isDebug()) try {
      console.log('[MainPro] mainProModalOpen blocked (dedupe)', id);
    } catch (_) {}
    return false;
  }

  mainProModalCloseOthers(id);

  try {
    rec.open();
  } catch (e) {
    console.warn('[MainPro] mainProModalOpen failed:', id, e);
    if (id === MAINPRO_MODAL_ID.LOGIN) {
      try {
        ensureFallbackHelpers();
        if (typeof window.openSimpleAuthModal === 'function') window.openSimpleAuthModal();
      } catch (_) {}
    }
    if (id === MAINPRO_MODAL_ID.AI_CHAT) {
      try {
        ensureFallbackHelpers();
        if (typeof window.openSimpleAIChatModal === 'function') window.openSimpleAIChatModal();
      } catch (_) {}
    }
    return false;
  }

  if (rec.suppressAfterOpenMs != null) suppressUntil = now() + rec.suppressAfterOpenMs;
  if (rec.toast) {
    try {
      if (typeof showToast === 'function') showToast(rec.toast);
    } catch (_) {}
  }
  if (rec.openedAtKey) {
    try {
      window.__mainproModalOpenedAt = window.__mainproModalOpenedAt || {};
      window.__mainproModalOpenedAt[rec.openedAtKey] = Date.now();
    } catch (_) {}
  }

  return true;
}

export function mainProModalClose(id) {
  const rec = registry.get(id);
  if (!rec || !rec.close) return;
  try {
    rec.close();
  } catch (_) {}
}

function bindHeaderRouter() {
  if (window.__mainproHeaderRouterBound) return;
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
    let best = null;
    let bestArea = Infinity;
    for (const b of candidates) {
      const r = b.getBoundingClientRect();
      if (!inRect(x, y, r)) continue;
      const area = Math.max(0, r.width) * Math.max(0, r.height);
      if (area < bestArea) {
        best = b;
        bestArea = area;
      }
    }
    return best;
  };

  const handler = (e) => {
    try {
      if (document.querySelector('[data-mp-overlay]')) return;

      const directBtn = e.target && e.target.closest ? e.target.closest('button') : null;
      const directLabel = directBtn ? labelOfBtn(directBtn) : '';
      const btn =
        directBtn &&
        (directLabel === LABELS.settings ||
          directLabel === LABELS.chat ||
          directLabel === LABELS.login)
          ? directBtn
          : findHeaderButtonAtPoint(e.clientX, e.clientY);
      if (!btn) return;

      const lab = labelOfBtn(btn);
      if (isDebug()) try {
        console.log('[MainPro] header router hit', lab);
      } catch (_) {}

      if (lab === LABELS.settings && typeof window.openSettingsModal === 'function') {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        window.openSettingsModal();
      } else if (lab === LABELS.chat && typeof window.openAIChatModal === 'function') {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        window.openAIChatModal();
      } else if (lab === LABELS.login && typeof window.openLoginModal === 'function') {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        window.openLoginModal();
      }
    } catch (err) {
      console.warn('[MainPro] header router failed:', err);
    }
  };

  document.addEventListener('click', handler, true);
  window.__mainproHeaderRouterHandler = handler;
}

/**
 * @param {{ getApi: () => object, isDebug?: () => boolean }} opts
 * getApi must return latest React setters (ref.current each render).
 */
export function initMainProModalController(opts) {
  getApi = typeof opts.getApi === 'function' ? opts.getApi : () => ({});
  isDebug = typeof opts.isDebug === 'function' ? opts.isDebug : () => false;

  registerDefaults();

  window.__mainproModalApiBound = true;
  window.openSettingsModal = () => mainProModalOpen(MAINPRO_MODAL_ID.SETTINGS);
  window.openAIChatModal = () => mainProModalOpen(MAINPRO_MODAL_ID.AI_CHAT);
  window.openLoginModal = () => mainProModalOpen(MAINPRO_MODAL_ID.LOGIN);
  window.openNetworkModal = window.openSettingsModal;
  window.mainProModalOpen = mainProModalOpen;
  window.mainProModalCloseAll = mainProModalCloseAll;
  window.mainProModalCloseOthers = mainProModalCloseOthers;
  window.mainProModalClose = mainProModalClose;

  bindHeaderRouter();

  return () => {
    try {
      const h = window.__mainproHeaderRouterHandler;
      if (h) document.removeEventListener('click', h, true);
    } catch (_) {}
    try {
      window.__mainproHeaderRouterHandler = null;
      window.__mainproHeaderRouterBound = false;
    } catch (_) {}
    try {
      delete window.openSettingsModal;
      delete window.openAIChatModal;
      delete window.openLoginModal;
      delete window.openNetworkModal;
      delete window.mainProModalOpen;
      delete window.mainProModalCloseAll;
      delete window.mainProModalCloseOthers;
      delete window.mainProModalClose;
    } catch (_) {}
    try {
      window.__mainproModalApiBound = false;
    } catch (_) {}
    registry.clear();
  };
}
