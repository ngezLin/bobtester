# BobTester SDK Architecture

## Overview

The BobTester SDK provides a comprehensive developer experience for integrating automated testing into any workflow. This document outlines the architecture, components, and integration patterns.

## Package Structure

```
@bobtester/
├── sdk/                    # Core SDK package
│   ├── src/
│   │   ├── client.ts      # Main BobTester client
│   │   ├── auth.ts        # Authentication manager
│   │   ├── resources/     # API resource managers
│   │   │   ├── cases.ts
│   │   │   ├── runs.ts
│   │   │   ├── projects.ts
│   │   │   ├── assets.ts
│   │   │   └── webhooks.ts
│   │   ├── types.ts       # TypeScript definitions
│   │   ├── errors.ts      # Custom error classes
│   │   └── utils.ts       # Helper utilities
│   └── package.json
│
├── cli/                    # CLI tool package
│   ├── src/
│   │   ├── commands/      # CLI commands
│   │   │   ├── login.ts
│   │   │   ├── run.ts
│   │   │   ├── create.ts
│   │   │   └── list.ts
│   │   ├── config.ts      # Config file handling
│   │   └── index.ts       # CLI entry point
│   └── package.json
│
└── actions/                # CI/CD integrations
    ├── github/            # GitHub Actions
    ├── gitlab/            # GitLab CI component
    └── jenkins/           # Jenkins plugin
```

## Core SDK Usage

### Installation

```bash
npm install @bobtester/sdk
# or
yarn add @bobtester/sdk
```

### Basic Usage

```typescript
import { BobTester } from "@bobtester/sdk";

// Initialize client
const client = new BobTester({
  apiKey: process.env.BOBTESTER_API_KEY,
  baseUrl: "https://api.bobtester.com", // optional
});

// Run a test
const result = await client.runs.execute({
  caseId: 123,
  assetId: 456,
});

console.log(`Test ${result.status}: ${result.executionTime}ms`);
```

### Advanced Usage

```typescript
// Create a new test case
const testCase = await client.cases.create({
  name: "Login Flow Test",
  targetUrl: "https://example.com/login",
  projectId: 1,
  steps: [
    { action: "goto", value: "https://example.com/login" },
    { action: "fill", selector: "#username", value: "[username]" },
    { action: "fill", selector: "#password", value: "[password]" },
    { action: "click", selector: 'button[type="submit"]' },
    { action: "verify", selector: "text: Welcome" },
  ],
});

// Add test data
const asset = await client.assets.create(testCase.id, {
  name: "Valid Credentials",
  data: {
    username: "testuser",
    password: "testpass123",
  },
});

// Execute the test
const run = await client.runs.execute({
  caseId: testCase.id,
  assetId: asset.id,
});

// Wait for completion
const finalResult = await client.runs.waitForCompletion(run.id, {
  timeout: 60000,
  pollInterval: 2000,
});

if (finalResult.vulnerabilities.length > 0) {
  console.error("Vulnerabilities detected:", finalResult.vulnerabilities);
  process.exit(1);
}
```

## CLI Tool Usage

### Installation

```bash
npm install -g @bobtester/cli
```

### Commands

```bash
# Login and save API key
bobtester login

# Run a specific test
bobtester run --case-id 123 --asset-id 456

# Run all tests in a project
bobtester run --project-id 1

# Create a test from YAML
bobtester create --file test.yml

# List all test cases
bobtester list cases

# Watch mode (auto-run on changes)
bobtester watch --project-id 1
```

### Configuration File

Create `bobtester.yml` in your project root:

```yaml
version: 1
apiKey: ${BOBTESTER_API_KEY}
projectId: 1

tests:
  - name: Login Test
    targetUrl: https://example.com/login
    steps:
      - action: goto
        value: https://example.com/login
      - action: fill
        selector: "#username"
        value: "[username]"
      - action: fill
        selector: "#password"
        value: "[password]"
      - action: click
        selector: button[type="submit"]
      - action: verify
        selector: "text: Welcome"

    assets:
      - name: Valid User
        data:
          username: testuser
          password: testpass123

      - name: XSS Probe
        data:
          username: "<script>alert('XSS')</script>"
          password: "test"
        vulnerabilityType: XSS

ci:
  runOn:
    - push
    - pull_request
  failOn:
    - vulnerabilities
    - failures
  notifications:
    slack: ${SLACK_WEBHOOK_URL}
```

## GitHub Actions Integration

### Setup

Create `.github/workflows/bobtester.yml`:

```yaml
name: BobTester Security Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run BobTester Tests
        uses: bobtester/github-action@v1
        with:
          api-key: ${{ secrets.BOBTESTER_API_KEY }}
          project-id: 1
          fail-on-vulnerabilities: true

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: bobtester-results
          path: bobtester-results.json
```

### Action Configuration

```yaml
# Advanced configuration
- uses: bobtester/github-action@v1
  with:
    api-key: ${{ secrets.BOBTESTER_API_KEY }}
    project-id: 1
    environment: staging
    config-file: bobtester.yml
    fail-on-vulnerabilities: true
    fail-on-failures: true
    timeout: 300000
    parallel: true
    slack-webhook: ${{ secrets.SLACK_WEBHOOK }}
```

## GitLab CI Integration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test

bobtester:
  stage: test
  image: node:18
  script:
    - npm install -g @bobtester/cli
    - bobtester run --project-id $PROJECT_ID
  variables:
    BOBTESTER_API_KEY: $BOBTESTER_API_KEY
    PROJECT_ID: "1"
  only:
    - main
    - merge_requests
  artifacts:
    reports:
      junit: bobtester-results.xml
    paths:
      - bobtester-results.json
```

## Webhook Integration

### Subscribe to Events

```typescript
// Subscribe to webhook events
const webhook = await client.webhooks.subscribe({
  url: "https://your-app.com/webhooks/bobtester",
  events: ["run.completed", "vulnerability.detected"],
  projectId: 1,
});

console.log("Webhook ID:", webhook.id);
```

### Webhook Payload

When a test completes, BobTester sends a POST request:

```json
{
  "event": "run.completed",
  "timestamp": "2026-05-16T05:30:00Z",
  "data": {
    "runId": 789,
    "caseId": 123,
    "projectId": 1,
    "status": "vulnerable",
    "executionTime": 4500,
    "vulnerabilities": [
      {
        "type": "XSS",
        "severity": "HIGH",
        "evidence": "Alert dialog detected",
        "stepIndex": 2
      }
    ],
    "screenshotUrl": "https://api.bobtester.com/screenshots/run-789.png"
  }
}
```

### Webhook Handler Example

```typescript
import express from "express";
import crypto from "crypto";

const app = express();

app.post("/webhooks/bobtester", express.json(), (req, res) => {
  // Verify webhook signature
  const signature = req.headers["x-bobtester-signature"];
  const payload = JSON.stringify(req.body);
  const secret = process.env.WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSignature) {
    return res.status(401).send("Invalid signature");
  }

  // Handle the event
  const { event, data } = req.body;

  if (event === "run.completed") {
    if (data.status === "vulnerable") {
      // Send alert to team
      notifyTeam(`Vulnerability detected in test ${data.caseId}`);
    }
  }

  res.status(200).send("OK");
});
```

## API Client Architecture

### Resource Pattern

Each resource (cases, runs, projects, etc.) follows a consistent pattern:

```typescript
class CasesResource {
  constructor(private client: BobTesterClient) {}

  async list(params?: ListParams): Promise<TestCase[]> {
    return this.client.request("GET", "/api/cases", { params });
  }

  async get(id: number): Promise<TestCase> {
    return this.client.request("GET", `/api/cases/${id}`);
  }

  async create(data: CreateCaseData): Promise<TestCase> {
    return this.client.request("POST", "/api/cases", { data });
  }

  async update(id: number, data: UpdateCaseData): Promise<TestCase> {
    return this.client.request("PUT", `/api/cases/${id}`, { data });
  }

  async delete(id: number): Promise<void> {
    return this.client.request("DELETE", `/api/cases/${id}`);
  }
}
```

### Error Handling

```typescript
import {
  BobTesterError,
  AuthenticationError,
  RateLimitError,
} from "@bobtester/sdk";

try {
  const result = await client.runs.execute({ caseId: 123 });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limit exceeded, retry after:", error.retryAfter);
  } else if (error instanceof BobTesterError) {
    console.error("API error:", error.message);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### Retry Logic

```typescript
const client = new BobTester({
  apiKey: process.env.BOBTESTER_API_KEY,
  retry: {
    maxRetries: 3,
    retryDelay: 1000,
    retryOn: [408, 429, 500, 502, 503, 504],
  },
});
```

## Test-as-Code Format

### YAML Format

```yaml
name: E-commerce Checkout Flow
targetUrl: https://shop.example.com
projectId: 1

steps:
  - action: goto
    value: https://shop.example.com

  - action: click
    selector: role=button[name="Add to Cart"]

  - action: click
    selector: role=link[name="Checkout"]

  - action: fill
    selector: "#email"
    value: "[email]"

  - action: fill
    selector: "#card-number"
    value: "[card_number]"

  - action: click
    selector: role=button[name="Complete Purchase"]

  - action: verify
    selector: "text: Order Confirmed"

assets:
  - name: Valid Purchase
    data:
      email: customer@example.com
      card_number: "4111111111111111"

  - name: XSS in Email
    data:
      email: "<script>alert('XSS')</script>"
      card_number: "4111111111111111"
    vulnerabilityType: XSS

  - name: SQLi in Card
    data:
      email: customer@example.com
      card_number: "' OR 1=1--"
    vulnerabilityType: SQLi
```

### JSON Format

```json
{
  "name": "E-commerce Checkout Flow",
  "targetUrl": "https://shop.example.com",
  "projectId": 1,
  "steps": [
    {
      "action": "goto",
      "value": "https://shop.example.com"
    },
    {
      "action": "click",
      "selector": "role=button[name=\"Add to Cart\"]"
    },
    {
      "action": "fill",
      "selector": "#email",
      "value": "[email]"
    }
  ],
  "assets": [
    {
      "name": "Valid Purchase",
      "data": {
        "email": "customer@example.com",
        "card_number": "4111111111111111"
      }
    }
  ]
}
```

## Integration Patterns

### Pattern 1: Pre-deployment Testing

```typescript
// In your deployment script
import { BobTester } from "@bobtester/sdk";

async function deployWithTests() {
  // Deploy to staging
  await deployToStaging();

  // Run security tests
  const client = new BobTester({ apiKey: process.env.BOBTESTER_API_KEY });
  const result = await client.projects.run(1, { environment: "staging" });

  // Wait for completion
  const finalResult = await client.runs.waitForSuiteCompletion(
    result.suiteRunId,
  );

  if (finalResult.vulnerabilitiesFound > 0) {
    console.error("Vulnerabilities detected, rolling back...");
    await rollbackDeployment();
    process.exit(1);
  }

  // Deploy to production
  await deployToProduction();
}
```

### Pattern 2: Scheduled Testing

```typescript
// Cron job or scheduled task
import { BobTester } from "@bobtester/sdk";
import cron from "node-cron";

const client = new BobTester({ apiKey: process.env.BOBTESTER_API_KEY });

// Run tests every day at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("Running scheduled security tests...");

  const result = await client.projects.run(1);
  const finalResult = await client.runs.waitForSuiteCompletion(
    result.suiteRunId,
  );

  if (finalResult.vulnerabilitiesFound > 0) {
    await sendAlertToTeam(finalResult);
  }
});
```

### Pattern 3: Development Workflow

```typescript
// In your test suite
import { BobTester } from "@bobtester/sdk";
import { describe, it, expect } from "vitest";

describe("Security Tests", () => {
  const client = new BobTester({ apiKey: process.env.BOBTESTER_API_KEY });

  it("should not have XSS vulnerabilities", async () => {
    const result = await client.runs.execute({
      caseId: 123,
      assetId: 456, // XSS payload asset
    });

    expect(result.vulnerabilities).toHaveLength(0);
  });

  it("should not have SQLi vulnerabilities", async () => {
    const result = await client.runs.execute({
      caseId: 123,
      assetId: 457, // SQLi payload asset
    });

    expect(result.vulnerabilities).toHaveLength(0);
  });
});
```

## Performance Considerations

### Parallel Execution

```typescript
// Run multiple tests in parallel
const results = await Promise.all([
  client.runs.execute({ caseId: 1, assetId: 1 }),
  client.runs.execute({ caseId: 2, assetId: 2 }),
  client.runs.execute({ caseId: 3, assetId: 3 }),
]);

// Or use batch API
const batch = await client.sdk.batch({
  runs: [
    { caseId: 1, assetId: 1 },
    { caseId: 2, assetId: 2 },
    { caseId: 3, assetId: 3 },
  ],
});

const batchResult = await client.sdk.waitForBatch(batch.batchId);
```

### Caching

```typescript
const client = new BobTester({
  apiKey: process.env.BOBTESTER_API_KEY,
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 100,
  },
});
```

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate API keys regularly** - Generate new keys periodically
3. **Use webhook secrets** - Verify webhook signatures
4. **Limit API key permissions** - Create keys with minimal required permissions
5. **Monitor API usage** - Track API calls and set up alerts
6. **Use HTTPS only** - Never send API keys over HTTP
7. **Implement rate limiting** - Handle rate limit errors gracefully

## Next Steps

1. Review the [endpoint documentation](endpoint.md) for complete API reference
2. Check [flow diagrams](flow.md) for visual architecture
3. See [schemas](schemas.md) for data structures
4. Read [vulnerability mapping](vulnerability_mapping.md) for security detection details
