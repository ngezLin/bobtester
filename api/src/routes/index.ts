import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { CaseController } from "../controllers/caseController";
import { AssetController } from "../controllers/assetController";
import { RunController } from "../controllers/runController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// --- AUTH ROUTES ---
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);

// --- CASE ROUTES (Protected) ---
router.post("/cases", authMiddleware, CaseController.createCase);
router.get("/cases", authMiddleware, CaseController.getCases);
router.get("/cases/:id", authMiddleware, CaseController.getCaseById);
router.put("/cases/:id", authMiddleware, CaseController.updateCase);
router.delete("/cases/:id", authMiddleware, CaseController.deleteCase);
router.post("/cases/record", authMiddleware, CaseController.record);

// --- ASSET ROUTES (Protected) ---
router.post("/assets/case/:id", authMiddleware, AssetController.addAsset);
router.get("/assets/case/:id", authMiddleware, AssetController.getAssetsByCase);
router.delete("/assets/:id", authMiddleware, AssetController.deleteAsset);

// --- RUN ROUTES (Protected) ---
router.post("/runs", authMiddleware, RunController.executeRun);
router.get("/runs", authMiddleware, RunController.getRuns);
router.get("/runs/:id", authMiddleware, RunController.getRunById);
router.delete("/runs/:id", authMiddleware, RunController.deleteRun);

// --- BOB AI ROUTES ---

export default router;
