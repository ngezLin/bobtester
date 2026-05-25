import { chromium, Browser, Page } from "playwright";
import path from "path";
import fs from "fs";
import { SecurityChecker, Vulnerability } from "./securityChecker";
import supabase from "../db";

export class PlaywrightService {
  static async launchBrowser(): Promise<Browser> {
    const apiKey = process.env.BROWSERLESS_API_KEY;
    const isProduction =
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

    if (apiKey) {
      const wsEndpoint = `wss://chrome.browserless.io?token=${apiKey}`;
      try {
        console.log(`🌐 [Browserless] Connecting to remote cloud browser...`);
        return await chromium.connectOverCDP(wsEndpoint, { timeout: 20000 });
      } catch (error: any) {
        console.error(`❌ [Browserless] Connection failed: ${error.message}`);
        if (isProduction) {
          throw new Error(
            "Cloud browser connection failed in production. Please check your BROWSERLESS_API_KEY.",
          );
        }
      }
    }

    if (isProduction) {
      throw new Error(
        "BROWSERLESS_API_KEY is missing. Cloud browser is required for production execution.",
      );
    }

    console.log("💻 [Playwright] Launching local browser...");
    return await chromium.launch({ headless: true });
  }

  static async takeScreenshot(
    page: Page,
    testRunId: number,
    name: string,
  ): Promise<string | undefined> {
    try {
      // Capture screenshot in-memory as a Buffer
      const buffer = await page.screenshot({ type: "png", timeout: 5000 });
      // Convert to Base64 Data URI
      const base64 = buffer.toString("base64");
      return `data:image/png;base64,${base64}`;
    } catch (e: any) {
      console.warn(`⚠️ [Playwright] Failed to take screenshot: ${e.message}`);
      return undefined;
    }
  }

  static async executeDynamicTest(
    testRunId: number,
    steps: any[],
    assetData: any = {},
    caseId?: number,
  ): Promise<{
    success: boolean;
    screenshot?: string;
    logs: any[];
    vulnerabilities: Vulnerability[];
  }> {
    const logs: any[] = [];
    const addLog = (message: string, level: string = "info") => {
      logs.push({ message, level, timestamp: new Date().toISOString() });
      console.log(`[Run ${testRunId}] [${level.toUpperCase()}] ${message}`);
    };

    let browser: Browser | undefined;
    let context: any;
    let page: Page | undefined;
    const security = new SecurityChecker();
    let screenshotPath: string | undefined;
    let success = true;
    let currentStepIndex = 0;
    let dialogHandled = false; // tracks when a dialog was accepted so we can wait for nav

    try {
      addLog("Starting dynamic test execution with Security Probing enabled");

      // Robustness: If steps is a string (due to previous double-stringification), parse it
      if (typeof steps === "string") {
        try {
          steps = JSON.parse(steps);
        } catch (e) {
          console.error(`[Run ${testRunId}] [ERROR] Failed to parse steps:`, e);
          steps = [];
        }
      }

      // Robustness: If assetData is a string (due to previous double-stringification), parse it
      if (typeof assetData === "string") {
        try {
          assetData = JSON.parse(assetData);
        } catch (e: any) {
          addLog(`Failed to parse asset data string: ${e.message}`, "warn");
          assetData = {};
        }
      }

      addLog("Launching browser...");
      browser = await this.launchBrowser();
      context = await browser.newContext();
      const p = await context.newPage();
      page = p;

      // --- Security Listeners ---

      // 1. XSS Sniffer (Dialogs)
      p.on("dialog", async (dialog: any) => {
        const message = dialog.message();
        const dialogType = dialog.type(); // 'alert', 'confirm', 'prompt', 'beforeunload'
        
        addLog(`[Dialog Intercepted] Type: "${dialogType}", Message: "${message}"`);
        
        // Flag as XSS if it's an 'alert' or 'prompt', while accepting 'confirm' or 'beforeunload'
        const isStandardConfirm = dialogType === "confirm" || dialogType === "beforeunload";
        
        if (!isStandardConfirm) {
          addLog(
            `Security Alert: Unexpected alert dialog detected! Content: "${message}"`,
            "warn",
          );
          security.addVulnerability({
            type: "Cross-Site Scripting (XSS)",
            severity: "HIGH",
            evidence: `Triggered unexpected ${dialogType} dialog with content: "${message}"`,
            step_index: currentStepIndex,
          });
          await dialog.dismiss();
        } else {
          addLog(`Accepting confirmation dialog to allow form submission/navigation to proceed.`);
          dialogHandled = true; // signal that a nav-triggering dialog was accepted
          await dialog.accept();
        }
      });

      // 2. XSS Sniffer (Console)
      p.on("console", (msg: any) => {
        const text = msg.text();
        // Look for common XSS probe patterns or "BOB_XSS" token
        if (
          text.includes("XSS") ||
          text.includes("BOB_") ||
          msg.type() === "error"
        ) {
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
      p.on("response", async (response: any) => {
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

      for (const step of steps) {
        let { action, selector, value } = step;

        // Clean up escaped quotes in selectors (common in Chrome Recorder translations)
        if (selector) {
          selector = selector.replace(/\\'/g, "'").replace(/\\"/g, '"');
        }

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
            addLog(
              `Substituted variable [${varName}] with provided asset data`,
            );
          }
        }

        try {
          switch (action) {
            case "goto":
              addLog(`Navigating to ${finalValue}`);
              await p.goto(finalValue, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
              });
              break;
            case "fill":
              addLog(`Filling ${selector} with security payload or value`);
              await p.locator(selector).fill(finalValue || "");
              break;
            case "click":
              addLog(`Clicking ${selector}`);
              await p.locator(selector).click({ timeout: 15000 });
              // If a confirm dialog was accepted during this click (e.g. form submit),
              // wait for the resulting page navigation to settle before moving on.
              if (dialogHandled) {
                dialogHandled = false;
                try {
                  await p.waitForLoadState("domcontentloaded", { timeout: 10000 });
                  addLog(`Page settled after dialog-triggered navigation`);
                } catch (_) {
                  // Page might not navigate — that's fine, continue
                }
              }
              break;
            case "screenshot": {
              addLog(`Capturing step screenshot...`);
              const scrPath = await this.takeScreenshot(p, testRunId, `step-${currentStepIndex}`);
              if (scrPath) {
                logs.push({
                  message: scrPath,
                  level: "screenshot",
                  timestamp: new Date().toISOString(),
                  step_index: currentStepIndex,
                });
                addLog(`📸 Captured screenshot successfully`);
              }
              break;
            }
            case "sleep": {
              const ms = parseInt(finalValue) || 2000;
              addLog(`Sleeping for ${ms}ms`);
              await p.waitForTimeout(ms);
              break;
            }
            case "wait-visible":
              addLog(`Waiting for ${selector} to become visible`);
              await p.locator(selector).waitFor({ state: "visible", timeout: 15000 });
              break;
            case "assert-hidden":
              addLog(`Asserting element hidden: ${selector}`);
              await p.locator(selector).waitFor({ state: "hidden", timeout: 5000 }).catch(() => {
                throw new Error(`Assertion failed: Element "${selector}" is not hidden`);
              });
              addLog(`✅ Element assertion passed: "${selector}" is hidden`);
              break;
            case "assert-contains": {
              addLog(`Asserting element "${selector}" contains text: "${finalValue}"`);
              await p.locator(selector).waitFor({ state: "visible", timeout: 5000 });
              const content = await p.locator(selector).textContent();
              if (!content || !content.includes(finalValue)) {
                throw new Error(`Assertion failed: Element "${selector}" does not contain text "${finalValue}"`);
              }
              addLog(`✅ Element assertion passed: "${selector}" contains text "${finalValue}"`);
              break;
            }
            case "assert-title": {
              addLog(`Asserting page title matches: "${finalValue}"`);
              const currentTitle = await p.title();
              if (currentTitle !== finalValue) {
                throw new Error(`Assertion failed: Expected title to be "${finalValue}" but got "${currentTitle}"`);
              }
              addLog(`✅ Title assertion passed: matches "${finalValue}"`);
              break;
            }
            case "assert":
            case "verify": {
              addLog(`Asserting: ${selector || finalValue}`);
              // Determine assert target from selector or value
              const assertTarget = selector || finalValue || "";
              if (assertTarget.startsWith("url:")) {
                const expectedFragment = assertTarget.replace("url:", "").trim();
                const currentUrl = p.url();
                if (!currentUrl.includes(expectedFragment)) {
                  throw new Error(
                    `Assertion failed: URL should contain "${expectedFragment}" but got "${currentUrl}"`,
                  );
                }
                addLog(`✅ URL assertion passed: contains "${expectedFragment}"`);
              } else if (assertTarget.startsWith("text:")) {
                const textToFind = assertTarget.replace("text:", "").trim();
                const parts = textToFind.split("|").map((t: string) => t.trim());
                let found = false;
                for (const part of parts) {
                  try {
                    await p.getByText(part, { exact: false }).waitFor({ state: "visible", timeout: 5000 });
                    found = true;
                    addLog(`✅ Text assertion passed: "${part}" is visible`);
                    break;
                  } catch (_) {
                    continue;
                  }
                }
                if (!found) {
                  throw new Error(
                    `Assertion failed: None of [${parts.join(", ")}] found on the page`,
                  );
                }
              } else if (assertTarget) {
                // Locator-based visibility assertion
                await p.locator(assertTarget).waitFor({ state: "visible", timeout: 5000 }).catch(() => {
                  throw new Error(
                    `Assertion failed: Element "${assertTarget}" is not visible`,
                  );
                });
                addLog(`✅ Element assertion passed: "${assertTarget}" is visible`);
              }
              break;
            }
            default:
              addLog(`Unknown action: ${action}`, "warn");
          }

          const stepDuration = Date.now() - stepStartTime;
          if (finalValue) {
            security.analyzePayloadImpact(
              action,
              finalValue,
              stepDuration,
              true,
              currentStepIndex,
            );
          }
        } catch (stepError: any) {
          addLog(
            `Step ${currentStepIndex + 1} failed: ${stepError.message}`,
            "error",
          );
          // 📸 Capture a failure screenshot embedded in logs so the user sees
          // the exact page state at the moment of failure.
          try {
            const failBuffer = await p.screenshot({ type: "png", timeout: 5000 });
            const failBase64 = failBuffer.toString("base64");
            logs.push({
              message: `data:image/png;base64,${failBase64}`,
              level: "screenshot",
              timestamp: new Date().toISOString(),
              step_index: currentStepIndex,
            });
          } catch (_) {
            // Screenshot failed silently — don't block the error
          }
          throw stepError;
        }

        currentStepIndex++;
      }

      addLog("Test execution completed successfully");
      if (p) {
        screenshotPath = await this.takeScreenshot(p, testRunId, "success");
      }
    } catch (error: any) {
      success = false;
      addLog(`Execution error: ${error.message || error}`, "error");
      if (page) {
        screenshotPath = await this.takeScreenshot(page, testRunId, "error");
      }
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return {
      success,
      screenshot: screenshotPath,
      logs,
      vulnerabilities: security.getVulnerabilities(),
    };
  }

  static getCloudRecorderUrl(targetUrl: string): string {
    const apiKey = process.env.BROWSERLESS_API_KEY;
    if (!apiKey) return "";

    // Direct the user to their secure Browserless account dashboard where all playgrounds (BaaS Debugger, Code Generator) are hosted.
    // This avoids Nginx 502 asset loading errors on the shared chrome.browserless.io/debugger/ domain.
    return "https://browserless.io/account";
  }
}
