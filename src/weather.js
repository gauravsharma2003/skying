import {localDate} from './solar.js';
const FRESH_MS = 30*60*1000;
const MAX_AGE_MS = 6*60*60*1000;
export function validForecast(data) {
  const fields=['cloud_cover','cloud_cover_low','cloud_cover_mid','cloud_cover_high','visibility','precipitation_probability','relative_humidity_2m'];
  if (!data?.timezone || !Array.isArray(data.daily?.time) || !data.daily.time.length || !Array.isArray(data.daily.sunset) || !Array.isArray(data.hourly?.time) || !data.hourly.time.length) return false;
  try { localDate(Date.now(),data.timezone); } catch { return false; }
  return data.daily.time.every(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)) && data.daily.sunset.length===data.daily.time.length && fields.every(f=>Array.isArray(data.hourly[f]) && data.hourly[f].length===data.hourly.time.length);
}
function usable(snapshot, now) {
  if (!snapshot || !validForecast(snapshot.data)) return false;
  const age=now-Date.parse(snapshot.fetchedAt);
  return age>=0 && age<MAX_AGE_MS && snapshot.data.daily.time[0]===localDate(now,snapshot.data.timezone);
}
export async function weatherFor(place, {fetcher=fetch,cache=globalThis.caches?.default,now=Date.now()}={}) {
  const params = new URLSearchParams({latitude:String(place.latitude),longitude:String(place.longitude),timezone:place.timezone || 'auto',forecast_days:'7',daily:'sunrise,sunset',hourly:'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,precipitation_probability,relative_humidity_2m'});
  const key = new Request(`https://skyingg.gauravsharma.cc/__forecast-cache/v2?${params}`);
  let saved;
  try { const hit=await cache?.match(key); saved=hit ? await hit.json() : null; } catch { saved=null; }
  if (usable(saved,now) && now-Date.parse(saved.fetchedAt)<FRESH_MS) return {...saved,stale:false};
  try {
    const response=await fetcher(`https://api.open-meteo.com/v1/forecast?${params}`,{signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error('Forecast provider unavailable');
    const data=await response.json();
    if (!validForecast(data) || data.daily.time[0]!==localDate(now,data.timezone)) throw new Error('Forecast data incomplete or out of date');
    const snapshot={data,fetchedAt:new Date(now).toISOString()};
    // Store the snapshot for six hours; freshness and local date are checked above.
    // Cache API is local to a Cloudflare data centre, so fallback is best-effort.
    try { await cache?.put(key,new Response(JSON.stringify(snapshot),{headers:{'content-type':'application/json','cache-control':'public, max-age=21600'}})); } catch { /* Cache availability must not break a fresh forecast. */ }
    return {...snapshot,stale:false};
  } catch(error) {
    if (usable(saved,now)) return {...saved,stale:true};
    throw error;
  }
}
