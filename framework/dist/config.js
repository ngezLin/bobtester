"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.getConfig = getConfig;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
let loadedConfig = null;
function loadConfig(projectDir = process.cwd()) {
    if (loadedConfig)
        return loadedConfig;
    // Load .env if present
    const envPath = path_1.default.join(projectDir, ".env");
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
    }
    // Look for bobtester.config.json or bobtester.config.js
    let config = {};
    const jsonPath = path_1.default.join(projectDir, "bobtester.config.json");
    const jsPath = path_1.default.join(projectDir, "bobtester.config.js");
    if (fs_1.default.existsSync(jsonPath)) {
        try {
            const raw = fs_1.default.readFileSync(jsonPath, "utf-8");
            config = JSON.parse(raw);
        }
        catch (e) {
            console.warn(`⚠️ [bobtester] Warning: Failed to parse bobtester.config.json: ${e.message}`);
        }
    }
    else if (fs_1.default.existsSync(jsPath)) {
        try {
            config = require(jsPath);
        }
        catch (e) {
            console.warn(`⚠️ [bobtester] Warning: Failed to load bobtester.config.js: ${e.message}`);
        }
    }
    // Environment variable overrides
    const apiKey = process.env.BROWSERLESS_API_KEY || config.browserless?.apiKey;
    const endpoint = process.env.BROWSERLESS_ENDPOINT || config.browserless?.endpoint || "wss://chrome.browserless.io";
    loadedConfig = {
        browserless: {
            apiKey,
            endpoint,
            timeout: config.browserless?.timeout || 30000,
        },
        headless: config.headless !== undefined ? config.headless : true,
        slowMo: config.slowMo !== undefined ? config.slowMo : 100,
        datasets: config.datasets || "./data/datasets.json",
        screenshotsDir: config.screenshotsDir || "./screenshots",
        baseUrl: config.baseUrl || "",
    };
    return loadedConfig;
}
function getConfig() {
    return loadedConfig || loadConfig();
}
