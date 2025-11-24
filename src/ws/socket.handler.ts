import { Server as SocketIOServer, Socket } from "socket.io";
import { SessionViewService } from "../services/session-view.service";
import { ChatService } from "../services/chat.service";
import { SessionService } from "../services/sessions.service";
import { SessionProductService } from "../services/session-product.service";
import { ProductClickService } from "../services/product-click.service";

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

interface TrackProductClickPayload {
  sessionId: string;
  productId: string;
  userId: number | null;
}

let ioInstance: SocketIOServer | null = null;
const sessionReactions = new Map<string, Map<string, number>>();
const statsBroadcastIntervals = new Map<string, NodeJS.Timeout>();
const productClickService = new ProductClickService();

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

/**
 * Start broadcasting product click stats for a session
 */
const startStatsBroadcast = (sessionId: string) => {
  // Clear any existing interval
  stopStatsBroadcast(sessionId);

  // Initialize session tracking
  productClickService.initializeSession(sessionId);

  // Broadcast stats every 4 seconds
  const interval = setInterval(async () => {
    if (!ioInstance) return;

    try {
      await productClickService.updateViewerCount(sessionId);

      const stats = productClickService.getSessionStats(sessionId);
      const trendingProducts = productClickService.getTrendingProducts(
        sessionId,
        5
      );

      ioInstance.to(sessionId).emit("product-click-stats", {
        sessionId,
        productStats: stats.productStats,
        totalViewers: stats.totalViewers,
        timestamp: new Date(),
      });

      ioInstance.to(sessionId).emit("trending-products", {
        sessionId,
        products: trendingProducts,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(
        `Error broadcasting stats for session ${sessionId}:`,
        error
      );
    }
  }, 2000);

  statsBroadcastIntervals.set(sessionId, interval);
  console.log(`📊 Started stats broadcast for session ${sessionId}`);
};

/**
 * Stop broadcasting product click stats for a session
 */
const stopStatsBroadcast = (sessionId: string) => {
  const interval = statsBroadcastIntervals.get(sessionId);
  if (interval) {
    clearInterval(interval);
    statsBroadcastIntervals.delete(sessionId);
    console.log(`📊 Stopped stats broadcast for session ${sessionId}`);
  }
};

/**
 * Persist product click data when session ends
 */
export const persistProductClickData = async (
  sessionId: string
): Promise<void> => {
  try {
    stopStatsBroadcast(sessionId);
    await productClickService.persistSessionData(sessionId);
  } catch (error) {
    console.error(
      `❌ Error persisting product click data for session ${sessionId}:`,
      error
    );
  }
};

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Store the io instance
  ioInstance = io;
  const sessionViewService = new SessionViewService();
  const chatService = new ChatService();
  const sessionService = new SessionService();
  const sessionProductService = new SessionProductService();
  const socketToViewMap = new Map<string, string>();
  const socketToSessionMap = new Map<string, string>();
  const sessionToRoleMap = new Map<string, string>();

  /**
   * Calculate current viewer count for a session by counting active subscriber sockets
   */
  const getViewerCount = (sessionId: string): number => {
    let count = 0;
    const socketsInRoom = io.sockets.adapter.rooms.get(sessionId);

    if (socketsInRoom) {
      for (const socketId of socketsInRoom) {
        if (sessionToRoleMap.get(socketId) === "subscriber") {
          count++;
        }
      }
    }

    return count;
  };

  io.on("connection", (socket: Socket) => {
    console.log("✅ Client connected:", socket.id);

    socket.on("join-session", async (payload: JoinSessionPayload | string) => {
      const sessionId =
        typeof payload === "string" ? payload : payload.sessionId;
      const userId = typeof payload === "object" ? payload.userId : undefined;

      socket.join(sessionId);

      try {
        const session = await sessionService.findOne(sessionId);
        const isPublisher = userId && session && userId === session.creatorId;
        const role = isPublisher ? "publisher" : "subscriber";

        const { sessionView, wasReconnection } =
          await sessionViewService.joinSession({
            sessionId,
            userId,
            socketId: socket.id,
            role,
          });
        socketToViewMap.set(socket.id, sessionView.id);
        socketToSessionMap.set(socket.id, sessionId);
        sessionToRoleMap.set(socket.id, role);

        const count = getViewerCount(sessionId);

        if (isPublisher) {
          console.log(
            `🎥 Publisher joined their own session ${sessionId} (not counted as viewer). Current viewers: ${count}`
          );
        } else if (wasReconnection) {
          console.log(
            `🔄 Viewer reconnected to session ${sessionId}. Count: ${count}`
          );
        } else {
          console.log(
            `👤 New viewer joined session ${sessionId}. Count: ${count}`
          );
        }

        io.to(sessionId).emit("viewer-count", count);
      } catch (error) {
        console.error("Error tracking session view:", error);
      }
    });

    socket.on("leave-session", async (sessionId: string) => {
      socket.leave(sessionId);

      try {
        const sessionViewId = socketToViewMap.get(socket.id);
        const role = sessionToRoleMap.get(socket.id);

        if (sessionViewId) {
          const sessionView = await sessionViewService.leaveSession(
            sessionViewId
          );
          socketToViewMap.delete(socket.id);
          socketToSessionMap.delete(socket.id);
          sessionToRoleMap.delete(socket.id);

          const count = getViewerCount(sessionId);

          if (role === "subscriber") {
            console.log(`👋 Viewer left session ${sessionId}. Count: ${count}`);
          } else if (role === "publisher") {
            console.log(
              `🎥 Publisher left their own session ${sessionId}. Current viewers: ${count}`
            );
          }

          io.to(sessionId).emit("viewer-count", count);
        }
      } catch (error) {
        console.error("Error updating session view:", error);
      }
    });

    socket.on(
      "send-reaction",
      ({ sessionId, type }: { sessionId: string; type: string }) => {
        console.log(`Reaction received: ${type} in session ${sessionId}`);

        if (!sessionReactions.has(sessionId)) {
          sessionReactions.set(sessionId, new Map());
        }
        const reactions = sessionReactions.get(sessionId)!;
        reactions.set(type, (reactions.get(type) || 0) + 1);

        io.to(sessionId).emit("new-reaction", { type, timestamp: new Date() });

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

    socket.on("send-message", async (payload: ChatMessagePayload) => {
      const { sessionId, message, userId, userName } = payload;

      console.log(
        `💬 Message from ${userName} in session ${sessionId}: ${message}`
      );

      try {
        const savedMessage = await chatService.createMessage({
          sessionId,
          userId,
          message,
        });

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

    socket.on("showcase-product", async (payload: ShowcaseProductPayload) => {
      const { sessionId, productId } = payload;

      console.log(
        `📦 Showcase request for session ${sessionId}: ${productId || "clear"}`
      );

      try {
        const session = await sessionService.findOne(sessionId);
        if (!session) {
          console.error(`❌ Session ${sessionId} not found`);
          return;
        }

        if (session.status !== "live" && session.status !== "paused") {
          console.error(
            `❌ Cannot showcase product - session ${sessionId} is ${session.status}`
          );
          return;
        }

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

        await sessionService.update(sessionId, {
          activeProductId: productId || undefined,
        });

        const updatedSession = await sessionService.findOne(sessionId);

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

    socket.on(
      "track-product-click",
      async (payload: TrackProductClickPayload) => {
        const { sessionId, productId, userId } = payload;

        console.log(
          `🖱️ Product click tracked: ${productId} in session ${sessionId} by user ${
            userId || "anonymous"
          }`
        );

        try {
          const session = await sessionService.findOne(sessionId);
          if (!session) {
            console.error(`❌ Session ${sessionId} not found`);
            return;
          }

          if (session.status !== "live") {
            console.error(
              `❌ Cannot track click - session ${sessionId} is ${session.status}`
            );
            return;
          }

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

          productClickService.trackClick(sessionId, productId, userId);

          if (!statsBroadcastIntervals.has(sessionId)) {
            startStatsBroadcast(sessionId);
          }

          console.log(
            `✅ Click tracked for product ${productId} in session ${sessionId}`
          );
        } catch (error) {
          console.error("❌ Error tracking product click:", error);
        }
      }
    );

    socket.on("disconnect", async () => {
      console.log("❌ Client disconnected:", socket.id);

      try {
        const sessionViewId = socketToViewMap.get(socket.id);
        const sessionId = socketToSessionMap.get(socket.id);
        const role = sessionToRoleMap.get(socket.id);

        if (sessionViewId && sessionId) {
          const sessionView = await sessionViewService.leaveSession(
            sessionViewId
          );
          socketToViewMap.delete(socket.id);
          socketToSessionMap.delete(socket.id);
          sessionToRoleMap.delete(socket.id);

          const count = getViewerCount(sessionId);

          if (role === "subscriber") {
            console.log(
              `👋 Viewer disconnected from session ${sessionId}. Count: ${count}`
            );
          } else if (role === "publisher") {
            console.log(
              `🎥 Publisher disconnected from their session. Current viewers: ${count}`
            );
          }

          io.to(sessionId).emit("viewer-count", count);
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    });
  });
};
