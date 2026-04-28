// === MAINPRO AI CORE ENGINE v70.0 - Smart Intelligence ===
// The brain of MainPro system - Advanced AI with GPT-5 integration

window.MainProAI = {
  // Get current AI provider settings
  getCurrentProvider() {
    const provider = localStorage.getItem('mainpro_ai_provider') || 'openai';
    const apiKey = localStorage.getItem(`mainpro_${provider}_key`) || localStorage.getItem('mainpro_openai_key');
    return { provider, apiKey };
  },

  // Core AI analysis function with multi-provider support
  async analyze(prompt, contextData = {}) {
    const { provider, apiKey } = this.getCurrentProvider();
    
    if (!apiKey) {
      return {
        error: `⚠️ Please set your ${provider.toUpperCase()} key in Settings to use AI features.`,
        success: false
      };
    }

    try {
      const messages = [
        { 
          role: "system", 
          content: `You are MainPro AI v70.0, a professional maintenance & safety intelligence assistant. 
          
          Your capabilities:
          - Analyze maintenance patterns and predict issues
          - Provide smart recommendations based on data
          - Generate actionable insights from reports and logs
          - Suggest preventive measures and optimizations
          - Understand technical maintenance terminology
          
          Always provide practical, actionable advice in a professional tone.`
        },
        { 
          role: "user", 
          content: `${prompt}\n\nContext Data:\n${JSON.stringify(contextData, null, 2)}` 
        }
      ];

      let response;
      
      switch (provider) {
        case 'openai':
          response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages,
              max_tokens: 800,
              temperature: 0.7,
              top_p: 0.9
            })
          });
          break;
          
        case 'anthropic':
          response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 800,
              messages: messages.map(msg => ({
                role: msg.role === 'system' ? 'user' : msg.role,
                content: msg.role === 'system' ? `System: ${msg.content}` : msg.content
              }))
            })
          });
          break;
          
        case 'google':
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')
                }]
              }],
              generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.7
              }
            })
          });
          break;
          
        default:
          return {
            error: `⚠️ Provider "${provider}" not yet implemented. Using OpenAI as fallback.`,
            success: false
          };
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      let result;

      // Handle different provider response formats
      switch (provider) {
        case 'openai':
          if (data.choices && data.choices[0] && data.choices[0].message) {
            result = data.choices[0].message.content;
          } else {
            throw new Error('Invalid OpenAI response format');
          }
          break;
          
        case 'anthropic':
          if (data.content && data.content[0] && data.content[0].text) {
            result = data.content[0].text;
          } else {
            throw new Error('Invalid Anthropic response format');
          }
          break;
          
        case 'google':
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            result = data.candidates[0].content.parts[0].text;
          } else {
            throw new Error('Invalid Google response format');
          }
          break;
          
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }
      
      // Save AI insights to localStorage
      this.saveInsight(prompt, result, contextData);
      
      return {
        success: true,
        result: result,
        timestamp: new Date().toISOString(),
        provider: provider
      };
    } catch (error) {
      console.error("AI Analysis Error:", error);
      return {
        error: `AI Error: ${error.message}`,
        success: false
      };
    }
  },

  // Save AI insights for future reference
  saveInsight(prompt, result, contextData) {
    const insights = JSON.parse(localStorage.getItem('mainpro_ai_insights') || '[]');
    insights.push({
      id: Date.now(),
      prompt: prompt,
      result: result,
      context: contextData,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 insights
    if (insights.length > 50) {
      insights.splice(0, insights.length - 50);
    }
    
    localStorage.setItem('mainpro_ai_insights', JSON.stringify(insights));
  },

  // Get recent AI insights
  getRecentInsights(limit = 10) {
    const insights = JSON.parse(localStorage.getItem('mainpro_ai_insights') || '[]');
    return insights.slice(-limit).reverse();
  },

  // Predictive maintenance analysis
  async predictMaintenance() {
    const events = JSON.parse(localStorage.getItem('mainpro_events') || '[]');
    const reports = JSON.parse(localStorage.getItem('mainpro_reports') || '[]');
    
    const prompt = `Analyze the maintenance data and provide predictive insights:

    1. Identify recurring issues or patterns
    2. Predict potential future problems
    3. Suggest preventive measures
    4. Recommend maintenance schedules
    5. Highlight high-risk areas

    Focus on actionable recommendations that can prevent downtime and improve efficiency.`;

    return await this.analyze(prompt, { events, reports });
  },

  // Smart task generation
  async generateTasks(context = {}) {
    const prompt = `Based on the maintenance data, generate smart task recommendations:

    1. Identify urgent maintenance needs
    2. Suggest preventive tasks
    3. Recommend optimization opportunities
    4. Highlight safety concerns
    5. Propose efficiency improvements

    Format as actionable tasks with priorities and estimated timeframes.`;

    return await this.analyze(prompt, context);
  },

  // Auto-categorize documents
  async autoCategorize(documents) {
    const prompt = `Analyze these documents and suggest smart categorization:

    1. Group by maintenance type (electrical, mechanical, safety, etc.)
    2. Identify priority levels
    3. Suggest folder structure
    4. Recommend tags and keywords
    5. Highlight important documents

    Provide practical categorization suggestions.`;

    return await this.analyze(prompt, { documents });
  },

  // Generate smart summary
  async generateSummary(data, type = 'general') {
    let prompt = '';
    
    switch(type) {
      case 'report':
        prompt = `Create a comprehensive summary of this maintenance report:
        1. Key findings and issues
        2. Completed tasks and their impact
        3. Recommendations for future actions
        4. Risk assessment
        5. Next steps`;
        break;
      case 'calendar':
        prompt = `Analyze the maintenance calendar and provide insights:
        1. Task completion patterns
        2. Overdue items and their impact
        3. Workload distribution
        4. Efficiency recommendations
        5. Priority adjustments needed`;
        break;
      default:
        prompt = `Provide a smart summary of this data with key insights and recommendations.`;
    }

    return await this.analyze(prompt, data);
  },

  // Emergency analysis
  async analyzeEmergency(emergencyData) {
    const prompt = `Analyze this emergency situation and provide immediate guidance:

    1. Assess the severity and urgency
    2. Identify immediate actions required
    3. Suggest safety measures
    4. Recommend emergency contacts
    5. Propose follow-up actions

    Focus on safety and quick resolution.`;

    return await this.analyze(prompt, emergencyData);
  },

  // Performance optimization
  async optimizePerformance() {
    const events = JSON.parse(localStorage.getItem('mainpro_events') || '[]');
    const reports = JSON.parse(localStorage.getItem('mainpro_reports') || '[]');
    
    const prompt = `Analyze the maintenance performance and suggest optimizations:

    1. Identify bottlenecks and inefficiencies
    2. Suggest process improvements
    3. Recommend resource allocation
    4. Propose training needs
    5. Highlight cost-saving opportunities

    Focus on practical improvements that can be implemented immediately.`;

    return await this.analyze(prompt, { events, reports });
  },

  // Smart search across all data
  async smartSearch(query) {
    const events = JSON.parse(localStorage.getItem('mainpro_events') || '[]');
    const reports = JSON.parse(localStorage.getItem('mainpro_reports') || '[]');
    const docs = JSON.parse(localStorage.getItem('mainpro_docs') || '[]');
    
    const prompt = `Search and analyze all maintenance data for: "${query}"

    1. Find relevant information across all data sources
    2. Provide context and relationships
    3. Suggest related actions or follow-ups
    4. Highlight important patterns or trends
    5. Recommend next steps

    Be comprehensive and actionable.`;

    return await this.analyze(prompt, { events, reports, docs, query });
  },

  // Get AI status and capabilities
  getStatus() {
    const hasApiKey = !!localStorage.getItem('mainpro_openai_key');
    const insightsCount = JSON.parse(localStorage.getItem('mainpro_ai_insights') || '[]').length;
    
    return {
      hasApiKey,
      insightsCount,
      version: 'v70.0',
      capabilities: [
        'Predictive Maintenance',
        'Smart Task Generation',
        'Auto Categorization',
        'Performance Optimization',
        'Emergency Analysis',
        'Smart Search',
        'Report Summarization'
      ]
    };
  }
};

// Initialize AI Core
console.log('🧠 MainPro AI Core v70.0 initialized');
console.log('📊 AI Status:', window.MainProAI.getStatus());
