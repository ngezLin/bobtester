import axios from "axios";
import type { ScanFinding } from "./types/scan";

const payload = "<script>alert(1)</script>";
const xssParams = ["q", "search", "term", "query"];

export async function detectReflectedXss(url: string) {
  try {
    const parsed = new URL(url);
    const searchParams = new URLSearchParams(parsed.searchParams);
    xssParams.forEach((param) => searchParams.set(param, payload));
    parsed.search = searchParams.toString();

    const response = await axios.get(parsed.toString(), {
      timeout: 8000,
      validateStatus: () => true,
    });
    const body = response.data?.toString?.() ?? "";

    if (body.includes(payload)) {
      return {
        title: "Reflected XSS detected",
        description: `The page ${parsed.toString()} returned unescaped user input in the response body.`,
        severity: "HIGH",
        category: "XSS",
        evidence: { vector: parsed.toString(), payload },
        remediation:
          "Validate and escape all user-controlled input before rendering it in the browser.",
      } as ScanFinding;
    }
  } catch {
    return null;
  }

  return null;
}
