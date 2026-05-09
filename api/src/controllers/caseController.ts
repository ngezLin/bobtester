import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import pool from "../db";
import { exec } from "child_process";

export class CaseController {
  static async createCase(req: AuthRequest, res: Response) {
    const { name, target_url, steps } = req.body;
    const userId = req.user?.id;

    if (!name || !target_url || !steps) {
      return res.status(400).json({ success: false, message: "Name, target_url, and steps are required" });
    }

    try {
      const [result]: any = await pool.execute(
        "INSERT INTO test_cases (user_id, name, target_url, steps) VALUES (?, ?, ?, ?)",
        [userId as number, name, target_url, JSON.stringify(steps)]
      );

      res.status(201).json({
        success: true,
        message: "Test case created successfully",
        caseId: result.insertId,
      });
    } catch (error: any) {
      console.error("Create case error:", error);
      res.status(500).json({ success: false, message: "Server error during case creation" });
    }
  }

  static async getCases(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      const [rows]: any = await pool.execute(
        "SELECT id, name, target_url, created_at FROM test_cases WHERE user_id = ? ORDER BY created_at DESC",
        [userId as number]
      );

      res.json({
        success: true,
        cases: rows,
      });
    } catch (error: any) {
      console.error("Get cases error:", error);
      res.status(500).json({ success: false, message: "Server error fetching cases" });
    }
  }

  static async getCaseById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const [rows]: any = await pool.execute(
        "SELECT * FROM test_cases WHERE id = ? AND user_id = ?",
        [id, userId as number]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: "Case not found" });
      }

      res.json({
        success: true,
        case: rows[0],
      });
    } catch (error: any) {
      console.error("Get case detail error:", error);
      res.status(500).json({ success: false, message: "Server error fetching case details" });
    }
  }

  static async updateCase(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, target_url, steps } = req.body;
    const userId = req.user?.id;

    try {
      await pool.execute(
        "UPDATE test_cases SET name = ?, target_url = ?, steps = ? WHERE id = ? AND user_id = ?",
        [name, target_url, JSON.stringify(steps), id, userId as number]
      );

      res.json({
        success: true,
        message: "Test case updated successfully",
      });
    } catch (error: any) {
      console.error("Update case error:", error);
      res.status(500).json({ success: false, message: "Server error during case update" });
    }
  }

  static async deleteCase(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const [result]: any = await pool.execute(
        "DELETE FROM test_cases WHERE id = ? AND user_id = ?",
        [id, userId as number]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Case not found or unauthorized" });
      }

      res.json({
        success: true,
        message: "Case deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete case error:", error);
      res.status(500).json({ success: false, message: "Server error during case deletion" });
    }
  }

  static async record(req: AuthRequest, res: Response) {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }

    try {
      console.log(`Starting recorder for: ${url}`);
      exec(`npx playwright codegen ${url}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Exec error: ${error}`);
          return;
        }
        console.log(`Recorder closed for ${url}`);
      });

      res.json({
        success: true,
        message: "Recorder launched. Please check your desktop.",
      });
    } catch (error: any) {
      console.error("Record error:", error);
      res.status(500).json({ success: false, message: "Failed to launch recorder" });
    }
  }
}
