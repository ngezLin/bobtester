"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserManager = void 0;
const playwright_1 = require("playwright");
const config_1 = require("./config");
class BrowserManager {
    static currentSession = null;
    static async getSession() {
        if (this.currentSession && this.currentSession.browser.isConnected()) {
            return this.currentSession;
        }
        const config = (0, config_1.getConfig)();
        const apiKey = config.browserless?.apiKey;
        const endpoint = config.browserless?.endpoint || "wss://chrome.browserless.io";
        const slowMo = config.slowMo || 0;
        const headless = config.headless !== undefined ? config.headless : true;
        let browser = null;
        let isCloud = false;
        // 1. Try Browserless Cloud if API key is provided
        if (apiKey) {
            const cleanEndpoint = endpoint.replace(/\/+$/, "");
            const wsUrl = `${cleanEndpoint}?token=${apiKey}`;
            console.log(`[Browserless] Connecting to cloud browser...`);
            try {
                browser = await playwright_1.chromium.connectOverCDP(wsUrl, {
                    timeout: config.browserless?.timeout || 30000,
                });
                isCloud = true;
                console.log(`[Browserless] Connected to remote browser session successfully.`);
            }
            catch (err) {
                console.warn(`[Browserless] Cloud connection failed: ${err.message}. Falling back to local Chromium.`);
            }
        }
        // 2. Fallback to local Chromium
        if (!browser) {
            console.log(`[Playwright] Launching local Chromium browser (headless: ${headless})...`);
            browser = await playwright_1.chromium.launch({
                headless,
                slowMo,
            });
        }
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();
        this.currentSession = {
            browser,
            context,
            page,
            isCloud,
        };
        return this.currentSession;
    }
    static async closeSession() {
        if (this.currentSession) {
            try {
                await this.currentSession.context.close();
            }
            catch (_) { }
            try {
                await this.currentSession.browser.close();
            }
            catch (_) { }
            this.currentSession = null;
        }
    }
}
exports.BrowserManager = BrowserManager;
