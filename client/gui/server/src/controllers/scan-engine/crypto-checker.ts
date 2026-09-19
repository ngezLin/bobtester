import axios from "axios";
import type { ScanFinding } from "./types/scan";

/**
 * Cryptographic Failure Checker
 * Detects OWASP A02:2025 - Cryptographic Failures
 * 
 * Checks for:
 * - HTTP usage instead of HTTPS
 * - Weak TLS configurations
 * - Missing Secure cookie attributes
 * - Missing SameSite cookie attributes
 * - Sensitive data in URLs (potential exposure)
 * - Cache-Control headers for sensitive pages
 */

const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /api[_-]?key/i,
  /secret/i,
  /credit[_-]?card/i,
  /ssn/i,
  /social[_-]?security/i,
];

const WEAK_TLS_INDICATORS = [
  "TLSv1.0",
  "TLSv1.1",
  "SSLv2",
  "SSLv3",
];

/**
 * Check if URL contains potentially sensitive data
 */
function hasSensitiveDataInUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(urlLower));
}

/**
 * Analyze cryptographic failures for a given page
 */
export function analyzeCryptographicFailures(
  url: string,
  headers: Record<string, string>,
): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  // Check 1: HTTP instead of HTTPS
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol === "http:") {
    findings.push({
      title: "Unencrypted HTTP connection detected",
      description: `The page ${url} is served over HTTP instead of HTTPS. All data transmitted is sent in clear text and can be intercepted by attackers.`,
      severity: "CRITICAL",
      category: "TLS",
      evidence: { protocol: "http", url },
      remediation:
        "Implement HTTPS across the entire application. Obtain a valid SSL/TLS certificate and configure your web server to redirect all HTTP traffic to HTTPS. Enable HSTS (HTTP Strict Transport Security) to prevent protocol downgrade attacks.",
    });
  }

  // Check 2: Insecure cookies (missing Secure attribute)
  const setCookieHeader = normalized["set-cookie"];
  if (setCookieHeader) {
    const cookies = Array.isArray(setCookieHeader) 
      ? setCookieHeader 
      : [setCookieHeader];
    
    const insecureCookies: string[] = [];
    const missingSameSite: string[] = [];

    cookies.forEach((cookie) => {
      const cookieLower = cookie.toLowerCase();
      
      // Check for missing Secure attribute
      if (!cookieLower.includes("secure")) {
        const cookieName = cookie.split("=")[0];
        insecureCookies.push(cookieName);
      }
      
      // Check for missing SameSite attribute
      if (!cookieLower.includes("samesite")) {
        const cookieName = cookie.split("=")[0];
        missingSameSite.push(cookieName);
      }
    });

    if (insecureCookies.length > 0) {
      findings.push({
        title: "Cookies without Secure attribute",
        description: `The page ${url} sets cookies without the Secure attribute: ${insecureCookies.join(", ")}. These cookies can be transmitted over unencrypted connections, exposing session data to interception.`,
        severity: "HIGH",
        category: "COOKIE",
        evidence: { cookies: insecureCookies, url },
        remediation:
          "Set the Secure attribute on all cookies to ensure they are only transmitted over HTTPS. For session cookies, also add the HttpOnly attribute to prevent JavaScript access.",
      });
    }

    if (missingSameSite.length > 0) {
      findings.push({
        title: "Cookies without SameSite attribute",
        description: `The page ${url} sets cookies without the SameSite attribute: ${missingSameSite.join(", ")}. This makes the application vulnerable to CSRF attacks.`,
        severity: "MEDIUM",
        category: "COOKIE",
        evidence: { cookies: missingSameSite, url },
        remediation:
          "Set the SameSite attribute on all cookies. Use 'SameSite=Strict' for maximum protection or 'SameSite=Lax' if you need to allow some cross-site requests.",
      });
    }
  }

  // Check 3: Sensitive data in URL parameters
  if (hasSensitiveDataInUrl(url)) {
    findings.push({
      title: "Potential sensitive data in URL",
      description: `The URL ${url} appears to contain sensitive parameter names. Sensitive data in URLs can be logged in browser history, server logs, and referrer headers, leading to data exposure.`,
      severity: "HIGH",
      category: "EXPOSURE",
      evidence: { url },
      remediation:
        "Never pass sensitive data in URL parameters. Use POST requests with encrypted body content for sensitive operations. Implement proper session management instead of passing tokens in URLs.",
    });
  }

  // Check 4: Missing Cache-Control for potentially sensitive pages
  const cacheControl = normalized["cache-control"];
  const urlPath = parsedUrl.pathname.toLowerCase();
  const isSensitivePath = 
    urlPath.includes("login") ||
    urlPath.includes("account") ||
    urlPath.includes("profile") ||
    urlPath.includes("admin") ||
    urlPath.includes("dashboard");

  if (isSensitivePath && (!cacheControl || !cacheControl.includes("no-store"))) {
    findings.push({
      title: "Missing cache control on sensitive page",
      description: `The page ${url} appears to be sensitive but does not have proper cache control headers. Sensitive data may be cached by browsers or proxies.`,
      severity: "MEDIUM",
      category: "HEADER",
      evidence: { url, cacheControl: cacheControl || "none" },
      remediation:
        "Set 'Cache-Control: no-store, no-cache, must-revalidate, private' header on all pages containing sensitive data to prevent caching.",
    });
  }

  // Check 5: Weak TLS version indicators in headers
  const serverHeader = normalized["server"];
  if (serverHeader) {
    const weakTls = WEAK_TLS_INDICATORS.filter(indicator =>
      serverHeader.includes(indicator)
    );
    
    if (weakTls.length > 0) {
      findings.push({
        title: "Weak TLS version detected",
        description: `The server at ${url} may be using weak TLS versions: ${weakTls.join(", ")}. These protocols have known vulnerabilities and should not be used.`,
        severity: "HIGH",
        category: "TLS",
        evidence: { weakVersions: weakTls, serverHeader },
        remediation:
          "Disable TLS 1.0, TLS 1.1, SSLv2, and SSLv3. Configure your server to only support TLS 1.2 and TLS 1.3 with strong cipher suites.",
      });
    }
  }

  return findings;
}

/**
 * Perform active TLS/SSL testing on a URL
 * This makes an actual request to check the connection security
 */
export async function testTlsConfiguration(url: string): Promise<ScanFinding | null> {
  try {
    const parsedUrl = new URL(url);
    
    // Only test HTTPS URLs
    if (parsedUrl.protocol !== "https:") {
      return null;
    }

    const response = await axios.get(url, {
      timeout: 8000,
      validateStatus: () => true,
      // This will fail on invalid certificates
      httpsAgent: new (require("https").Agent)({
        rejectUnauthorized: true,
      }),
    });

    // If we get here, the certificate is valid
    return null;
  } catch (error: any) {
    // Check for certificate errors
    if (
      error.code === "CERT_HAS_EXPIRED" ||
      error.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
      error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      error.code === "CERT_UNTRUSTED"
    ) {
      return {
        title: "Invalid or untrusted SSL/TLS certificate",
        description: `The server at ${url} has an invalid SSL/TLS certificate. Error: ${error.code}. This indicates a serious security issue that could allow man-in-the-middle attacks.`,
        severity: "CRITICAL",
        category: "TLS",
        evidence: { error: error.code, message: error.message },
        remediation:
          "Obtain a valid SSL/TLS certificate from a trusted Certificate Authority (CA). Ensure the certificate is not expired and matches the domain name. Consider using Let's Encrypt for free, automated certificates.",
      };
    }
  }

  return null;
}

// Made with Bob
