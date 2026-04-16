import { chromium } from "playwright";
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
    // 🚀 Block heavy resources (IMPORTANT)
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "media"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // ⚡ Faster load strategy
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    await page.waitForSelector("body", { timeout: 10000 });

    // Trigger lazy content
    await autoScroll(page);
    await page.waitForTimeout(2000);

    // Extract data
    const html = await page.content();

    const screenshot = await page.screenshot({
      fullPage: true,
      type: "jpeg",
      quality: 40
    });

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
