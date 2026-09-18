import {mkdir,writeFile} from 'node:fs/promises';
import {LOCATIONS,BASE_URL} from '../src/locations.js';
import {PAGES} from '../src/content.js';
const origin=process.argv[2] || BASE_URL;
const paths=['/','/sunset-forecast/',...LOCATIONS.map(p=>'/sunset-forecast/'+p.slug),...PAGES.map(p=>p.path)];
const results=[];
// Sequential by design: avoid bursting requests at the public weather API.
for(const path of paths) {
 try {
  const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  const html=await response.text();const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  const valid=response.status===200 && canonical===BASE_URL+path && !/content="noindex/.test(html);
  results.push({path,status:response.status,canonical,pass:valid});console.log(`${valid?'PASS':'FAIL'} ${response.status} ${path}`);
 } catch(error) {results.push({path,pass:false,error:error.message});console.log(`FAIL ${path}: ${error.message}`);}
}
await mkdir('reports',{recursive:true});await writeFile('reports/url-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),origin,results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
