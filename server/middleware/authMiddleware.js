import jwt from 'jsonwebtoken';
export default function auth(req,res,next){try{const token=req.headers.authorization?.split(' ')[1];req.userId=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']}).sub;next();}catch{return res.status(401).json({message:'Please sign in again.'})}}
