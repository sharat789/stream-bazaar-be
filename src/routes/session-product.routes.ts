import { Router } from "express";
import { SessionProductController } from "../controllers/session-product.controller";
import { authenticate } from "../middleware/auth.middleware";

// Note: This router expects sessionId to be available in req.params
// It should be mounted at /sessions/:sessionId/products
const router = Router({ mergeParams: true });
const controller = new SessionProductController();

// Get products for session (public)
router.get("/", (req, res, next) => controller.getProducts(req, res, next));

// Update featured products (requires authentication and ownership)
router.patch("/", authenticate, (req, res, next) =>
  controller.updateFeaturedProducts(req, res, next)
);

// Add product to session (requires authentication and ownership)
router.post("/", authenticate, (req, res, next) =>
  controller.addProduct(req, res, next)
);

// Remove product from session (requires authentication and ownership)
router.delete("/:productId", authenticate, (req, res, next) =>
  controller.removeProduct(req, res, next)
);

// Toggle featured status (requires authentication and ownership)
router.patch("/:productId/feature", authenticate, (req, res, next) =>
  controller.toggleFeatured(req, res, next)
);

// Update display order (requires authentication and ownership)
router.patch("/:productId/order", authenticate, (req, res, next) =>
  controller.updateDisplayOrder(req, res, next)
);

export default router;
