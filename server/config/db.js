import mongoose from 'mongoose';
export default async function connectDB(){
  if(!process.env.MONGO_URI)throw new Error('Set MONGO_URI in server/.env');
  await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:10000,maxPoolSize:10,bufferCommands:false});
}
