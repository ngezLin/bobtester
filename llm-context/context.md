PROJECT: BobTester (Security Edition)
HACKATHON: IBM Bob Hackathon (May 15-17, 2026)

MISSION:
Transforming standard browser flows into active security probes. BobTester uses IBM Bob AI to analyze recorded user journeys and dynamically inject security payloads (XSS, SQLi, etc.) to detect vulnerabilities automatically.

CURRENT STATE:
- Backend: Express + MySQL + Playwright (Stable runner)
- Frontend: Next.js (Dashboard + Case management)
- Status: Happy-path automation works; pivoting to Security Probing.

SECURITY FOCUS (OWASP TOP 10):
1. A03:2021-Injection (SQLi, XSS, OS Command Injection)
2. A01:2021-Broken Access Control (Session/Token manipulation)
3. A07:2021-Identification and Authentication Failures

CORE WORKFLOW:
1. Record: Capture a standard "Happy Path" (e.g., Search, Login, Profile Update).
2. Analyze: Bob AI identifies input fields and suggests attack vectors.
3. Probe: Playwright Runner re-executes the flow using security payloads.
4. Detect: Active listeners (dialogs, console, response body) confirm vulnerabilities.
5. Report: Visual dashboard showing where security failed.

VARIABLE SYNTAX:
Steps JSON uses `[variable_name]` which the runner replaces with data from the Asset.
Example: `{ "action": "fill", "selector": "#q", "value": "[search_query]" }`

RELEVANT FILES:
- `endpoint.md`: Detailed API documentation.
- `flow.md`: Visual architecture and data flow.
- `vulnerability_mapping.md`: How we detect specific OWASP flaws.
- `schemas.md`: JSON structures for cases, steps, and payloads.