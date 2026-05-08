import { Router } from "express";
import { TestController } from "../controllers/testController";

const router = Router();

router.post("/run-login-test", TestController.runLoginTest);
router.post("/record-test", TestController.recordTest);
router.get("/test-runs", TestController.getTestRuns);

export default router;
