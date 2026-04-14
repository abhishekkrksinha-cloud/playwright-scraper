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

// Main scrape endpoint
app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const result = await scrapePage(url);
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
