import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";

export class CaseController {
  static async createCase(req: AuthRequest, res: Response) {
    console.log("[createCase] Request received");

    const { name, target_url, steps, project_id, folder } = req.body;
    const userId = req.user?.id;

    console.log("[createCase] Payload:", {
      name,
      target_url,
      steps,
      project_id,
      folder,
      userId,
    });

    if (!name || !target_url || !steps) {
      console.warn("[createCase] Validation failed");

      return res.status(400).json({
        success: false,
        message: "Name, target_url, and steps are required",
      });
    }

    try {
      console.log("[createCase] Inserting into database...");

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

      console.log("[createCase] Supabase result:", result);
      console.log("[createCase] Supabase error:", error);

      if (error) {
        console.error("[createCase] Create case error:", error);

        return res.status(500).json({
          success: false,
          message: "Server error during case creation",
        });
      }

      console.log("[createCase] Case created successfully:", result?.[0]);

      res.status(201).json({
        success: true,
        message: "Test case created successfully",
        caseId: result[0].id,
      });
    } catch (error: any) {
      console.error("[createCase] Catch error:", error);

      res.status(500).json({
        success: false,
        message: "Server error during case creation",
      });
    }
  }

  static async getCases(req: AuthRequest, res: Response) {
    console.log("[getCases] Request received");

    const userId = req.user?.id;

    console.log("[getCases] User ID:", userId);

    try {
      console.log("[getCases] Fetching cases from database...");

      const { data: rows, error } = await supabase
        .from("test_cases")
        .select("id, name, target_url, created_at, folder, project_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      console.log("[getCases] Rows:", rows);
      console.log("[getCases] Error:", error);

      if (error) {
        console.error("[getCases] Get cases error:", error);

        return res.status(500).json({
          success: false,
          message: "Server error fetching cases",
        });
      }

      console.log("[getCases] Cases fetched successfully");

      res.json({
        success: true,
        cases: rows,
      });
    } catch (error: any) {
      console.error("[getCases] Catch error:", error);

      res.status(500).json({
        success: false,
        message: "Server error fetching cases",
      });
    }
  }

  static async getCaseById(req: AuthRequest, res: Response) {
    console.log("[getCaseById] Request received");

    const { id } = req.params;
    const userId = req.user?.id;

    console.log("[getCaseById] Params:", {
      id,
      userId,
    });

    try {
      console.log("[getCaseById] Fetching case detail...");

      const { data: rows, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId);

      console.log("[getCaseById] Rows:", rows);
      console.log("[getCaseById] Error:", error);

      if (error || !rows || rows.length === 0) {
        console.warn("[getCaseById] Case not found");

        return res.status(404).json({
          success: false,
          message: "Case not found",
        });
      }

      console.log("[getCaseById] Case fetched successfully");

      res.json({
        success: true,
        case: rows[0],
      });
    } catch (error: any) {
      console.error("[getCaseById] Catch error:", error);

      res.status(500).json({
        success: false,
        message: "Server error fetching case details",
      });
    }
  }

  static async updateCase(req: AuthRequest, res: Response) {
    console.log("[updateCase] Request received");

    const { id } = req.params;
    const { name, target_url, steps } = req.body;
    const userId = req.user?.id;

    console.log("[updateCase] Payload:", {
      id,
      name,
      target_url,
      steps,
      userId,
    });

    try {
      console.log("[updateCase] Updating case...");

      const { error } = await supabase
        .from("test_cases")
        .update({
          name,
          target_url,
          steps: steps,
        })
        .eq("id", id)
        .eq("user_id", userId);

      console.log("[updateCase] Error:", error);

      if (error) {
        console.error("[updateCase] Update case error:", error);

        return res.status(500).json({
          success: false,
          message: "Server error during case update",
        });
      }

      console.log("[updateCase] Case updated successfully");

      res.json({
        success: true,
        message: "Test case updated successfully",
      });
    } catch (error: any) {
      console.error("[updateCase] Catch error:", error);

      res.status(500).json({
        success: false,
        message: "Server error during case update",
      });
    }
  }

  static async deleteCase(req: AuthRequest, res: Response) {
    console.log("[deleteCase] Request received");

    const { id } = req.params;
    const userId = req.user?.id;

    console.log("[deleteCase] Params:", {
      id,
      userId,
    });

    try {
      console.log("[deleteCase] Deleting case...");

      const { error } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      console.log("[deleteCase] Error:", error);

      if (error) {
        console.error("[deleteCase] Delete case error:", error);

        return res.status(500).json({
          success: false,
          message: "Server error during case deletion",
        });
      }

      console.log("[deleteCase] Case deleted successfully");

      res.json({
        success: true,
        message: "Case deleted successfully",
      });
    } catch (error: any) {
      console.error("[deleteCase] Catch error:", error);

      res.status(500).json({
        success: false,
        message: "Server error during case deletion",
      });
    }
  }

  static async record(req: AuthRequest, res: Response) {
    console.log("[record] Request received");

    const { url } = req.body;

    console.log("[record] URL:", url);

    if (!url) {
      console.warn("[record] URL is missing");

      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    // Always return instructions for local recording
    // No server-side Playwright execution needed
    console.log(`[record] Providing local recording instructions for: ${url}`);

    res.json({
      success: true,
      isCloud: false,
      message: "Use Playwright Codegen on your local device to record actions. Run: npx playwright codegen " + url,
      command: `npx playwright codegen ${url}`,
    });
  }
}
