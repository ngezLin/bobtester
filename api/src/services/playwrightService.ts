import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";
import { SecurityChecker, Vulnerability } from "./securityChecker";

export class PlaywrightService {
  static async launchBrowser(): Promise<Browser> {
    const apiKey = process.env.BROWSERLESS_API_KEY;

    if (!apiKey) {
      throw new Error("BROWSERLESS_API_KEY is not set in environment variables.");
    }

    
    const wsEndpoint = `wss://production-sfo.browserless.io?token=${apiKey}`;
    console.log("🌐 [Browserless] Connecting to remote cloud browser...");
    const browser = await chromium.connectOverCDP(wsEndpoint);
    console.log("✅ [Browserless] Connected! Browser is running on Browserless.io servers.");
    return browser;
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
  ): Promise<{ success: boolean; screenshot?: string; logs: any[]; vulnerabilities: Vulnerability[] }> {
    const browser = await this.launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    const security = new SecurityChecker();
    const logs: any[] = [];
    let screenshotPath: string | undefined;
    let success = true;
    let currentStepIndex = 0;

    const addLog = (message: string, level: string = "info") => {
      logs.push({ message, level, timestamp: new Date().toISOString() });
      console.log(`[Run ${testRunId}] [${level.toUpperCase()}] ${message}`);
    };

    // --- Security Listeners ---
    
    // 1. XSS Sniffer (Dialogs)
    page.on("dialog", async dialog => {
      const message = dialog.message();
      addLog(`Security Alert: Unexpected dialog detected! Content: "${message}"`, "warn");
      security.addVulnerability({
        type: "Cross-Site Scripting (XSS)",
        severity: "HIGH",
        evidence: `Triggered dialog with content: "${message}"`,
        step_index: currentStepIndex,
      });
      await dialog.dismiss();
    });

    // 2. XSS Sniffer (Console)
    page.on("console", msg => {
      const text = msg.text();
      // Look for common XSS probe patterns or "BOB_XSS" token
      if (text.includes("XSS") || text.includes("BOB_") || msg.type() === "error") {
        if (text.includes("BOB_")) {
           security.addVulnerability({
            type: "Cross-Site Scripting (XSS)",
            severity: "HIGH",
            evidence: `Found XSS probe token in console: "${text}"`,
            step_index: currentStepIndex,
          });
        }
      }
    });

    // 3. Response Scanner (SQLi & Headers)
    page.on("response", async response => {
      try {
        const url = response.url();
        const status = response.status();
        const headers = response.headers();
        
        // Skip large files or non-text responses for body scanning
        const contentType = headers["content-type"] || "";
        let body = "";
        if (contentType.includes("text") || contentType.includes("json")) {
          body = await response.text();
        }

        security.scanResponse(url, status, headers, body, currentStepIndex);
      } catch (e) {
        // Response might be closed or empty
      }
    });

    try {
      addLog("Starting dynamic test execution with Security Probing enabled");

      for (const step of steps) {
        const { action, selector, value } = step;
        const stepStartTime = Date.now();
        
        // Parameter substitution: replace [varName] with assetData.varName
        let finalValue = value;
        if (value && value.includes("[") && value.includes("]")) {
          const varName = value.match(/\[(.*?)\]/)?.[1];
          if (varName && assetData[varName] !== undefined) {
            finalValue = value.replace(`[${varName}]`, assetData[varName]);
            addLog(`Substituted variable [${varName}] with provided asset data`);
          }
        }

        try {
          switch (action) {
            case "goto":
              addLog(`Navigating to ${finalValue}`);
              await page.goto(finalValue, { waitUntil: "networkidle" });
              break;
            case "fill":
              addLog(`Filling ${selector} with security payload or value`);
              await page.locator(selector).fill(finalValue || "");
              break;
            case "click":
              addLog(`Clicking ${selector}`);
              await page.locator(selector).click();
              // Wait for network to settle after click to measure potential DB delay
              await page.waitForLoadState("networkidle").catch(() => {});
              break;
            default:
              addLog(`Unknown action: ${action}`, "warn");
          }

          const stepDuration = Date.now() - stepStartTime;
          // Analyze if this specific step (with its payload) caused a vulnerability
          if (finalValue) {
            security.analyzePayloadImpact(action, finalValue, stepDuration, true, currentStepIndex);
          }

        } catch (stepError: any) {
           addLog(`Step ${currentStepIndex + 1} failed: ${stepError.message}`, "warn");
           throw stepError; // Re-throw to be caught by the main try-catch
        }

        currentStepIndex++;
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

    return { 
      success, 
      screenshot: screenshotPath, 
      logs, 
      vulnerabilities: security.getVulnerabilities() 
    };
  }
}
