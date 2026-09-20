# BobTester

BobTester has two connected parts:

- `framework/` is the reusable Playwright automation framework.
- `client/` is a working test project that contains the GUI, scripts, data, and generated reports.

## Project Layout

```text
framework/
  src/                 TypeScript framework source
  dist/                Compiled JavaScript package output

client/
  gui/
    app/               Next.js web interface
    server/            Express API server
  script/
    projects/          Standalone test entrypoints
    utils/             Reusable test steps and helpers
  data/                JSON dataset files
  report/
    reports/           Generated Markdown reports
    screenshots/       Generated test screenshots
  bobtester.config.json
  dev.js               Starts the GUI app and API together
```

## How It Works

1. A test script in `client/script/projects` imports `bob` from the framework.
2. The script loads a JSON file from `client/data`.
3. `runActiveRows` loops through the JSON rows.
4. Rows with `status: "Active"` are executed; inactive rows are skipped.
5. The script calls reusable steps from `client/script/utils`.
6. `bob` controls Playwright: navigation, filling fields, clicking, assertions, waits, and screenshots.
7. Screenshots are written to `client/report/screenshots`.
8. When the test finishes, BobTester writes a Markdown report to `client/report/reports`.

## Install

From the repository root:

```bash
npm install
```

The `client` package uses the local framework through:

```json
"bobtester": "file:../framework"
```

Build the framework after changing TypeScript source:

```bash
cd framework
npm run build
```

Edit files in `framework/src`. The files in `framework/dist` are generated JavaScript and declaration output.

## Run The GUI

Start both the Next.js frontend and Express API with one command:

```bash
cd client
npm run dev
```

Open:

- Frontend: `http://localhost:3000`
- API health check: `http://localhost:4000/`

The GUI reads editable JSON files from `client/data`. Open `/cases` to see the files and open a file to edit it.

The GUI uses these environment files:

- `client/gui/server/.env` for API, database, JWT, and Browserless settings.
- `client/gui/app/.env.local` for optional `NEXT_PUBLIC_API_URL` overrides.

Copy values from `client/gui/server/.env.example` when creating the server environment file. Never commit real secrets.

## Run A Standalone Test

Run a test from the client root:

```bash
cd client
node script/projects/pos_make_transaction/pos_make_transaction_userLowerCase.js
```

Other transaction examples are in:

```text
client/script/projects/pos_make_transaction/
```

The scripts connect to Browserless when a Browserless API key is configured. Without a key, the framework falls back to local Playwright Chromium when it is installed.

## Dataset Data

Dataset files contain values used by test steps. For example, `client/data/pos_make_transaction_userLowerCase.json` contains:

```json
{
  "1": {
    "firstName": "john",
    "lastName": "doe",
    "postalCode": "12345",
    "status": "Active"
  },
  "2": {
    "firstName": "john_inactive",
    "lastName": "doe",
    "postalCode": "12345",
    "status": "Inactive"
  }
}
```

The runner creates a unique active dataset key for each row. A step can then use framework interpolation:

```js
bob.useDataset(datasetKey);
await bob.fill("#first-name", "[firstName]");
await bob.fill("#last-name", "[lastName]");
await bob.fill("#postal-code", "[postalCode]");
```

Rows without `status: "Active"` are skipped by `runActiveRows`.

## Test Steps

Reusable steps belong in `client/script/utils`:

- `function/common.js` contains login and logout flows.
- `menu/transactionMenu.js` contains the checkout flow.
- `function/runner.js` loops through active dataset rows.
- `common.js` contains older shared helper functions.

The transaction flow is:

1. Log in to Sauce Demo.
2. Add the backpack to the cart.
3. Open the cart.
4. Open checkout.
5. Fill first name, last name, and postal code.
6. Continue to order overview.
7. Finish the transaction.
8. Log out.

Each important state is checked with `bob.expectVisible` and captured with `bob.screenshot`.

## Assets

There are two types of test input:

- **Local datasets:** JSON rows in `client/data`, used by standalone scripts.
- **GUI test assets:** database-backed records attached to saved GUI test cases. The API exposes them through `/api/assets`, and the GUI uses them when executing saved cases or project suites.

Use local datasets for script-driven tests. Use GUI assets when a test case is saved through the web interface and needs multiple input variations managed by the API/database.

## Reports And Screenshots

The framework reads these paths from `client/bobtester.config.json`:

```json
{
  "datasets": "./data/datasets.json",
  "screenshotsDir": "./report/screenshots",
  "reportsDir": "./report/reports"
}
```

Paths are relative to the directory where the test command runs, normally `client`.

Generated files are not application source:

- screenshots go to `client/report/screenshots`;
- Markdown reports go to `client/report/reports`.

## Build Everything

From the repository root:

```bash
npm run build
```

Or build individual parts:

```bash
npm run framework:build
npm run gui:build
npm run gui:server:build
```

## Troubleshooting

### `Failed to fetch`

Make sure both processes are running and that port `4000` is available:

```bash
cd client
npm run dev
```

If port `3000` is already occupied by an old Next.js process, stop that process before restarting the launcher.

### Invalid or expired token

The browser may have a token created by a different server secret. The GUI clears invalid tokens and redirects to `/login`. Log in again after starting the current server.

### Dataset file not found

Make sure the configured dataset path exists relative to `client`:

```text
client/data/datasets.json
```

For a per-test dataset, load the matching file directly from the test script as the transaction examples do.
