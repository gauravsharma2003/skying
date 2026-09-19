import {LOCAL_GUIDES} from './local-guides.js';
import {BASE_URL, LOCATIONS} from './locations.js';
import {evaluate,skyBackground} from './scoring.js';
import {solarClock,solarTimes,solarWindow} from './solar.js';
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeJson = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
export const label = place => [...new Set([place.name,place.admin1,place.country].filter(Boolean))].join(', ');
export const clock = iso => iso ? iso.split('T')[1]?.slice(0,5) || 'Not reached' : 'Not reached';
const messageFor = score => score >= 78 ? 'An evening worth going out for.' : score >= 63 ? 'A promising evening if the horizon holds.' : score >= 45 ? 'A subtle sunset, with a chance of colour.' : 'A quiet evening for the horizon.';
const minuteValue = value => {
  const [hour,minute]=String(value || '').split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour*60+minute : null;
};
function eveningRuler(forecast,timezone) {
  const sunset=minuteValue(clock(forecast.sunset));
  if(sunset==null) return '<p class="detail-note">No complete evening timeline is available.</p>';
  const start=sunset-120;
  const position=value=>`${Math.max(0,Math.min(100,((value-start)/180)*100))}%`;
  const goldenStart=minuteValue(forecast.goldenStart ? solarClock(forecast.goldenStart,timezone) : null);
  const goldenEnd=minuteValue(forecast.goldenEnd ? solarClock(forecast.goldenEnd,timezone) : null);
  const rangeStart=goldenStart ?? sunset-45,rangeEnd=goldenEnd ?? sunset+15;
  const label=value=>`${String(Math.floor(((value+1440)%1440)/60)).padStart(2,'0')}:${String((value+1440)%60).padStart(2,'0')}`;
  return `<div class="ruler-line" style="--range-start:${position(rangeStart)};--range-width:${Math.max(2,Math.min(100,((rangeEnd-rangeStart)/180)*100))}%;--sunset-position:${position(sunset)}"><span class="golden-range"></span><span class="sunset-marker"></span></div><div class="ruler-labels"><span>${label(start)}</span><span>${label(start+60)}</span><span>${label(sunset)}</span><span>${label(start+180)}</span></div>`;
}
export function makePage(place,snapshot,path,indexable=true) {
  const {data,fetchedAt,stale}=snapshot;
  const forecasts=data.daily.time.map((date,i)=>({date,sunset:data.daily.sunset[i],...solarTimes(date,place,data.timezone),quality:evaluate(data.hourly,data.daily.sunset[i])}));
  const first=forecasts[0];
  const title=`${place.name} Sunset Forecast Today & Golden Hour | Skying`;
  const description=`Sunset forecast for ${place.name}: ${first.quality ? `${first.quality.score}/100 (${first.quality.verdict}), ` : ''}sunset ${clock(first.sunset)} on ${first.date}. Local golden-hour times and a seven-day outlook.`;
  const canonical=BASE_URL+path;
  return {place,data,fetchedAt,stale,forecasts,title,description,canonical,indexable};
}
export function structuredData(page) {
  return {'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':`${BASE_URL}/#website`,name:'Skying',url:BASE_URL+'/'},
    {'@type':'WebPage','@id':page.canonical+'#webpage',url:page.canonical,name:page.title,description:page.description,isPartOf:{'@id':`${BASE_URL}/#website`},about:{'@type':'Place',name:label(page.place),geo:{'@type':'GeoCoordinates',latitude:page.place.latitude,longitude:page.place.longitude}}},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Skying',item:BASE_URL+'/'},{'@type':'ListItem',position:2,name:'Sunset forecasts',item:BASE_URL+'/sunset-forecast/'},{'@type':'ListItem',position:3,name:page.place.name,item:page.canonical}]}
  ]};
}
export function forecastSummary(page) {
  const {place,data,forecasts,fetchedAt,stale}=page;
  const first=forecasts[0], q=first.quality, e=escapeHtml;
  const updated=new Intl.DateTimeFormat('en-GB',{timeZone:data.timezone,dateStyle:'medium',timeStyle:'short'}).format(new Date(fetchedAt));
  const rows=forecasts.map(f=>`<tr><th scope="row"><time datetime="${f.date}">${e(new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'}).format(new Date(f.date+'T12:00:00Z')))}</time></th><td>${e(clock(f.sunset))}</td><td>${f.quality ? `${f.quality.score}/100 · ${f.quality.verdict}` : 'Unavailable'}</td><td>${e(solarWindow(f.goldenStart,f.goldenEnd,data.timezone,f.date))}</td><td>${e(solarWindow(f.blueStart,f.blueEnd,data.timezone,f.date))}</td></tr>`).join('');
  const related=LOCATIONS.filter(p=>p.group===place.group && p.slug!==place.slug).slice(0,4);
  return `<section class="seo-location-summary" aria-labelledby="locationForecastSummary"><div class="seo-location-summary-inner">
  <h2 id="locationForecastSummary">${e(place.name)} sunset outlook</h2>
  <p>On <time datetime="${first.date}">${first.date}</time> in ${e(label(place))}, ${first.sunset ? `sunset is at <strong>${e(clock(first.sunset))}</strong>` : 'there is no sunset time available'}.${q ? ` Skying rates the conditions <strong>${q.score}/100 (${q.verdict})</strong>. ${e(q.reasons.join(' '))}` : ' A quality score is unavailable for this date.'}</p>
  <p class="forecast-freshness${stale ? ' stale-notice' : ''}">${stale ? '<strong>Saved forecast. Live refresh is temporarily unavailable.</strong> ' : ''}Weather data retrieved <time datetime="${e(fetchedAt)}">${e(updated)}</time>. All times are local to ${e(data.timezone)}. Longer-range forecasts are less certain.</p>
  <div class="forecast-table-wrap" role="region" aria-label="Seven-day sunset forecast" tabindex="0"><table class="forecast-table"><caption>Seven-day sunset and photography outlook · ${e(data.timezone)}</caption><thead><tr><th scope="col">Date</th><th scope="col">Sunset</th><th scope="col">Quality</th><th scope="col">Golden hour</th><th scope="col">Blue hour</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p>Golden hour uses a solar altitude of +6° to −4°; blue hour uses −4° to −6°. These are astronomical estimates, not guarantees of colour. “No complete interval” means the sun does not cross both limits for this evening.</p>
  <p>Forecasts describe conditions near ${e(place.name)} (${place.latitude.toFixed(3)}, ${place.longitude.toFixed(3)}). Buildings, hills and local weather can change what you see. A high score is not a probability or a promise.</p>
  <p>Weather: <a href="https://open-meteo.com/">Open-Meteo</a>. Place search: <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> via Photon. <a href="/how-it-works/">How Skying calculates the score</a> · <a href="/guides/golden-hour/">Understanding golden hour</a></p>
  ${LOCAL_GUIDES[place.slug] || ''}
  <nav class="forecast-links" aria-label="More forecasts"><a href="/sunset-forecast/">All sunset forecast locations</a>${related.map(p=>`<a href="/sunset-forecast/${p.slug}">${e(p.name)}</a>`).join('')}</nav>
  </div></section>`;
}
export function applyMetadata(html,page) {
  const e=escapeHtml;
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${e(page.title)}</title>`);
  const values={'description':page.description,'og:title':page.title,'og:description':page.description,'og:url':page.canonical,'twitter:title':page.title,'twitter:description':page.description,'robots':page.indexable ? 'index,follow,max-image-preview:large' : 'noindex,follow'};
  for(const [key,value] of Object.entries(values)) html=html.replace(new RegExp(`(<meta (?:name|property)="${key}" content=")[^"]*("\\s*\\/?>)`,'i'),(_,a,b)=>a+e(value)+b);
  html=html.replace(/(<link rel="canonical" href=")[^"]*("\s*\/?>)/i,(_,a,b)=>a+e(page.canonical)+b);
  html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i,`<script type="application/ld+json">${safeJson(structuredData(page))}</script>`);
  return html;
}
export function renderDashboard(html,page) {
  const e=escapeHtml,q=page.forecasts[0].quality, first=page.forecasts[0],place=page.place;
  html=html.replace('id="emptyState" class="empty-stage"','id="emptyState" class="empty-stage hidden"').replace('id="siteHeader" class="compact-empty"','id="siteHeader"').replace('class="search-wrap header-search hidden"','class="search-wrap header-search"').replace('class="forecast-hero hidden"','class="forecast-hero"').replace('class="dashboard hidden"','class="dashboard"');
  const fields={cityHeading:`${place.name} sunset forecast`,forecastTopline:`Today · ${label(place)} · ${page.data.timezone}`,forecastMessage:q ? messageFor(q.score) : 'The evening forecast is unavailable.',scoreNumber:q?.score ?? '—',verdict:q?.verdict || 'Unavailable',sunsetTime:clock(first.sunset),whyText:q ? q.reasons.join(' ') : 'No complete sunset-quality forecast is available for this date.',bestWindow:solarWindow(first.goldenStart,first.goldenEnd,page.data.timezone,first.date),horizonClarity:q ? `${Math.round(q.horizonScore)}% · ${q.horizonScore>=80 ? 'excellent' : 'mixed'}` : 'Unavailable',visibilityValue:q ? `${q.vis.toFixed(0)} km` : 'Unavailable',goldenDetail:solarWindow(first.goldenStart,first.goldenEnd,page.data.timezone,first.date),blueDetail:solarWindow(first.blueStart,first.blueEnd,page.data.timezone,first.date),localTimeNote:`Forecasts are estimates. All times are local to ${page.data.timezone}.`,mobileLocationLabel:place.name};
  for(const [id,value] of Object.entries(fields)) html=html.replace(new RegExp(`(<(?:h1|p|div|span)[^>]*id="${id}"[^>]*>)[^<]*`),(_,open)=>open+e(value));
  const backdrop=skyBackground(q);
  html=html.replace('id="forecastBackdropImage" src="/assets/evening-sky.webp"',`id="forecastBackdropImage" src="${backdrop.src}" data-situation="${backdrop.situation}"`);
  html=html.replace('<div id="eveningRuler" class="evening-ruler"></div>',`<div id="eveningRuler" class="evening-ruler">${eveningRuler(first,page.data.timezone)}</div>`);
  html=html.replace('id="placeHeader" data-search-input',`id="placeHeader" value="${e(label(place))}" data-search-input`);
  html=html.replace('<div id="days" class="days"></div>',`<div id="days" class="days">${page.forecasts.map((f,i)=>`<button type="button" class="day-btn${i===0?' selected':''}" aria-pressed="${i===0}"><span class="day-name">${i===0?'Today':e(new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(f.date+'T12:00:00Z')).split(',')[0])}</span><span class="day-score">${f.quality?.score ?? '—'}</span><span class="day-note">${e(f.quality?.verdict || 'Unavailable')}</span><span class="day-time">${e(clock(f.sunset))}</span></button>`).join('')}</div>`);
  const cards=q ? [['High cloud',`${Math.round(q.high)}%`,'colour canvas'],['Low cloud',`${Math.round(q.low)}%`,'horizon block'],['Visibility',`${q.vis.toFixed(1)} km`,'atmospheric reach'],['Rain chance',`${Math.round(q.precip)}%`,'during the window']] : [];
  html=html.replace('<section id="metrics" class="metrics"></section>',`<section id="metrics" class="metrics">${cards.map(([label,value,note])=>`<article class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></article>`).join('')}</section>`);
  return html;
}
