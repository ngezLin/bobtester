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
      // Give CSS transitions (modal entrance/exit fades, layout shifts) time to settle into final state
      try {
        await page.waitForTimeout(450);
      } catch (_) {}

      // Capture screenshot into memory buffer (JPEG quality 75 produces crisp, lightweight images ~35-50KB)
      const buffer = await page.screenshot({
        type: "jpeg",
        quality: 75,
        timeout: 5000,
      });

      // Best effort local storage save for local dev inspection
      try {
        const storageDir = path.join(process.cwd(), "storage", "screenshots");
        if (!fs.existsSync(storageDir)) {
          fs.mkdirSync(storageDir, { recursive: true });
        }
        const fileName = `test-${testRunId}-${name}-${Date.now()}.jpg`;
        fs.writeFileSync(path.join(storageDir, fileName), buffer);
      } catch (_) {
        // Read-only filesystem in serverless environments (Vercel/AWS Lambda) — safely ignore
      }

      return `data:image/jpeg;base64,${buffer.toString("base64")}`;
    } catch (e: any) {
      console.warn(`⚠️ [Playwright] Failed to take screenshot: ${e.message}`);
      return undefined;
    }
  }

  static async executeDynamicTest(
    testRunId: number,
    steps: any,
    assetData: any = {},
    caseId?: number,
    targetUrl?: string,
  ): Promise<{
    success: boolean;
    screenshot?: string;
    logs: any[];
    vulnerabilities: Vulnerability[];
  }> {
    // Check if steps is a modular script bundle ({ type: "script", files: { ... } })
    let parsedSteps = steps;
    if (typeof parsedSteps === "string") {
      try {
        parsedSteps = JSON.parse(parsedSteps);
      } catch (_) {}
    }
    if (
      parsedSteps &&
      typeof parsedSteps === "object" &&
      !Array.isArray(parsedSteps) &&
      (parsedSteps.type === "script" || parsedSteps.files)
    ) {
      return await this.executeModularScript(
        testRunId,
        parsedSteps,
        assetData,
        caseId,
        targetUrl,
      );
    }

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

      // Fallback: If targetUrl was not passed directly but caseId is provided, attempt to fetch target_url
      let resolvedTargetUrl = targetUrl;
      if (!resolvedTargetUrl && caseId) {
        try {
          const { data } = await supabase
            .from("test_cases")
            .select("target_url")
            .eq("id", caseId)
            .single();
          if (data?.target_url) resolvedTargetUrl = data.target_url;
        } catch (_) {}
      }

      // Check if steps start with a "goto" action. If not, auto-prepend navigation to resolvedTargetUrl
      const hasInitialGoto =
        Array.isArray(steps) && steps.length > 0 && steps[0]?.action === "goto";
      if (!hasInitialGoto && resolvedTargetUrl) {
        addLog(`Auto-navigating to target URL: ${resolvedTargetUrl}`);
        steps = [
          { action: "goto", value: resolvedTargetUrl },
          ...(Array.isArray(steps) ? steps : []),
        ];
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
        if (value && typeof value === "string" && value.includes("[") && value.includes("]")) {
          const varName = value.match(/\[(.*?)\]/)?.[1];
          if (varName) {
            if (assetData && assetData[varName] !== undefined) {
              finalValue = value.replace(`[${varName}]`, String(assetData[varName]));
              addLog(`Substituted [${varName}] with asset value`);
            } else {
              addLog(
                `⚠️ Variable [${varName}] was not found in the selected Data Set. The literal text "${value}" will be typed.`,
                "warn",
              );
            }
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
              try {
                await p.locator(selector).fill(finalValue || "");
              } catch (fillErr: any) {
                if (fillErr.message && fillErr.message.includes("strict mode violation")) {
                  addLog(
                    `⚠️ Multiple elements matched ${selector}. Attempting to fill the active/last visible element...`,
                    "warn",
                  );
                  const locators = p.locator(selector);
                  const count = await locators.count();
                  let filled = false;
                  for (let i = count - 1; i >= 0; i--) {
                    const item = locators.nth(i);
                    if (await item.isVisible()) {
                      await item.fill(finalValue || "");
                      filled = true;
                      break;
                    }
                  }
                  if (!filled) throw fillErr;
                } else {
                  throw fillErr;
                }
              }
              break;
            case "click":
              addLog(`Clicking ${selector}`);
              try {
                await p.locator(selector).click({ timeout: 15000 });
              } catch (clickErr: any) {
                if (clickErr.message && clickErr.message.includes("strict mode violation")) {
                  addLog(
                    `⚠️ Multiple elements matched ${selector}. Attempting to click the active/last visible element...`,
                    "warn",
                  );
                  const locators = p.locator(selector);
                  const count = await locators.count();
                  let clicked = false;
                  for (let i = count - 1; i >= 0; i--) {
                    const item = locators.nth(i);
                    if (await item.isVisible()) {
                      await item.click({ timeout: 15000 });
                      clicked = true;
                      break;
                    }
                  }
                  if (!clicked) throw clickErr;
                } else {
                  throw clickErr;
                }
              }
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
              } else if (selector && (selector.includes("button") || selector.includes("submit") || selector.includes("form") || selector.startsWith("a"))) {
                try {
                  await p.waitForLoadState("domcontentloaded", { timeout: 3000 });
                } catch (_) {
                  // Continue if no navigation occurs
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
            const failBuffer = await p.screenshot({
              type: "jpeg",
              quality: 75,
              timeout: 5000,
            });
            const failBase64 = failBuffer.toString("base64");
            logs.push({
              message: `data:image/jpeg;base64,${failBase64}`,
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
        if (screenshotPath) {
          logs.push({
            message: screenshotPath,
            level: "screenshot",
            timestamp: new Date().toISOString(),
            step_index: "result",
          });
        }
      }
    } catch (error: any) {
      success = false;
      addLog(`Execution error: ${error.message || error}`, "error");
      if (page) {
        screenshotPath = await this.takeScreenshot(page, testRunId, "error");
        if (screenshotPath) {
          logs.push({
            message: screenshotPath,
            level: "screenshot",
            timestamp: new Date().toISOString(),
            step_index: "result",
          });
        }
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

  static async executeModularScript(
    testRunId: number,
    scriptBundle: { entry?: string; files: Record<string, string> },
    assetData: any = {},
    caseId?: number,
    targetUrl?: string,
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

    try {
      addLog("Starting modular script execution with Security Probing enabled");

      // Robustness for assetData
      if (typeof assetData === "string") {
        try {
          assetData = JSON.parse(assetData);
        } catch (_) {
          assetData = {};
        }
      }

      // Resolve target URL fallback
      let resolvedTargetUrl = targetUrl;
      if (!resolvedTargetUrl && caseId) {
        try {
          const { data } = await supabase
            .from("test_cases")
            .select("target_url")
            .eq("id", caseId)
            .single();
          if (data?.target_url) resolvedTargetUrl = data.target_url;
        } catch (_) {}
      }
      if (resolvedTargetUrl && !assetData.targetUrl && !assetData.baseUrl) {
        assetData.targetUrl = resolvedTargetUrl;
        assetData.baseUrl = resolvedTargetUrl;
      }

      addLog("Launching browser for modular IDE execution...");
      browser = await this.launchBrowser();
      context = await browser.newContext();
      const p = await context.newPage();
      page = p;

      // 1. XSS Sniffer (Dialogs)
      p.on("dialog", async (dialog: any) => {
        const message = dialog.message();
        const dialogType = dialog.type();
        addLog(`[Dialog Intercepted] Type: "${dialogType}", Message: "${message}"`);
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
          });
          await dialog.dismiss();
        } else {
          await dialog.accept();
        }
      });

      // 2. Console Listener (DOM XSS / Leaks)
      p.on("console", (msg: any) => {
        const text = msg.text();
        if (text.includes("XSS") || text.includes("BOB_") || text.includes("<script>")) {
          security.addVulnerability({
            type: "Console Output Leak / DOM XSS",
            severity: "MEDIUM",
            evidence: `Suspicious execution pattern in console log: "${text.substring(0, 150)}"`,
          });
        }
      });

      // 3. Response Scanner (SQLi & Headers)
      p.on("response", async (response: any) => {
        try {
          const url = response.url();
          const status = response.status();
          const headers = response.headers();
          const contentType = headers["content-type"] || "";
          let body = "";
          if (contentType.includes("text") || contentType.includes("json")) {
            body = await response.text();
          }
          security.scanResponse(url, status, headers, body, 0);
        } catch (_) {}
      });

      // Wrap page with live action logger & asset variable interpolation
      const wrappedPage = new Proxy(p, {
        get(target: any, prop: string | symbol, receiver: any) {
          const orig = target[prop];
          if (typeof orig === "function") {
            if (prop === "goto") {
              return async (url: string, options?: any) => {
                let finalUrl = url;
                if (finalUrl && typeof finalUrl === "string" && finalUrl.includes("[") && finalUrl.includes("]")) {
                  const varName = finalUrl.match(/\[(.*?)\]/)?.[1];
                  if (varName && assetData[varName] !== undefined) {
                    finalUrl = finalUrl.replace(`[${varName}]`, String(assetData[varName]));
                  }
                }
                addLog(`Navigating to ${finalUrl}`);
                return await orig.call(target, finalUrl, { waitUntil: "domcontentloaded", timeout: 30000, ...options });
              };
            }
            if (prop === "click") {
              return async (selector: string, options?: any) => {
                addLog(`Clicking ${selector}`);
                return await orig.call(target, selector, { timeout: 15000, ...options });
              };
            }
            if (prop === "fill") {
              return async (selector: string, value: string, options?: any) => {
                let finalValue = value;
                if (finalValue && typeof finalValue === "string" && finalValue.includes("[") && finalValue.includes("]")) {
                  const varName = finalValue.match(/\[(.*?)\]/)?.[1];
                  if (varName && assetData[varName] !== undefined) {
                    finalValue = finalValue.replace(`[${varName}]`, String(assetData[varName]));
                  }
                }
                addLog(`Filling ${selector} with "${finalValue}"`);
                return await orig.call(target, selector, finalValue, { timeout: 15000, ...options });
              };
            }
            if (prop === "screenshot") {
              return async (options?: any) => {
                addLog(`Capturing step screenshot...`);
                const scr = await PlaywrightService.takeScreenshot(p, testRunId, "manual");
                if (scr) {
                  logs.push({
                    message: scr,
                    level: "screenshot",
                    timestamp: new Date().toISOString(),
                    step_index: "manual",
                  });
                  addLog(`📸 Captured screenshot successfully`);
                }
                return scr;
              };
            }
            return orig.bind(target);
          }
          return Reflect.get(target, prop, receiver);
        }
      });

      // Prepare files and entrypoint
      const files = scriptBundle.files || {};
      const entryFile =
        scriptBundle.entry ||
        (files["main.js"] ? "main.js" : Object.keys(files)[0] || "main.js");
      const mainContent = files[entryFile] || "";

      // Combine helper modules into scope
      let moduleDeclarations = "";
      for (const [filePath, code] of Object.entries(files)) {
        if (filePath !== entryFile) {
          const cleaned = code
            .replace(/export\s+default\s+/g, "")
            .replace(/export\s+/g, "");
          moduleDeclarations += `\n/* Module: ${filePath} */\n${cleaned}\n`;
        }
      }

      const cleanedMain = mainContent.replace(/import\s+.*?['"].*?['"];?/g, "");

      addLog(`Executing modular script entrypoint: ${entryFile}`);

      // Construct asynchronous execution sandbox
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as any;
      const runnerFn = new AsyncFunction(
        "page",
        "asset",
        "addLog",
        "screenshot",
        "sleep",
        `
          ${moduleDeclarations}

          // Auto-inject page and asset context to static classes (COMMON, transactionMenu, etc.)
          const declaredObjects = [
            typeof COMMON !== "undefined" ? COMMON : null,
            typeof transactionMenu !== "undefined" ? transactionMenu : null,
            typeof TransactionMenu !== "undefined" ? TransactionMenu : null,
          ].filter(Boolean);

          for (const obj of declaredObjects) {
            try {
              if (obj) {
                obj.page = page;
                obj.asset = asset;
              }
            } catch (_) {}
          }

          ${cleanedMain}
        `,
      );

      await runnerFn(
        wrappedPage,
        assetData,
        addLog,
        async (name?: string) => {
          const scr = await PlaywrightService.takeScreenshot(p, testRunId, name || "step");
          if (scr) {
            logs.push({
              message: scr,
              level: "screenshot",
              timestamp: new Date().toISOString(),
              step_index: "manual",
            });
            addLog(`📸 Captured screenshot: ${name || "step"}`);
          }
          return scr;
        },
        (ms: number) => p.waitForTimeout(ms),
      );

      addLog("Modular script execution completed successfully");
      if (p) {
        screenshotPath = await this.takeScreenshot(p, testRunId, "success");
        if (screenshotPath) {
          logs.push({
            message: screenshotPath,
            level: "screenshot",
            timestamp: new Date().toISOString(),
            step_index: "result",
          });
        }
      }
    } catch (error: any) {
      success = false;
      addLog(`Execution error: ${error.message || error}`, "error");
      if (page) {
        screenshotPath = await this.takeScreenshot(page, testRunId, "error");
        if (screenshotPath) {
          logs.push({
            message: screenshotPath,
            level: "screenshot",
            timestamp: new Date().toISOString(),
            step_index: "result",
          });
        }
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
