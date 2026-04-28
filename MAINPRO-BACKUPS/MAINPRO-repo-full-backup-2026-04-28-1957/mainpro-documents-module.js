/**
 * MainPro — Documents windows: open/close wiring (shared modal controller).
 * Document Manager UI and DocumentManager state stay in app / DocumentManager.js.
 */

import { MAINPRO_MODAL_ID, mainProModalOpen, mainProModalClose } from './mainpro-modal-controller.js';

/**
 * Open simple Documents modal (window.openSimpleDocsModal) via controller; fallback to direct call on error.
 * @returns {boolean} false if script not loaded
 */
export function mainProDocumentsOpenSimple() {
  if (typeof window.openSimpleDocsModal !== 'function') return false;
  try {
    mainProModalOpen(MAINPRO_MODAL_ID.DOCUMENTS_SIMPLE);
  } catch (_) {
    try {
      window.openSimpleDocsModal();
    } catch (_) {}
  }
  return true;
}

/** Close simple Documents modal via controller. */
export function mainProDocumentsCloseSimple() {
  mainProModalClose(MAINPRO_MODAL_ID.DOCUMENTS_SIMPLE);
}

/** Open React Document Manager overlay via controller. */
export function mainProDocumentsOpenReact() {
  mainProModalOpen(MAINPRO_MODAL_ID.DOCUMENTS_REACT);
}

/** Close React Document Manager via controller. */
export function mainProDocumentsCloseReact() {
  mainProModalClose(MAINPRO_MODAL_ID.DOCUMENTS_REACT);
}

/**
 * Close React Documents with optional overlay animation (backdrop / ✕).
 * @param {(fn: () => void, e?: unknown) => void} [mpCloseWithAnim]
 * @param {unknown} [e]
 */
export function mainProDocumentsCloseReactWithAnim(mpCloseWithAnim, e) {
  if (typeof mpCloseWithAnim === 'function') {
    mpCloseWithAnim(() => mainProModalClose(MAINPRO_MODAL_ID.DOCUMENTS_REACT), e);
  } else {
    mainProModalClose(MAINPRO_MODAL_ID.DOCUMENTS_REACT);
  }
}
