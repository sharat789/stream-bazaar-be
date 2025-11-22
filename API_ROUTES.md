# API Routes Documentation

## Base URL

```
http://localhost:3000/api
```

## 🔐 Authentication Routes

**Base Path:** `/api/auth`

| Method | Endpoint         | Purpose                        | Request Body                       | Auth Required |
| ------ | ---------------- | ------------------------------ | ---------------------------------- | ------------- |
| `POST` | `/register`      | Register new user account      | `{ name, email, password, role? }` | No            |
| `POST` | `/login`         | Login and get JWT token        | `{ email, password }`              | No            |
| `POST` | `/logout`        | Logout user                    | -                                  | Yes           |
| `GET`  | `/currentUser`   | Get current authenticated user | -                                  | Yes           |
| `POST` | `/refresh-token` | Refresh JWT token              | `{ refreshToken }`                 | No            |
| `POST` | `/update`        | Update user info               | `{ name, email, password, role }`  | Yes           |

**Authentication:** Include `Authorization: Bearer <access_token>` header for protected routes.

**Response Format:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

## Users Routes

**Base Path:** `/api/users`

| Method   | Endpoint | Purpose                                                                   | Auth Required |
| -------- | -------- | ------------------------------------------------------------------------- | ------------- |
| `GET`    | `/`      | Get all users                                                             | No            |
| `GET`    | `/live`  | Get all users currently live streaming                                    | No            |
| `GET`    | `/:id`   | Get user by ID                                                            | No            |
| `POST`   | `/`      | Create new user (requires: `name`, `email`, `password`, optional: `role`) | No            |
| `PUT`    | `/:id`   | Update user                                                               | No            |
| `DELETE` | `/:id`   | Delete user                                                               | No            |

### Get Live Users

**Endpoint:** `GET /api/users/live`

Returns all users who currently have an active live streaming session. Perfect for displaying on homepage.

**Response Format:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "streamer123",
      "email": "streamer@example.com",
      "role": "creator",
      "createdAt": "2025-01-15T10:00:00Z",
      "updatedAt": "2025-01-15T10:00:00Z",
      "liveSession": {
        "id": "abc-123-uuid",
        "title": "Live Gaming Session",
        "description": "Playing games live!",
        "category": "gaming",
        "tags": ["fps", "competitive"],
        "status": "live",
        "startedAt": "2025-11-15T14:30:00Z",
        "agoraChannelName": "abc-123-uuid"
      }
    }
  ],
  "count": 1
}
```

**Usage:**

- Display live streamers on homepage
- Click on user to navigate to their stream using `liveSession.id`
- Join stream via `GET /api/sessions/:id/stream-token`
- Sessions are ordered by start time (most recent first)

## Products Routes

**Base Path:** `/api/products`

| Method   | Endpoint | Purpose                                                                             |
| -------- | -------- | ----------------------------------------------------------------------------------- |
| `GET`    | `/`      | Get all products                                                                    |
| `GET`    | `/:id`   | Get product by ID                                                                   |
| `POST`   | `/`      | Create new product (requires: `name`, `description`, `price`, optional: `imageUrl`) |
| `PUT`    | `/:id`   | Update product                                                                      |
| `DELETE` | `/:id`   | Delete product                                                                      |

## Sessions Routes

**Base Path:** `/api/sessions`

| Method   | Endpoint            | Purpose                                                                                       | Auth Required        | Query Params     |
| -------- | ------------------- | --------------------------------------------------------------------------------------------- | -------------------- | ---------------- |
| `GET`    | `/`                 | Get all sessions (ordered by newest)                                                          | No                   | `?creatorId=123` |
| `GET`    | `/:id`              | Get session by ID (includes products and activeProductId)                                     | No                   | -                |
| `POST`   | `/`                 | Create new session (accepts productIds array)                                                 | **Yes**              | -                |
| `PATCH`  | `/:id/status`       | Update session status (requires: `status`: `"scheduled"`, `"live"`, `"paused"`, or `"ended"`) | **Yes** (owner only) | -                |
| `DELETE` | `/:id`              | Delete session                                                                                | **Yes** (owner only) | -                |
| `POST`   | `/:id/start-stream` | Start live stream (generates Agora token)                                                     | **Yes** (owner only) | -                |
| `POST`   | `/:id/end-stream`   | End live stream                                                                               | **Yes** (owner only) | -                |
| `GET`    | `/:id/stream-token` | Get Agora token to watch stream                                                               | Optional             | -                |
| `POST`   | `/:id/refresh-token`| Refresh Agora token (for streams longer than 1 hour)                                          | Optional             | -                |
| `GET`    | `/:id/reactions`    | Get reaction statistics for session                                                           | No                   | -                |
| `POST`   | `/:id/showcase`     | Set or clear active product showcase                                                          | **Yes** (owner only) | -                |

**Session Fields:**

- **Required**: `title` (string, max 255 chars)
- **Optional**: `description` (text), `category` (string, e.g., "gaming", "fashion", "tech"), `tags` (array of strings), `streamUrl`, `streamKey`, `productIds` (array of product UUIDs)
- **Auto-set**: `creatorId` (from authenticated user), `status` (default: "scheduled"), `agoraChannelName`, `startedAt`, `endedAt`, `activeProductId`

**Note:** Sessions are linked to creators (users). Each session has a `creatorId` field.

### Create Session with Products

**Endpoint:** `POST /api/sessions`

**Request Body:**

```json
{
  "title": "Live Gaming Session",
  "description": "Playing the latest games",
  "category": "gaming",
  "tags": ["fps", "competitive"],
  "productIds": ["product-uuid-1", "product-uuid-2", "product-uuid-3"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "id": "session-uuid",
    "title": "Live Gaming Session",
    "description": "Playing the latest games",
    "status": "scheduled",
    "creatorId": 1,
    "activeProductId": null
  }
}
```

**Notes:**
- Products are automatically linked to the session with display order based on array index
- Backend verifies that all products exist and belong to the creator (based on `sellerId`)
- Products can be managed later via Session Products endpoints

### Get Session Details

**Endpoint:** `GET /api/sessions/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "title": "Live Gaming Session",
    "status": "live",
    "creatorId": 1,
    "activeProductId": "product-uuid-2",
    "activeProduct": {
      "id": "product-uuid-2",
      "name": "Gaming Mouse",
      "price": 59.99,
      "imageUrl": "https://..."
    },
    "products": [
      {
        "id": "product-uuid-1",
        "name": "Gaming Keyboard",
        "price": 129.99
      },
      {
        "id": "product-uuid-2",
        "name": "Gaming Mouse",
        "price": 59.99
      }
    ]
  }
}
```

### Product Showcase

**Endpoint:** `POST /api/sessions/:id/showcase`

Set or clear the currently showcased product during a live or paused stream. This highlights a specific product for viewers.

**Request Body:**

```json
{
  "productId": "product-uuid"  // or null to clear
}
```

**Response:**

```json
{
  "success": true,
  "message": "Product showcased successfully",
  "data": {
    "sessionId": "session-uuid",
    "activeProductId": "product-uuid",
    "product": {
      "id": "product-uuid",
      "name": "Gaming Mouse",
      "description": "High precision gaming mouse",
      "price": 59.99,
      "imageUrl": "https://..."
    }
  }
}
```

**Validation:**
- Session must be in `live` or `paused` status
- Product must exist in the session's product list
- Only session owner can set showcase
- Broadcasts `product-showcased` or `showcase-cleared` WebSocket event to all viewers

**Use Cases:**
- Creator highlights a product they're demonstrating
- Creator clears showcase to focus on content
- Frontend displays showcased product prominently during stream

### 🎥 Live Streaming with Agora

**Start Stream Response:**

```json
{
  "success": true,
  "message": "Stream started successfully",
  "data": {
    "sessionId": "uuid",
    "channelName": "uuid",
    "token": "agora_rtc_token_here",
    "uid": 123,
    "appId": "your_agora_app_id",
    "expiresAt": "2025-11-15T12:00:00.000Z",
    "role": "publisher"
  }
}
```

**Get Stream Token Response (for viewers):**

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "channelName": "uuid",
    "token": "agora_rtc_token_here",
    "uid": 0,
    "appId": "your_agora_app_id",
    "expiresAt": "2025-11-15T12:00:00.000Z",
    "role": "subscriber"
  }
}
```

**Streaming Flow:**

1. **Creator starts stream**: `POST /api/sessions/:id/start-stream`
   - Backend generates Agora publisher token
   - Updates session status to "live"
   - Returns token and credentials
2. **Frontend initializes Agora SDK**: Uses token to publish camera/mic directly to Agora servers
3. **Viewers request token**: `GET /api/sessions/:id/stream-token`
   - Backend generates Agora subscriber token
   - Returns token for viewing
4. **Frontend subscribes**: Uses token to watch stream via Agora SDK
5. **Creator ends stream**: `POST /api/sessions/:id/end-stream`
   - Closes all active viewer sessions
   - Updates session status to "ended"

**Note:** Video/audio streams flow directly between browsers and Agora servers (WebRTC). Backend only handles token generation and session metadata.

## 👍 Reaction Analytics

**Endpoint:** `GET /api/sessions/:id/reactions`

Get reaction statistics for a session. Returns live data during active streams or persisted data for ended sessions.

**Response Format:**

```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "sessionStatus": "ended",
    "isLive": false,
    "reactions": {
      "like": 150,
      "heart": 200,
      "fire": 50,
      "clap": 30
    },
    "sortedReactions": [
      { "type": "heart", "count": 200 },
      { "type": "like", "count": 150 },
      { "type": "fire", "count": 50 },
      { "type": "clap", "count": 30 }
    ],
    "total": 430
  }
}
```

**How It Works:**

1. **During Live Stream:**
   - Reactions tracked in-memory (no DB overhead)
   - Real-time counts available via this endpoint
   - Broadcasted to all viewers via `reaction-stats` WebSocket event

2. **When Stream Ends:**
   - In-memory counts flushed to database (`Session.reactionCounts`)
   - Historical data persisted for analytics
   - Available via this endpoint after stream ends

**Frontend Usage:**

```javascript
// Get reaction stats
const response = await fetch(`/api/sessions/${sessionId}/reactions`);
const { data } = await response.json();

console.log(`Total reactions: ${data.total}`);
console.log(`Most popular: ${data.sortedReactions[0].type}`);
```

**Analytics Integration:**

Reaction data is also included in the comprehensive analytics endpoint:
- `GET /api/sessions/:sessionId/analytics` includes `reactions` field
- Shows total reactions and breakdown by type

## 💬 Chat Routes

**Base Path:** `/api/sessions/:sessionId/chat`

| Method   | Endpoint      | Purpose                         | Request Body  | Auth Required         | Query Params                 |
| -------- | ------------- | ------------------------------- | ------------- | --------------------- | ---------------------------- |
| `GET`    | `/`           | Get chat messages for session   | -             | No                    | `?limit=50&before=timestamp` |
| `GET`    | `/count`      | Get message count for session   | -             | No                    | -                            |
| `POST`   | `/`           | Send chat message               | `{ message }` | Yes                   | -                            |
| `DELETE` | `/:messageId` | Delete/moderate message (admin) | -             | Yes (admin/moderator) | -                            |

**Message Constraints:**

- Max length: 500 characters
- Messages are trimmed and cannot be empty

**Response Format (GET messages):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "message": "Hello everyone!",
      "userId": 1,
      "sessionId": "session-uuid",
      "createdAt": "2025-11-14T12:00:00.000Z",
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "count": 50
}
```

## 🛍️ Session Products Routes

**Base Path:** `/api/sessions/:sessionId/products`

Link products to live streaming sessions for showcasing during streams.

| Method   | Endpoint              | Purpose                       | Request Body                              | Auth Required   | Query Params     |
| -------- | --------------------- | ----------------------------- | ----------------------------------------- | --------------- | ---------------- |
| `GET`    | `/`                   | Get products for session      | -                                         | No              | `?featured=true` |
| `PATCH`  | `/`                   | Update featured products      | `{ productIds: string[] }`                | **Yes** (owner) | -                |
| `POST`   | `/`                   | Add product to session        | `{ productId, featured?, displayOrder? }` | **Yes** (owner) | -                |
| `DELETE` | `/:productId`         | Remove product                | -                                         | **Yes** (owner) | -                |
| `PATCH`  | `/:productId/feature` | Toggle featured status        | `{ featured: boolean }`                   | **Yes** (owner) | -                |
| `PATCH`  | `/:productId/order`   | Update display order          | `{ displayOrder: number }`                | **Yes** (owner) | -                |

### Update Featured Products (Bulk)

**Endpoint:** `PATCH /api/sessions/:sessionId/products`

Update which products are marked as featured in a session. Sets all provided productIds as featured=true, all others as featured=false.

**Request Body:**

```json
{
  "productIds": ["product-uuid-1", "product-uuid-3"]
}
```

**Response:**

```json
{
  "success": true,
  "message": "Featured products updated successfully",
  "data": [
    {
      "id": "product-uuid-1",
      "name": "Gaming Keyboard",
      "price": 129.99,
      "imageUrl": "https://..."
    },
    {
      "id": "product-uuid-3",
      "name": "Gaming Headset",
      "price": 89.99,
      "imageUrl": "https://..."
    }
  ]
}
```

**Validation:**
- All productIds must exist in the session's product list
- Only session owner can update featured products
- Returns only the featured products in response

## 📊 Session Analytics Routes

**Base Path:** `/api/sessions/:sessionId/analytics`

Get detailed analytics and insights for streaming sessions. **Requires authentication.**

| Method | Endpoint   | Purpose                             | Auth Required | Response Data                                                                                        |
| ------ | ---------- | ----------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `GET`  | `/`        | Get comprehensive session analytics | **Yes**       | Viewer stats, product list, reaction analytics, engagement timeline, retention breakdown             |
| `GET`  | `/live`    | Get currently active live viewers   | **Yes**       | Real-time list of viewers currently watching, with watch durations                                   |
| `GET`  | `/viewers` | Get detailed viewer history         | **Yes**       | Complete viewer list with join/leave times, watch durations, and user info (past & present)          |

## 🛒 Product Click Tracking & Conversion Analytics

**Base Path:** `/api/sessions/:sessionId`

Track and analyze product engagement during live streaming sessions.

| Method | Endpoint            | Purpose                                   | Auth Required | Response Data                                               |
| ------ | ------------------- | ----------------------------------------- | ------------- | ----------------------------------------------------------- |
| `GET`  | `/conversion-stats` | Get product click and conversion analytics | Optional      | Product click stats, CTR, unique/total clicks (live or historical) |

## 📈 Global Analytics (Creator Dashboard)

**Base Path:** `/api/analytics`

Aggregate analytics across all sessions for a creator.

| Method | Endpoint              | Purpose                                   | Auth Required | Response Data                                               |
| ------ | --------------------- | ----------------------------------------- | ------------- | ----------------------------------------------------------- |
| `GET`  | `/creator/:creatorId` | Get global analytics for all creator sessions | **Yes**   | Session summary, viewer stats, reactions, product performance |

### Get Creator Global Analytics

**Endpoint:** `GET /api/analytics/creator/:creatorId`

Get aggregated analytics across all sessions created by a specific creator. Perfect for creator dashboard overview.

**Response Format:**

```json
{
  "success": true,
  "creatorId": 1,
  "data": {
    "sessions": {
      "total": 15,
      "byStatus": {
        "live": 1,
        "ended": 10,
        "scheduled": 3,
        "paused": 1
      }
    },
    "viewers": {
      "totalUnique": 1250,
      "averagePerSession": 83,
      "peakConcurrent": 342
    },
    "reactions": {
      "total": 5430,
      "breakdown": {
        "heart": 2100,
        "like": 1800,
        "fire": 900,
        "clap": 630
      }
    },
    "products": {
      "totalClicks": 890,
      "uniqueUsers": 245,
      "averageCTR": 19.6
    }
  }
}
```

**Metrics Explained:**

**Sessions:**
- `total` - Total number of sessions created by the creator
- `byStatus` - Breakdown by session status (live, ended, scheduled, paused)

**Viewers:**
- `totalUnique` - Total distinct authenticated users who watched across all sessions
- `averagePerSession` - Average unique viewers per session
- `peakConcurrent` - Highest concurrent viewer count across any session

**Reactions:**
- `total` - Sum of all reactions across all sessions
- `breakdown` - Reactions grouped by type (heart, like, fire, clap, etc.)

**Products:**
- `totalClicks` - Sum of all product clicks across all sessions
- `uniqueUsers` - Total distinct users who clicked on products
- `averageCTR` - Average click-through rate across all sessions

**Use Cases:**
- Creator dashboard overview page
- Performance tracking over time
- Comparing session effectiveness
- Identifying trending content types

### Get Conversion Stats

**Endpoint:** `GET /api/sessions/:sessionId/conversion-stats`

Get product click tracking data and conversion metrics. Returns live data during active streams or persisted historical data for ended sessions.

**Response Format (Live Session):**

```json
{
  "success": true,
  "sessionId": "uuid",
  "sessionStatus": "live",
  "data": {
    "totalViewers": 271,
    "products": [
      {
        "productId": "uuid",
        "uniqueClicks": 42,
        "totalClicks": 67,
        "clickThroughRate": 15.5
      }
    ]
  }
}
```

**Response Format (Ended Session):**

```json
{
  "success": true,
  "sessionId": "uuid",
  "sessionStatus": "ended",
  "data": {
    "totalViewers": 271,
    "products": [
      {
        "productId": "uuid",
        "productName": "Cool Product",
        "uniqueClicks": 42,
        "totalClicks": 67,
        "clickThroughRate": 15.5,
        "createdAt": "2025-11-22T10:00:00.000Z",
        "updatedAt": "2025-11-22T10:00:00.000Z"
      }
    ]
  }
}
```

**Metrics Explained:**

- **uniqueClicks** - Number of distinct users who clicked on the product
- **totalClicks** - Total number of clicks (including repeat clicks)
- **clickThroughRate** - Percentage of viewers who clicked: `(uniqueClicks / totalViewers) × 100`
- **totalViewers** - Total number of viewers during the session

**Data Source:**

- **Live sessions**: Real-time data from in-memory tracking
- **Ended sessions**: Historical data from `product_click_stats` table

**Response Format (GET `/api/sessions/:sessionId/analytics`):**

```json
{
  "sessionId": "uuid",
  "session": {
    "title": "My Live Stream",
    "status": "live",
    "creator": { "id": 1, "name": "John Doe", "email": "john@example.com" },
    "createdAt": "2025-11-14T10:00:00.000Z",
    "updatedAt": "2025-11-14T10:30:00.000Z"
  },
  "viewers": {
    "unique": 150,
    "total": 175,
    "peak": 89,
    "avgWatchTime": 420,
    "avgWatchTimeFormatted": "7m 0s"
  },
  "products": {
    "total": 5,
    "featured": 2,
    "list": [
      {
        "productId": "uuid",
        "name": "Product Name",
        "featured": true,
        "displayOrder": 1,
        "addedAt": "2025-11-14T10:15:00.000Z"
      }
    ]
  },
  "reactions": {
    "total": 430,
    "breakdown": {
      "heart": 200,
      "like": 150,
      "fire": 50,
      "clap": 30
    }
  },
  "engagement": {
    "viewerTimeline": [
      {
        "timestamp": "2025-11-14T10:00:00",
        "joins": 25,
        "leaves": 5
      }
    ],
    "retention": {
      "ranges": [
        { "label": "0-30s", "count": 10 },
        { "label": "30s-1m", "count": 15 },
        { "label": "1m-5m", "count": 50 },
        { "label": "5m-15m", "count": 60 },
        { "label": "15m-30m", "count": 25 },
        { "label": "30m+", "count": 15 }
      ],
      "median": 360,
      "medianFormatted": "6m 0s",
      "p75": 720,
      "p75Formatted": "12m 0s",
      "p90": 1200,
      "p90Formatted": "20m 0s"
    }
  }
}
```

**Analytics Metrics Explained:**

- **Unique Viewers:** Count of distinct authenticated users who watched
- **Total Views:** Total number of view sessions (including guests)
- **Peak Viewers:** Maximum concurrent viewers at any point
- **Avg Watch Time:** Average duration viewers stayed (excludes <10s views)
- **Viewer Timeline:** Hourly breakdown of joins/leaves for trend analysis
- **Retention Ranges:** Distribution of viewer watch durations
- **Percentiles:** Median (50th), 75th, and 90th percentile watch times

## 🔍 Search & Discovery Routes

**Base Path:** `/api/search`

Search and filter across sessions and products with pagination support.

### Global Search

| Method | Endpoint | Purpose                             | Query Params                          | Auth Required |
| ------ | -------- | ----------------------------------- | ------------------------------------- | ------------- |
| `GET`  | `/`      | Search across sessions and products | `q` (required), `limit` (default: 10) | No            |

**Response Format:**

```json
{
  "sessions": [...],
  "products": [...],
  "counts": {
    "sessions": 15,
    "products": 8
  }
}
```

### Session Search

| Method | Endpoint                       | Purpose                      | Query Params                                                        | Auth Required |
| ------ | ------------------------------ | ---------------------------- | ------------------------------------------------------------------- | ------------- |
| `GET`  | `/sessions`                    | Search sessions with filters | `q`, `status`, `category`, `creatorId`, `sortBy`, `limit`, `offset` | No            |
| `GET`  | `/sessions/live`               | Get currently live sessions  | `limit` (default: 20), `offset` (default: 0)                        | No            |
| `GET`  | `/sessions/upcoming`           | Get scheduled sessions       | `limit` (default: 20), `offset` (default: 0)                        | No            |
| `GET`  | `/sessions/trending`           | Get trending sessions        | `limit` (default: 20), `offset` (default: 0)                        | No            |
| `GET`  | `/sessions/creator/:creatorId` | Get sessions by creator      | `limit` (default: 20), `offset` (default: 0)                        | No            |

**Query Parameters (Session Search):**

- `q` - Search query (searches in title, description, category, and tags)
- `status` - Filter by status: `live`, `scheduled`, `paused`, `ended`
- `category` - Filter by category (e.g., `gaming`, `fashion`, `tech`, `cooking`)
- `creatorId` - Filter by creator ID
- `sortBy` - Sort order: `newest` (default), `oldest`, `title`
- `limit` - Results per page (default: 20, max recommended: 100)
- `offset` - Number of results to skip (for pagination)

### Product Search

| Method | Endpoint    | Purpose                      | Query Params                                             | Auth Required |
| ------ | ----------- | ---------------------------- | -------------------------------------------------------- | ------------- |
| `GET`  | `/products` | Search products with filters | `q`, `minPrice`, `maxPrice`, `sortBy`, `limit`, `offset` | No            |

**Query Parameters (Product Search):**

- `q` - Search query (searches in name and description)
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `sortBy` - Sort order: `newest` (default), `oldest`, `price-asc`, `price-desc`, `name`
- `limit` - Results per page (default: 20, max recommended: 100)
- `offset` - Number of results to skip (for pagination)

**Paginated Response Format:**

```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

**Pagination Example:**

```javascript
// Page 1: offset=0, limit=20
GET /api/search/sessions?q=gaming&limit=20&offset=0

// Page 2: offset=20, limit=20
GET /api/search/sessions?q=gaming&limit=20&offset=20

// Page 3: offset=40, limit=20
GET /api/search/sessions?q=gaming&limit=20&offset=40
```

**Search Tips:**

- Use `q` parameter for text search (case-insensitive, partial match)
- Combine multiple filters for precise results
- Use `hasMore` field to determine if more pages exist
- Empty `q` parameter returns all results (filtered by other params)

## WebSocket Events

**URL:** `http://localhost:3000`

| Event               | Direction       | Payload                                                                                                 | Purpose                                                         |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `join-session`      | Client → Server | `{ sessionId: string, userId?: number }` or `sessionId: string`                                         | Join a streaming session room (tracks viewer analytics)         |
| `leave-session`     | Client → Server | `sessionId: string`                                                                                     | Leave a streaming session room                                  |
| `send-reaction`     | Client → Server | `{ sessionId: string, type: string }`                                                                   | Send reaction to session (e.g., 'like', 'love', 'fire', 'clap') |
| `send-message`      | Client → Server | `{ sessionId: string, message: string, userId: number, userName: string }`                              | Send chat message to session                                    |
| `showcase-product`    | Client → Server | `{ sessionId: string, productId: string \| null }`                                                      | Set or clear active product showcase (creator only)             |
| `track-product-click` | Client → Server | `{ sessionId: string, productId: string, userId: number \| null }`                                      | Track product click for conversion analytics                    |
| `viewer-count`        | Server → Client | `count: number`                                                                                         | Receive updated viewer count for session                        |
| `new-reaction`      | Server → Client | `{ type: string, timestamp: Date }`                                                                     | Receive new reaction in session                                 |
| `reaction-stats`    | Server → Client | `{ sessionId: string, counts: { [type: string]: number }, total: number }`                              | Receive updated reaction counts (broadcasted after each react)  |
| `new-message`       | Server → Client | `{ id: string, message: string, userId: number, userName: string, sessionId: string, createdAt: Date }` | Receive new chat message in session                             |
| `stream-started`    | Server → Client | `{ sessionId: string, channelName: string, status: "live", startedAt: Date }`                           | Stream has started (notify all in room)                         |
| `stream-ended`      | Server → Client | `{ sessionId: string, status: "ended", endedAt: Date }`                                                 | Stream has ended (notify all in room)                           |
| `product-showcased`   | Server → Client | `{ sessionId: string, productId: string, product: Product }`                                            | Product has been showcased (all viewers notified)               |
| `showcase-cleared`    | Server → Client | `{ sessionId: string }`                                                                                 | Product showcase has been cleared (all viewers notified)        |
| `product-click-stats` | Server → Client | `{ sessionId: string, productStats: Array, totalViewers: number, timestamp: Date }`                     | Product click statistics update (broadcasted every 4s)          |
| `trending-products`   | Server → Client | `{ sessionId: string, products: Array, timestamp: Date }`                                               | Top 5 trending products by clicks (broadcasted every 4s)        |

### Viewer Tracking & Role-Based Counting

**Important: Session owners (publishers) are NOT counted as viewers.**

When a user joins a session, the backend automatically determines their role:
- **Publisher:** User whose `userId` matches the session's `creatorId` (the stream owner)
- **Subscriber:** Everyone else, including authenticated users, guests, and other creators watching

**Viewer Count Rules:**
- Only **subscribers** are counted in viewer metrics
- **Publishers** can join their own session (to monitor chat/reactions) without inflating viewer count
- A creator watching another creator's stream is counted as a **subscriber** for that session

**Automatic Deduplication:**
- If a user reloads the page while watching, their previous session is automatically closed
- No duplicate viewer counting on page refresh
- Backend tracks by `userId` (authenticated) or `socketId` (guests)

**What Frontend Should Do:**

```javascript
// For ALL users (viewers and publishers), send the same payload:
socket.emit('join-session', {
  sessionId: 'session-uuid',
  userId: currentUser?.id  // undefined for guests
});

// Backend automatically determines if they're publisher or subscriber
// No need to send a 'role' field
```

**Page Lifecycle Best Practice:**

```javascript
// Optional but recommended: Clean up on page unload
window.addEventListener('beforeunload', () => {
  socket.emit('leave-session', sessionId);
});

// Backend handles disconnect automatically, but explicit leave is cleaner
```

**Example Scenarios:**

1. **Creator starts their stream and joins WebSocket:**
   - Role: `publisher`
   - Viewer count: 0 (not counted)
   - Console: "🎥 Publisher joined their own session"

2. **Viewer watches the stream:**
   - Role: `subscriber`
   - Viewer count: 1
   - Console: "👤 Viewer joined session"

3. **Viewer reloads page:**
   - Old session automatically closed
   - New session created
   - Viewer count: Still 1 (no duplicate)

4. **Creator A watches Creator B's stream:**
   - Role: `subscriber` (because it's not their session)
   - Viewer count: Incremented
   - Counted as a regular viewer

**Analytics Impact:**
- `GET /api/sessions/:id/analytics` excludes publishers from all metrics
- `GET /api/sessions/:id/analytics/live` shows only active subscribers
- `GET /api/sessions/:id/analytics/viewers` separates publishers and subscribers

**Session View Database Tracking:**

Each join creates a `SessionView` record with:
- `sessionId` - Which session
- `userId` - Who joined (null for guests)
- `role` - "publisher" or "subscriber"
- `joinedAt` - When they joined
- `leftAt` - When they left (null if still active)
- `watchDuration` - Calculated on leave (in seconds)
- `socketId` - For tracking reconnections

### Real-time Reaction Tracking

**Frontend Implementation:**

```javascript
// Send a reaction
socket.emit('send-reaction', {
  sessionId: 'session-uuid',
  type: 'heart'  // Can be: like, heart, fire, clap, or custom
});

// Listen for individual reactions (for animations)
socket.on('new-reaction', (data) => {
  // data: { type: 'heart', timestamp: Date }
  // Show floating emoji animation
  animateReaction(data.type);
});

// Listen for aggregated reaction stats (for dashboard)
socket.on('reaction-stats', (data) => {
  // data: { sessionId, counts: { like: 50, heart: 100 }, total: 150 }
  updateReactionDisplay(data.counts);
});
```

**Backend Behavior:**

1. **During Live Stream:**
   - Each `send-reaction` increments in-memory counter
   - Broadcasts `new-reaction` (for animations)
   - Broadcasts `reaction-stats` (for live counts)
   - No database writes (performance optimized)

2. **When Stream Ends:**
   - In-memory counts automatically saved to `Session.reactionCounts`
   - Data persisted for post-stream analytics
   - Accessible via `GET /api/sessions/:id/reactions`

**Use Cases:**

- **Live Dashboard:** Show reaction counts to broadcaster in real-time
- **Viewer Engagement:** Display trending reactions during stream
- **Post-Stream Analytics:** Analyze which moments resonated with audience
- **Gamification:** Award badges for most-reacted streams

### Product Showcase (Real-time)

**Frontend Implementation:**

```javascript
// Creator: Showcase a product via WebSocket
socket.emit('showcase-product', {
  sessionId: 'session-uuid',
  productId: 'product-uuid'  // or null to clear
});

// Creator: Showcase a product via REST API (alternative)
fetch(`/api/sessions/${sessionId}/showcase`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ productId: 'product-uuid' })
});

// All viewers: Listen for showcase updates
socket.on('product-showcased', (data) => {
  // data: { sessionId, productId, product: { id, name, price, imageUrl, ... } }
  // Display showcased product prominently (e.g., modal, overlay, sidebar)
  displayShowcasedProduct(data.product);
});

socket.on('showcase-cleared', (data) => {
  // data: { sessionId }
  // Hide showcased product display
  hideShowcasedProduct();
});
```

**Backend Behavior:**

1. **WebSocket Method (`showcase-product`):**
   - Validates session exists and is live/paused
   - Verifies product is in session's product list
   - Updates `Session.activeProductId` in database
   - Broadcasts to all viewers in real-time
   - No response to sender (fire-and-forget)

2. **REST Method (`POST /api/sessions/:id/showcase`):**
   - Same validation as WebSocket
   - Updates database
   - Broadcasts to all viewers
   - Returns response to caller with updated data

**Use Cases:**

- **Live Product Demo:** Creator showcases product while demonstrating it
- **Q&A:** Viewer asks about product, creator highlights it
- **Sales Focus:** Creator draws attention to featured/discounted items
- **Clear Showcase:** Creator removes highlight to focus on content

**Validation Rules:**

- Session must be `live` or `paused` (not scheduled or ended)
- Product must exist in session's product list
- Only session owner/creator can trigger showcase
- Setting `productId: null` clears the showcase

**Frontend UX Recommendations:**

- Show showcased product in a prominent but non-intrusive location
- Include "Buy Now" or "Learn More" button
- Auto-dismiss after 30-60 seconds (optional)
- Allow viewers to manually dismiss
- Show product image, name, price, and description

**Note:** For persistent chat storage, also use the REST API endpoints. WebSocket events provide real-time broadcasting only.

### Product Click Tracking (Real-time)

**Frontend Implementation:**

```javascript
// Viewer: Track a product click when user clicks on a product
socket.emit('track-product-click', {
  sessionId: 'session-uuid',
  productId: 'product-uuid',
  userId: currentUser?.id || null  // null for anonymous users
});

// Creator Dashboard: Listen for detailed click statistics
socket.on('product-click-stats', (data) => {
  // data: {
  //   sessionId: 'uuid',
  //   productStats: [
  //     {
  //       productId: 'uuid',
  //       uniqueClicks: 42,
  //       totalClicks: 67,
  //       clickThroughRate: 15.5
  //     }
  //   ],
  //   totalViewers: 271,
  //   timestamp: '2025-11-22T...'
  // }

  // Update creator dashboard with conversion metrics
  updateConversionDashboard(data);
});

// All Viewers: Listen for trending products (top 5)
socket.on('trending-products', (data) => {
  // data: {
  //   sessionId: 'uuid',
  //   products: [
  //     { productId: 'uuid', uniqueClicks: 42, totalClicks: 67, clickThroughRate: 15.5 }
  //   ],
  //   timestamp: '2025-11-22T...'
  // }

  // Display trending products to viewers
  updateTrendingProductsList(data.products);
});

// Fetch historical conversion data after stream ends
const response = await fetch(`/api/sessions/${sessionId}/conversion-stats`);
const { data } = await response.json();
console.log('Historical conversion data:', data);
```

**Backend Behavior:**

1. **Click Tracking (`track-product-click`):**
   - Validates session exists and is live
   - Verifies product is linked to the session
   - Tracks unique users (supports authenticated and anonymous)
   - Increments total click counter
   - No response to sender (fire-and-forget)

2. **Real-time Broadcasting:**
   - Starts automatically on first click in a session
   - Broadcasts every 4 seconds during active session
   - `product-click-stats` - Detailed stats for all viewers (includes creator)
   - `trending-products` - Top 5 products by unique clicks
   - Updates viewer count from SessionView service

3. **Data Persistence:**
   - Click data tracked in-memory during live session
   - Automatically saved to `product_click_stats` table when stream ends
   - Memory cleared after persistence to prevent leaks
   - Historical data accessible via REST API

**Validation Rules:**

- Session must be `live` (not scheduled, paused, or ended)
- Product must exist in session's product list
- Anonymous users get unique identifiers for deduplication
- Click-through rate calculated as: `(uniqueClicks / totalViewers) × 100`

**Use Cases:**

- **Conversion Analytics:** Track which products viewers are interested in
- **Real-time Optimization:** Creator adjusts focus based on trending products
- **Post-Stream Insights:** Analyze product engagement after stream ends
- **A/B Testing:** Compare product presentation strategies across sessions

**Performance:**

- In-memory tracking uses Set for O(1) unique user lookup
- Broadcasts throttled to 4-second intervals (no database overhead)
- Database writes only on session end
- Supports reconnections without data loss

## Health Check

| Method | Endpoint  | Purpose              |
| ------ | --------- | -------------------- |
| `GET`  | `/health` | Server health status |
