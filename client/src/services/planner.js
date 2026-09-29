export const destinations=[
{name:'Bali',country:'INDONESIA',tag:'Nature & serenity',image:'/images/bali.jpg',lat:-8.5069,lon:115.2625,activities:['Tegalalang rice terraces','Ubud village and local cafés','Sacred Monkey Forest','Campuhan Ridge Walk','Ubud Art Market','Tirta Empul temple'],indoor:'Agung Rai Museum of Art'},
{name:'Jaipur',country:'INDIA',tag:'Culture & colour',image:'/images/jaipur.jpg',lat:26.9124,lon:75.7873,activities:['Amber Fort','Hawa Mahal exterior and old city walk','City Palace','Jantar Mantar','Johari Bazaar','Nahargarh Fort'],indoor:'Albert Hall Museum'},
{name:'Dolomites',country:'ITALY',tag:'Adventure awaits',image:'/images/dolomites.jpg',lat:46.698,lon:12.085,activities:['Lago di Braies lakeside walk','Dobbiaco village','Lago di Dobbiaco','Cortina town centre','Val di Funes viewpoints','San Candido village'],indoor:'A local museum or café'}];
// Offline preview is intentionally finite. It never cycles attractions or invents a city.
export function sampleTrip(form) {
  const destination=destinations.find(d=>d.name.toLowerCase()===form.destination.trim().toLowerCase());
  if(!destination)throw Error('This is an offline sample. Choose Jaipur, Bali or Dolomites, or connect the AI backend to plan your selected city.');
  if(Number(form.days)>3)throw Error('The offline sample supports up to 3 distinct days. Live AI researches more attractions for longer trips.');
  const budget=Number(form.budget)/Number(form.days);
  const itinerary=Array.from({length:Number(form.days)},(_,i)=>({day:i+1,title:[`Signature sights of ${destination.name}`,'Neighbourhoods, history and local life','Markets, viewpoints and a last discovery'][i],area:destination.name,routeNote:'Offline example. Check actual travel times before visiting.',activities:[0,1].map((j)=>{
    const name=destination.activities[i*2+j];
    return {time:j===0?'09:30':'15:00',name,placeId:`demo-${i*2+j+1}`,kind:'visit',type:form.interests?.includes('Nature')?'Explore':'Culture',cost:Math.round(budget*.12),durationMinutes:120,travelMinutes:j===0?0:60,description:`Explore ${name} and leave time to look around at your own pace. This is a sample stop, not live AI research.`,famous:true,mapUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+', '+destination.name)}`};
  })}));
  return {...form,id:crypto.randomUUID(),createdAt:new Date().toISOString(),source:'demo',lat:destination.lat,lon:destination.lon,image:destination.image,itinerary,plannerVersion:2,notes:'Offline sample: each attraction is used once. Dates, travel times and prices are not verified. Connect the full backend for city research and personalized AI routes.'};
}
export function demoReplan(trip,message){
 const next=structuredClone(trip),match=message.match(/day\s*(\d+)/i);
 const selected=match?Number(match[1]):null;
 if(selected!==null&&(selected<1||selected>trip.itinerary.length))throw Error('That day is not in this itinerary.');
 if(!/cheap|budget|romantic|dinner/i.test(message))throw Error('This request needs the live AI backend to research suitable alternatives. The offline preview will not replace every stop with the same activity.');
 for(const day of next.itinerary){
  if(selected!==null&&selected!==day.day)continue;
  if(/cheap|budget/i.test(message))day.activities=day.activities.map(a=>({...a,cost:Math.round(a.cost*.65)}));
  else day.activities.push({time:'19:30',name:`Dinner together in ${trip.destination} — Day ${day.day}`,kind:'meal',type:'Food',description:'Choose a local restaurant; availability and menu prices are not checked in this sample.',cost:Math.round(Number(trip.budget)/trip.days*.1),durationMinutes:90,travelMinutes:30});
 }
 next.notes='Offline replan changes illustrative allocations only, not actual entry prices. Live AI is required to research new stops.';
 return next;
}
