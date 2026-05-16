PROJECT: BobTester
HACKATHON: IBM Bob Hackathon (May 15-17, 2026)

MISSION:
A comprehensive QA automation platform for teams to record, manage, and execute automated tests with security vulnerability detection, integrable into CI/CD pipelines via webhooks.

CURRENT STATE:

- Backend: Express + Supabase + Playwright (Offloaded to Browserless.io with local fallback)
- Frontend: Next.js (Dashboard + Case management)
- Status: Core recording, execution, and Project CRUD complete.

CORE WORKFLOW:

1. Record: Capture a standard "Happy Path" using Playwright Codegen or UI recorder.
2. Configure: Add test data and security payloads via Asset Manager.
3. Organize: Group test cases into Projects and Folders for better suite management.
4. Execute: Playwright Runner executes the flow using test data via Browserless.io.
5. Detect: Active listeners (dialogs, console, response body) detect vulnerabilities.
6. Report: Visual dashboard showing test results and security findings.

VARIABLE SYNTAX:
Steps JSON uses `[variable_name]` which the runner replaces with data from the Asset.
Example: `{ "action": "fill", "selector": "#q", "value": "[search_query]" }`

RELEVANT FILES:

- `endpoint.md`: Detailed API documentation.
- `flow.md`: Visual architecture and data flow.
- `vulnerability_mapping.md`: How we detect specific OWASP flaws.
- `schemas.md`: JSON structures for cases, steps, and payloads.
- `todo.md`: Project roadmap and pending tasks.
