PROJECT: BobTester
HACKATHON: IBM Bob Hackathon (May 15-17, 2026)

WHAT WE'RE BUILDING:
A web app that lets users record browser flows, parameterize test data,
and use IBM Bob AI to auto-generate negative/vulnerability test cases.

CURRENT STATE:
- Backend: Express + MySQL + Playwright (basic runner exists)
- Frontend: Next.js (single page, needs expansion)
- Has: screenshot capture, logging, basic DB
- Missing: auth, dynamic runner, case/asset storage, Bob integration

TARGET DEMO FLOW:
1. User logs in
2. User goes to /record, enters URL, clicks "Start Recording"
   → Playwright codegen opens on server
3. User performs flow, copies generated steps, pastes into form
   → Saves as "test_case" with steps JSON
4. User goes to /cases, clicks case, clicks "Ask Bob"
   → Bob analyzes steps, suggests negative assets
   → Assets saved to DB
5. User selects case + asset, clicks "Run"
   → Dynamic Playwright runner executes steps with asset data
   → Screenshot + pass/fail saved
6. User views /runs to see results

TECH STACK:
- Frontend: Next.js 16, React 19, Tailwind CSS v4
- Backend: Express 5, TypeScript, MySQL2
- Automation: Playwright
- AI: IBM Bob API

DB TABLES (Simplified):
- users(id, email, password_hash)
- test_cases(id, user_id, name, target_url, steps JSON) 
  -- steps: [{action: 'goto'|'fill'|'click', selector?: string, value?: string}]
- test_assets(id, case_id, name, data JSON, is_negative)
  -- data: { "fieldName": "value" }
- test_runs(id, user_id, case_id, asset_id, status, execution_time, screenshot_path, logs JSON, created_at)

API ENDPOINTS NEEDED:
POST /api/auth/register
POST /api/auth/login
POST /api/record (existing)
POST /api/cases
GET /api/cases
POST /api/cases/:id/assets
POST /api/run
POST /api/bob
GET /api/runs

FRONTEND PAGES NEEDED:
/ - Login/Register
/record - Start recording, save case
/cases - List cases, view steps, add assets, ask Bob
/runs - Execute and view results

BOB INTEGRATION:
POST /api/bob receives {steps: [...]}
Sends prompt to Bob API asking for negative test assets
Returns {assets: [...]} which we save to test_assets