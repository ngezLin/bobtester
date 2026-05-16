import { Request, Response } from "express";
import { processScanJob } from "./scan-engine/scan-engine";

export class ScanController {
  static async startScan(req: Request, res: Response) {
    const { name, url, checks } = req.body;

    if (!name || !url || !checks || !Array.isArray(checks) || checks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Scan name, target URL, and at least one scan option are required",
      });
    }

    try {
      const parsedUrl = new URL(url);
      const payload = {
        scanId: undefined,
        name,
        url: parsedUrl.toString(),
        allowedHosts: [parsedUrl.origin],
        checks,
      };

      const result = await processScanJob(payload);

      return res.json({
        success: true,
        report: result.report,
        findings: result.findings,
      });
    } catch (error: any) {
      console.error("Scan start error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to execute scan",
        details: error.message || error,
      });
    }
  }
}
