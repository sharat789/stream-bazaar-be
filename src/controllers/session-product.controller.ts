import { Request, Response, NextFunction } from "express";
import {
  SessionProductService,
  AddProductDto,
} from "../services/session-product.service";
import { SessionService } from "../services/sessions.service";

export class SessionProductController {
  private sessionProductService = new SessionProductService();
  private sessionService = new SessionService();

  /**
   * Get all products for a session
   * GET /api/sessions/:sessionId/products
   */
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { featured } = req.query;

      let products;
      if (featured === "true") {
        products = await this.sessionProductService.getFeaturedProducts(
          sessionId
        );
      } else {
        products = await this.sessionProductService.getProducts(sessionId);
      }

      res.json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add product to session
   * POST /api/sessions/:sessionId/products
   */
  async addProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { productId, featured, displayOrder } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      // Verify ownership
      if (
        req.user &&
        !(await this.sessionService.isOwner(sessionId, req.user.userId))
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this session",
        });
      }

      const data: AddProductDto = {
        sessionId,
        productId,
        featured,
        displayOrder,
      };

      const sessionProduct = await this.sessionProductService.addProduct(data);

      res.status(201).json({
        success: true,
        message: "Product added to session successfully",
        data: sessionProduct,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes("not found") ||
          error.message.includes("already added")
        ) {
          return res.status(400).json({
            success: false,
            message: error.message,
          });
        }
      }
      next(error);
    }
  }

  /**
   * Remove product from session
   * DELETE /api/sessions/:sessionId/products/:productId
   */
  async removeProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, productId } = req.params;

      // Verify ownership
      if (
        req.user &&
        !(await this.sessionService.isOwner(sessionId, req.user.userId))
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this session",
        });
      }

      const success = await this.sessionProductService.removeProduct(
        sessionId,
        productId
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Product not found in this session",
        });
      }

      res.json({
        success: true,
        message: "Product removed from session successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle featured status
   * PATCH /api/sessions/:sessionId/products/:productId/feature
   */
  async toggleFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, productId } = req.params;
      const { featured } = req.body;

      if (typeof featured !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Featured must be a boolean value",
        });
      }

      // Verify ownership
      if (
        req.user &&
        !(await this.sessionService.isOwner(sessionId, req.user.userId))
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this session",
        });
      }

      const sessionProduct = await this.sessionProductService.toggleFeatured(
        sessionId,
        productId,
        featured
      );

      if (!sessionProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found in this session",
        });
      }

      res.json({
        success: true,
        message: "Featured status updated successfully",
        data: sessionProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update display order
   * PATCH /api/sessions/:sessionId/products/:productId/order
   */
  async updateDisplayOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, productId } = req.params;
      const { displayOrder } = req.body;

      if (typeof displayOrder !== "number") {
        return res.status(400).json({
          success: false,
          message: "Display order must be a number",
        });
      }

      // Verify ownership
      if (
        req.user &&
        !(await this.sessionService.isOwner(sessionId, req.user.userId))
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this session",
        });
      }

      const sessionProduct =
        await this.sessionProductService.updateDisplayOrder(
          sessionId,
          productId,
          displayOrder
        );

      if (!sessionProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found in this session",
        });
      }

      res.json({
        success: true,
        message: "Display order updated successfully",
        data: sessionProduct,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update featured products for a session
   * PATCH /api/sessions/:sessionId/products
   */
  async updateFeaturedProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { productIds } = req.body;

      if (!Array.isArray(productIds)) {
        return res.status(400).json({
          success: false,
          message: "productIds must be an array",
        });
      }

      // Verify ownership
      if (
        req.user &&
        !(await this.sessionService.isOwner(sessionId, req.user.userId))
      ) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to modify this session",
        });
      }

      const products = await this.sessionProductService.updateFeaturedProducts(
        sessionId,
        productIds
      );

      res.json({
        success: true,
        message: "Featured products updated successfully",
        data: products,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found in session")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      next(error);
    }
  }
}
