# Stream Bazaar - Backend Context

## Project Summary
Stream Bazaar is a live streaming e-commerce platform backend that enables creators to host live video shopping sessions. Viewers can watch streams, chat in real-time, send reactions, and browse products being showcased. Built with TypeScript, Express, and TypeORM.

**Key Capabilities:**
- Live video streaming via Agora RTC
- Real-time chat, reactions, and Q&A via WebSocket
- Product catalog management
- Session (live stream) creation and control
- Comprehensive analytics (viewers, engagement, retention)
- JWT-based authentication with refresh tokens

## Tech Stack

**Core:**
- Node.js + TypeScript
- Express 5.x (REST API)
- TypeORM 0.3.x (ORM)
- PostgreSQL (database)
- Socket.io 4.x (WebSocket real-time)

**Key Dependencies:**
- `agora-token` - Generate Agora RTC tokens for streaming
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT auth
- `cookie-parser` - Cookie handling
- `cors` - CORS middleware

**Scripts:**
- `npm run dev` - Development server (ts-node-dev)
- `npm run build` - TypeScript compilation
- `npm start` - Production server
- `npm run migration:generate` - Generate TypeORM migration
- `npm run migration:run` - Apply migrations

## Architecture

### Folder Structure
```
src/
├── config/           # Environment configuration
├── controllers/      # Request handlers (thin layer)
├── entity/           # TypeORM entities (data models)
├── middleware/       # Auth, error handling, logging
├── routes/           # Express route definitions
├── services/         # Business logic layer
├── utils/            # Helper functions
├── ws/               # WebSocket handlers
├── data-source.ts    # TypeORM connection config
└── index.ts          # App entry point
```

### Request Flow
1. **Request** → Express Route → Middleware (auth, validation)
2. **Controller** → Extracts params/body, calls service
3. **Service** → Business logic, database operations via TypeORM
4. **Response** → Controller sends standardized JSON response

**Standard Response Format:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## Core Entities

### User
- `id` (number) - Primary key
- `username` (string) - Display name
- `email` (string) - Unique, login identifier
- `password` (string) - Bcrypt hashed, not selected by default
- `role` (string) - "viewer" or "creator" (default: viewer)
- `refreshToken` (string) - JWT refresh token storage

### Session
- `id` (uuid) - Primary key
- `title` (string) - Stream title
- `description` (text) - Optional description
- `category` (string) - e.g., "gaming", "fashion", "tech"
- `tags` (string[]) - Array of tags
- `status` (enum) - "scheduled", "live", "paused", "ended"
- `agoraChannelName` (string) - Agora channel identifier
- `startedAt`, `endedAt` (timestamp) - Stream timing
- `creatorId` (number) - Foreign key to User

### Product
- `id` (uuid) - Primary key
- `name` (string) - Product name
- `description` (text) - Product details
- `price` (decimal) - Current price
- `originalPrice` (decimal) - Optional, for discounts
- `category` (string) - Product category
- `inStock` (boolean) - Availability
- `imageUrl` (string) - Product image
- `sellerId` (number) - Optional, foreign key to User

### SessionProduct (join table)
Links products to sessions with display metadata:
- `sessionId`, `productId` - Composite key
- `featured` (boolean) - Highlight this product
- `displayOrder` (number) - Sort order

### ChatMessage
- `id` (uuid) - Primary key
- `sessionId` (uuid) - Foreign key
- `userId` (number) - Foreign key (nullable for guests)
- `message` (string) - Max 500 chars
- `createdAt` (timestamp)

### SessionView (analytics)
- `id` (uuid) - Primary key
- `sessionId` (uuid) - Foreign key
- `userId` (number) - Foreign key (nullable for guests)
- `joinedAt` (timestamp) - When viewer joined
- `leftAt` (timestamp) - When viewer left (nullable if still watching)
- Auto-calculates watch duration for analytics

## Code Patterns & Conventions

### Service Pattern
Services handle business logic and database operations:
```typescript
export class ExampleService {
  private repository = AppDataSource.getRepository(Entity);

  async findAll(): Promise<Entity[]> { ... }
  async findOne(id: string): Promise<Entity | null> { ... }
  async create(data: Partial<Entity>): Promise<Entity> { ... }
  async update(id: string, data: Partial<Entity>) { ... }
  async delete(id: string): Promise<boolean> { ... }
}
```

### Controller Pattern
Controllers are thin - validate, call service, return response:
```typescript
export const getAll = async (req: Request, res: Response) => {
  try {
    const service = new ExampleService();
    const data = await service.findAll();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

### Authentication Middleware
- `authenticate` - Requires valid JWT, attaches `req.user`
- `authorize(...roles)` - Checks user role
- `optionalAuth` - Attaches user if token present, doesn't fail if missing

Usage: `router.get('/protected', authenticate, authorize('creator'), handler);`

### Error Handling
- Controllers wrap logic in try/catch
- Central error middleware in `src/middleware/error.middleware.ts`
- Errors include `success: false` and `message` field

### TypeORM Patterns
- Use `eager: true` for automatic relation loading when needed
- Use `select: false` for sensitive fields (password, refreshToken)
- UUID primary keys for public-facing entities (Session, Product)
- Integer IDs for User (legacy decision)

## Active Features

### Authentication (`/api/auth`)
- Register, login, logout
- Access token (15m) + refresh token (7d)
- Current user endpoint
- Token refresh endpoint
- Update user info

### Session Management (`/api/sessions`)
- CRUD operations for streaming sessions
- Start stream - generates Agora publisher token, sets status to "live"
- End stream - stops broadcast, updates status
- Get stream token - generates Agora subscriber token for viewers
- Refresh token - renew Agora tokens for long streams (1hr+ default expiry)
- Filter by creator, status
- Ownership verification for protected actions

### Real-time Features (WebSocket)
- Join/leave session rooms (tracks viewer analytics)
- Live chat messages (persisted to DB)
- Reactions (like, heart, fire, clap)
- Viewer count updates
- Stream started/ended notifications
- Real-time analytics updates

### Product Management (`/api/products`)
- Full CRUD for products
- Support for images, pricing, categories
- Stock tracking

### Session Products (`/api/sessions/:id/products`)
- Link products to sessions
- Mark products as featured
- Set display order
- Query featured products
- Remove products from session

### Analytics (`/api/sessions/:id/analytics`)
- Comprehensive dashboard: viewers, products, engagement
- Live viewer tracking (currently watching)
- Complete viewer history (past & present)
- Metrics: unique viewers, total views, peak concurrent, avg watch time
- Engagement timeline (hourly join/leave breakdown)
- Retention analysis (watch duration distribution + percentiles)

### Search & Discovery (`/api/search`)
- Global search (sessions + products)
- Session search with filters (status, category, creator)
- Product search with price filters
- Pagination support (limit, offset)
- Trending sessions, live sessions, upcoming sessions

### Chat API (`/api/sessions/:id/chat`)
- Get chat history (paginated)
- Message count
- Send messages (via REST or WebSocket)
- Delete messages (admin/moderator)

## Recent Work & Fixes

### Agora Integration Fix (Critical)
**Issue:** Token generation failing due to passing 7 parameters instead of 6 to `RtcTokenBuilder.buildTokenWithUid()`
**Fixed:** `src/services/agora.service.ts:94-104` - Removed extra `tokenExpire` parameter
**Impact:** Tokens now generate correctly, streams work end-to-end

### Chat Persistence
**Issue:** WebSocket messages not saved to database
**Fixed:** `src/ws/socket.handler.ts:82-121` - Added ChatService integration, save before broadcast
**Impact:** Chat history survives page refreshes

### Stream Status Notifications
**Added:** `src/ws/socket.handler.ts`, `src/controllers/sessions.controller.ts`
**Events:** `stream-started`, `stream-ended` - Real-time viewer notifications
**Impact:** Viewers instantly know when stream status changes

### Token Refresh Endpoint
**Added:** `POST /api/sessions/:id/refresh-token`
**Purpose:** Support streams longer than 1 hour (default token expiry)
**Roles:** Publisher (requires auth + ownership) & Subscriber (public)

### Analytics Implementation
**Completed:** Full analytics dashboard with viewer tracking, retention, engagement metrics
**Files:** `src/controllers/analytics.controller.ts`, `src/routes/analytics.routes.ts`

## Known Issues & TODOs

### Current Status
No critical bugs. System is functional and production-ready for core features.

### Future Enhancements (Not Blocking)
- [ ] Product click-through tracking in analytics
- [ ] Revenue/sales tracking per session
- [ ] Persistent reaction analytics (currently real-time only)
- [ ] Email verification for registration
- [ ] Password reset flow
- [ ] Rate limiting for API endpoints
- [ ] Pagination for session lists
- [ ] Image upload service (currently expects URLs)
- [ ] Webhook integration for payment processing
- [ ] Multi-language support

### Frontend Development
See `docs/FRONTEND_BUILD_BLUEPRINT.md` for detailed Next.js implementation plan. Key phases:
1. Auth foundation
2. Admin product/session management
3. Live streaming (Agora integration)
4. Real-time features (chat, reactions)
5. Analytics dashboard
6. Polish & testing

## Environment Setup

**Required Environment Variables:**
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=streamcart

# JWT
JWT_SECRET=change-in-production
JWT_REFRESH_SECRET=change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Agora (from https://console.agora.io/)
AGORA_APP_ID=your-app-id
AGORA_APP_CERTIFICATE=your-certificate
AGORA_TOKEN_EXPIRY=3600

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

**Setup Steps:**
1. Install PostgreSQL, create database
2. Copy `.env.example` to `.env`, fill values
3. `npm install`
4. `npm run migration:run` (if migrations exist)
5. `npm run dev`

**Testing Agora:**
```bash
curl http://localhost:3000/api/test-agora
```

## Key Files Reference

**Entry Point:** `src/index.ts:1-129` - Server initialization, middleware, routes
**Database Config:** `src/data-source.ts` - TypeORM connection setup
**Config:** `src/config/index.ts:1-29` - Environment variable mapping
**Auth Middleware:** `src/middleware/auth.middleware.ts:16-85` - JWT verification
**Socket Handler:** `src/ws/socket.handler.ts` - WebSocket event handling
**Agora Service:** `src/services/agora.service.ts` - Token generation, critical for streaming

**Documentation:**
- `API_ROUTES.md` - Complete API reference
- `AGORA_FIXES.md` - Details on Agora integration fixes
- `ANALYTICS_SUMMARY.md` - Analytics implementation notes
- `docs/FRONTEND_BUILD_BLUEPRINT.md` - Frontend development guide

## Code Style

- **Naming:** camelCase for variables/functions, PascalCase for classes/entities
- **Imports:** Group by type (external, internal, relative)
- **TypeScript:** Explicit types for function parameters/returns, let TypeScript infer locals
- **Async/Await:** Prefer over promises/callbacks
- **Error Handling:** Try/catch in controllers, throw errors in services
- **Constants:** UPPER_SNAKE_CASE
- **Formatting:** 2-space indent (from TypeScript defaults)

## Quick Start Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Testing
curl http://localhost:3000/health                     # Health check
curl http://localhost:3000/api/test-agora             # Test Agora setup
curl http://localhost:3000/api/sessions               # Get all sessions

# Database
npm run migration:generate -- -n MigrationName        # Create migration
npm run migration:run                                  # Apply migrations
npm run migration:revert                               # Rollback last migration

# Production
npm run build            # Compile TypeScript
npm start               # Run compiled JS
```

## Notes

- Database name is `streamcart` (historical name, predates "stream-bazaar" branding)
- CORS is wide open (`*`) for development - restrict in production
- Agora tokens expire after 1 hour by default - clients should refresh before expiry
- Anonymous viewers supported (userId = null in SessionView, ChatMessage)
- WebSocket events are real-time only - REST APIs provide persistence
- All timestamps are UTC
