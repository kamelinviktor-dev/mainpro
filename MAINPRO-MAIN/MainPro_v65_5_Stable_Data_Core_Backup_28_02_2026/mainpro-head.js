// PWA Manifest (only load if not file:// protocol)
(function () {
  try {
    if (window.location.protocol !== 'file:') {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head.appendChild(link);
    }
  } catch {}
})();
