import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./users.routes";
import productRoutes from "./products.routes";
import sessionRoutes from "./sessions.routes";
import searchRoutes from "./search.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/sessions", sessionRoutes);
router.use("/search", searchRoutes);

export default router;
