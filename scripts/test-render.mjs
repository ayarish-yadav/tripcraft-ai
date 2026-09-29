import {build} from 'esbuild';
import {mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const output=resolve('node_modules/.cache/tripcraft-render-check.mjs');
mkdirSync(resolve('node_modules/.cache'),{recursive:true});
await build({stdin:{contents:`
import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {AuthProvider} from './client/src/context/AuthContext.jsx';
import App from './client/src/App.jsx';
import {sampleTrip} from './client/src/services/planner.js';
const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
globalThis.sessionStorage=globalThis.localStorage;
globalThis.window={history:{state:null}};
const trip=sampleTrip({destination:'Jaipur',date:'2027-01-01',days:3,budget:25000,travelers:2,interests:['Culture'],pace:'Balanced'});
saved.set('tripcraft_current',JSON.stringify(trip));
for(const route of ['/','/plan','/trips','/login','/signup','/status','/profile','/trip/'+trip.id]){
 globalThis.location={search:'',pathname:route};
 const html=renderToString(React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(AuthProvider,null,React.createElement(App))));
 if(!html.includes('TripCraft')||html.length<1000)throw Error('Empty render: '+route);
 console.log('Rendered '+route);
}
`,resolveDir:process.cwd(),sourcefile:'render-check.jsx',loader:'jsx'},outfile:output,bundle:true,platform:'node',format:'esm',packages:'external',define:{'import.meta.env.VITE_API_URL':'""','import.meta.env.VITE_DEMO_MODE':'"true"'}});
try{await import(pathToFileURL(output).href)}finally{rmSync(output,{force:true})}
