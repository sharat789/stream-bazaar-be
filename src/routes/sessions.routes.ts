import { Router } from "express";
import { SessionController } from "../controllers/sessions.controller";

const router = Router();
const controller = new SessionController();

router.get("/", controller.getAll.bind(controller));
router.get("/:id", controller.getOne.bind(controller));
router.post("/", controller.create.bind(controller));
router.patch("/:id/status", controller.updateStatus.bind(controller));
router.delete("/:id", controller.delete.bind(controller));

export default router;
