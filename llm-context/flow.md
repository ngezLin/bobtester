# Project Flow

## Architecture Overview

```mermaid
graph TB
    subgraph "Web Interface"
        WebUI[Next.js Dashboard]
        Recorder[Test Recorder]
    end

    subgraph "BobTester API"
        Auth[Auth Service]
        API[Express API]
        Webhook[Webhook Handler]
    end

    subgraph "Execution Layer"
        Runner[Playwright Runner]
        Browserless[Browserless.io]
        Detector[Security Detector]
    end

    subgraph "Storage"
        DB[(Supabase Database)]
        Screenshots[Local Storage]
    end

    WebUI -->|JWT Auth| Auth
    Auth -->|Validated| API
    API -->|Store Tests| DB
    API -->|Trigger Run| Runner
    
    Runner -->|Execute| Browserless
    Runner -->|Detect Issues| Detector
    Detector -->|Save Results| DB
    Runner -->|Capture| Screenshots
    
    API -->|Trigger Suite Run| Webhook
```

## Flow 1: Web UI Recording & Execution

```mermaid
sequenceDiagram
    participant User
    participant WebUI
    participant API
    participant DB
    participant Runner
    participant Target

    User->>WebUI: Record new test
    WebUI->>User: Open Playwright Codegen
    User->>WebUI: Paste recorded steps
    WebUI->>API: POST /api/cases
    API->>DB: Save test case (with project/folder)
    DB-->>API: Case ID
    API-->>WebUI: Success

    User->>WebUI: Add test data (Assets)
    WebUI->>API: POST /api/assets/case/:id
    API->>DB: Save asset data

    User->>WebUI: Run test
    WebUI->>API: POST /api/runs
    API->>Runner: Execute with asset data
    Runner->>Target: Run Playwright steps
    Target-->>Runner: Responses + Events
    Runner->>Runner: Detect vulnerabilities
    Runner->>DB: Save results + screenshots
    Runner-->>API: Execution complete
    API-->>WebUI: Display results
```

## Flow 2: Project Suite (Batch) Execution

```mermaid
sequenceDiagram
    participant User
    participant WebUI
    participant API
    participant Runner
    participant DB

    User->>WebUI: Click "Run Suite" in Project
    WebUI->>API: POST /api/projects/:id/run
    API->>DB: Fetch all cases in project
    API->>DB: Fetch assets for each case
    API-->>WebUI: Response: Batch Started
    
    loop For each case/asset combination
        API->>Runner: Execute Dynamic Test
        Runner->>Runner: Detect Issues
        Runner->>DB: Update Run Record
    end
    
    Note over API,DB: Dashboard updates in real-time
```

## Key Components

### 1. Recording Phase

- User records tests via Web UI using Playwright Codegen
- Steps are saved as JSON in the database
- Test cases are organized into **Projects** and **Folders**
- Test data (assets) can be added for parameterization

### 2. Execution Phase

- Playwright Runner executes tests via Browserless.io
- Variable substitution: `[variable]` replaced with asset data
- **Active Detection**:
  - `page.on('dialog')`: Detects XSS via alert/confirm dialogs
  - `page.on('console')`: Monitors console for errors/tokens
  - `response.text()`: Scans for SQLi error strings

### 3. Reporting Phase

- Results marked as `PASSED`, `FAILED`, `VULNERABLE`, or `WARNING`
- Screenshots captured at success/failure moments
- Detailed logs and vulnerability reports
- Project-wide statistics shown on dashboard
