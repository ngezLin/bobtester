import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import pool from "../db";
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

      // MODE 2: Save & Run
      // 1. Save the test case
      const [caseResult]: any = await pool.execute(
        "INSERT INTO test_cases (user_id, project_id, name, target_url, steps) VALUES (?, ?, ?, ?, ?)",
        [userId as number, project_id || null, manualName || `[AI] ${goal}`, url, JSON.stringify(manualSteps)]
      );
      caseId = caseResult.insertId;

      // 2. Create a running test run record
      const [runResult]: any = await pool.execute(
        "INSERT INTO test_runs (user_id, case_id, status) VALUES (?, ?, ?)",
        [userId as number, caseId as number, "running"]
      );
      testRunId = runResult.insertId;

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

      // 7. Persist results to MySQL
      await pool.execute(
        "UPDATE test_runs SET status = ?, execution_time = ?, screenshot_path = ?, logs = ?, vulnerabilities = ? WHERE id = ?",
        [
          finalStatus,
          executionTime,
          screenshot || null,
          JSON.stringify(logs),
          JSON.stringify(vulnerabilities),
          testRunId,
        ]
      );

      console.log(
        `✅ [AI Run ${testRunId}] Finished. Status: ${finalStatus} | Time: ${executionTime}ms`
      );
    } catch (error: any) {
      console.error(`❌ [AI Run] Error:`, error.message);

      // If a run record was created, mark it as failed
      if (testRunId) {
        await pool.execute(
          "UPDATE test_runs SET status = ?, logs = ? WHERE id = ?",
          [
            "failed",
            JSON.stringify([
              {
                level: "error",
                message: error.message,
                timestamp: new Date().toISOString(),
              },
            ]),
            testRunId,
          ]
        ).catch(() => {}); // Don't throw if this also fails
      }
    }
  }
}
