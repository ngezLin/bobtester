import { Request, Response } from "express";
import { TestService } from "../services/testService";

export class TestController {
  static async runLoginTest(req: Request, res: Response) {
    const { url, email, password } = req.body;

    if (!url || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: url, email, password",
      });
    }

    try {
      const result = await TestService.executeLoginTest(url, email, password);
      res.json(result);
    } catch (error: any) {
      console.error("Controller Error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error during test execution",
        error: error.message,
      });
    }
  }

  static async recordTest(req: Request, res: Response) {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: url",
      });
    }

    try {
      const { exec } = require("child_process");
      console.log(`Starting recorder for: ${url}`);
      
      const process = exec(`npx playwright codegen ${url}`);

      process.on('error', (err: any) => {
        console.error("Failed to start playwright process:", err);
      });

      process.stderr.on('data', (data: any) => {
        console.error(`Playwright error: ${data}`);
      });

      res.json({
        success: true,
        message: "Recorder started on server. Check your desktop.",
      });
    } catch (error: any) {
      console.error("Record Test Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to start recorder",
        error: error.message,
      });
    }
  }

  static async getTestRuns(req: Request, res: Response) {
    // Optional: implementation for dashboard
    res.json({ message: "Not implemented yet" });
  }
}
