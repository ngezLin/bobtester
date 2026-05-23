import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";
import { PlaywrightService } from "../services/playwrightService";
import { SecurityChecker } from "../services/securityChecker";

export class RunController {
  static async executeRun(req: AuthRequest, res: Response) {
    const { caseId, assetId } = req.body;
    const userId = req.user?.id;

    if (!caseId) {
      return res
        .status(400)
        .json({ success: false, message: "caseId is required" });
    }

    try {
      // 1. Fetch Case
      const { data: cases, error: caseError } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", caseId)
        .eq("user_id", userId);
      if (caseError || !cases || cases.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Case not found" });
      const testCase = cases[0];

      // 2. Fetch Asset (if provided)
      let assetData = {};
      if (assetId) {
        const { data: assets } = await supabase
          .from("test_assets")
          .select("data")
          .eq("id", assetId)
          .eq("case_id", caseId);
        if (assets && assets.length > 0) assetData = assets[0].data;
      }

      // 3. Create Test Run record
      const { data: runResult, error: runError } = await supabase
        .from("test_runs")
        .insert({
          user_id: userId,
          case_id: caseId,
          asset_id: assetId || null,
          status: "running",
        })
        .select("id");
      if (runError) {
        console.error("Insert run error:", runError);
        return res
          .status(500)
          .json({ success: false, message: "Failed to create run record" });
      }
      const testRunId = runResult[0].id;

      // 4. Execute Dynamically
      const startTime = Date.now();
      const { success, screenshot, logs, vulnerabilities } =
        await PlaywrightService.executeDynamicTest(
          testRunId,
          testCase.steps,
          assetData,
        );
      const executionTime = Date.now() - startTime;

      // 5. Calculate Security Status
      const security = new SecurityChecker();
      vulnerabilities.forEach((v) => security.addVulnerability(v));
      const finalStatus = security.determineStatus(success);

      // 6. Update Test Run record
      console.log(`🌐 [Run ${testRunId}] Updating database with final status: ${finalStatus}`);
      const { data: updateData, error: updateError } = await supabase
        .from("test_runs")
        .update({
          status: finalStatus,
          execution_time: executionTime,
          screenshot_path: screenshot || null,
          logs: JSON.stringify(logs),
          vulnerabilities: JSON.stringify(vulnerabilities),
        })
        .eq("id", testRunId)
        .select();

      if (updateError) {
        console.error(`❌ [Run ${testRunId}] Database update failed:`, updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      } else {
        console.log(`✅ [Run ${testRunId}] Database update succeeded:`, updateData);
      }

      // 7. Respond to client
      res.json({
        success: true,
        message: "Test execution completed",
        testRunId,
        status: finalStatus
      });
    } catch (error: any) {
      console.error("Run execution error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || "An unexpected error occurred during test execution",
        });
      }
    }
  }

  static async getRuns(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      const { data: rows, error } = await supabase
        .from("test_runs")
        .select(
          `
          *,
          test_cases!inner(name),
          test_assets(name)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get runs error:", error);
        return res
          .status(500)
          .json({ success: false, message: "Server error fetching runs" });
      }

      // Flatten the joined data
      const flattenedRows = rows.map((run: any) => ({
        ...run,
        case_name: run.test_cases?.name,
        asset_name: run.test_assets?.name,
      }));

      res.json({
        success: true,
        runs: flattenedRows,
      });
    } catch (error: any) {
      console.error("Get runs error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error fetching runs" });
    }
  }

  static async getRunById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const { data: rows, error } = await supabase
        .from("test_runs")
        .select(
          `
          *,
          test_cases!inner(name),
          test_assets(name)
        `,
        )
        .eq("id", id)
        .eq("user_id", userId);

      if (error || !rows || rows.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Run not found" });

      // Flatten the joined data
      const run = {
        ...rows[0],
        case_name: rows[0].test_cases?.name,
        asset_name: rows[0].test_assets?.name,
      };

      res.json({
        success: true,
        run,
      });
    } catch (error: any) {
      console.error("Get run detail error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error fetching run details" });
    }
  }

  static async deleteRun(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const { error } = await supabase
        .from("test_runs")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        console.error("Delete run error:", error);
        return res
          .status(500)
          .json({
            success: false,
            message: "Server error during run deletion",
          });
      }

      res.json({
        success: true,
        message: "Run history deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete run error:", error);
      res
        .status(500)
        .json({ success: false, message: "Server error during run deletion" });
    }
  }
}