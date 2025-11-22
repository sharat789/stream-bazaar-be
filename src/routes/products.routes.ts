import { Router } from "express";
import { ProductController } from "../controllers/products.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const controller = new ProductController();

// Get all categories
router.get("/categories", controller.getCategories.bind(controller));

// Get in-stock products (user's own products)
router.get("/in-stock", authenticate, controller.getInStock.bind(controller));

// Get products by category (user's own products)
router.get("/category/:category", authenticate, controller.getByCategory.bind(controller));

// Standard CRUD operations
router.get("/", authenticate, controller.getAll.bind(controller));
router.get("/:id", controller.getOne.bind(controller));
router.post("/", authenticate, controller.create.bind(controller));
router.put("/:id", authenticate, controller.update.bind(controller));
router.delete("/:id", authenticate, controller.delete.bind(controller));

export default router;
