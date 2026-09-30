import {createHash} from 'node:crypto';
import {validItinerary} from './validation.js';
export const placeKey = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const stopsPerDay = pace => pace === 'Relaxed' ? 2 : pace === 'Adventure-packed' ? 4 : 3;
export function normalizeCatalog(data) {
  if(!data || typeof data.city!=='string' || !Array.isArray(data.places))throw Error('City research was incomplete. Try a city and country, such as Jaipur, India.');
  const seen=new Set(),identities=new Set();
  const places=[];
  for(const p of data.places){
    if(!p || typeof p.name!=='string' || !p.name.trim() || typeof p.area!=='string' || typeof p.description!=='string')continue;
    const names=[p.name,...(Array.isArray(p.aliases)?p.aliases:[])].map(placeKey).filter(Boolean);
    const identity=/^Q\d+$/.test(p.wikidata||'')?p.wikidata:names[0];
    if(identities.has(identity)||names.some(n=>seen.has(n)))continue;
    // A second show/wing inside a scheduled complex is not another day's attraction.
    if(places.some(q=>Math.abs(q.lat-p.lat)<.002&&Math.abs(q.lon-p.lon)<.002&&
      (names[0].startsWith(placeKey(q.name)+' ')||/\b(inside|within|part of)\b/i.test(p.description)&&placeKey(p.description).includes(placeKey(q.name)))))continue;
    identities.add(identity);
    names.forEach(n=>seen.add(n));
    const coordinates=Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180?{lat:p.lat,lon:p.lon}:{};
    places.push({id:`place-${createHash('sha256').update(placeKey(data.city)+'|'+identity).digest('hex').slice(0,16)}`,name:p.name.trim().slice(0,160),area:p.area.slice(0,120),description:p.description.slice(0,700),category:String(p.category||'Culture').slice(0,40),famous:p.famous===true,indoor:p.indoor===true,durationMinutes:Math.max(30,Math.min(180,Number(p.durationMinutes)||90)),visitNote:String(p.visitNote||'Confirm opening hours and access before visiting.').slice(0,500),aliases:names,...coordinates,feeFree:p.feeFree===true,sourceUrl:/^https:\/\//.test(p.sourceUrl||'')?p.sourceUrl:undefined,wikidata:/^Q\d+$/.test(p.wikidata||'')?p.wikidata:undefined});
    if(places.length===80)break;
  }
  return {city:data.city.slice(0,120),country:String(data.country||'').slice(0,80),lat:Number.isFinite(data.lat)&&Math.abs(data.lat)<=90?data.lat:undefined,lon:Number.isFinite(data.lon)&&Math.abs(data.lon)<=180?data.lon:undefined,places};
}
export function inspectItinerary(plan,form,catalog,{targetDay}={}) {
  const errors=[];
  if(!validItinerary(plan,Number(form.days)))return ['Wrong number of days or missing activity fields.'];
  const places=new Map(catalog.places.map(p=>[p.id,p]));
  const used=new Set(),titles=new Set();
  let famousCount=0,total=0;
  for(const day of plan.itinerary){
    const title=placeKey(day.title);
    if(titles.has(title))errors.push(`Day ${day.day}: repeated day title.`);
    titles.add(title);
    let visits=0,previousEnd=0;
    for(const a of day.activities){
      if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(a.time)){errors.push(`Day ${day.day}: invalid time.`);continue;}
      const [h,m]=a.time.split(':').map(Number),start=h*60+m;
      if(!Number.isFinite(a.durationMinutes)||a.durationMinutes<15||a.durationMinutes>360)errors.push(`Day ${day.day}: invalid visit duration.`);
      if(!Number.isFinite(a.travelMinutes)||a.travelMinutes<0||a.travelMinutes>240)errors.push(`Day ${day.day}: invalid travel allowance.`);
      if(start<previousEnd+(a.travelMinutes||0))errors.push(`Day ${day.day}: overlapping activities or missing travel time.`);
      previousEnd=start+(a.durationMinutes||0);
      if(previousEnd>24*60)errors.push(`Day ${day.day}: schedule runs past midnight.`);
      total+=a.cost;
      if(a.kind==='visit'){
        const place=places.get(a.placeId);
        if(!place){errors.push(`Day ${day.day}: place is outside the researched city list.`);continue;}
        if(used.has(a.placeId))errors.push(`Repeated attraction: ${place.name}.`);
        used.add(a.placeId);visits++;if(place.famous)famousCount++;
      }else if(!['meal','break','transport'].includes(a.kind))errors.push('Invalid activity kind.');
      if(typeof a.description!=='string'||!a.description.trim())errors.push(`Day ${day.day}: missing explanation of what to do.`);
    }
    if(visits<Math.min(2,stopsPerDay(form.pace))||visits>stopsPerDay(form.pace)+1)errors.push(`Day ${day.day}: wrong number of distinct sightseeing visits for the pace.`);
  }
  if(total>Number(form.budget)*.6)errors.push('Daily activities, food and local travel consume more than 60% of total budget; leave room for stays and contingency.');
  if(!targetDay&&famousCount<Math.min(3,Number(form.days)*stopsPerDay(form.pace),catalog.places.filter(p=>p.famous).length))errors.push('Include the available signature landmarks across the trip.');
  return [...new Set(errors)];
}
export function enrichItinerary(plan,catalog){
  const lookup=new Map(catalog.places.map(p=>[p.id,p]));
  return plan.itinerary.map(day=>({...day,activities:day.activities.map(a=>{
    const p=lookup.get(a.placeId);
    return {...a,...(a.kind==='visit'&&p?{name:p.name,area:p.area,type:p.category,famous:p.famous,visitNote:p.visitNote}:{}),mapUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p?.name||a.name)+', '+catalog.city+', '+catalog.country)}`};
  })}));
}
