"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = exports.bob = exports.BobDriver = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const browser_1 = require("./browser");
const dataset_1 = require("./dataset");
const config_1 = require("./config");
class BobDriver {
    datasetManager;
    constructor() {
        this.datasetManager = dataset_1.DatasetManager.getInstance();
    }
    /**
     * Switch the active dataset for variable interpolation (e.g. 'lalala1')
     */
    useDataset(name) {
        return this.datasetManager.useDataset(name);
    }
    /**
     * Get the active dataset row object
     */
    get dataset() {
        return this.datasetManager.getActiveData();
    }
    /**
     * Get a specific value from the active dataset
     */
    get(key, defaultValue) {
        return this.datasetManager.get(key, defaultValue);
    }
    /**
     * Resolve an underlying Playwright Page instance
     */
    async getPage() {
        const session = await browser_1.BrowserManager.getSession();
        return session.page;
    }
    /**
     * Navigate to a URL with automatic variable resolution (e.g. '[targetUrl]')
     */
    async goto(url, options) {
        const resolvedUrl = this.datasetManager.interpolate(url);
        const page = await this.getPage();
        console.log(`🌐 [Navigate] -> ${resolvedUrl}`);
        return await page.goto(resolvedUrl, options);
    }
    /**
     * Click an element matching selector
     */
    async click(selector, options) {
        const resolvedSelector = this.datasetManager.interpolate(selector);
        const page = await this.getPage();
        console.log(`👆 [Click] ${resolvedSelector}`);
        await page.click(resolvedSelector, options);
    }
    /**
     * Fill input element. Supports both:
     * 1. fill(selector, '[username]')
     * 2. fill('[username]') -> smart selector based on variable key
     */
    async fill(selectorOrVariable, valueOrOptions, options) {
        const page = await this.getPage();
        // Single argument shorthand: fill('[username]')
        if (valueOrOptions === undefined || typeof valueOrOptions === "object") {
            const match = selectorOrVariable.match(/^\[([a-zA-Z0-9_\-]+)\]$/);
            if (match) {
                const key = match[1];
                const val = this.datasetManager.get(key);
                // Smart CSS selector candidates
                const smartSelectors = [
                    `input[name="${key}"]`,
                    `input[id*="${key}" i]`,
                    `input[data-test*="${key}" i]`,
                    `input[placeholder*="${key}" i]`,
                    `textarea[name="${key}"]`,
                ];
                for (const sel of smartSelectors) {
                    try {
                        const el = await page.$(sel);
                        if (el) {
                            console.log(`✍️ [Fill] ${sel} -> "${val ? '***' : ''}" (from [${key}])`);
                            await page.fill(sel, String(val ?? ""), valueOrOptions);
                            return;
                        }
                    }
                    catch (_) { }
                }
            }
        }
        // Standard 2-argument fill: fill(selector, value)
        const selector = this.datasetManager.interpolate(selectorOrVariable);
        const resolvedValue = typeof valueOrOptions === "string"
            ? this.datasetManager.interpolate(valueOrOptions)
            : String(valueOrOptions ?? "");
        const isSensitive = /pass|secret|token|key/i.test(selectorOrVariable) || /pass|secret|token|key/i.test(resolvedValue);
        console.log(`✍️ [Fill] ${selector} -> "${isSensitive ? '********' : resolvedValue}"`);
        await page.fill(selector, resolvedValue, options);
    }
    /**
     * Type text into an element with optional delay
     */
    async type(selector, text, options) {
        const resolvedSelector = this.datasetManager.interpolate(selector);
        const resolvedText = this.datasetManager.interpolate(text);
        const page = await this.getPage();
        console.log(`⌨️ [Type] ${resolvedSelector}`);
        await page.type(resolvedSelector, resolvedText, options);
    }
    /**
     * Press a keyboard key (e.g. 'Enter')
     */
    async press(selector, key, options) {
        const resolvedSelector = this.datasetManager.interpolate(selector);
        const page = await this.getPage();
        console.log(`🔘 [Press] ${key} on ${resolvedSelector}`);
        await page.press(resolvedSelector, key, options);
    }
    /**
     * Capture step screenshot
     */
    async screenshot(name) {
        const config = (0, config_1.getConfig)();
        const storageDir = path_1.default.resolve(process.cwd(), config.screenshotsDir || "./screenshots");
        if (!fs_1.default.existsSync(storageDir)) {
            fs_1.default.mkdirSync(storageDir, { recursive: true });
        }
        const timestamp = Date.now();
        const safeName = name ? name.replace(/[^a-zA-Z0-9_\-]/g, "_") : "step";
        const filename = `${safeName}_${timestamp}.png`;
        const fullPath = path_1.default.join(storageDir, filename);
        const page = await this.getPage();
        await page.screenshot({ path: fullPath, fullPage: false });
        console.log(`📸 [Screenshot] Captured: ${path_1.default.relative(process.cwd(), fullPath)}`);
        return fullPath;
    }
    /**
     * Pause execution for specified milliseconds
     */
    async sleep(ms = 1000) {
        console.log(`⏳ [Wait] ${ms}ms`);
        const page = await this.getPage();
        await page.waitForTimeout(ms);
    }
    async waitForTimeout(ms) {
        return this.sleep(ms);
    }
    /**
     * Wait for selector to appear in DOM
     */
    async waitForSelector(selector, options) {
        const resolvedSelector = this.datasetManager.interpolate(selector);
        const page = await this.getPage();
        return await page.waitForSelector(resolvedSelector, options);
    }
    /**
     * Assert element is visible
     */
    async expectVisible(selector, timeout = 5000) {
        const resolvedSelector = this.datasetManager.interpolate(selector);
        const page = await this.getPage();
        try {
            await page.waitForSelector(resolvedSelector, { state: "visible", timeout });
            console.log(`✅ [Assert] Element is visible: ${resolvedSelector}`);
            return true;
        }
        catch (e) {
            console.error(`❌ [Assert Failed] Element NOT visible: ${resolvedSelector}`);
            throw new Error(`Expected element "${resolvedSelector}" to be visible, but it timed out after ${timeout}ms`);
        }
    }
    /**
     * Direct access to underlying Playwright Page for advanced scripts
     */
    get page() {
        return this.getPage();
    }
    /**
     * Runner entrypoint for standalone test script execution
     */
    async run(testFn) {
        const startTime = Date.now();
        console.log(`\n======================================================`);
        console.log(`🚀 [BobTester] Starting Test Execution...`);
        console.log(`======================================================\n`);
        try {
            // Connect / launch browser
            await browser_1.BrowserManager.getSession();
            // Execute caller's test flow
            await testFn();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n======================================================`);
            console.log(`🎉 [BobTester] Test Finished Successfully in ${elapsed}s`);
            console.log(`======================================================\n`);
        }
        catch (err) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            console.error(`\n======================================================`);
            console.error(`💥 [BobTester] Test Execution Failed after ${elapsed}s:`);
            console.error(err.message || err);
            console.error(`======================================================\n`);
            process.exitCode = 1;
        }
        finally {
            await browser_1.BrowserManager.closeSession();
        }
    }
}
exports.BobDriver = BobDriver;
// Export singleton instance as 'bob'
exports.bob = new BobDriver();
const test = (title, fn) => {
    console.log(`\n📝 Running Test: "${title}"`);
    return exports.bob.run(fn);
};
exports.test = test;
