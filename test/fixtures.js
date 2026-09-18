export function fixture(date='2026-09-17',timezone='Asia/Kolkata') {
 const days=Array.from({length:7},(_,i)=>new Date(Date.parse(date+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
 const time=days.flatMap(d=>Array.from({length:24},(_,h)=>`${d}T${String(h).padStart(2,'0')}:00`));
 const hourly={time};for(const [f,n] of Object.entries({cloud_cover:45,cloud_cover_low:10,cloud_cover_mid:35,cloud_cover_high:50,visibility:22000,precipitation_probability:5,relative_humidity_2m:50})) hourly[f]=time.map(()=>n);
 return {timezone,daily:{time:days,sunset:days.map(d=>d+'T18:30'),sunrise:days.map(d=>d+'T06:00')},hourly};
}
export function memoryCache() {const items=new Map();return {async match(k){return items.get(k.url)?.clone();},async put(k,v){items.set(k.url,v.clone());}};}
