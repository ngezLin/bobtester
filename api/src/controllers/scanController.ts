import { Request, Response } from "express";
import crypto from "crypto";
import { processScanJob } from "./scan-engine/scan-engine";
import { createScanJob, getScanJob, updateScanJob, cancelScanJob } from "../services/scanJobService";

export class ScanController {
  static async startScan(req: Request, res: Response) {
    const { name, url, checks, scanId: requestScanId } = req.body;

    if (!name || !url || !checks || !Array.isArray(checks) || checks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Scan name, target URL, and at least one scan option are required",
      });
    }

    try {
      const parsedUrl = new URL(url);
      const scanId = typeof requestScanId === "string" && requestScanId.trim().length > 0
        ? requestScanId
        : crypto.randomUUID?.() ?? `scan-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const payload = {
        scanId,
        name,
        url: parsedUrl.toString(),
        allowedHosts: [parsedUrl.origin],
        checks,
      };

      createScanJob(scanId, payload);

      const timeoutMs = 10 * 60 * 1000; // 10 minutes
      const timeoutHandle = setTimeout(() => {
        const job = getScanJob(scanId);
        if (job && job.status === "Running") {
          updateScanJob(scanId, {
            status: "Failed",
            error: "Scan timed out after 10 minutes.",
          });
        }
      }, timeoutMs);

      processScanJob(payload)
        .then((result) => {
          clearTimeout(timeoutHandle);
          const job = getScanJob(scanId);
          if (!job || job.status !== "Running") return;

          updateScanJob(scanId, {
            status: "Completed",
            report: result.report,
            findings: result.findings,
          });
        })
        .catch((error: any) => {
          clearTimeout(timeoutHandle);
          const job = getScanJob(scanId);
          if (!job || job.status !== "Running") return;

          console.error(`Scan job ${scanId} failed:`, error);
          updateScanJob(scanId, {
            status: "Failed",
            error: error?.message ?? "Scan failed",
          });
        });

      return res.status(202).json({
        success: true,
        scanId,
        status: "Running",
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

  static async getScanById(req: Request, res: Response) {
    const scanId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = getScanJob(scanId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Scan not found",
      });
    }

    return res.json({
      success: true,
      scanId: job.scanId,
      status: job.status,
      report: job.report,
      findings: job.findings,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  }

  static async terminateScan(req: Request, res: Response) {
    const scanId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = getScanJob(scanId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Scan not found",
      });
    }

    if (job.status !== "Running") {
      return res.status(400).json({
        success: false,
        message: "Only running scans can be terminated.",
        status: job.status,
      });
    }

    const canceledJob = cancelScanJob(scanId, "Scan was terminated by the user.");

    return res.json({
      success: true,
      scanId: canceledJob?.scanId,
      status: canceledJob?.status,
      error: canceledJob?.error,
      updatedAt: canceledJob?.updatedAt,
    });
  }
}
