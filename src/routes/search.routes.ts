import { Router } from "express";
import * as searchController from "../controllers/search.controller";

const router = Router();

/**
 * GET /api/search
 * Global search across sessions and products
 * Query params: q (required), limit (default: 10)
 */
router.get("/", searchController.globalSearch);

/**
 * GET /api/search/sessions
 * Search sessions with filters
 * Query params: q, status, creatorId, sortBy, limit, offset
 */
router.get("/sessions", searchController.searchSessions);

/**
 * GET /api/search/sessions/live
 * Get currently live sessions
 * Query params: limit, offset
 */
router.get("/sessions/live", searchController.getLiveSessions);

/**
 * GET /api/search/sessions/upcoming
 * Get upcoming/scheduled sessions
 * Query params: limit, offset
 */
router.get("/sessions/upcoming", searchController.getUpcomingSessions);

/**
 * GET /api/search/sessions/trending
 * Get trending sessions (most viewers)
 * Query params: limit, offset
 */
router.get("/sessions/trending", searchController.getTrendingSessions);

/**
 * GET /api/search/sessions/creator/:creatorId
 * Get sessions by specific creator
 * Query params: limit, offset
 */
router.get(
  "/sessions/creator/:creatorId",
  searchController.getSessionsByCreator
);

/**
 * GET /api/search/products
 * Search products with filters
 * Query params: q, minPrice, maxPrice, sortBy, limit, offset
 */
router.get("/products", searchController.searchProducts);

export default router;
