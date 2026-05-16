# Project Roadmap & TODO

This list tracks the development of BobTester platform features.

## Phase 1: Foundation (Completed)

- [x] **Database Schema**: Users, projects, cases, assets, and runs
- [x] **Auth System**: Backend JWT + Frontend state
- [x] **Basic Recording**: Paste and save Playwright steps
- [x] **Manual Assets**: Parameterize flows with user data
- [x] **Dynamic Runner**: Core execution logic with Browserless.io
- [x] **Security Detection**: XSS, SQLi, and vulnerability scanning
- [x] **Project CRUD**: Create, Read, Update, Delete projects in UI
- [x] **Folder Organization**: Group test cases into folders within projects
- [x] **Batch Runner**: Execute all cases in a project concurrently

## Phase 2: Refinement (Current)

- [ ] **Robust JSON Handling**: Ensure steps and assets are saved/parsed correctly (In Progress)
- [ ] **Improved Record UI**: Easier project/folder selection during recording (Completed)
- [ ] **Error Visualizer**: Better logs and failure screenshots in Dashboard
- [ ] **Data Set Templates**: Pre-configured security payloads for quick testing
- [ ] **Search & Filter**: Find test cases quickly across projects

## Phase 3: Advanced Reporting & Analytics

- [ ] **Dashboard Metrics**: Trends of pass/fail and vulnerabilities found
- [ ] **PDF/HTML Export**: Generate shareable reports for stakeholders
- [ ] **Execution History**: Detailed timeline of project performance
- [ ] **Screenshot Comparison**: Visual regression testing (Basic)

## Phase 4: Integrations & Automation

- [ ] **Webhook Notifications**: Send results to Slack/Discord on suite completion
- [ ] **Environment Configs**: Support for testing against multiple URLs (dev/staging/prod)
- [ ] **Scheduled Runs**: Run project suites on a timer (Daily/Hourly)
- [ ] **Status Badges**: Project health badges for internal documentation

## Phase 5: Developer Experience

- [ ] **Export to Playwright**: Download test cases as valid Playwright JS files
- [ ] **Step Reordering**: Drag-and-drop to reorder recorded steps
- [ ] **Conditional Logic**: Simple if/then steps (e.g., skip if element exists)
- [ ] **Cookie/Storage Import**: Session persistence between tests
