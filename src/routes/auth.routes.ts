import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const authController = new AuthController();

// Public routes
router.post("/register", (req, res, next) =>
  authController.register(req, res, next)
);

router.post("/login", (req, res, next) => authController.login(req, res, next));

router.post("/refresh-token", (req, res, next) =>
  authController.refreshToken(req, res, next)
);

// Protected routes (require authentication)
router.get("/currentUser", authenticate, (req, res, next) =>
  authController.getCurrentUser(req, res, next)
);

router.post("/logout", authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

router.post("/update", authenticate, (req, res, next) =>
  authController.updateUser(req, res, next)
);

export default router;
