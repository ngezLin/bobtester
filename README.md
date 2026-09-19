# BobTester

BobTester is organized as a small npm workspace with two products:

- `framework/` — the Playwright-based automation framework distributed to test clients.
- `gui/` — the engineer-facing application for converting Chrome Recorder scripts, maintaining tests, datasets, and assets.
  - `gui/app/` is the Next.js editor interface.
  - `gui/server/` is the API used by the editor and test execution features.

The client project remains independent and can consume the local framework package with `"bobtester": "file:../bobtester/framework"`.

## Commands

```powershell
npm install
npm run gui:server  # starts the GUI API on port 4000
npm run gui:dev     # starts the GUI app on port 3000
npm run build       # builds the framework and both GUI packages
```

Create configuration files from `gui/server/.env.example` and use
`gui/app/.env.local` for `NEXT_PUBLIC_API_URL` when required.
