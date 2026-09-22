import { Request, Response } from "express";
import { chromium, Browser, Page } from "playwright";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecorderSession {
  browser: Browser;
  page: Page;
  steps: string[];
  sseClients: Response[];
  screenshotBuffer: Buffer | null;
  screenshotInterval: NodeJS.Timeout | null;
}

// ─── Session store (in-memory) ───────────────────────────────────────────────

const sessions = new Map<string, RecorderSession>();

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Selector extraction (runs inside browser via page.evaluate) ──────────────

const GET_SELECTOR_FN = `
(function getSelector(el) {
  if (!el) return null;
  const dt = el.getAttribute('data-test') || el.getAttribute('data-testid');
  if (dt) return '[data-test="' + dt + '"]';
  if (el.id) return '#' + el.id;
  const al = el.getAttribute('aria-label');
  if (al) return '[aria-label="' + al + '"]';
  const nm = el.getAttribute('name');
  if (nm) return '[name="' + nm + '"]';
  const ph = el.getAttribute('placeholder');
  if (ph) return '[placeholder="' + ph + '"]';
  return el.tagName.toLowerCase();
})
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function broadcast(session: RecorderSession, data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  session.sseClients.forEach((client) => {
    try { client.write(payload); } catch (_) {}
  });
}

function addStep(session: RecorderSession, step: string) {
  session.steps.push(step);
  broadcast(session, { type: "step", step, steps: session.steps });
}

// ─── Controller ───────────────────────────────────────────────────────────────

export class RecorderController {

  /** POST /api/recorder/start  { url } */
  static async startSession(req: Request, res: Response) {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, message: "url is required" });

      const sessionId = genId();
      const apiKey = process.env.BROWSERLESS_API_KEY;

      let browser: Browser;
      if (apiKey) {
        const ws = `wss://chrome.browserless.io?token=${apiKey}&timeout=300000`;
        browser = await chromium.connectOverCDP(ws, { timeout: 20000 });
      } else {
        browser = await chromium.launch({ headless: true });
      }

      // Reuse existing context when Browserless shares one, else create fresh
      const context =
        browser.contexts().length > 0
          ? browser.contexts()[0]
          : await browser.newContext({ viewport: { width: 1280, height: 800 } });

      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 800 });

      const session: RecorderSession = {
        browser,
        page,
        steps: [],
        sseClients: [],
        screenshotBuffer: null,
        screenshotInterval: null,
      };
      sessions.set(sessionId, session);

      // Record navigation events
      page.on("framenavigated", (frame) => {
        if (frame !== page.mainFrame()) return;
        const navUrl = frame.url();
        if (!navUrl || navUrl === "about:blank" || navUrl.startsWith("chrome")) return;
        const step = `await bob.goto('${navUrl}');`;
        addStep(session, step);
      });

      // Navigate to the target
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Start screenshot polling (~600 ms → ~1.6 fps, lightweight)
      session.screenshotInterval = setInterval(async () => {
        try {
          session.screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 72 });
        } catch (_) {}
      }, 600);

      res.json({ success: true, sessionId, viewport: { width: 1280, height: 800 } });

    } catch (error: any) {
      console.error("[Recorder] startSession error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /** GET /api/recorder/:id/screenshot  — frequent polling, no JSON */
  static getScreenshot(req: Request, res: Response) {
    const session = sessions.get(req.params.id as string);
    if (!session?.screenshotBuffer) {
      return res.status(404).send("No screenshot yet");
    }
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "no-store");
    res.send(session.screenshotBuffer);
  }

  /** GET /api/recorder/:id/stream  — SSE */
  static streamEvents(req: Request, res: Response) {
    const session = sessions.get(req.params.id as string);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    // Immediately send current steps so a reconnecting client catches up
    res.write(`data: ${JSON.stringify({ type: "init", steps: session.steps })}\n\n`);

    session.sseClients.push(res);
    req.on("close", () => {
      session.sseClients = session.sseClients.filter((c) => c !== res);
    });
  }

  /**
   * POST /api/recorder/:id/action
   * Body: { action: "click" | "fill" | "screenshot" | "assert" | "wait", x?, y?, selector?, value? }
   */
  static async performAction(req: Request, res: Response) {
    const session = sessions.get(req.params.id as string);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const { action, x, y, selector, value } = req.body;
    const page = session.page;

    try {
      switch (action) {
        case "click": {
          // Detect what element is at the click position
          const info = await page.evaluate(
            ({ x, y, fnSrc }: { x: number; y: number; fnSrc: string }) => {
              const getSelector = eval(fnSrc) as (el: Element | null) => string | null;
              const el = document.elementFromPoint(x, y) as HTMLElement | null;
              if (!el) return null;
              const tag = el.tagName.toLowerCase();
              const inputType = (el.getAttribute("type") || "").toLowerCase();
              const isTextInput =
                (tag === "input" && !["checkbox", "radio", "submit", "button", "image"].includes(inputType)) ||
                tag === "textarea" ||
                tag === "select";
              return { selector: getSelector(el), isTextInput, tag };
            },
            { x, y, fnSrc: GET_SELECTOR_FN }
          );

          if (!info) return res.json({ success: true, action: "none" });

          if (info.isTextInput) {
            // Don't click — tell frontend to show the fill dialog
            return res.json({ success: true, action: "fill_dialog", selector: info.selector });
          }

          await page.mouse.click(x, y);
          const step = `await bob.click('${info.selector}');`;
          addStep(session, step);
          return res.json({ success: true, action: "click", step });
        }

        case "fill": {
          if (!selector || value === undefined) {
            return res.status(400).json({ success: false, message: "selector and value are required" });
          }
          await page.fill(selector, String(value));
          const step = `await bob.fill('${selector}', '${value}');`;
          addStep(session, step);
          return res.json({ success: true, action: "fill", step });
        }

        case "screenshot": {
          const stepIndex = session.steps.length + 1;
          const step = `await bob.screenshot('step_${stepIndex}');`;
          addStep(session, step);
          return res.json({ success: true, action: "screenshot", step });
        }

        case "assert": {
          if (!selector) return res.status(400).json({ success: false, message: "selector is required" });
          const step = `await bob.expectVisible('${selector}');`;
          addStep(session, step);
          return res.json({ success: true, action: "assert", step });
        }

        case "wait": {
          const ms = parseInt(String(value || 500));
          const step = `await bob.waitForTimeout(${ms});`;
          addStep(session, step);
          return res.json({ success: true, action: "wait", step });
        }

        default:
          return res.status(400).json({ success: false, message: `Unknown action: ${action}` });
      }
    } catch (error: any) {
      console.error("[Recorder] performAction error:", error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /** DELETE /api/recorder/:id/step  — remove a step by index */
  static removeStep(req: Request, res: Response) {
    const session = sessions.get(req.params.id as string);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const index = parseInt(String(req.body.index));
    if (isNaN(index) || index < 0 || index >= session.steps.length) {
      return res.status(400).json({ success: false, message: "Invalid step index" });
    }

    session.steps.splice(index, 1);
    broadcast(session, { type: "update", steps: session.steps });
    res.json({ success: true, steps: session.steps });
  }

  /** DELETE /api/recorder/:id  — stop session, return generated code */
  static async stopSession(req: Request, res: Response) {
    const session = sessions.get(req.params.id as string);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    try {
      if (session.screenshotInterval) clearInterval(session.screenshotInterval);
      await session.browser.close();
    } catch (_) {}

    const code = RecorderController.generateCode(session.steps);
    broadcast(session, { type: "done", code, steps: session.steps });

    sessions.delete(req.params.id as string);
    res.json({ success: true, code, steps: session.steps });
  }

  // ─── Code generator ────────────────────────────────────────────────────────

  private static generateCode(steps: string[]): string {
    return [
      `const { bob } = require('bobtester');`,
      `const path = require('path');`,
      `const { runActiveRows } = require('../utils/function/runner');`,
      ``,
      `const testName = path.basename(__filename, '.js');`,
      `const testData = require(\`../data/\${testName}.json\`);`,
      ``,
      `bob.run(async () => {`,
      ...steps.map((s) => `  ${s}`),
      `});`,
    ].join("\n");
  }
}
