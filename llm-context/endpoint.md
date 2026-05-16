# API Endpoints (SDK Ready)

## Authentication

### User Authentication (JWT)

- **POST** `/api/auth/register`: Register new user
  - **Request**: `{ email, password }`
  - **Response**: `{ token, user: { id, email } }`

- **POST** `/api/auth/login`: Login existing user
  - **Request**: `{ email, password }`
  - **Response**: `{ token, user: { id, email } }`

### API Key Authentication (SDK)

- **POST** `/api/auth/api-keys`: Generate new API key
  - **Headers**: `Authorization: Bearer <JWT>`
  - **Request**: `{ name, permissions: ["read", "write", "execute"] }`
  - **Response**: `{ apiKey, name, createdAt }`

- **GET** `/api/auth/api-keys`: List all API keys
  - **Headers**: `Authorization: Bearer <JWT>`
  - **Response**: `[{ id, name, permissions, createdAt, lastUsed }]`

- **DELETE** `/api/auth/api-keys/:id`: Revoke API key
  - **Headers**: `Authorization: Bearer <JWT>`

## Projects

- **POST** `/api/projects`: Create new project
  - **Request**: `{ name, description }`
  - **Response**: `{ id, name, description, createdAt }`

- **GET** `/api/projects`: List all projects
  - **Response**: `[{ id, name, description, caseCount, lastRun }]`

- **GET** `/api/projects/:id`: Get project details
  - **Response**: `{ id, name, description, cases: [...], stats: {...} }`

- **PUT** `/api/projects/:id`: Update project
  - **Request**: `{ name?, description? }`

- **DELETE** `/api/projects/:id`: Delete project

- **POST** `/api/projects/:id/run`: Run entire project test suite
  - **Request**: `{ environment?: "staging" | "production" }`
  - **Response**: `{ suiteRunId, status: "running", totalTests }`

## Test Cases

- **POST** `/api/cases`: Create new test case
  - **Request**: `{ name, targetUrl, steps, projectId? }`
  - **Response**: `{ id, name, targetUrl, steps, createdAt }`

- **GET** `/api/cases`: List all test cases
  - **Query**: `?projectId=<id>&status=<active|archived>`
  - **Response**: `[{ id, name, targetUrl, stepCount, lastRun }]`

- **GET** `/api/cases/:id`: Get test case details
  - **Response**: `{ id, name, targetUrl, steps, assets, runs: [...] }`

- **PUT** `/api/cases/:id`: Update test case
  - **Request**: `{ name?, targetUrl?, steps? }`

- **DELETE** `/api/cases/:id`: Delete test case

- **POST** `/api/cases/record`: Launch Playwright codegen (Web UI only)

## Assets (Test Data)

- **POST** `/api/assets/case/:id`: Add test data to case
  - **Request**: `{ name, data: { key: "value" }, vulnerabilityType? }`
  - **Response**: `{ id, name, data, createdAt }`

- **GET** `/api/assets/case/:id`: List all assets for case
  - **Response**: `[{ id, name, data, vulnerabilityType }]`

- **DELETE** `/api/assets/:id`: Delete asset

## Test Runs

- **POST** `/api/runs`: Execute a test run
  - **Request**: `{ caseId, assetId?, environment? }`
  - **Response**: `{ runId, status: "running", startedAt }`

- **GET** `/api/runs`: List run history
  - **Query**: `?caseId=<id>&status=<passed|failed|vulnerable>&limit=50`
  - **Response**: `[{ id, caseId, status, executionTime, vulnerabilities, createdAt }]`

- **GET** `/api/runs/:id`: Get detailed run result
  - **Response**: `{ id, status, executionTime, logs, vulnerabilities, screenshotPath }`

- **DELETE** `/api/runs/:id`: Delete run record

## Webhooks

- **POST** `/api/webhooks/projects/:id`: Trigger project run via webhook
  - **Headers**: `X-Webhook-Secret: <secret>`
  - **Request**: `{ environment?, branch? }`
  - **Response**: `{ suiteRunId, status: "triggered" }`

- **POST** `/api/webhooks/subscribe`: Subscribe to webhook events
  - **Request**: `{ url, events: ["run.completed", "vulnerability.detected"], projectId? }`
  - **Response**: `{ webhookId, url, events }`

- **GET** `/api/webhooks`: List webhook subscriptions
  - **Response**: `[{ id, url, events, status, lastTriggered }]`

- **DELETE** `/api/webhooks/:id`: Unsubscribe webhook

## Statistics

- **GET** `/api/stats`: Get dashboard statistics
  - **Response**: `{ totalCases, totalRuns, vulnerabilitiesFound, passRate }`

- **GET** `/api/stats/projects/:id`: Get project-specific stats
  - **Response**: `{ runHistory: [...], vulnerabilityTrends: [...], topFailures: [...] }`

## SDK-Specific Endpoints

- **POST** `/api/sdk/validate`: Validate test configuration
  - **Request**: `{ steps: [...] }`
  - **Response**: `{ valid: boolean, errors: [...] }`

- **POST** `/api/sdk/batch`: Execute multiple tests in batch
  - **Request**: `{ runs: [{ caseId, assetId }] }`
  - **Response**: `{ batchId, totalTests, status: "queued" }`

- **GET** `/api/sdk/batch/:id`: Get batch execution status
  - **Response**: `{ batchId, completed, failed, results: [...] }`

# Frontend Routes

- `/`: Login/Register
- `/dashboard`: Overview statistics
- `/projects`: Project management
- `/projects/:id`: Project details and test cases
- `/cases`: Test case management
- `/cases/:id/config`: Configure test case and assets
- `/record`: Record new test cases
- `/runs`: Test run history
- `/ai-run`: AI-powered test generation (if enabled)

# Authentication Methods

## 1. JWT (Web UI)

```
Authorization: Bearer <jwt_token>
```

## 2. API Key (SDK/CLI)

```
X-API-Key: <api_key>
```

## 3. Webhook Secret (CI/CD)

```
X-Webhook-Secret: <webhook_secret>
```
