export async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;

      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}
export async function extractSignals(page) {
  return await page.evaluate(() => {

    // ---------- HELPERS ----------
    const text = (el) => el?.innerText?.trim() || null;

    const getAll = (selector) =>
      Array.from(document.querySelectorAll(selector));

    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const isSticky = (el) => {
      const style = window.getComputedStyle(el);
      return (
        style.position === "fixed" ||
        style.position === "sticky"
      );
    };

    const getJsonLD = () => {
      const scripts = getAll('script[type="application/ld+json"]');
      return scripts.map(s => {
        try { return JSON.parse(s.innerText); } catch { return null; }
      }).filter(Boolean);
    };

    // ---------- SHOPIFY DETECTION ----------
    const isShopify =
      document.querySelector('meta[name="shopify-checkout-api-token"]') ||
      window.Shopify ||
      document.querySelector('script[src*="cdn.shopify.com"]');

    // ---------- TITLE ----------
    const title =
      text(document.querySelector("h1")) ||
      document.title;

    // ---------- PRICE ----------
    let price = null;

    const shopifyPrice =
      document.querySelector('[data-product-price]') ||
      document.querySelector('.price-item--regular') ||
      document.querySelector('.price') ||
      document.querySelector('[class*="price"]');

    if (shopifyPrice) {
      price = text(shopifyPrice);
    }

    if (!price) {
      const jsonLD = getJsonLD();
      for (let data of jsonLD) {
        if (data?.offers?.price) {
          price = "₹" + data.offers.price;
          break;
        }
      }
    }

    if (!price) {
      const match = document.body.innerText.match(/₹\s?\d+[,\d]*/);
      if (match) price = match[0];
    }

    // ---------- CTA ----------
    const ctas = getAll("button, a")
      .map((el) => ({
        text: text(el),
        isVisible: visible(el),
        isSticky: isSticky(el),
      }))
      .filter(
        (btn) =>
          btn.text &&
          /add to cart|buy now|shop now|checkout/i.test(btn.text)
      );

    const primaryCTA = ctas.find(
      (btn) =>
        /buy now|add to cart/i.test(btn.text) &&
        btn.isVisible
    );

    const stickyCTA = ctas.find(
      (btn) => btn.isSticky && btn.isVisible
    );

    // ---------- REVIEWS ----------
    let rating = null;
    let reviewCount = null;

    const bodyText = document.body.innerText;

    const ratingMatch = bodyText.match(/(\d\.\d)/);
    if (ratingMatch) rating = ratingMatch[1];

    const reviewMatch = bodyText.match(/(\d+)\s?(reviews|ratings)/i);
    if (reviewMatch) reviewCount = reviewMatch[1];

    // ---------- OFFERS ----------
    const offerPatterns = [
      /buy\s?\d+.*?get\s?\d+.*?(off|free)/gi,
      /\d+%\s?(off|discount)/gi,
      /free\s?(shipping|delivery)/gi
    ];

    let offers = [];

    offerPatterns.forEach((pattern) => {
      const matches = bodyText.match(pattern);
      if (matches) offers.push(...matches);
    });

    // ---------- IMAGES ----------
    const images = getAll("img")
      .map((img) => img.src)
      .filter(Boolean);

    // ---------- RETURN (IMPORTANT: INSIDE FUNCTION) ----------
    return {
      platform: isShopify ? "shopify" : "unknown",
      title,
      price,
      primaryCTA,
      stickyCTA,
      allCTAs: ctas,
      rating,
      reviewCount,
      offers,
      imageCount: images.length,

      confidenceFlags: {
        hasPrice: !!price,
        hasCTA: !!primaryCTA,
        hasStickyCTA: !!stickyCTA,
        hasReviews: !!reviewCount
      }
    };

  });
}
