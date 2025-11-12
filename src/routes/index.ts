import { Router } from "express";
import userRoutes from "./users.routes";
import productRoutes from "./products.routes";
import sessionRoutes from "./sessions.routes";

const router = Router();

router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/sessions", sessionRoutes);

export default router;
