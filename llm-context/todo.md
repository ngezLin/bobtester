# Project Roadmap & TODO

This list tracks the implementation steps for remaking BobTester.

## Phase 1: Foundation (Current)
- [x] **Database Schema**: Update to simplified version with users, cases, assets, and runs.
- [x] **Auth Backend**: 
    - [x] `POST /api/auth/register` (hashing password)
    - [x] `POST /api/auth/login` (generating simple JWT)
    - [x] Auth middleware for protected routes
- [x] **Auth Frontend**:
    - [x] Login page
    - [x] Register page
    - [x] Auth state management (localStorage token)

## Phase 2: Core Features
- [x] **Case Management**:
    - [x] `POST /api/cases`: Save parsed steps and target URL.
    - [x] `GET /api/cases`: List user's cases.
    - [x] UI for listing and viewing case steps.
- [x] **Recording Logic**:
    - [x] Update `/record` page to allow pasting and saving steps.
    - [x] Ensure `playwright codegen` results can be easily pasted.

## Phase 3: Assets (Manual Data Sets)
- [x] **Asset Management**:
    - [x] `POST /api/cases/:id/assets`: Save parameter data (e.g., username/password sets).
    - [x] `GET /api/cases/:id/assets`: List data sets for a case.
    - [x] UI to add/view manual assets (positive/normal cases).

## Phase 4: Execution & Reporting
- [x] **Dynamic Runner**:
    - [x] `PlaywrightService`: Function to execute steps JSON and replace `[vars]` with asset data.
    - [x] Capture screenshots and logs during execution.
- [x] **Results Dashboard**:
    - [x] `POST /api/run`: Trigger execution.
    - [x] `GET /api/runs`: History list.
    - [x] Detailed run view with status, timing, and screenshot.
