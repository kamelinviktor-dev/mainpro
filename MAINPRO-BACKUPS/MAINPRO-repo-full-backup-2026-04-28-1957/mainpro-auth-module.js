/**
 * MainPro — Login/Auth modal: visibility + mode state and handlers (shared modal controller).
 * Auth UI stays in mainpro-app.js; this module isolates modal shell state and open/close wiring.
 */

import {
  MAINPRO_MODAL_ID,
  mainProModalOpen,
  mainProModalClose,
  mainProModalCloseOthers,
} from './mainpro-modal-controller.js';

/** Open Login via shared modal controller (closes other modals, sets mode to login). */
export function mainProAuthOpenLogin() {
  mainProModalOpen(MAINPRO_MODAL_ID.LOGIN);
}

/** Close auth modal via shared modal controller. */
export function mainProAuthClose() {
  mainProModalClose(MAINPRO_MODAL_ID.LOGIN);
}

/**
 * Close auth modal with optional overlay animation helper (matches Settings pattern).
 * @param {(fn: () => void, e?: unknown) => void} [mpCloseWithAnim]
 * @param {unknown} [e]
 */
export function mainProAuthCloseWithAnim(mpCloseWithAnim, e) {
  if (typeof mpCloseWithAnim === 'function') {
    mpCloseWithAnim(() => mainProModalClose(MAINPRO_MODAL_ID.LOGIN), e);
  } else {
    mainProModalClose(MAINPRO_MODAL_ID.LOGIN);
  }
}

/**
 * Auth modal visibility and mode (`login` | `signup` | `profile`).
 * @param {{ useState: typeof import('react').useState; useCallback: typeof import('react').useCallback }} ReactNS
 */
export function useMainProAuthModal(ReactNS) {
  const { useState, useCallback } = ReactNS;
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  /** Open auth in a given mode after closing other stacked modals (profile / non-controller entry). */
  const openAuthAs = useCallback((mode) => {
    try {
      mainProModalCloseOthers(MAINPRO_MODAL_ID.LOGIN);
    } catch (_) {}
    setAuthMode(mode);
    setShowAuthModal(true);
  }, []);

  return {
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    openAuthAs,
  };
}
