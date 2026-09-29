import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../services/aiService.js';
import {normalizeCatalog,inspectItinerary} from '../services/itineraryQuality.js';
import {researchCity} from '../services/cityResearch.js';
import {sampleTrip} from '../../client/src/services/planner.js';
const form={destination:'Jaipur',days:3,budget:30000,travelers:2,date:'2027-01-01',interests:['Culture'],pace:'Balanced'};
const names=['Amber Fort','Hawa Mahal','City Palace','Jantar Mantar','Albert Hall Museum','Nahargarh Fort'];
const catalog={...normalizeCatalog({city:'Jaipur',country:'India',places:names.map((name,i)=>({name,area:'Jaipur',description:'Test attraction record',famous:true,durationMinutes:90,category:'Culture'}))}),sources:[{title:'Test fixture source',url:'https://example.com/tourism'}]};
function plan(){return {notes:'Test-only estimates.',itinerary:Array.from({length:3},(_,i)=>({day:i+1,title:'District '+(i+1),area:'Jaipur',routeNote:'Test route',activities:[0,1].map(j=>({time:j?'14:00':'09:00',name:names[i*2+j],type:'Culture',kind:'visit',placeId:`place-${i*2+j+1}`,cost:100,description:'Test visit description',durationMinutes:90,travelMinutes:j?30:0}))}))};}
test('quality checks reject duplicates, unknown places, time overlap and overspending',()=>{
 assert.deepEqual(inspectItinerary(plan(),form,catalog),[]);
 for(const alter of [p=>p.itinerary[1].activities[0].placeId='place-1',p=>p.itinerary[0].activities[0].placeId='invented',p=>p.itinerary[0].activities[1].time='09:15',p=>p.itinerary[0].activities[0].cost=30000]){
  const p=plan();alter(p);assert.ok(inspectItinerary(p,form,catalog).length);
 }
});
test('normalizes aliases into one attraction and preserves non-Latin names',()=>{
 const make=(name,aliases=[])=>({name,aliases,area:'city',description:'description'});
 const c=normalizeCatalog({city:'Test',places:[make('Amber Fort',['Amer Fort']),make('Amer Fort'),make('東京タワー'),make('東京タワー')]});
 assert.equal(c.places.length,2);
});
test('AI repairs a duplicated itinerary once, and does not silently use demo',async()=>{
 let calls=0;
 const ai={models:{generateContent:async options=>{calls++;assert.ok(options.config.responseJsonSchema);assert.ok(!("temperature" in options.config));assert.notEqual(options.model,"gemini-2.5-flash");const p=plan();if(calls===1)p.itinerary[1].activities[0].placeId='place-1';return {text:JSON.stringify(p)}}}};
 const result=await generate(form,'Create trip',{ai,research:async()=>catalog});
 assert.equal(calls,2);assert.equal(result.source,'ai');assert.equal(result.cityPlaces.length,6);
 assert.equal(new Set(result.itinerary.flatMap(d=>d.activities.map(a=>a.placeId))).size,6);
});
test('persistent invalid AI output fails after bounded retry',async()=>{
 let calls=0;const ai={models:{generateContent:async()=>{calls++;return {text:'bad JSON'}}}};
 await assert.rejects(()=>generate(form,'Create trip',{ai,research:async()=>catalog}),/failed/);assert.equal(calls,2);
});
test('targeted replan preserves the other days',async()=>{
 const original=plan().itinerary;
 const revised=plan();revised.itinerary[0].title='Unrequested change';revised.itinerary[1].title='Cheaper day';
 const ai={models:{generateContent:async()=>({text:JSON.stringify(revised)})}};
 const result=await generate({...form,itinerary:original},'Make Day 2 cheaper',{ai,research:async()=>catalog,targetDay:2});
 assert.equal(result.itinerary[0].title,original[0].title);
 assert.equal(result.itinerary[1].title,'Cheaper day');
 assert.equal(result.itinerary[2].title,original[2].title);
});
test('research requires search grounding and caches valid city-only results',async()=>{
 let calls=0;
 const ai={models:{generateContent:async options=>{calls++;assert.deepEqual(options.config.tools,[{googleSearch:{}}]);assert.ok(!("temperature" in options.config));return {text:JSON.stringify({city:'Fixture City',country:'Test',places:catalog.places}),candidates:[{groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/fixture',title:'Fixture'}}]}}]}}}};
 const options={...form,destination:'Fixture City - test only'};
 await researchCity(ai,options,{model:'test'});await researchCity(ai,options,{model:'test'});assert.equal(calls,1);
 const ungrounded={models:{generateContent:async()=>({text:'{}'})}};
 await assert.rejects(()=>researchCity(ungrounded,{...form,destination:'No sources fixture'},{model:'test'}),/no web sources/);
});
test('offline samples never wrap place lists or invent city attractions',()=>{
 const p=sampleTrip(form);const names=p.itinerary.flatMap(d=>d.activities.map(a=>a.name));assert.equal(new Set(names).size,names.length);
 assert.throws(()=>sampleTrip({...form,days:4}),/up to 3/);
 assert.throws(()=>sampleTrip({...form,destination:'Tokyo'}),/offline sample/);
});
