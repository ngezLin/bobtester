PROJECT: BobTester (Security Edition)
HACKATHON: IBM Bob Hackathon (May 15-17, 2026)

MISSION:
Transforming standard browser flows into active security probes. BobTester uses IBM Bob AI to analyze recorded user journeys and dynamically inject security payloads (XSS, SQLi, etc.) to detect vulnerabilities automatically.

CURRENT STATE:
- Backend: Express + MySQL + Playwright (Offloaded to Browserless.io with local fallback)
- Frontend: Next.js (Dashboard + Case management)
- AI Model: Local Llama3 (via Ollama)
- Status: Security Probing active. "Prompt-to-Automation" (Bob AI) feature implemented with dynamic Page Discovery.

CORE WORKFLOW (Manual Recording):
1. Record: Capture a standard "Happy Path" using Playwright Codegen.
2. Analyze: Bob AI identifies input fields and suggests attack vectors.
3. Probe: Playwright Runner re-executes the flow using security payloads via Browserless.io.
4. Detect: Active listeners (dialogs, console, response body) confirm vulnerabilities.
5. Report: Visual dashboard showing where security failed.

CORE WORKFLOW (Bob AI - Prompt to Automation):
1. User provides Target URL and Testing Goal.
2. Discovery: Backend uses Playwright to visit the URL and extract interactive elements (ARIA roles, accessible names).
3. Generation: Llama3 AI uses the discovery context to generate accurate, role-based Playwright steps and assertions (`verify` action).
4. Review & Save: User reviews steps, names the test case, and saves it.
5. Execution: Playwright runs the steps via Browserless.io with active security listeners attached.

VARIABLE SYNTAX:
Steps JSON uses `[variable_name]` which the runner replaces with data from the Asset.
Example: `{ "action": "fill", "selector": "#q", "value": "[search_query]" }`

RELEVANT FILES:
- `endpoint.md`: Detailed API documentation.
- `flow.md`: Visual architecture and data flow.
- `vulnerability_mapping.md`: How we detect specific OWASP flaws.
- `schemas.md`: JSON structures for cases, steps, and payloads.