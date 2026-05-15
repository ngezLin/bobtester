import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";
import { PlaywrightService } from "../services/playwrightService";
import { SecurityChecker } from "../services/securityChecker";
import { AiService } from "../services/aiService";

export class AiRunController {
  static async executeAiRun(req: AuthRequest, res: Response) {
    const { url, goal, name: manualName, steps: manualSteps, project_id } = req.body;
    const userId = req.user?.id;

    if (!url || (!goal && !manualSteps)) {
      return res.status(400).json({
        success: false,
        message: "Both 'url' and 'goal' (or 'steps') are required.",
      });
    }

    let testRunId: number | null = null;
    let caseId: number | null = null;

    try {
      let steps = manualSteps;
      let name = manualName;

      // MODE 1: Generation Only (Preview)
      if (!manualSteps) {
        // 1. Discover page elements first to give AI context
        const elementContext = await PlaywrightService.discoverPageElements(url);

        // 2. Ask AI to generate test steps using the context
        const aiResult = await AiService.generateTestSteps(url, goal, elementContext);
        
        return res.json({
          success: true,
          message: "AI generated test steps.",
          name: aiResult.name,
          steps: aiResult.steps,
        });
      }

      // 1. Save the test case
      const { data: caseResult, error: caseError } = await supabase
        .from("test_cases")
        .insert({
          user_id: userId,
          project_id: project_id || null,
          name: manualName || `[AI] ${goal}`,
          target_url: url,
          steps: manualSteps
        })
        .select()
        .single();

      if (caseError) throw caseError;
      caseId = (caseResult as any).id;

      // 2. Create a running test run record
      const { data: runResult, error: runError } = await supabase
        .from("test_runs")
        .insert({
          user_id: userId,
          case_id: caseId,
          status: "running"
        })
        .select()
        .single();

      if (runError) throw runError;
      testRunId = (runResult as any).id;

      // 3. Respond immediately
      res.json({
        success: true,
        message: "Test case saved and execution started.",
        testRunId,
        caseId,
      });

      // 4. Execute the steps (runs after response)
      const startTime = Date.now();
      const { success, screenshot, logs, vulnerabilities } =
        await PlaywrightService.executeDynamicTest(testRunId!, steps);
      const executionTime = Date.now() - startTime;

      // 6. Determine final security status
      const security = new SecurityChecker();
      vulnerabilities.forEach((v) => security.addVulnerability(v));
      const finalStatus = security.determineStatus(success);

      // 7. Persist results to Supabase
      await supabase
        .from("test_runs")
        .update({
          status: finalStatus,
          execution_time: executionTime,
          screenshot_path: screenshot || null,
          logs: logs,
          vulnerabilities: vulnerabilities,
        })
        .eq("id", testRunId);

      console.log(
        `✅ [AI Run ${testRunId}] Finished. Status: ${finalStatus} | Time: ${executionTime}ms`
      );
    } catch (error: any) {
      console.error(`❌ [AI Run] Error:`, error.message);

        try {
          await supabase
            .from("test_runs")
            .update({
              status: "failed",
              logs: [
                {
                  level: "error",
                  message: error.message,
                  timestamp: new Date().toISOString(),
                },
              ],
            })
            .eq("id", testRunId);
        } catch (e) {
          // Don't throw if this also fails
        }
    }
  }
}
