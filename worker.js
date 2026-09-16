const BASE_URL = 'https://skying.gauravsharma.cc';
const GEO_SEARCH = 'https://photon.komoot.io/api/';
const WEATHER = 'https://api.open-meteo.com/v1/forecast';

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function scoreCloud(x) {
  if (x <= 15) return 20 + (x / 15) * 35;
  if (x < 30) return 55 + ((x - 15) / 15) * 35;
  if (x <= 70) return 100;
  if (x <= 85) return 100 - (x - 70) * 3;
  return Math.max(0, 55 - (x - 85) * 3.67);
}

function evaluate(hourly, sunset) {
  const target = new Date(sunset);
  const indices = hourly.time
    .map((time, index) => ({ index, diff: Math.abs(new Date(time).getTime() - target.getTime()) / 60000 }))
    .filter(({ diff }) => diff <= 90);

  const weighted = (field) => {
    let value = 0;
    let weight = 0;
    for (const { index, diff } of indices) {
      const currentWeight = Math.max(0.15, 1 - diff / 100);
      const currentValue = Number(hourly[field]?.[index]);
      if (Number.isFinite(currentValue)) {
        value += currentValue * currentWeight;
        weight += currentWeight;
      }
    }
    return weight ? value / weight : 0;
  };

  const high = weighted('cloud_cover_high');
  const mid = weighted('cloud_cover_mid');
  const low = weighted('cloud_cover_low');
  const total = weighted('cloud_cover');
  const vis = weighted('visibility') / 1000;
  const precip = weighted('precipitation_probability');
  const humidity = weighted('relative_humidity_2m');
  const upper = clamp(high * 0.72 + mid * 0.28);
  const horizonScore = clamp(100 - (low * 1.7 + Math.max(0, total - 80) * 0.4));
  const visibilityScore = vis >= 20 ? 100 : vis >= 12 ? 90 : vis >= 8 ? 78 : vis >= 5 ? 58 : 30;
  const precipScore = precip <= 5 ? 100 : precip <= 15 ? 85 : precip <= 30 ? 65 : precip <= 50 ? 35 : 10;
  const humidityScore = humidity <= 55 ? 100 : humidity <= 70 ? 88 : humidity <= 80 ? 68 : humidity <= 90 ? 45 : 25;
  let score = Math.round(scoreCloud(upper) * 0.34 + horizonScore * 0.3 + visibilityScore * 0.14 + precipScore * 0.12 + humidityScore * 0.1);
  if (total >= 92 || (total <= 8 && upper < 20)) score -= 12;
  score = clamp(score);

  const verdict = score >= 90 ? 'Exceptional' : score >= 78 ? 'Excellent' : score >= 63 ? 'Good' : score >= 45 ? 'Average' : 'Poor';
  const reasons = [
    upper >= 30 && upper <= 70 ? `Upper cloud ${Math.round(upper)}% — strong canvas.` : upper < 30 ? `Upper cloud ${Math.round(upper)}% — little colour.` : `Upper cloud ${Math.round(upper)}% — too heavy.`,
    horizonScore >= 80 ? 'Horizon clear.' : 'Low cloud on the horizon.',
    vis >= 12 ? `Visibility ${vis.toFixed(0)} km.` : `Visibility ${vis.toFixed(1)} km — muted.`
  ];
  return { score, verdict, high, mid, low, total, vis, precip, humidity, horizonScore, reasons };
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function fmtTime(iso) {
  return iso ? ((iso.split('T')[1] || iso).slice(0, 5)) : '—';
}

function dayName(iso, timezone) {
  try {
    return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: timezone || 'UTC' }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

function replaceMeta(html, selector, value) {
  const escaped = escapeHtml(value);
  if (selector === 'title') return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escaped}</title>`);
  if (selector === 'description') return html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/i, `<meta name="description" content="${escaped}" />`);
  if (selector === 'canonical') return html.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${escaped}" />`);
  const attr = selector.startsWith('og:') ? 'property' : 'name';
  const re = new RegExp(`<meta\\s+${attr}="${selector.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"\\s+content="[^"]*"\\s*\\/>`, 'i');
  return html.replace(re, `<meta ${attr}="${selector}" content="${escaped}" />`);
}

async function geocode(query) {
  const url = new URL(GEO_SEARCH);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  url.searchParams.set('lang', 'en');
  const response = await fetch(url, { headers: { 'User-Agent': 'Skying/1.0 (+https://skying.gauravsharma.cc/)' } });
  if (!response.ok) throw new Error('Geocoding unavailable');
  const body = await response.json();
  const feature = body.features?.[0];
  const coords = feature?.geometry?.coordinates;
  if (!feature || !coords) return null;
  const p = feature.properties || {};
  return {
    name: p.name || p.city || p.town || p.village || query,
    admin1: p.state || p.county || '',
    country: p.country || '',
    latitude: Number(coords[1]),
    longitude: Number(coords[0])
  };
}

async function weatherFor(place) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    timezone: 'auto',
    forecast_days: '7',
    daily: 'sunrise,sunset',
    hourly: 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,precipitation_probability,relative_humidity_2m'
  });
  const response = await fetch(`${WEATHER}?${params}`);
  if (!response.ok) throw new Error('Forecast unavailable');
  return response.json();
}

function errorPage(status, title, message) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | Skying</title><style>body{font-family:system-ui,sans-serif;margin:0;background:#f4f0e9;color:#181713;display:grid;min-height:100vh;place-items:center}main{max-width:560px;padding:32px}a{color:inherit}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/">Search another place</a></p></main></body></html>`, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' }
  });
}

async function handleCity(request, env, rawCity) {
  const rawSlug = String(rawCity || '').trim().toLowerCase();
  if (!rawSlug) return Response.redirect(`${BASE_URL}/sunset-forecast/`, 302);

  try {
    const query = rawSlug.replace(/-/g, ' ');
    const place = await geocode(query);
    if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      return errorPage(404, 'Place not found', 'Skying could not find a location for this forecast URL.');
    }

    const canonicalSlug = slugify(`${place.name} ${place.country}`);
    const canonicalUrl = `${BASE_URL}/sunset-forecast/${canonicalSlug}`;
    if (rawSlug !== canonicalSlug) return Response.redirect(canonicalUrl, 301);

    const data = await weatherFor(place);
    const forecasts = data.daily.time.map((_, index) => evaluate(data.hourly, data.daily.sunset[index] || ''));
    const today = forecasts[0];
    const sunset = data.daily.sunset[0];
    if (!today || !sunset) return errorPage(503, 'Forecast unavailable', 'The forecast service did not return enough data for this location.');

    const locationLabel = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    const title = `${place.name} Sunset Forecast Today & Golden Hour | Skying`;
    const description = `Sunset forecast for ${locationLabel}: ${today.score}/100 (${today.verdict}), sunset at ${fmtTime(sunset)}, ${today.vis.toFixed(0)} km visibility and ${Math.round(today.precip)}% rain chance. See the 7-day outlook.`;

    const assetUrl = new URL('/index.html', request.url);
    const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: 'GET' }));
    if (!assetResponse.ok) return errorPage(503, 'Skying is unavailable', 'The application shell could not be loaded.');
    let html = await assetResponse.text();

    html = replaceMeta(html, 'title', title);
    html = replaceMeta(html, 'description', description);
    html = replaceMeta(html, 'canonical', canonicalUrl);
    html = replaceMeta(html, 'og:title', title);
    html = replaceMeta(html, 'og:description', description);
    html = replaceMeta(html, 'og:url', canonicalUrl);
    html = replaceMeta(html, 'og:image:alt', `${place.name} sunset forecast on Skying`);
    html = replaceMeta(html, 'twitter:title', title);
    html = replaceMeta(html, 'twitter:description', description);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${BASE_URL}/#website`,
          name: 'Skying',
          url: `${BASE_URL}/`
        },
        {
          '@type': 'WebPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          isPartOf: { '@id': `${BASE_URL}/#website` },
          about: {
            '@type': 'Place',
            name: locationLabel,
            geo: {
              '@type': 'GeoCoordinates',
              latitude: place.latitude,
              longitude: place.longitude
            }
          }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Skying', item: `${BASE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Sunset forecasts', item: `${BASE_URL}/sunset-forecast/` },
            { '@type': 'ListItem', position: 3, name: locationLabel, item: canonicalUrl }
          ]
        }
      ]
    };
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">${safeJson(jsonLd)}</script>`);

    const pageData = safeJson({ place, data });
    html = html.replace('  <script src="/app-loader.js"></script>', `  <script>window.__SKYING_PAGE__=${pageData};</script>\n  <script src="/app-loader.js"></script>`);

    const outlook = forecasts.map((forecast, index) => `${dayName(data.daily.time[index], data.timezone)} ${forecast.score}/100 ${forecast.verdict}`).join(' · ');
    const summary = `\n      <section class="seo-location-summary" aria-labelledby="locationForecastSummary">\n        <div class="seo-location-summary-inner">\n          <h2 id="locationForecastSummary">${escapeHtml(place.name)} sunset forecast</h2>\n          <p>Tonight in ${escapeHtml(locationLabel)}, sunset is at <strong>${escapeHtml(fmtTime(sunset))}</strong>. Skying rates the conditions <strong>${today.score}/100 (${escapeHtml(today.verdict)})</strong>. ${escapeHtml(today.reasons.join(' '))}</p>\n          <dl class="seo-location-facts">\n            <div><dt>Sunset</dt><dd>${escapeHtml(fmtTime(sunset))}</dd></div>\n            <div><dt>Visibility</dt><dd>${escapeHtml(today.vis.toFixed(1))} km</dd></div>\n            <div><dt>High cloud</dt><dd>${Math.round(today.high)}%</dd></div>\n            <div><dt>Rain chance</dt><dd>${Math.round(today.precip)}%</dd></div>\n          </dl>\n          <p><strong>7-day sunset outlook:</strong> ${escapeHtml(outlook)}.</p>\n          <p><a href="/sunset-forecast/">Browse more sunset forecast locations</a></p>\n        </div>\n      </section>\n`;
    html = html.replace('</main>', `${summary}    </main>`);

    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
        'link': `<${canonicalUrl}>; rel="canonical"`,
        'x-robots-tag': 'index, follow, max-image-preview:large'
      }
    });
  } catch (error) {
    console.error('Skying city forecast error', error);
    return errorPage(503, 'Forecast temporarily unavailable', 'Skying could not load this location right now. Please try again shortly.');
  }
}

const LOCATIONS = [
  ['India', [
    ['Delhi', 'delhi-india'], ['Mumbai', 'mumbai-india'], ['Bengaluru', 'bengaluru-india'], ['Chennai', 'chennai-india'],
    ['Kolkata', 'kolkata-india'], ['Hyderabad', 'hyderabad-india'], ['Pune', 'pune-india'], ['Jaipur', 'jaipur-india'],
    ['Ahmedabad', 'ahmedabad-india'], ['Udaipur', 'udaipur-india'], ['Jaisalmer', 'jaisalmer-india'], ['Varanasi', 'varanasi-india'],
    ['Kochi', 'kochi-india'], ['Srinagar', 'srinagar-india'], ['Leh', 'leh-india'], ['Panaji', 'panaji-india']
  ]],
  ['Europe', [
    ['London', 'london-united-kingdom'], ['Edinburgh', 'edinburgh-united-kingdom'], ['Paris', 'paris-france'], ['Rome', 'rome-italy'],
    ['Barcelona', 'barcelona-spain'], ['Lisbon', 'lisbon-portugal'], ['Reykjavík', 'reykjavik-iceland'], ['Athens', 'athens-greece'], ['Istanbul', 'istanbul-turkey']
  ]],
  ['Americas', [
    ['New York', 'new-york-united-states'], ['Los Angeles', 'los-angeles-united-states'], ['San Francisco', 'san-francisco-united-states'],
    ['Seattle', 'seattle-united-states'], ['Miami', 'miami-united-states'], ['Honolulu', 'honolulu-united-states'], ['Vancouver', 'vancouver-canada'],
    ['Toronto', 'toronto-canada'], ['Mexico City', 'mexico-city-mexico'], ['Rio de Janeiro', 'rio-de-janeiro-brazil']
  ]],
  ['Asia, Africa & Oceania', [
    ['Cape Town', 'cape-town-south-africa'], ['Dubai', 'dubai-united-arab-emirates'], ['Singapore', 'singapore-singapore'], ['Tokyo', 'tokyo-japan'],
    ['Bangkok', 'bangkok-thailand'], ['Sydney', 'sydney-australia'], ['Melbourne', 'melbourne-australia'], ['Auckland', 'auckland-new-zealand']
  ]]
];

async function handleDirectory() {
  const groups = LOCATIONS.map(([group, items]) => `
    <section>
      <h2>${escapeHtml(group)}</h2>
      <div class="links">${items.map(([name, slug]) => `<a href="/sunset-forecast/${slug}">${escapeHtml(name)}</a>`).join('')}</div>
    </section>`).join('');

  const itemList = LOCATIONS.flatMap(([, items]) => items).map(([name, slug], index) => ({
    '@type': 'ListItem', position: index + 1, name, url: `${BASE_URL}/sunset-forecast/${slug}`
  }));
  const structured = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Sunset forecast locations on Skying',
    itemListElement: itemList
  }).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sunset Forecasts by Location | Skying</title>
<meta name="description" content="Browse Skying sunset forecasts by location, with sunset quality scores, cloud layers, visibility, rain chance and seven-day outlooks.">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${BASE_URL}/sunset-forecast/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:site_name" content="Skying"><meta property="og:type" content="website"><meta property="og:title" content="Sunset Forecasts by Location | Skying"><meta property="og:description" content="Browse sunset quality forecasts for popular locations around the world."><meta property="og:url" content="${BASE_URL}/sunset-forecast/"><meta property="og:image" content="${BASE_URL}/og-image.svg">
<script type="application/ld+json">${structured}</script>
<style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f0e9;color:#191814;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1040px;margin:auto;padding:28px 20px 64px}.brand{font-family:Georgia,serif;font-style:italic;font-size:28px;text-decoration:none;color:inherit}.hero{padding:12vh 0 7vh}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#d95d39}h1{font-family:Georgia,serif;font-size:clamp(44px,8vw,86px);font-weight:500;line-height:.92;margin:14px 0 18px}p{color:#625f57;line-height:1.6;max-width:680px}section{border-top:1px solid #c9c3b9;padding:28px 0}h2{font-family:Georgia,serif;font-style:italic;font-weight:500;font-size:28px;margin:0 0 16px}.links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.links a{display:block;border:1px solid #26241f;border-radius:14px;padding:13px 14px;color:inherit;text-decoration:none;background:#fbf8f2}.links a:hover{transform:translateY(-1px)}@media(max-width:700px){main{padding:20px 16px 48px}.hero{padding:8vh 0 5vh}.links{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style></head><body><main><a class="brand" href="/">Skying</a><div class="hero"><div class="eyebrow">Sunset forecasts</div><h1>Find the light.</h1><p>Choose a location for a live sunset-quality score, sunset time, cloud layers, visibility, rain chance and seven-day outlook.</p></div>${groups}</main></body></html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
      'x-robots-tag': 'index, follow, max-image-preview:large'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/sunset-forecast') return Response.redirect(`${BASE_URL}/sunset-forecast/`, 301);
    if (url.pathname === '/sunset-forecast/') return handleDirectory();
    if (url.pathname.startsWith('/sunset-forecast/')) {
      const slug = decodeURIComponent(url.pathname.slice('/sunset-forecast/'.length)).replace(/\/+$/, '');
      if (!slug || slug.includes('/')) return errorPage(404, 'Place not found', 'Skying could not find a location for this forecast URL.');
      return handleCity(request, env, slug);
    }
    return env.ASSETS.fetch(request);
  }
};
