import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";
import { SecurityChecker, Vulnerability } from "./securityChecker";
import supabase from "../db";

export class PlaywrightService {
  static async launchBrowser(): Promise<Browser> {
    const apiKey = process.env.BROWSERLESS_API_KEY;
    const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

    if (apiKey) {
      const wsEndpoint = `wss://chrome.browserless.io?token=${apiKey}`;
      try {
        console.log(`🌐 [Browserless] Connecting to remote cloud browser...`);
        return await chromium.connectOverCDP(wsEndpoint, { timeout: 20000 });
      } catch (error: any) {
        console.error(`❌ [Browserless] Connection failed: ${error.message}`);
        if (isProduction) {
          throw new Error("Cloud browser connection failed in production. Please check your BROWSERLESS_API_KEY.");
        }
      }
    }

    if (isProduction) {
      throw new Error("BROWSERLESS_API_KEY is missing. Cloud browser is required for production execution.");
    }

    console.log("💻 [Playwright] Launching local browser...");
    return await chromium.launch({ headless: true });
  }

  static async takeScreenshot(page: Page, testRunId: number, name: string): Promise<string | undefined> {
    const fileName = `run-${testRunId}-${name}-${Date.now()}.png`;
    const storagePath = path.join(process.cwd(), "storage", "screenshots", fileName);
    
    try {
      if (!fs.existsSync(path.dirname(storagePath))) {
        fs.mkdirSync(path.dirname(storagePath), { recursive: true });
      }

      // Use a shorter timeout for screenshots so they don't block the result
      await page.screenshot({ path: storagePath, timeout: 5000 });
      return `storage/screenshots/${fileName}`;
    } catch (e: any) {
      console.warn(`⚠️ [Playwright] Failed to take screenshot: ${e.message}`);
      return undefined;
    }
  }

  static async executeDynamicTest(
    testRunId: number,
    steps: any[],
    assetData: any = {},
    caseId?: number
  ): Promise<{ success: boolean; screenshot?: string; logs: any[]; vulnerabilities: Vulnerability[] }> {
    const browser = await this.launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    const security = new SecurityChecker();
    const logs: any[] = [];
    let screenshotPath: string | undefined;
    let success = true;
    let currentStepIndex = 0;
    
    // Robustness: If steps is a string (due to previous double-stringification), parse it
    if (typeof steps === "string") {
      try {
        steps = JSON.parse(steps);
      } catch (e) {
        console.error(`[Run ${testRunId}] [ERROR] Failed to parse steps:`, e);
        steps = [];
      }
    }

    const addLog = (message: string, level: string = "info") => {
      logs.push({ message, level, timestamp: new Date().toISOString() });
      console.log(`[Run ${testRunId}] [${level.toUpperCase()}] ${message}`);
    };

    // Robustness: If assetData is a string (due to previous double-stringification), parse it
    if (typeof assetData === "string") {
      try {
        assetData = JSON.parse(assetData);
      } catch (e: any) {
        addLog(`Failed to parse asset data string: ${e.message}`, "warn");
        assetData = {};
      }
    }

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
        let { action, selector, value } = step;
        
        // Clean up internal:role selectors to standard Playwright role selectors
        if (selector && selector.includes("internal:role=")) {
          selector = selector.replace("internal:role=", "role=");
          selector = selector.replace(/\"i\]/g, '"]');
        }

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
              await page.goto(finalValue, { waitUntil: "domcontentloaded", timeout: 30000 });
              break;
            case "fill":
              addLog(`Filling ${selector} with security payload or value`);
              await page.locator(selector).fill(finalValue || "");
              break;
            case "click":
              addLog(`Clicking ${selector}`);
              await page.locator(selector).click({ timeout: 15000 });
              // Removed networkidle wait as it hangs on sites with background tracking
              break;
            case "verify":
              addLog(`Verifying: ${selector}`);
              if (selector.startsWith("url:")) {
                const expectedUrl = selector.replace("url:", "").trim();
                const currentUrl = page.url();
                if (!currentUrl.includes(expectedUrl)) {
                  throw new Error(`URL verification failed. Expected to contain: ${expectedUrl}, but got: ${currentUrl}`);
                }
              } else if (selector.startsWith("text:")) {
                const fullText = selector.replace("text:", "").trim();
                const parts = fullText.split("|").map((p: string) => p.trim());
                
                let found = false;
                for (const part of parts) {
                  try {
                    const locator = page.getByText(part, { exact: false });
                    await locator.waitFor({ state: "visible", timeout: 2000 });
                    found = true;
                    addLog(`Found match for text part: "${part}"`);
                    break;
                  } catch (e) {
                    continue;
                  }
                }

                if (!found) {
                  throw new Error(`Verification failed: None of the text options [${parts.join(", ")}] were found.`);
                }
              } else {
                const locator = page.locator(selector);
                await locator.waitFor({ state: "visible", timeout: 5000 }).catch(() => {
                  throw new Error(`Verification failed: Selector "${selector}" not found or not visible.`);
                });
              }
              addLog(`Verification successful: ${selector}`);
              break;
            default:
              addLog(`Unknown action: ${action}`, "warn");
          }

          const stepDuration = Date.now() - stepStartTime;
          if (finalValue) {
            security.analyzePayloadImpact(action, finalValue, stepDuration, true, currentStepIndex);
          }

        } catch (stepError: any) {
           addLog(`Step ${currentStepIndex + 1} failed: ${stepError.message}`, "warn");
           throw stepError;
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

  static getCloudRecorderUrl(targetUrl: string): string {
    const apiKey = process.env.BROWSERLESS_API_KEY;
    if (!apiKey) return "";
    
    // Browserless Debugger URL with auto-navigation
    // The user can use the 'Recorder' tab inside the debugger
    return `https://chrome.browserless.io/debugger?token=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
  }
}
