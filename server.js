import express from "express";
import dotenv from "dotenv";
import { scrapePage } from "./scraper.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Health check
app.get("/", (req, res) => {
  res.json({ status: "Scraper running 🚀" });
});

// Scrape endpoint with timeout protection
app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const result = await Promise.race([
      scrapePage(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout exceeded")), 25000)
      )
    ]);

    res.json(result);
  } catch (error) {
    console.error("Scraping error:", error.message);

    res.status(500).json({
      error: "Scraping failed",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
