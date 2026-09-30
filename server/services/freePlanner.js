import {distance} from './cityResearch.js';
import {stopsPerDay,placeKey,inspectItinerary} from './itineraryQuality.js';

const problem=message=>Object.assign(Error(message),{status:422});
const clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const estimate=km=>km===null?30:Math.max(10,Math.min(180,Math.ceil((km*1.4/18*60+10)/5)*5));
const notes='Free TripCraft planner using public destination guides, without an AI call. Costs are INR planning allowances for your whole party, not ticket prices or live quotes. Confirm admission, opening days and routes; lower allowances do not reduce actual prices. 40% of the budget remains for stays and contingency.';

function selectGroup(pool,count,form,{requiredFamous=0,previous=null}={}){
  const selected=[];
  for(let i=0;i<count;i++){
    const candidates=pool.filter(p=>!selected.some(s=>s.id===p.id));
    const forceFamous=requiredFamous>0&&candidates.some(p=>p.famous);
    const origin=selected.at(-1)||previous;
    const ranked=candidates.filter(p=>!forceFamous||p.famous).map(p=>({p,score:
      (p.famous?5:0)+(form.interests.includes(p.category)?4:0)+(p.feeFree?1:0)
      -(origin?Math.min(60,distance(origin,p)??10)*.8:0)
    })).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name));
    if(!ranked.length)break;
    selected.push(ranked[0].p);if(ranked[0].p.famous)requiredFamous--;
  }
  return selected;
}
function scheduleDay(places,day,form,{rain=false,from=null}={}){
  const daily=Number(form.budget)/Number(form.days);
  const food=Math.floor(daily*.10),transfer=Math.floor(daily*.08),entry=Math.floor(daily*.22/places.length);
  const activities=[];let time=9*60,previous=from;
  const add=(kind,name,type,duration,cost,description,travel=0,place=null)=>{
    time+=travel;activities.push({kind,name,type,time:clock(time),durationMinutes:duration,travelMinutes:travel,cost,description,placeId:place?.id||''});time+=duration;
  };
  for(let i=0;i<places.length;i++){
    const p=places[i],travel=previous?estimate(distance(previous,p)):0;
    if(i===Math.ceil(places.length/2)){
      time=Math.max(time,12*60);
      add('meal','Lunch near '+previous.name,'Food',60,food,'Choose a local café or a simple meal nearby. This is a meal allowance, not a restaurant reservation.');
    }
    add('visit',p.name,p.category,Math.min(p.durationMinutes,form.pace==='Adventure-packed'?90:120),p.feeFree?0:entry,p.description,travel,p);
    previous=p;
  }
  add('transport','Local travel allowance','Transport',30,transfer,'Allow for local buses, metro or a licensed taxi. Compare the linked routes; transfer times are estimates.',0);
  time=Math.max(time,18*60);
  add('meal','Dinner in '+places.at(-1).area,'Food',60,food,'Choose somewhere near your last stop or accommodation; check menus and opening times locally.');
  const areas=[...new Set(places.map(p=>p.area))];
  const longTransfer=(from&&(distance(from,places[0])||0)>20)||places.some((p,i)=>i>0&&(distance(places[i-1],p)||0)>20);
  return {day,title:`${rain?'Indoor discoveries: ':''}${places[0].name} & ${places.at(-1).name}`,area:areas.join(' → '),
    routeNote:`${places.map(p=>p.name).join(' → ')}. ${from?'The first transfer allows for travel from the previous day’s final attraction. ':''}${longTransfer?'This route needs a longer transfer; check road/ferry routes and consider a closer base.':'Stops are grouped using their mapped locations; check the walking or public-transport route.'} Opening times are not live-checked.`,activities};
}

function reviseFree(form,request,catalog,targetDay){
  const cheaper=/\b(cheaper|budget|save money|low.cost)\b/i.test(request);
  const rain=/\b(rain|raining|rainy|indoors?|wet weather)\b/i.test(request);
  const dinner=/\b(dinner|romantic)\b/i.test(request);
  if(!cheaper&&!rain&&!dinner)throw problem('Free Smart Replan supports “Make Day 2 cheaper”, “Plan Day 1 for rain”, and “Add a romantic dinner”. Try one of these requests.');
  const itinerary=structuredClone(form.itinerary);
  const changed=itinerary.filter(d=>!targetDay||d.day===targetDay);
  if(rain){
    const untouched=new Set(itinerary.filter(d=>targetDay&&d.day!==targetDay).flatMap(d=>d.activities.filter(a=>a.kind==='visit').map(a=>placeKey(a.name))));
    const candidates=catalog.places.filter(p=>p.indoor&&!untouched.has(placeKey(p.name)));
    const count=Math.min(stopsPerDay(form.pace),Math.floor(candidates.length/changed.length));
    if(count<2)throw problem('There are not enough distinct indoor attractions in this destination guide for that rainy-day change. Try changing just one day or choose another city. Your existing itinerary is unchanged.');
    const used=new Set();
    for(const d of changed){
      const group=selectGroup(candidates.filter(p=>!used.has(p.id)),count,form);
      group.forEach(p=>used.add(p.id));Object.assign(d,scheduleDay(group,d.day,form,{rain:true}));
    }
  }
  for(const d of changed){
    if(cheaper){
      // Admission prices do not become cheaper by lowering the user's budget.
      for(const a of d.activities)if(['meal','transport'].includes(a.kind)){
        a.cost=Math.floor(a.cost*.65);
        a.description=a.kind==='meal'?'Choose a simple local meal or groceries within this reduced food allowance.':'Use walking where practical and public transport. Confirm distances and fares locally; this reduced allowance is not a fare quote.';
      }
      d.routeNote+=' Lower food and local travel allowances; admission allowances are unchanged.';
    }
    if(dinner){
      const a=[...d.activities].reverse().find(a=>a.kind==='meal');
      if(a){a.name='A relaxed romantic dinner';a.description='Choose a quiet local restaurant near your last stop. Look at menus within this dinner allowance and book directly if needed; no restaurant or reservation is implied.';}
    }
  }
  const errors=inspectItinerary({itinerary},form,catalog,{targetDay:targetDay||true});
  if(errors.length)throw problem('This older trip needs a fresh plan before it can be revised with the free planner. Create a new trip, then try Smart Replan.');
  return {itinerary,notes:notes+(rain?' Indoor alternatives selected at your request; no weather forecast was assumed.':'')};
}

export function planFree(form,request,catalog,{targetDay}={}){
  if(form.itinerary)return reviseFree(form,request,catalog,targetDay);
  const perDay=Math.min(stopsPerDay(form.pace),Math.floor(catalog.places.length/Number(form.days)));
  if(perDay<2)throw problem('There are not enough distinct attractions for this trip length. Choose fewer days.');
  const used=new Set(),itinerary=[];
  let famousNeeded=Math.min(3,Number(form.days)*perDay,catalog.places.filter(p=>p.famous).length),previous=null;
  for(let day=1;day<=Number(form.days);day++){
    const group=selectGroup(catalog.places.filter(p=>!used.has(p.id)),perDay,form,{requiredFamous:Math.max(0,Math.ceil(famousNeeded/(Number(form.days)-day+1))),previous});
    group.forEach(p=>{used.add(p.id);if(p.famous)famousNeeded--;});
    itinerary.push(scheduleDay(group,day,form,{from:previous}));previous=group.at(-1);
  }
  const plan={itinerary,notes};
  const errors=inspectItinerary(plan,form,catalog);
  if(errors.length)throw problem('These attractions are too spread out for this schedule. Choose a shorter trip or a more specific destination.');
  return plan;
}
