import {config} from 'dotenv';
import {fileURLToPath} from 'node:url';
import {createApp} from './app.js';
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import {serviceStatus} from './config/status.js';

config({path:fileURLToPath(new URL('.env',import.meta.url))});
const demo=process.env.DEMO_MODE==='true';
const port=process.env.PORT||5000;
const server=createApp({demo}).listen(port,'0.0.0.0',()=>{
  console.log(`TripCraft listening on port ${port} (${demo?'demo':'live'} mode)`);
  const status=serviceStatus({demo});
  if(status.missing.length)console.warn(`Setup required: ${status.missing.join(', ')}. Account and AI features stay disabled until ready.`);
});
let retryTimer,stopping=false;
async function connectWithRetry(){
  try{await connectDB();console.log('MongoDB connected.');}
  catch{
    console.warn('MongoDB is unavailable; retrying in 30 seconds.');
    if(!stopping)retryTimer=setTimeout(connectWithRetry,30000);
  }
}
mongoose.connection.on('error',()=>console.warn('MongoDB connection is unavailable.'));
if(!demo && process.env.MONGO_URI)void connectWithRetry();
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{
  stopping=true;clearTimeout(retryTimer);
  const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();
  server.close(async()=>{await mongoose.disconnect();clearTimeout(deadline);process.exit(0);});
});
