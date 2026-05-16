# Project Roadmap & TODO: BobTester SDK Edition

This list tracks the development of BobTester's SDK and developer integration features.

## Phase 1: Foundation (Completed)

- [x] **Database Schema**: Users, projects, cases, assets, and runs
- [x] **Auth System**: Backend JWT + Frontend state
- [x] **Basic Recording**: Paste and save Playwright steps
- [x] **Manual Assets**: Parameterize flows with user data
- [x] **Dynamic Runner**: Core execution logic with Browserless.io
- [x] **Security Detection**: XSS, SQLi, and vulnerability scanning
- [x] **Webhook System**: Basic webhook trigger for projects

## Phase 2: SDK Development (Current)

- [ ] **API Key Management**: Generate, list, and revoke API keys
- [ ] **SDK Package Structure**: Create `@bobtester/sdk` npm package
- [ ] **Core SDK Client**: Implement main client with authentication
- [ ] **Resource Managers**: Cases, Runs, Projects, Assets APIs
- [ ] **TypeScript Definitions**: Full type safety for SDK
- [ ] **Error Handling**: Comprehensive error types and handling
- [ ] **Retry Logic**: Automatic retry for failed requests
- [ ] **Rate Limiting**: Handle API rate limits gracefully

## Phase 3: CLI Tool

- [ ] **CLI Package**: Create `@bobtester/cli` npm package
- [ ] **Authentication**: Login and API key management
- [ ] **Test Execution**: Run tests from command line
- [ ] **Test Creation**: Create tests via CLI
- [ ] **Configuration**: Support for config files (bobtester.yml)
- [ ] **Output Formatting**: JSON, table, and pretty-print formats
- [ ] **Watch Mode**: Auto-run tests on file changes

## Phase 4: CI/CD Integrations

- [ ] **GitHub Actions**: Create reusable action
- [ ] **GitLab CI**: Create CI component
- [ ] **Jenkins Plugin**: Basic Jenkins integration
- [ ] **Webhook Enhancements**: Subscribe/unsubscribe endpoints
- [ ] **Event System**: Real-time notifications for test events
- [ ] **Status Badges**: Generate status badges for README

## Phase 5: Test-as-Code Format

- [ ] **YAML Schema**: Define test case YAML format
- [ ] **JSON Schema**: Define test case JSON format
- [ ] **Parser**: Parse YAML/JSON into test cases
- [ ] **Validator**: Validate test configurations
- [ ] **Examples**: Create example test files
- [ ] **Documentation**: Document format specification

## Phase 6: Enhanced Features

- [ ] **Batch Execution**: Run multiple tests in parallel
- [ ] **Test Suites**: Group tests into suites
- [ ] **Environment Variables**: Support for env-specific configs
- [ ] **Secrets Management**: Secure handling of sensitive data
- [ ] **Reporting**: Generate HTML/PDF test reports
- [ ] **Metrics**: Track test execution metrics over time

## Phase 7: Documentation & Examples

- [ ] **SDK Documentation**: Complete API reference
- [ ] **Getting Started Guide**: Quick start tutorial
- [ ] **Integration Examples**: Sample projects for each CI/CD platform
- [ ] **Best Practices**: Guide for writing maintainable tests
- [ ] **Video Tutorials**: Screen recordings of common workflows
- [ ] **API Playground**: Interactive API documentation
