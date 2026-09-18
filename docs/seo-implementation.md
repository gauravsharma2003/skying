# SEO implementation and operations

## What changed

- Curated city records and aliases are in `src/locations.js`. The same records generate the directory, sitemap and client navigation targets.
- The Worker renders the dashboard, seven-day table, freshness information, canonical metadata and structured data in HTML. Selecting a new place navigates to its real page. Day selection does not change that page's canonical identity.
- Custom coordinates remain usable through `/forecast/` with `noindex,follow` and private/no-store HTML. They are excluded from the sitemap. Unknown legacy city slugs use a conservative lookup and redirect to the appropriate curated or coordinate page when resolved.
- Weather snapshots use Cloudflare Cache API: fresh for 30 minutes, fallback for at most six hours and only on the same local day. Cache is local to a data centre and eviction can remove the fallback. No added KV binding or paid service is required.
- Golden hour (+6° to −4°) and blue hour (−4° to −6°) are calculated with SunCalc and displayed in the destination timezone. Missing intervals and weather readings are explicit.
- Six information pages explain methodology, uncertainty, light windows, cloud layers, the project and location privacy. Three priority cities have short sourced viewing notes.
- One minified, hashed JavaScript bundle replaces the previous two script files plus six base64 fetches. The old source files are retained for comparison but are not included in the deployment directory.
- Social previews use a generated 1200×630 PNG. Static deployment is limited to `dist/`, keeping source, tests and local project files out of public assets.

## Run and verify

Use Node 22 or later. Run `npm ci`, then `npm run check`. Run `npm run dev` for the local Worker preview. `npm run audit:live -- http://127.0.0.1:8787` checks all 51 sitemap URLs against the running preview with real weather data. Tests use deterministic fixtures to cover failure and date-boundary cases without consuming public API capacity.

`npm run audit:lighthouse` is prepared for an environment that can launch headless Chrome. Review the report before claiming any Core Web Vitals improvement. A local response-time check is not field performance evidence.

## Deploy

Run `npm run deploy` in an authenticated Cloudflare environment. Wrangler runs the static build automatically. Preserve the existing `skying` Worker and its custom-domain assignment; do not create a replacement Worker or switch the production domain. Confirm the intended account before deployment.

After deployment, run `npm run audit:live` against the canonical production host, then inspect the mobile page, page source, error URLs and social preview. Validate the public TLS certificate chain independently; earlier local HTTPS checks encountered trust-store problems.

The build writes assets into `dist/`; it does not delete that directory on every rebuild, allowing a running preview to retain its file handles. A clean checkout/build starts with an empty ignored output directory. To remove obsolete local hashed assets, stop the preview before clearing `dist/`.

## Search Console

The existing Google verification file is retained. Its presence alone does not establish property access or indexing.

1. Open the verified `https://skyingg.gauravsharma.cc/` property (or the matching domain property).
2. Submit `https://skyingg.gauravsharma.cc/sitemap.xml` after deploying.
3. Inspect the homepage, directory and Delhi, Mumbai and Bengaluru pages. Verify the rendered content, indexability and Google-selected canonical. Request indexing for these representative updated pages where available.
4. Export a 28-day baseline of clicks, impressions, CTR and position; include pages, queries, countries and device breakdowns. Record indexing and sitemap status separately. If the site is new, record “not enough data” rather than zero performance.
5. Compare the same metrics after 2–4 weeks. Ranking gains are not guaranteed, and an algorithmic score or Lighthouse result is not a ranking forecast.

A small keyword/content map is already reflected in the page structure: homepage for sunset-quality intent, city pages for local forecasts, and useful guides for method/cloud/golden-hour questions. Do not add mass-generated near-duplicate location pages or fabricated local advice.

## Validation and known limits

- 10 automated test groups passed, covering all 43 curated city routes, redirects, metadata, custom-coordinate escaping/noindex, missing data, stale-cache boundaries, solar dates across DST/date-line locations, sitemap coverage and HTTP methods.
- A local Cloudflare Worker crawl using real Open-Meteo data returned 200 with matching canonicals for all 51 sitemap URLs.
- Browser checks at 390px verified city navigation, back navigation, day selection, metadata consistency, no horizontal document overflow and no captured JavaScript errors on the tested city pages.
- Cloudflare deployment dry-run passed. Production deployment was not performed because Wrangler was not authenticated.
- Lighthouse was attempted twice but could not launch/connect to headless Chrome in the available environment. No Lighthouse score or real-user Core Web Vitals result is claimed.
- Search Console access was signed out. Sitemap submission, actual indexing status and search-performance baseline require the verified account.

## Sources

- Google: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Canonicals: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Cache API: https://developers.cloudflare.com/workers/runtime-apis/cache/
- Open-Meteo: https://open-meteo.com/en/docs
- SunCalc: https://github.com/mourner/suncalc
- Local recommendations link their official tourism sources directly on each city page.
