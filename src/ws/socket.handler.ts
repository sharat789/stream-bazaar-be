import { Server as SocketIOServer, Socket } from "socket.io";
import { SessionViewService } from "../services/session-view.service";
import { ChatService } from "../services/chat.service";
import { SessionService } from "../services/sessions.service";
import { SessionProductService } from "../services/session-product.service";

interface ChatMessagePayload {
  sessionId: string;
  message: string;
  userId: number;
  userName: string;
}

interface JoinSessionPayload {
  sessionId: string;
  userId?: number;
}

interface ShowcaseProductPayload {
  sessionId: string;
  productId: string | null;
}

// Store the io instance globally so controllers can emit events
let ioInstance: SocketIOServer | null = null;

// Store in-memory reaction counts per session
const sessionReactions = new Map<string, Map<string, number>>();

export const getSocketIO = (): SocketIOServer | null => {
  return ioInstance;
};

/**
 * Get reaction counts for a session (used when session ends)
 */
export const getSessionReactions = (
  sessionId: string
): { [key: string]: number } | null => {
  const reactions = sessionReactions.get(sessionId);
  if (!reactions || reactions.size === 0) {
    return null;
  }
  return Object.fromEntries(reactions);
};

/**
 * Clear reaction counts for a session (after flushing to DB)
 */
export const clearSessionReactions = (sessionId: string): void => {
  sessionReactions.delete(sessionId);
};

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Store the io instance
  ioInstance = io;
  const viewerCounts = new Map<string, number>();
  const sessionViewService = new SessionViewService();
  const chatService = new ChatService();
  const sessionService = new SessionService();
  const sessionProductService = new SessionProductService();
  const socketToViewMap = new Map<string, string>(); // socketId -> sessionViewId
  const socketToSessionMap = new Map<string, string>(); // socketId -> sessionId

  io.on("connection", (socket: Socket) => {
    console.log("✅ Client connected:", socket.id);

    socket.on("join-session", async (payload: JoinSessionPayload | string) => {
      const sessionId =
        typeof payload === "string" ? payload : payload.sessionId;
      const userId = typeof payload === "object" ? payload.userId : undefined;

      socket.join(sessionId);

      // Track view in database
      try {
        // Fetch session to determine role based on ownership
        const session = await sessionService.findOne(sessionId);

        // Determine role: publisher if user is session creator, subscriber otherwise
        const isPublisher = userId && session && userId === session.creatorId;
        const role = isPublisher ? "publisher" : "subscriber";

        const sessionView = await sessionViewService.joinSession({
          sessionId,
          userId,
          socketId: socket.id,
          role,
        });
        socketToViewMap.set(socket.id, sessionView.id);
        socketToSessionMap.set(socket.id, sessionId);

        // Update viewer count (exclude publishers)
        if (!isPublisher) {
          const count = (viewerCounts.get(sessionId) || 0) + 1;
          viewerCounts.set(sessionId, count);
          console.log(`👤 Viewer joined session ${sessionId}. Count: ${count}`);
          io.to(sessionId).emit("viewer-count", count);
        } else {
          console.log(
            `🎥 Publisher joined their own session ${sessionId} (not counted as viewer)`
          );
          // Still emit current count for publisher to see
          io.to(sessionId).emit(
            "viewer-count",
            viewerCounts.get(sessionId) || 0
          );
        }
      } catch (error) {
        console.error("Error tracking session view:", error);
      }
    });

    // Leave a session
    socket.on("leave-session", async (sessionId: string) => {
      socket.leave(sessionId);

      // Update view record in database
      try {
        const sessionViewId = socketToViewMap.get(socket.id);
        if (sessionViewId) {
          const sessionView = await sessionViewService.leaveSession(
            sessionViewId
          );
          socketToViewMap.delete(socket.id);
          socketToSessionMap.delete(socket.id);

          // Only decrement count if it was a subscriber (not publisher)
          if (sessionView && sessionView.role === "subscriber") {
            const count = Math.max(0, (viewerCounts.get(sessionId) || 1) - 1);
            viewerCounts.set(sessionId, count);
            console.log(`👋 Viewer left session ${sessionId}. Count: ${count}`);
            io.to(sessionId).emit("viewer-count", count);
          } else if (sessionView && sessionView.role === "publisher") {
            console.log(
              `🎥 Publisher left their own session ${sessionId} (count unchanged)`
            );
          }
        }
      } catch (error) {
        console.error("Error updating session view:", error);
      }
    });

    // Handle reactions
    socket.on(
      "send-reaction",
      ({ sessionId, type }: { sessionId: string; type: string }) => {
        console.log(`Reaction received: ${type} in session ${sessionId}`);

        // Track reaction in memory
        if (!sessionReactions.has(sessionId)) {
          sessionReactions.set(sessionId, new Map());
        }
        const reactions = sessionReactions.get(sessionId)!;
        reactions.set(type, (reactions.get(type) || 0) + 1);

        // Broadcast reaction to all users in real-time
        io.to(sessionId).emit("new-reaction", { type, timestamp: new Date() });

        // Optionally broadcast current counts to session (for live stats)
        // const totalReactions = Array.from(reactions.values()).reduce(
        //   (sum, count) => sum + count,
        //   0
        // );
        // io.to(sessionId).emit("reaction-stats", {
        //   sessionId,
        //   counts: Object.fromEntries(reactions),
        //   total: totalReactions,
        // });
        // Optionally broadcast reaction percentages to session (for live stats)
        const totalReactions = Array.from(reactions.values()).reduce(
          (sum, count) => sum + count,
          0
        );
        const percentages: { [key: string]: number } = {};
        reactions.forEach((count, type) => {
          percentages[type] = Math.round((count / totalReactions) * 100);
        });
        console.log(`Reaction stats for session ${sessionId}:`, {
          sessionId,
          percentages,
          total: totalReactions,
        });
        io.to(sessionId).emit("reaction-stats", {
          sessionId,
          percentages,
          total: totalReactions,
        });
      }
    );

    // Handle chat messages
    socket.on("send-message", async (payload: ChatMessagePayload) => {
      const { sessionId, message, userId, userName } = payload;

      console.log(
        `💬 Message from ${userName} in session ${sessionId}: ${message}`
      );

      try {
        // Save message to database
        const savedMessage = await chatService.createMessage({
          sessionId,
          userId,
          message,
        });

        // Broadcast message to all users in the session with real DB ID
        io.to(sessionId).emit("new-message", {
          id: savedMessage.id,
          message: savedMessage.message,
          userId: savedMessage.userId,
          userName,
          sessionId: savedMessage.sessionId,
          createdAt: savedMessage.createdAt,
        });

        console.log(`✅ Message saved to DB with ID: ${savedMessage.id}`);
      } catch (error) {
        console.error("❌ Error saving chat message:", error);

        // Still broadcast even if DB save fails (graceful degradation)
        io.to(sessionId).emit("new-message", {
          id: `temp-${Date.now()}`,
          message,
          userId,
          userName,
          sessionId,
          createdAt: new Date(),
        });
      }
    });

    // Handle product showcase
    socket.on("showcase-product", async (payload: ShowcaseProductPayload) => {
      const { sessionId, productId } = payload;

      console.log(
        `📦 Showcase request for session ${sessionId}: ${productId || "clear"}`
      );

      try {
        // Verify session exists
        const session = await sessionService.findOne(sessionId);
        if (!session) {
          console.error(`❌ Session ${sessionId} not found`);
          return;
        }

        // Verify session status
        if (session.status !== "live" && session.status !== "paused") {
          console.error(
            `❌ Cannot showcase product - session ${sessionId} is ${session.status}`
          );
          return;
        }

        // If productId provided, verify it exists in session's product list
        if (productId) {
          const isInSession = await sessionProductService.isProductInSession(
            sessionId,
            productId
          );

          if (!isInSession) {
            console.error(
              `❌ Product ${productId} not found in session ${sessionId}`
            );
            return;
          }
        }

        // Update active product in database
        await sessionService.update(sessionId, {
          activeProductId: productId || undefined,
        });

        // Get updated session with product details
        const updatedSession = await sessionService.findOne(sessionId);

        // Broadcast to all viewers in the session
        if (productId) {
          io.to(sessionId).emit("product-showcased", {
            sessionId,
            productId,
            product: updatedSession?.activeProduct,
          });
          console.log(
            `✅ Product ${productId} showcased in session ${sessionId}`
          );
        } else {
          io.to(sessionId).emit("showcase-cleared", {
            sessionId,
          });
          console.log(`✅ Showcase cleared for session ${sessionId}`);
        }
      } catch (error) {
        console.error("❌ Error handling product showcase:", error);
      }
    });

    // Disconnect
    socket.on("disconnect", async () => {
      console.log("❌ Client disconnected:", socket.id);

      // Update any active session views
      try {
        const sessionViewId = socketToViewMap.get(socket.id);
        const sessionId = socketToSessionMap.get(socket.id);

        if (sessionViewId) {
          const sessionView = await sessionViewService.leaveSession(
            sessionViewId
          );
          socketToViewMap.delete(socket.id);
          socketToSessionMap.delete(socket.id);

          // Only decrement count if it was a subscriber (not publisher)
          if (sessionView && sessionView.role === "subscriber" && sessionId) {
            const count = Math.max(0, (viewerCounts.get(sessionId) || 1) - 1);
            viewerCounts.set(sessionId, count);
            console.log(
              `👋 Viewer disconnected from session ${sessionId}. Count: ${count}`
            );
            io.to(sessionId).emit("viewer-count", count);
          } else if (sessionView && sessionView.role === "publisher") {
            console.log(
              `🎥 Publisher disconnected from their session (count unchanged)`
            );
          }
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
};
