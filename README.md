# Stream Bazaar Backend

Backend API for Stream Bazaar - a live streaming e-commerce platform that enables creators to broadcast live video sessions while showcasing and selling products in real-time.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with TypeORM
- **Real-time:** Socket.IO (WebSocket)
- **Streaming:** Agora RTC (token generation)
- **Authentication:** JWT

## Features

- **User Authentication:** JWT-based auth with bcrypt password hashing
- **Live Streaming:** Agora token generation for publishers and subscribers
- **Real-time Chat:** WebSocket-powered chat with viewer count tracking
- **Session Management:** Create, manage, and broadcast live sessions
- **Product Management:** CRUD operations for products
- **Analytics:** Comprehensive viewer metrics, engagement stats, and conversion tracking
- **Search:** Full-text search across sessions and products

## Quick Start

### Prerequisites

- Node.js >= 14
- PostgreSQL database
- Agora account (for streaming features)

### Installation

```bash
# Install dependencies
npm install

# Configure environment variables (see Configuration section)
cp .env.example .env

# Run database migrations
npm run migration:run

# Start development server
npm run dev
```

### Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm start            # Run production build
npm run start:prod   # Build and start production server

# Database migrations
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
```

## Configuration

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=stream_bazaar

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Agora (for live streaming)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# CORS
CORS_ORIGIN=http://localhost:3001
```

## Project Structure

```
src/
├── controllers/       # Route controllers (business logic)
├── entities/          # TypeORM entities (database models)
├── middlewares/       # Express middlewares (auth, error handling)
├── routes/            # API route definitions
├── services/          # Business logic layer
├── ws/               # WebSocket handlers
├── data-source.ts    # TypeORM configuration
└── index.ts          # Application entry point
```

## API Documentation

See [API_ROUTES.md](./API_ROUTES.md) for complete endpoint documentation.

**Base URL:** `http://localhost:3000/api`

### Quick Reference

- **Auth:** `/api/auth/*` - Registration, login, user management
- **Sessions:** `/api/sessions/*` - Stream session CRUD and controls
- **Products:** `/api/products/*` - Product management
- **Users:** `/api/users/*` - User profiles and discovery
- **Chat:** `/api/sessions/:id/chat/*` - Chat history and messaging
- **Analytics:** `/api/sessions/:id/analytics/*` - Viewer and engagement metrics
- **Search:** `/api/search/*` - Global search and filtering

### WebSocket Events

**Client → Server:**

- `join-session` - Join a session room
- `leave-session` - Leave a session room
- `send-message` - Send chat message
- `send-reaction` - Send reaction (like, heart, etc.)
- `product-click` - Track product click

**Server → Client:**

- `new-message` - New chat message broadcast
- `new-reaction` - New reaction broadcast
- `viewer-count` - Updated viewer count
- `stream-started` - Stream went live
- `stream-ended` - Stream ended
- `product-showcased` - Product highlighted
- `showcase-cleared` - Showcase cleared

## Authentication

Most endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Obtain a token by calling `POST /api/auth/login` or `POST /api/auth/register`.

## Database

This project uses TypeORM with PostgreSQL. Database schema is managed through migrations.

### Creating Migrations

```bash
# After modifying entities
npm run migration:generate -- -n DescriptiveName
npm run migration:run
```

### Entity Models

- **User** - User accounts (creators and viewers)
- **Session** - Live streaming sessions
- **Product** - Products for sale
- **ChatMessage** - Chat messages
- **SessionView** - Viewer tracking and watch time
- **SessionProduct** - Session-product associations
- **ProductClickStats** - Product click tracking

## Development

### Running in Development Mode

```bash
npm run dev
```

Server runs on `http://localhost:3000` with auto-reload enabled.

### CORS Configuration

Frontend runs on port 3001. Update `CORS_ORIGIN` in `.env` for different origins.

## Deployment

### Build for Production

```bash
npm run build
```

Compiled JavaScript outputs to `build/` directory.

### Environment Variables

Ensure all production environment variables are set:

- Use strong `JWT_SECRET`
- Configure production database credentials
- Set `NODE_ENV=production`
- Update `CORS_ORIGIN` to production frontend URL

### Running in Production

```bash
npm run start:prod
```

Or manually:

```bash
npm run build
node build/index.js
```

## Architecture Highlights

### Agora Integration

- Backend generates RTC tokens with role-based permissions
- **Publisher tokens:** For stream creators (can publish audio/video)
- **Subscriber tokens:** For viewers (can only subscribe)
- Tokens expire after 24 hours

### WebSocket Architecture

- Socket.IO manages real-time features
- Session rooms for isolated communication
- Automatic viewer count updates
- Role-based permissions (publisher vs subscriber)

### Analytics System

- Real-time tracking during live sessions (in-memory)
- Persistent storage when session ends
- Metrics: unique viewers, peak concurrent, watch time, reactions, product clicks
