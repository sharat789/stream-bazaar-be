import { AppDataSource } from "../data-source";
import { ProductClickStats } from "../entity/ProductClickStats";
import { SessionViewService } from "./session-view.service";

interface ClickData {
  productId: string;
  uniqueUsers: Set<number | string>; // number for logged in, string for anonymous
  totalClicks: number;
}

interface SessionClickData {
  clicks: Map<string, ClickData>; // productId -> ClickData
  totalViewers: number;
}

export class ProductClickService {
  private clickStatsRepository = AppDataSource.getRepository(ProductClickStats);
  private sessionViewService = new SessionViewService();

  // In-memory storage: sessionId -> SessionClickData
  private activeSessionClicks: Map<string, SessionClickData> = new Map();

  /**
   * Initialize tracking for a live session
   */
  initializeSession(sessionId: string): void {
    if (!this.activeSessionClicks.has(sessionId)) {
      this.activeSessionClicks.set(sessionId, {
        clicks: new Map(),
        totalViewers: 0,
      });
    }
  }

  /**
   * Track a product click
   */
  trackClick(
    sessionId: string,
    productId: string,
    userId: number | null
  ): void {
    // Initialize session if not exists
    this.initializeSession(sessionId);

    const sessionData = this.activeSessionClicks.get(sessionId)!;

    // Get or create click data for this product
    if (!sessionData.clicks.has(productId)) {
      sessionData.clicks.set(productId, {
        productId,
        uniqueUsers: new Set(),
        totalClicks: 0,
      });
    }

    const clickData = sessionData.clicks.get(productId)!;

    // Track unique user (use userId or generate anonymous ID)
    const userIdentifier = userId || `anon-${Date.now()}-${Math.random()}`;
    clickData.uniqueUsers.add(userIdentifier);
    clickData.totalClicks++;
  }

  /**
   * Update total viewer count for a session
   */
  async updateViewerCount(sessionId: string): Promise<void> {
    const sessionData = this.activeSessionClicks.get(sessionId);
    if (!sessionData) return;

    // Get unique viewer count from SessionViewService
    const uniqueViewers =
      await this.sessionViewService.getUniqueViewerCount(sessionId);
    const totalViews =
      await this.sessionViewService.getTotalViewCount(sessionId);

    sessionData.totalViewers = Math.max(uniqueViewers, totalViews);
  }

  /**
   * Get current stats for a session (for broadcasting)
   */
  getSessionStats(sessionId: string): {
    productStats: Array<{
      productId: string;
      uniqueClicks: number;
      totalClicks: number;
      clickThroughRate: number;
    }>;
    totalViewers: number;
  } {
    const sessionData = this.activeSessionClicks.get(sessionId);

    if (!sessionData) {
      return {
        productStats: [],
        totalViewers: 0,
      };
    }

    const productStats = Array.from(sessionData.clicks.values()).map(
      (clickData) => {
        const uniqueClicks = clickData.uniqueUsers.size;
        const totalClicks = clickData.totalClicks;
        const clickThroughRate =
          sessionData.totalViewers > 0
            ? (uniqueClicks / sessionData.totalViewers) * 100
            : 0;

        return {
          productId: clickData.productId,
          uniqueClicks,
          totalClicks,
          clickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
        };
      }
    );

    // Sort by unique clicks (descending) for trending products
    productStats.sort((a, b) => b.uniqueClicks - a.uniqueClicks);

    return {
      productStats,
      totalViewers: sessionData.totalViewers,
    };
  }

  /**
   * Get trending products (top 5 by unique clicks)
   */
  getTrendingProducts(sessionId: string, limit: number = 5) {
    const stats = this.getSessionStats(sessionId);
    return stats.productStats.slice(0, limit);
  }

  /**
   * Persist session click data to database when session ends
   */
  async persistSessionData(sessionId: string): Promise<void> {
    const sessionData = this.activeSessionClicks.get(sessionId);

    if (!sessionData || sessionData.clicks.size === 0) {
      return;
    }

    // Update viewer count one last time before persisting
    await this.updateViewerCount(sessionId);

    const clickStatsToSave: Partial<ProductClickStats>[] = [];

    for (const clickData of sessionData.clicks.values()) {
      const uniqueClicks = clickData.uniqueUsers.size;
      const totalClicks = clickData.totalClicks;
      const clickThroughRate =
        sessionData.totalViewers > 0
          ? (uniqueClicks / sessionData.totalViewers) * 100
          : 0;

      clickStatsToSave.push({
        sessionId,
        productId: clickData.productId,
        uniqueClicks,
        totalClicks,
        clickThroughRate: parseFloat(clickThroughRate.toFixed(2)),
        totalViewers: sessionData.totalViewers,
      });
    }

    // Save all stats to database
    await this.clickStatsRepository.save(clickStatsToSave);

    // Clear from memory
    this.activeSessionClicks.delete(sessionId);
  }

  /**
   * Get persisted conversion stats for a session
   */
  async getPersistedStats(sessionId: string): Promise<ProductClickStats[]> {
    return this.clickStatsRepository.find({
      where: { sessionId },
      order: { uniqueClicks: "DESC" },
    });
  }

  /**
   * Check if session has active tracking
   */
  hasActiveTracking(sessionId: string): boolean {
    return this.activeSessionClicks.has(sessionId);
  }

  /**
   * Clear session data (useful for cleanup)
   */
  clearSessionData(sessionId: string): void {
    this.activeSessionClicks.delete(sessionId);
  }

  /**
   * Get all active session IDs being tracked
   */
  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessionClicks.keys());
  }
}
