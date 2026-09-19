import type { ScanFinding } from "./types/scan";

const requiredHeaders = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy",
];

export function analyzeSecurityHeaders(
  url: string,
  headers: Record<string, string>,
) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  const missing = requiredHeaders.filter((header) => !normalized[header]);
  const findings: ScanFinding[] = [];

  if (missing.length > 0) {
    findings.push({
      title: "Missing security headers",
      description: `The page ${url} is missing the following security headers: ${missing.join(", ")}`,
      severity:
        missing.includes("content-security-policy") ||
        missing.includes("strict-transport-security")
          ? "HIGH"
          : "MEDIUM",
      category: "HEADER",
      evidence: { missing },
      remediation:
        "Add the missing security headers to your server configuration or reverse proxy.",
    });
  }

  if (
    normalized["set-cookie"] &&
    normalized["set-cookie"].includes("Secure") === false
  ) {
    findings.push({
      title: "Insecure cookie attribute detected",
      description: `A cookie on ${url} does not use the Secure attribute. Cookies should only be transmitted over HTTPS.`,
      severity: "HIGH",
      category: "COOKIE",
      remediation:
        "Configure cookies with Secure and HttpOnly flags when transmitting sensitive session data.",
    });
  }

  return findings;
}
