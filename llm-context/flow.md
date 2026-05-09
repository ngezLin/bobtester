┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                         │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌─────────────┐  │
│  │ Record  │→ │  Cases   │→ │ Assets  │→ │ Run / Report│  │
│  │  Page   │  │  Page    │  │  Page   │  │   Page      │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬──────┘  │
│       │            │             │              │          │
│       └────────────┴─────────────┴──────────────┘          │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │ API calls
┌────────────────────┼────────────────────────────────────────┐
│  BACKEND (Express)   │                                        │
│  ┌─────────────────┴────────────────────────────────────┐ │
│  │  POST /api/record  →  launches codegen (server-side)   │ │
│  │  POST /api/cases   →  save parsed steps to DB          │ │
│  │  GET  /api/cases   →  list user's recorded cases        │ │
│  │  POST /api/assets/:caseId → save test data sets        │ │
│  │  POST /api/run     →  execute case with chosen asset    │ │
│  │  GET  /api/runs    →  execution history + screenshots   │ │
│  │  POST /api/bob     →  send steps to Bob, get assets    │ │
│  └────────────────────────────────────────────────────────┘ │
│                    │                                        │
│  ┌─────────────────┴────────────────────────────────────┐ │
│  │  PLAYWRIGHT SERVICE                                    │ │
│  │  - Reads steps JSON from DB                            │ │
│  │  - Replaces [vars] with asset values                   │ │
│  │  - Executes dynamically: goto → fill → click → screenshot│ │
│  └────────────────────────────────────────────────────────┘ │
│                    │                                        │
│  ┌─────────────────┴────────────────────────────────────┐ │
│  │  BOB AI SERVICE (simple HTTP call to Bob API)         │ │
│  │  - Input:  { steps: [...] }                           │ │
│  │  - Output: { assets: [{name, data, is_negative}] }    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘