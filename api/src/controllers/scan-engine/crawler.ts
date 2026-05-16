import axios from "axios";
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

async function crawlWithAxios(url: string): Promise<CrawledPage[]> {
  try {
    const response = await axios.get(url, {
      timeout: scanPolicy.pageTimeoutMs,
      validateStatus: () => true,
    });

    const html = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    const headers: Record<string, string> = {};

    Object.entries(response.headers).forEach(([key, value]) => {
      if (typeof value === "string") {
        headers[key.toLowerCase()] = value;
      } else if (Array.isArray(value)) {
        headers[key.toLowerCase()] = value.join("; ");
      }
    });

    return [{ url, html, responseHeaders: headers }];
  } catch (error: any) {
    console.warn(`[Crawler] Axios fallback failed for ${url}: ${error.message}`);
    return [];
  }
}

export async function crawlTarget(url: string, allowedHosts: string[]) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error: any) {
    console.warn(`[Crawler] Playwright browser launch failed: ${error.message}. Falling back to Axios fetch.`);
    return await crawlWithAxios(url);
  }

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
    } catch (error: any) {
      console.warn(`[Crawler] Failed to crawl ${nextUrl}: ${error.message}`);
      continue;
    }
  }

  await browser.close();
  if (pages.length === 0) {
    return await crawlWithAxios(url);
  }

  return pages;
}
