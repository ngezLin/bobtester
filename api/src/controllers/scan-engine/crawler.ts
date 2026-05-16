import { chromium } from "playwright";
import { scanPolicy } from "../../config";

export interface CrawledPage {
  url: string;
  html: string;
  responseHeaders: Record<string, string>;
}

function isAllowedHost(url: URL, allowedHosts: string[]) {
  return (
    allowedHosts.length === 0 ||
    allowedHosts.some((host) => url.hostname === new URL(host).hostname)
  );
}

export async function crawlTarget(url: string, allowedHosts: string[]) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const visited = new Set<string>();
  const queue: string[] = [url];
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < scanPolicy.maxPages) {
    const nextUrl = queue.shift();
    if (!nextUrl || visited.has(nextUrl)) continue;

    visited.add(nextUrl);
    try {
      const response = await page.goto(nextUrl, {
        timeout: scanPolicy.pageTimeoutMs,
        waitUntil: "domcontentloaded",
      });
      if (!response) continue;
      const responseHeaders = await response.allHeaders();
      const html = await page.content();
      pages.push({ url: nextUrl, html, responseHeaders });

      if (pages.length >= scanPolicy.maxPages) break;

      const anchors = await page.$$eval("a[href]", (elements) =>
        elements.map((anchor) => anchor.getAttribute("href") || ""),
      );
      const currentUrl = new URL(nextUrl);
      for (const href of anchors) {
        try {
          const resolved = new URL(href, currentUrl).toString();
          const resolvedUrl = new URL(resolved);
          if (
            resolvedUrl.protocol.startsWith("http") &&
            isAllowedHost(resolvedUrl, allowedHosts) &&
            resolvedUrl.hostname === currentUrl.hostname
          ) {
            if (!visited.has(resolved)) {
              queue.push(resolved);
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      continue;
    }
  }

  await browser.close();
  return pages;
}
