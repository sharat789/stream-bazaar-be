import { AppDataSource } from "../data-source";
import { SessionView } from "../entity/SessionView";
import { IsNull } from "typeorm";

export interface CreateSessionViewDto {
  sessionId: string;
  userId?: number;
  socketId?: string;
  role?: string;
}

export class SessionViewService {
  private sessionViewRepository = AppDataSource.getRepository(SessionView);

  /**
   * Record a user joining a session
   * Returns: { sessionView, wasReconnection }
   * - wasReconnection: true if this user had an existing active view that was closed
   */
  async joinSession(data: CreateSessionViewDto): Promise<{
    sessionView: SessionView;
    wasReconnection: boolean;
  }> {
    let wasReconnection = false;

    // Close any existing active view for this user in this session
    if (data.userId) {
      const existingView = await this.findActiveView(
        data.sessionId,
        data.userId
      );
      if (existingView) {
        await this.leaveSession(existingView.id);
        wasReconnection = true; // User is reconnecting, not a new viewer
      }
    }

    // Also close any stale views with this socketId (handles reconnections)
    if (data.socketId) {
      const staleView = await this.findBySocketId(data.socketId);
      if (staleView && staleView.sessionId === data.sessionId) {
        await this.leaveSession(staleView.id);
        // Only mark as reconnection if we haven't already
        if (!wasReconnection && staleView.userId === data.userId) {
          wasReconnection = true;
        }
      }
    }

    const sessionView = this.sessionViewRepository.create({
      sessionId: data.sessionId,
      userId: data.userId || null,
      socketId: data.socketId || null,
      role: data.role || "subscriber",
    });

    const savedView = await this.sessionViewRepository.save(sessionView);

    return {
      sessionView: savedView,
      wasReconnection,
    };
  }

  /**
   * Record a user leaving a session
   */
  async leaveSession(sessionViewId: string): Promise<SessionView | null> {
    const sessionView = await this.sessionViewRepository.findOne({
      where: { id: sessionViewId },
    });

    if (!sessionView || sessionView.leftAt) {
      return null;
    }

    const leftAt = new Date();
    const watchDuration = Math.floor(
      (leftAt.getTime() - sessionView.joinedAt.getTime()) / 1000
    );

    await this.sessionViewRepository.update(sessionViewId, {
      leftAt,
      watchDuration,
    });

    return this.sessionViewRepository.findOne({
      where: { id: sessionViewId },
    });
  }

  /**
   * Find active session view by socket ID
   */
  async findBySocketId(socketId: string): Promise<SessionView | null> {
    return this.sessionViewRepository.findOne({
      where: {
        socketId,
        leftAt: IsNull(),
      },
    });
  }

  /**
   * Find active session view by user and session
   */
  async findActiveView(
    sessionId: string,
    userId?: number
  ): Promise<SessionView | null> {
    if (!userId) return null;

    return this.sessionViewRepository.findOne({
      where: {
        sessionId,
        userId,
        leftAt: IsNull(),
      },
      order: { joinedAt: "DESC" },
    });
  }

  /**
   * Get total unique viewers for a session (excludes publishers)
   */
  async getUniqueViewerCount(sessionId: string): Promise<number> {
    const result = await this.sessionViewRepository
      .createQueryBuilder("view")
      .select("COUNT(DISTINCT view.userId)", "count")
      .where("view.sessionId = :sessionId", { sessionId })
      .andWhere("view.userId IS NOT NULL")
      .andWhere("view.role = :role", { role: "subscriber" })
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  /**
   * Get total view count (including guests, excludes publishers)
   */
  async getTotalViewCount(sessionId: string): Promise<number> {
    return this.sessionViewRepository.count({
      where: { sessionId, role: "subscriber" },
    });
  }

  /**
   * Get average watch duration for a session (in seconds, excludes publishers)
   */
  async getAverageWatchDuration(sessionId: string): Promise<number> {
    const result = await this.sessionViewRepository
      .createQueryBuilder("view")
      .select("AVG(view.watchDuration)", "avgDuration")
      .where("view.sessionId = :sessionId", { sessionId })
      .andWhere("view.watchDuration > :minDuration", { minDuration: 10 })
      .andWhere("view.role = :role", { role: "subscriber" })
      .getRawOne();

    return parseInt(result.avgDuration) || 0;
  }

  /**
   * Get peak concurrent viewers (approximate, excludes publishers)
   */
  async getPeakViewers(sessionId: string): Promise<number> {
    // This is an approximation - in production you'd track this in real-time
    const views = await this.sessionViewRepository.find({
      where: { sessionId, role: "subscriber" },
      order: { joinedAt: "ASC" },
    });

    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const events: { time: Date; type: "join" | "leave" }[] = [];

    views.forEach((view) => {
      events.push({ time: view.joinedAt, type: "join" });
      if (view.leftAt) {
        events.push({ time: view.leftAt, type: "leave" });
      }
    });

    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    events.forEach((event) => {
      if (event.type === "join") {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      } else {
        currentConcurrent--;
      }
    });

    return maxConcurrent;
  }

  /**
   * Get viewer history for analytics
   */
  async getSessionAnalytics(sessionId: string) {
    const uniqueViewers = await this.getUniqueViewerCount(sessionId);
    const totalViews = await this.getTotalViewCount(sessionId);
    const avgWatchTime = await this.getAverageWatchDuration(sessionId);
    const peakViewers = await this.getPeakViewers(sessionId);

    return {
      uniqueViewers,
      totalViews,
      avgWatchTime,
      peakViewers,
    };
  }

  /**
   * Close all active views for a session (when session ends)
   */
  async closeAllActiveViews(sessionId: string): Promise<void> {
    const activeViews = await this.sessionViewRepository.find({
      where: {
        sessionId,
        leftAt: IsNull(),
      },
    });

    const now = new Date();

    for (const view of activeViews) {
      const watchDuration = Math.floor(
        (now.getTime() - view.joinedAt.getTime()) / 1000
      );
      await this.sessionViewRepository.update(view.id, {
        leftAt: now,
        watchDuration,
      });
    }
  }
}
