import { Router } from "express";
import * as analyticsController from "../controllers/analytics.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router({ mergeParams: true }); // mergeParams to access :sessionId from parent

/**
 * GET /api/sessions/:sessionId/analytics
 * Get comprehensive analytics for a session
 * Includes: viewer stats, product list, engagement timeline, retention data
 */
router.get("/", authenticate, analyticsController.getSessionAnalytics);

/**
 * GET /api/sessions/:sessionId/analytics/live
 * Get currently active live viewers for a session
 */
router.get("/live", authenticate, analyticsController.getLiveViewers);

/**
 * GET /api/sessions/:sessionId/analytics/viewers
 * Get detailed viewer list with watch durations
 */
router.get("/viewers", authenticate, analyticsController.getViewerList);

export default router;
