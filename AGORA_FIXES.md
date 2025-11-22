# Agora Integration Fixes - Summary

## Overview
Fixed critical issues with Agora RTC integration, chat persistence, and real-time WebSocket notifications.

---

## ✅ Issues Fixed

### 1. **CRITICAL: Agora Token Generation Bug**
**File:** `src/services/agora.service.ts:94-104`

**Problem:**
- Code was passing 7 parameters to `RtcTokenBuilder.buildTokenWithUid()`
- Agora package only accepts 6 parameters
- Extra `tokenExpire` parameter (set to 0) was causing token generation to fail

**Solution:**
```typescript
// BEFORE (BROKEN - 7 parameters)
const token = RtcTokenBuilder.buildTokenWithUid(
  this.appId,
  this.appCertificate,
  channelName,
  numericUid,
  agoraRole,
  tokenExpire,        // ❌ EXTRA PARAMETER
  privilegeExpiredTs
);

// AFTER (FIXED - 6 parameters)
const token = RtcTokenBuilder.buildTokenWithUid(
  this.appId,
  this.appCertificate,
  channelName,
  numericUid,
  agoraRole,
  privilegeExpiredTs  // ✅ CORRECT
);
```

**Impact:** Tokens now generate correctly and frontend can successfully join Agora channels.

---

### 2. **Chat Messages Not Persisting**
**File:** `src/ws/socket.handler.ts:82-121`

**Problem:**
- WebSocket `send-message` event only broadcasted messages
- Messages were never saved to database
- Page refresh would lose all chat history

**Solution:**
- Added `ChatService` import and instantiation
- Modified `send-message` handler to be async
- Save message to database first, then broadcast with real DB ID
- Added graceful degradation (broadcast even if DB save fails)

```typescript
// Save to database
const savedMessage = await chatService.create({
  sessionId,
  userId,
  message,
});

// Broadcast with real DB ID
io.to(sessionId).emit("new-message", {
  id: savedMessage.id,  // ✅ Real DB ID
  message: savedMessage.message,
  userId: savedMessage.userId,
  userName,
  sessionId: savedMessage.sessionId,
  createdAt: savedMessage.createdAt,
});
```

**Impact:** Chat messages now persist and survive page refreshes.

---

### 3. **WebSocket Stream Status Notifications**
**Files:**
- `src/ws/socket.handler.ts:17-22`
- `src/controllers/sessions.controller.ts:5, 228-238, 300-309`

**Problem:**
- When stream started/stopped, viewers weren't notified in real-time
- Frontend had to poll or refresh to detect status changes
- Poor user experience

**Solution:**
- Exported `getSocketIO()` helper function from socket handler
- Imported in SessionController
- Emit `stream-started` event when stream goes live
- Emit `stream-ended` event when stream stops
- Events broadcast to all users in session room

```typescript
// When stream starts
const io = getSocketIO();
if (io) {
  io.to(id).emit("stream-started", {
    sessionId: id,
    channelName,
    status: "live",
    startedAt: new Date(),
  });
}

// When stream ends
io.to(id).emit("stream-ended", {
  sessionId: id,
  status: "ended",
  endedAt: new Date(),
});
```

**Impact:** Viewers instantly receive notifications when stream status changes.

---

### 4. **Token Refresh Endpoint**
**Files:**
- `src/controllers/sessions.controller.ts:320-415`
- `src/routes/sessions.routes.ts:40-44`

**Problem:**
- Default token expiry is 1 hour
- Streams longer than 1 hour would disconnect
- No way to refresh token without restarting stream

**Solution:**
- Added new endpoint: `POST /api/sessions/:id/refresh-token`
- Supports both publisher and subscriber role refreshes
- Validates session is live before issuing new token
- Publisher refresh requires ownership verification

**Usage:**
```bash
# Refresh viewer token
POST /api/sessions/:sessionId/refresh-token
{
  "role": "subscriber"
}

# Refresh publisher token (requires auth)
POST /api/sessions/:sessionId/refresh-token
Authorization: Bearer <token>
{
  "role": "publisher"
}
```

**Impact:** Supports streams longer than token expiry duration.

---

### 5. **Environment Configuration**
**File:** `.env.example`

**Problem:**
- No Agora credential placeholders
- Developers wouldn't know what to configure

**Solution:**
```env
# Agora Configuration (for live streaming)
# Get these from: https://console.agora.io/
AGORA_APP_ID=your-agora-app-id-here
AGORA_APP_CERTIFICATE=your-agora-app-certificate-here
AGORA_TOKEN_EXPIRY=3600
```

**Impact:** Clear documentation for setting up Agora credentials.

---

## 🔌 New WebSocket Events

Frontend should listen for these events:

### `stream-started`
Emitted when a stream goes live.
```typescript
socket.on("stream-started", (data) => {
  // data: { sessionId, channelName, status: "live", startedAt }
});
```

### `stream-ended`
Emitted when a stream ends.
```typescript
socket.on("stream-ended", (data) => {
  // data: { sessionId, status: "ended", endedAt }
});
```

### `new-message` (Updated)
Now includes real database ID instead of temporary ID.
```typescript
socket.on("new-message", (data) => {
  // data: { id, message, userId, userName, sessionId, createdAt }
  // id is now a real UUID from database
});
```

---

## 📋 API Changes

### New Endpoint: Refresh Token
```
POST /api/sessions/:id/refresh-token
```

**Request Body:**
```json
{
  "role": "publisher" | "subscriber"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "sessionId": "uuid",
    "channelName": "uuid",
    "token": "006...",
    "uid": 12345,
    "appId": "app-id",
    "expiresAt": "2025-01-15T12:00:00Z",
    "role": "publisher"
  }
}
```

---

## 🧪 Testing the Fixes

### 1. Test Token Generation
```bash
# Start server
npm run dev

# Test Agora configuration
curl http://localhost:3000/api/test-agora
```

### 2. Test Streaming Flow
```bash
# Create session
POST /api/sessions
{
  "title": "Test Stream",
  "description": "Testing Agora integration"
}

# Start stream (returns publisher token)
POST /api/sessions/:id/start-stream
Authorization: Bearer <token>

# Get viewer token
GET /api/sessions/:id/stream-token

# End stream
POST /api/sessions/:id/end-stream
Authorization: Bearer <token>
```

### 3. Test Chat Persistence
```bash
# Send message via WebSocket
socket.emit("send-message", {
  sessionId: "session-uuid",
  message: "Hello!",
  userId: 1,
  userName: "Test User"
});

# Verify it saved to database
GET /api/sessions/:sessionId/chat
```

### 4. Test WebSocket Notifications
```javascript
// Frontend code
socket.on("stream-started", (data) => {
  console.log("Stream started!", data);
});

socket.on("stream-ended", (data) => {
  console.log("Stream ended!", data);
});
```

---

## 🚀 Frontend Integration Guide

### Starting a Stream (Publisher)
```typescript
// 1. Start stream via API
const response = await fetch(`/api/sessions/${sessionId}/start-stream`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data } = await response.json();
const { token, channelName, uid, appId } = data;

// 2. Initialize Agora client
const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
await client.join(appId, channelName, token, uid);

// 3. Publish camera/mic
const localVideoTrack = await AgoraRTC.createCameraVideoTrack();
const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
await client.publish([localVideoTrack, localAudioTrack]);
```

### Joining as Viewer (Subscriber)
```typescript
// 1. Get viewer token via API
const response = await fetch(`/api/sessions/${sessionId}/stream-token`);
const { data } = await response.json();
const { token, channelName, uid, appId } = data;

// 2. Join via WebSocket (for analytics)
socket.emit("join-session", {
  sessionId,
  userId: currentUser?.id
});

// 3. Initialize Agora client
const client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
await client.join(appId, channelName, token, uid);

// 4. Subscribe to publisher's stream
client.on("user-published", async (user, mediaType) => {
  await client.subscribe(user, mediaType);
  if (mediaType === "video") {
    user.videoTrack.play("video-container");
  }
});
```

### Token Refresh (for long streams)
```typescript
// Refresh token before it expires (e.g., 5 minutes before)
const REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutes

setTimeout(async () => {
  const response = await fetch(`/api/sessions/${sessionId}/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'subscriber' })
  });

  const { data } = await response.json();

  // Renew token with Agora SDK
  await client.renewToken(data.token);
}, expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY);
```

---

## ⚠️ Breaking Changes

None! All changes are backward compatible.

---

## 📝 Notes

- Tokens expire after 1 hour by default (configurable via `AGORA_TOKEN_EXPIRY`)
- Anonymous viewers are supported (uid = 0)
- Chat messages persist even if WebSocket broadcast fails
- Stream status notifications are real-time via WebSocket
- All fixes follow Agora best practices

---

## 🔗 References

- [Agora Token Documentation](https://docs.agora.io/en/video-calling/get-started/authentication-workflow)
- [agora-token NPM Package](https://www.npmjs.com/package/agora-token)
- [Agora RTC SDK Web](https://docs.agora.io/en/video-calling/get-started/get-started-sdk)
