import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { CaseController } from "../controllers/caseController";
import { AssetController } from "../controllers/assetController";
import { RunController } from "../controllers/runController";
import { ProjectController } from "../controllers/projectController";
import { StatsController } from "../controllers/statsController";
import { WebhookController } from "../controllers/webhookController";
import { ScanController } from "../controllers/scanController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// --- AUTH ROUTES ---
router.post("/auth/register", AuthController.register);
router.post("/auth/login", AuthController.login);

// --- STATS ROUTES (Protected) ---
router.get("/stats", authMiddleware, StatsController.getDashboardStats);

// --- PROJECT ROUTES (Protected) ---
router.post("/projects", authMiddleware, ProjectController.createProject);
router.get("/projects", authMiddleware, ProjectController.getProjects);
router.get("/projects/:id", authMiddleware, ProjectController.getProjectById);
router.put("/projects/:id", authMiddleware, ProjectController.updateProject);
router.delete("/projects/:id", authMiddleware, ProjectController.deleteProject);
router.post("/projects/:id/run", authMiddleware, ProjectController.runSuite);

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

// --- SCAN ROUTES (Protected) ---
router.post("/scans", authMiddleware, ScanController.startScan);

// --- WEBHOOK ROUTES (Public with secret) ---
router.post("/webhooks/projects/:id", WebhookController.triggerProjectRun);

export default router;
