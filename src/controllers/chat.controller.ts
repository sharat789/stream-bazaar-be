import { Request, Response, NextFunction } from "express";
import { ChatService, CreateMessageDto } from "../services/chat.service";

export class ChatController {
  private chatService = new ChatService();

  /**
   * Get chat messages for a session
   * GET /api/sessions/:sessionId/chat?limit=50&before=timestamp
   */
  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before
        ? new Date(req.query.before as string)
        : undefined;

      // Validate limit
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: "Limit must be between 1 and 100",
        });
      }

      const messages = await this.chatService.getMessages(
        sessionId,
        limit,
        before
      );

      res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send a new chat message
   * POST /api/sessions/:sessionId/chat
   */
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { message } = req.body;

      // Validation
      if (!message || typeof message !== "string") {
        return res.status(400).json({
          success: false,
          message: "Message is required and must be a string",
        });
      }

      if (message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Message cannot be empty",
        });
      }

      if (message.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Message cannot exceed 500 characters",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const messageData: CreateMessageDto = {
        message: message.trim(),
        userId: req.user.userId,
        sessionId,
      };

      const savedMessage = await this.chatService.createMessage(messageData);

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: savedMessage,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chat message (admin/moderator only)
   * DELETE /api/sessions/:sessionId/chat/:messageId
   */
  async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { messageId } = req.params;

      const message = await this.chatService.findOne(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      const deleted = await this.chatService.deleteMessage(messageId);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete message",
        });
      }

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get message count for a session
   * GET /api/sessions/:sessionId/chat/count
   */
  async getMessageCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const count = await this.chatService.getMessageCount(sessionId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }
}
