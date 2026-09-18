import path from "path";
import fs from "fs";
import dotenv from "dotenv";

export interface BobConfig {
  browserless?: {
    apiKey?: string;
    endpoint?: string;
    timeout?: number;
  };
  headless?: boolean;
  slowMo?: number;
  datasets?: string;
  screenshotsDir?: string;
  baseUrl?: string;
}

let loadedConfig: BobConfig | null = null;

export function loadConfig(projectDir: string = process.cwd()): BobConfig {
  if (loadedConfig) return loadedConfig;

  // Load .env if present
  const envPath = path.join(projectDir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  // Look for bobtester.config.json or bobtester.config.js
  let config: BobConfig = {};
  const jsonPath = path.join(projectDir, "bobtester.config.json");
  const jsPath = path.join(projectDir, "bobtester.config.js");

  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, "utf-8");
      config = JSON.parse(raw);
    } catch (e: any) {
      console.warn(`⚠️ [bobtester] Warning: Failed to parse bobtester.config.json: ${e.message}`);
    }
  } else if (fs.existsSync(jsPath)) {
    try {
      config = require(jsPath);
    } catch (e: any) {
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

export function getConfig(): BobConfig {
  return loadedConfig || loadConfig();
}
