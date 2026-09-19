export interface Vulnerability {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string;
  step_index?: number;
}

export class SecurityChecker {
  private vulnerabilities: Vulnerability[] = [];

  // SQL Error patterns for various databases
  private static SQL_ERROR_PATTERNS = [
    /SQL syntax.*error/i,
    /mysql_fetch_array/i,
    /PDOException/i,
    /PostgreSQL.*ERROR/i,
    /Warning.*sqlite_/i,
    /invalid input syntax for type/i,
    /Unclosed quotation mark after the character string/i,
    /quoted string not properly terminated/i,
  ];

  addVulnerability(v: Vulnerability) {
    this.vulnerabilities.push(v);
  }

  scanResponse(url: string, status: number, headers: Record<string, string>, body: string, stepIndex?: number) {
    // 1. Scan for SQL Errors in body
    for (const pattern of SecurityChecker.SQL_ERROR_PATTERNS) {
      if (pattern.test(body)) {
        this.addVulnerability({
          type: "SQL Injection (Error-Based)",
          severity: "HIGH",
          evidence: `Found SQL error pattern in response from ${url}: "${pattern.source}"`,
          step_index: stepIndex,
        });
        break;
      }
    }
  }

  analyzePayloadImpact(action: string, value: string, duration: number, success: boolean, stepIndex: number) {
    // Improved regex to catch variations like admin'--, admin' --, ' OR 1=1, etc.
    const isMalicious = /'\s?--|'\s?OR\s?|SLEEP\(|BENCHMARK\(|<script|alert\(/i.test(value);
    
    if (isMalicious && success) {
      // 1. Time-Based Detection (Blind SQLi)
      if (duration > 4000 && (value.toUpperCase().includes("SLEEP") || value.toUpperCase().includes("BENCHMARK"))) {
        this.addVulnerability({
          type: "SQL Injection (Time-Based)",
          severity: "CRITICAL",
          evidence: `Response delayed by ${duration}ms after sending time-based payload: "${value}"`,
          step_index: stepIndex,
        });
      } 
      // 2. Logic Bypass Detection
      else if (action === "fill" && /'\s?--|'\s?OR\s?/i.test(value)) {
         this.addVulnerability({
          type: "Potential Authentication Bypass",
          severity: "HIGH",
          evidence: `The flow succeeded despite using a SQL injection payload: "${value}". This suggests the input was not properly sanitized or the query was manipulated.`,
          step_index: stepIndex,
        });
      }
    }
  }

  getVulnerabilities(): Vulnerability[] {
    return this.vulnerabilities;
  }

  determineStatus(testPassed: boolean): "passed" | "failed" | "vulnerable" | "warning" | "safe" {
    if (!testPassed) return "failed";
    
    const hasHigh = this.vulnerabilities.some(v => v.severity === "HIGH" || v.severity === "CRITICAL");
    if (hasHigh) return "vulnerable";

    const hasAny = this.vulnerabilities.length > 0;
    if (hasAny) return "warning";

    return "safe";
  }
}
