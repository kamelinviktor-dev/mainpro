/**
 * MainPro — AI Chat modal: visibility + open/close wiring (shared modal controller).
 * Chat messages/input and in-modal UI stay in mainpro-app.js.
 */

import { MAINPRO_MODAL_ID, mainProModalOpen, mainProModalClose } from './mainpro-modal-controller.js';

/** Open AI Chat via shared modal controller. */
export function mainProAIChatOpen() {
  mainProModalOpen(MAINPRO_MODAL_ID.AI_CHAT);
}

/** Close AI Chat via shared modal controller. */
export function mainProAIChatClose() {
  mainProModalClose(MAINPRO_MODAL_ID.AI_CHAT);
}

/**
 * Close with optional overlay animation helper (backdrop / ✕).
 * @param {(fn: () => void, e?: unknown) => void} [mpCloseWithAnim]
 * @param {unknown} [e]
 */
export function mainProAIChatCloseWithAnim(mpCloseWithAnim, e) {
  if (typeof mpCloseWithAnim === 'function') {
    mpCloseWithAnim(() => mainProModalClose(MAINPRO_MODAL_ID.AI_CHAT), e);
  } else {
    mainProModalClose(MAINPRO_MODAL_ID.AI_CHAT);
  }
}

/**
 * @param {{ useState: typeof import('react').useState }} ReactNS
 */
export function useMainProAIChatModal(ReactNS) {
  const { useState } = ReactNS;
  const [showAIChat, setShowAIChat] = useState(false);
  return { showAIChat, setShowAIChat };
}
