# Skying

A lightweight, single-file sunset-quality forecast app. The frontend stays vanilla HTML/CSS/JS; this repo only adds the files needed for a clean GitHub → Cloudflare Pages deployment and basic search/social metadata.

## 1. Set your real domain once

From this folder run:

```bash
python3 configure-domain.py https://yourdomain.com
```

This updates the canonical URL, Open Graph URL/image, JSON-LD site URL, `robots.txt`, and `sitemap.xml`.

If you do not have a custom domain yet, deploy first, then run the script with your final Cloudflare Pages/custom-domain URL and push again.

## 2. Put it on GitHub

Create an empty GitHub repo, then from this folder:

```bash
git init
git add .
git commit -m "Initial Skying site"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 3. Deploy on Cloudflare Pages

In Cloudflare Pages, connect the GitHub repo.

- Framework preset: **None**
- Build command: **`exit 0`**
- Build output directory: **`.`** (repo root)
- Root directory: **leave blank**

No npm install or build process is required.

## Included

- `index.html` — the current Skying app, still self-contained
- `robots.txt` — allows crawling and points to the sitemap
- `sitemap.xml` — homepage sitemap, ready to expand later
- `site.webmanifest` — basic install/app metadata
- `favicon.svg` — lightweight favicon
- `og-image.png` — 1200×630 social share image
- `_headers` — simple Cloudflare Pages security/caching headers
- `configure-domain.py` — one-time domain replacement helper

## After deployment

Add the domain to Google Search Console and submit:

```text
https://yourdomain.com/sitemap.xml
```

The next SEO step, when you want it, is adding real crawlable location URLs such as `/sunset-forecast/delhi` rather than stuffing keywords into the homepage.
