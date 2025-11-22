import { AppDataSource } from "../data-source";
import { Session } from "../entity/Session";
import { SessionProduct } from "../entity/SessionProduct";
import { Product } from "../entity/Product";
import { In } from "typeorm";

export class SessionService {
  private sessionRepository = AppDataSource.getRepository(Session);
  private sessionProductRepository = AppDataSource.getRepository(SessionProduct);
  private productRepository = AppDataSource.getRepository(Product);

  async findAll(): Promise<Session[]> {
    return this.sessionRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<(Session & { products?: Product[] }) | null> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ["activeProduct"]
    });

    if (!session) {
      return null;
    }

    // Get products for this session
    const sessionProducts = await this.sessionProductRepository.find({
      where: { sessionId: id },
      order: { displayOrder: "ASC", createdAt: "ASC" }
    });

    return {
      ...session,
      products: sessionProducts.map(sp => sp.product)
    };
  }

  async findByCreator(creatorId: number): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { creatorId },
      order: { createdAt: "DESC" },
    });
  }

  async create(data: Partial<Session> & { productIds?: string[] }): Promise<Session> {
    const { productIds, ...sessionData } = data;

    // Create session
    const session = this.sessionRepository.create(sessionData);
    const savedSession = await this.sessionRepository.save(session);

    // Add products to session if provided
    if (productIds && productIds.length > 0) {
      // Verify all products exist and belong to creator
      const products = await this.productRepository.find({
        where: {
          id: In(productIds)
        }
      });

      if (products.length !== productIds.length) {
        throw new Error("One or more products not found");
      }

      // Verify ownership if sellerId is set
      const creatorId = sessionData.creatorId;
      if (creatorId) {
        const unauthorizedProducts = products.filter(
          p => p.sellerId && p.sellerId !== creatorId
        );
        if (unauthorizedProducts.length > 0) {
          throw new Error("You don't own all the specified products");
        }
      }

      // Create session-product relationships
      const sessionProducts = productIds.map((productId, index) =>
        this.sessionProductRepository.create({
          sessionId: savedSession.id,
          productId,
          displayOrder: index,
          featured: false
        })
      );

      await this.sessionProductRepository.save(sessionProducts);
    }

    return savedSession;
  }

  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    await this.sessionRepository.update(id, data);
    return this.findOne(id);
  }

  async updateStatus(id: string, status: string): Promise<Session | null> {
    await this.sessionRepository.update(id, { status });
    return this.findOne(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.sessionRepository.delete(id);
    return result.affected !== 0;
  }

  async isOwner(sessionId: string, userId: number): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    return session?.creatorId === userId;
  }
}
