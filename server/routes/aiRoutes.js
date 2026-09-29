import {Router} from 'express';
import {randomUUID} from 'node:crypto';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/authMiddleware.js';
import {validatePlan,validItinerary} from '../services/validation.js';
import {generate} from '../services/aiService.js';
const r=Router();
r.use(auth,rateLimit({windowMs:60*1000,limit:5}));
r.post('/plan',async(req,res)=>{
  let form;try{form=validatePlan(req.body)}catch(e){return res.status(400).json({message:e.message})}
  res.json({...await generate(form,'Create a varied, city-specific itinerary.'),id:randomUUID(),createdAt:new Date().toISOString()});
});
r.post('/replan',async(req,res)=>{
  const {message,trip}=req.body;
  if(typeof message!=='string'||!message.trim()||message.length>1000)return res.status(400).json({message:'Enter a request up to 1000 characters.'});
  let form;try{form=validatePlan(trip);if(!validItinerary(trip,form.days))throw Error('Invalid itinerary.');}catch(e){return res.status(400).json({message:e.message})}
  const match=message.match(/day\s*(\d+)/i);
  const targetDay=match?Number(match[1]):undefined;
  if(targetDay!==undefined&&(targetDay<1||targetDay>form.days))return res.status(400).json({message:'That day is not in your trip.'});
  res.json({...await generate({...form,itinerary:trip.itinerary},message,{targetDay}),id:trip.id,createdAt:trip.createdAt});
});
export default r;
