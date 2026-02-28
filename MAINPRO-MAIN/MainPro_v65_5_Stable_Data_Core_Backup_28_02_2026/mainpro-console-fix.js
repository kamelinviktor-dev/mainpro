// Suppress unload deprecation warnings from third-party libraries (e.g., FullCalendar)
// Extracted from inline script in MAINPRO-MAIN.html
(function() {
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;

  // Enhanced message filtering for unload deprecation warnings
  const shouldSuppress = (message) => {
    if (!message || typeof message !== 'string') return false;
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('unload event listeners are deprecated') ||
           lowerMessage.includes('unload event listener') ||
           lowerMessage.includes('permission-policy for creating unload') ||
           (lowerMessage.includes('permission-policy') && lowerMessage.includes('unload')) ||
           (lowerMessage.includes('unload') && lowerMessage.includes('deprecated')) ||
           (lowerMessage.includes('will be removed') && lowerMessage.includes('unload'));
  };

  console.warn = function(...args) {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg && typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    if (shouldSuppress(message)) {
      return; // Suppress unload-related deprecation warnings from third-party libraries
    }
    originalWarn.apply(console, args);
  };

  console.error = function(...args) {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg && typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    if (shouldSuppress(message)) {
      return; // Suppress unload-related deprecation warnings from third-party libraries
    }
    originalError.apply(console, args);
  };

  // Also filter console.log messages that might contain unload warnings
  console.log = function(...args) {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg && typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
    if (shouldSuppress(message)) {
      return; // Suppress unload-related deprecation warnings from third-party libraries
    }
    originalLog.apply(console, args);
  };
})();
