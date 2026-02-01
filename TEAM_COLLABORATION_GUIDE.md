# MainPro Team Collaboration Guide

## Overview
MainPro Calendar now supports **multi-user team collaboration** with role-based access control, real-time presence tracking, and seamless task management across team members.

## Features
- 👥 **Team Management**: Create teams, invite members, manage roles
- 🔐 **Role-Based Access**: Admin, Editor, and Member permissions
- 👤 **User Presence**: See who's online and what they're viewing
- 🎯 **Task Assignment**: Assign tasks to specific team members
- 📝 **Audit Trail**: Track who created/modified each task
- 🔄 **Real-Time Sync**: Changes sync across all team members
- 📧 **Invitation System**: Email-based team invitations

## User Roles

### 👑 Admin
- **Full Access**: Can view, edit, and delete all tasks
- **Team Management**: Create teams, invite/remove members
- **Settings Control**: Modify team settings and permissions
- **User Management**: Change member roles and permissions

### ✏️ Editor
- **Task Management**: Can view and edit all tasks
- **Create Tasks**: Can create new tasks and assign them
- **Limited Admin**: Cannot manage team or change roles
- **Full Calendar Access**: Can see all team activities

### 👤 Member
- **Assigned Tasks**: Can view and edit only assigned tasks
- **Create Tasks**: Can create new tasks (assigned to self)
- **View Only**: Can see team calendar but limited editing
- **Basic Access**: Standard calendar functionality

## Quick Setup

### 1. Create a Team
1. Open MainPro Calendar
2. Click **⚙️ Settings**
3. Scroll to **👥 Team Collaboration**
4. Enter team name and your email
5. Click **👥 Create Team**

### 2. Invite Team Members
1. Click **👥 Team** button in toolbar
2. Click **📧 Invite User**
3. Enter email and select role
4. Click **Send Invitation**

### 3. Join a Team
1. Get team ID from team admin
2. Go to Settings → Team Collaboration
3. Click **🔗 Join Team**
4. Enter team ID and your role

## Team Management

### Team Settings Panel
Access via **👥 Team** button or Settings → Team Collaboration

**Team Information:**
- Team name and ID
- Your current role
- Team creation date
- Member count

**Team Members:**
- View all team members
- See their roles and avatars
- Track last activity
- Manage permissions (admin only)

### Invitation System
**Send Invitations:**
- Email-based invitations
- Role selection (Admin/Editor/Member)
- Invitation codes for easy joining
- Status tracking (pending/accepted)

**Join via Code:**
- Use invitation code to join
- Automatic role assignment
- Seamless team integration

## Task Management

### Task Assignment
**Creating Tasks:**
- Automatically assigned to creator
- Can be reassigned to other members
- Shows creator and assignee in tooltips

**Editing Tasks:**
- Role-based editing permissions
- Only owners and admins can edit
- Audit trail of modifications

**Task Ownership:**
- **Created By**: Who originally created the task
- **Assigned To**: Who is responsible for the task
- **Last Modified By**: Who last edited the task

### Permission Matrix

| Action | Admin | Editor | Member |
|--------|-------|--------|--------|
| View All Tasks | ✅ | ✅ | ✅ |
| Edit All Tasks | ✅ | ✅ | ❌ |
| Edit Own Tasks | ✅ | ✅ | ✅ |
| Delete Tasks | ✅ | ❌ | ❌ |
| Create Tasks | ✅ | ✅ | ✅ |
| Assign Tasks | ✅ | ✅ | ❌ |
| Manage Team | ✅ | ❌ | ❌ |
| Invite Users | ✅ | ❌ | ❌ |

## Real-Time Features

### User Presence
**Online Indicators:**
- Green dot: User is online
- Gray dot: User is offline
- Last seen timestamp
- Current view/filter being used

**Activity Tracking:**
- Who's viewing what
- Current calendar view
- Active filters
- Last activity time

### Live Updates
**Automatic Sync:**
- Changes sync within 2 seconds
- Real-time task updates
- Live presence updates
- Instant notifications

**Conflict Resolution:**
- Last edit wins (timestamp-based)
- User attribution for changes
- Change history tracking

## Team Collaboration Workflow

### 1. Team Setup
```
Admin creates team → Invites members → Assigns roles
```

### 2. Task Assignment
```
Admin/Editor creates task → Assigns to member → Member receives notification
```

### 3. Task Management
```
Member works on task → Updates status → Team sees changes in real-time
```

### 4. Review Process
```
Admin reviews completed tasks → Approves/rejects → Updates team
```

## Best Practices

### For Admins
- **Set Clear Roles**: Assign appropriate permissions
- **Regular Reviews**: Check team activity and task progress
- **Communication**: Use task notes for team communication
- **Backup**: Regular team data exports

### For Editors
- **Task Assignment**: Assign tasks to appropriate members
- **Status Updates**: Keep task statuses current
- **Team Coordination**: Help manage team workflow
- **Quality Control**: Review member work

### For Members
- **Task Focus**: Work on assigned tasks only
- **Status Updates**: Keep task status current
- **Communication**: Use notes for questions/updates
- **Timeliness**: Complete tasks on schedule

## Troubleshooting

### Common Issues

**❌ "Cannot edit task"**
- Check your role permissions
- Verify task assignment
- Contact team admin

**❌ "Team not syncing"**
- Check internet connection
- Verify team settings
- Try manual sync

**❌ "Invitation not received"**
- Check email spam folder
- Verify email address
- Contact team admin for code

### Debug Information
```javascript
// Check team status
console.log('Team Mode:', localStorage.getItem('mainpro_team_v1'));

// Check user permissions
console.log('Can Edit:', canEdit());
console.log('Can Delete:', canDelete());
console.log('Can Manage Team:', canManageTeam());
```

## Security & Privacy

### Data Protection
- **User Authentication**: Unique user IDs
- **Role-Based Access**: Strict permission controls
- **Audit Logging**: Complete change tracking
- **Data Encryption**: Secure data transmission

### Privacy Controls
- **User Information**: Only visible to team members
- **Task Privacy**: Role-based task visibility
- **Activity Tracking**: Optional presence sharing
- **Data Ownership**: Team admin controls data

## API Integration

### Team Endpoints
```javascript
// Create team
POST /api/teams
{
  "name": "Team Name",
  "adminId": "user_id"
}

// Join team
POST /api/teams/join
{
  "teamId": "team_id",
  "userId": "user_id",
  "role": "member"
}

// Update team
PUT /api/teams/:teamId
{
  "name": "New Name",
  "members": [...]
}
```

### User Management
```javascript
// Update user role
PUT /api/teams/:teamId/members/:userId
{
  "role": "editor"
}

// Remove user
DELETE /api/teams/:teamId/members/:userId
```

## Support

### Getting Help
- 📧 **Email**: team-support@mainpro.com
- 📖 **Documentation**: https://docs.mainpro.com/teams
- 🐛 **Issues**: https://github.com/mainpro/calendar/issues
- 💬 **Chat**: Live support in app

### Training Resources
- 🎥 **Video Tutorials**: Team collaboration basics
- 📚 **User Guides**: Role-specific guides
- 🏆 **Best Practices**: Team management tips
- 🔧 **Troubleshooting**: Common issues and solutions

---

**MainPro Team Collaboration** - Work together seamlessly! 👥✨

## Version History
- **v65.7**: Initial team collaboration release
- **v65.8**: Enhanced role permissions (planned)
- **v66.0**: Advanced team analytics (planned)
- **v66.5**: Mobile team features (planned)
