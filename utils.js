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

// Basic extraction (you will evolve this)
export async function extractSignals(page) {
  return await page.evaluate(() => {
    const getText = (selector) =>
      document.querySelector(selector)?.innerText || null;

    const getAllText = (selector) =>
      Array.from(document.querySelectorAll(selector)).map(
        (el) => el.innerText
      );

    return {
      title: document.title,

      h1: getText("h1"),

      price:
        document.body.innerText.match(/₹\s?\d+[,\d]*/)?.[0] || null,

      ctaButtons: getAllText("button"),

      links: Array.from(document.querySelectorAll("a")).map((a) =>
        a.href
      ),

      images: Array.from(document.querySelectorAll("img")).map(
        (img) => img.src
      ),

      // Detect offer keywords
      offers: document.body.innerText.match(
        /(buy\s?\d+.*?off|discount|sale|free shipping)/gi
      )
    };
  });
}
