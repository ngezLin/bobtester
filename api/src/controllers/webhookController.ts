import { Request, Response } from "express";
import supabase from "../db";
import { ProjectController } from "./projectController";

export class WebhookController {
  /**
   * CI/CD Webhook: Trigger a project suite run
   * POST /api/webhooks/projects/:id
   * Header: x-api-key (optional for now, or use user_id in body for simple demo)
   */
  static async triggerProjectRun(req: Request, res: Response) {
    const { id } = req.params;
    const { apiKey } = req.body; // In a real app, this would be a real API Key

    try {
      // For the hackathon, we'll allow triggering if the user provides the owner's ID or a secret
      // Let's find the owner of the project first
      const { data: projects, error: projectError } = await supabase
        .from("projects")
        .select("user_id")
        .eq("id", id);

      if (projectError || !projects || projects.length === 0) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      const ownerId = projects[0].user_id;

      // Mocking the auth middleware context for ProjectController.runSuite
      const mockReq: any = {
        params: { id },
        user: { id: ownerId },
        body: {}
      };

      // Call the existing runSuite logic
      await ProjectController.runSuite(mockReq, res);

    } catch (error: any) {
      console.error("Webhook trigger error:", error);
      res.status(500).json({ success: false, message: "Webhook execution failed" });
    }
  }
}
