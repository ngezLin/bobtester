import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import pool from "../db";
import { PlaywrightService } from "../services/playwrightService";
import { SecurityChecker } from "../services/securityChecker";

export class ProjectController {
  static async createProject(req: AuthRequest, res: Response) {
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    try {
      const [result]: any = await pool.execute(
        "INSERT INTO projects (user_id, name, description) VALUES (?, ?, ?)",
        [userId as number, name, description || null]
      );

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        projectId: result.insertId,
      });
    } catch (error: any) {
      console.error("Create project error:", error);
      res.status(500).json({ success: false, message: "Server error during project creation" });
    }
  }

  static async getProjects(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      const [rows]: any = await pool.execute(
        "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC",
        [userId as number]
      );

      res.json({
        success: true,
        projects: rows,
      });
    } catch (error: any) {
      console.error("Get projects error:", error);
      res.status(500).json({ success: false, message: "Server error fetching projects" });
    }
  }

  static async getProjectById(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const [projects]: any = await pool.execute(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [id, userId as number]
      );

      if (projects.length === 0) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      // Fetch cases for this project
      const [cases]: any = await pool.execute(
        "SELECT id, name, target_url, created_at FROM test_cases WHERE project_id = ? ORDER BY created_at ASC",
        [id]
      );

      res.json({
        success: true,
        project: projects[0],
        cases,
      });
    } catch (error: any) {
      console.error("Get project detail error:", error);
      res.status(500).json({ success: false, message: "Server error fetching project details" });
    }
  }

  static async runSuite(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      // 1. Verify project exists
      const [projects]: any = await pool.execute(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [id, userId as number]
      );

      if (projects.length === 0) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      // 2. Fetch all test cases for this project
      const [cases]: any = await pool.execute(
        "SELECT * FROM test_cases WHERE project_id = ?",
        [id]
      );

      if (cases.length === 0) {
        return res.status(400).json({ success: false, message: "No test cases found in this project" });
      }

      // 3. Gather all execution instances (case + asset combinations)
      const executions: any[] = [];
      
      for (const testCase of cases) {
        // Fetch assets for this case
        const [assets]: any = await pool.execute(
          "SELECT * FROM test_assets WHERE case_id = ?",
          [testCase.id]
        );

        if (assets.length === 0) {
          // No assets, run with empty object
          executions.push({ testCase, asset: { id: null, data: {} } });
        } else {
          // Run once for each asset
          for (const asset of assets) {
            executions.push({ testCase, asset });
          }
        }
      }

      if (executions.length === 0) {
        return res.status(400).json({ success: false, message: "No executions could be prepared." });
      }

      // 4. Create run records and prepare functions
      const runPromises = executions.map(async (exec) => {
        const { testCase, asset } = exec;
        
        // Create a running record
        const [runResult]: any = await pool.execute(
          "INSERT INTO test_runs (user_id, case_id, asset_id, status) VALUES (?, ?, ?, ?)",
          [userId as number, testCase.id, asset.id, "running"]
        );
        const testRunId = runResult.insertId;

        // Return a function to execute the actual run
        return async () => {
          const startTime = Date.now();
          const { success, screenshot, logs, vulnerabilities } = await PlaywrightService.executeDynamicTest(
            testRunId,
            testCase.steps,
            asset.data
          );
          const executionTime = Date.now() - startTime;

          const security = new SecurityChecker();
          vulnerabilities.forEach((v: any) => security.addVulnerability(v));
          const finalStatus = security.determineStatus(success);

          await pool.execute(
            "UPDATE test_runs SET status = ?, execution_time = ?, screenshot_path = ?, logs = ?, vulnerabilities = ? WHERE id = ?",
            [
              finalStatus,
              executionTime,
              screenshot || null,
              JSON.stringify(logs),
              JSON.stringify(vulnerabilities),
              testRunId
            ]
          );
          
          return { testCaseId: testCase.id, assetId: asset.id, status: finalStatus };
        };
      });

      // Execute all inserts
      const executableRuns = await Promise.all(runPromises);

      // 5. Respond immediately so UI doesn't block
      res.json({
        success: true,
        message: `Batch run started for ${executions.length} executions (${cases.length} cases).`,
        casesRun: executions.length
      });

      // 6. Run them in the background (Concurrent execution for Hackathon flex)
      console.log(`🚀 [Batch Runner] Starting ${executions.length} executions concurrently...`);
      Promise.allSettled(executableRuns.map(runFn => runFn())).then(results => {
        console.log(`✅ [Batch Runner] Suite completed for Project ${id}`);
      });

    } catch (error: any) {
      console.error("Batch run error:", error);
      res.status(500).json({ success: false, message: "Server error starting batch run" });
    }
  }
}
