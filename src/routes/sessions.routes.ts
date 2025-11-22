import { Router } from "express";
import { SessionController } from "../controllers/sessions.controller";
import { authenticate, optionalAuth } from "../middleware/auth.middleware";
import { getConversionStats } from "../controllers/analytics.controller";
import chatRoutes from "./chat.routes";
import sessionProductRoutes from "./session-product.routes";
import analyticsRoutes from "./analytics.routes";

const router = Router();
const controller = new SessionController();

// Protected routes (require authentication to view user's own sessions)
router.get("/", authenticate, controller.getAll.bind(controller));
router.get("/:id", controller.getOne.bind(controller));

// Protected routes (require authentication)
router.post("/", authenticate, controller.create.bind(controller));
router.patch(
  "/:id/status",
  authenticate,
  controller.updateStatus.bind(controller)
);
router.delete("/:id", authenticate, controller.delete.bind(controller));

// Streaming routes
router.post(
  "/:id/start-stream",
  authenticate,
  controller.startStream.bind(controller)
);
router.post(
  "/:id/end-stream",
  authenticate,
  controller.endStream.bind(controller)
);
router.get(
  "/:id/stream-token",
  optionalAuth, // Allow both authenticated and anonymous viewers
  controller.getStreamToken.bind(controller)
);
router.post(
  "/:id/refresh-token",
  optionalAuth, // Allow both authenticated and anonymous viewers
  controller.refreshToken.bind(controller)
);

// Reaction statistics
router.get("/:id/reactions", controller.getReactions.bind(controller));

// Product showcase
router.post(
  "/:id/showcase",
  authenticate,
  controller.setActiveProduct.bind(controller)
);

// Product conversion statistics
router.get(
  "/:sessionId/conversion-stats",
  optionalAuth, // Allow both authenticated and anonymous access
  getConversionStats
);

// Nested routes
router.use("/:sessionId/chat", chatRoutes);
router.use("/:sessionId/products", sessionProductRoutes);
router.use("/:sessionId/analytics", analyticsRoutes);

export default router;
