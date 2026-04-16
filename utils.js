// ✅ AUTO SCROLL
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

// ✅ SIGNAL EXTRACTION
export async function extractSignals(page) {
  return await page.evaluate(() => {

    const text = (el) => el?.innerText?.trim() || null;

    const getAll = (selector) =>
      Array.from(document.querySelectorAll(selector));

    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const isSticky = (el) => {
      const style = window.getComputedStyle(el);
      return style.position === "fixed" || style.position === "sticky";
    };

    const getJsonLD = () => {
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      return scripts.map(s => {
        try { return JSON.parse(s.innerText); } catch { return null; }
      }).filter(Boolean);
    };

    // Shopify detection
    const isShopify =
      document.querySelector('meta[name="shopify-checkout-api-token"]') ||
      window.Shopify ||
      document.querySelector('script[src*="cdn.shopify.com"]');

    const title =
      text(document.querySelector("h1")) ||
      document.title;

    // PRICE
    let price = null;

    const priceEl =
      document.querySelector('[data-product-price]') ||
      document.querySelector('.price') ||
      document.querySelector('[class*="price"]');

    if (priceEl) price = text(priceEl);

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

    // CTA
    const ctas = getAll("button, a")
      .map((el) => ({
        text: text(el),
        isVisible: visible(el),
        isSticky: isSticky(el)
      }))
      .filter(btn =>
        btn.text &&
        /add to cart|buy now|checkout/i.test(btn.text)
      );

    const primaryCTA = ctas.find(btn => btn.isVisible);
    const stickyCTA = ctas.find(btn => btn.isSticky);

    // Reviews
    const bodyText = document.body.innerText;

    const ratingMatch = bodyText.match(/(\d\.\d)/);
    const reviewMatch = bodyText.match(/(\d+)\s?(reviews|ratings)/i);

    // Offers
    const offerPatterns = [
      /buy\s?\d+.*?get\s?\d+.*?(off|free)/gi,
      /\d+%\s?(off|discount)/gi,
      /free\s?(shipping|delivery)/gi
    ];

    let offers = [];
    offerPatterns.forEach(p => {
      const m = bodyText.match(p);
      if (m) offers.push(...m);
    });

    return {
      platform: isShopify ? "shopify" : "unknown",
      title,
      price,
      primaryCTA,
      stickyCTA,
      allCTAs: ctas,
      rating: ratingMatch?.[1] || null,
      reviewCount: reviewMatch?.[1] || null,
      offers,
      confidenceFlags: {
        hasPrice: !!price,
        hasCTA: !!primaryCTA,
        hasStickyCTA: !!stickyCTA,
        hasReviews: !!reviewMatch
      }
    };
  });
}
