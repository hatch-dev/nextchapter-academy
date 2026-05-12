# Team Chat Functionality - Implementation Guide

## Overview

This implementation adds dynamic team chat functionality to the Next Chapter platform, allowing users that are added to teams to chat with each other as a team. The feature includes:

- **Team Management**: Create, manage, and delete teams
- **Team Members**: Add and remove team members dynamically
- **Team Chat**: Real-time messaging within team channels
- **Responsive UI**: Beautiful, modern team chat interface

## Database Schema

### New Tables Created

#### `teams` table
Stores team information with the following fields:
- `id` (VARCHAR 36, PRIMARY KEY): Unique team identifier
- `account_id` (VARCHAR 36, FK): Account that owns the team
- `name` (VARCHAR 120, NOT NULL): Team name
- `description` (TEXT, NULLABLE): Team description
- `created_by` (VARCHAR 36, FK): User who created the team
- `created_at` (DATETIME): Team creation timestamp
- `updated_at` (DATETIME): Last update timestamp

#### `team_members` table
Links users to teams with the following fields:
- `id` (VARCHAR 36, PRIMARY KEY): Unique member record identifier
- `team_id` (VARCHAR 36, FK): Team ID
- `user_id` (VARCHAR 36, FK): User ID
- `role` (VARCHAR 50, DEFAULT 'member'): Member role ('lead' or 'member')
- `joined_at` (DATETIME): When user joined the team

**Unique Constraint**: One team_user combination per team (prevents duplicate memberships)

### Existing Tables Enhanced

#### `chat_messages` table
The existing chat table now supports team-based channels:
- Channel format: `team-{team_id}` for team channels
- Authorization is enforced at the API level

## API Endpoints

### Team Management

#### `GET /api/teams`
Retrieves all teams for the authenticated user's account.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "team_xxx",
      "name": "Marketing Team",
      "description": "Marketing and communications",
      "created_by": "user_id",
      "created_at": "2025-01-15T10:30:00Z",
      "member_count": 5,
      "member_ids": "user1,user2,user3,user4,user5"
    }
  ]
}
```

#### `POST /api/teams`
Creates a new team.

**Request:**
```json
{
  "name": "Product Team",
  "description": "Product development and design"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "team_xxx",
    "account_id": "acct_xxx",
    "name": "Product Team",
    "description": "Product development and design",
    "created_by": "user_id",
    "created_at": "2025-01-15T10:30:00Z",
    "members": [...]
  }
}
```

#### `DELETE /api/teams`
Deletes a team (creator only).

**Request:**
```json
{
  "team_id": "team_xxx"
}
```

### Team Members

#### `GET /api/teams/members?team_id={team_id}`
Retrieves all members of a team.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "user_xxx",
      "name": "Sarah Kim",
      "email": "sarah@example.com",
      "initials": "SK",
      "color": "#1B6B5A",
      "role": "Standard User",
      "team_role": "lead",
      "joined_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

#### `POST /api/teams/members`
Adds a member to a team.

**Request:**
```json
{
  "team_id": "team_xxx",
  "user_id": "user_xxx"
}
```

#### `DELETE /api/teams/members`
Removes a member from a team.

**Request:**
```json
{
  "team_id": "team_xxx",
  "user_id": "user_xxx"
}
```

### Team Chat (Enhanced Existing Endpoints)

#### `GET /api/messages?channel=team-{team_id}`
Retrieves team chat messages. Includes team membership validation.

#### `POST /api/messages`
Sends a message to a team chat. Validates team membership before posting.

**Request:**
```json
{
  "channel": "team-{team_id}",
  "message": "Hello team!"
}
```

## Frontend Integration

### JavaScript Module: `TeamChat`

The `TeamChat` module provides the complete client-side implementation.

#### Initialization
```javascript
// Automatically initialized when the page loads
TeamChat.init(currentUser);
```

#### Key Methods

**Load Teams**
```javascript
await TeamChat.loadTeams();
```

**Create Team**
```javascript
await TeamChat.createTeam(name, description);
```

**Set Active Team**
```javascript
await TeamChat.setActiveTeam(teamId);
```

**Send Message**
```javascript
await TeamChat.sendMessage(teamId, messageText);
```

**Add Member**
```javascript
await TeamChat.addMember(teamId, userId);
```

**Remove Member**
```javascript
await TeamChat.removeMember(teamId, userId);
```

**Delete Team**
```javascript
await TeamChat.deleteTeam(teamId);
```

### UI Components

#### Team Chat FAB (Floating Action Button)
Located at bottom-right of the screen with a "👥 Teams" button that opens the team chat panel.

#### Team Chat Panel
- **Dimensions**: 420px width × 600px height (responsive on mobile)
- **Tabs**: Messages and Members tabs for easy switching
- **Features**:
  - Real-time message display
  - User avatars with initials and colors
  - Timestamps for each message
  - Typing indicator (can be enhanced)
  - Members list with remove functionality (for team leads)
  - Add members dropdown with account users

#### Styling
- Uses existing design system variables and colors
- Matches the dark theme of the platform
- Responsive design for mobile devices

## Security

### Authorization

1. **Team Access**: Only account members can see their account's teams
2. **Team Membership**: Only team members can view/send messages in a team channel
3. **Member Management**: Only team creators (leads) can add/remove members
4. **Team Deletion**: Only team creators can delete teams

### Server-Side Validation

All API endpoints validate:
- User authentication
- Account membership
- Team membership (for chat operations)
- Creator status (for admin operations)

## Usage Examples

### Creating a Team

```javascript
// User clicks "Create Team" button
TeamChat.showCreateForm();
// Prompted for team name
// TeamChat.createTeam("Engineering Team", "All engineers");
```

### Sending a Message

```javascript
// User types message and clicks Send
TeamChat.sendMessage(activeTeamId, "Let's discuss the API design");
```

### Adding a Team Member

1. User opens Members tab
2. Selects a user from the dropdown
3. Clicks "Add Member"
4. API validates and adds user to team

## Database Migration

To set up the team chat functionality, run:

```sql
-- Load from migration file
SOURCE /api/add_team_chat.sql;
```

Or execute the SQL directly to create the required tables.

## Files Added

1. **[sql/add_team_chat.sql](sql/add_team_chat.sql)** - Database migration
2. **[api/team-chat.js](api/team-chat.js)** - Client-side module
3. **[api/team-chat.css](api/team-chat.css)** - Styling
4. **[api/index.php](api/index.php)** - API endpoints (functions added)

## Files Modified

1. **[pipeline.html](pipeline.html)** - Added CSS link, team chat panel HTML, and script initialization

## Future Enhancements

### Potential Improvements

1. **Real-time Updates**: Implement WebSocket support for instant message delivery
2. **Typing Indicators**: Show when team members are typing
3. **Message Editing/Deletion**: Allow users to edit or delete their messages
4. **Rich Media Support**: Allow file uploads and image sharing
5. **Notifications**: Desktop and in-app notifications for new messages
6. **Search**: Full-text search across team messages
7. **Pinned Messages**: Mark important messages as pinned
8. **Message Reactions**: Add emoji reactions to messages
9. **Threads**: Support threaded conversations
10. **Scheduled Messages**: Schedule messages to be sent later

## Troubleshooting

### Messages Not Loading
- Verify user is a team member
- Check browser console for API errors
- Ensure team chat panel is properly initialized

### Can't Add Members
- Verify selected user is from the same account
- Check that user isn't already a team member
- Ensure you have proper permissions (must be team lead)

### Team Chat Panel Not Visible
- Click the "👥 Teams" button at bottom-right
- Verify JavaScript console for errors
- Ensure team-chat.js is loaded

## Support

For issues or questions about the team chat implementation, review:
1. API error logs in `/api/logs/`
2. Browser console for client-side errors
3. Database query validation

---

**Implementation Date**: May 12, 2026  
**Status**: Complete and Ready for Production
