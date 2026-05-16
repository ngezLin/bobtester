# Project Flow: SDK + Developer Integration

## Architecture Overview

```mermaid
graph TB
    subgraph "Developer Tools"
        SDK[BobTester SDK]
        CLI[CLI Tool]
        YAML[YAML/JSON Tests]
    end

    subgraph "CI/CD Integrations"
        GHA[GitHub Actions]
        GitLab[GitLab CI]
        Jenkins[Jenkins Plugin]
    end

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
        DB[(MySQL Database)]
        Screenshots[Screenshot Storage]
    end

    SDK -->|API Key Auth| Auth
    CLI -->|API Key Auth| Auth
    GHA -->|Webhook/API| Auth
    GitLab -->|Webhook/API| Auth
    Jenkins -->|Webhook/API| Auth
    WebUI -->|JWT Auth| Auth

    Auth -->|Validated| API
    API -->|Store Tests| DB
    API -->|Trigger Run| Runner
    API -->|Send Events| Webhook

    Runner -->|Execute| Browserless
    Runner -->|Detect Issues| Detector
    Detector -->|Save Results| DB
    Runner -->|Capture| Screenshots

    Webhook -->|Notify| SDK
    Webhook -->|Notify| GHA
    Webhook -->|Notify| GitLab
```

## Flow 1: Web UI Recording (Traditional)

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
    API->>DB: Save test case
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

## Flow 2: SDK Integration (Programmatic)

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant SDK as BobTester SDK
    participant API as BobTester API
    participant Runner as Test Runner
    participant Webhook as Webhook Service

    Dev->>SDK: npm install @bobtester/sdk
    Dev->>SDK: Configure API key

    Note over Dev,SDK: Option A: Run existing test
    Dev->>SDK: client.runs.execute(caseId, assetId)
    SDK->>API: POST /api/runs (with API key)
    API->>Runner: Execute test
    Runner-->>API: Results
    API-->>SDK: Test results
    SDK-->>Dev: Return results object

    Note over Dev,SDK: Option B: Create and run test
    Dev->>SDK: client.cases.create(testConfig)
    SDK->>API: POST /api/cases
    API-->>SDK: Case ID
    Dev->>SDK: client.runs.execute(caseId)
    SDK->>API: POST /api/runs
    API->>Runner: Execute
    Runner-->>API: Results
    API->>Webhook: Trigger webhook
    Webhook-->>SDK: Real-time notification
    SDK-->>Dev: Results + webhook event
```

## Flow 3: CI/CD Integration (GitHub Actions)

```mermaid
sequenceDiagram
    participant GH as GitHub
    participant Action as BobTester Action
    participant API as BobTester API
    participant Runner as Test Runner
    participant Slack as Slack/Discord

    GH->>Action: Push to main branch
    Action->>Action: Read bobtester.yml config
    Action->>API: POST /api/projects/:id/run
    API->>Runner: Execute test suite

    loop For each test case
        Runner->>Runner: Execute test
        Runner->>Runner: Detect vulnerabilities
    end

    Runner-->>API: Suite results
    API->>API: Generate report
    API-->>Action: Results summary

    alt Tests passed
        Action->>GH: ✅ Success status
    else Tests failed or vulnerabilities found
        Action->>GH: ❌ Failure status
        API->>Slack: Send alert
    end
```

## Flow 4: Webhook Notifications

```mermaid
sequenceDiagram
    participant API as BobTester API
    participant Webhook as Webhook Service
    participant External as External Service

    Note over API: Test execution completes
    API->>Webhook: Trigger webhook event
    Webhook->>Webhook: Format payload

    par Notify all subscribers
        Webhook->>External: POST to webhook URL 1
        Webhook->>External: POST to webhook URL 2
        Webhook->>External: POST to webhook URL N
    end

    External-->>Webhook: Acknowledgment
    Webhook->>API: Log delivery status
```

## Key Components

### 1. Recording Phase

- User records tests via Web UI using Playwright Codegen
- Steps are saved as JSON in the database
- Test data (assets) can be added for parameterization

### 2. SDK Integration

- Developers install `@bobtester/sdk` package
- Authenticate using API keys
- Programmatically create, manage, and execute tests
- Receive real-time results and webhook notifications

### 3. Execution Phase

- Playwright Runner executes tests via Browserless.io
- Variable substitution: `[variable]` replaced with asset data
- **Active Detection**:
  - `page.on('dialog')`: Detects XSS via alert/confirm dialogs
  - `page.on('console')`: Monitors console for errors/tokens
  - `response.text()`: Scans for SQLi error strings

### 4. CI/CD Integration

- GitHub Actions, GitLab CI, Jenkins plugins
- Automated test execution on code changes
- Webhook notifications to Slack/Discord
- Test results integrated into PR checks

### 5. Reporting Phase

- Results marked as `PASSED`, `FAILED`, or `VULNERABLE`
- Screenshots captured at key moments
- Detailed logs and vulnerability reports
- Real-time notifications via webhooks
