import mongoose from 'mongoose';

export function serviceStatus({demo=false,env=process.env,databaseState=mongoose.connection.readyState}={}) {
  const jwtReady=Boolean(env.JWT_SECRET && env.JWT_SECRET.length>=32 && !env.JWT_SECRET.startsWith('replace-'));
  const database=demo?'disabled':!env.MONGO_URI?'missing':databaseState===1?'connected':databaseState===2?'connecting':'unavailable';
  const ai=demo?'disabled':env.GEMINI_API_KEY?'configured':'missing';
  const accounts=!demo && jwtReady && database==='connected';
  const aiPlanning=accounts && ai==='configured';
  const missing=demo?[]:[...(!env.MONGO_URI?['MONGO_URI']:[]),...(!env.GEMINI_API_KEY?['GEMINI_API_KEY']:[]),...(!jwtReady?['JWT_SECRET']:[])];
  return {
    name:'TripCraft', status:demo?'demo':missing.length?'setup_required':!accounts?'connecting':'ready',
    mode:demo?'demo':'live', ready:aiPlanning,
    services:{database,ai,authentication:jwtReady?'configured':'missing'},
    features:{accounts,savedTrips:accounts,aiPlanning,weather:true}, missing
  };
}
