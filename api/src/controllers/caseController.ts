import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";
import { exec } from "child_process";

export class CaseController {
  static async createCase(req: AuthRequest, res: Response) {
    const { name, target_url, steps, project_id, folder } = req.body;
    const userId = req.user?.id;

    if (!name || !target_url || !steps) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, target_url, and steps are required",
        });
    }

    try {
      const { data: result, error } = await supabase
        .from("test_cases")
        .insert({
          user_id: userId,
          project_id: project_id || null,
          folder: folder || "General",
          name,
          target_url,
          steps: steps,
        })
        .select("id");
      if (error) {
        console.error("Create case error:", error);
        return res
          .status(500)
          .json({
            success: false,
            message: "Server error during case creation",
          });
      }

      res.status(201).json({
        success: true,
        message: "Test case created successfully",
        caseId: result[0].id,
      });
    } catch (error: any) {
      console.error("Create case error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error during case creation" });
    }
  }

  static async getCases(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      const { data: rows, error } = await supabase
        .from("test_cases")
        .select("id, name, target_url, created_at, folder, project_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Get cases error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Server error fetching cases" });
      }

      res.json({
        success: true,
        cases: rows,
      });
    } catch (error: any) {
      console.error("Get cases error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error fetching cases" });
    }
  }

  static async getCaseById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const { data: rows, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId);

      if (error || !rows || rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Case not found" });
      }

      res.json({
        success: true,
        case: rows[0],
      });
    } catch (error: any) {
      console.error("Get case detail error:", error);
      res
        .status(500)
        .json({
          success: false,
          message: "Server error fetching case details",
        });
    }
  }

  static async updateCase(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, target_url, steps } = req.body;
    const userId = req.user?.id;

    try {
      const { error } = await supabase
        .from("test_cases")
        .update({ name, target_url, steps: steps })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Update case error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Server error during case update" });
      }

      res.json({
        success: true,
        message: "Test case updated successfully",
      });
    } catch (error: any) {
      console.error("Update case error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error during case update" });
    }
  }

  static async deleteCase(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const { error } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Delete case error:", error);
        return res
          .status(500)
          .json({
            success: false,
            message: "Server error during case deletion",
          });
      }

      res.json({
        success: true,
        message: "Case deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete case error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error during case deletion" });
    }
  }

  static async record(req: AuthRequest, res: Response) {
    const { url } = req.body;

    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "URL is required" });
    }

    if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
      return res.status(400).json({ 
        success: false, 
        message: "Recording is only supported in the local development environment. Please use your local instance to record tests." 
      });
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
      res
        .status(500)
        .json({ success: false, message: "Failed to launch recorder" });
    }
  }
}