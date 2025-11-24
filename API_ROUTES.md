# API Routes

Base URL: `http://localhost:3000/api`

## Authentication

### Register

```
POST /api/auth/register
Body: { username, email, password, role? }
Response: { success, message, data: { user, token } }
```

### Login

```
POST /api/auth/login
Body: { username, password }
Response: { success, message, data: { user, token } }
```

### Get Current User

```
GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { success, data: { user } }
```

### Refresh Token

```
POST /api/auth/refresh-token
Body: { refreshToken }
Response: { success, data: { token } }
```

### Logout

```
POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success, message }
```

### Update User

```
PUT /api/auth/update
Headers: Authorization: Bearer <token>
Body: { username?, email?, password? }
Response: { success, data: { user } }
```

## Users

### Get All Users

```
GET /api/users
Response: { success, data: [users], count }
```

### Get Live Users

```
GET /api/users/live
Response: { success, data: [users], count }
```

### Get User by ID

```
GET /api/users/:id
Response: { success, data: { user } }
```

## Sessions

### Get All Sessions (Creator's Own)

```
GET /api/sessions
Headers: Authorization: Bearer <token>
Response: { success, data: [sessions], count }
```

### Get Session by ID

```
GET /api/sessions/:id
Response: { success, data: { session } }
```

### Create Session

```
POST /api/sessions
Headers: Authorization: Bearer <token>
Body: { title, streamUrl?, streamKey?, productIds?: [id] }
Response: { success, data: { session } }
```

### Update Session Status

```
PATCH /api/sessions/:id/status
Headers: Authorization: Bearer <token>
Body: { status: "scheduled" | "live" | "paused" | "ended" }
Response: { success, data: { session } }
```

### Delete Session

```
DELETE /api/sessions/:id
Headers: Authorization: Bearer <token>
Response: { success, message }
```

### Start Stream (Get Publisher Token)

```
POST /api/sessions/:id/start-stream
Headers: Authorization: Bearer <token>
Response: { success, data: { sessionId, channelName, token, uid, appId, expiresAt, role } }
```

### End Stream

```
POST /api/sessions/:id/end-stream
Headers: Authorization: Bearer <token>
Response: { success, message }
```

### Get Stream Token (Viewer)

```
GET /api/sessions/:id/stream-token
Response: { success, data: { sessionId, channelName, token, uid, appId, expiresAt, role } }
```

### Refresh Stream Token

```
POST /api/sessions/:id/refresh-token
Headers: Authorization: Bearer <token>
Body: { role: "publisher" | "subscriber" }
Response: { success, data: { token, expiresAt } }
```

### Get Reactions

```
GET /api/sessions/:id/reactions
Response: { success, data: { reactions, sortedReactions, total } }
```

### Set Active Product (Showcase)

```
POST /api/sessions/:id/showcase
Headers: Authorization: Bearer <token>
Body: { productId?: string }
Response: { success, data: { sessionId, activeProductId, product } }
```

## Products

### Get All Products (User's Own)

```
GET /api/products
Headers: Authorization: Bearer <token>
Response: [products]
```

### Get Product by ID

```
GET /api/products/:id
Response: { product }
```

### Get Products by Category

```
GET /api/products/category/:category
Headers: Authorization: Bearer <token>
Response: [products]
```

### Get In-Stock Products

```
GET /api/products/in-stock
Headers: Authorization: Bearer <token>
Response: [products]
```

### Get Categories

```
GET /api/products/categories
Response: [categories]
```

### Create Product

```
POST /api/products
Headers: Authorization: Bearer <token>
Body: { name, description?, price, imageUrl?, category?, inStock? }
Response: { product }
```

### Update Product

```
PUT /api/products/:id
Headers: Authorization: Bearer <token>
Body: { name?, description?, price?, imageUrl?, category?, inStock? }
Response: { product }
```

### Delete Product

```
DELETE /api/products/:id
Headers: Authorization: Bearer <token>
Response: 204 No Content
```

## Chat

### Get Chat Messages

```
GET /api/sessions/:sessionId/chat?limit=50&before=timestamp
Response: { success, data: [messages], count }
```

### Send Message

```
POST /api/sessions/:sessionId/chat
Headers: Authorization: Bearer <token>
Body: { message }
Response: { success, data: { message } }
```

### Delete Message

```
DELETE /api/sessions/:sessionId/chat/:messageId
Headers: Authorization: Bearer <token>
Response: { success, message }
```

### Get Message Count

```
GET /api/sessions/:sessionId/chat/count
Response: { success, data: { count } }
```

## Analytics

### Get Session Analytics

```
GET /api/sessions/:sessionId/analytics
Response: {
  sessionId, session, viewers, products, reactions, engagement
}
```

### Get Live Viewers

```
GET /api/sessions/:sessionId/analytics/live
Response: { sessionId, liveViewerCount, viewers: [viewer] }
```

### Get Viewer List

```
GET /api/sessions/:sessionId/analytics/viewers
Response: { sessionId, total, viewers: [viewer] }
```

### Get Conversion Stats

```
GET /api/sessions/:sessionId/conversion-stats
Response: { success, data: { totalViewers, products: [stats] } }
```

### Get Creator Global Analytics

```
GET /api/analytics/creator/:creatorId
Response: { success, data: { sessions, viewers, reactions, products } }
```

## Search

### Search Sessions

```
GET /api/search/sessions?q=query&status=live&category=gaming&creatorId=1&sortBy=newest&limit=20&offset=0
Response: { results: [sessions], total, limit, offset }
```

### Search Products

```
GET /api/search/products?q=query&minPrice=10&maxPrice=100&sortBy=price-asc&limit=20&offset=0
Response: { results: [products], total, limit, offset }
```

### Get Live Sessions

```
GET /api/search/sessions/live?limit=20&offset=0
Response: { results: [sessions], total, limit, offset }
```

### Get Upcoming Sessions

```
GET /api/search/sessions/upcoming?limit=20&offset=0
Response: { results: [sessions], total, limit, offset }
```

### Get Trending Sessions

```
GET /api/search/sessions/trending?limit=20&offset=0
Response: { results: [sessions], total, limit, offset }
```

### Get Sessions by Creator

```
GET /api/search/sessions/creator/:creatorId?limit=20&offset=0
Response: { results: [sessions], total, limit, offset }
```

### Global Search

```
GET /api/search?q=query&limit=10
Response: { sessions: [sessions], products: [products], total }
```

## WebSocket Events

Connect to: `ws://localhost:3000`

### Client → Server

**Join Session**

```javascript
socket.emit('join-session', { sessionId, userId? })
```

**Leave Session**

```javascript
socket.emit('leave-session', { sessionId, userId? })
```

**Send Message**

```javascript
socket.emit("send-message", { sessionId, userId, username, message });
```

**Send Reaction**

```javascript
socket.emit("send-reaction", { sessionId, userId, type });
```

**Track Product Click**

```javascript
socket.emit('product-click', { sessionId, productId, userId? })
```

### Server → Client

**New Message**

```javascript
socket.on("new-message", (data) => {
  // { id, userId, username, message, createdAt }
});
```

**New Reaction**

```javascript
socket.on("new-reaction", (data) => {
  // { userId, type, timestamp }
});
```

**Viewer Count**

```javascript
socket.on("viewer-count", (data) => {
  // { count }
});
```

**Stream Started**

```javascript
socket.on("stream-started", (data) => {
  // { sessionId, channelName, status, startedAt }
});
```

**Stream Ended**

```javascript
socket.on("stream-ended", (data) => {
  // { sessionId, status, endedAt }
});
```

**Product Showcased**

```javascript
socket.on("product-showcased", (data) => {
  // { sessionId, productId, product }
});
```

**Showcase Cleared**

```javascript
socket.on("showcase-cleared", (data) => {
  // { sessionId }
});
```

## Status Codes

- `200` OK - Request successful
- `201` Created - Resource created
- `204` No Content - Success with no response body
- `400` Bad Request - Invalid request data
- `401` Unauthorized - Missing or invalid auth token
- `403` Forbidden - Insufficient permissions
- `404` Not Found - Resource not found
- `409` Conflict - Resource already exists
- `500` Internal Server Error - Server error

## Response Format

**Success Response:**

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**

```json
{
  "success": false,
  "message": "Error description",
  "error": "Error details"
}
```
