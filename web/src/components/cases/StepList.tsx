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

  // Sync scriptCode whenever steps change from outside
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
    // Use double-quotes for selectors so single-quotes inside (e.g. [data-qa='x'])
    // don't need backslash escaping — keeps the script clean and parseable.
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
        /page\.(?:.*?)\.(?:click|fill|goto|check|selectOption)/
      );
      let selector = "";
      if (locatorMatch) {
        const rawLocator = trimmed.match(
          /page\.(.*?)\.(?:click|fill|goto|check|selectOption)/
        )?.[1];
        if (rawLocator) {
          if (rawLocator.includes("getByRole")) {
            const roleMatch = rawLocator.match(
              /getByRole\([''"](.*?)[''"'](?:,\s*\{\s*name:\s*['"](.*?)['"]\s*\})?\)/
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
            // Match both single and double-quoted locator strings.
            // Double-quote form: locator("[data-qa='name']")
            // Single-quote form: locator('[data-qa=\'name\']')
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

      // Normalise any remaining escape sequences
      if (selector) {
        selector = selector.replace(/\\'/g, "'").replace(/\\"/g, '"');
      }

      if (trimmed.includes("goto(")) {
        // goto always uses single quotes: goto('url')
        const match = trimmed.match(/goto\(['"]([^'"]*)['"]\)/);
        if (match) parsedSteps.push({ action: "goto", value: match[1] });
      } else if (trimmed.includes("fill(")) {
        // fill value always single-quoted: .fill('[variable]') or .fill('text')
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
      } else if (trimmed.includes("expect(")) {
        // Assert / expect lines:
        // await expect(page).toHaveURL('fragment');
        // await expect(page.getByText('text')).toBeVisible();
        // await expect(page.locator("sel")).toBeVisible();
        if (trimmed.includes(".toHaveURL(")) {
          const urlMatch = trimmed.match(/\.toHaveURL\(['"]([^'"]*)['"]\)/);
          if (urlMatch) parsedSteps.push({ action: "assert", selector: `url:${urlMatch[1]}` });
        } else if (trimmed.includes(".getByText(")) {
          const textMatch = trimmed.match(/\.getByText\(['"]([^'"]*)['"]\)/);
          if (textMatch) parsedSteps.push({ action: "assert", selector: `text:${textMatch[1]}` });
        } else if (trimmed.includes(".locator(")) {
          // Re-use already-parsed selector
          if (selector) parsedSteps.push({ action: "assert", selector });
        }
      }
    });

    // Collapse consecutive fills on same selector
    const optimized: Step[] = [];
    for (let i = 0; i < parsedSteps.length; i++) {
      const cur = parsedSteps[i];
      if (cur.action === "fill" && cur.selector) {
        let next = i + 1;
        while (
          next < parsedSteps.length &&
          parsedSteps[next].action === "fill" &&
          parsedSteps[next].selector === cur.selector
        ) {
          i = next++;
        }
      }
      optimized.push(parsedSteps[i]);
    }

    return optimized;
  };

  // ─── Auto-Parameterize ──────────────────────────────────────────────────────

  const handleAutoParameterizeAll = () => {
    // Parse the current script, parameterize fill values, regenerate
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

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    const parsed = parseSteps(scriptCode);
    if (onUpdateAllSteps) onUpdateAllSteps(parsed);
    onSave(parsed);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Edit Test Steps</h2>
        <div className="flex gap-3">
          <button
            onClick={handleAutoParameterizeAll}
            type="button"
            className="bg-blue-600/10 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 hover:text-white px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
            title="Auto-replace all fill values with [variableName] tokens"
          >
            <span>⚡</span> Auto Parameterize All
          </button>
          <button
            onClick={handleSave}
            disabled={savingSteps}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm transition-all"
          >
            {savingSteps ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Hint bar */}
      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-500/10 bg-blue-500/5 p-4">
        <span className="text-base select-none">💡</span>
        <div className="text-xs text-blue-300/80 leading-relaxed space-y-1">
          <div>
            <code className="text-blue-400 font-bold">page.goto / locator().click() / locator().fill()</code>
            {" "}<span className="text-gray-400">— navigation, clicks, and inputs</span>
          </div>
          <div>
            Use <code className="text-blue-400 font-bold">[variable_name]</code> inside{" "}
            <code className="text-blue-400">fill()</code> to parameterize, then add Assets with matching keys.
          </div>
          <div className="pt-1 border-t border-blue-500/10">
            <span className="text-emerald-400 font-bold">Assertions (NEW):</span>
            <div className="mt-1 font-mono text-[10px] space-y-0.5 text-gray-300">
              <div><span className="text-emerald-400">await expect(page).toHaveURL(</span><span className="text-amber-300">&apos;url-fragment&apos;</span><span className="text-emerald-400">);</span></div>
              <div><span className="text-emerald-400">await expect(page.getByText(</span><span className="text-amber-300">&apos;Thank you&apos;</span><span className="text-emerald-400">)).toBeVisible();</span></div>
              <div><span className="text-emerald-400">await expect(page.locator(</span><span className="text-amber-300">&quot;#success&quot;</span><span className="text-emerald-400">)).toBeVisible();</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Script editor */}
      <textarea
        value={scriptCode}
        onChange={(e) => setScriptCode(e.target.value)}
        rows={20}
        spellCheck={false}
        className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-5 font-mono text-xs text-emerald-400 leading-relaxed focus:border-blue-500 outline-none resize-none shadow-inner transition-colors"
        placeholder={"// await page.goto('...');\n// await page.locator('#id').click();\n// await page.locator('#id').fill('[variable]');"}
      />
    </div>
  );
}
