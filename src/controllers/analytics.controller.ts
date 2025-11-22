import { Request, Response, NextFunction } from "express";
import { IsNull } from "typeorm";
import { SessionViewService } from "../services/session-view.service";
import { SessionService } from "../services/sessions.service";
import { SessionProductService } from "../services/session-product.service";
import { ProductClickService } from "../services/product-click.service";
import { getSessionReactions } from "../ws/socket.handler";

const sessionViewService = new SessionViewService();
const sessionsService = new SessionService();
const sessionProductService = new SessionProductService();
const productClickService = new ProductClickService();

/**
 * Get comprehensive analytics for a session
 * GET /api/sessions/:sessionId/analytics
 */
export const getSessionAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = await sessionsService.findOne(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Gather viewer analytics
    const viewerStats = await sessionViewService.getSessionAnalytics(sessionId);

    // Get product performance
    const products = await sessionProductService.getProducts(sessionId);

    // Get viewer engagement timeline (hourly breakdown if available)
    const viewerTimeline = await getViewerTimeline(sessionId);

    // Get viewer retention data
    const retentionData = await getRetentionStats(sessionId);

    // Get reaction counts (live or persisted)
    let reactionCounts = {};
    if (session.status === "live") {
      // Get live data from memory
      reactionCounts = getSessionReactions(sessionId) || {};
    } else {
      // Get persisted data from database
      reactionCounts = session.reactionCounts || {};
    }

    const totalReactions = Object.values(reactionCounts).reduce(
      (sum: number, count) => sum + (count as number),
      0
    );

    return res.json({
      sessionId,
      session: {
        title: session.title,
        status: session.status,
        creator: session.creator,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      viewers: {
        unique: viewerStats.uniqueViewers,
        total: viewerStats.totalViews,
        peak: viewerStats.peakViewers,
        avgWatchTime: viewerStats.avgWatchTime, // in seconds
        avgWatchTimeFormatted: formatDuration(viewerStats.avgWatchTime),
      },
      products: {
        total: products.length,
        featured: products.filter((p: any) => p.featured).length,
        list: products.map((p: any) => ({
          productId: p.product.id,
          name: p.product.name,
          featured: p.featured,
          displayOrder: p.displayOrder,
          addedAt: p.addedAt,
        })),
      },
      reactions: {
        total: totalReactions,
        breakdown: reactionCounts,
      },
      engagement: {
        viewerTimeline,
        retention: retentionData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get viewer timeline breakdown
 */
async function getViewerTimeline(sessionId: string) {
  const sessionViewService = new SessionViewService();
  const views = await sessionViewService["sessionViewRepository"].find({
    where: { sessionId },
    order: { joinedAt: "ASC" },
  });

  if (views.length === 0) {
    return [];
  }

  // Group by hour for timeline
  const timelineMap = new Map<string, { joins: number; leaves: number }>();

  views.forEach((view) => {
    const joinHour =
      new Date(view.joinedAt).toISOString().slice(0, 13) + ":00:00";

    if (!timelineMap.has(joinHour)) {
      timelineMap.set(joinHour, { joins: 0, leaves: 0 });
    }
    timelineMap.get(joinHour)!.joins++;

    if (view.leftAt) {
      const leaveHour =
        new Date(view.leftAt).toISOString().slice(0, 13) + ":00:00";
      if (!timelineMap.has(leaveHour)) {
        timelineMap.set(leaveHour, { joins: 0, leaves: 0 });
      }
      timelineMap.get(leaveHour)!.leaves++;
    }
  });

  return Array.from(timelineMap.entries())
    .map(([hour, data]) => ({
      timestamp: hour,
      joins: data.joins,
      leaves: data.leaves,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Get retention statistics (how long viewers stayed)
 */
async function getRetentionStats(sessionId: string) {
  const sessionViewService = new SessionViewService();
  const views = await sessionViewService["sessionViewRepository"].find({
    where: { sessionId },
    select: ["watchDuration"],
  });

  const durations = views
    .filter((v) => v.watchDuration && v.watchDuration > 0)
    .map((v) => v.watchDuration);

  if (durations.length === 0) {
    return {
      ranges: [],
      median: 0,
      p75: 0,
      p90: 0,
    };
  }

  // Sort durations
  const sorted = durations.sort((a, b) => a - b);

  // Calculate percentiles
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];

  // Group into ranges (0-30s, 30s-1m, 1m-5m, 5m-15m, 15m+)
  const ranges = [
    { label: "0-30s", min: 0, max: 30, count: 0 },
    { label: "30s-1m", min: 30, max: 60, count: 0 },
    { label: "1m-5m", min: 60, max: 300, count: 0 },
    { label: "5m-15m", min: 300, max: 900, count: 0 },
    { label: "15m-30m", min: 900, max: 1800, count: 0 },
    { label: "30m+", min: 1800, max: Infinity, count: 0 },
  ];

  durations.forEach((duration) => {
    const range = ranges.find((r) => duration >= r.min && duration < r.max);
    if (range) range.count++;
  });

  return {
    ranges: ranges.map((r) => ({ label: r.label, count: r.count })),
    median,
    medianFormatted: formatDuration(median),
    p75,
    p75Formatted: formatDuration(p75),
    p90,
    p90Formatted: formatDuration(p90),
  };
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Get current live viewers for a session
 * GET /api/sessions/:sessionId/analytics/live
 */
export const getLiveViewers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = await sessionsService.findOne(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get currently active viewers
    const activeViewers = await sessionViewService[
      "sessionViewRepository"
    ].find({
      where: {
        sessionId,
        leftAt: IsNull(),
      },
      relations: ["user"],
      order: { joinedAt: "DESC" },
    });

    return res.json({
      sessionId,
      liveViewerCount: activeViewers.length,
      viewers: activeViewers.map((v) => ({
        id: v.id,
        userId: v.userId,
        username: v.user?.username || "Guest",
        joinedAt: v.joinedAt,
        watchDuration: Math.floor((Date.now() - v.joinedAt.getTime()) / 1000),
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get viewer list with details
 * GET /api/sessions/:sessionId/analytics/viewers
 */
export const getViewerList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = await sessionsService.findOne(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get all viewers (past and present)
    const allViewers = await sessionViewService["sessionViewRepository"].find({
      where: { sessionId },
      relations: ["user"],
      order: { joinedAt: "DESC" },
    });

    return res.json({
      sessionId,
      total: allViewers.length,
      viewers: allViewers.map((v) => ({
        id: v.id,
        userId: v.userId,
        username: v.user?.username || "Guest",
        joinedAt: v.joinedAt,
        leftAt: v.leftAt,
        watchDuration: v.watchDuration,
        watchDurationFormatted: v.watchDuration
          ? formatDuration(v.watchDuration)
          : null,
        isActive: !v.leftAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product conversion stats for a session
 * GET /api/sessions/:sessionId/conversion-stats
 */
export const getConversionStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists
    const session = await sessionsService.findOne(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Check if session is live (get live data) or ended (get persisted data)
    if (session.status === "live") {
      // Get live stats from memory
      await productClickService.updateViewerCount(sessionId);
      const liveStats = productClickService.getSessionStats(sessionId);

      return res.json({
        success: true,
        sessionId,
        sessionStatus: "live",
        data: {
          totalViewers: liveStats.totalViewers,
          products: liveStats.productStats.map((stat) => ({
            productId: stat.productId,
            uniqueClicks: stat.uniqueClicks,
            totalClicks: stat.totalClicks,
            clickThroughRate: stat.clickThroughRate,
          })),
        },
      });
    } else {
      // Get persisted stats from database
      const persistedStats = await productClickService.getPersistedStats(
        sessionId
      );

      return res.json({
        success: true,
        sessionId,
        sessionStatus: session.status,
        data: {
          totalViewers: persistedStats[0]?.totalViewers || 0,
          products: persistedStats.map((stat) => ({
            productId: stat.productId,
            productName: stat.product?.name,
            uniqueClicks: stat.uniqueClicks,
            totalClicks: stat.totalClicks,
            clickThroughRate: stat.clickThroughRate,
            createdAt: stat.createdAt,
            updatedAt: stat.updatedAt,
          })),
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get global analytics for a creator across all sessions
 * GET /api/analytics/creator/:creatorId
 */
export const getCreatorGlobalAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const creatorId = parseInt(req.params.creatorId);

    if (isNaN(creatorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid creator ID",
      });
    }

    // Get all sessions for this creator
    const sessions = await sessionsService["sessionRepository"].find({
      where: { creatorId },
      select: ["id", "status", "reactionCounts"],
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        creatorId,
        data: {
          sessions: {
            total: 0,
            byStatus: { live: 0, ended: 0, scheduled: 0, paused: 0 },
          },
          viewers: {
            totalUnique: 0,
            averagePerSession: 0,
            peakConcurrent: 0,
          },
          reactions: {
            total: 0,
            breakdown: {},
          },
          products: {
            totalClicks: 0,
            uniqueUsers: 0,
            averageCTR: 0,
          },
        },
      });
    }

    const sessionIds = sessions.map((s) => s.id);

    // 1. Session Summary
    const sessionsByStatus = {
      live: sessions.filter((s) => s.status === "live").length,
      ended: sessions.filter((s) => s.status === "ended").length,
      scheduled: sessions.filter((s) => s.status === "scheduled").length,
      paused: sessions.filter((s) => s.status === "paused").length,
    };

    // 2. Viewer Metrics
    const viewerStats = await sessionViewService[
      "sessionViewRepository"
    ].createQueryBuilder("view")
      .select("COUNT(DISTINCT view.userId)", "uniqueViewers")
      .addSelect("COUNT(*)", "totalViews")
      .where("view.sessionId IN (:...sessionIds)", { sessionIds })
      .andWhere("view.role = :role", { role: "subscriber" })
      .getRawOne();

    const totalUniqueViewers = parseInt(viewerStats.uniqueViewers) || 0;
    const averageViewersPerSession =
      sessions.length > 0
        ? Math.round(totalUniqueViewers / sessions.length)
        : 0;

    // Get peak concurrent viewers across all sessions
    let peakConcurrent = 0;
    for (const sessionId of sessionIds) {
      const peak = await sessionViewService.getPeakViewers(sessionId);
      peakConcurrent = Math.max(peakConcurrent, peak);
    }

    // 3. Reaction Metrics
    const reactionBreakdown: { [key: string]: number } = {};
    let totalReactions = 0;

    sessions.forEach((session) => {
      if (session.reactionCounts) {
        Object.entries(session.reactionCounts).forEach(([type, count]) => {
          reactionBreakdown[type] =
            (reactionBreakdown[type] || 0) + (count as number);
          totalReactions += count as number;
        });
      }
    });

    // 4. Product Conversion Metrics
    const productStats = await productClickService[
      "clickStatsRepository"
    ].createQueryBuilder("stats")
      .select("SUM(stats.totalClicks)", "totalClicks")
      .addSelect("SUM(stats.uniqueClicks)", "uniqueClicks")
      .addSelect("AVG(stats.clickThroughRate)", "avgCTR")
      .where("stats.sessionId IN (:...sessionIds)", { sessionIds })
      .getRawOne();

    const totalClicks = parseInt(productStats.totalClicks) || 0;
    const uniqueClickers = parseInt(productStats.uniqueClicks) || 0;
    const averageCTR = parseFloat(productStats.avgCTR) || 0;

    return res.json({
      success: true,
      creatorId,
      data: {
        sessions: {
          total: sessions.length,
          byStatus: sessionsByStatus,
        },
        viewers: {
          totalUnique: totalUniqueViewers,
          averagePerSession: averageViewersPerSession,
          peakConcurrent,
        },
        reactions: {
          total: totalReactions,
          breakdown: reactionBreakdown,
        },
        products: {
          totalClicks,
          uniqueUsers: uniqueClickers,
          averageCTR: parseFloat(averageCTR.toFixed(2)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
