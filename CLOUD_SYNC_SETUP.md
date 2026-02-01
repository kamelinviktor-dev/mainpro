# MainPro Cloud Sync Setup Guide

## Overview
MainPro Calendar now supports **real-time cloud synchronization** across multiple devices. Your tasks, categories, and settings will automatically sync between all your devices when connected to the internet.

## Features
- ☁️ **Real-time Sync**: Changes sync automatically across devices
- 🔄 **Auto-sync**: Data syncs 2 seconds after changes
- 📱 **Multi-device**: Works on desktop, tablet, and mobile
- 🌐 **Offline Support**: Works offline, syncs when back online
- 🔒 **Secure**: API key authentication and encrypted data transfer
- ⚡ **Fast**: Optimized sync with conflict resolution

## Quick Setup

### 1. Start the Cloud Server
```bash
# Install dependencies
npm install express cors

# Start the server
node cloud-sync-server-example.js
```

The server will run on `http://localhost:3001`

### 2. Enable Cloud Sync in MainPro
1. Open MainPro Calendar
2. Click **⚙️ Settings**
3. Scroll to **☁️ Cloud Sync** section
4. Enter:
   - **Server URL**: `http://localhost:3001`
   - **API Key**: `demo-api-key-123`
5. Click **☁️ Enable Cloud Sync**

### 3. Test Multi-Device Sync
1. Open MainPro on another device/browser
2. Enable cloud sync with the same credentials
3. Add a task on one device
4. Watch it appear on the other device within 2 seconds!

## Cloud Sync Status Indicators

| Status | Icon | Description |
|--------|------|-------------|
| 🟢 **Synced** | Green dot | All data is up to date |
| 🟡 **Syncing** | Yellow dot | Currently syncing data |
| 🔴 **Error** | Red dot | Sync failed, check connection |
| ⚫ **Offline** | Gray dot | No internet connection |
| ⚪ **Disconnected** | Gray dot | Cloud sync disabled |

## How It Works

### Auto-Sync Triggers
- ✅ **Data Changes**: Events, categories, settings, UI changes
- ✅ **Online Detection**: Automatically syncs when back online
- ✅ **Periodic Sync**: Checks for updates every 30 seconds
- ✅ **Manual Sync**: Click "☁️ Sync" button anytime

### Sync Process
1. **Local Change** → Wait 2 seconds → **Upload to Cloud**
2. **Other Device** → Check every 30 seconds → **Download Changes**
3. **Conflict Resolution** → Latest change wins (timestamp-based)

### Data Synchronized
- 📅 **Events**: All tasks and appointments
- 🏷️ **Categories**: Custom categories and colors
- ⚙️ **Settings**: Hotel info, preferences
- 🎨 **UI**: Theme colors and layout
- 📋 **Task Types**: Custom task types

## Production Setup

For production use, replace the example server with:

### Database Integration
```javascript
// Replace in-memory storage with database
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

### Authentication
```javascript
// Replace simple token with JWT
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId }, process.env.JWT_SECRET);
```

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-secret-key
PORT=3001
```

## Troubleshooting

### Common Issues

**❌ "Sync Error"**
- Check server URL and API key
- Verify server is running
- Check internet connection

**❌ "Offline"**
- Check internet connection
- Server may be down
- Firewall blocking requests

**❌ Data not syncing**
- Check browser console for errors
- Verify API key is correct
- Try manual sync button

### Debug Mode
Open browser console to see sync logs:
```javascript
// Enable debug logging
localStorage.setItem('mainpro_debug', 'true');
```

## Security Notes

- 🔒 **API Keys**: Use strong, unique API keys
- 🌐 **HTTPS**: Use HTTPS in production
- 🔐 **Encryption**: Consider encrypting sensitive data
- 👥 **Multi-user**: Implement user authentication for teams

## API Reference

### Endpoints

**GET /api/sync**
- Pulls latest data from cloud
- Requires: Authorization header with Bearer token

**POST /api/sync**
- Pushes data to cloud
- Requires: Authorization header with Bearer token
- Body: JSON with events, categories, settings, etc.

**GET /health**
- Server health check
- Returns: Server status and user count

### Headers
```
Authorization: Bearer your-api-key
X-Device-ID: device_1234567890_abc123
Content-Type: application/json
```

## Support

For issues or questions:
- 📧 Email: support@mainpro.com
- 📖 Documentation: https://docs.mainpro.com
- 🐛 Issues: https://github.com/mainpro/calendar/issues

---

**MainPro Cloud Sync** - Keep your calendar in sync across all devices! ☁️✨
