import mongoose from 'mongoose';
export default mongoose.model('User',new mongoose.Schema({name:{type:String,required:true,maxLength:80},email:{type:String,required:true,unique:true,lowercase:true},password:{type:String,required:true,select:false}},{timestamps:true}));
