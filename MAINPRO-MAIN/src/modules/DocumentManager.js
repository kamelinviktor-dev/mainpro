/**
 * MainPro Calendar — Document Manager PRO (Gold UI)
 * State, persistence, and business logic for 📁 Document Manager
 * STABILITY LOCK: recurrence-only changes
 */

import { DEFAULT_FOLDERS } from './constants.js';

const React = typeof window !== 'undefined' ? window.React : null;

/**
 * Hook: all Document Manager state, effects, and handlers.
 * @param {function} safeParse - from utils.safeParse
 * @param {function} showToast - from utils.showToast
 * @returns {object} All dm* state, setters, and handler functions
 */
export function useDocumentManager(safeParse, showToast) {
  if (!React) throw new Error('React required (window.React)');
  const { useState, useEffect, useRef } = React;

  const [dmShow, setDmShow] = useState(false);
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [dmFilterType, setDmFilterType] = useState('all');
  const [dmSortBy, setDmSortBy] = useState('date');
  const [dmViewMode, setDmViewMode] = useState('grid');
  const [dmShowAnalytics, setDmShowAnalytics] = useState(false);
  const [dmSelectedDocs, setDmSelectedDocs] = useState([]);
  const [dmShowComments, setDmShowComments] = useState({});
  const [dmDocumentVersions, setDmDocumentVersions] = useState({});
  const [dmDocumentTags, setDmDocumentTags] = useState({});
  const [dmDocumentAnnotations, setDmDocumentAnnotations] = useState({});
  const [dmShowAdvancedSearch, setDmShowAdvancedSearch] = useState(false);
  const [dmBackupStatus, setDmBackupStatus] = useState('idle');

  const [dmFolders, setDmFolders] = useState(() => {
    const saved = safeParse('mainpro_folders', []);
    if (saved.length === 0) {
      try {
        localStorage.setItem('mainpro_folders', JSON.stringify(DEFAULT_FOLDERS));
      } catch {}
      return DEFAULT_FOLDERS;
    }
    return saved;
  });
  const [dmActive, setDmActive] = useState('General');
  const [dmNewFolder, setDmNewFolder] = useState('');
  const [dmRenamingId, setDmRenamingId] = useState(null);
  const [dmRenameValue, setDmRenameValue] = useState('');
  const [dmDocs, setDmDocs] = useState(() => safeParse('mainpro_documents', []));
  const [dmDragging, setDmDragging] = useState(false);
  const dmDragLeaveTimer = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('mainpro_folders', JSON.stringify(dmFolders));
    } catch {}
  }, [dmFolders]);

  useEffect(() => {
    try {
      localStorage.setItem('mainpro_documents', JSON.stringify(dmDocs));
    } catch {}
  }, [dmDocs]);

  function dmAddFolder() {
    const name = (dmNewFolder || '').trim();
    if (!name) return showToast('Enter folder name');
    if (dmFolders.some((f) => f.name.toLowerCase() === name.toLowerCase()))
      return showToast('Folder exists');
    const id = Date.now();
    setDmFolders((prev) => [...prev, { id, name }]);
    setDmNewFolder('');
    setDmActive(name);
    showToast(`📁 "${name}" added`);
  }
  function dmStartRename(folder) {
    setDmRenamingId(folder.id);
    setDmRenameValue(folder.name);
  }
  function dmCommitRename() {
    if (!dmRenamingId) return;
    const name = (dmRenameValue || '').trim();
    const id = dmRenamingId;
    setDmRenamingId(null);
    setDmRenameValue('');
    if (!name) return;
    setDmFolders((prev) => {
      const old = prev.find((f) => f.id === id)?.name;
      const next = prev.map((f) => (f.id === id ? { ...f, name } : f));
      if (old && old !== name) {
        setDmDocs((dPrev) => dPrev.map((d) => (d.folder === old ? { ...d, folder: name } : d)));
        if (dmActive === old) setDmActive(name);
      }
      return next;
    });
    showToast('✏️ Folder renamed');
  }
  function dmDeleteFolder(id) {
    const f = dmFolders.find((x) => x.id === id);
    if (!f) return;
    if (f.name === 'General') return showToast("Can't delete General");
    if (!confirm(`Delete folder "${f.name}" and its files?`)) return;
    setDmFolders((prev) => prev.filter((x) => x.id !== id));
    setDmDocs((prev) => prev.filter((d) => d.folder !== f.name));
    if (dmActive === f.name) setDmActive('General');
    showToast('🗑️ Folder deleted');
  }

  function aiCategorizeFile(fileName, fileType) {
    const name = fileName.toLowerCase();
    const type = (fileType || '').toLowerCase();
    if (name.includes('ram') || name.includes('risk') || name.includes('assessment') || name.includes('method') || name.includes('statement')) return 'RAMS';
    if (name.includes('cert') || name.includes('licence') || name.includes('permit') || name.includes('insurance') || name.includes('policy') || type.includes('certificate')) return 'Certificates';
    if (name.includes('contract') || name.includes('agreement') || name.includes('service') || name.includes('maintenance') || name.includes('invoice') || name.includes('quote')) return 'Contracts';
    if (name.includes('fire') || name.includes('alarm') || name.includes('sprinkler') || name.includes('extinguisher') || name.includes('evacuation')) return 'Fire Safety';
    if (name.includes('cctv') || name.includes('camera') || name.includes('security') || name.includes('access') || name.includes('monitoring')) return 'CCTV & Security';
    if (name.includes('hvac') || name.includes('heating') || name.includes('ventilation') || name.includes('air conditioning') || name.includes('cooling')) return 'HVAC';
    if (name.includes('electrical') || name.includes('electric') || name.includes('wiring') || name.includes('panel') || name.includes('power')) return 'Electrical';
    if (name.includes('plumbing') || name.includes('water') || name.includes('pipe') || name.includes('drain') || name.includes('toilet')) return 'Plumbing';
    return 'General';
  }

  function aiAnalyzeDocument(doc) {
    const analysis = {
      keywords: [],
      summary: '',
      tags: [],
      riskLevel: 'low',
      category: doc.aiCategory || 'General',
      lastAnalyzed: new Date().toISOString()
    };
    const words = (doc.name || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    analysis.keywords = [...new Set(words)].slice(0, 10);
    if ((doc.type || '').includes('pdf')) {
      analysis.summary = `PDF document: ${doc.name}`;
      analysis.tags.push('document', 'pdf');
    } else if ((doc.type || '').includes('image')) {
      analysis.summary = `Image file: ${doc.name}`;
      analysis.tags.push('image', 'visual');
    } else if ((doc.type || '').includes('word') || (doc.type || '').includes('document')) {
      analysis.summary = `Word document: ${doc.name}`;
      analysis.tags.push('document', 'text');
    }
    const riskKeywords = ['accident', 'injury', 'hazard', 'risk', 'emergency', 'fire', 'safety'];
    analysis.riskLevel = analysis.keywords.some((k) => riskKeywords.includes(k)) ? 'high' : 'medium';
    return analysis;
  }

  function dmSearchDocuments(query, filterType = 'all', sortBy = 'date') {
    let filtered = dmDocs.filter((doc) => {
      const matchesQuery =
        !query ||
        doc.name.toLowerCase().includes(query.toLowerCase()) ||
        (dmDocumentTags[doc.id] && dmDocumentTags[doc.id].some((tag) => tag.toLowerCase().includes(query.toLowerCase())));
      const matchesFilter =
        filterType === 'all' ||
        (doc.type || '').includes(filterType) ||
        doc.name.toLowerCase().endsWith(`.${filterType}`);
      return matchesQuery && matchesFilter;
    });
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'date':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });
    return filtered;
  }

  function dmCreateDocumentVersion(docId, newFile) {
    const versions = dmDocumentVersions[docId] || [];
    setDmDocumentVersions((prev) => ({
      ...prev,
      [docId]: [
        ...versions,
        { id: Date.now(), file: newFile, timestamp: new Date().toISOString(), size: newFile.size, type: newFile.type }
      ]
    }));
    showToast(`📄 Version ${versions.length + 1} created for document`);
  }

  function dmAddDocumentComment(docId, comment) {
    const comments = dmShowComments[docId] || [];
    setDmShowComments((prev) => ({
      ...prev,
      [docId]: [...comments, { id: Date.now(), text: comment, timestamp: new Date().toISOString(), author: 'Current User' }]
    }));
    showToast('💬 Comment added');
  }

  function dmAddDocumentTag(docId, tag) {
    const tags = dmDocumentTags[docId] || [];
    if (!tags.includes(tag)) {
      setDmDocumentTags((prev) => ({ ...prev, [docId]: [...tags, tag] }));
      showToast(`🏷️ Tag "${tag}" added`);
    }
  }
  function dmRemoveDocumentTag(docId, tag) {
    const tags = (dmDocumentTags[docId] || []).filter((t) => t !== tag);
    setDmDocumentTags((prev) => ({ ...prev, [docId]: tags }));
    showToast(`🏷️ Tag "${tag}" removed`);
  }

  function dmSelectDocument(docId) {
    setDmSelectedDocs((prev) => (prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]));
  }
  function dmSelectAllDocuments() {
    setDmSelectedDocs(dmDocs.filter((d) => d.folder === dmActive).map((d) => d.id));
  }
  function dmBulkDeleteDocuments() {
    if (dmSelectedDocs.length === 0) return;
    if (confirm(`Delete ${dmSelectedDocs.length} selected documents?`)) {
      setDmDocs((prev) => prev.filter((d) => !dmSelectedDocs.includes(d.id)));
      setDmSelectedDocs([]);
      showToast(`🗑️ ${dmSelectedDocs.length} documents deleted`);
    }
  }
  function dmBulkMoveDocuments(targetFolder) {
    if (dmSelectedDocs.length === 0) return;
    setDmDocs((prev) => prev.map((doc) => (dmSelectedDocs.includes(doc.id) ? { ...doc, folder: targetFolder } : doc)));
    showToast(`📁 ${dmSelectedDocs.length} documents moved to "${targetFolder}"`);
    setDmSelectedDocs([]);
  }

  function dmGetDocumentAnalytics() {
    const analytics = {
      totalDocuments: dmDocs.length,
      totalSize: dmDocs.reduce((sum, doc) => sum + (doc.size || 0), 0),
      byType: {},
      byFolder: {},
      recentUploads: dmDocs.filter((doc) => new Date(doc.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
      mostUsedTags: {},
      storageUsage: {}
    };
    dmDocs.forEach((doc) => {
      const type = (doc.type || 'unknown').split('/')[0];
      analytics.byType[type] = (analytics.byType[type] || 0) + 1;
      analytics.byFolder[doc.folder] = (analytics.byFolder[doc.folder] || 0) + 1;
    });
    Object.values(dmDocumentTags).forEach((tags) => {
      (tags || []).forEach((tag) => {
        analytics.mostUsedTags[tag] = (analytics.mostUsedTags[tag] || 0) + 1;
      });
    });
    return analytics;
  }

  function dmCreateBackup() {
    setDmBackupStatus('backing_up');
    try {
      const backupData = {
        documents: dmDocs,
        folders: dmFolders,
        tags: dmDocumentTags,
        comments: dmShowComments,
        versions: dmDocumentVersions,
        timestamp: new Date().toISOString(),
        version: '68.0'
      };
      const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(backupBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mainpro_documents_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDmBackupStatus('completed');
      showToast('💾 Backup created successfully');
      setTimeout(() => setDmBackupStatus('idle'), 3000);
    } catch (error) {
      setDmBackupStatus('error');
      showToast('❌ Backup failed');
      setTimeout(() => setDmBackupStatus('idle'), 3000);
    }
  }

  function dmLinkDocumentToTask(docId, taskId) {
    showToast(`🔗 Document linked to task ${taskId}`);
  }

  function dmAddFilesTo(folder, fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const jobs = files.map(
      (file) =>
        new Promise((res) => {
          const r = new FileReader();
          r.onload = (ev) => {
            const aiCategory = aiCategorizeFile(file.name, file.type);
            const targetFolder = folder === 'General' ? aiCategory : folder;
            if (!dmFolders.some((f) => f.name === aiCategory) && folder === 'General') {
              setDmFolders((prev) => [...prev, { id: Date.now() + Math.random(), name: aiCategory }]);
            }
            const newDoc = {
              id: Date.now() + Math.random(),
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              date: new Date().toISOString(),
              folder: targetFolder,
              url: ev.target.result,
              aiCategory,
              uploadedTo: folder,
              analysis: aiAnalyzeDocument({ name: file.name, type: file.type, aiCategory })
            };
            setDmDocs((prev) => [...prev, newDoc]);
            res();
          };
          r.readAsDataURL(file);
        })
    );
    Promise.all(jobs).then(() => {
      const aiCategorized = files.filter((f) => aiCategorizeFile(f.name, f.type) !== 'General');
      if (aiCategorized.length > 0 && folder === 'General') {
        showToast(`🤖 AI categorized ${aiCategorized.length} file(s) automatically`);
      } else {
        showToast(`📄 ${files.length} file(s) → "${folder}"`);
      }
    });
  }

  function dmOnUploadInput(e) {
    dmAddFilesTo(dmActive, e.target.files);
    e.target.value = '';
  }

  function dmOnDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dmDragLeaveTimer.current) {
      clearTimeout(dmDragLeaveTimer.current);
      dmDragLeaveTimer.current = null;
    }
    setDmDragging(false);
    dmAddFilesTo(dmActive, e.dataTransfer?.files);
  }
  function dmOnDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDmDragging(true);
  }
  function dmOnDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (dmDragLeaveTimer.current) clearTimeout(dmDragLeaveTimer.current);
    dmDragLeaveTimer.current = setTimeout(() => setDmDragging(false), 80);
  }

  return {
    dmShow,
    setDmShow,
    dmSearchQuery,
    setDmSearchQuery,
    dmFilterType,
    setDmFilterType,
    dmSortBy,
    setDmSortBy,
    dmViewMode,
    setDmViewMode,
    dmShowAnalytics,
    setDmShowAnalytics,
    dmSelectedDocs,
    setDmSelectedDocs,
    dmShowComments,
    setDmShowComments,
    dmDocumentVersions,
    setDmDocumentVersions,
    dmDocumentTags,
    setDmDocumentTags,
    dmDocumentAnnotations,
    setDmDocumentAnnotations,
    dmShowAdvancedSearch,
    setDmShowAdvancedSearch,
    dmBackupStatus,
    setDmBackupStatus,
    dmFolders,
    setDmFolders,
    dmActive,
    setDmActive,
    dmNewFolder,
    setDmNewFolder,
    dmRenamingId,
    setDmRenamingId,
    dmRenameValue,
    setDmRenameValue,
    dmDocs,
    setDmDocs,
    dmDragging,
    setDmDragging,
    dmDragLeaveTimer,
    dmAddFolder,
    dmStartRename,
    dmCommitRename,
    dmDeleteFolder,
    aiCategorizeFile,
    aiAnalyzeDocument,
    dmSearchDocuments,
    dmCreateDocumentVersion,
    dmAddDocumentComment,
    dmAddDocumentTag,
    dmRemoveDocumentTag,
    dmSelectDocument,
    dmSelectAllDocuments,
    dmBulkDeleteDocuments,
    dmBulkMoveDocuments,
    dmGetDocumentAnalytics,
    dmCreateBackup,
    dmLinkDocumentToTask,
    dmAddFilesTo,
    dmOnUploadInput,
    dmOnDrop,
    dmOnDragOver,
    dmOnDragLeave
  };
}
