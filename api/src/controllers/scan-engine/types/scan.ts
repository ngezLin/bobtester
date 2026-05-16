export interface ScanFinding {
  title: string;
  description: string;
  severity: string;
  category: string;
  evidence?: Record<string, unknown>;
  remediation?: string;
  confidence?: string;
}

export interface ScanJobPayload {
  scanId?: string;
  name?: string;
  url: string;
  allowedHosts: string[];
  checks: string[];
}
