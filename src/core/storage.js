/**
 * MainPro StorageService - safe localStorage wrapper for mainpro_* keys
 */
(function() {
  function get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  var StorageService = {
    get: get,
    set: set,
    remove: remove,
    getJSON: getJSON,
    setJSON: setJSON
  };

  window.MainPro = window.MainPro || {};
  window.MainPro.storage = StorageService;

  window.loadJSON = getJSON;
  window.saveJSON = setJSON;
})();
