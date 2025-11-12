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
}
