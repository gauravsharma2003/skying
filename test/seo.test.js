import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LOCATIONS,BASE_URL,placePath} from '../src/locations.js';
import {evaluate} from '../src/scoring.js';
import {localDate,solarTimes} from '../src/solar.js';
import {weatherFor} from '../src/weather.js';
import {fixture,memoryCache} from './fixtures.js';
import worker from '../worker.js';
const shell=await readFile('dist/index.html','utf8');
const env={ASSETS:{fetch:async()=>new Response(shell)}};
const request=path=>new Request(BASE_URL+path);

test('all 43 curated routes render unique canonicals, metadata, dates and seven rows without geocoding',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{assert.equal(new URL(url).hostname,'api.open-meteo.com');calls++;const timezone=new URL(url).searchParams.get('timezone');return Response.json(fixture(localDate(Date.now(),timezone),timezone));};
 try {
  const titles=new Set();
  for(const place of LOCATIONS){
   const path='/sunset-forecast/'+place.slug;
   const response=await worker.fetch(request(path),env);assert.equal(response.status,200,place.slug);
   const html=await response.text();assert.ok(html.includes(`rel="canonical" href="${BASE_URL+path}"`));assert.ok(html.includes('id="cityHeading" class="city-heading">'+place.name));assert.ok(html.includes('id="emptyState" class="empty-stage hidden"'));assert.ok(html.includes('<details class="photography-details" open>'));
   assert.equal((html.match(/<tr>/g)||[]).length,8);assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Invalid Date'));assert.ok(!html.includes('HOME_CONTENT_START'));
   const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);assert.equal(structured['@graph'][1].url,BASE_URL+path);
   assert.equal(response.headers.get('link'),`<${BASE_URL+path}>; rel="canonical"`);
   titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
  }
  assert.equal(calls,43);assert.equal(titles.size,43);
 }finally{globalThis.fetch=original;}
});
test('aliases, uppercase, trailing slash and tracking query resolve to one canonical',async()=>{
 for(const path of ['/sunset-forecast/delhi-india','/sunset-forecast/NEW-DELHI-INDIA','/sunset-forecast/new-delhi-india/','/sunset-forecast/new-delhi-india?utm_source=test']){const r=await worker.fetch(request(path),env);assert.equal(r.status,301);assert.equal(r.headers.get('location'),BASE_URL+'/sunset-forecast/new-delhi-india');}
});
test('malformed routes and coordinates are rejected',async()=>{
 for(const path of ['/sunset-forecast/%E0%A4%A','/sunset-forecast/a/b','/sunset-forecast/%3Cscript%3E']) assert.equal((await worker.fetch(request(path),env)).status,404);
 for(const path of ['/forecast/?lat=91&lon=0','/forecast/?lat=&lon=0','/forecast/?lat=1&lon=NaN']) assert.equal((await worker.fetch(request(path),env)).status,400);
});
test('custom coordinates stay distinct and non-indexable; labels cannot inject HTML or script',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json(fixture(localDate(Date.now(),'Asia/Kolkata')));
 try {const place={name:'</script><script>alert(1)</script>',latitude:28.12,longitude:77.21,country:'India',precise:true};const r=await worker.fetch(request(placePath(place)),env);const html=await r.text();assert.equal(r.status,200);assert.equal(r.headers.get('x-robots-tag'),'noindex, follow');assert.equal(r.headers.get('cache-control'),'private, no-store');assert.ok(!html.includes('</script><script>alert(1)'));assert.ok(html.includes('&lt;/script&gt;'));}finally{globalThis.fetch=original;}
 assert.notEqual(placePath({name:'Springfield',country:'United States',latitude:39.78,longitude:-89.64}),placePath({name:'Springfield',country:'United States',latitude:42.10,longitude:-72.59}));
});
test('missing observations never become a plausible score',()=>{
 const data=fixture();assert.ok(evaluate(data.hourly,data.daily.sunset[0]).score>=0);assert.equal(evaluate(data.hourly,''),null);
 data.hourly.visibility.fill(null);assert.equal(evaluate(data.hourly,data.daily.sunset[0]),null);
});
test('weather cache uses fresh data, falls back after failure, expires and rejects yesterday',async()=>{
 const cache=memoryCache(),place=LOCATIONS[0],now=Date.parse('2026-09-17T08:00:00Z');let requests=0;
 const fetcher=async()=>{requests++;return Response.json(fixture());};
 const first=await weatherFor(place,{cache,fetcher,now});assert.equal(first.stale,false);
 await weatherFor(place,{cache,fetcher,now:now+1000});assert.equal(requests,1);
 const fail=async()=>{throw new Error('offline');};
 const fallback=await weatherFor(place,{cache,fetcher:fail,now:now+3600000});assert.equal(fallback.stale,true);assert.equal(fallback.fetchedAt,first.fetchedAt);
 await assert.rejects(weatherFor(place,{cache,fetcher:fail,now:now+21600000}));
 const midnight=Date.parse('2026-09-17T18:00:00Z');const nearMidnight=memoryCache();await weatherFor(place,{cache:nearMidnight,fetcher,now:midnight});
 await assert.rejects(weatherFor(place,{cache:nearMidnight,fetcher:fail,now:midnight+3600000}));
});
test('invalid upstream responses use a saved snapshot or fail honestly',async()=>{
 const cache=memoryCache(),place=LOCATIONS[0],now=Date.parse('2026-09-17T08:00:00Z');
 const incomplete=async()=>Response.json({daily:{time:[]}});
 await assert.rejects(weatherFor(place,{cache,fetcher:incomplete,now}));
 await weatherFor(place,{cache,fetcher:async()=>Response.json(fixture()),now});assert.equal((await weatherFor(place,{cache,fetcher:incomplete,now:now+3600000})).stale,true);
});
test('solar intervals are chronological and belong to each city date across DST and the date line',()=>{
 for(const date of ['2026-03-08','2026-06-21','2026-09-17','2026-11-01','2026-12-21'])for(const place of LOCATIONS){const s=solarTimes(date,place,place.timezone);if(s.goldenStart&&s.goldenEnd){assert.ok(s.goldenStart<s.goldenEnd,place.slug+date);assert.equal(localDate(s.goldenStart,place.timezone),date,place.slug+date);}if(s.blueStart&&s.blueEnd)assert.ok(s.blueStart<s.blueEnd,place.slug+date);}
 const polar=solarTimes('2026-06-21',{latitude:89,longitude:0},'UTC');assert.equal(polar.goldenStart,null);assert.equal(polar.blueEnd,null);
});
test('sitemap and directory contain every canonical city and no aliases or coordinate queries',async()=>{
 const sitemap=await readFile('dist/sitemap.xml','utf8'),directory=await readFile('dist/sunset-forecast/index.html','utf8');
 assert.equal((sitemap.match(/<loc>/g)||[]).length,51);
 for(const p of LOCATIONS){assert.ok(sitemap.includes(BASE_URL+'/sunset-forecast/'+p.slug+'</loc>'));assert.ok(directory.includes('href="/sunset-forecast/'+p.slug+'"'));for(const alias of p.aliases)assert.ok(!sitemap.includes('/'+alias+'</loc>'));}
 assert.ok(!sitemap.includes('/forecast/?'));assert.ok(shell.includes('href="/sunset-forecast/"'));assert.ok(!shell.includes('app-loader.js'));
});
test('HEAD produces metadata without a body and unsupported methods return 405',async()=>{
 assert.equal((await worker.fetch(new Request(BASE_URL+'/sunset-forecast/new-delhi-india',{method:'POST'}),env)).status,405);
 const head=await worker.fetch(new Request(BASE_URL+'/sunset-forecast/delhi-india',{method:'HEAD'}),env);assert.equal(head.status,301);assert.equal(await head.text(),'');
});
