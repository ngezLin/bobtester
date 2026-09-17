"use client";

import { useState, useEffect } from "react";
import { translateJsonToPlaywright } from "@/utils/recorderTranslator";

export interface Step {
  action: string;
  selector?: string;
  value?: string | number;
}

export const cleanSelectorToVarName = (selector: string, usedKeys?: Set<string>): string => {
  if (!selector) return "field";

  let key = "";
  // 1. Check data-testid, data-qa, etc.
  const dataAttrMatch = selector.match(/\[data-(?:qa|testid|test|id)=['"]?(.*?)['"]?\]/);
  if (dataAttrMatch) {
    key = dataAttrMatch[1].replace(/\\/g, "");
  } else {
    // 2. Check aria-label, placeholder, name, id
    const attrMatch = selector.match(/\[(?:name|id|placeholder|aria-label)=['"]?(.*?)['"]?\]/);
    if (attrMatch) {
      let raw = attrMatch[1].replace(/\\/g, "").trim();
      raw = raw.replace(/^e\.?g\.?\s*/i, "");
      raw = raw.replace(/\.{2,}/g, "").trim();
      const words = raw.split(/\s+/).slice(0, 3).join(" ");
      key = words;
    } else {
      // 3. Fallback from CSS selector
      const lower = selector.toLowerCase();
      if (lower.includes("textarea")) {
        key = "description";
      } else if (lower.includes("password")) {
        key = "password";
      } else if (lower.includes("user") || lower.includes("email") || lower.includes("login")) {
        key = "username";
      } else if (lower.includes("price") || lower.includes("harga")) {
        key = "price";
      } else if (lower.includes("stock") || lower.includes("stok") || lower.includes("qty")) {
        key = "stock";
      } else if (lower.includes("search") || lower.includes("cari")) {
        key = "searchQuery";
      } else {
        // Strip tailwind utility noise: space-y, flex, grid, relative, nth-of-type, bg, text, etc.
        let cleaned = selector
          .replace(/nth-of-type\(\d+\)/gi, "")
          .replace(/(?:space-[xy]|flex|grid|relative|col-span|row-span|bg|text|border|rounded|shadow|items|justify|gap)[^\s>.]*/gi, "")
          .replace(/[\[\]'"#.\\]/g, " ")
          .replace(/[>\s]+/g, " ")
          .trim();

        const words = cleaned.split(/\s+/).filter(
          (w) => !["form", "div", "main", "aside", "section", "span", "p", "a", "button", "label", "input"].includes(w.toLowerCase()) && w.length > 1
        );

        if (words.length > 0) {
          key = words.slice(-2).join(" ");
        } else {
          key = "field";
        }
      }
    }
  }

  key = key.replace(/[^a-zA-Z0-9_\-\s]/g, " ").trim();
  key = key.replace(/[-_\s]+(\w)/g, (_, c) => c.toUpperCase());
  if (key) key = key.charAt(0).toLowerCase() + key.slice(1);
  if (!key) key = "field";

  if (usedKeys) {
    let uniqueKey = key;
    let counter = 1;
    while (usedKeys.has(uniqueKey)) {
      uniqueKey = `${key}_${counter}`;
      counter++;
    }
    usedKeys.add(uniqueKey);
    return uniqueKey;
  }

  return key;
};

export const getPlaywrightLine = (step: Step): string => {
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

export const generateFullScript = (stepsList: Step[]): string => {
  return stepsList.map((s) => getPlaywrightLine(s)).join("\n");
};

export const parseSteps = (codeStr: string): Step[] => {
  const parsedSteps: Step[] = [];
  const lines = codeStr.split("\n");

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) return;

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
    } else if (
      trimmed.includes("waitFor({ state: 'visible' })") ||
      trimmed.includes('waitFor({ state: "visible" })') ||
      (trimmed.includes(".waitFor(") && selector)
    ) {
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
        const valMatch =
          trimmed.match(/\.toContainText\('([^']*)'\)/) ||
          trimmed.match(/\.toContainText\("([^"]*)"\)/);
        const selMatch = trimmed.match(/expect\(page\.locator\("([^"]*)"\)\)/);
        const finalSel = selMatch ? selMatch[1] : selector;
        if (finalSel && valMatch)
          parsedSteps.push({ action: "assert-contains", selector: finalSel, value: valMatch[1] });
      } else if (trimmed.includes(".toHaveTitle(")) {
        const titleMatch =
          trimmed.match(/\.toHaveTitle\('([^']*)'\)/) ||
          trimmed.match(/\.toHaveTitle\("([^"]*)"\)/);
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

interface StepListProps {
  steps: Step[];
  savingSteps: boolean;
  onSave: (stepsToSave?: Step[]) => void;
  onUpdateStep?: (index: number, field: string, value: string) => void;
  onDeleteStep?: (index: number) => void;
  onUpdateAllSteps?: (newSteps: Step[]) => void;
  scriptCode: string;
  onScriptChange: (newCode: string) => void;
  onOpenGuide?: () => void;
}

export default function StepList({
  steps,
  savingSteps,
  onSave,
  onUpdateAllSteps,
  scriptCode,
  onScriptChange,
  onOpenGuide,
}: StepListProps) {
  // Sync scriptCode if empty and steps exist
  useEffect(() => {
    if (!scriptCode && steps.length > 0) {
      onScriptChange(generateFullScript(steps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const handleAutoParameterizeAll = () => {
    const parsed = parseSteps(scriptCode);
    const usedKeys = new Set<string>();

    // Pre-populate usedKeys with already parameterized variables like [username]
    parsed.forEach((step) => {
      if (step.action === "fill" && step.value !== undefined) {
        const val = step.value.toString().trim();
        const match = val.match(/^\[(.*?)\]$/);
        if (match) {
          usedKeys.add(match[1]);
        }
      }
    });

    const parameterized = parsed.map((step) => {
      if (
        step.action === "fill" &&
        step.selector &&
        step.value !== undefined
      ) {
        const val = step.value.toString().trim();
        if (!val.startsWith("[") || !val.endsWith("]")) {
          const varName = cleanSelectorToVarName(step.selector, usedKeys);
          return { ...step, value: `[${varName}]` };
        }
      }
      return step;
    });
    const newScript = generateFullScript(parameterized);
    onScriptChange(newScript);
    if (onUpdateAllSteps) onUpdateAllSteps(parameterized);
  };

  const handleSave = () => {
    const finalSteps = parseSteps(scriptCode);
    if (onUpdateAllSteps) onUpdateAllSteps(finalSteps);
    onSave(finalSteps);
  };

  const detectedStepsCount = parseSteps(scriptCode).length;

  const handleScriptChange = (val: string) => {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.includes('"steps"')) {
      const translated = translateJsonToPlaywright(val);
      onScriptChange(translated);
      const parsed = parseSteps(translated);
      if (onUpdateAllSteps) onUpdateAllSteps(parsed);
    } else {
      onScriptChange(val);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 flex flex-col shadow-sm relative">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-5 pb-5 border-b border-zinc-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block animate-pulse" />
            <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-red-600">
              Playwright Script Engine
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">Flow Script Editor</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Edit actions directly in Playwright JS code format.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAutoParameterizeAll}
            type="button"
            className="rounded-full px-4 py-2 text-xs font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
            title="Automatically convert form values to unique [variableName] tokens"
          >
            <span>⚡</span> Parameterize
          </button>

          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              type="button"
              className="rounded-full px-4 py-2 text-xs font-medium bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 transition-all flex items-center gap-1.5 active:scale-95"
              title="Open Playwright Reference Guide"
            >
              <span>📖</span> Guide
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={savingSteps}
            className="rounded-full px-5 py-2 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm shadow-red-600/20 active:scale-95 flex items-center gap-1.5"
          >
            {savingSteps ? (
              <>
                <span className="w-2.5 h-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>

      {/* Script Editor Container */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
          <span className="font-mono font-medium">test.spec.ts</span>
          <div className="flex items-center gap-3">
            <span>{scriptCode.split("\n").length} lines</span>
            <span>•</span>
            <span className="text-zinc-600">{detectedStepsCount} executable steps</span>
          </div>
        </div>

        <textarea
          value={scriptCode}
          onChange={(e) => handleScriptChange(e.target.value)}
          rows={22}
          spellCheck={false}
          className="w-full bg-zinc-50 border border-zinc-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 rounded-2xl p-4 font-mono text-xs text-zinc-900 leading-relaxed outline-none resize-y min-h-[520px] shadow-xs transition-all selection:bg-red-100 selection:text-red-900"
          placeholder="// await page.goto('https://...');&#10;// await page.locator('#btn').click();"
        />

        <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 pt-1">
          <p>
            Use <code className="text-red-700 font-mono bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200 font-semibold">[variableName]</code> anywhere in values to pull from Data Sets on the right.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Playwright Code Guide Component ──────────────────────────────────────────

const GUIDE_SNIPPETS = [
  {
    id: "nav-goto",
    category: "navigation",
    title: "Navigate to URL",
    description: "Opens the specified target URL in browser",
    code: `await page.goto('/dashboard');`,
  },
  {
    id: "nav-wait-idle",
    category: "navigation",
    title: "Wait for Network Idle",
    description: "Wait until all network requests resolve",
    code: `await page.waitForLoadState('networkidle');`,
  },
  {
    id: "act-fill",
    category: "interaction",
    title: "Fill Input Field",
    description: "Locates input by attribute or label and sets text",
    code: `await page.locator('[placeholder="Username"]').fill('admin');`,
  },
  {
    id: "act-fill-param",
    category: "interaction",
    title: "Fill Parameterized Variable",
    description: "Injects dynamic value bound to Data Set",
    code: `await page.locator('[name="productName"]').fill('[productName]');`,
  },
  {
    id: "act-click",
    category: "interaction",
    title: "Click Element",
    description: "Clicks a button, link, or clickable node",
    code: `await page.locator('button[type="submit"]').click();`,
  },
  {
    id: "act-select",
    category: "interaction",
    title: "Select Dropdown Option",
    description: "Select option from a standard select element",
    code: `await page.locator('select#category').selectOption('hardware');`,
  },
  {
    id: "act-check",
    category: "interaction",
    title: "Check / Checkbox",
    description: "Checks a checkbox or radio input",
    code: `await page.locator('input[type="checkbox"]').check();`,
  },
  {
    id: "assert-url",
    category: "assertion",
    title: "Assert URL Path",
    description: "Verifies current URL matches path or regex",
    code: `await expect(page).toHaveURL('/dashboard');`,
  },
  {
    id: "assert-visible",
    category: "assertion",
    title: "Assert Element Visible",
    description: "Verifies element is rendered and visible",
    code: `await expect(page.locator('.alert-success')).toBeVisible();`,
  },
  {
    id: "assert-text",
    category: "assertion",
    title: "Assert Text Contains",
    description: "Verifies element text matches expected value",
    code: `await expect(page.locator('h1')).toContainText('Welcome back');`,
  },
  {
    id: "assert-hidden",
    category: "assertion",
    title: "Assert Element Hidden",
    description: "Verifies element or modal has disappeared",
    code: `await expect(page.locator('#loading-modal')).toBeHidden();`,
  },
  {
    id: "assert-title",
    category: "assertion",
    title: "Assert Page Title",
    description: "Verifies window tab title string",
    code: `await expect(page).toHaveTitle('Tokoku Rameh');`,
  },
  {
    id: "util-screenshot",
    category: "utility",
    title: "Take Full-Page Screenshot",
    description: "Captures complete page viewport for verification",
    code: `await page.screenshot({ fullPage: true });`,
  },
  {
    id: "util-timeout",
    category: "utility",
    title: "Sleep / Wait Delay",
    description: "Explicit timeout in milliseconds (e.g. 2000ms)",
    code: `await page.waitForTimeout(2000);`,
  },
  {
    id: "util-wait-vis",
    category: "utility",
    title: "Wait for Element Visible",
    description: "Wait until selector reaches visible DOM state",
    code: `await page.locator('.table-row').waitFor({ state: 'visible' });`,
  },
];

export function PlaywrightCodeGuide({
  onInsertCode,
}: {
  onInsertCode: (code: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [guideSearch, setGuideSearch] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInsert = (code: string, id: string) => {
    onInsertCode(code);
    setInsertedId(id);
    setTimeout(() => setInsertedId(null), 1500);
  };

  const filtered = GUIDE_SNIPPETS.filter((item) => {
    const matchesCat = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch =
      !guideSearch.trim() ||
      item.title.toLowerCase().includes(guideSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(guideSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(guideSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-7 flex flex-col shadow-sm">
      {/* Header */}
      <div className="mb-5 pb-5 border-b border-zinc-100">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-red-600">
            Reference Library
          </span>
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-zinc-900">Playwright Code Guide</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Standard assertions and actions. Tap <span className="text-red-600 font-medium">+ Insert</span> to append to your script on the left.
        </p>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="space-y-3 mb-5">
        <input
          type="text"
          value={guideSearch}
          onChange={(e) => setGuideSearch(e.target.value)}
          placeholder="Search snippets (e.g., assert, fill, timeout)..."
          className="w-full rounded-full bg-zinc-50 border border-zinc-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/15 px-4 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all"
        />

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "All" },
            { id: "navigation", label: "Navigation" },
            { id: "interaction", label: "Actions" },
            { id: "assertion", label: "Assertions" },
            { id: "utility", label: "Utilities" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                  : "bg-zinc-100 border border-zinc-200/80 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Snippet List */}
      <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-xs italic">
            No matching code snippets found.
          </div>
        ) : (
          filtered.map((snippet) => {
            const isInserted = insertedId === snippet.id;
            const isCopied = copiedId === snippet.id;

            return (
              <div
                key={snippet.id}
                className="bg-zinc-50/70 border border-zinc-200 hover:border-red-300 hover:bg-red-50/20 rounded-2xl p-3.5 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-900 group-hover:text-red-700 transition-colors">
                      {snippet.title}
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                      {snippet.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(snippet.code, snippet.id)}
                      className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-600 hover:text-zinc-900 transition-all shadow-2xs"
                      title="Copy to clipboard"
                    >
                      {isCopied ? "✓ Copied" : "Copy"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsert(snippet.code, snippet.id)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-all shadow-2xs ${
                        isInserted
                          ? "bg-emerald-600 text-white font-semibold"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                      title="Append code line to script editor on left"
                    >
                      {isInserted ? "✓ Added" : "+ Insert"}
                    </button>
                  </div>
                </div>

                <pre className="font-mono text-[11px] text-red-700 bg-red-50/60 px-3 py-2 rounded-xl border border-red-100 overflow-x-auto leading-relaxed">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
