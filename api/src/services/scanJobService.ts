import type { ScanJobPayload } from "../controllers/scan-engine/types/scan";

export type ScanJobStatus = "Running" | "Completed" | "Failed" | "Canceled";

export interface ScanJobRecord {
  scanId: string;
  payload: ScanJobPayload;
  status: ScanJobStatus;
  report: unknown | null;
  findings: unknown[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const scanJobs = new Map<string, ScanJobRecord>();

export function createScanJob(scanId: string, payload: ScanJobPayload): ScanJobRecord {
  const now = new Date().toISOString();
  const job: ScanJobRecord = {
    scanId,
    payload,
    status: "Running",
    report: null,
    findings: [],
    createdAt: now,
    updatedAt: now,
  };

  scanJobs.set(scanId, job);
  return job;
}

export function getScanJob(scanId: string): ScanJobRecord | null {
  return scanJobs.get(scanId) ?? null;
}

export function updateScanJob(scanId: string, update: Partial<Pick<ScanJobRecord, "status" | "report" | "findings" | "error">>) {
  const existing = scanJobs.get(scanId);
  if (!existing) return null;

  const updated: ScanJobRecord = {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  };

  scanJobs.set(scanId, updated);
  return updated;
}

export function cancelScanJob(scanId: string, reason?: string) {
  return updateScanJob(scanId, {
    status: "Canceled",
    error: reason ?? "Scan was terminated by the user.",
  });
}
