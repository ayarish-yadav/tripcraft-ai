import {normalizeCatalog,placeKey,stopsPerDay} from './itineraryQuality.js';
import {setDefaultResultOrder} from 'node:dns';

// Prefer reachable IPv4 addresses on hosts without outbound IPv6 routing.
setDefaultResultOrder('ipv4first');

const cache=new Map(),pending=new Map();
const TTL=6*60*60*1000;
const userAgent='TripCraft/3.0 (https://tripcraft-by-ayarish.onrender.com; travel planner)';
export const guideLicense={title:'Wikivoyage contributors · adapted guide text · CC BY-SA 4.0',url:'https://creativecommons.org/licenses/by-sa/4.0/'};
export function parseJSON(text){return JSON.parse(String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
const problem=(message,status=503)=>Object.assign(Error(message),{status});
const responseCache=new Map(),requests=new Map();
export async function publicJSON(url){
  const hit=responseCache.get(url);
  if(hit?.expires>Date.now())return structuredClone(hit.data);
  if(requests.has(url))return structuredClone(await requests.get(url));
  const request=(async()=>{
    try{
      // Fail over to another provider instead of retrying the same unreachable host.
      const response=await fetch(url,{headers:{'User-Agent':userAgent,Accept:'application/json'},signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Object.assign(Error('Public provider response'),{code:`HTTP_${response.status}`});
      const data=await response.json();
      if(data.error)throw Error('Public provider API error');
      if(responseCache.size>=200)responseCache.delete(responseCache.keys().next().value);
      responseCache.set(url,{data,expires:Date.now()+TTL});
      return data;
    }catch(error){
      console.warn(`Public data unavailable: ${new URL(url).hostname} (${error?.cause?.code||error?.code||error?.name||'network'})`);
      throw problem('The public destination-data services are temporarily unreachable. Please try again shortly.');
    }
  })();
  requests.set(url,request);
  try{return structuredClone(await request);}finally{requests.delete(url);}
}
export function distance(a,b){
  if(!Number.isFinite(a?.lat)||!Number.isFinite(a?.lon)||!Number.isFinite(b?.lat)||!Number.isFinite(b?.lon))return null;
  const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlon=(b.lon-a.lon)*r;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2)));
}
const regionLocations={
  bali:{city:'Bali',country:'Indonesia',countryCode:'ID',lat:-8.43,lon:115.167,radius:85,region:true},
  dolomites:{city:'Dolomites',country:'Italy',countryCode:'IT',lat:46.5,lon:11.85,radius:90,region:true}
};
const locationSource={title:'Location data · Open-Meteo / GeoNames',url:'https://open-meteo.com/en/docs/geocoding-api'};
const mapSource={title:'© OpenStreetMap contributors · ODbL (via Photon / Overpass)',url:'https://www.openstreetmap.org/copyright'};
const aliases={usa:'united states',us:'united states',uk:'united kingdom',uae:'united arab emirates'};
const same=(a,b)=>placeKey(aliases[placeKey(a)]||a)===placeKey(aliases[placeKey(b)]||b);
const validPoint=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
export async function resolveDestination(destination,{getJSON=publicJSON}={}){
  const [name,...qualifiers]=destination.split(',').map(s=>s.trim()).filter(Boolean);
  if(!name)throw problem('Enter a city and country.',422);
  const region=regionLocations[placeKey(name)];
  if(region&&qualifiers.every(q=>[region.country,region.countryCode].some(v=>same(q,v))))return {...region,locationSource};
  let successful=0;
  try{
    const data=await getJSON('https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name,count:'30',language:'en',format:'json'}));
    successful++;
    const results=(data.results||[]).filter(p=>validPoint({lat:p.latitude,lon:p.longitude})&&qualifiers.every(q=>[p.country,p.country_code,p.admin1,p.admin2,p.admin3].some(v=>same(q,v))));
    const p=results.find(p=>same(p.name,name))||results[0];
    if(p)return {city:p.name,country:p.country||'',countryCode:p.country_code,lat:p.latitude,lon:p.longitude,radius:30,region:false,locationSource};
  }catch{ /* Search an independent OSM index when GeoNames is unavailable. */ }
  try{
    const data=await getJSON('https://photon.komoot.io/api/?'+new URLSearchParams({q:destination,limit:'15',lang:'en'}));
    successful++;
    const features=(data.features||[]).filter(f=>{
      const p=f.properties||{},[lon,lat]=f.geometry?.coordinates||[];
      return validPoint({lat,lon})&&['city','town','village','hamlet','locality','district','county','state','island'].includes(p.type||p.osm_value)&&
        qualifiers.every(q=>[p.country,p.countrycode,p.state,p.county,p.city].some(v=>same(q,v)));
    });
    // Prefer a settlement over a same-named isolated dwelling or broad province.
    const rank=f=>({city:100,town:90,village:80,hamlet:70,state:60,county:50,district:40,island:35,locality:20}[f.properties.type||f.properties.osm_value]||0)+(same(f.properties.name,name)?10:0);
    const f=features.sort((a,b)=>rank(b)-rank(a))[0];
    if(f){const p=f.properties,[lon,lat]=f.geometry.coordinates;
      return {city:p.name,country:p.country||'',countryCode:p.countrycode?.toUpperCase(),lat,lon,radius:30,region:false,locationSource:mapSource};
    }
  }catch{ /* Preserve the distinction between no matches and a total outage. */ }
  if(!successful)throw problem('Destination search providers are temporarily unavailable. Please try again shortly.');
  throw problem('We could not locate that destination. Enter a city and country, for example Jaipur, India.',422);
}

// Nested links/templates contain pipes: parse named sightseeing listings without splitting those fields.
function templateParts(text){
  const parts=[];let start=0,braces=0,links=0;
  for(let i=0;i<text.length;i++){
    const pair=text.slice(i,i+2);
    if(pair==='{{'){braces++;i++;}else if(pair==='}}'){braces--;i++;}
    else if(pair==='[['){links++;i++;}else if(pair===']]'){links--;i++;}
    else if(text[i]==='|'&&!braces&&!links){parts.push(text.slice(start,i));start=i+1;}
  }
  parts.push(text.slice(start));return parts;
}
export function plainWiki(text=''){
  return text.replace(/<!--[\s\S]*?-->/g,'').replace(/\[\[(?:File|Image):[^\]]*\]\]/gi,'')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,target,label)=>label||target.split('#')[0])
    .replace(/\[(?:https?:\/\/\S+)\s*([^\]]*)\]/g,'$1')
    .replace(/\{\{[^{}]*\}\}/g,'').replace(/<[^>]*>/g,'').replace(/'{2,}/g,'')
    .replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&ndash;/g,'–').replace(/&mdash;/g,'—').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
}
function outsideTemplates(text){
  let depth=0,result='';
  for(let i=0;i<text.length;i++){
    const pair=text.slice(i,i+2);
    if(pair==='{{'){depth++;i++;}else if(pair==='}}'){depth=Math.max(0,depth-1);i++;}
    else if(!depth)result+=text[i];
  }
  return result;
}
const contentOf=p=>p?.revisions?.[0]?.slots?.main?.content||'';
export function parseGuide(page,location,highlights=''){
  const raw=contentOf(page).replace(/<!--[\s\S]*?-->/g,'');
  const records=[],matcher=/\{\{\s*(see|do|listing)\s*\|/gi;
  let match;
  while((match=matcher.exec(raw))){
    let depth=1,end=matcher.lastIndex;
    for(;end<raw.length-1&&depth;end++){
      const pair=raw.slice(end,end+2);
      if(pair==='{{'){depth++;end++;}else if(pair==='}}'){depth--;if(depth)end++;}
    }
    if(depth)continue;
    const fields={};
    for(const part of templateParts(raw.slice(matcher.lastIndex,end-1))){const i=part.indexOf('=');if(i>0)fields[part.slice(0,i).trim().toLowerCase()]=part.slice(i+1).trim();}
    matcher.lastIndex=end+1;
    if(match[1].toLowerCase()==='listing'&&!/^(see|do|museum|park|sight)$/i.test(fields.type||''))continue;
    const name=plainWiki(fields.name),description=plainWiki(fields.content),lat=Number(fields.lat),lon=Number(fields.long||fields.lon);
    if(!name||!description||!fields.lat||!(fields.long||fields.lon)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)continue;
    if(/permanently closed|closed permanently|no longer open/i.test(description)||fields.status==='closed')continue;
    if(distance(location,{lat,lon})>location.radius)continue;
    const indoor=/museum|musée|gallery|gallerie|aquarium|planetarium/i.test(name);
    const nature=/\b(park|garden|beach|lake|waterfall|forest|botanical)\b/i.test(name);
    const category=indoor?'Culture':nature?'Nature':/market|bazaar/i.test(name)?'Food':'Culture';
    const sourceUrl='https://en.wikivoyage.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_'));
    const featured=placeKey(highlights).includes(placeKey(name))||/world heritage|world.famous|iconic|major landmark|most famous/i.test(description);
    records.push({name,aliases:[plainWiki(fields.alt),plainWiki(fields.wikipedia)].filter(Boolean),wikidata:fields.wikidata,lat,lon,
      area:page.title.includes('/')?page.title.split('/').slice(1).join('/'):(nature?'Gardens & open spaces':location.city),category,
      description:description.slice(0,650),famous:featured,indoor,durationMinutes:indoor?90:/fort|palace|castle/i.test(name)?120:60,
      feeFree:/^(?:free|no charge)(?:\s|\.|$)/i.test(plainWiki(fields.price)),sourceUrl,
      visitNote:'Community guide information can change. Check access, ticket prices and opening days before visiting.'});
  }
  return records;
}
async function guidePages(titles,getJSON){
  const data=await getJSON('https://en.wikivoyage.org/w/api.php?'+new URLSearchParams({action:'query',prop:'revisions|coordinates|info',rvprop:'content',rvslots:'main',titles:titles.join('|'),redirects:'1',inprop:'url',formatversion:'2',format:'json'}));
  return (data.query?.pages||[]).filter(p=>!p.missing);
}
function childGuides(page){
  const raw=contentOf(page),links=[];
  for(const m of raw.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g))if(m[1].startsWith(page.title+'/'))links.push(m[1]);
  for(const m of raw.matchAll(/\|\s*region\d+items\s*=([^\n]+)/g))for(const l of m[1].matchAll(/\[\[([^\]|#]+)/g))links.push(l[1]);
  return [...new Set(links)].filter(s=>!s.includes(':')).slice(0,20);
}
export function parseOpenMap(data,location){
  return (data.elements||[]).flatMap(e=>{
    const t=e.tags||{},name=t['name:en']||t.name,lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)||distance(location,{lat,lon})>location.radius||['no','private'].includes(t.access)||t['disused:tourism']||t['demolished:tourism'])return [];
    const indoor=['museum','gallery'].includes(t.tourism),nature=t.leisure==='park';
    const kind=indoor?t.tourism:nature?'park':t.historic||t.tourism||'attraction';
    return [{name,aliases:[t.alt_name,t['alt_name:en']].filter(Boolean).flatMap(s=>s.split(';')),wikidata:t.wikidata,lat,lon,
      area:t['addr:suburb']||t['addr:city']||location.city,category:nature?'Nature':'Culture',indoor,famous:Boolean(t.wikidata&&(t.wikipedia||t['wikipedia:en']||t.heritage)),durationMinutes:indoor?90:60,feeFree:t.fee==='no',
      description:`Explore ${name}, a mapped ${kind.replaceAll('_',' ')} in the ${location.city} area. Follow its map link to check the entrance and plan your visit.`,
      visitNote:'OpenStreetMap community listing; confirm public access, hours and admission before travelling.',sourceUrl:`https://www.openstreetmap.org/${e.type}/${e.id}`}];
  }).sort((a,b)=>Number(b.famous)-Number(a.famous));
}
async function openMapPlaces(location,getJSON){
  const around=`(around:${Math.min(location.radius,30)*1000},${location.lat},${location.lon})`;
  const query=`[out:json][timeout:8];(nwr["tourism"~"^(attraction|museum|gallery|viewpoint)$"]["name"]${around};nwr["historic"~"^(castle|monument)$"]["name"]["wikidata"]${around};nwr["leisure"="park"]["name"]["wikidata"]${around};);out center tags 800;`;
  const data=await getJSON('https://overpass-api.de/api/interpreter?'+new URLSearchParams({data:query}));
  return parseOpenMap(data,location);
}
// Photon offers an independent OSM index when Overpass or Wikivoyage is down.
export function parsePhotonPlaces(data,location){
  const typeMap={N:'node',W:'way',R:'relation'};
  return parseOpenMap({elements:(data.features||[]).flatMap(f=>{
    const p=f.properties||{},[lon,lat]=f.geometry?.coordinates||[],type=typeMap[p.osm_type];
    const allowed={tourism:['attraction','museum','gallery','viewpoint'],historic:['castle','monument','memorial'],leisure:['park','garden']};
    if(!type||!Number.isSafeInteger(p.osm_id)||!allowed[p.osm_key]?.includes(p.osm_value))return [];
    return [{type,id:p.osm_id,lat,lon,tags:{name:p.name,[p.osm_key]:p.osm_value,'addr:city':p.city}}];
  })},location);
}
async function photonPlaces(location,getJSON){
  const params=new URLSearchParams({lat:String(location.lat),lon:String(location.lon),radius:String(Math.min(location.radius,30)),limit:'50',lang:'en'});
  for(const tag of ['tourism:attraction','tourism:museum','tourism:gallery','tourism:viewpoint','historic:castle','historic:monument','leisure:park'])params.append('osm_tag',tag);
  return parsePhotonPlaces(await getJSON('https://photon.komoot.io/reverse?'+params),location);
}
async function loadCity(form,getJSON){
  const location=await resolveDestination(form.destination,{getJSON});
  let places=[],pages=[],usedMap=false;
  try{
    const [main]=await guidePages([location.city],getJSON);
    const center=main?.coordinates?.find(p=>p.primary)||main?.coordinates?.[0];
    if(main&&center&&distance(location,center)<location.radius){
      const raw=contentOf(main),highlights=plainWiki(outsideTemplates(raw.slice(0,2000)))+plainWiki(outsideTemplates(raw.match(/==\s*See\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1]||''));
      pages=[main];places=parseGuide(main,location,highlights);
      if(places.length<Math.max(16,Number(form.days)*stopsPerDay(form.pace)+6)){
        const children=childGuides(main);
        if(children.length){pages.push(...await guidePages(children,getJSON));for(const p of pages.slice(1))places.push(...parseGuide(p,location,highlights));}
      }
    }
  }catch{ /* A public guide outage can use mapped attractions instead. */ }
  if(places.length<Math.max(8,Number(form.days)*2)){
    const results=await Promise.allSettled([openMapPlaces(location,getJSON),photonPlaces(location,getJSON)]);
    for(const result of results)if(result.status==='fulfilled'&&result.value.length){places.push(...result.value);usedMap=true;}
  }
  places.sort((a,b)=>Number(b.famous)-Number(a.famous));
  const catalog=normalizeCatalog({...location,places});
  const sourceURLs=new Set(catalog.places.map(p=>p.sourceUrl));
  const sources=pages.filter(p=>sourceURLs.has('https://en.wikivoyage.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_')))).map(p=>({title:`Wikivoyage contributors · ${p.title}`,url:'https://en.wikivoyage.org/wiki/'+encodeURIComponent(p.title.replaceAll(' ','_'))}));
  if(sources.length)sources.push(guideLicense);
  if(usedMap)sources.push({title:'© OpenStreetMap contributors · ODbL',url:'https://www.openstreetmap.org/copyright'});
  sources.push(location.locationSource||locationSource);
  return {...catalog,region:location.region,sources,researchAt:new Date().toISOString(),attribution:'Place descriptions adapted from linked community sources. Wikivoyage text is CC BY-SA 4.0; mapped attraction data is © OpenStreetMap contributors (ODbL). TripCraft schedules and budget allowances are generated separately.'};
}
export async function researchCity(_ai,form,{getJSON=publicJSON}={}){
  const key=placeKey(form.destination),minimum=Number(form.days)*2;
  let data=cache.get(key)?.expires>Date.now()?cache.get(key).data:null;
  if(!data||data.places.length<minimum){
    if(!pending.has(key))pending.set(key,loadCity(form,getJSON).then(result=>{
      if(result.places.length){if(cache.size>=50)cache.delete(cache.keys().next().value);cache.set(key,{data:result,expires:Date.now()+TTL});}return result;
    }).finally(()=>pending.delete(key)));
    data=await pending.get(key);
  }
  if(data.places.length<minimum)throw problem(`The free guides returned ${data.places.length} distinct places for ${data.city}. ${data.places.length?'Choose fewer days or a nearby larger city.':'Try again shortly or choose a nearby larger city.'} We will not repeat attractions to fill your trip.`,data.places.length?422:503);
  return structuredClone(data);
}
