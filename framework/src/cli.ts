#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
🤖 BobTester CLI - Automation Framework

Usage:
  bob init                 Initialize a new test project structure
  bob run <testName>       Run a specific test suite (e.g. bob run test1)
  bob run --all            Run all test suites (test1, test2, etc.)
  bob --help               Show this help message
`);
}

async function handleInit() {
  const cwd = process.cwd();
  console.log(`🔨 Initializing BobTester project in: ${cwd}\n`);

  const dirs = ["utils", "data", "test1", "test2", "screenshots"];
  dirs.forEach((d) => {
    const p = path.join(cwd, d);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
      console.log(`  📁 Created: ${d}/`);
    }
  });

  const configPath = path.join(cwd, "bobtester.config.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          browserless: {
            apiKey: process.env.BROWSERLESS_API_KEY || "",
            endpoint: "wss://chrome.browserless.io",
            timeout: 30000,
          },
          headless: true,
          slowMo: 100,
          datasets: "./data/datasets.json",
          screenshotsDir: "./screenshots",
        },
        null,
        2
      )
    );
    console.log(`  📄 Created: bobtester.config.json`);
  }

  const datasetPath = path.join(cwd, "data", "datasets.json");
  if (!fs.existsSync(datasetPath)) {
    fs.writeFileSync(
      datasetPath,
      JSON.stringify(
        {
          lalala1: {
            username: "standard_user",
            password: "secret_sauce",
            targetUrl: "https://www.saucedemo.com",
          },
          lalala_locked: {
            username: "locked_out_user",
            password: "secret_sauce",
            is_negative: true,
          },
        },
        null,
        2
      )
    );
    console.log(`  📄 Created: data/datasets.json`);
  }

  const commonPath = path.join(cwd, "utils", "common.js");
  if (!fs.existsSync(commonPath)) {
    fs.writeFileSync(
      commonPath,
      `const { bob } = require('bobtester');

const common = {
  async login(datasetName = 'lalala1') {
    // Select active dataset for variable substitution
    bob.useDataset(datasetName);

    const target = bob.get('targetUrl') || 'https://www.saucedemo.com';
    await bob.goto(target);
    await bob.fill('#user-name', '[username]');
    await bob.fill('#password', '[password]');
    await bob.click('#login-button');
    await bob.waitForTimeout(500);
  },

  async logout() {
    await bob.click('#react-burger-menu-btn');
    await bob.waitForTimeout(400);
    await bob.click('#logout_sidebar_link');
    await bob.waitForTimeout(500);
  }
};

module.exports = common;
`
    );
    console.log(`  📄 Created: utils/common.js`);
  }

  const test1Path = path.join(cwd, "test1", "main.js");
  if (!fs.existsSync(test1Path)) {
    fs.writeFileSync(
      test1Path,
      `const { bob } = require('bobtester');
const common = require('../utils/common');

bob.run(async () => {
  console.log("▶ Step 1: Performing login using common module");
  await common.login('lalala1');

  console.log("▶ Step 2: Taking screenshot");
  await bob.screenshot('dashboard_view');

  console.log("▶ Step 3: Logging out cleanly");
  await common.logout();
});
`
    );
    console.log(`  📄 Created: test1/main.js`);
  }

  console.log(`\n✅ BobTester project initialized successfully!`);
  console.log(`👉 Run your first test with: npx bob run test1\n`);
}

async function runScript(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n======================================================`);
    console.log(`🚀 Running Suite: ${path.relative(process.cwd(), filePath)}`);
    console.log(`======================================================\n`);

    const child = spawn(process.execPath, [filePath], {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });

    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function handleRun(target?: string) {
  const cwd = process.cwd();

  if (target && target !== "--all") {
    // Run specific suite
    let scriptPath = path.join(cwd, target);
    if (!fs.existsSync(scriptPath) || fs.statSync(scriptPath).isDirectory()) {
      scriptPath = path.join(cwd, target, "main.js");
    }

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Could not find test script at: ${target} or ${target}/main.js`);
      process.exit(1);
    }

    const success = await runScript(scriptPath);
    process.exit(success ? 0 : 1);
  } else {
    // Run all suites
    const entries = fs.readdirSync(cwd, { withFileTypes: true });
    const testScripts: string[] = [];

    entries.forEach((entry) => {
      if (entry.isDirectory() && entry.name.startsWith("test")) {
        const potentialMain = path.join(cwd, entry.name, "main.js");
        if (fs.existsSync(potentialMain)) {
          testScripts.push(potentialMain);
        }
      }
    });

    if (testScripts.length === 0) {
      console.log(`⚠️ No test suites found (e.g. test1/main.js). Run 'bob init' first.`);
      process.exit(0);
    }

    console.log(`📋 Found ${testScripts.length} test suite(s) to execute.\n`);
    let passed = 0;
    let failed = 0;

    for (const script of testScripts) {
      const ok = await runScript(script);
      if (ok) passed++;
      else failed++;
    }

    console.log(`\n======================================================`);
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed out of ${testScripts.length}`);
    console.log(`======================================================\n`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

if (!command || command === "--help" || command === "-h") {
  printHelp();
} else if (command === "init") {
  handleInit();
} else if (command === "run") {
  handleRun(args[1]);
} else {
  // If user typed 'bob test1', treat it as 'bob run test1'
  handleRun(command);
}
