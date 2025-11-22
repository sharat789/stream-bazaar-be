import { AppDataSource } from "../data-source";
import { Product } from "../entity/Product";

export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Product | null> {
    return this.productRepository.findOne({ where: { id } });
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { category },
      order: { createdAt: "DESC" },
    });
  }

  async findBySeller(sellerId: number): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId },
      order: { createdAt: "DESC" },
    });
  }

  async findInStock(): Promise<Product[]> {
    return this.productRepository.find({
      where: { inStock: true },
      order: { createdAt: "DESC" },
    });
  }

  async getCategories(): Promise<string[]> {
    const result = await this.productRepository
      .createQueryBuilder("product")
      .select("DISTINCT product.category", "category")
      .where("product.category IS NOT NULL")
      .orderBy("product.category", "ASC")
      .getRawMany();

    return result.map((r) => r.category);
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(data);
    return this.productRepository.save(product);
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    await this.productRepository.update(id, data);
    return this.findOne(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productRepository.delete(id);
    return result.affected !== 0;
  }

  async isOwner(productId: string, userId: number): Promise<boolean> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    return product?.sellerId === userId;
  }
}
