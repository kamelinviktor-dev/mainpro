/**
 * MainPro — Task Templates modal: visibility + open/close wiring (shared modal controller).
 * Template list / edit UI stays in mainpro-app.js.
 */

import { MAINPRO_MODAL_ID, mainProModalOpen, mainProModalClose } from './mainpro-modal-controller.js';

/** Open Templates modal via shared modal controller. */
export function mainProTemplatesOpen() {
  mainProModalOpen(MAINPRO_MODAL_ID.TEMPLATES);
}

/** Close Templates modal via shared modal controller. */
export function mainProTemplatesClose() {
  mainProModalClose(MAINPRO_MODAL_ID.TEMPLATES);
}

/**
 * Close with optional overlay animation helper (backdrop / ✕).
 * @param {(fn: () => void, e?: unknown) => void} [mpCloseWithAnim]
 * @param {unknown} [e]
 */
export function mainProTemplatesCloseWithAnim(mpCloseWithAnim, e) {
  if (typeof mpCloseWithAnim === 'function') {
    mpCloseWithAnim(() => mainProModalClose(MAINPRO_MODAL_ID.TEMPLATES), e);
  } else {
    mainProModalClose(MAINPRO_MODAL_ID.TEMPLATES);
  }
}

/**
 * @param {{ useState: typeof import('react').useState }} ReactNS
 */
export function useMainProTemplatesModal(ReactNS) {
  const { useState } = ReactNS;
  const [showTemplates, setShowTemplates] = useState(false);
  return { showTemplates, setShowTemplates };
}
