# BobTester SDK Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for transforming BobTester into a developer-friendly platform with SDK, CLI, and CI/CD integrations. This approach makes BobTester stand out in the hackathon by solving real developer pain points.

## Why SDK + Developer Integration?

### Problems It Solves

1. **Manual Testing Bottleneck**: Developers can automate security testing in their workflow
2. **CI/CD Gap**: No need to leave development environment to run tests
3. **Scalability**: Tests can run automatically on every commit
4. **Team Collaboration**: Shared test suites across the organization
5. **Real-time Feedback**: Immediate notifications when vulnerabilities are detected

### Hackathon Advantages

- **Practical & Impressive**: Shows enterprise-ready thinking
- **Multiple Integration Points**: SDK, CLI, GitHub Actions, webhooks
- **Developer Experience**: Easy to use, well-documented
- **Scalable Architecture**: Can grow beyond hackathon
- **Demo-Friendly**: Easy to show live integrations

## Implementation Phases

### Phase 1: Backend API Enhancements (Priority: HIGH)

#### 1.1 API Key Management System

**Files to Create/Modify:**

- `api/src/controllers/apiKeyController.ts` (new)
- `api/src/middleware/apiKeyMiddleware.ts` (new)
- `api/db/schema.sql` (add api_keys table)

**Database Schema:**

```sql
CREATE TABLE api_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  permissions JSON NOT NULL,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_key_hash (key_hash)
);
```

**API Endpoints:**

```typescript
// POST /api/auth/api-keys - Generate new API key
// GET /api/auth/api-keys - List user's API keys
// DELETE /api/auth/api-keys/:id - Revoke API key
```

**Implementation Steps:**

1. Create database migration for api_keys table
2. Implement API key generation with crypto.randomBytes()
3. Hash keys before storing (bcrypt or similar)
4. Create middleware to validate API keys
5. Add API key authentication to existing endpoints

#### 1.2 Enhanced Webhook System

**Files to Modify:**

- `api/src/controllers/webhookController.ts` (enhance existing)
- `api/src/services/webhookService.ts` (new)

**New Features:**

- Subscribe/unsubscribe to webhook events
- Event filtering (run.completed, vulnerability.detected, etc.)
- Webhook signature verification
- Retry logic for failed deliveries
- Webhook delivery logs

**Database Schema:**

```sql
CREATE TABLE webhook_subscriptions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  project_id INT NULL,
  url VARCHAR(500) NOT NULL,
  events JSON NOT NULL,
  secret VARCHAR(255) NOT NULL,
  status ENUM('active', 'paused', 'failed') DEFAULT 'active',
  last_triggered_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE webhook_deliveries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subscription_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  response_status INT NULL,
  response_body TEXT NULL,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
);
```

#### 1.3 Batch Execution API

**Files to Create:**

- `api/src/controllers/batchController.ts` (new)
- `api/src/services/batchService.ts` (new)

**Features:**

- Execute multiple tests in parallel
- Track batch execution status
- Return aggregated results

**Endpoints:**

```typescript
// POST /api/sdk/batch - Create batch execution
// GET /api/sdk/batch/:id - Get batch status
```

### Phase 2: SDK Package Development (Priority: HIGH)

#### 2.1 Core SDK Structure

**Directory Structure:**

```
sdk/
├── src/
│   ├── index.ts              # Main export
│   ├── client.ts             # BobTester client class
│   ├── auth/
│   │   └── auth-manager.ts   # Authentication handling
│   ├── resources/
│   │   ├── base.ts           # Base resource class
│   │   ├── cases.ts          # Test cases API
│   │   ├── runs.ts           # Test runs API
│   │   ├── projects.ts       # Projects API
│   │   ├── assets.ts         # Assets API
│   │   └── webhooks.ts       # Webhooks API
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   ├── case.ts           # Test case types
│   │   ├── run.ts            # Run types
│   │   └── common.ts         # Common types
│   ├── errors/
│   │   └── index.ts          # Custom error classes
│   └── utils/
│       ├── http.ts           # HTTP client
│       ├── retry.ts          # Retry logic
│       └── validation.ts     # Input validation
├── tests/
│   └── *.test.ts             # Unit tests
├── package.json
├── tsconfig.json
└── README.md
```

#### 2.2 Implementation Priority

**Week 1: Core SDK**

1. HTTP client with retry logic
2. Authentication manager
3. Base resource class
4. Cases resource
5. Runs resource
6. Error handling

**Week 2: Advanced Features**

1. Projects resource
2. Assets resource
3. Webhooks resource
4. Batch execution
5. TypeScript definitions
6. Unit tests

#### 2.3 SDK Code Examples

**Main Client (client.ts):**

```typescript
import { AuthManager } from "./auth/auth-manager";
import { CasesResource } from "./resources/cases";
import { RunsResource } from "./resources/runs";
import { ProjectsResource } from "./resources/projects";

export interface BobTesterConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retry?: RetryConfig;
}

export class BobTester {
  private auth: AuthManager;
  public cases: CasesResource;
  public runs: RunsResource;
  public projects: ProjectsResource;

  constructor(config: BobTesterConfig) {
    this.auth = new AuthManager(config);
    this.cases = new CasesResource(this.auth);
    this.runs = new RunsResource(this.auth);
    this.projects = new ProjectsResource(this.auth);
  }
}
```

**Resource Pattern (resources/cases.ts):**

```typescript
import { BaseResource } from "./base";
import { TestCase, CreateCaseData } from "../types";

export class CasesResource extends BaseResource {
  async list(params?: ListParams): Promise<TestCase[]> {
    return this.request("GET", "/api/cases", { params });
  }

  async get(id: number): Promise<TestCase> {
    return this.request("GET", `/api/cases/${id}`);
  }

  async create(data: CreateCaseData): Promise<TestCase> {
    return this.request("POST", "/api/cases", { data });
  }

  async update(id: number, data: Partial<CreateCaseData>): Promise<TestCase> {
    return this.request("PUT", `/api/cases/${id}`, { data });
  }

  async delete(id: number): Promise<void> {
    return this.request("DELETE", `/api/cases/${id}`);
  }
}
```

### Phase 3: CLI Tool (Priority: MEDIUM)

#### 3.1 CLI Structure

```
cli/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── login.ts          # Login command
│   │   ├── run.ts            # Run tests
│   │   ├── create.ts         # Create test
│   │   ├── list.ts           # List resources
│   │   └── watch.ts          # Watch mode
│   ├── config/
│   │   └── config-manager.ts # Config file handling
│   ├── formatters/
│   │   ├── table.ts          # Table output
│   │   └── json.ts           # JSON output
│   └── utils/
│       └── spinner.ts        # Loading indicators
├── package.json
└── README.md
```

#### 3.2 CLI Commands

```bash
# Authentication
bobtester login                    # Interactive login
bobtester logout                   # Clear credentials

# Test Execution
bobtester run --case-id 123        # Run specific test
bobtester run --project-id 1       # Run project suite
bobtester run --file test.yml      # Run from file

# Test Management
bobtester create --file test.yml   # Create from file
bobtester list cases               # List test cases
bobtester list projects            # List projects
bobtester list runs                # List recent runs

# Watch Mode
bobtester watch --project-id 1     # Auto-run on changes

# Configuration
bobtester config set apiKey xxx    # Set config value
bobtester config get apiKey        # Get config value
```

### Phase 4: CI/CD Integrations (Priority: MEDIUM)

#### 4.1 GitHub Actions

**File: `.github/actions/bobtester/action.yml`**

```yaml
name: "BobTester Security Tests"
description: "Run automated security tests with BobTester"
branding:
  icon: "shield"
  color: "blue"

inputs:
  api-key:
    description: "BobTester API Key"
    required: true
  project-id:
    description: "Project ID to run"
    required: true
  fail-on-vulnerabilities:
    description: "Fail build if vulnerabilities found"
    required: false
    default: "true"
  timeout:
    description: "Timeout in milliseconds"
    required: false
    default: "300000"

outputs:
  results:
    description: "Test results JSON"
  vulnerabilities-found:
    description: "Number of vulnerabilities detected"

runs:
  using: "node20"
  main: "dist/index.js"
```

**Implementation:**

```typescript
// actions/github/src/index.ts
import * as core from "@actions/core";
import { BobTester } from "@bobtester/sdk";

async function run() {
  try {
    const apiKey = core.getInput("api-key", { required: true });
    const projectId = parseInt(core.getInput("project-id", { required: true }));
    const failOnVulnerabilities =
      core.getInput("fail-on-vulnerabilities") === "true";

    const client = new BobTester({ apiKey });

    core.info("Starting BobTester security tests...");
    const result = await client.projects.run(projectId);

    const finalResult = await client.runs.waitForSuiteCompletion(
      result.suiteRunId,
    );

    core.setOutput("results", JSON.stringify(finalResult));
    core.setOutput("vulnerabilities-found", finalResult.vulnerabilitiesFound);

    if (failOnVulnerabilities && finalResult.vulnerabilitiesFound > 0) {
      core.setFailed(
        `Found ${finalResult.vulnerabilitiesFound} vulnerabilities`,
      );
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

#### 4.2 GitLab CI Component

**File: `gitlab-ci-component.yml`**

```yaml
spec:
  inputs:
    api_key:
      type: string
    project_id:
      type: string
    fail_on_vulnerabilities:
      type: boolean
      default: true
---
bobtester:
  image: node:18
  script:
    - npm install -g @bobtester/cli
    - |
      bobtester run --project-id $[[ inputs.project_id ]] \
        --api-key $[[ inputs.api_key ]] \
        --fail-on-vulnerabilities=$[[ inputs.fail_on_vulnerabilities ]]
  artifacts:
    reports:
      junit: bobtester-results.xml
```

### Phase 5: Test-as-Code Format (Priority: LOW)

#### 5.1 YAML Schema Definition

**File: `schemas/test-case.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "targetUrl", "steps"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Test case name"
    },
    "targetUrl": {
      "type": "string",
      "format": "uri"
    },
    "projectId": {
      "type": "integer"
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["action"],
        "properties": {
          "action": {
            "enum": ["goto", "fill", "click", "verify"]
          },
          "selector": {
            "type": "string"
          },
          "value": {
            "type": "string"
          }
        }
      }
    },
    "assets": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "data"],
        "properties": {
          "name": {
            "type": "string"
          },
          "data": {
            "type": "object"
          },
          "vulnerabilityType": {
            "enum": ["XSS", "SQLi", "CSRF", "IDOR"]
          }
        }
      }
    }
  }
}
```

## Implementation Timeline

### Week 1: Foundation

- [ ] Day 1-2: API Key management system
- [ ] Day 3-4: Enhanced webhook system
- [ ] Day 5-7: Core SDK package (client, auth, basic resources)

### Week 2: SDK & CLI

- [ ] Day 1-3: Complete SDK resources (projects, assets, webhooks)
- [ ] Day 4-5: CLI tool basic commands
- [ ] Day 6-7: CLI advanced features (watch mode, config)

### Week 3: CI/CD & Polish

- [ ] Day 1-2: GitHub Actions integration
- [ ] Day 3-4: GitLab CI component
- [ ] Day 5: Test-as-code YAML parser
- [ ] Day 6-7: Documentation and examples

## Testing Strategy

### Unit Tests

- SDK: Test each resource method
- CLI: Test command parsing and execution
- API: Test new endpoints

### Integration Tests

- End-to-end SDK workflows
- CLI command execution
- Webhook delivery

### Demo Scenarios

1. **Quick Start**: Install SDK, run first test
2. **CI/CD Integration**: GitHub Actions workflow
3. **Webhook Notifications**: Real-time Slack alerts
4. **Batch Execution**: Run 10 tests in parallel

## Success Metrics

### Technical Metrics

- SDK package size < 100KB
- API response time < 200ms
- Test execution time < 30s
- Webhook delivery success rate > 99%

### User Experience Metrics

- Time to first test: < 5 minutes
- Documentation completeness: 100%
- Example coverage: All major use cases
- Error messages: Clear and actionable

## Hackathon Presentation Strategy

### Demo Flow (5 minutes)

1. **Problem Statement** (30s): Manual testing is slow and error-prone
2. **Solution Overview** (30s): BobTester SDK makes testing automatic
3. **Live Demo** (3m):
   - Install SDK: `npm install @bobtester/sdk`
   - Run test from code
   - Show GitHub Actions integration
   - Trigger webhook notification
4. **Impact** (1m): Show metrics, scalability, enterprise readiness

### Key Talking Points

- **Developer-First**: Built for developers, by developers
- **Enterprise-Ready**: API keys, webhooks, CI/CD integrations
- **Scalable**: Batch execution, parallel testing
- **Secure**: API key management, webhook signatures
- **Well-Documented**: Complete API reference, examples

## Next Steps

1. **Review this plan** with your team
2. **Prioritize features** based on hackathon timeline
3. **Start with Phase 1** (Backend API enhancements)
4. **Build incrementally** - each phase adds value
5. **Test continuously** - ensure quality at each step

## Questions to Consider

1. Which CI/CD platform is most important for your target users?
2. Should we support other languages (Python SDK, Go SDK)?
3. What webhook events are most valuable?
4. Should we add a visual test builder in the web UI?
5. Do we need a marketplace for test templates?

## Resources

- [SDK Architecture Details](sdk-architecture.md)
- [API Endpoints](endpoint.md)
- [Flow Diagrams](flow.md)
- [Data Schemas](schemas.md)
