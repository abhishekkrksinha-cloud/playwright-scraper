import { chromium } from "playwright";
import pTimeout from "p-timeout";
import { autoScroll, extractSignals } from "./utils.js";

export async function scrapePage(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    await pTimeout(
  page.goto(url, { waitUntil: "domcontentloaded" }),
  30000
);

await page.waitForSelector("body", { timeout: 10000 });
await page.mouse.move(100, 200);

    // Auto scroll for lazy loading
    await autoScroll(page);

    // Wait extra for dynamic UI
    await page.waitForTimeout(2000);

    // Extract full DOM
    const html = await page.content();

    // Screenshot (optional for CRO)
    const screenshot = await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 60
    });

    // Extract structured signals
    const signals = await extractSignals(page);

    return {
      url,
      html,
      signals,
      screenshot: screenshot.toString("base64"),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to scrape: ${error.message}`);
  } finally {
    await browser.close();
  }
}
