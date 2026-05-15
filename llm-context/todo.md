# Project Roadmap & TODO: BobTester Security Edition

This list tracks the transformation of BobTester into an AI-driven Vulnerability Prober.

## Phase 1: Foundation (Completed)
- [x] **Database Schema**: Users, cases, assets, and runs.
- [x] **Auth System**: Backend JWT + Frontend state.
- [x] **Basic Recording**: Paste and save Playwright steps.
- [x] **Manual Assets**: Parameterize flows with user data.
- [x] **Dynamic Runner**: Core execution logic for happy-path flows.

## Phase 2: Vulnerability Mapping & Documentation (Current)
- [ ] **Context Refresh**: Update all `llm-context` files for security focus.
- [ ] **Vulnerability Definitions**: Map OWASP Top 10 to Playwright actions.
- [ ] **Payload Schemas**: Define how Bob delivers security probes.

## Phase 3: Security Payload Generation (Bob AI)
- [ ] **Payload Engine**: `POST /api/bob/probe` returns field-specific payloads (XSS, SQLi).
- [ ] **Contextual Probing**: Bob analyzes field names (e.g., "email", "search") to pick the best attack vectors.
- [ ] **Bulk Asset Creation**: Generate 10+ security variants for a single recorded case.

## Phase 4: Active Detection (Runner Enhancements) (Completed)
- [x] **XSS Sniffer**: Listen for `alert()`, `confirm()`, or specific console tokens.
- [x] **SQLi Hunter**: Scan response bodies for DB error patterns (MySQL/PostgreSQL).
- [x] **Security Status**: Mark runs as `SAFE`, `WARNING`, or `VULNERABLE`.
- [ ] **Time-Based Detection**: Measure latency spikes for blind SQLi/OS Injection.

## Phase 6: Bob AI "Prompt-to-Automation" (Completed)
- [x] **Page Discovery**: Playwright scans target URL for interactive elements and ARIA roles.
- [x] **Step Generation**: Llama3 generates Playwright `internal:role` locators based on the goal.
- [x] **Assertions**: Add `verify` action support (URL match, Text OR matching) in Playwright service.
- [x] **Two-Step Workflow**: Generate preview -> User edits -> Save & Run.

## Phase 5: Security Dashboard
- [ ] **Vulnerability Report**: New UI to see *where* and *how* a script was broken.
- [ ] **Screenshot Proof**: Highlight the exact moment a security probe succeeded.
- [ ] **Remediation**: Use Bob to explain the fix for the detected vulnerability.
