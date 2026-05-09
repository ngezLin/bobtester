import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";

export class PlaywrightService {
  static async launchBrowser(): Promise<Browser> {
    return await chromium.launch({
      headless: true,
    });
  }

  static async takeScreenshot(page: Page, testRunId: number, name: string): Promise<string> {
    const fileName = `run-${testRunId}-${name}-${Date.now()}.png`;
    const storagePath = path.join(process.cwd(), "storage", "screenshots", fileName);
    
    if (!fs.existsSync(path.dirname(storagePath))) {
      fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    }

    await page.screenshot({ path: storagePath });
    return `storage/screenshots/${fileName}`;
  }

  static async executeDynamicTest(
    testRunId: number,
    steps: any[],
    assetData: any = {}
  ): Promise<{ success: boolean; screenshot?: string; logs: any[] }> {
    const browser = await this.launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    const logs: any[] = [];
    let screenshotPath: string | undefined;
    let success = true;

    const addLog = (message: string, level: string = "info") => {
      logs.push({ message, level, timestamp: new Date().toISOString() });
      console.log(`[Run ${testRunId}] [${level.toUpperCase()}] ${message}`);
    };

    try {
      addLog("Starting dynamic test execution");

      for (const step of steps) {
        const { action, selector, value } = step;
        
        // Parameter substitution: replace [varName] with assetData.varName
        let finalValue = value;
        if (value && value.includes("[") && value.includes("]")) {
          const varName = value.match(/\[(.*?)\]/)?.[1];
          if (varName && assetData[varName] !== undefined) {
            finalValue = value.replace(`[${varName}]`, assetData[varName]);
            addLog(`Substituted variable [${varName}] with provided asset data`);
          }
        }

        switch (action) {
          case "goto":
            addLog(`Navigating to ${finalValue}`);
            await page.goto(finalValue, { waitUntil: "networkidle" });
            break;
          case "fill":
            addLog(`Filling ${selector} with ${finalValue ? "****" : "empty value"}`);
            // Use locator for better stability (handles getBy... or raw selectors)
            await page.locator(selector).fill(finalValue || "");
            break;
          case "click":
            addLog(`Clicking ${selector}`);
            await page.locator(selector).click();
            break;
          default:
            addLog(`Unknown action: ${action}`, "warn");
        }
      }

      addLog("Test execution completed successfully");
      screenshotPath = await this.takeScreenshot(page, testRunId, "success");
    } catch (error: any) {
      success = false;
      addLog(`Execution error: ${error.message}`, "error");
      screenshotPath = await this.takeScreenshot(page, testRunId, "error");
    } finally {
      await browser.close();
    }

    return { success, screenshot: screenshotPath, logs };
  }
}
