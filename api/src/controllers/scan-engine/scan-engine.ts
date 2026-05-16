import { crawlTarget } from "./crawler";
import { analyzeSecurityHeaders } from "./security-header-checker";
import { detectReflectedXss } from "./xss-checker";
import { detectBasicSqlInjection } from "./sqli-checker";
import { analyzeCryptographicFailures, testTlsConfiguration } from "./crypto-checker";
import type { ScanJobPayload, ScanFinding } from "./types/scan";

function deduplicateFindings(findings: ScanFinding[]): ScanFinding[] {
  const findingMap = new Map<string, ScanFinding>();

  for (const finding of findings) {
    const key = `${finding.category}:${finding.title}`;

    if (findingMap.has(key)) {
      const existing = findingMap.get(key)!;

      if (existing.evidence && finding.evidence) {
        if (Array.isArray(existing.evidence.urls)) {
          existing.evidence.urls = [
            ...new Set([
              ...(existing.evidence.urls as string[]),
              ...(finding.evidence.url ? [finding.evidence.url as string] : []),
            ]),
          ];
        } else if (finding.evidence.url) {
          existing.evidence.urls = [
            existing.evidence.url as string,
            finding.evidence.url as string,
          ];
        }

        if (Array.isArray(existing.evidence.missing) && Array.isArray(finding.evidence.missing)) {
          existing.evidence.missing = [
            ...new Set([
              ...(existing.evidence.missing as string[]),
              ...(finding.evidence.missing as string[]),
            ]),
          ];
        }

        if (Array.isArray(existing.evidence.cookies) && Array.isArray(finding.evidence.cookies)) {
          existing.evidence.cookies = [
            ...new Set([
              ...(existing.evidence.cookies as string[]),
              ...(finding.evidence.cookies as string[]),
            ]),
          ];
        }
      }

      if (!existing.description.includes("multiple pages")) {
        existing.description = existing.description.replace(
          /The page .+ (is|has|does|sets|appears|returned)/,
          "Multiple pages $1",
        );
      }
    } else {
      findingMap.set(key, { ...finding });
    }
  }

  return Array.from(findingMap.values());
}

export async function processScanJob(payload: ScanJobPayload) {
  const findings: ScanFinding[] = [];
  const runAll = payload.checks.length === 0;
  const checkHeaders = runAll || payload.checks.includes("headers");
  const checkXss = runAll || payload.checks.includes("xss");
  const checkCrypto = runAll || payload.checks.includes("crypto");

  const pages = await crawlTarget(payload.url, payload.allowedHosts);

  for (const [index, page] of pages.entries()) {
    if (checkHeaders) {
      findings.push(...analyzeSecurityHeaders(page.url, page.responseHeaders));
    }

    if (checkXss) {
      const xssFinding = await detectReflectedXss(page.url);
      if (xssFinding) findings.push(xssFinding);

      const sqliFinding = await detectBasicSqlInjection(page.url);
      if (sqliFinding) findings.push(sqliFinding);
    }

    if (checkCrypto) {
      findings.push(...analyzeCryptographicFailures(page.url, page.responseHeaders));
    }

    if (checkCrypto && index === 0) {
      const tlsFinding = await testTlsConfiguration(page.url);
      if (tlsFinding) findings.push(tlsFinding);
    }
  }

  const uniqueFindings = deduplicateFindings(findings);

  const report = {
    summary: `Scan completed with ${uniqueFindings.length} unique findings across ${pages.length} pages.`,
    aiSummary: null,
    recommendations: uniqueFindings.map(
      (finding) => finding.remediation || "Review the finding details.",
    ),
    counts: {
      total: uniqueFindings.length,
      high: uniqueFindings.filter(
        (item) => item.severity === "HIGH" || item.severity === "CRITICAL",
      ).length,
    },
  };

  return {
    report,
    findings: uniqueFindings,
  };
}
