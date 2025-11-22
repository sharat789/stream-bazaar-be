import { Router } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

// Note: This router expects sessionId to be available in req.params
// It should be mounted at /sessions/:sessionId/chat
const router = Router({ mergeParams: true });
const chatController = new ChatController();

// Get chat messages with pagination
router.get("/", (req, res, next) => chatController.getMessages(req, res, next));

// Get message count
router.get("/count", (req, res, next) =>
  chatController.getMessageCount(req, res, next)
);

// Send a new message (requires authentication)
router.post("/", authenticate, (req, res, next) =>
  chatController.sendMessage(req, res, next)
);

// Delete a message (admin/moderator only)
router.delete(
  "/:messageId",
  authenticate,
  authorize("admin", "moderator"),
  (req, res, next) => chatController.deleteMessage(req, res, next)
);

export default router;
