#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
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
        const p = path_1.default.join(cwd, d);
        if (!fs_1.default.existsSync(p)) {
            fs_1.default.mkdirSync(p, { recursive: true });
            console.log(`  📁 Created: ${d}/`);
        }
    });
    const configPath = path_1.default.join(cwd, "bobtester.config.json");
    if (!fs_1.default.existsSync(configPath)) {
        fs_1.default.writeFileSync(configPath, JSON.stringify({
            browserless: {
                apiKey: process.env.BROWSERLESS_API_KEY || "",
                endpoint: "wss://chrome.browserless.io",
                timeout: 30000,
            },
            headless: true,
            slowMo: 100,
            datasets: "./data/datasets.json",
            screenshotsDir: "./screenshots",
        }, null, 2));
        console.log(`  📄 Created: bobtester.config.json`);
    }
    const datasetPath = path_1.default.join(cwd, "data", "datasets.json");
    if (!fs_1.default.existsSync(datasetPath)) {
        fs_1.default.writeFileSync(datasetPath, JSON.stringify({
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
        }, null, 2));
        console.log(`  📄 Created: data/datasets.json`);
    }
    const commonPath = path_1.default.join(cwd, "utils", "common.js");
    if (!fs_1.default.existsSync(commonPath)) {
        fs_1.default.writeFileSync(commonPath, `const { bob } = require('bobtester');

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
`);
        console.log(`  📄 Created: utils/common.js`);
    }
    const test1Path = path_1.default.join(cwd, "test1", "main.js");
    if (!fs_1.default.existsSync(test1Path)) {
        fs_1.default.writeFileSync(test1Path, `const { bob } = require('bobtester');
const common = require('../utils/common');

bob.run(async () => {
  console.log("▶ Step 1: Performing login using common module");
  await common.login('lalala1');

  console.log("▶ Step 2: Taking screenshot");
  await bob.screenshot('dashboard_view');

  console.log("▶ Step 3: Logging out cleanly");
  await common.logout();
});
`);
        console.log(`  📄 Created: test1/main.js`);
    }
    console.log(`\n✅ BobTester project initialized successfully!`);
    console.log(`👉 Run your first test with: npx bob run test1\n`);
}
async function runScript(filePath) {
    return new Promise((resolve) => {
        console.log(`\n======================================================`);
        console.log(`🚀 Running Suite: ${path_1.default.relative(process.cwd(), filePath)}`);
        console.log(`======================================================\n`);
        const child = (0, child_process_1.spawn)(process.execPath, [filePath], {
            stdio: "inherit",
            cwd: process.cwd(),
            env: process.env,
        });
        child.on("close", (code) => {
            resolve(code === 0);
        });
    });
}
async function handleRun(target) {
    const cwd = process.cwd();
    if (target && target !== "--all") {
        // Run specific suite
        let scriptPath = path_1.default.join(cwd, target);
        if (!fs_1.default.existsSync(scriptPath) || fs_1.default.statSync(scriptPath).isDirectory()) {
            scriptPath = path_1.default.join(cwd, target, "main.js");
        }
        if (!fs_1.default.existsSync(scriptPath)) {
            console.error(`❌ Could not find test script at: ${target} or ${target}/main.js`);
            process.exit(1);
        }
        const success = await runScript(scriptPath);
        process.exit(success ? 0 : 1);
    }
    else {
        // Run all suites
        const entries = fs_1.default.readdirSync(cwd, { withFileTypes: true });
        const testScripts = [];
        entries.forEach((entry) => {
            if (entry.isDirectory() && entry.name.startsWith("test")) {
                const potentialMain = path_1.default.join(cwd, entry.name, "main.js");
                if (fs_1.default.existsSync(potentialMain)) {
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
            if (ok)
                passed++;
            else
                failed++;
        }
        console.log(`\n======================================================`);
        console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed out of ${testScripts.length}`);
        console.log(`======================================================\n`);
        process.exit(failed > 0 ? 1 : 0);
    }
}
if (!command || command === "--help" || command === "-h") {
    printHelp();
}
else if (command === "init") {
    handleInit();
}
else if (command === "run") {
    handleRun(args[1]);
}
else {
    // If user typed 'bob test1', treat it as 'bob run test1'
    handleRun(command);
}
