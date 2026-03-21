/**
 * MainPro — Add Task modal: React visibility bridge + shared modal controller.
 * When `showAdd` is true, mainpro-app opens DOM Add Task v74 in an effect, then clears `showAdd`.
 * Task form UI / save logic stays in mainpro-app.js and external scripts.
 */

import {
  MAINPRO_MODAL_ID,
  mainProModalOpen,
  mainProModalClose,
  mainProModalNotifyExclusiveDomAddTask,
} from './mainpro-modal-controller.js';

/** Close Add Task (React flag) via shared modal controller. */
export function mainProAddTaskClose() {
  mainProModalClose(MAINPRO_MODAL_ID.ADD_TASK);
}

/**
 * Open Add Task through the controller: closes other modals, then sets `showAdd` (→ effect may open v74 DOM).
 */
export function mainProAddTaskOpen() {
  mainProModalOpen(MAINPRO_MODAL_ID.ADD_TASK);
}

/**
 * Clear other overlays/modals before calling `window.openAddTaskModal` directly (DOM path).
 */
export function mainProAddTaskPrepareDomOpen() {
  mainProModalNotifyExclusiveDomAddTask();
}

/**
 * @param {{ useState: typeof import('react').useState }} ReactNS
 */
export function useMainProAddTaskModal(ReactNS) {
  const { useState } = ReactNS;
  const [showAdd, setShowAdd] = useState(false);
  return { showAdd, setShowAdd };
}
