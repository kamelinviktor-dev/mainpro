/**
 * MainPro — Settings modal: state + open/close wiring (uses shared modal controller).
 * Settings panel UI stays in mainpro-app.js; this module isolates visibility/tab state and handlers.
 */

import { MAINPRO_MODAL_ID, mainProModalOpen, mainProModalClose } from './mainpro-modal-controller.js';

/** Open Settings via shared modal controller (closes other modals first). */
export function mainProSettingsOpen() {
  mainProModalOpen(MAINPRO_MODAL_ID.SETTINGS);
}

/** Close Settings via shared modal controller. */
export function mainProSettingsClose() {
  mainProModalClose(MAINPRO_MODAL_ID.SETTINGS);
}

/**
 * Same as closing Settings, with optional overlay animation helper used elsewhere in the app.
 * @param {(fn: () => void, e?: unknown) => void} [mpCloseWithAnim]
 * @param {unknown} [e]
 */
export function mainProSettingsCloseWithAnim(mpCloseWithAnim, e) {
  if (typeof mpCloseWithAnim === 'function') {
    mpCloseWithAnim(() => mainProModalClose(MAINPRO_MODAL_ID.SETTINGS), e);
  } else {
    mainProModalClose(MAINPRO_MODAL_ID.SETTINGS);
  }
}

/**
 * Modal visibility + active tab for the Settings window.
 * @param {{ useState: typeof import('react').useState }} ReactNS
 */
export function useMainProSettingsModal(ReactNS) {
  const { useState } = ReactNS;
  const [openSettings, setOpenSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');

  return {
    openSettings,
    setOpenSettings,
    settingsTab,
    setSettingsTab,
  };
}
