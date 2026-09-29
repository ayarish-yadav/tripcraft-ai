import React,{createContext,useCallback,useContext,useEffect,useState} from 'react';
import api,{LIVE} from '../services/api';

const Context=createContext({status:null,error:'',checking:false,refresh:()=>{}});
export function BackendStatusProvider({children}) {
  const [status,setStatus]=useState(null),[error,setError]=useState(''),[checking,setChecking]=useState(false);
  const refresh=useCallback(async()=>{
    if(!LIVE)return;
    setChecking(true);
    try{const {data}=await api.get('/health',{timeout:15000});setStatus(data);setError('');}
    catch{setError('We could not reach TripCraft. The server may be waking up. Please try again shortly.');}
    finally{setChecking(false);}
  },[]);
  useEffect(()=>{refresh();if(!LIVE)return;const timer=setInterval(refresh,30000);return()=>clearInterval(timer);},[refresh]);
  return <Context.Provider value={{status,error,checking,refresh}}>{children}</Context.Provider>;
}
export const useBackendStatus=()=>useContext(Context);
