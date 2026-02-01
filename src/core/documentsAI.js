// documentsAI.js — aiCategorizeFile, aiAnalyzeDocument

(function() {

  function aiCategorizeFile(fileName, fileType) {
    const name = fileName.toLowerCase();
    const type = fileType.toLowerCase();

    // RAMS Documents
    if (name.includes('ram') || name.includes('risk') || name.includes('assessment') ||
        name.includes('method') || name.includes('statement')) {
      return 'RAMS';
    }

    // Certificates
    if (name.includes('cert') || name.includes('licence') || name.includes('permit') ||
        name.includes('insurance') || name.includes('policy') || type.includes('certificate')) {
      return 'Certificates';
    }

    // Contracts
    if (name.includes('contract') || name.includes('agreement') || name.includes('service') ||
        name.includes('maintenance') || name.includes('invoice') || name.includes('quote')) {
      return 'Contracts';
    }

    // Fire Safety
    if (name.includes('fire') || name.includes('alarm') || name.includes('sprinkler') ||
        name.includes('extinguisher') || name.includes('evacuation')) {
      return 'Fire Safety';
    }

    // CCTV & Security
    if (name.includes('cctv') || name.includes('camera') || name.includes('security') ||
        name.includes('access') || name.includes('monitoring')) {
      return 'CCTV & Security';
    }

    // HVAC
    if (name.includes('hvac') || name.includes('heating') || name.includes('ventilation') ||
        name.includes('air conditioning') || name.includes('cooling')) {
      return 'HVAC';
    }

    // Electrical
    if (name.includes('electrical') || name.includes('electric') || name.includes('wiring') ||
        name.includes('panel') || name.includes('power')) {
      return 'Electrical';
    }

    // Plumbing
    if (name.includes('plumbing') || name.includes('water') || name.includes('pipe') ||
        name.includes('drain') || name.includes('toilet')) {
      return 'Plumbing';
    }

    // Default to General
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

    // Extract keywords from filename
    const words = doc.name.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3);

    analysis.keywords = [...new Set(words)].slice(0, 10);

    // Generate summary based on file type and name
    if (doc.type.includes('pdf')) {
      analysis.summary = `PDF document: ${doc.name}`;
      analysis.tags.push('document', 'pdf');
    } else if (doc.type.includes('image')) {
      analysis.summary = `Image file: ${doc.name}`;
      analysis.tags.push('image', 'visual');
    } else if (doc.type.includes('word') || doc.type.includes('document')) {
      analysis.summary = `Word document: ${doc.name}`;
      analysis.tags.push('document', 'text');
    }

    // Risk assessment based on keywords
    const riskKeywords = ['accident', 'injury', 'hazard', 'risk', 'emergency', 'fire', 'safety'];
    const hasRiskKeywords = analysis.keywords.some(k => riskKeywords.includes(k));
    analysis.riskLevel = hasRiskKeywords ? 'high' : 'medium';

    return analysis;
  }

  window.DocumentsAI = {
    aiCategorizeFile: aiCategorizeFile,
    aiAnalyzeDocument: aiAnalyzeDocument
  };

})();
