import {BASE_URL,locationBySlug,slugify,placePath} from './src/locations.js';
import {weatherFor} from './src/weather.js';
import {makePage,forecastSummary,applyMetadata,renderDashboard,escapeHtml,safeJson} from './src/render.js';
function errorPage(status,title,message) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | Skying</title></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/sunset-forecast/">Browse sunset forecasts</a></main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','x-robots-tag':'noindex','cache-control':'no-store',...(status===503 ? {'retry-after':'300'} : {})}});
}
async function legacyPlace(slug) {
  const url=new URL('https://photon.komoot.io/api/');url.searchParams.set('q',slug.replace(/-/g,' '));url.searchParams.set('limit','1');url.searchParams.set('lang','en');
  const response=await fetch(url,{signal:AbortSignal.timeout(5000)});
  if(!response.ok) throw new Error('Location lookup unavailable');
  const feature=(await response.json()).features?.[0];
  if(!feature) return null;
  const p=feature.properties, c=feature.geometry?.coordinates;
  if(!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || slugify(`${p.name} ${p.country}`)!==slug) return null;
  return {name:p.name,admin1:p.state||'',country:p.country||'',latitude:c[1],longitude:c[0]};
}
async function route(request,env) {
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{allow:'GET, HEAD'}});
  if(url.pathname==='/sunset-forecast') return Response.redirect(BASE_URL+'/sunset-forecast/',301);
  let place,path,indexable=true;
  if(url.pathname==='/forecast' || url.pathname==='/forecast/') {
    const lat=url.searchParams.get('lat'),lon=url.searchParams.get('lon');
    if(!lat?.trim() || !lon?.trim() || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)) || Math.abs(Number(lat))>90 || Math.abs(Number(lon))>180) return errorPage(400,'Invalid location','Choose a location using the search field.');
    place={name:(url.searchParams.get('name')||'Selected location').slice(0,100),admin1:(url.searchParams.get('region')||'').slice(0,100),country:(url.searchParams.get('country')||'').slice(0,100),latitude:Number(lat),longitude:Number(lon),precise:true};
    path=placePath(place);indexable=false;
    if(url.pathname+url.search!==path) return Response.redirect(BASE_URL+path,301);
  } else if(url.pathname.startsWith('/sunset-forecast/') && url.pathname!=='/sunset-forecast/') {
    let slug;
    try {slug=decodeURIComponent(url.pathname.slice('/sunset-forecast/'.length)).replace(/\/+$/,'').toLowerCase();} catch {return errorPage(404,'Place not found','This forecast address is not valid.');}
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length>120) return errorPage(404,'Place not found','Try a city from the forecast directory.');
    place=locationBySlug(slug);
    if(!place) {
      try {const legacy=await legacyPlace(slug);return legacy ? Response.redirect(BASE_URL+placePath(legacy),301) : errorPage(404,'Place not found','Try a city from the forecast directory.');} catch {return errorPage(503,'Location search unavailable','Please try again shortly.');}
    }
    path=`/sunset-forecast/${place.slug}`;
    if(url.pathname!==path || url.search) return Response.redirect(BASE_URL+path,301);
  } else return env.ASSETS.fetch(request);
  try {
    const snapshot=await weatherFor(place);
    const page=makePage(place,snapshot,path,indexable);
    const asset=await env.ASSETS.fetch(new Request(new URL('/',request.url)));
    if(!asset.ok) return errorPage(503,'Skying temporarily unavailable','The forecast page could not be loaded. Please try again shortly.');
    let html=applyMetadata(await asset.text(),page);
    html=html.replace(/<!-- HOME_CONTENT_START -->[\s\S]*?<!-- HOME_CONTENT_END -->/,'');
    html=html.replace('<h1 class="empty-title">Will tonight’s sunset be <em>worth it?</em></h1>',`<h1 class="empty-title">${escapeHtml(place.name)}<br><em>sunset forecast</em></h1>`);
    html=renderDashboard(html,page);
    html=html.replace('<!-- FORECAST_SUMMARY -->',forecastSummary(page));
    html=html.replace('<!-- PAGE_DATA -->',`<script>window.__SKYING_PAGE__=${safeJson(page)};</script>`);
    return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':indexable ? 'public, max-age=60, must-revalidate' : 'private, no-store','link':`<${page.canonical}>; rel="canonical"`,'x-robots-tag':indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}});
  } catch {return errorPage(503,'Forecast temporarily unavailable','The weather service is unavailable and no recent forecast is cached. Please try again shortly.');}
}
export default {async fetch(request,env) {const response=await route(request,env);return request.method==='HEAD' ? new Response(null,response) : response;}};
