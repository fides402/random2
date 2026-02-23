import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'capacitor://localhost' || origin === 'http://localhost' || origin === 'https://localhost') {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN || "ZVQpZIZeFkvNaxSKslHgiAEhhwpvwSfXKLJQiXGA";

  // API routes
  app.get("/api/random-release", async (req, res) => {
    try {
      const { genre, style, year, country, type = 'release' } = req.query;

      console.log(`Searching with: genre=${genre}, style=${style}, year=${year}, country=${country}`);

      // Step 1: Get total count for the search query
      const searchParams = new URLSearchParams({
        token: DISCOGS_TOKEN,
        type: type as string,
        format: 'album',
        per_page: '1',
      });

      if (genre) searchParams.append('genre', genre as string);
      if (style) searchParams.append('style', style as string);
      if (country) searchParams.append('country', country as string);

      // Handle decade selection
      if (year) {
        if (year.toString().length === 3) {
          const randomYear = Math.floor(Math.random() * 10) + parseInt(year.toString() + "0");
          searchParams.append('year', randomYear.toString());
        } else {
          searchParams.append('year', year as string);
        }
      }

      const searchUrl = `https://api.discogs.com/database/search?${searchParams.toString()}`;
      const initialResponse = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'DiscogsRandomizer/1.0' }
      });

      const totalItems = initialResponse.data.pagination.items;
      if (totalItems === 0) {
        return res.status(404).json({ error: "No releases found with these filters." });
      }

      const maxItems = Math.min(totalItems, 10000);
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const randomPage = Math.floor(Math.random() * maxItems) + 1;

        const randomResponse = await axios.get(`${searchUrl}&page=${randomPage}`, {
          headers: { 'User-Agent': 'DiscogsRandomizer/1.0' }
        });

        const release = randomResponse.data.results[0];
        if (release && release.id) {
          const detailsResponse = await axios.get(`https://api.discogs.com/releases/${release.id}?token=${DISCOGS_TOKEN}`, {
            headers: { 'User-Agent': 'DiscogsRandomizer/1.0' }
          });

          const fullRelease = detailsResponse.data;
          if (fullRelease.videos && fullRelease.videos.length > 0) {
            console.log(`Found release with videos after ${attempts} attempts: ${fullRelease.title}`);
            return res.json(fullRelease);
          }
        }
      }

      res.status(404).json({ error: "Could not find a release with YouTube links after several attempts. Try different filters." });
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error("Discogs API Error:", errorData || error.message);
      if (errorData?.message === "You are making requests too quickly.") {
        return res.status(429).json({ error: "Discogs rate limit exceeded. Please wait a moment." });
      }
      res.status(500).json({ error: errorData?.message || "Failed to fetch from Discogs." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
