**User:**

<task>
when I try on youtube link it works but when I try on other links it doesnt return anything in the view details, even on dummy websites with obvious vulnerabilities it doesn't return anything when I try it on the prod but when I try it yesterday on localhost it works perfectly. but please dont change anything yet.
</task>
<environment_details>
# VSCode Visible Files
web\src\app\scan\page.tsx

# VSCode Open Tabs
web/src/app/scan/page.tsx,api/src/controllers/scanController.ts,api/db/schema.sql,api/src/services/scanJobService.ts,api/src/controllers/scan-engine/scan-engine.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-17T06:44:52.408Z
User time zone: Asia/Jakarta, UTC+7:00

# Current Cost
$0.00

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>


# Current Workspace Directory (d:/bobtester/bobtester) Files
.gitignore
package-lock.json
package.json
SCAN_FIX_DEPLOYMENT.md
api/
api/.env.example
api/.gitignore
api/package-lock.json
api/package.json
api/tsconfig.json
api/vercel.json
api/db/
api/db/migration-scan-text-id.sql
api/db/schema.sql
api/src/
api/src/config.ts
api/src/index.ts
api/src/controllers/
api/src/controllers/assetController.ts
api/src/controllers/authController.ts
api/src/controllers/caseController.ts
api/src/controllers/projectController.ts
api/src/controllers/runController.ts
api/src/controllers/scanController.ts
api/src/controllers/statsController.ts
api/src/controllers/webhookController.ts
api/src/controllers/scan-engine/
api/src/controllers/scan-engine/crawler.ts
api/src/controllers/scan-engine/crypto-checker.ts
api/src/controllers/scan-engine/scan-engine.ts
api/src/controllers/scan-engine/security-header-checker.ts
api/src/controllers/scan-engine/sqli-checker.ts
api/src/controllers/scan-engine/xss-checker.ts
api/src/controllers/scan-engine/types/
api/src/controllers/scan-engine/types/scan.ts
api/src/db/
api/src/db/index.ts
api/src/middleware/
api/src/middleware/authMiddleware.ts
api/src/routes/
api/src/routes/index.ts
api/src/services/
api/src/services/playwrightService.ts
api/src/services/scanJobService.ts
api/src/services/securityChecker.ts
api/storage/
api/storage/screenshots/
lib/
lib/auth-utils.ts
lib/config.ts
lib/jwt.ts
lib/logger.ts
lib/owasp-mapping.ts
lib/prisma.ts
lib/supabase.ts
lib/validation.ts
llm-context/
llm-context/context.md
llm-context/endpoint.md
llm-context/flow.md
llm-context/schemas.md
llm-context/todo.md
llm-context/vulnerability_mapping.md
web/
web/.gitignore
web/eslint.config.mjs
web/next-env.d.ts
web/next.config.ts
web/package-lock.json
web/package.json
web/postcss.config.mjs
web/README.md
web/tsconfig.json
web/tsconfig.tsbuildinfo
web/public/
web/public/file.svg
web/public/globe.svg
web/public/next.svg
web/public/vercel.svg
web/public/window.svg
web/src/
web/src/api/
web/src/api/api.ts
web/src/api/assets.ts
web/src/api/auth.ts
web/src/api/cases.ts
web/src/api/projects.ts
web/src/api/runs.ts
web/src/api/scans.ts
web/src/app/
web/src/app/favicon.ico
web/src/app/globals.css
web/src/app/layout.tsx
web/src/app/page.tsx
web/src/app/(auth)/
web/src/app/(auth)/login/
web/src/app/(auth)/login/page.tsx
web/src/app/(auth)/register/
web/src/app/(auth)/register/page.tsx
web/src/app/cases/
web/src/app/cases/page.tsx
web/src/app/cases/[id]/
web/src/app/cases/[id]/config/
web/src/app/cases/[id]/config/page.tsx
web/src/app/dashboard/
web/src/app/dashboard/page.tsx
web/src/app/projects/
web/src/app/projects/page.tsx
web/src/app/projects/[id]/
web/src/app/projects/[id]/page.tsx
web/src/app/record/
web/src/app/record/page.tsx
web/src/app/runs/
web/src/app/runs/page.tsx
web/src/app/scan/
web/src/app/scan/page.tsx
web/src/app/scan/[id]/
web/src/app/scan/[id]/page.tsx
web/src/app/scan/create/
web/src/app/scan/create/page.tsx
web/src/components/
web/src/components/cases/
web/src/components/cases/AssetManager.tsx
web/src/components/cases/StepList.tsx
web/src/components/common/
web/src/components/common/README.md
web/src/components/common/Sidebar.tsx
web/src/components/ui/
web/src/components/ui/README.md
web/src/lib/
web/src/lib/owasp-mapping.ts
web/src/types/
web/src/types/README.md
web/src/utils/
web/src/utils/cn.ts
web/src/utils/README.md
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

# Summary of Conversation

## 1. Previous Conversation:
The user has been working on a security scanning application called "bobtester" that performs vulnerability scans on web applications. The application consists of a web frontend (Next.js) and an API backend (Express/TypeScript) that uses Playwright for browser automation and various security checkers to detect vulnerabilities like XSS, SQL injection, missing security headers, and cryptographic failures.

## 2. Current Work:
The user is reporting a critical issue with the scan functionality in production. Specifically:
- **Working scenario**: YouTube links work correctly and return scan results with vulnerability details
- **Broken scenario**: Other websites (including dummy websites with obvious vulnerabilities) do not return any details in the "view details" section when scanned in production
- **Important context**: The same functionality worked perfectly on localhost yesterday
- **User's request**: The user wants to investigate the issue but explicitly stated "please dont change anything yet" - they want to understand the problem first before making any modifications

## 3. Key Technical Concepts:
- **Scan Engine Architecture**: Uses a job-based system with status tracking (Running, Completed, Failed, Canceled)
- **Crawler**: Uses Playwright (chromium) for crawling with Axios fallback
- **Security Checkers**: Multiple modules for different vulnerability types:
  - Security headers checker
  - XSS (Cross-Site Scripting) checker
  - SQL injection checker
  - Cryptographic failures checker
  - TLS configuration checker
- **Database**: Supabase with in-memory fallback for scan jobs
- **Scan Flow**: 
  1. Create scan job in database
  2. Process scan asynchronously with 10-minute timeout
  3. Crawl target URL and collect pages
  4. Run security checks on each page
  5. Deduplicate findings
  6. Update scan job with results

## 4. Relevant Files and Code:

### api/src/controllers/scanController.ts
- **Purpose**: Main controller handling scan requests
- **Key functionality**: 
  - `startScan()`: Creates scan job, sets 10-minute timeout, processes scan asynchronously
  - `getScanById()`: Retrieves scan results
  - `terminateScan()`: Cancels running scans
- **Important code**:
```typescript
processScanJob(payload)
  .then(async (result) => {
    clearTimeout(timeoutHandle);
    const job = await getScanJob(scanId);
    if (!job || job.status !== "Running") return;

    await updateScanJob(scanId, {
      status: "Completed",
      report: result.report,
      findings: result.findings,
    });
  })
```

### api/src/controllers/scan-engine/scan-engine.ts
- **Purpose**: Core scan processing logic
- **Key functionality**:
  - `processScanJob()`: Orchestrates all security checks
  - `deduplicateFindings()`: Merges duplicate findings across pages
- **Important code**:
```typescript
const pages = await crawlTarget(payload.url, payload.allowedHosts);

for (const [index, page] of pages.entries()) {
  if (checkHeaders) {
    findings.push(...analyzeSecurityHeaders(page.url, page.responseHeaders));
  }
  // ... other checks
}
```

### api/src/controllers/scan-engine/crawler.ts
- **Purpose**: Web crawling with Playwright
- **Key functionality**:
  - Launches chromium browser
  - Crawls pages up to `scanPolicy.maxPages`
  - Falls back to Axios if Playwright fails
- **Important code**:
```typescript
browser = await chromium.launch({ headless: true });
// ...
if (pages.length === 0) {
  return await crawlWithAxios(url);
}
```

### api/src/services/scanJobService.ts
- **Purpose**: Database operations for scan jobs
- **Key functionality**:
  - `createScanJob()`: Inserts scan into Supabase with in-memory fallback
  - `getScanJob()`: Retrieves scan with report and findings
  - `updateScanJob()`: Updates scan status, saves report and findings to database
- **Important code**:
```typescript
// Save findings if provided
if (update.findings && Array.isArray(update.findings)) {
  await supabase.from("findings").delete().eq("scan_id", scanId);
  
  if (update.findings.length > 0) {
    const findingsToInsert = update.findings.map((f: any) => ({
      scan_id: scanId,
      title: f.title,
      description: f.description,
      severity: f.severity?.toUpperCase() || "MEDIUM",
      category: mapCategoryToEnum(f.category),
      // ...
    }));
  }
}
```

### api/src/controllers/scan-engine/security-header-checker.ts
- **Purpose**: Checks for missing security headers
- **Checks**: strict-transport-security, x-content-type-options, x-frame-options, referrer-policy, permissions-policy, content-security-policy

### api/src/controllers/scan-engine/xss-checker.ts
- **Purpose**: Detects reflected XSS vulnerabilities
- **Method**: Injects `<script>alert(1)</script>` payload into query parameters

## 5. Problem Solving:
**Current Issue**: Scans work for YouTube but not for other websites in production, despite working on localhost yesterday.

**Potential causes to investigate**:
1. **Playwright/Chromium availability**: Production environment may not have Chromium installed or may have issues launching the browser
2. **Crawler fallback**: If Playwright fails, Axios fallback might not be working properly for non-YouTube sites
3. **Network/firewall restrictions**: Production environment may block outbound requests to certain domains
4. **Timeout issues**: 10-minute timeout or page timeout (`scanPolicy.pageTimeoutMs`) may be too short in production
5. **Database connectivity**: Findings might not be saved properly to Supabase in production
6. **Empty pages array**: If crawler returns 0 pages, no checks run and no findings are generated
7. **Category mapping**: The `mapCategoryToEnum()` function might be causing issues when saving findings

## 6. Pending Tasks and Next Steps:

### Task 1: Investigate why scans don't return details for non-YouTube sites in production
**User's exact request**: "when I try on youtube link it works but when I try on other links it doesnt return anything in the view details, even on dummy websites with obvious vulnerabilities it doesn't return anything when I try it on the prod but when I try it yesterday on localhost it works perfectly. but please dont change anything yet."

**Next steps**:
1. Add comprehensive logging to identify where the scan process fails for non-YouTube sites
2. Check if the crawler is successfully fetching pages (log `pages.length` after `crawlTarget()`)
3. Verify if findings are being generated (log findings array before deduplication)
4. Confirm if findings are being saved to the database (check Supabase logs)
5. Investigate Playwright browser launch success/failure in production
6. Check if the Axios fallback is being triggered and working
7. Review production environment configuration (Chromium dependencies, network policies)
8. Compare YouTube scan behavior vs other sites to identify the difference

**Important**: User explicitly requested NOT to make any changes yet - only investigation and diagnosis is needed at this stage.

---

**Assistant:**

<read_file>
<args>
<file>
<path>api/src/controllers/scan-engine/crypto-checker.ts</path>
</file>
<file>
<path>api/src/controllers/scan-engine/sqli-checker.ts</path>
</file>
<file>
<path>api/src/config.ts</path>
</file>
</args>
</read_file>

---

**User:**

[read_file for 'api/src/controllers/scan-engine/crypto-checker.ts', 'api/src/controllers/scan-engine/sqli-checker.ts', 'api/src/config.ts'] Result:
<files>
<file><path>api/src/controllers/scan-engine/crypto-checker.ts</path>
<content lines="1-224">
  1 | import axios from "axios";
  2 | import type { ScanFinding } from "./types/scan";
  3 | 
  4 | /**
  5 |  * Cryptographic Failure Checker
  6 |  * Detects OWASP A02:2025 - Cryptographic Failures
  7 |  * 
  8 |  * Checks for:
  9 |  * - HTTP usage instead of HTTPS
 10 |  * - Weak TLS configurations
 11 |  * - Missing Secure cookie attributes
 12 |  * - Missing SameSite cookie attributes
 13 |  * - Sensitive data in URLs (potential exposure)
 14 |  * - Cache-Control headers for sensitive pages
 15 |  */
 16 | 
 17 | const SENSITIVE_PATTERNS = [
 18 |   /password/i,
 19 |   /token/i,
 20 |   /api[_-]?key/i,
 21 |   /secret/i,
 22 |   /credit[_-]?card/i,
 23 |   /ssn/i,
 24 |   /social[_-]?security/i,
 25 | ];
 26 | 
 27 | const WEAK_TLS_INDICATORS = [
 28 |   "TLSv1.0",
 29 |   "TLSv1.1",
 30 |   "SSLv2",
 31 |   "SSLv3",
 32 | ];
 33 | 
 34 | /**
 35 |  * Check if URL contains potentially sensitive data
 36 |  */
 37 | function hasSensitiveDataInUrl(url: string): boolean {
 38 |   const urlLower = url.toLowerCase();
 39 |   return SENSITIVE_PATTERNS.some(pattern => pattern.test(urlLower));
 40 | }
 41 | 
 42 | /**
 43 |  * Analyze cryptographic failures for a given page
 44 |  */
 45 | export function analyzeCryptographicFailures(
 46 |   url: string,
 47 |   headers: Record<string, string>,
 48 | ): ScanFinding[] {
 49 |   const findings: ScanFinding[] = [];
 50 |   const normalized = Object.fromEntries(
 51 |     Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
 52 |   );
 53 | 
 54 |   // Check 1: HTTP instead of HTTPS
 55 |   const parsedUrl = new URL(url);
 56 |   if (parsedUrl.protocol === "http:") {
 57 |     findings.push({
 58 |       title: "Unencrypted HTTP connection detected",
 59 |       description: `The page ${url} is served over HTTP instead of HTTPS. All data transmitted is sent in clear text and can be intercepted by attackers.`,
 60 |       severity: "CRITICAL",
 61 |       category: "TLS",
 62 |       evidence: { protocol: "http", url },
 63 |       remediation:
 64 |         "Implement HTTPS across the entire application. Obtain a valid SSL/TLS certificate and configure your web server to redirect all HTTP traffic to HTTPS. Enable HSTS (HTTP Strict Transport Security) to prevent protocol downgrade attacks.",
 65 |     });
 66 |   }
 67 | 
 68 |   // Check 2: Insecure cookies (missing Secure attribute)
 69 |   const setCookieHeader = normalized["set-cookie"];
 70 |   if (setCookieHeader) {
 71 |     const cookies = Array.isArray(setCookieHeader) 
 72 |       ? setCookieHeader 
 73 |       : [setCookieHeader];
 74 |     
 75 |     const insecureCookies: string[] = [];
 76 |     const missingSameSite: string[] = [];
 77 | 
 78 |     cookies.forEach((cookie) => {
 79 |       const cookieLower = cookie.toLowerCase();
 80 |       
 81 |       // Check for missing Secure attribute
 82 |       if (!cookieLower.includes("secure")) {
 83 |         const cookieName = cookie.split("=")[0];
 84 |         insecureCookies.push(cookieName);
 85 |       }
 86 |       
 87 |       // Check for missing SameSite attribute
 88 |       if (!cookieLower.includes("samesite")) {
 89 |         const cookieName = cookie.split("=")[0];
 90 |         missingSameSite.push(cookieName);
 91 |       }
 92 |     });
 93 | 
 94 |     if (insecureCookies.length > 0) {
 95 |       findings.push({
 96 |         title: "Cookies without Secure attribute",
 97 |         description: `The page ${url} sets cookies without the Secure attribute: ${insecureCookies.join(", ")}. These cookies can be transmitted over unencrypted connections, exposing session data to interception.`,
 98 |         severity: "HIGH",
 99 |         category: "COOKIE",
100 |         evidence: { cookies: insecureCookies, url },
101 |         remediation:
102 |           "Set the Secure attribute on all cookies to ensure they are only transmitted over HTTPS. For session cookies, also add the HttpOnly attribute to prevent JavaScript access.",
103 |       });
104 |     }
105 | 
106 |     if (missingSameSite.length > 0) {
107 |       findings.push({
108 |         title: "Cookies without SameSite attribute",
109 |         description: `The page ${url} sets cookies without the SameSite attribute: ${missingSameSite.join(", ")}. This makes the application vulnerable to CSRF attacks.`,
110 |         severity: "MEDIUM",
111 |         category: "COOKIE",
112 |         evidence: { cookies: missingSameSite, url },
113 |         remediation:
114 |           "Set the SameSite attribute on all cookies. Use 'SameSite=Strict' for maximum protection or 'SameSite=Lax' if you need to allow some cross-site requests.",
115 |       });
116 |     }
117 |   }
118 | 
119 |   // Check 3: Sensitive data in URL parameters
120 |   if (hasSensitiveDataInUrl(url)) {
121 |     findings.push({
122 |       title: "Potential sensitive data in URL",
123 |       description: `The URL ${url} appears to contain sensitive parameter names. Sensitive data in URLs can be logged in browser history, server logs, and referrer headers, leading to data exposure.`,
124 |       severity: "HIGH",
125 |       category: "EXPOSURE",
126 |       evidence: { url },
127 |       remediation:
128 |         "Never pass sensitive data in URL parameters. Use POST requests with encrypted body content for sensitive operations. Implement proper session management instead of passing tokens in URLs.",
129 |     });
130 |   }
131 | 
132 |   // Check 4: Missing Cache-Control for potentially sensitive pages
133 |   const cacheControl = normalized["cache-control"];
134 |   const urlPath = parsedUrl.pathname.toLowerCase();
135 |   const isSensitivePath = 
136 |     urlPath.includes("login") ||
137 |     urlPath.includes("account") ||
138 |     urlPath.includes("profile") ||
139 |     urlPath.includes("admin") ||
140 |     urlPath.includes("dashboard");
141 | 
142 |   if (isSensitivePath && (!cacheControl || !cacheControl.includes("no-store"))) {
143 |     findings.push({
144 |       title: "Missing cache control on sensitive page",
145 |       description: `The page ${url} appears to be sensitive but does not have proper cache control headers. Sensitive data may be cached by browsers or proxies.`,
146 |       severity: "MEDIUM",
147 |       category: "HEADER",
148 |       evidence: { url, cacheControl: cacheControl || "none" },
149 |       remediation:
150 |         "Set 'Cache-Control: no-store, no-cache, must-revalidate, private' header on all pages containing sensitive data to prevent caching.",
151 |     });
152 |   }
153 | 
154 |   // Check 5: Weak TLS version indicators in headers
155 |   const serverHeader = normalized["server"];
156 |   if (serverHeader) {
157 |     const weakTls = WEAK_TLS_INDICATORS.filter(indicator =>
158 |       serverHeader.includes(indicator)
159 |     );
160 |     
161 |     if (weakTls.length > 0) {
162 |       findings.push({
163 |         title: "Weak TLS version detected",
164 |         description: `The server at ${url} may be using weak TLS versions: ${weakTls.join(", ")}. These protocols have known vulnerabilities and should not be used.`,
165 |         severity: "HIGH",
166 |         category: "TLS",
167 |         evidence: { weakVersions: weakTls, serverHeader },
168 |         remediation:
169 |           "Disable TLS 1.0, TLS 1.1, SSLv2, and SSLv3. Configure your server to only support TLS 1.2 and TLS 1.3 with strong cipher suites.",
170 |       });
171 |     }
172 |   }
173 | 
174 |   return findings;
175 | }
176 | 
177 | /**
178 |  * Perform active TLS/SSL testing on a URL
179 |  * This makes an actual request to check the connection security
180 |  */
181 | export async function testTlsConfiguration(url: string): Promise<ScanFinding | null> {
182 |   try {
183 |     const parsedUrl = new URL(url);
184 |     
185 |     // Only test HTTPS URLs
186 |     if (parsedUrl.protocol !== "https:") {
187 |       return null;
188 |     }
189 | 
190 |     const response = await axios.get(url, {
191 |       timeout: 8000,
192 |       validateStatus: () => true,
193 |       // This will fail on invalid certificates
194 |       httpsAgent: new (require("https").Agent)({
195 |         rejectUnauthorized: true,
196 |       }),
197 |     });
198 | 
199 |     // If we get here, the certificate is valid
200 |     return null;
201 |   } catch (error: any) {
202 |     // Check for certificate errors
203 |     if (
204 |       error.code === "CERT_HAS_EXPIRED" ||
205 |       error.code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
206 |       error.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
207 |       error.code === "CERT_UNTRUSTED"
208 |     ) {
209 |       return {
210 |         title: "Invalid or untrusted SSL/TLS certificate",
211 |         description: `The server at ${url} has an invalid SSL/TLS certificate. Error: ${error.code}. This indicates a serious security issue that could allow man-in-the-middle attacks.`,
212 |         severity: "CRITICAL",
213 |         category: "TLS",
214 |         evidence: { error: error.code, message: error.message },
215 |         remediation:
216 |           "Obtain a valid SSL/TLS certificate from a trusted Certificate Authority (CA). Ensure the certificate is not expired and matches the domain name. Consider using Let's Encrypt for free, automated certificates.",
217 |       };
218 |     }
219 |   }
220 | 
221 |   return null;
222 | }
223 | 
224 | // Made with Bob
</content>
</file>
<file><path>api/src/controllers/scan-engine/sqli-checker.ts</path>
<content lines="1-45">
 1 | import axios from "axios";
 2 | import type { ScanFinding } from "./types/scan";
 3 | 
 4 | const payloads = ["' OR '1'='1'", '" OR "1"="1"', "or 1=1", "-- ", "/*"];
 5 | const errorSignatures = [
 6 |   "sql syntax",
 7 |   "mysql",
 8 |   "syntax error",
 9 |   "unclosed quotation mark",
10 |   "sqlstate",
11 |   "database error",
12 | ];
13 | 
14 | export async function detectBasicSqlInjection(url: string) {
15 |   try {
16 |     const parsed = new URL(url);
17 |     payloads.forEach((payload, index) =>
18 |       parsed.searchParams.set(`sqli-${index}`, payload),
19 |     );
20 |     const response = await axios.get(parsed.toString(), {
21 |       timeout: 8000,
22 |       validateStatus: () => true,
23 |     });
24 |     const body = response.data?.toString?.().toLowerCase() ?? "";
25 | 
26 |     const evidence = errorSignatures.filter((signature) =>
27 |       body.includes(signature),
28 |     );
29 |     if (evidence.length > 0) {
30 |       return {
31 |         title: "Potential SQL injection error leakage",
32 |         description: `The target ${url} returned SQL error details after injection-like input was submitted.`,
33 |         severity: "HIGH",
34 |         category: "SQLI",
35 |         evidence: { payloads, signatures: evidence.slice(0, 5) },
36 |         remediation:
37 |           "Validate and parameterize database queries to avoid injection vulnerabilities.",
38 |       } as ScanFinding;
39 |     }
40 |   } catch {
41 |     return null;
42 |   }
43 | 
44 |   return null;
45 | }
</content>
</file>
<file><path>api/src/config.ts</path>
<content lines="1-7">
1 | export const scanPolicy = {
2 |   maxPages: 30,
3 |   maxDepth: 3,
4 |   maxRequests: 120,
5 |   pageTimeoutMs: 10000,
6 |   crawlDelayMs: 250,
7 | };
</content>
</file>
</files>
<environment_details>
# VSCode Visible Files
web\src\app\scan\page.tsx

# VSCode Open Tabs
web/src/app/scan/page.tsx,api/src/controllers/scanController.ts,api/db/schema.sql,api/src/services/scanJobService.ts,api/src/controllers/scan-engine/scan-engine.ts

# Current Time
Current time in ISO 8601 UTC format: 2026-05-17T06:45:15.299Z
User time zone: Asia/Jakarta, UTC+7:00

# Current Cost
$0.08

# Review Exclusions
The following file patterns are excluded from code reviews:
- .vscode/**

# Current Mode
<slug>code</slug>
<name>💻 Code</name>
You have not created a todo list yet. Create one with `update_todo_list` if your task is complicated or involves multiple steps.
</environment_details>

---

**Assistant:**

<attempt_completion>
<result>
I've analyzed your scanning system and identified the likely issue causing scans to not return details for non-YouTube links in production:

## Key Findings:

### 1. **Playwright Browser Launch Failure (Most Likely Cause)**
In `crawler.ts` (lines 44-50), when Playwright fails to launch the browser, it falls back to Axios. However, the Axios fallback only fetches a single page without crawling links, which severely limits the scan results.

**Production Issue**: Playwright likely can't launch Chromium in your production environment due to:
- Missing system dependencies (fonts, libraries)
- Insufficient memory/resources
- Serverless environment limitations (Vercel/similar platforms)

### 2. **Empty Pages Array**
When the crawler returns an empty pages array (line 106-108), it falls back to Axios, but if that also fails, you get zero pages to scan, resulting in no findings.

### 3. **YouTube Works Because:**
- YouTube likely has more permissive CORS/headers
- The single-page Axios fallback is sufficient to detect YouTube's security headers
- YouTube's response is more reliable even without JavaScript execution

### 4. **Other Sites Fail Because:**
- They may require JavaScript execution (which Axios can't do)
- They may block simple HTTP requests
- The single-page fallback doesn't crawl additional pages where vulnerabilities might exist
- Timeout issues (10 seconds per page might be too short for some sites)

## Specific Problem Areas:

**In `crawler.ts`:**
- Line 46: Browser launch fails silently in production
- Line 107: Empty pages array triggers Axios fallback
- Line 38: Axios fallback can fail and return empty array

**In `scan-engine.ts`:**
- Line 72: If `pages` is empty, no checks run
- Line 74-94: Loop never executes if pages array is empty

## Recommendations (Don't implement yet):

1. **Add better error logging** to see exactly where it's failing in production
2. **Check Playwright installation** in production environment
3. **Increase timeouts** for slower websites
4. **Add retry logic** for failed page loads
5. **Implement better fallback strategy** when Playwright fails
6. **Add health check endpoint** to verify Playwright availability

The core issue is that your production environment likely cannot run Playwright/Chromium, causing all scans to fall back to the limited Axios method, which only fetches one page and may fail entirely for sites with strict security policies.
</result>
</attempt_completion>

