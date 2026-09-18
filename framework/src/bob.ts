import path from "path";
import fs from "fs";
import { Page } from "playwright";
import { BrowserManager } from "./browser";
import { DatasetManager, DatasetRow } from "./dataset";
import { getConfig } from "./config";

export class BobDriver {
  private datasetManager: DatasetManager;

  constructor() {
    this.datasetManager = DatasetManager.getInstance();
  }

  /**
   * Switch the active dataset for variable interpolation (e.g. 'lalala1')
   */
  public useDataset(name: string): DatasetRow {
    return this.datasetManager.useDataset(name);
  }

  /**
   * Get the active dataset row object
   */
  public get dataset(): DatasetRow {
    return this.datasetManager.getActiveData();
  }

  /**
   * Get a specific value from the active dataset
   */
  public get(key: string, defaultValue?: any): any {
    return this.datasetManager.get(key, defaultValue);
  }

  /**
   * Resolve an underlying Playwright Page instance
   */
  public async getPage(): Promise<Page> {
    const session = await BrowserManager.getSession();
    return session.page;
  }

  /**
   * Navigate to a URL with automatic variable resolution (e.g. '[targetUrl]')
   */
  public async goto(url: string, options?: any): Promise<any> {
    const resolvedUrl = this.datasetManager.interpolate(url);
    const page = await this.getPage();
    console.log(`🌐 [Navigate] -> ${resolvedUrl}`);
    return await page.goto(resolvedUrl, options);
  }

  /**
   * Click an element matching selector
   */
  public async click(selector: string, options?: any): Promise<void> {
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
  public async fill(selectorOrVariable: string, valueOrOptions?: any, options?: any): Promise<void> {
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
          } catch (_) {}
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
  public async type(selector: string, text: string, options?: any): Promise<void> {
    const resolvedSelector = this.datasetManager.interpolate(selector);
    const resolvedText = this.datasetManager.interpolate(text);
    const page = await this.getPage();
    console.log(`⌨️ [Type] ${resolvedSelector}`);
    await page.type(resolvedSelector, resolvedText, options);
  }

  /**
   * Press a keyboard key (e.g. 'Enter')
   */
  public async press(selector: string, key: string, options?: any): Promise<void> {
    const resolvedSelector = this.datasetManager.interpolate(selector);
    const page = await this.getPage();
    console.log(`🔘 [Press] ${key} on ${resolvedSelector}`);
    await page.press(resolvedSelector, key, options);
  }

  /**
   * Capture step screenshot
   */
  public async screenshot(name?: string): Promise<string> {
    const config = getConfig();
    const storageDir = path.resolve(process.cwd(), config.screenshotsDir || "./screenshots");
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeName = name ? name.replace(/[^a-zA-Z0-9_\-]/g, "_") : "step";
    const filename = `${safeName}_${timestamp}.png`;
    const fullPath = path.join(storageDir, filename);

    const page = await this.getPage();
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`📸 [Screenshot] Captured: ${path.relative(process.cwd(), fullPath)}`);
    return fullPath;
  }

  /**
   * Pause execution for specified milliseconds
   */
  public async sleep(ms: number = 1000): Promise<void> {
    console.log(`⏳ [Wait] ${ms}ms`);
    const page = await this.getPage();
    await page.waitForTimeout(ms);
  }

  public async waitForTimeout(ms: number): Promise<void> {
    return this.sleep(ms);
  }

  /**
   * Wait for selector to appear in DOM
   */
  public async waitForSelector(selector: string, options?: any): Promise<any> {
    const resolvedSelector = this.datasetManager.interpolate(selector);
    const page = await this.getPage();
    return await page.waitForSelector(resolvedSelector, options);
  }

  /**
   * Assert element is visible
   */
  public async expectVisible(selector: string, timeout: number = 5000): Promise<boolean> {
    const resolvedSelector = this.datasetManager.interpolate(selector);
    const page = await this.getPage();
    try {
      await page.waitForSelector(resolvedSelector, { state: "visible", timeout });
      console.log(`✅ [Assert] Element is visible: ${resolvedSelector}`);
      return true;
    } catch (e: any) {
      console.error(`❌ [Assert Failed] Element NOT visible: ${resolvedSelector}`);
      throw new Error(`Expected element "${resolvedSelector}" to be visible, but it timed out after ${timeout}ms`);
    }
  }

  /**
   * Direct access to underlying Playwright Page for advanced scripts
   */
  public get page(): Promise<Page> {
    return this.getPage();
  }

  /**
   * Runner entrypoint for standalone test script execution
   */
  public async run(testFn: () => Promise<void> | void): Promise<void> {
    const startTime = Date.now();
    console.log(`\n======================================================`);
    console.log(`🚀 [BobTester] Starting Test Execution...`);
    console.log(`======================================================\n`);

    try {
      // Connect / launch browser
      await BrowserManager.getSession();

      // Execute caller's test flow
      await testFn();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n======================================================`);
      console.log(`🎉 [BobTester] Test Finished Successfully in ${elapsed}s`);
      console.log(`======================================================\n`);
    } catch (err: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`\n======================================================`);
      console.error(`💥 [BobTester] Test Execution Failed after ${elapsed}s:`);
      console.error(err.message || err);
      console.error(`======================================================\n`);
      process.exitCode = 1;
    } finally {
      await BrowserManager.closeSession();
    }
  }
}

// Export singleton instance as 'bob'
export const bob = new BobDriver();
export const test = (title: string, fn: () => Promise<void> | void) => {
  console.log(`\n📝 Running Test: "${title}"`);
  return bob.run(fn);
};
