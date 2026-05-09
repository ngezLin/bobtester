import { Router } from "express";
import { CaseController } from "../controllers/caseController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// All case routes require authentication
router.use(authMiddleware);

router.post("/", CaseController.createCase);
router.get("/", CaseController.getCases);
router.get("/:id", CaseController.getCaseById);
router.put("/:id", CaseController.updateCase);
router.delete("/:id", CaseController.deleteCase);
router.post("/record", CaseController.record);

export default router;
