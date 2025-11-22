import { UserController } from "../controllers/users.controller";
import { Router } from "express";

const router = Router();
const userController = new UserController();

router.get("/", (req, res, next) => userController.getAllUsers(req, res, next));
router.get("/live", (req, res, next) =>
  userController.getLiveUsers(req, res, next)
);
router.get("/:id", (req, res, next) =>
  userController.getUserById(req, res, next)
);
router.post("/", (req, res, next) => userController.createUser(req, res, next));
router.put("/:id", (req, res, next) =>
  userController.updateUser(req, res, next)
);
router.delete("/:id", (req, res, next) =>
  userController.deleteUser(req, res, next)
);

export default router;
