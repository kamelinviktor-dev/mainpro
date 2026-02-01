// documentsStore.js — загрузка/сохранение документов и папок (mainpro_folders, mainpro_documents)

var DocumentsStore = (function() {

  var DEFAULT_FOLDERS = [
    { id: 1, name: 'General' },
    { id: 2, name: 'RAMS' },
    { id: 3, name: 'Certificates' },
    { id: 4, name: 'Contracts' }
  ];

  var DM_MAX_STORED_DATAURL_CHARS = 200000;

  function safeParse(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function stripLargeUrls(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map(function(d) {
      try {
        var url = d && d.url;
        if (typeof url === 'string' && url.indexOf('data:') === 0 && url.length > DM_MAX_STORED_DATAURL_CHARS) {
          return Object.assign({}, d, { url: null, urlStripped: true });
        }
      } catch (e) {}
      return d;
    });
  }

  function loadFolders() {
    var saved = safeParse('mainpro_folders', []);
    if (!saved.length) {
      try {
        localStorage.setItem('mainpro_folders', JSON.stringify(DEFAULT_FOLDERS));
      } catch (e) {}
      return DEFAULT_FOLDERS;
    }
    return saved;
  }

  function loadDocuments() {
    var parsed = safeParse('mainpro_documents', []);
    if (!Array.isArray(parsed)) return [];
    return stripLargeUrls(parsed);
  }

  function saveFolders(folders) {
    try {
      localStorage.setItem('mainpro_folders', JSON.stringify(folders));
    } catch (e) {}
  }

  function saveDocuments(docs) {
    try {
      var safe = stripLargeUrls(Array.isArray(docs) ? docs : []);
      localStorage.setItem('mainpro_documents', JSON.stringify(safe));
    } catch (e) {}
  }

  window.DocumentsStore = {
    DEFAULT_FOLDERS: DEFAULT_FOLDERS,
    DM_MAX_STORED_DATAURL_CHARS: DM_MAX_STORED_DATAURL_CHARS,
    loadFolders: loadFolders,
    loadDocuments: loadDocuments,
    saveFolders: saveFolders,
    saveDocuments: saveDocuments,
    stripLargeUrls: stripLargeUrls
  };

})();
