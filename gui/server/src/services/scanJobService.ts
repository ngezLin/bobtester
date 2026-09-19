import type { ScanJobPayload } from "../controllers/scan-engine/types/scan";
import supabase from "../db/index";

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

// In-memory fallback for when database is unavailable
const scanJobs = new Map<string, ScanJobRecord>();

export async function createScanJob(scanId: string, payload: ScanJobPayload): Promise<ScanJobRecord> {
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

  try {
    // Try to save to database
    const { error } = await supabase
      .from("scans")
      .insert({
        id: scanId,
        name: payload.name,
        target_url: payload.url,
        status: "RUNNING",
        metadata: {
          checks: payload.checks,
          allowedHosts: payload.allowedHosts,
        },
        queued_at: now,
        started_at: now,
        created_at: now,
        updated_at: now,
      });

    if (error) {
      console.warn("[ScanJobService] Database insert failed, using in-memory storage:", error.message);
      scanJobs.set(scanId, job);
    }
  } catch (error: any) {
    console.warn("[ScanJobService] Database unavailable, using in-memory storage:", error.message);
    scanJobs.set(scanId, job);
  }

  return job;
}

export async function getScanJob(scanId: string): Promise<ScanJobRecord | null> {
  try {
    // Try to get from database
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .single();

    if (scanError || !scan) {
      // Fallback to in-memory
      return scanJobs.get(scanId) ?? null;
    }

    // Get report
    const { data: report } = await supabase
      .from("reports")
      .select("*")
      .eq("scan_id", scanId)
      .single();

    // Get findings
    const { data: findings } = await supabase
      .from("findings")
      .select("*")
      .eq("scan_id", scanId);

    const statusMap: Record<string, ScanJobStatus> = {
      RUNNING: "Running",
      COMPLETED: "Completed",
      FAILED: "Failed",
      CANCELLED: "Canceled",
    };

    return {
      scanId: scan.id.toString(),
      payload: {
        scanId: scan.id.toString(),
        name: scan.name || "",
        url: scan.target_url || "",
        allowedHosts: scan.metadata?.allowedHosts || [],
        checks: scan.metadata?.checks || [],
      },
      status: statusMap[scan.status] || "Running",
      report: report ? {
        summary: report.summary,
        aiSummary: report.ai_summary,
        recommendations: report.recommendations,
        counts: report.counts,
      } : null,
      findings: findings?.map((f: any) => ({
        title: f.title,
        description: f.description,
        severity: f.severity,
        category: f.category,
        remediation: f.remediation,
        evidence: f.evidence,
      })) || [],
      error: scan.metadata?.error,
      createdAt: scan.created_at,
      updatedAt: scan.updated_at,
    };
  } catch (error: any) {
    console.warn("[ScanJobService] Database read failed, using in-memory storage:", error.message);
    return scanJobs.get(scanId) ?? null;
  }
}

export async function updateScanJob(
  scanId: string,
  update: Partial<Pick<ScanJobRecord, "status" | "report" | "findings" | "error">>
): Promise<ScanJobRecord | null> {
  try {
    const statusMap: Record<ScanJobStatus, string> = {
      Running: "RUNNING",
      Completed: "COMPLETED",
      Failed: "FAILED",
      Canceled: "CANCELLED",
    };

    const now = new Date().toISOString();
    const dbStatus = update.status ? statusMap[update.status] : undefined;

    // Update scan record
    const scanUpdate: any = {
      updated_at: now,
    };

    if (dbStatus) {
      scanUpdate.status = dbStatus;
      if (dbStatus === "COMPLETED") {
        scanUpdate.completed_at = now;
        scanUpdate.progress = 100;
      } else if (dbStatus === "FAILED" || dbStatus === "CANCELLED") {
        scanUpdate.completed_at = now;
      }
    }

    if (update.error) {
      // Get existing metadata first
      const { data: existingScan } = await supabase
        .from("scans")
        .select("metadata")
        .eq("id", scanId)
        .single();
      
      scanUpdate.metadata = {
        ...(existingScan?.metadata || {}),
        error: update.error,
      };
    }

    const { error: scanError } = await supabase
      .from("scans")
      .update(scanUpdate)
      .eq("id", scanId);

    if (scanError) {
      console.warn("[ScanJobService] Scan update failed:", scanError.message);
      // Fallback to in-memory
      const existing = scanJobs.get(scanId);
      if (!existing) return null;
      const updated = { ...existing, ...update, updatedAt: now };
      scanJobs.set(scanId, updated);
      return updated;
    }

    // Save report if provided
    if (update.report) {
      const { error: reportError } = await supabase
        .from("reports")
        .upsert({
          scan_id: scanId,
          summary: (update.report as any).summary || "",
          ai_summary: (update.report as any).aiSummary,
          recommendations: (update.report as any).recommendations || [],
          counts: (update.report as any).counts || { total: 0, high: 0 },
          created_at: now,
        });

      if (reportError) {
        console.warn("[ScanJobService] Report save failed:", reportError.message);
      }
    }

    // Save findings if provided
    if (update.findings && Array.isArray(update.findings)) {
      // Delete existing findings first
      await supabase.from("findings").delete().eq("scan_id", scanId);

      // Insert new findings
      if (update.findings.length > 0) {
        const findingsToInsert = update.findings.map((f: any) => ({
          scan_id: scanId,
          title: f.title,
          description: f.description,
          severity: f.severity?.toUpperCase() || "MEDIUM",
          category: mapCategoryToEnum(f.category),
          remediation: f.remediation,
          evidence: f.evidence,
          confidence: "MEDIUM",
          created_at: now,
        }));

        const { error: findingsError } = await supabase
          .from("findings")
          .insert(findingsToInsert);

        if (findingsError) {
          console.warn("[ScanJobService] Findings save failed:", findingsError.message);
        }
      }
    }

    return await getScanJob(scanId);
  } catch (error: any) {
    console.warn("[ScanJobService] Database update failed, using in-memory storage:", error.message);
    const existing = scanJobs.get(scanId);
    if (!existing) return null;
    const updated = { ...existing, ...update, updatedAt: new Date().toISOString() };
    scanJobs.set(scanId, updated);
    return updated;
  }
}

export async function cancelScanJob(scanId: string, reason?: string): Promise<ScanJobRecord | null> {
  return await updateScanJob(scanId, {
    status: "Canceled",
    error: reason ?? "Scan was terminated by the user.",
  });
}

function mapCategoryToEnum(category: string): string {
  const categoryMap: Record<string, string> = {
    "A01:2025": "AUTH",
    "A02:2025": "CONFIG",
    "A03:2025": "INJECTION",
    "A04:2025": "CONFIG",
    "A05:2025": "CONFIG",
    "A06:2025": "CONFIG",
    "A07:2025": "AUTH",
    "A08:2025": "OTHER",
    "A09:2025": "OTHER",
    "A10:2025": "OTHER",
  };

  return categoryMap[category] || "OTHER";
}
