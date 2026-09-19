import { chromium, Browser, BrowserContext, Page } from "playwright";
import { getConfig } from "./config";

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  isCloud: boolean;
}

export class BrowserManager {
  private static currentSession: BrowserSession | null = null;

  public static async getSession(): Promise<BrowserSession> {
    if (this.currentSession && this.currentSession.browser.isConnected()) {
      return this.currentSession;
    }

    const config = getConfig();
    const apiKey = config.browserless?.apiKey;
    const endpoint =
      config.browserless?.endpoint || "wss://chrome.browserless.io";
    const slowMo = config.slowMo || 0;
    const headless = config.headless !== undefined ? config.headless : true;

    let browser: Browser | null = null;
    let isCloud = false;

    // 1. Try Browserless Cloud if API key is provided
    if (apiKey) {
      const cleanEndpoint = endpoint.replace(/\/+$/, "");
      const wsUrl = `${cleanEndpoint}?token=${apiKey}`;
      console.log(`[Browserless] Connecting to cloud browser...`);

      try {
        browser = await chromium.connectOverCDP(wsUrl, {
          timeout: config.browserless?.timeout || 30000,
        });
        isCloud = true;
        console.log(
          `[Browserless] Connected to remote browser session successfully.`,
        );
      } catch (err: any) {
        console.warn(
          `[Browserless] Cloud connection failed: ${err.message}. Falling back to local Chromium.`,
        );
      }
    }

    // 2. Fallback to local Chromium
    if (!browser) {
      console.log(
        `[Playwright] Launching local Chromium browser (headless: ${headless})...`,
      );
      browser = await chromium.launch({
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

  public static async closeSession(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.currentSession.context.close();
      } catch (_) {}
      try {
        await this.currentSession.browser.close();
      } catch (_) {}
      this.currentSession = null;
    }
  }
}
