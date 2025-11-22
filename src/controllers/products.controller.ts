import { Request, Response } from "express";
import { ProductService } from "../services/products.service";

const productService = new ProductService();

export class ProductController {
  async getAll(req: Request, res: Response) {
    try {
      // Always filter by authenticated user's ID
      const products = await productService.findBySeller(req.user!.userId);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      const product = await productService.findOne(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  }

  async getByCategory(req: Request, res: Response) {
    try {
      // Get user's products filtered by category
      const products = await productService.findBySeller(req.user!.userId);
      const filteredProducts = products.filter(p => p.category === req.params.category);
      res.json(filteredProducts);
    } catch (error) {
      console.error("Error fetching products by category:", error);
      res.status(500).json({ error: "Failed to fetch products by category" });
    }
  }

  async getInStock(req: Request, res: Response) {
    try {
      // Get user's in-stock products
      const products = await productService.findBySeller(req.user!.userId);
      const inStockProducts = products.filter(p => p.inStock);
      res.json(inStockProducts);
    } catch (error) {
      console.error("Error fetching in-stock products:", error);
      res.status(500).json({ error: "Failed to fetch in-stock products" });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const categories = await productService.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  }

  async create(req: Request, res: Response) {
    try {
      // Automatically set sellerId to authenticated user
      const productData = {
        ...req.body,
        sellerId: req.user!.userId,
      };
      const product = await productService.create(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(400).json({ error: "Failed to create product" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      // Verify ownership
      const isOwner = await productService.isOwner(req.params.id, req.user!.userId);
      if (!isOwner) {
        return res.status(403).json({ error: "You don't have permission to update this product" });
      }

      const product = await productService.update(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(400).json({ error: "Failed to update product" });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      // Verify ownership
      const isOwner = await productService.isOwner(req.params.id, req.user!.userId);
      if (!isOwner) {
        return res.status(403).json({ error: "You don't have permission to delete this product" });
      }

      const success = await productService.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  }
}
