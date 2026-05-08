import { chromium } from "playwright";

export async function runTest() {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto("https://example.com");

  await page.screenshot({
    path: "test.png",
  });

  await browser.close();

  return {
    success: true,
    message: "Playwright test successful",
  };
}