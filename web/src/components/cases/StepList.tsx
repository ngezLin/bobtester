"use client";

import { useState, useEffect } from "react";

interface Step {
  action: string;
  selector?: string;
  value?: string | number;
}

interface StepListProps {
  steps: Step[];
  savingSteps: boolean;
  onSave: (stepsToSave?: Step[]) => void;
  onUpdateStep: (index: number, field: string, value: string) => void;
  onDeleteStep: (index: number) => void;
  onUpdateAllSteps?: (newSteps: Step[]) => void;
}

export default function StepList({
  steps,
  savingSteps,
  onSave,
  onUpdateAllSteps,
}: StepListProps) {
  const [scriptCode, setScriptCode] = useState("");

  // Assertion builder form state
  const [assertType, setAssertType] = useState("assert");
  const [assertSelector, setAssertSelector] = useState("");
  const [assertVal, setAssertVal] = useState("");

  // Sync scriptCode whenever props steps change
  useEffect(() => {
    setScriptCode(generateFullScript(steps));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const cleanSelectorToVarName = (selector: string): string => {
    if (!selector) return "variable";

    let key = "";
    const dataAttrMatch = selector.match(
      /\[data-(?:qa|testid|test|id)=['"'"]?(.*?)['"'"]?\]/
    );
    if (dataAttrMatch) {
      key = dataAttrMatch[1].replace(/\\/g, "");
    } else {
      const attrMatch = selector.match(
        /\[(?:name|id|placeholder)=['"'"]?(.*?)['"'"]?\]/
      );
      if (attrMatch) {
        key = attrMatch[1].replace(/\\/g, "");
      } else {
        let cleaned = selector
          .replace(/[\[\]'"#.]/g, "")
          .replace(/\\/g, "")
          .trim();
        const parts = cleaned.split(/[>\s]+/);
        key = parts[parts.length - 1];
      }
    }

    key = key.replace(/['"]/g, "");
    key = key.replace(/[-_]+(\w)/g, (_, c) => c.toUpperCase());
    if (key) key = key.charAt(0).toLowerCase() + key.slice(1);

    return key || "variable";
  };

  const getPlaywrightLine = (step: Step): string => {
    const sel = step.selector ?? "";
    const val = step.value !== undefined ? String(step.value) : "";

    switch (step.action) {
      case "goto":
        return `await page.goto('${val}');`;
      case "click":
        return `await page.locator("${sel}").click();`;
      case "fill":
        return `await page.locator("${sel}").fill('${val}');`;
      case "assert":
      case "verify":
        if (sel.startsWith("url:")) {
          return `await expect(page).toHaveURL('${sel.replace("url:", "").trim()}');`;
        } else if (sel.startsWith("text:")) {
          return `await expect(page.getByText('${sel.replace("text:", "").trim()}')).toBeVisible();`;
        } else {
          return `await expect(page.locator("${sel}")).toBeVisible();`;
        }
      case "assert-hidden":
        return `await expect(page.locator("${sel}")).toBeHidden();`;
      case "assert-contains":
        return `await expect(page.locator("${sel}")).toContainText('${val}');`;
      case "assert-title":
        return `await expect(page).toHaveTitle('${val}');`;
      case "screenshot":
        return `await page.screenshot({ fullPage: true });`;
      case "sleep":
        return `await page.waitForTimeout(${parseInt(val) || 2000});`;
      case "wait-visible":
        return `await page.locator("${sel}").waitFor({ state: 'visible' });`;
      default:
        return `// Unknown action: ${step.action}`;
    }
  };

  const generateFullScript = (stepsList: Step[]): string => {
    return stepsList.map((s) => getPlaywrightLine(s)).join("\n");
  };

  const parseSteps = (codeStr: string): Step[] => {
    const parsedSteps: Step[] = [];
    const lines = codeStr.split("\n");

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return;

      // Extract selector from locator('...')
      const locatorMatch = trimmed.match(
        /page\.(?:.*?)\.(?:click|fill|goto|check|selectOption|waitFor)/
      );
      let selector = "";
      if (locatorMatch) {
        const rawLocator = trimmed.match(
          /page\.(.*?)\.(?:click|fill|goto|check|selectOption|waitFor)/
        )?.[1];
        if (rawLocator) {
          if (rawLocator.includes("getByRole")) {
            const roleMatch = rawLocator.match(
              /getByRole\(['"](.*?)['"](?:,\s*\{\s*name:\s*['"](.*?)['"]\s*\})?\)/
            );
            if (roleMatch) {
              selector = roleMatch[2]
                ? `internal:role=${roleMatch[1]}[name="${roleMatch[2]}"i]`
                : `internal:role=${roleMatch[1]}`;
            }
          } else if (rawLocator.includes("getBy")) {
            const genericMatch = rawLocator.match(/getBy.*?\(['"](.*?)['"]\)/);
            if (genericMatch) {
              if (rawLocator.includes("Placeholder"))
                selector = `[placeholder="${genericMatch[1]}"]`;
              else if (rawLocator.includes("Label"))
                selector = `label:has-text("${genericMatch[1]}")`;
              else if (rawLocator.includes("Text"))
                selector = `text="${genericMatch[1]}"`;
              else selector = genericMatch[1];
            }
          } else {
            const dqMatch = rawLocator.match(/(?:locator|locate)\("(.*?)"\)/);
            const sqMatch = rawLocator.match(/(?:locator|locate)\('((?:[^'\\]|\\.)*)'\)/);
            if (dqMatch) {
              selector = dqMatch[1];
            } else if (sqMatch) {
              selector = sqMatch[1].replace(/\\'/g, "'");
            } else {
              selector = rawLocator;
            }
          }
        }
      }

      if (selector) {
        selector = selector.replace(/\\'/g, "'").replace(/\\"/g, '"');
      }

      if (trimmed.includes("goto(")) {
        const match = trimmed.match(/goto\(['"]([^'"]*)['"]\)/);
        if (match) parsedSteps.push({ action: "goto", value: match[1] });
      } else if (trimmed.includes("fill(")) {
        const valueMatch = trimmed.match(/\.fill\('((?:[^'\\]|\\.)*)'\)/);
        if (valueMatch) {
          parsedSteps.push({
            action: "fill",
            selector,
            value: valueMatch[1].replace(/\\'/g, "'"),
          });
        }
      } else if (trimmed.includes("click()")) {
        parsedSteps.push({ action: "click", selector });
      } else if (trimmed.includes("screenshot(")) {
        parsedSteps.push({ action: "screenshot" });
      } else if (trimmed.includes("waitForTimeout(")) {
        const match = trimmed.match(/waitForTimeout\((\d+)\)/);
        parsedSteps.push({ action: "sleep", value: match ? match[1] : "2000" });
      } else if (trimmed.includes("waitFor({ state: 'visible' })") || trimmed.includes('waitFor({ state: "visible" })') || (trimmed.includes(".waitFor(") && selector)) {
        parsedSteps.push({ action: "wait-visible", selector });
      } else if (trimmed.includes("expect(")) {
        if (trimmed.includes(".toHaveURL(")) {
          const urlMatch = trimmed.match(/\.toHaveURL\(['"]([^'"]*)['"]\)/);
          if (urlMatch) parsedSteps.push({ action: "assert", selector: `url:${urlMatch[1]}` });
        } else if (trimmed.includes(".getByText(")) {
          const textMatch = trimmed.match(/\.getByText\(['"]([^'"]*)['"]\)/);
          if (textMatch) parsedSteps.push({ action: "assert", selector: `text:${textMatch[1]}` });
        } else if (trimmed.includes(".toBeHidden()")) {
          const selMatch = trimmed.match(/expect\(page\.locator\("([^"]*)"\)\)/);
          const finalSel = selMatch ? selMatch[1] : selector;
          if (finalSel) parsedSteps.push({ action: "assert-hidden", selector: finalSel });
        } else if (trimmed.includes(".toContainText(")) {
          const valMatch = trimmed.match(/\.toContainText\('([^']*)'\)/) || trimmed.match(/\.toContainText\("([^"]*)"\)/);
          const selMatch = trimmed.match(/expect\(page\.locator\("([^"]*)"\)\)/);
          const finalSel = selMatch ? selMatch[1] : selector;
          if (finalSel && valMatch) parsedSteps.push({ action: "assert-contains", selector: finalSel, value: valMatch[1] });
        } else if (trimmed.includes(".toHaveTitle(")) {
          const titleMatch = trimmed.match(/\.toHaveTitle\('([^']*)'\)/) || trimmed.match(/\.toHaveTitle\("([^"]*)"\)/);
          if (titleMatch) parsedSteps.push({ action: "assert-title", value: titleMatch[1] });
        } else if (trimmed.includes(".toBeVisible()")) {
          const selMatch = trimmed.match(/expect\(page\.locator\("([^"]*)"\)\)/);
          const finalSel = selMatch ? selMatch[1] : selector;
          if (finalSel) parsedSteps.push({ action: "assert", selector: finalSel });
        }
      }
    });

    return parsedSteps;
  };

  // ─── Code Injector Helper ──────────────────────────────────────────────────

  const appendCodeLine = (line: string) => {
    setScriptCode((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n${line}` : line;
    });
  };

  // ─── Visual Builders ───────────────────────────────────────────────────────

  const handleInsertAssertion = (e: React.FormEvent) => {
    e.preventDefault();
    if (assertType === "assert-title" && !assertVal) return;
    if (assertType !== "assert-title" && !assertSelector) return;

    let finalSel = assertSelector;
    let codeLine = "";

    if (assertType === "assert") {
      if (assertSelector.startsWith("url:") || assertSelector.startsWith("text:")) {
        // use directly
      } else {
        if (assertSelector.includes("/") || assertSelector.includes(".") || assertSelector.includes("#") || assertSelector.includes("[")) {
          // css selector
        } else {
          finalSel = `text:${assertSelector}`;
        }
      }
    }

    const mockStep: Step = { action: assertType, selector: finalSel, value: assertVal };
    codeLine = getPlaywrightLine(mockStep);
    
    appendCodeLine(codeLine);
    setAssertSelector("");
    setAssertVal("");
  };

  const handleAutoParameterizeAll = () => {
    const parsed = parseSteps(scriptCode);
    const parameterized = parsed.map((step) => {
      if (
        step.action === "fill" &&
        step.selector &&
        step.value !== undefined
      ) {
        const val = step.value.toString();
        if (!val.startsWith("[") || !val.endsWith("]")) {
          return { ...step, value: `[${cleanSelectorToVarName(step.selector)}]` };
        }
      }
      return step;
    });
    const newScript = generateFullScript(parameterized);
    setScriptCode(newScript);
    if (onUpdateAllSteps) onUpdateAllSteps(parameterized);
  };

  const handleSave = () => {
    const finalSteps = parseSteps(scriptCode);
    if (onUpdateAllSteps) onUpdateAllSteps(finalSteps);
    onSave(finalSteps);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Editor Main Section */}
      <div className="xl:col-span-8 bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col h-full">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">Playwright Script Editor</h2>
            <p className="text-xs text-gray-400 mt-1">Configure action workflows and assertions</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoParameterizeAll}
              type="button"
              className="bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 hover:text-white px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
              title="Parameterize variables automatically"
            >
              <span>⚡</span> Parameterize
            </button>

            <button
              onClick={handleSave}
              disabled={savingSteps}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-600/20"
            >
              {savingSteps ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Script Editor Panel */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
            <span className="text-sm select-none">💻</span>
            <p className="text-xs text-blue-300/80 leading-relaxed">
              Direct Playwright JS script compiler mode. Use the toolbox panel on the right to build assertions, insert delay timeouts, and take visual screenshots automatically.
            </p>
          </div>
          <textarea
            value={scriptCode}
            onChange={(e) => setScriptCode(e.target.value)}
            rows={22}
            spellCheck={false}
            className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-5 font-mono text-xs text-emerald-400 leading-relaxed focus:border-blue-500 outline-none resize-none shadow-inner transition-colors"
            placeholder="// await page.goto('...');"
          />
        </div>
      </div>

      {/* Toolbox Panel */}
      <div className="xl:col-span-4 space-y-6">
        {/* Quick actions box */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-md">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Quick actions</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Click to instantly inject pre-formatted utility steps into your current Playwright script.
          </p>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => appendCodeLine(`await page.screenshot({ fullPage: true });`)}
              type="button"
              className="bg-gray-950 border border-gray-800 hover:border-pink-500/40 p-4 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div>
                <p className="font-bold text-sm text-white group-hover:text-pink-400 transition-colors">📸 Take Screenshot</p>
                <p className="text-[10px] text-gray-500 mt-1">Capture visual state for visual QA verification</p>
              </div>
              <span className="text-xl">➔</span>
            </button>

            <button
              onClick={() => appendCodeLine(`await page.waitForTimeout(2000);`)}
              type="button"
              className="bg-gray-950 border border-gray-800 hover:border-teal-500/40 p-4 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div>
                <p className="font-bold text-sm text-white group-hover:text-teal-400 transition-colors">⏱️ Sleep Delay</p>
                <p className="text-[10px] text-gray-500 mt-1">Wait for specified milliseconds (e.g. 2000ms)</p>
              </div>
              <span className="text-xl">➔</span>
            </button>

            <button
              onClick={() => appendCodeLine(`await page.locator("selector").waitFor({ state: 'visible' });`)}
              type="button"
              className="bg-gray-950 border border-gray-800 hover:border-cyan-500/40 p-4 rounded-2xl text-left flex items-center justify-between group transition-all"
            >
              <div>
                <p className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">🔍 Wait for Element</p>
                <p className="text-[10px] text-gray-500 mt-1">Wait intelligently until the selector is visible</p>
              </div>
              <span className="text-xl">➔</span>
            </button>
          </div>
        </section>

        {/* Assertions builder */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-md">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Assertions builder</h3>

          <form onSubmit={handleInsertAssertion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assertion Type</label>
              <select
                value={assertType}
                onChange={(e) => setAssertType(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              >
                <option value="assert">Check Element/Text Visible</option>
                <option value="assert-hidden">Check Element Hidden</option>
                <option value="assert-contains">Check Element Contains Text</option>
                <option value="assert-title">Check Page Title</option>
              </select>
            </div>

            {assertType !== "assert-title" && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {assertType === "assert" ? "Selector OR Plain Text" : "CSS Selector"}
                </label>
                <input
                  type="text"
                  required
                  value={assertSelector}
                  onChange={(e) => setAssertSelector(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                  placeholder={assertType === "assert" ? "e.g. Success! OR #modal" : "e.g. #error-alert"}
                />
              </div>
            )}

            {assertType !== "assert" && assertType !== "assert-hidden" && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Expected Value</label>
                <input
                  type="text"
                  required
                  value={assertVal}
                  onChange={(e) => setAssertVal(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                  placeholder={assertType === "assert-title" ? "e.g. Dashboard - BobTester" : "e.g. Invalid password"}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-blue-600/10"
            >
              + Append Assertion Step
            </button>
          </form>
        </section>

        {/* Assertion examples guide */}
        <section className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-md text-xs text-gray-400 space-y-2">
          <p className="font-bold text-white mb-2 uppercase tracking-widest text-[10px] text-gray-500">Playwright Code Guide</p>
          <div className="space-y-2 font-mono text-[10px] leading-relaxed">
            <div>
              <p className="text-gray-500 font-sans">Check URL matches exactly:</p>
              <code className="text-emerald-400">await expect(page).toHaveURL(&apos;/dashboard&apos;);</code>
            </div>
            <div>
              <p className="text-gray-500 font-sans">Wait until hidden:</p>
              <code className="text-emerald-400">await expect(locator).toBeHidden();</code>
            </div>
            <div>
              <p className="text-gray-500 font-sans">Visual regression check:</p>
              <code className="text-emerald-400">await page.screenshot(&apos;...&apos;);</code>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
