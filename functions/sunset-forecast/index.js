const BASE_URL = 'https://skying.gauravsharma.cc';

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

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

export function onRequestGet() {
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
