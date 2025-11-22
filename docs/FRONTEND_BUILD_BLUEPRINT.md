# Frontend Build Blueprint - Minimal Functional UI

## Overview
This blueprint outlines the steps to build a minimal functional live streaming commerce platform frontend using Next.js. Focus is on functionality first, styling perfection later.

---

## Phase 0: Project Setup & Foundation

### Task 0.1: Initialize Next.js Project
- [ ] Create new Next.js project with TypeScript
- [ ] Choose App Router (not Pages Router)
- [ ] Install core dependencies:
  - Tailwind CSS (minimal styling)
  - Socket.io-client (real-time features)
  - Agora SDK for React (video streaming)
  - Axios or fetch wrapper (API calls)
  - React Hook Form + Zod (forms & validation)

### Task 0.2: Environment Configuration
- [ ] Create `.env.local` file with backend API URL
- [ ] Add Agora App ID and credentials
- [ ] Add WebSocket server URL
- [ ] Create environment variable type definitions

### Task 0.3: Project Structure Setup
- [ ] Create folder structure:
  - `/app/(admin)` - Admin routes
  - `/app/(viewer)` - Viewer routes
  - `/components` - Reusable components
  - `/lib` - Utilities, API clients, WebSocket setup
  - `/types` - TypeScript type definitions
  - `/hooks` - Custom React hooks

### Task 0.4: Core Utilities Setup
- [ ] Create API client utility (axios instance with base URL, interceptors)
- [ ] Create WebSocket client setup (singleton pattern)
- [ ] Create type definitions for:
  - User, Session, Product, ChatMessage entities
  - API request/response types
  - WebSocket event types

---

## Phase 1: Authentication Foundation

### Task 1.1: Auth API Integration
- [ ] Create auth service functions (login, register, logout)
- [ ] Set up token storage strategy (localStorage or cookies)
- [ ] Create API interceptor to attach auth token to requests
- [ ] Handle token refresh if applicable

### Task 1.2: Auth Context/State
- [ ] Create authentication context or state store
- [ ] Track current user, auth status, loading states
- [ ] Implement login/logout actions
- [ ] Persist auth state across page refreshes

### Task 1.3: Auth UI Pages
- [ ] Create login page (`/login`)
- [ ] Create register page (`/register`)
- [ ] Basic forms with email/password fields
- [ ] Form validation (email format, password requirements)
- [ ] Error message display
- [ ] Success redirects

### Task 1.4: Route Protection
- [ ] Create middleware or HOC to protect admin routes
- [ ] Redirect unauthenticated users to login
- [ ] Check user role (admin vs viewer) if applicable
- [ ] Redirect authenticated users away from login page

---

## Phase 2: Admin - Product Management

### Task 2.1: Product List Page
- [ ] Create admin product list page (`/admin/products`)
- [ ] Fetch products from backend API
- [ ] Display products in a simple table/grid
- [ ] Show: product name, price, image thumbnail
- [ ] Add "Create New Product" button
- [ ] Add edit/delete buttons for each product

### Task 2.2: Create Product Flow
- [ ] Create "Add Product" page/modal
- [ ] Form fields: name, description, price, category
- [ ] Image upload functionality
- [ ] Handle image file upload to backend
- [ ] Form validation (required fields, price format)
- [ ] Submit to backend API
- [ ] Success/error feedback
- [ ] Redirect to product list on success

### Task 2.3: Edit Product Flow
- [ ] Create "Edit Product" page/modal
- [ ] Pre-populate form with existing product data
- [ ] Allow updating all fields
- [ ] Handle image replacement
- [ ] Submit updates to backend
- [ ] Update UI optimistically or refetch

### Task 2.4: Delete Product Flow
- [ ] Add delete confirmation dialog
- [ ] Send delete request to backend
- [ ] Remove from UI on success
- [ ] Handle errors (e.g., product in active session)

---

## Phase 3: Admin - Session Management

### Task 3.1: Session List Page
- [ ] Create admin session list page (`/admin/sessions`)
- [ ] Fetch all sessions (upcoming, live, past)
- [ ] Display session cards with: title, status, scheduled time, viewer count
- [ ] Filter by status (upcoming/live/ended)
- [ ] Add "Create Session" button
- [ ] Add controls for each session (start/pause/end)

### Task 3.2: Create Session Flow
- [ ] Create "New Session" page/modal
- [ ] Form fields: title, description, scheduled start time
- [ ] Select products to feature in session
- [ ] Submit to backend to create session
- [ ] Validation (title required, valid datetime)
- [ ] Redirect to session control page

### Task 3.3: Session Control Dashboard
- [ ] Create session control page (`/admin/sessions/[id]`)
- [ ] Display session details and status
- [ ] Fetch Agora streaming token from backend
- [ ] Show current viewer count (real-time via WebSocket)
- [ ] Display featured products for this session
- [ ] Add/remove products during session

### Task 3.4: Live Stream Controls (Admin/Host)
- [ ] Initialize Agora client for publishing stream
- [ ] Create "Start Stream" button
- [ ] Start Agora video/audio publishing
- [ ] Update session status to "live" via API
- [ ] Create "Pause Stream" button (mute audio/video)
- [ ] Create "End Stream" button
- [ ] Stop Agora publishing and update session status
- [ ] Handle errors (permissions, network issues)

---

## Phase 4: Viewer - Session Discovery & Join

### Task 4.1: Session Browse Page
- [ ] Create viewer homepage (`/browse` or `/`)
- [ ] Fetch and display live sessions
- [ ] Show upcoming sessions
- [ ] Display session card: title, thumbnail, viewer count, status
- [ ] Click to join live session

### Task 4.2: Live Session Viewer Page
- [ ] Create viewer page (`/live/[sessionId]`)
- [ ] Fetch session details from backend
- [ ] Check if session is live
- [ ] Fetch Agora viewer token from backend
- [ ] Handle session not found or ended states

### Task 4.3: Video Stream Viewer
- [ ] Initialize Agora client for subscribing
- [ ] Join Agora channel with viewer token
- [ ] Subscribe to host's video/audio stream
- [ ] Display video in player component
- [ ] Handle stream quality/buffering
- [ ] Auto-reconnect on connection loss
- [ ] Display "Stream Offline" when host disconnects

---

## Phase 5: Viewer - Real-time Interactions

### Task 5.1: WebSocket Connection Setup
- [ ] Connect to WebSocket server when joining session
- [ ] Join session room (send session ID)
- [ ] Handle connection/disconnection events
- [ ] Set up reconnection logic
- [ ] Clean up connection on page leave

### Task 5.2: Live Chat Feature
- [ ] Create chat UI component (message list + input)
- [ ] Display incoming chat messages from WebSocket
- [ ] Show username and message content
- [ ] Auto-scroll to latest message
- [ ] Create message input field
- [ ] Send chat message via WebSocket
- [ ] Display own messages immediately (optimistic UI)
- [ ] Handle message send errors

### Task 5.3: Live Reactions Feature
- [ ] Create reaction button UI (like, heart, thumbs up, etc.)
- [ ] Send reaction event via WebSocket on click
- [ ] Display reaction animation locally
- [ ] Receive and display others' reactions
- [ ] Animate reactions floating up the screen
- [ ] Auto-remove after animation completes

### Task 5.4: Questions/Q&A Feature
- [ ] Create "Ask Question" input/button
- [ ] Send question via WebSocket or API
- [ ] Display submitted question in UI
- [ ] Show question status (pending/answered)
- [ ] Display host's answer when received via WebSocket
- [ ] Highlight answered questions

---

## Phase 6: Real-time Product Showcase

### Task 6.1: Product Sidebar/Panel
- [ ] Create product display panel in viewer page
- [ ] Position alongside video player
- [ ] Show products featured in this session

### Task 6.2: Active Product Highlight
- [ ] Listen for "product showcase" events via WebSocket
- [ ] Highlight currently showcased product
- [ ] Display: image, name, description, price
- [ ] Add visual indicator (border, badge, animation)
- [ ] Show "Currently Showcased" label

### Task 6.3: Product Showcase Controls (Admin)
- [ ] In admin session control, list session products
- [ ] Add "Showcase Now" button for each product
- [ ] Send showcase event to backend/WebSocket
- [ ] Broadcast to all viewers
- [ ] Show which product is currently showcased
- [ ] Allow clearing active product

---

## Phase 7: Live Analytics Dashboard

### Task 7.1: Real-time Viewer Count
- [ ] Display current viewer count in admin dashboard
- [ ] Update via WebSocket events
- [ ] Show viewer count in viewer page too
- [ ] Track viewer join/leave events

### Task 7.2: Reaction Analytics
- [ ] Create analytics panel in admin session control
- [ ] Display reaction counts by type (likes, hearts, etc.)
- [ ] Update counts in real-time via WebSocket
- [ ] Show reaction trends (chart or simple bars)
- [ ] Calculate engagement rate (reactions per viewer)

### Task 7.3: Engagement Metrics
- [ ] Display total chat messages sent
- [ ] Show questions asked count
- [ ] Calculate and show engagement rate
- [ ] Display peak viewer count
- [ ] Show average watch time if available from backend

### Task 7.4: Top Viewers & Trending Products
- [ ] Display most active viewers (by messages/reactions)
- [ ] Show products with most reactions/interest
- [ ] Update in real-time during session
- [ ] Simple list/table format (no fancy charts needed initially)

---

## Phase 8: Polish & Error Handling

### Task 8.1: Loading States
- [ ] Add loading spinners for all async operations
- [ ] Show skeleton loaders for lists/grids
- [ ] Disable buttons during submission
- [ ] Show progress for file uploads

### Task 8.2: Error Handling
- [ ] Display API error messages to users
- [ ] Show WebSocket connection errors
- [ ] Handle video stream failures gracefully
- [ ] Add retry mechanisms for failed requests
- [ ] Validate all form inputs
- [ ] Show validation errors inline

### Task 8.3: Responsive Design (Basic)
- [ ] Ensure pages work on mobile/tablet
- [ ] Stack layouts vertically on small screens
- [ ] Make video player responsive
- [ ] Ensure chat is usable on mobile
- [ ] Test all features on different screen sizes

### Task 8.4: User Feedback
- [ ] Add toast notifications for success/error
- [ ] Confirm destructive actions (delete, end stream)
- [ ] Show connection status (online/offline)
- [ ] Display "saving..." or "sending..." indicators

---

## Phase 9: Testing & Optimization

### Task 9.1: Feature Testing
- [ ] Test admin product CRUD operations
- [ ] Test session creation and control flow
- [ ] Test live streaming (start/pause/end)
- [ ] Test viewer joining and watching stream
- [ ] Test chat, reactions, questions
- [ ] Test real-time analytics updates
- [ ] Test multi-user scenarios (multiple viewers)

### Task 9.2: Edge Cases
- [ ] Test with no internet connection
- [ ] Test session that hasn't started yet
- [ ] Test joining ended session
- [ ] Test with very long product descriptions
- [ ] Test with many chat messages (performance)
- [ ] Test rapid reaction spamming
- [ ] Test browser refresh during live stream

### Task 9.3: Performance Optimization
- [ ] Optimize image sizes/formats
- [ ] Lazy load components not immediately needed
- [ ] Debounce/throttle WebSocket message handling if needed
- [ ] Limit number of rendered messages/reactions
- [ ] Profile and optimize re-renders
- [ ] Check bundle size

---

## Implementation Order Priority

**Week 1: Foundation & Auth**
- Phase 0: Setup
- Phase 1: Authentication

**Week 2: Admin Core Features**
- Phase 2: Product Management
- Phase 3: Session Management (basic CRUD)

**Week 3: Live Streaming**
- Phase 3.3-3.4: Admin streaming controls
- Phase 4: Viewer session joining and video playback

**Week 4: Real-time Interactions**
- Phase 5: Chat, Reactions, Questions
- Phase 6: Product showcase

**Week 5: Analytics & Polish**
- Phase 7: Analytics dashboard
- Phase 8: Error handling, loading states
- Phase 9: Testing

---

## Key Technical Decisions to Make Before Starting

1. **State Management**: React Context, Zustand, or Redux?
   - Recommendation: Start with Context, migrate to Zustand if needed

2. **Component Library**: Headless UI, shadcn/ui, or build from scratch?
   - Recommendation: shadcn/ui for basic components (button, dialog, form)

3. **Styling Approach**: Tailwind utility classes or CSS modules?
   - Recommendation: Tailwind for speed

4. **Form Handling**: React Hook Form or Formik?
   - Recommendation: React Hook Form (better performance)

5. **Real-time Architecture**:
   - Use Socket.io-client to match your backend
   - One WebSocket connection per session
   - Reconnect automatically on disconnect

6. **Video Player**:
   - Use Agora React SDK (since backend uses Agora)
   - Follow Agora's React quickstart guide

---

## Success Criteria for Minimal Functional UI

- [ ] Admin can create, edit, delete products
- [ ] Admin can create sessions and add products
- [ ] Admin can start live stream and viewers can watch
- [ ] Viewers can send chat messages in real-time
- [ ] Viewers can send reactions
- [ ] Viewers can ask questions
- [ ] Admin can showcase products during stream
- [ ] Admin sees real-time analytics (viewers, reactions, engagement)
- [ ] All features work without crashes
- [ ] Basic error handling in place
- [ ] Works on desktop and mobile browsers

---

## Notes

- Don't worry about perfect styling initially - use simple Tailwind classes
- Focus on functionality and real-time features working correctly
- Test with multiple browser tabs to simulate multiple users
- Use browser dev tools to test WebSocket connections
- Agora has free tier limits - be aware during testing
- Keep components simple and refactor later
- Git commit after completing each major task/phase
