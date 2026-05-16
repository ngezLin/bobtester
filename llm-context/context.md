PROJECT: BobTester (Developer SDK Edition)
HACKATHON: IBM Bob Hackathon (May 15-17, 2026)

MISSION:
A comprehensive QA automation platform with SDK integration for developers. BobTester allows teams to record, manage, and execute automated tests with security vulnerability detection, all integrable into CI/CD pipelines.

CURRENT STATE:

- Backend: Express + MySQL + Playwright (Offloaded to Browserless.io with local fallback)
- Frontend: Next.js (Dashboard + Case management)
- SDK: NPM package for programmatic test execution
- Status: Core recording and execution complete. SDK and CI/CD integration in development.

CORE WORKFLOW (Manual Recording):

1. Record: Capture a standard "Happy Path" using Playwright Codegen or UI recorder.
2. Configure: Add test data and security payloads via Asset Manager.
3. Execute: Playwright Runner executes the flow using test data via Browserless.io.
4. Detect: Active listeners (dialogs, console, response body) detect vulnerabilities.
5. Report: Visual dashboard showing test results and security findings.

CORE WORKFLOW (SDK Integration):

1. Install: Developer installs `@bobtester/sdk` via npm.
2. Configure: Set API key and project configuration.
3. Define Tests: Write tests in code or YAML format.
4. Execute: Run tests programmatically or via CLI.
5. CI/CD: Integrate into GitHub Actions, GitLab CI, or Jenkins.
6. Webhooks: Receive real-time notifications of test results.

VARIABLE SYNTAX:
Steps JSON uses `[variable_name]` which the runner replaces with data from the Asset.
Example: `{ "action": "fill", "selector": "#q", "value": "[search_query]" }`

RELEVANT FILES:

- `endpoint.md`: Detailed API documentation.
- `flow.md`: Visual architecture and data flow.
- `vulnerability_mapping.md`: How we detect specific OWASP flaws.
- `schemas.md`: JSON structures for cases, steps, and payloads.
