import test from 'node:test';
import assert from 'node:assert/strict';
import {ApiError} from '@google/genai';
import {generate} from '../services/aiService.js';
import {planFree} from '../services/freePlanner.js';
import {parseGuide,researchCity,resolveDestination,parseOpenMap} from '../services/cityResearch.js';
import {normalizeCatalog,inspectItinerary,enrichItinerary} from '../services/itineraryQuality.js';

const form={destination:'Fixture City, India',date:'2027-01-01',days:3,budget:30000,travelers:2,pace:'Balanced',interests:['Culture']};
const catalog=normalizeCatalog({city:'Fixture City',country:'India',lat:26.9,lon:75.8,
 places:Array.from({length:20},(_,i)=>({name:`Fixture ${i<7?'Museum':'Garden'} ${i}`,area:i<10?'Old town':'Riverside',description:`Original test description for place ${i}.`,
  lat:26.9+i*.003,lon:75.8+i*.002,indoor:i<7,famous:i>=7&&i<11,category:i<7?'Culture':'Nature',feeFree:i>=14,durationMinutes:90}))});

test('free planning covers every day with unique places, map routes, budget and pace validation',()=>{
 for(const pace of ['Relaxed','Balanced','Adventure-packed']){
  const f={...form,pace},p=planFree(f,'Create trip',catalog);
  assert.deepEqual(inspectItinerary(p,f,catalog),[]);
  const visits=p.itinerary.flatMap(d=>d.activities.filter(a=>a.kind==='visit'));
  assert.equal(new Set(visits.map(a=>a.placeId)).size,visits.length);
  assert.equal(p.itinerary.length,form.days);
  assert.match(p.notes,/without an AI call/);
 }
 const one={...form,days:1,pace:'Relaxed'};
 assert.deepEqual(inspectItinerary(planFree(one,'',catalog),one,catalog),[]);
 assert.throws(()=>planFree({...form,days:14},'',catalog),/not enough/);
});

test('quota, missing model and persistent invalid AI output return a real free plan, without paid search',async()=>{
 for(const status of [429,404,403]){
  let calls=0;
  const ai={models:{generateContent:async options=>{calls++;assert.equal(options.config.tools,undefined);throw new ApiError({status,message:'Test provider failure'});}}};
  const p=await generate(form,'Create trip',{ai,research:async()=>catalog});
  assert.equal(calls,1);assert.equal(p.source,'free');assert.equal(p.plannerVersion,3);
  assert.deepEqual(inspectItinerary(p,form,catalog),[]);
 }
});

test('free is the default even if an API key exists',async()=>{
 const oldKey=process.env.GEMINI_API_KEY,oldEnabled=process.env.GEMINI_ENABLED,oldFetch=globalThis.fetch;
 let calls=0;
 try{
  process.env.GEMINI_API_KEY='test-key-never-sent';delete process.env.GEMINI_ENABLED;
  globalThis.fetch=async()=>{calls++;throw Error('Unexpected external call');};
  const p=await generate(form,'Create trip',{research:async()=>catalog});
  assert.equal(p.source,'free');assert.equal(calls,0);
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
  if(oldEnabled===undefined)delete process.env.GEMINI_ENABLED;else process.env.GEMINI_ENABLED=oldEnabled;
 }
});

test('rain, cheaper-day and dinner replans preserve all unrequested days',()=>{
 const first=planFree(form,'Create trip',catalog);
 const original={...form,itinerary:enrichItinerary(first,catalog)};
 const sum=day=>day.activities.reduce((n,a)=>n+a.cost,0);
 for(const request of ['Plan Day 2 for rain','Make Day 2 cheaper','Add a romantic dinner on Day 2']){
  const p=planFree(original,request,catalog,{targetDay:2});
  assert.deepEqual(p.itinerary[0],original.itinerary[0]);assert.deepEqual(p.itinerary[2],original.itinerary[2]);
  if(request.includes('rain'))assert.ok(p.itinerary[1].activities.filter(a=>a.kind==='visit').every(a=>catalog.places.find(c=>c.id===a.placeId).indoor));
  if(request.includes('cheaper')){
   assert.ok(sum(p.itinerary[1])<sum(original.itinerary[1]));
   assert.deepEqual(p.itinerary[1].activities.filter(a=>a.kind==='visit'),original.itinerary[1].activities.filter(a=>a.kind==='visit'));
  }
  if(request.includes('dinner'))assert.ok(p.itinerary[1].activities.some(a=>a.name==='A relaxed romantic dinner'));
 }
 assert.throws(()=>planFree(original,'Book flights for me',catalog),/Free Smart Replan supports/);
 const outdoors={...catalog,places:catalog.places.map(p=>({...p,indoor:false}))};
 assert.throws(()=>planFree(original,'Plan Day 2 for rain',outdoors,{targetDay:2}),/not enough distinct indoor/);
 assert.deepEqual(original.itinerary,enrichItinerary(first,catalog));
});

const guideText=Array.from({length:10},(_,i)=>`{{see\n|name=Fixture Museum ${i}|lat=${26.9+i*.002}|long=75.8|wikidata=Q${100+i}\n|content=Explore [[Local art|the collection]] and {{small|nested text}}. An original test guide description.\n|price=Free\n}}`).join('\n');
const guide={title:'Cache Fixture City',coordinates:[{lat:26.9,lon:75.8,primary:true}],revisions:[{slots:{main:{content:guideText}}}]};

test('public guide parsing respects nested markup, geographic boundaries and attribution; cached research needs no key',async()=>{
 const location={city:guide.title,country:'India',lat:26.9,lon:75.8,radius:30};
 const parsed=parseGuide(guide,location);
 assert.equal(parsed.length,10);assert.match(parsed[0].description,/the collection/);assert.ok(!parsed[0].description.includes('{{'));
 assert.equal(parsed[0].indoor,true);assert.equal(parsed[0].feeFree,true);
 assert.equal(parseGuide(guide,{...location,lat:50}).length,0);
 let calls=0;
 const getJSON=async url=>{
  calls++;
  if(url.startsWith('https://geocoding-api.open-meteo.com/'))return {results:[{name:guide.title,country:'India',country_code:'IN',latitude:26.9,longitude:75.8}]};
  assert.ok(url.startsWith('https://en.wikivoyage.org/'));return {query:{pages:[guide]}};
 };
 const f={...form,destination:guide.title,days:2};
 const a=await researchCity(null,f,{getJSON}),b=await researchCity(null,f,{getJSON});
 assert.equal(calls,2);assert.equal(a.places.length,10);assert.deepEqual(a,b);
 assert.ok(a.sources.some(s=>s.url.includes('creativecommons.org')));
 a.places[0].name='Changed only in this response';assert.notEqual(a.places[0].name,b.places[0].name);
});

test('country qualifiers are respected and mapped places deduplicate across aliases and map features',async()=>{
 const getJSON=async()=>({results:[{name:'Paris',country:'France',country_code:'FR',latitude:48.8,longitude:2.3},{name:'Paris',country:'United States',country_code:'US',admin1:'Texas',latitude:33.66,longitude:-95.55}]});
 assert.equal((await resolveDestination('Paris, Texas',{getJSON})).countryCode,'US');
 await assert.rejects(()=>resolveDestination('Paris, India',{getJSON}),/could not locate/);
 const location={city:'Test',lat:26.9,lon:75.8,radius:30};
 const nodes=[{type:'node',id:1,lat:26.9,lon:75.8,tags:{name:'Museum',tourism:'museum',wikidata:'Q123'}},{type:'way',id:2,center:{lat:26.9,lon:75.8},tags:{name:'Other name',tourism:'museum',wikidata:'Q123'}},{type:'node',id:3,lat:26.9,lon:75.8,tags:{name:'Private place',tourism:'museum',access:'private'}}];
 const a=normalizeCatalog({...location,places:parseOpenMap({elements:nodes},location)});
 assert.equal(a.places.length,1);
 const b=normalizeCatalog({...location,places:parseOpenMap({elements:[nodes[1]]},location)});
 assert.equal(a.places[0].id,b.places[0].id);
});

test('destination lookup fails over on outages while preserving country and state qualifiers',async()=>{
 const photon={features:[{properties:{name:'Paris',country:'France',countrycode:'FR',type:'city'},geometry:{coordinates:[2.35,48.85]}},{properties:{name:'Paris',country:'United States',countrycode:'US',state:'Texas',type:'city'},geometry:{coordinates:[-95.55,33.66]}}]};
 const getJSON=async url=>{if(url.includes('open-meteo'))throw Error('timeout');return photon;};
 assert.equal((await resolveDestination('Paris, Texas, USA',{getJSON})).countryCode,'US');
 assert.equal((await resolveDestination('Paris, France',{getJSON})).countryCode,'FR');
 await assert.rejects(resolveDestination('Paris, India',{getJSON}),e=>e.status===422);
 await assert.rejects(resolveDestination('Tokyo',{getJSON:async()=>{throw Error('offline');}}),e=>e.status===503);
 await assert.rejects(resolveDestination('Missing',{getJSON:async()=>({features:[{properties:{name:'Missing',type:'city'},geometry:{coordinates:[999,999]}}]})}),e=>e.status===422);
});

test('a complete itinerary survives geocoder, guide and Overpass outages using sourced Photon places',async()=>{
 const {parsePhotonPlaces}=await import('../services/cityResearch.js');
 const features=Array.from({length:12},(_,i)=>({properties:{name:`Fallback Museum ${i}`,osm_type:'N',osm_id:9000+i,osm_key:'tourism',osm_value:'museum'},geometry:{coordinates:[75.8+i*.003,26.9+i*.003]}}));
 const getJSON=async url=>{
  if(url.includes('/api/?'))return {features:[{properties:{name:'Fallback City',country:'India',countrycode:'IN',type:'city'},geometry:{coordinates:[75.8,26.9]}}]};
  if(url.includes('/reverse?'))return {features};
  throw Error('Provider offline');
 };
 const f={...form,destination:'Fallback City, India'};
 const c=await researchCity(null,f,{getJSON});
 assert.equal(c.places.length,12);
 assert.ok(c.places.every(p=>p.sourceUrl.startsWith('https://www.openstreetmap.org/node/')));
 assert.ok(c.sources.some(s=>s.url==='https://www.openstreetmap.org/copyright'));
 assert.deepEqual(inspectItinerary(planFree(f,'',c),f,c),[]);
 const location={lat:26.9,lon:75.8,radius:30,city:'Fallback City'};
 assert.equal(parsePhotonPlaces({features:[...features,{...features[0],properties:{...features[0].properties,osm_value:'hotel'}},{...features[0],geometry:{coordinates:[0,0]}}]},location).length,12);
});


test('a same-named remote locality does not outrank the destination city',async()=>{
 const data={features:[{properties:{name:'Cusco',country:'Peru',type:'locality'},geometry:{coordinates:[-79.78,-4.58]}},{properties:{name:'Distrito de Cusco',country:'Peru',type:'city'},geometry:{coordinates:[-71.97,-13.50]}}]};
 const p=await resolveDestination('Cusco, Peru',{getJSON:async url=>{if(url.includes('open-meteo'))throw Error('offline');return data;}});
 assert.equal(p.city,'Distrito de Cusco');assert.equal(p.lat,-13.50);
});
