import { Router } from "express";
import { AssetController } from "../controllers/assetController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// All asset routes require authentication
router.use(authMiddleware);

router.post("/case/:id", AssetController.addAsset);
router.get("/case/:id", AssetController.getAssetsByCase);
router.delete("/:id", AssetController.deleteAsset);

export default router;
