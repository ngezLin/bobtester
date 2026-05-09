import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import pool from "../db";
import { PlaywrightService } from "../services/playwrightService";

export class RunController {
  static async executeRun(req: AuthRequest, res: Response) {
    const { caseId, assetId } = req.body;
    const userId = req.user?.id;

    if (!caseId) {
      return res.status(400).json({ success: false, message: "caseId is required" });
    }

    try {
      // 1. Fetch Case
      const [cases]: any = await pool.execute(
        "SELECT * FROM test_cases WHERE id = ? AND user_id = ?",
        [caseId, userId as any]
      );
      if (cases.length === 0) return res.status(404).json({ success: false, message: "Case not found" });
      const testCase = cases[0];

      // 2. Fetch Asset (if provided)
      let assetData = {};
      if (assetId) {
        const [assets]: any = await pool.execute(
          "SELECT data FROM test_assets WHERE id = ? AND case_id = ?",
          [assetId, caseId]
        );
        if (assets.length > 0) assetData = assets[0].data;
      }

      // 3. Create Test Run record
      const [runResult]: any = await pool.execute(
        "INSERT INTO test_runs (user_id, case_id, asset_id, status) VALUES (?, ?, ?, ?)",
        [userId as any, caseId, assetId || null, "running"]
      );
      const testRunId = runResult.insertId;

      // 4. Respond to client immediately
      res.json({
        success: true,
        message: "Test execution started",
        testRunId,
      });

      // 5. Execute Dynamically
      const startTime = Date.now();
      const { success, screenshot, logs } = await PlaywrightService.executeDynamicTest(
        testRunId,
        testCase.steps,
        assetData
      );
      const executionTime = Date.now() - startTime;

      // 6. Update Test Run record
      await pool.execute(
        "UPDATE test_runs SET status = ?, execution_time = ?, screenshot_path = ?, logs = ? WHERE id = ?",
        [
          success ? "passed" : "failed",
          executionTime,
          screenshot || null,
          JSON.stringify(logs),
          testRunId
        ]
      );

    } catch (error: any) {
      console.error("Run execution error:", error);
    }
  }

  static async getRuns(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      const [rows]: any = await pool.execute(
        `SELECT r.*, c.name as case_name, a.name as asset_name 
         FROM test_runs r
         JOIN test_cases c ON r.case_id = c.id
         LEFT JOIN test_assets a ON r.asset_id = a.id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC`,
        [userId as any]
      );

      res.json({
        success: true,
        runs: rows,
      });
    } catch (error: any) {
      console.error("Get runs error:", error);
      res.status(500).json({ success: false, message: "Server error fetching runs" });
    }
  }

  static async getRunById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const [rows]: any = await pool.execute(
        `SELECT r.*, c.name as case_name, a.name as asset_name 
         FROM test_runs r
         JOIN test_cases c ON r.case_id = c.id
         LEFT JOIN test_assets a ON r.asset_id = a.id
         WHERE r.id = ? AND r.user_id = ?`,
        [id, userId as any]
      );

      if (rows.length === 0) return res.status(404).json({ success: false, message: "Run not found" });

      res.json({
        success: true,
        run: rows[0],
      });
    } catch (error: any) {
      console.error("Get run detail error:", error);
      res.status(500).json({ success: false, message: "Server error fetching run details" });
    }
  }

  static async deleteRun(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const [result]: any = await pool.execute(
        "DELETE FROM test_runs WHERE id = ? AND user_id = ?",
        [id, userId as any]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Run not found or unauthorized" });
      }

      res.json({
        success: true,
        message: "Run history deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete run error:", error);
      res.status(500).json({ success: false, message: "Server error during run deletion" });
    }
  }
}
