// MainPro Cloud Sync Server Example
// This is a simple Node.js/Express server for cloud synchronization
// Run with: node cloud-sync-server-example.js

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const userData = new Map();

// Simple authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  // Simple token validation (replace with proper JWT validation)
  if (token === 'demo-api-key-123') {
    req.user = { id: 'demo-user' };
    next();
  } else {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Sync endpoint - GET (pull data from cloud)
app.get('/api/sync', authenticateToken, (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const userKey = req.user.id;
    
    const data = userData.get(userKey) || {
      events: [],
      categories: [],
      taskTypes: [],
      settings: {},
      ui: {},
      lastModified: new Date().toISOString()
    };
    
    console.log(`📥 Sync GET - Device: ${deviceId}, User: ${userKey}`);
    res.json(data);
  } catch (error) {
    console.error('Sync GET error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sync endpoint - POST (push data to cloud)
app.post('/api/sync', authenticateToken, (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    const userKey = req.user.id;
    const data = req.body;
    
    // Store the data
    userData.set(userKey, {
      ...data,
      lastModified: new Date().toISOString(),
      syncedFrom: deviceId
    });
    
    console.log(`📤 Sync POST - Device: ${deviceId}, User: ${userKey}, Events: ${data.events?.length || 0}`);
    
    res.json({ 
      success: true, 
      message: 'Data synced successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync POST error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    users: userData.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`☁️ MainPro Cloud Sync Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Demo API Key: demo-api-key-123`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MainPro Cloud Sync Server...');
  process.exit(0);
});
