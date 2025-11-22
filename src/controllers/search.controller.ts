import { Request, Response, NextFunction } from "express";
import { SearchService } from "../services/search.service";

const searchService = new SearchService();

/**
 * Search sessions with filters and pagination
 * GET /api/search/sessions?q=query&status=live&category=gaming&creatorId=1&sortBy=newest&limit=20&offset=0
 */
export const searchSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      q = "",
      status,
      category,
      creatorId,
      sortBy = "newest",
      limit = "20",
      offset = "0",
    } = req.query;

    const result = await searchService.searchSessions({
      query: q as string,
      status: status as string | undefined,
      category: category as string | undefined,
      creatorId: creatorId ? parseInt(creatorId as string) : undefined,
      sortBy: sortBy as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Search products with filters and pagination
 * GET /api/search/products?q=query&minPrice=10&maxPrice=100&sortBy=price-asc&limit=20&offset=0
 */
export const searchProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      q = "",
      minPrice,
      maxPrice,
      sortBy = "newest",
      limit = "20",
      offset = "0",
    } = req.query;

    const result = await searchService.searchProducts({
      query: q as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      sortBy: sortBy as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get live sessions
 * GET /api/search/sessions/live?limit=20&offset=0
 */
export const getLiveSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const result = await searchService.getLiveSessions(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get upcoming/scheduled sessions
 * GET /api/search/sessions/upcoming?limit=20&offset=0
 */
export const getUpcomingSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const result = await searchService.getUpcomingSessions(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get trending sessions (most viewers)
 * GET /api/search/sessions/trending?limit=20&offset=0
 */
export const getTrendingSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const result = await searchService.getTrendingSessions(
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get sessions by creator
 * GET /api/search/sessions/creator/:creatorId?limit=20&offset=0
 */
export const getSessionsByCreator = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { creatorId } = req.params;
    const { limit = "20", offset = "0" } = req.query;

    const result = await searchService.getSessionsByCreator(
      parseInt(creatorId),
      parseInt(limit as string),
      parseInt(offset as string)
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Global search across sessions and products
 * GET /api/search?q=query&limit=10
 */
export const globalSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { q = "", limit = "10" } = req.query;

    if (!q || (q as string).trim().length === 0) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const result = await searchService.globalSearch(
      q as string,
      parseInt(limit as string)
    );

    return res.json(result);
  } catch (error) {
    next(error);
  }
};
