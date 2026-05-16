# API Endpoints

## Authentication

### User Authentication (JWT)

- **POST** `/api/auth/register`: Register new user
  - **Request**: `{ email, password }`
  - **Response**: `{ token, user: { id, email } }`

- **POST** `/api/auth/login`: Login existing user
  - **Request**: `{ email, password }`
  - **Response**: `{ token, user: { id, email } }`

## Projects

- **POST** `/api/projects`: Create new project
  - **Request**: `{ name, description }`
  - **Response**: `{ id, name, description, createdAt }`

- **GET** `/api/projects`: List all projects
  - **Response**: `{ success, projects: [{ id, name, description, created_at }] }`

- **GET** `/api/projects/:id`: Get project details
  - **Response**: `{ success, project: { id, name, description }, cases: [...] }`

- **PUT** `/api/projects/:id`: Update project
  - **Request**: `{ name, description? }`
  - **Response**: `{ success, message }`

- **DELETE** `/api/projects/:id`: Delete project
  - **Response**: `{ success, message }`

- **POST** `/api/projects/:id/run`: Run entire project test suite (Batch Runner)
  - **Response**: `{ success, message, casesRun }`

## Test Cases

- **POST** `/api/cases`: Create new test case
  - **Request**: `{ name, target_url, steps, project_id?, folder? }`
  - **Response**: `{ success, message, caseId }`

- **GET** `/api/cases`: List all test cases
  - **Response**: `{ success, cases: [{ id, name, target_url, created_at, folder, project_id }] }`

- **GET** `/api/cases/:id`: Get test case details
  - **Response**: `{ success, case: { id, name, target_url, steps, ... } }`

- **PUT** `/api/cases/:id`: Update test case
  - **Request**: `{ name?, target_url?, steps? }`

- **DELETE** `/api/cases/:id`: Delete test case

- **POST** `/api/cases/record`: Launch Playwright codegen (Web UI local only)

## Assets (Test Data)

- **POST** `/api/assets/case/:id`: Add test data to case
  - **Request**: `{ name, data: { key: "value" }, is_negative? }`
  - **Response**: `{ success, message, assetId }`

- **GET** `/api/assets/case/:id`: List all assets for case
  - **Response**: `{ success, assets: [...] }`

- **DELETE** `/api/assets/:id`: Delete asset

## Test Runs

- **POST** `/api/runs`: Execute a test run
  - **Request**: `{ caseId, assetId? }`
  - **Response**: `{ success, runId, status: "running" }`

- **GET** `/api/runs`: List run history
  - **Response**: `{ success, runs: [...] }`

- **GET** `/api/runs/:id`: Get detailed run result
  - **Response**: `{ success, run: { id, status, execution_time, logs, vulnerabilities, screenshot_path } }`

- **DELETE** `/api/runs/:id`: Delete run record

## Webhooks

- **POST** `/api/webhooks/projects/:id`: Trigger project run via webhook
  - **Request**: `{ environment?, branch? }`
  - **Response**: `{ success, message }`

## Statistics

- **GET** `/api/stats`: Get dashboard statistics
  - **Response**: `{ success, totalProjects, totalCases, totalRuns, vulnerabilitiesFound }`

# Frontend Routes

- `/`: Landing / Login / Register
- `/dashboard`: Overview statistics
- `/projects`: Project management
- `/projects/:id`: Project details and test suite organization
- `/cases`: Test case management
- `/cases/:id/config`: Configure test case and assets
- `/record`: Record new test cases
- `/runs`: Test run history

# Authentication Method

## 1. JWT (Web UI)

```
Authorization: Bearer <jwt_token>
```
