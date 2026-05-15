import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";
import { SecurityChecker, Vulnerability } from "./securityChecker";

export class PlaywrightService {
  static async launchBrowser(): Promise<Browser> {
    const apiKey = process.env.BROWSERLESS_API_KEY;

    try {
      if (apiKey && process.env.BROWSER_MODE !== "local") {
        const wsEndpoint = `wss://production-sfo.browserless.io?token=${apiKey}`;
        console.log("🌐 [Browserless] Connecting to remote cloud browser...");
        return await chromium.connectOverCDP(wsEndpoint, { timeout: 5000 });
      }
    } catch (error: any) {
      console.warn(`⚠️ [Browserless] Connection failed: ${error.message}. Falling back to local browser...`);
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
        let { action, selector, value } = step;
        
        // Clean up AI hallucinated internal:role selectors to standard Playwright role selectors
        if (selector && selector.includes("internal:role=")) {
          selector = selector.replace("internal:role=", "role=");
          // Clean up the trailing "i" flag inside the string (e.g. [name="Submit"i] -> [name="Submit"])
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
              await page.locator(selector).click();
              // Wait for network to settle after click to measure potential DB delay
              await page.waitForLoadState("networkidle").catch(() => {});
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
                    // Use a very short timeout for each part to keep it fast
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

  static async discoverPageElements(url: string): Promise<string> {
    const browser = await this.launchBrowser();
    try {
      const page = await browser.newPage();
      console.log(`🔍 [Discovery] Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

      const elements = await page.evaluate(() => {
        const getLabel = (el: HTMLElement) => {
          if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) return label.textContent?.trim();
          }
          const parentLabel = el.closest("label");
          if (parentLabel) return parentLabel.textContent?.trim();
          return null;
        };

        const interactive = Array.from(
          document.querySelectorAll('input, button, a, [role="button"], select, textarea')
        );

        return interactive
          .map((el: any) => {
            const tag = el.tagName.toLowerCase();
            const role = el.getAttribute("role") || 
                        (tag === "input" && (el.type === "text" || !el.type) ? "textbox" : 
                         tag === "input" && el.type === "password" ? "textbox" :
                         tag === "button" || el.type === "submit" ? "button" :
                         tag === "a" ? "link" : tag);
            
            const name = el.getAttribute("aria-label") || 
                        getLabel(el) || 
                        el.placeholder || 
                        el.textContent?.trim().slice(0, 30) || 
                        el.name || "";

            const id = el.id ? `#${el.id}` : "";
            
            // Format in a way that suggests Playwright's internal:role syntax
            return `Role: ${role}, Name: "${name}"${id ? `, ID: ${id}` : ""}`;
          })
          .filter((s) => s.length > 10)
          .slice(0, 50);
      });

      return elements.join("\n");
    } catch (error: any) {
      console.error(`❌ [Discovery] Failed: ${error.message}`);
      return "Could not extract page elements.";
    } finally {
      await browser.close();
    }
  }
}
