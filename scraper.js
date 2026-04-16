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

// wait for page render
await page.waitForTimeout(2000);

// simulate scroll (important for sticky + lazy UI)
await page.mouse.move(300, 500);
await page.mouse.wheel(0, 800);
await page.waitForTimeout(1000);

// scroll again
await page.mouse.wheel(0, 800);
await page.waitForTimeout(1000);

// try interacting with delivery/pincode section
try {
  const deliveryTrigger = await page.locator('text=/delivery|pincode/i').first();
  if (deliveryTrigger) {
    await deliveryTrigger.click({ timeout: 2000 });
    await page.waitForTimeout(1000);
  }
} catch (e) {
  // ignore safely
}

    await page.waitForSelector("body", { timeout: 10000 });

    // Trigger lazy content
    await autoScroll(page);

// extra scroll for dynamic UI
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1500);
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
