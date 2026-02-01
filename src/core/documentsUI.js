// documentsUI.js — UI-логика документов (dmAddFolder, dmAddFilesTo, aiCategorizeFile, aiAnalyzeDocument)

(function() {

  function aiCategorizeFile(fileName, fileType) {
    var name = (fileName || '').toLowerCase();
    var type = (fileType || '').toLowerCase();
    if (name.indexOf('ram') >= 0 || name.indexOf('risk') >= 0 || name.indexOf('assessment') >= 0 ||
        name.indexOf('method') >= 0 || name.indexOf('statement') >= 0) return 'RAMS';
    if (name.indexOf('cert') >= 0 || name.indexOf('licence') >= 0 || name.indexOf('permit') >= 0 ||
        name.indexOf('insurance') >= 0 || name.indexOf('policy') >= 0 || type.indexOf('certificate') >= 0) return 'Certificates';
    if (name.indexOf('contract') >= 0 || name.indexOf('agreement') >= 0 || name.indexOf('service') >= 0 ||
        name.indexOf('maintenance') >= 0 || name.indexOf('invoice') >= 0 || name.indexOf('quote') >= 0) return 'Contracts';
    if (name.indexOf('fire') >= 0 || name.indexOf('alarm') >= 0 || name.indexOf('sprinkler') >= 0 ||
        name.indexOf('extinguisher') >= 0 || name.indexOf('evacuation') >= 0) return 'Fire Safety';
    if (name.indexOf('cctv') >= 0 || name.indexOf('camera') >= 0 || name.indexOf('security') >= 0 ||
        name.indexOf('access') >= 0 || name.indexOf('monitoring') >= 0) return 'CCTV & Security';
    if (name.indexOf('hvac') >= 0 || name.indexOf('heating') >= 0 || name.indexOf('ventilation') >= 0 ||
        name.indexOf('air conditioning') >= 0 || name.indexOf('cooling') >= 0) return 'HVAC';
    if (name.indexOf('electrical') >= 0 || name.indexOf('electric') >= 0 || name.indexOf('wiring') >= 0 ||
        name.indexOf('panel') >= 0 || name.indexOf('power') >= 0) return 'Electrical';
    if (name.indexOf('plumbing') >= 0 || name.indexOf('water') >= 0 || name.indexOf('pipe') >= 0 ||
        name.indexOf('drain') >= 0 || name.indexOf('toilet') >= 0) return 'Plumbing';
    return 'General';
  }

  function aiAnalyzeDocument(doc) {
    var analysis = {
      keywords: [],
      summary: '',
      tags: [],
      riskLevel: 'low',
      category: (doc && doc.aiCategory) ? doc.aiCategory : 'General',
      lastAnalyzed: new Date().toISOString()
    };
    var words = (doc && doc.name ? doc.name : '').toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(function(w) { return w.length > 3; });
    analysis.keywords = words.filter(function(v, i, a) { return a.indexOf(v) === i; }).slice(0, 10);
    if ((doc && doc.type || '').indexOf('pdf') >= 0) {
      analysis.summary = 'PDF document: ' + (doc.name || '');
      analysis.tags.push('document', 'pdf');
    } else if ((doc && doc.type || '').indexOf('image') >= 0) {
      analysis.summary = 'Image file: ' + (doc.name || '');
      analysis.tags.push('image', 'visual');
    } else if ((doc && doc.type || '').indexOf('word') >= 0 || (doc && doc.type || '').indexOf('document') >= 0) {
      analysis.summary = 'Word document: ' + (doc.name || '');
      analysis.tags.push('document', 'text');
    }
    var riskKeywords = ['accident', 'injury', 'hazard', 'risk', 'emergency', 'fire', 'safety'];
    analysis.riskLevel = analysis.keywords.some(function(k) { return riskKeywords.indexOf(k) >= 0; }) ? 'high' : 'medium';
    return analysis;
  }

  function dmAddFolder(ctx) {
    var name = (ctx.dmNewFolder || '').trim();
    if (!name) return ctx.showToast('Enter folder name');
    if (ctx.dmFolders.some(function(f) { return f.name.toLowerCase() === name.toLowerCase(); })) return ctx.showToast('Folder exists');
    var id = Date.now();
    ctx.setDmFolders(function(prev) { return prev.concat([{ id: id, name: name }]); });
    ctx.setDmNewFolder('');
    ctx.setDmActive(name);
    ctx.showToast('📁 "' + name + '" added');
  }

  function dmAddFilesTo(folder, fileList, ctx) {
    var files = Array.from(fileList || []);
    if (!files.length) return;
    var DM_MAX_EMBED_BYTES = 1024 * 1024;
    var skippedLarge = 0;

    var jobs = files.map(function(file) {
      return new Promise(function(res) {
        if (((file && file.size) || 0) > DM_MAX_EMBED_BYTES) {
          skippedLarge++;
          var aiCategory = aiCategorizeFile(file.name, file.type);
          var targetFolder = folder === 'General' ? aiCategory : folder;
          if (!ctx.dmFolders.some(function(f) { return f.name === aiCategory; }) && folder === 'General') {
            ctx.setDmFolders(function(prev) { return prev.concat([{ id: Date.now() + Math.random(), name: aiCategory }]); });
          }
          var newDoc = {
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            date: new Date().toISOString(),
            folder: targetFolder,
            url: null,
            urlStripped: true,
            tooLarge: true,
            aiCategory: aiCategory,
            uploadedTo: folder,
            analysis: aiAnalyzeDocument({ name: file.name, type: file.type, aiCategory: aiCategory })
          };
          ctx.setDmDocs(function(prev) { return prev.concat([newDoc]); });
          return res();
        }
        var r = new FileReader();
        r.onload = function(ev) {
          var aiCategory = aiCategorizeFile(file.name, file.type);
          var targetFolder = folder === 'General' ? aiCategory : folder;
          if (!ctx.dmFolders.some(function(f) { return f.name === aiCategory; }) && folder === 'General') {
            ctx.setDmFolders(function(prev) { return prev.concat([{ id: Date.now() + Math.random(), name: aiCategory }]); });
          }
          var newDoc = {
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            date: new Date().toISOString(),
            folder: targetFolder,
            url: ev.target.result,
            aiCategory: aiCategory,
            uploadedTo: folder,
            analysis: aiAnalyzeDocument({ name: file.name, type: file.type, aiCategory: aiCategory })
          };
          ctx.setDmDocs(function(prev) { return prev.concat([newDoc]); });
          res();
        };
        r.readAsDataURL(file);
      });
    });

    Promise.all(jobs).then(function() {
      var aiCategorized = files.filter(function(f) { return aiCategorizeFile(f.name, f.type) !== 'General'; });
      if (aiCategorized.length > 0 && folder === 'General') {
        ctx.showToast('🤖 AI categorized ' + aiCategorized.length + ' file(s) automatically');
      } else {
        ctx.showToast('📄 ' + files.length + ' file(s) → "' + folder + '"');
      }
      if (skippedLarge > 0) {
        ctx.showToast('⚠️ ' + skippedLarge + ' file(s) too large (>1MB) — saved without content to avoid crashes');
      }
    });
  }

  window.DocumentsUI = {
    dmAddFolder: dmAddFolder,
    dmAddFilesTo: dmAddFilesTo,
    aiCategorizeFile: aiCategorizeFile,
    aiAnalyzeDocument: aiAnalyzeDocument
  };

})();
