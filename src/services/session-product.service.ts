import { AppDataSource } from "../data-source";
import { SessionProduct } from "../entity/SessionProduct";
import { Product } from "../entity/Product";

export interface AddProductDto {
  sessionId: string;
  productId: string;
  featured?: boolean;
  displayOrder?: number;
}

export class SessionProductService {
  private sessionProductRepository =
    AppDataSource.getRepository(SessionProduct);
  private productRepository = AppDataSource.getRepository(Product);

  /**
   * Get all products for a session
   */
  async getProducts(sessionId: string): Promise<SessionProduct[]> {
    return this.sessionProductRepository.find({
      where: { sessionId },
      order: { displayOrder: "ASC", createdAt: "ASC" },
    });
  }

  /**
   * Get featured products for a session
   */
  async getFeaturedProducts(sessionId: string): Promise<SessionProduct[]> {
    return this.sessionProductRepository.find({
      where: { sessionId, featured: true },
      order: { displayOrder: "ASC", createdAt: "ASC" },
    });
  }

  /**
   * Add product to session
   */
  async addProduct(data: AddProductDto): Promise<SessionProduct> {
    // Check if product exists
    const product = await this.productRepository.findOne({
      where: { id: data.productId },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Check if product is already added to session
    const existing = await this.sessionProductRepository.findOne({
      where: {
        sessionId: data.sessionId,
        productId: data.productId,
      },
    });

    if (existing) {
      throw new Error("Product already added to this session");
    }

    const sessionProduct = this.sessionProductRepository.create({
      sessionId: data.sessionId,
      productId: data.productId,
      featured: data.featured || false,
      displayOrder: data.displayOrder || 0,
    });

    return this.sessionProductRepository.save(sessionProduct);
  }

  /**
   * Remove product from session
   */
  async removeProduct(sessionId: string, productId: string): Promise<boolean> {
    const result = await this.sessionProductRepository.delete({
      sessionId,
      productId,
    });
    return result.affected !== 0;
  }

  /**
   * Toggle featured status
   */
  async toggleFeatured(
    sessionId: string,
    productId: string,
    featured: boolean
  ): Promise<SessionProduct | null> {
    await this.sessionProductRepository.update(
      { sessionId, productId },
      { featured }
    );

    return this.sessionProductRepository.findOne({
      where: { sessionId, productId },
    });
  }

  /**
   * Update display order
   */
  async updateDisplayOrder(
    sessionId: string,
    productId: string,
    displayOrder: number
  ): Promise<SessionProduct | null> {
    await this.sessionProductRepository.update(
      { sessionId, productId },
      { displayOrder }
    );

    return this.sessionProductRepository.findOne({
      where: { sessionId, productId },
    });
  }

  /**
   * Get product count for a session
   */
  async getProductCount(sessionId: string): Promise<number> {
    return this.sessionProductRepository.count({
      where: { sessionId },
    });
  }

  /**
   * Check if product is in session
   */
  async isProductInSession(
    sessionId: string,
    productId: string
  ): Promise<boolean> {
    const count = await this.sessionProductRepository.count({
      where: { sessionId, productId },
    });
    return count > 0;
  }

  /**
   * Update featured products for a session
   * Sets all provided productIds as featured=true, all others as featured=false
   */
  async updateFeaturedProducts(
    sessionId: string,
    productIds: string[]
  ): Promise<Product[]> {
    // Get all session products
    const allSessionProducts = await this.sessionProductRepository.find({
      where: { sessionId }
    });

    // Verify all provided productIds exist in the session
    const sessionProductIds = allSessionProducts.map(sp => sp.productId);
    const invalidProductIds = productIds.filter(id => !sessionProductIds.includes(id));

    if (invalidProductIds.length > 0) {
      throw new Error(`Products not found in session: ${invalidProductIds.join(", ")}`);
    }

    // Update featured status for all products
    await Promise.all(
      allSessionProducts.map(sp =>
        this.sessionProductRepository.update(
          { sessionId: sp.sessionId, productId: sp.productId },
          { featured: productIds.includes(sp.productId) }
        )
      )
    );

    // Return the featured products
    const featuredSessionProducts = await this.sessionProductRepository.find({
      where: { sessionId, featured: true },
      order: { displayOrder: "ASC", createdAt: "ASC" }
    });

    return featuredSessionProducts.map(sp => sp.product);
  }
}
