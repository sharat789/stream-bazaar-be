import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/analytics/creator/:creatorId
 * Get global analytics for a creator across all their sessions
 * Includes: session summary, viewer stats, reactions, product conversion
 */
router.get(
  "/creator/:creatorId",
  authenticate,
  analyticsController.getCreatorGlobalAnalytics
);

export default router;
