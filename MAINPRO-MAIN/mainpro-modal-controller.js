/**
 * MainPro ModalController – skeleton and modal helpers
 * STABILITY LOCK: UI only; no business logic.
 */
(function () {
  'use strict';

  function withSkeleton(showSkeleton, hideSkeleton, delayMs, callback) {
    if (typeof showSkeleton === 'function') showSkeleton(true);
    var t = setTimeout(function () {
      if (typeof hideSkeleton === 'function') hideSkeleton(false);
      if (typeof callback === 'function') callback();
    }, delayMs == null ? 80 : delayMs);
    return function cancel() { clearTimeout(t); };
  }

  window.MainProModalController = {
    withSkeleton: withSkeleton
  };
})();
