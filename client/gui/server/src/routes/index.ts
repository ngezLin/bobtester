import { Router } from "express";
import { CaseController } from "../controllers/caseController";
import { RunController } from "../controllers/runController";
import { DataController } from "../controllers/dataController";
import { StatsController } from "../controllers/statsController";
import { RecorderController } from "../controllers/recorderController";

const router = Router();

router.get("/data", DataController.getFiles);
router.get("/data/:filename", DataController.getFile);
router.post("/data/:filename", DataController.saveFile);
router.post("/data/:filename/rename", DataController.renameFile);
router.delete("/data/:filename", DataController.deleteFile);
router.get("/stats", StatsController.getDashboardStats);

router.post("/cases", CaseController.createCase);
router.get("/cases", CaseController.getCases);
router.get("/cases/:id", CaseController.getCaseById);
router.put("/cases/:id", CaseController.updateCase);
router.delete("/cases/:id", CaseController.deleteCase);
router.post("/cases/record", CaseController.record);

router.post("/runs", RunController.executeRun);
router.get("/runs", RunController.getRuns);
router.get("/runs/:id", RunController.getRunById);
router.delete("/runs/:id", RunController.deleteRun);

// ── Recorder routes ─────────────────────────────────────────────────────────
router.post("/recorder/start", RecorderController.startSession);
router.get("/recorder/:id/screenshot", RecorderController.getScreenshot);
router.get("/recorder/:id/stream", RecorderController.streamEvents);
router.post("/recorder/:id/action", RecorderController.performAction);
router.delete("/recorder/:id/step", RecorderController.removeStep);
router.delete("/recorder/:id", RecorderController.stopSession);

export default router;
