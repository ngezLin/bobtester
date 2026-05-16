import axios from "axios";
import type { ScanFinding } from "./types/scan";

const payloads = ["' OR '1'='1'", '" OR "1"="1"', "or 1=1", "-- ", "/*"];
const errorSignatures = [
  "sql syntax",
  "mysql",
  "syntax error",
  "unclosed quotation mark",
  "sqlstate",
  "database error",
];

export async function detectBasicSqlInjection(url: string) {
  try {
    const parsed = new URL(url);
    payloads.forEach((payload, index) =>
      parsed.searchParams.set(`sqli-${index}`, payload),
    );
    const response = await axios.get(parsed.toString(), {
      timeout: 8000,
      validateStatus: () => true,
    });
    const body = response.data?.toString?.().toLowerCase() ?? "";

    const evidence = errorSignatures.filter((signature) =>
      body.includes(signature),
    );
    if (evidence.length > 0) {
      return {
        title: "Potential SQL injection error leakage",
        description: `The target ${url} returned SQL error details after injection-like input was submitted.`,
        severity: "HIGH",
        category: "SQLI",
        evidence: { payloads, signatures: evidence.slice(0, 5) },
        remediation:
          "Validate and parameterize database queries to avoid injection vulnerabilities.",
      } as ScanFinding;
    }
  } catch {
    return null;
  }

  return null;
}
