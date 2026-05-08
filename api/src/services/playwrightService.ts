import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";
import { LoggerService } from "./loggerService";

export class PlaywrightService {
  static async launchBrowser(): Promise<Browser> {
    return await chromium.launch({
      headless: true,
    });
  }

  static async takeScreenshot(page: Page, testRunId: number, name: string): Promise<string> {
    const fileName = `test-${testRunId}-${name}-${Date.now()}.png`;
    const storagePath = path.join(process.cwd(), "storage", "screenshots", fileName);
    
    if (!fs.existsSync(path.dirname(storagePath))) {
      fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    }

    await page.screenshot({ path: storagePath });
    return `storage/screenshots/${fileName}`;
  }

  static async runLoginTest(
    testRunId: number,
    url: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; screenshot?: string; error?: string }> {
    const browser = await this.launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    let screenshotPath: string | undefined;

    try {
      await LoggerService.info(testRunId, `Navigating to ${url}`);
      await page.goto(url, { waitUntil: "networkidle" });

      await LoggerService.info(testRunId, "Filling login credentials");
      // Using your recorded selectors for better accuracy
      await page.getByRole('textbox', { name: 'Username' }).fill(email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);

      await LoggerService.info(testRunId, "Clicking Sign In button");
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for the dashboard indicator you recorded
      await LoggerService.info(testRunId, "Waiting for dashboard...");
      await page.waitForTimeout(3000); 

      screenshotPath = await this.takeScreenshot(page, testRunId, "login-result");
      await LoggerService.info(testRunId, `Screenshot captured: ${screenshotPath}`);

      // Basic success check: check if we are still on the login page or have moved
      const currentUrl = page.url();
      const isSuccess = currentUrl !== url;

      if (isSuccess) {
        await LoggerService.info(testRunId, "Login successful (URL changed)");
      } else {
        await LoggerService.warn(testRunId, "Login might have failed (URL did not change)");
      }

      return { success: isSuccess, screenshot: screenshotPath };
    } catch (error: any) {
      await LoggerService.error(testRunId, `Test failed: ${error.message}`);
      screenshotPath = await this.takeScreenshot(page, testRunId, "error");
      return { success: false, screenshot: screenshotPath, error: error.message };
    } finally {
      await browser.close();
    }
  }
}
