/**
 * Translates Chrome DevTools Recorder JSON into clean, parameterized Playwright test scripts.
 */

function cleanAriaLabel(raw: string): string {
  if (!raw) return "";
  // Strip [role="..."] or [role=...]
  let cleaned = raw.replace(/\[role=['"]?.*?['"]?\]/gi, "").trim();
  // Strip outer quotes if any
  cleaned = cleaned.replace(/^['"]|['"]$/g, "").trim();
  return cleaned;
}

function getAriaText(selectors: any): string {
  if (!selectors || !Array.isArray(selectors)) return "";
  for (const group of selectors) {
    if (Array.isArray(group)) {
      for (const s of group) {
        if (typeof s === "string" && s.startsWith("aria/")) {
          const clean = cleanAriaLabel(s.replace("aria/", ""));
          if (clean && !clean.startsWith("[role=")) return clean;
        }
      }
    } else if (typeof group === "string" && group.startsWith("aria/")) {
      const clean = cleanAriaLabel(group.replace("aria/", ""));
      if (clean && !clean.startsWith("[role=")) return clean;
    }
  }
  return "";
}

function hasFormContext(selectors: any): boolean {
  if (!selectors || !Array.isArray(selectors)) return false;
  const flat = selectors.flat(2).join(" ");
  return (
    flat.includes('role="form"') ||
    flat.includes("/form/") ||
    flat.includes("button.flex-") ||
    flat.includes('type="submit"')
  );
}

function getBestSelector(selectors: any, ariaText?: string): string {
  if (!selectors || !Array.isArray(selectors)) return "";
  const flat = selectors.flat(2);

  // 1. Look for ID selector (#user-name, #password, #login-button)
  for (const s of flat) {
    if (typeof s === "string" && s.startsWith("#") && !s.includes("root")) {
      return s;
    }
  }

  // 2. Look for data-test or data-testid
  for (const s of flat) {
    if (
      typeof s === "string" &&
      (s.includes("data-test") || s.includes("data-testid") || s.includes("data-qa"))
    ) {
      return s;
    }
  }

  // 3. Look for clean CSS selector (not xpath, pierce, text)
  for (const s of flat) {
    if (
      typeof s === "string" &&
      !s.startsWith("aria/") &&
      !s.startsWith("xpath") &&
      !s.startsWith("pierce/") &&
      !s.startsWith("text/")
    ) {
      return s.replace(/\\/g, "");
    }
  }

  // 4. Fallback from ariaText
  if (ariaText) {
    if (ariaText.startsWith("e.g.") || ariaText.includes("...")) {
      return `[placeholder="${ariaText}"]`;
    }
  }

  return "";
}

function getSelectorKey(selectors: any): string {
  if (!selectors || !Array.isArray(selectors)) return "";
  return selectors.flat(2).join("||");
}

function inferVarName(
  selector: string,
  ariaText: string,
  value: string,
  index: number
): string {
  const combined = `${selector} ${ariaText} ${value}`.toLowerCase();
  if (
    combined.includes("user") ||
    combined.includes("email") ||
    combined.includes("login") ||
    value === "ownertest" ||
    value === "owner" ||
    value === "standard_user"
  ) {
    return "username";
  }
  if (
    combined.includes("pass") ||
    combined.includes("secret") ||
    value === "test123" ||
    value === "secret_sauce"
  ) {
    return "password";
  }
  if (
    combined.includes("cement") ||
    combined.includes("product") ||
    combined.includes("barang") ||
    combined.includes("item") ||
    combined.includes("name")
  ) {
    return "product_name";
  }
  if (
    combined.includes("textarea") ||
    combined.includes("detail") ||
    combined.includes("spec") ||
    combined.includes("shelf") ||
    combined.includes("desc") ||
    combined.includes("deskripsi")
  ) {
    return "description";
  }
  if (
    combined.includes("nth-of-type(4)") ||
    combined.includes("stock") ||
    combined.includes("stok") ||
    combined.includes("qty") ||
    combined.includes("jumlah")
  ) {
    return "stock";
  }
  if (
    combined.includes("grid > div:nth-of-type(1)") ||
    combined.includes("cost") ||
    combined.includes("modal") ||
    combined.includes("buy") ||
    combined.includes("beli") ||
    combined.includes("010000")
  ) {
    return "buy_price";
  }
  if (
    combined.includes("grid > div:nth-of-type(2)") ||
    combined.includes("sell") ||
    combined.includes("jual") ||
    combined.includes("price") ||
    combined.includes("harga") ||
    combined.includes("020000")
  ) {
    return "sell_price";
  }
  return `field_${index}`;
}

export function translateJsonToPlaywright(jsonString: string): string {
  try {
    const data = JSON.parse(jsonString);
    const rawSteps = Array.isArray(data.steps)
      ? data.steps
      : Array.isArray(data)
      ? data
      : [];

    if (rawSteps.length === 0) return jsonString;

    // 1. Filter out viewport sizing and raw key presses (Control, a, etc.)
    const filtered = rawSteps.filter(
      (s: any) => !["setViewport", "keyDown", "keyUp"].includes(s.type)
    );

    // 2. Collect all target selectors of "change" steps so we can prune clicks on inputs/textareas
    const changeTargetKeys = new Set<string>();
    for (const s of filtered) {
      if (s.type === "change" && s.selectors) {
        changeTargetKeys.add(getSelectorKey(s.selectors));
      }
    }

    // 3. Eliminate redundant clicks on inputs/textareas right before or on change targets
    const optimized: any[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const curr = filtered[i];
      if (curr.type === "click" && curr.selectors) {
        const key = getSelectorKey(curr.selectors);
        // If this element will receive a typed value (change step), skip focusing click!
        if (changeTargetKeys.has(key)) {
          continue;
        }
      }
      optimized.push(curr);
    }

    const lines: string[] = [];
    let varCounter = 1;
    let hasSignedOut = false;

    for (let i = 0; i < optimized.length; i++) {
      const step = optimized[i];
      if (hasSignedOut) break; // Don't append trailing actions after logout

      if (step.type === "navigate") {
        lines.push(`await page.goto('${step.url}');`);
        continue;
      }

      const ariaText = getAriaText(step.selectors);
      const isFormSubmit = hasFormContext(step.selectors);
      const bestSel = getBestSelector(step.selectors, ariaText);

      if (step.type === "click") {
        const isSignOut =
          ariaText.toLowerCase().includes("logout") ||
          ariaText.toLowerCase().includes("sign out");
        if (isSignOut) {
          lines.push(`await page.locator("internal:role=button[name=\\"${ariaText}\\"i]").click();`);
          hasSignedOut = true;
          continue;
        }

        if (
          isFormSubmit &&
          (ariaText.includes("Add Product") ||
            ariaText.includes("Submit") ||
            ariaText.includes("Save") ||
            bestSel.includes("flex-"))
        ) {
          lines.push(`await page.screenshot({ fullPage: true });`);
          lines.push(`await page.locator("form button[type='submit']").click();`);
          lines.push(`await page.screenshot({ fullPage: true });`);
          continue;
        }

        if (ariaText === "Products" || bestSel.startsWith("a:") || bestSel.startsWith("a.")) {
          lines.push(`await page.locator("internal:role=link[name=\\"${ariaText || "Products"}\\"i]").click();`);
          continue;
        }

        if (ariaText) {
          lines.push(`await page.locator("internal:role=button[name=\\"${ariaText}\\"i]").click();`);
          continue;
        }

        if (bestSel) {
          lines.push(`await page.locator("${bestSel}").click();`);
          continue;
        }
      }

      if (step.type === "change") {
        const varName = inferVarName(bestSel, ariaText, String(step.value || ""), varCounter++);
        let sel = "";

        // If a clean element ID exists (e.g. #user-name, #password), prefer it
        if (bestSel.startsWith("#") || bestSel.includes("data-test")) {
          sel = bestSel;
        } else if (ariaText === "Username") {
          sel = bestSel || `[placeholder="Enter username"]`;
        } else if (ariaText === "Password") {
          sel = bestSel || `[placeholder="Enter password"]`;
        } else if (ariaText && (ariaText.startsWith("e.g.") || ariaText.includes("..."))) {
          if (bestSel.includes("textarea")) sel = "textarea";
          else sel = `[placeholder="${ariaText}"]`;
        } else if (bestSel.includes("textarea")) {
          sel = "textarea";
        } else if (bestSel) {
          sel = bestSel;
        } else if (ariaText) {
          sel = `[placeholder="${ariaText}"]`;
        }

        lines.push(`await page.locator("${sel}").fill('[${varName}]');`);
      }
    }

    return lines.join("\n");
  } catch (e) {
    return jsonString;
  }
}
