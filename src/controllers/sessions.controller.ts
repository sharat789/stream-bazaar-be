import { Request, Response, NextFunction } from "express";
import { SessionService } from "../services/sessions.service";
import { AgoraService } from "../services/agora.service";
import { SessionViewService } from "../services/session-view.service";
import { SessionProductService } from "../services/session-product.service";
import {
  getSocketIO,
  getSessionReactions,
  clearSessionReactions,
} from "../ws/socket.handler";

const sessionService = new SessionService();
const agoraService = new AgoraService();
const sessionViewService = new SessionViewService();
const sessionProductService = new SessionProductService();

export class SessionController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      // Always filter by authenticated user's ID
      const sessions = await sessionService.findByCreator(req.user!.userId);

      res.json({
        success: true,
        data: sessions,
        count: sessions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await sessionService.findOne(req.params.id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }
      res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, streamUrl, streamKey, productIds } = req.body;

      if (!title) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const sessionData = {
        title,
        streamUrl,
        streamKey,
        creatorId: req.user.userId,
        productIds,
      };

      const session = await sessionService.create(sessionData);
      res.status(201).json({
        success: true,
        message: "Session created successfully",
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const { id } = req.params;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
        });
      }

      // Verify ownership
      if (req.user && !(await sessionService.isOwner(id, req.user.userId))) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to update this session",
        });
      }

      const session = await sessionService.updateStatus(id, status);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      res.json({
        success: true,
        message: "Session status updated successfully",
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify ownership
      if (req.user && !(await sessionService.isOwner(id, req.user.userId))) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to delete this session",
        });
      }

      const success = await sessionService.delete(id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      res.json({
        success: true,
        message: "Session deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start live stream - Generate Agora token for creator
   * POST /api/sessions/:id/start-stream
   */
  async startStream(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check Agora configuration
      if (!agoraService.isConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Agora streaming is not configured on the server",
        });
      }

      // Verify session exists
      const session = await sessionService.findOne(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Verify ownership
      if (req.user && !(await sessionService.isOwner(id, req.user.userId))) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to start this stream",
        });
      }

      // Check if already live
      if (session.status === "live") {
        return res.status(400).json({
          success: false,
          message: "Stream is already live",
        });
      }

      // Use session ID as channel name
      const channelName = id;

      console.log("🚀 Starting stream:", {
        sessionId: id,
        channelName,
        userId: req.user!.userId,
        currentStatus: session.status,
      });

      // Generate publisher token for creator
      const tokenData = agoraService.generatePublisherToken(
        channelName,
        req.user!.userId
      );

      console.log("🎫 Publisher token generated:", {
        channelName: tokenData.channelName,
        uid: tokenData.uid,
        tokenLength: tokenData.token.length,
        expiresAt: tokenData.expiresAt,
      });

      // Update session status and metadata
      await sessionService.update(id, {
        status: "live",
        agoraChannelName: channelName,
        startedAt: new Date(),
      });

      // Notify all viewers via WebSocket that stream has started
      const io = getSocketIO();
      if (io) {
        io.to(id).emit("stream-started", {
          sessionId: id,
          channelName,
          status: "live",
          startedAt: new Date(),
        });
        console.log(`📡 WebSocket: Notified viewers that stream ${id} started`);
      }

      res.json({
        success: true,
        message: "Stream started successfully",
        data: {
          sessionId: id,
          channelName: tokenData.channelName,
          token: tokenData.token,
          uid: tokenData.uid,
          appId: tokenData.appId,
          expiresAt: tokenData.expiresAt,
          role: "publisher",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * End live stream
   * POST /api/sessions/:id/end-stream
   */
  async endStream(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify session exists
      const session = await sessionService.findOne(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Verify ownership
      if (req.user && !(await sessionService.isOwner(id, req.user.userId))) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to end this stream",
        });
      }

      // Check if stream is live
      if (session.status !== "live") {
        return res.status(400).json({
          success: false,
          message: "Stream is not currently live",
        });
      }

      // Close all active viewer sessions
      await sessionViewService.closeAllActiveViews(id);

      // Flush reaction counts to database
      const reactionCounts = getSessionReactions(id);

      // Update session status
      await sessionService.update(id, {
        status: "ended",
        endedAt: new Date(),
        ...(reactionCounts && { reactionCounts }),
      });

      // Clear in-memory reaction counts
      if (reactionCounts) {
        clearSessionReactions(id);
        console.log(
          `💾 Saved reaction counts for session ${id}:`,
          reactionCounts
        );
      }

      // Notify all viewers via WebSocket that stream has ended
      const io = getSocketIO();
      if (io) {
        io.to(id).emit("stream-ended", {
          sessionId: id,
          status: "ended",
          endedAt: new Date(),
        });
        console.log(`📡 WebSocket: Notified viewers that stream ${id} ended`);
      }

      res.json({
        success: true,
        message: "Stream ended successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh token for ongoing stream (when token is about to expire)
   * POST /api/sessions/:id/refresh-token
   */
  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body; // "publisher" or "subscriber"

      // Check Agora configuration
      if (!agoraService.isConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Agora streaming is not configured on the server",
        });
      }

      // Verify session exists
      const session = await sessionService.findOne(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Check if stream is live
      if (session.status !== "live") {
        return res.status(400).json({
          success: false,
          message: "Cannot refresh token - stream is not live",
          currentStatus: session.status,
        });
      }

      const channelName = session.agoraChannelName || id;
      const userId = req.user?.userId;

      // If requesting publisher token, verify ownership
      if (role === "publisher") {
        if (!userId || !(await sessionService.isOwner(id, userId))) {
          return res.status(403).json({
            success: false,
            message: "You don't have permission to publish to this stream",
          });
        }

        const tokenData = agoraService.generatePublisherToken(
          channelName,
          userId
        );

        console.log("🔄 Refreshed publisher token:", {
          sessionId: id,
          userId,
          expiresAt: tokenData.expiresAt,
        });

        return res.json({
          success: true,
          message: "Publisher token refreshed successfully",
          data: {
            sessionId: id,
            channelName: tokenData.channelName,
            token: tokenData.token,
            uid: tokenData.uid,
            appId: tokenData.appId,
            expiresAt: tokenData.expiresAt,
            role: "publisher",
          },
        });
      } else {
        // Generate subscriber token
        const tokenData = agoraService.generateSubscriberToken(
          channelName,
          userId
        );

        console.log("🔄 Refreshed subscriber token:", {
          sessionId: id,
          userId: userId || "anonymous",
          expiresAt: tokenData.expiresAt,
        });

        return res.json({
          success: true,
          message: "Subscriber token refreshed successfully",
          data: {
            sessionId: id,
            channelName: tokenData.channelName,
            token: tokenData.token,
            uid: tokenData.uid,
            appId: tokenData.appId,
            expiresAt: tokenData.expiresAt,
            role: "subscriber",
          },
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get viewer token for joining stream
   * GET /api/sessions/:id/stream-token
   */
  async getStreamToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check Agora configuration
      if (!agoraService.isConfigured()) {
        return res.status(500).json({
          success: false,
          message: "Agora streaming is not configured on the server",
        });
      }

      // Verify session exists
      const session = await sessionService.findOne(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Check if stream is live
      if (session.status !== "live") {
        return res.status(400).json({
          success: false,
          message: "Stream is not currently live",
          currentStatus: session.status,
        });
      }

      const channelName = session.agoraChannelName || id;

      // Generate subscriber token (for viewers)
      // Use userId if authenticated, otherwise 0 for anonymous
      const userId = req.user?.userId;

      console.log("👁️ Generating viewer token:", {
        sessionId: id,
        channelName,
        userId: userId || "anonymous",
        sessionStatus: session.status,
      });

      const tokenData = agoraService.generateSubscriberToken(
        channelName,
        userId
      );

      console.log("🎫 Viewer token generated:", {
        channelName: tokenData.channelName,
        uid: tokenData.uid,
        tokenLength: tokenData.token.length,
        expiresAt: tokenData.expiresAt,
      });

      res.json({
        success: true,
        data: {
          sessionId: id,
          channelName: tokenData.channelName,
          token: tokenData.token,
          uid: tokenData.uid,
          appId: tokenData.appId,
          expiresAt: tokenData.expiresAt,
          role: "subscriber",
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reaction statistics for a session
   * GET /api/sessions/:id/reactions
   */
  async getReactions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify session exists
      const session = await sessionService.findOne(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Get live reaction counts (if session is currently live)
      let liveReactions = null;
      if (session.status === "live") {
        liveReactions = getSessionReactions(id);
      }

      // Use live data if available, otherwise use persisted data
      const reactionCounts = liveReactions || session.reactionCounts || {};

      // Calculate total reactions
      const total = Object.values(reactionCounts).reduce(
        (sum: number, count) => sum + (count as number),
        0
      );

      // Sort reactions by count (most popular first)
      const sortedReactions = Object.entries(reactionCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => (b.count as number) - (a.count as number));

      res.json({
        success: true,
        data: {
          sessionId: id,
          sessionStatus: session.status,
          isLive: session.status === "live",
          reactions: reactionCounts,
          sortedReactions,
          total,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set or clear active product (showcase)
   * POST /api/sessions/:id/showcase
   */
  async setActiveProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { productId } = req.body;

      // Verify session exists
      const session = await sessionService.findOne(id);
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      // Verify ownership
      if (req.user && !(await sessionService.isOwner(id, req.user.userId))) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this session",
        });
      }

      // Only allow showcase during live or paused status
      if (session.status !== "live" && session.status !== "paused") {
        return res.status(400).json({
          success: false,
          message: "Can only showcase products during live or paused sessions",
          currentStatus: session.status,
        });
      }

      // If productId provided, verify it exists in session's product list
      if (productId) {
        const isInSession = await sessionProductService.isProductInSession(
          id,
          productId
        );

        if (!isInSession) {
          return res.status(400).json({
            success: false,
            message: "Product not found in this session's product list",
          });
        }
      }

      // Update active product
      await sessionService.update(id, {
        activeProductId: productId || null,
      });

      // Get updated session
      const updatedSession = await sessionService.findOne(id);

      // Broadcast to viewers via WebSocket
      const io = getSocketIO();
      if (io) {
        if (productId) {
          io.to(id).emit("product-showcased", {
            sessionId: id,
            productId,
            product: updatedSession?.activeProduct,
          });
          console.log(`📦 Product ${productId} showcased in session ${id}`);
        } else {
          io.to(id).emit("showcase-cleared", {
            sessionId: id,
          });
          console.log(`🔄 Showcase cleared for session ${id}`);
        }
      }

      res.json({
        success: true,
        message: productId
          ? "Product showcased successfully"
          : "Showcase cleared successfully",
        data: {
          sessionId: id,
          activeProductId: productId || null,
          product: updatedSession?.activeProduct || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
