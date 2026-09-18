// Curated city-centre coordinates. Slugs are permanent; aliases redirect to them.
// Dates and timezone offsets come from the forecast provider, not the visitor's clock.
export const BASE_URL = 'https://skyingg.gauravsharma.cc';
const rows = [
 ['New Delhi','India','Delhi',28.6139,77.209,'Asia/Kolkata','India','new-delhi-india',['delhi-india']],
 ['Mumbai','India','Maharashtra',19.076,72.8777,'Asia/Kolkata','India','mumbai-india',['bombay-india']],
 ['Bengaluru','India','Karnataka',12.9716,77.5946,'Asia/Kolkata','India','bengaluru-india',['bangalore-india']],
 ['Chennai','India','Tamil Nadu',13.0827,80.2707,'Asia/Kolkata','India','chennai-india',['madras-india']],
 ['Kolkata','India','West Bengal',22.5726,88.3639,'Asia/Kolkata','India','kolkata-india',['calcutta-india']],
 ['Hyderabad','India','Telangana',17.385,78.4867,'Asia/Kolkata','India','hyderabad-india'],
 ['Pune','India','Maharashtra',18.5204,73.8567,'Asia/Kolkata','India','pune-india'],
 ['Jaipur','India','Rajasthan',26.9124,75.7873,'Asia/Kolkata','India','jaipur-india'],
 ['Ahmedabad','India','Gujarat',23.0225,72.5714,'Asia/Kolkata','India','ahmedabad-india'],
 ['Udaipur','India','Rajasthan',24.5854,73.7125,'Asia/Kolkata','India','udaipur-india'],
 ['Jaisalmer','India','Rajasthan',26.9157,70.9083,'Asia/Kolkata','India','jaisalmer-india'],
 ['Varanasi','India','Uttar Pradesh',25.3176,82.9739,'Asia/Kolkata','India','varanasi-india'],
 ['Kochi','India','Kerala',9.9312,76.2673,'Asia/Kolkata','India','kochi-india',['cochin-india']],
 ['Srinagar','India','Jammu and Kashmir',34.0837,74.7973,'Asia/Kolkata','India','srinagar-india'],
 ['Leh','India','Ladakh',34.1526,77.5771,'Asia/Kolkata','India','leh-india'],
 ['Panaji','India','Goa',15.4909,73.8278,'Asia/Kolkata','India','panaji-india',['panjim-india']],
 ['London','United Kingdom','England',51.5074,-0.1278,'Europe/London','Europe','london-united-kingdom'],
 ['Edinburgh','United Kingdom','Scotland',55.9533,-3.1883,'Europe/London','Europe','edinburgh-united-kingdom'],
 ['Paris','France','Île-de-France',48.8566,2.3522,'Europe/Paris','Europe','paris-france'],
 ['Rome','Italy','Lazio',41.9028,12.4964,'Europe/Rome','Europe','rome-italy'],
 ['Barcelona','Spain','Catalonia',41.3874,2.1686,'Europe/Madrid','Europe','barcelona-spain'],
 ['Lisbon','Portugal','Lisbon',38.7223,-9.1393,'Europe/Lisbon','Europe','lisbon-portugal'],
 ['Reykjavík','Iceland','Capital Region',64.1466,-21.9426,'Atlantic/Reykjavik','Europe','reykjavik-iceland'],
 ['Athens','Greece','Attica',37.9838,23.7275,'Europe/Athens','Europe','athens-greece'],
 ['Istanbul','Turkey','Istanbul',41.0082,28.9784,'Europe/Istanbul','Europe','istanbul-turkey',['istanbul-turkiye']],
 ['New York','United States','New York',40.7128,-74.006,'America/New_York','Americas','new-york-united-states',['new-york-city-united-states']],
 ['Los Angeles','United States','California',34.0522,-118.2437,'America/Los_Angeles','Americas','los-angeles-united-states'],
 ['San Francisco','United States','California',37.7749,-122.4194,'America/Los_Angeles','Americas','san-francisco-united-states'],
 ['Seattle','United States','Washington',47.6062,-122.3321,'America/Los_Angeles','Americas','seattle-united-states'],
 ['Miami','United States','Florida',25.7617,-80.1918,'America/New_York','Americas','miami-united-states'],
 ['Honolulu','United States','Hawaii',21.3099,-157.8581,'Pacific/Honolulu','Americas','honolulu-united-states'],
 ['Vancouver','Canada','British Columbia',49.2827,-123.1207,'America/Vancouver','Americas','vancouver-canada'],
 ['Toronto','Canada','Ontario',43.6532,-79.3832,'America/Toronto','Americas','toronto-canada'],
 ['Mexico City','Mexico','Mexico City',19.4326,-99.1332,'America/Mexico_City','Americas','mexico-city-mexico'],
 ['Rio de Janeiro','Brazil','Rio de Janeiro',-22.9068,-43.1729,'America/Sao_Paulo','Americas','rio-de-janeiro-brazil'],
 ['Cape Town','South Africa','Western Cape',-33.9249,18.4241,'Africa/Johannesburg','Asia, Africa & Oceania','cape-town-south-africa'],
 ['Dubai','United Arab Emirates','Dubai',25.2048,55.2708,'Asia/Dubai','Asia, Africa & Oceania','dubai-united-arab-emirates'],
 ['Singapore','Singapore','',1.3521,103.8198,'Asia/Singapore','Asia, Africa & Oceania','singapore-singapore'],
 ['Tokyo','Japan','Tokyo',35.6762,139.6503,'Asia/Tokyo','Asia, Africa & Oceania','tokyo-japan'],
 ['Bangkok','Thailand','Bangkok',13.7563,100.5018,'Asia/Bangkok','Asia, Africa & Oceania','bangkok-thailand'],
 ['Sydney','Australia','New South Wales',-33.8688,151.2093,'Australia/Sydney','Asia, Africa & Oceania','sydney-australia'],
 ['Melbourne','Australia','Victoria',-37.8136,144.9631,'Australia/Melbourne','Asia, Africa & Oceania','melbourne-australia'],
 ['Auckland','New Zealand','Auckland',-36.8485,174.7633,'Pacific/Auckland','Asia, Africa & Oceania','auckland-new-zealand']
];
export const LOCATIONS = rows.map(([name,country,admin1,latitude,longitude,timezone,group,slug,aliases=[]]) => ({name,country,admin1,latitude,longitude,timezone,group,slug,aliases}));
export const slugify = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
export const locationBySlug = slug => LOCATIONS.find(p => p.slug === slug || p.aliases.includes(slug));
export function curatedMatch(place) {
  if (place.precise) return null;
  const key = slugify(`${place.name} ${place.country}`);
  return LOCATIONS.find(p => (p.slug === key || p.aliases.includes(key)) && Math.abs(p.latitude-place.latitude)<0.15 && Math.abs(p.longitude-place.longitude)<0.15);
}
export function placePath(place) {
  const curated = curatedMatch(place);
  if (curated) return `/sunset-forecast/${curated.slug}`;
  const params = new URLSearchParams({lat:Number(place.latitude).toFixed(5),lon:Number(place.longitude).toFixed(5),name:place.name,region:place.admin1||'',country:place.country||''});
  return `/forecast/?${params}`;
}
