import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {ApiError} from '@google/genai';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import {getWeather} from './services/weatherService.js';
import {serviceStatus} from './config/status.js';

export function errorResponse(err) {
  if(err instanceof ApiError){
    const quota=err.status===429;
    return {status:503,code:quota?'AI_QUOTA_EXCEEDED':'AI_PROVIDER_UNAVAILABLE',message:quota?'AI trip planning is unavailable because the service has reached its usage limit. Please try again later.':'AI trip planning is temporarily unavailable. Please try again later.'};
  }
  return {status:err.status||500,message:err.status?err.message:'Something went wrong. Please try again.'};
}

export function createApp({demo=false,getStatus=()=>serviceStatus({demo})}={}) {
  const app=express();
  if(process.env.TRUST_PROXY_HOPS)app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS));
  app.use(helmet({contentSecurityPolicy:{directives:{
    'img-src':["'self'",'data:','https:'],
    'font-src':["'self'",'https://fonts.gstatic.com'],
    'style-src':["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],
    'connect-src':["'self'",'https://geocoding-api.open-meteo.com','https://api.open-meteo.com'],
    'frame-src':["'self'",'about:','https://www.openstreetmap.org'],
    'upgrade-insecure-requests':process.env.NODE_ENV==='production'?[]:null
  }}}));
  if(process.env.CLIENT_ORIGIN)app.use(cors({origin:process.env.CLIENT_ORIGIN}));
  app.use(express.json({limit:'350kb'}));
  // Liveness keeps the public site reachable while account services are being connected.
  app.get('/api/health',(_req,res)=>res.set('Cache-Control','no-store').json(getStatus()));
  app.get('/api/ready',(_req,res)=>{const status=getStatus();res.set('Cache-Control','no-store').status(status.ready?200:503).json(status);});
  const requireFeature=feature=>(_req,res,next)=>{
    if(getStatus().features[feature])return next();
    res.status(503).set('Retry-After','30').json({code:'SERVICE_NOT_READY',message:feature==='tripPlanning'?'Trip planning is reconnecting. Please check service status and try again later.':'Accounts and saved trips are awaiting activation. Please check service status and try again later.'});
  };
  if(demo){
    app.use(['/api/auth','/api/ai','/api/trips'],(_req,res)=>res.status(503).json({message:'This server runs in demo mode. Connect MongoDB and Gemini to enable accounts and AI.'}));
  }else{
    app.use('/api/auth',requireFeature('accounts'),authRoutes);
    app.use('/api/ai',requireFeature('tripPlanning'),aiRoutes);
    app.use('/api/trips',requireFeature('savedTrips'),tripRoutes);
  }
  app.get('/api/weather',async(req,res)=>{
    if(typeof req.query.destination!=='string'||req.query.destination.length>100)return res.status(400).json({message:'Destination required.'});
    res.json(await getWeather(req.query.destination));
  });
  app.use('/api',(_req,res)=>res.status(404).json({message:'API route not found.'}));
  const webRoot=fileURLToPath(new URL('../client/dist/',import.meta.url));
  if(existsSync(webRoot+'index.html')){
    app.use(express.static(webRoot,{index:false}));
    app.get('/{*path}',(req,res,next)=>{
      // Missing scripts and images must not receive an HTML document.
      if(req.path.startsWith('/assets/')||req.path.startsWith('/images/')||req.path.split('/').pop().includes('.'))return next();
      res.set('Cache-Control','no-cache').sendFile(webRoot+'index.html');
    });
  }
  app.use((_req,res)=>res.status(404).send('TripCraft: page not found.'));
  app.use((err,req,res,next)=>{
    console.error(err.message);
    const {status,...body}=errorResponse(err);
    res.status(status).json(body);
  });
  return app;
}
