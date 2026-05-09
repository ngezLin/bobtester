import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import pool from "../db";

export class AssetController {
  static async addAsset(req: AuthRequest, res: Response) {
    const { id } = req.params; // case_id
    const { name, data, is_negative } = req.body;
    const userId = req.user?.id;

    if (!name || !data) {
      return res.status(400).json({ success: false, message: "Name and data are required" });
    }

    try {
      // Verify ownership of the case
      const [cases]: any = await pool.execute(
        "SELECT id FROM test_cases WHERE id = ? AND user_id = ?",
        [id, userId as any]
      );

      if (cases.length === 0) {
        return res.status(404).json({ success: false, message: "Case not found or unauthorized" });
      }

      const [result]: any = await pool.execute(
        "INSERT INTO test_assets (case_id, name, data, is_negative) VALUES (?, ?, ?, ?)",
        [id, name, JSON.stringify(data), is_negative || false]
      );

      res.status(201).json({
        success: true,
        message: "Asset added successfully",
        assetId: result.insertId,
      });
    } catch (error: any) {
      console.error("Add asset error:", error);
      res.status(500).json({ success: false, message: "Server error during asset creation" });
    }
  }

  static async getAssetsByCase(req: AuthRequest, res: Response) {
    const { id } = req.params; // case_id
    const userId = req.user?.id;

    try {
      // Verify ownership of the case
      const [cases]: any = await pool.execute(
        "SELECT id FROM test_cases WHERE id = ? AND user_id = ?",
        [id, userId as any]
      );

      if (cases.length === 0) {
        return res.status(404).json({ success: false, message: "Case not found or unauthorized" });
      }

      const [rows]: any = await pool.execute(
        "SELECT * FROM test_assets WHERE case_id = ? ORDER BY created_at DESC",
        [id]
      );

      res.json({
        success: true,
        assets: rows,
      });
    } catch (error: any) {
      console.error("Get assets error:", error);
      res.status(500).json({ success: false, message: "Server error fetching assets" });
    }
  }

  static async deleteAsset(req: AuthRequest, res: Response) {
    const { id } = req.params; // asset_id
    const userId = req.user?.id;

    try {
      // Complex join to verify user ownership of the asset via test_cases
      const [rows]: any = await pool.execute(
        `SELECT a.id FROM test_assets a 
         JOIN test_cases c ON a.case_id = c.id 
         WHERE a.id = ? AND c.user_id = ?`,
        [id, userId as any]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "Asset not found or unauthorized" });
      }

      await pool.execute("DELETE FROM test_assets WHERE id = ?", [id]);

      res.json({
        success: true,
        message: "Asset deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete asset error:", error);
      res.status(500).json({ success: false, message: "Server error during asset deletion" });
    }
  }
}
