import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import supabase from "../db";
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
      const { data: result, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        projectId: (result as any).id,
      });
    } catch (error: any) {
      console.error("Create project error:", error);
      res.status(500).json({ success: false, message: "Server error during project creation" });
    }
  }

  static async getProjects(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    try {
      const { data: rows, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId);

      if (projectError) throw projectError;

      if (projects.length === 0) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      // Fetch cases for this project
      const { data: cases, error: casesError } = await supabase
        .from("test_cases")
        .select("id, name, target_url, created_at, folder")
        .eq("project_id", id)
        .order("created_at", { ascending: true });

      if (casesError) throw casesError;

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

  static async updateProject(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Project name is required" });
    }

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name,
          description: description || null
        })
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
      }

      res.json({
        success: true,
        message: "Project updated successfully",
      });
    } catch (error: any) {
      console.error("Update project error:", error);
      res.status(500).json({ success: false, message: "Server error during project update" });
    }
  }

  static async deleteProject(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        return res.status(404).json({ success: false, message: "Project not found or unauthorized" });
      }

      res.json({
        success: true,
        message: "Project and all associated test cases deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete project error:", error);
      res.status(500).json({ success: false, message: "Server error during project deletion" });
    }
  }

  static async runSuite(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    try {
      // 1. Verify project exists
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId);

      if (projectError || !projects || projects.length === 0) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      // 2. Fetch all test cases for this project
      const { data: cases, error: casesError } = await supabase
        .from("test_cases")
        .select("*")
        .eq("project_id", id);

      if (casesError || !cases || cases.length === 0) {
        return res.status(400).json({ success: false, message: "No test cases found in this project" });
      }

      // 3. Gather all execution instances (case + asset combinations)
      const executions: any[] = [];
      
      for (const testCase of cases) {
        // Fetch assets for this case
        const { data: assets, error: assetsError } = await supabase
          .from("test_assets")
          .select("*")
          .eq("case_id", testCase.id);

        if (assetsError) continue;

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
        const { data: runResult, error: runError } = await supabase
          .from("test_runs")
          .insert({
            user_id: userId,
            case_id: testCase.id,
            asset_id: asset.id,
            status: "running"
          })
          .select()
          .single();
        
        if (runError) throw runError;
        const testRunId = (runResult as any).id;

        // Return a function to execute the actual run
        return async () => {
          const startTime = Date.now();
          const { success, screenshot, logs, vulnerabilities } = await PlaywrightService.executeDynamicTest(
            testRunId,
            testCase.steps,
            asset.data,
            testCase.id
          );
          const executionTime = Date.now() - startTime;

          const security = new SecurityChecker();
          vulnerabilities.forEach((v: any) => security.addVulnerability(v));
          const finalStatus = security.determineStatus(success);

          await supabase
            .from("test_runs")
            .update({
              status: finalStatus,
              execution_time: executionTime,
              screenshot_path: screenshot || null,
              logs: logs,
              vulnerabilities: vulnerabilities
            })
            .eq("id", testRunId);
          
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
