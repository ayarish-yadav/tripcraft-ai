import mongoose from 'mongoose';
export default mongoose.model('Trip',new mongoose.Schema({id:{type:String,required:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},data:{type:mongoose.Schema.Types.Mixed,required:true}},{timestamps:true}).index({user:1,id:1},{unique:true}));
