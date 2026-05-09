import { Router } from "express";
import { RunController } from "../controllers/runController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", RunController.executeRun);
router.get("/", RunController.getRuns);
router.get("/:id", RunController.getRunById);
router.delete("/:id", RunController.deleteRun);

export default router;
