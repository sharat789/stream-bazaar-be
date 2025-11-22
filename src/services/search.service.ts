import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";
import { Product } from "../entity/Product";
import { ILike } from "typeorm";

export interface SearchSessionsParams {
  query?: string;
  status?: string;
  category?: string;
  creatorId?: number;
  sortBy?: "newest" | "oldest" | "title";
  limit?: number;
  offset?: number;
}

export interface SearchProductsParams {
  query?: string;
  category?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "newest" | "oldest" | "price-asc" | "price-desc" | "name";
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export class SearchService {
  private sessionRepository = AppDataSource.getRepository(Session);
  private productRepository = AppDataSource.getRepository(Product);

  /**
   * Search sessions with filters and pagination
   */
  async searchSessions(
    params: SearchSessionsParams
  ): Promise<PaginatedResult<Session>> {
    const {
      query = "",
      status,
      category,
      creatorId,
      sortBy = "newest",
      limit = 20,
      offset = 0,
    } = params;

    const queryBuilder = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoinAndSelect("session.creator", "creator");

    // Text search (title, description, category, tags)
    if (query.trim()) {
      queryBuilder.andWhere(
        "(session.title ILIKE :query OR session.description ILIKE :query OR session.category ILIKE :query OR session.tags::text ILIKE :query)",
        { query: `%${query}%` }
      );
    }

    // Filter by category
    if (category) {
      queryBuilder.andWhere("session.category ILIKE :category", { category });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere("session.status = :status", { status });
    }

    // Filter by creator
    if (creatorId) {
      queryBuilder.andWhere("session.creatorId = :creatorId", { creatorId });
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        queryBuilder.orderBy("session.createdAt", "DESC");
        break;
      case "oldest":
        queryBuilder.orderBy("session.createdAt", "ASC");
        break;
      case "title":
        queryBuilder.orderBy("session.title", "ASC");
        break;
      default:
        queryBuilder.orderBy("session.createdAt", "DESC");
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Search products with filters and pagination
   */
  async searchProducts(
    params: SearchProductsParams
  ): Promise<PaginatedResult<Product>> {
    const {
      query = "",
      category,
      inStock,
      minPrice,
      maxPrice,
      sortBy = "newest",
      limit = 20,
      offset = 0,
    } = params;

    const queryBuilder = this.productRepository.createQueryBuilder("product");

    // Text search (name, description, and category)
    if (query.trim()) {
      queryBuilder.andWhere(
        "(product.name ILIKE :query OR product.description ILIKE :query OR product.category ILIKE :query)",
        { query: `%${query}%` }
      );
    }

    // Filter by category
    if (category) {
      queryBuilder.andWhere("product.category ILIKE :category", { category });
    }

    // Filter by stock availability
    if (inStock !== undefined) {
      queryBuilder.andWhere("product.inStock = :inStock", { inStock });
    }

    // Price range filters
    if (minPrice !== undefined) {
      queryBuilder.andWhere("product.price >= :minPrice", { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere("product.price <= :maxPrice", { maxPrice });
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        queryBuilder.orderBy("product.createdAt", "DESC");
        break;
      case "oldest":
        queryBuilder.orderBy("product.createdAt", "ASC");
        break;
      case "price-asc":
        queryBuilder.orderBy("product.price", "ASC");
        break;
      case "price-desc":
        queryBuilder.orderBy("product.price", "DESC");
        break;
      case "name":
        queryBuilder.orderBy("product.name", "ASC");
        break;
      default:
        queryBuilder.orderBy("product.createdAt", "DESC");
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const data = await queryBuilder.skip(offset).take(limit).getMany();

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Get live sessions (convenience method)
   */
  async getLiveSessions(
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResult<Session>> {
    return this.searchSessions({
      status: "live",
      sortBy: "newest",
      limit,
      offset,
    });
  }

  /**
   * Get upcoming/scheduled sessions
   */
  async getUpcomingSessions(
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResult<Session>> {
    return this.searchSessions({
      status: "scheduled",
      sortBy: "newest",
      limit,
      offset,
    });
  }

  /**
   * Get trending sessions (most viewers in analytics)
   * This is a placeholder - would need to join with SessionView aggregates
   */
  async getTrendingSessions(
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResult<Session>> {
    // For now, return live sessions ordered by creation
    // In production, you'd want to order by viewer count from SessionView
    const queryBuilder = this.sessionRepository
      .createQueryBuilder("session")
      .leftJoinAndSelect("session.creator", "creator")
      .where("session.status = :status", { status: "live" })
      .orderBy("session.createdAt", "DESC")
      .skip(offset)
      .take(limit);

    const data = await queryBuilder.getMany();
    const total = await this.sessionRepository.count({
      where: { status: "live" },
    });

    return {
      data,
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    };
  }

  /**
   * Get sessions by creator with pagination
   */
  async getSessionsByCreator(
    creatorId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedResult<Session>> {
    return this.searchSessions({
      creatorId,
      sortBy: "newest",
      limit,
      offset,
    });
  }

  /**
   * Global search across sessions and products
   */
  async globalSearch(query: string, limit: number = 10) {
    const [sessions, products] = await Promise.all([
      this.searchSessions({ query, limit }),
      this.searchProducts({ query, limit }),
    ]);

    return {
      sessions: sessions.data,
      products: products.data,
      counts: {
        sessions: sessions.total,
        products: products.total,
      },
    };
  }
}
