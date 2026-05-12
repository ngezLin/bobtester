# API Endpoints (Security Focused)

## Authentication
- **POST** `/api/auth/register`: `{ email, password }`
- **POST** `/api/auth/login`: `{ email, password }` → Returns token.

## Test Cases & Recording
- **POST** `/api/record`: Launches server-side `playwright codegen`.
- **POST** `/api/cases`: Saves a recorded flow. `{ name, targetUrl, steps }`
- **GET**  `/api/cases`: Returns all cases for the user.

## Assets & Payloads
- **POST** `/api/cases/:id/assets`: Manual data set entry.
- **GET**  `/api/cases/:id/assets`: List all data sets for a case.
- **POST** `/api/bob/probe`: Send steps to Bob. Bob analyzes field names and returns suggested security payloads.
    - **Request**: `{ steps: [...] }`
    - **Response**: `{ assets: [{ name: "XSS Probe", data: { field: "<script>..." }, vulnerability: "XSS" }] }`

## Execution & Reporting
- **POST** `/api/run`: Trigger a run. `{ caseId, assetId }`
- **GET**  `/api/runs`: List run history.
- **GET**  `/api/runs/:id`: View detailed result.
    - **Returns**: `{ status: "VULNERABLE" | "SAFE", logs, screenshotPath, vulnerabilities: [{ type: "XSS", evidence: "Dialog popped" }] }`

# Frontend Routes
- `/`: Login/Register
- `/record`: Record new cases.
- `/cases`: Management dashboard.
- `/runs`: Security report history.
