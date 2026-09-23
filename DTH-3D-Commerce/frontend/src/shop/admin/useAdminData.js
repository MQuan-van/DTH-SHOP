import { useEffect, useState } from 'react';
import { studioRequest } from '../api';
export default function useAdminData(path,revision=0){
  const [state,setState]=useState({key:'',value:null,error:''}),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let live=true;studioRequest(path).then(value=>{if(live)setState({key:path,value,error:''});}).catch(e=>{if(live)setState({key:path,value:null,error:e.message});});return()=>{live=false;};},[path,attempt,revision]);
  return {data:state.key===path?state.value:null,error:state.key===path?state.error:'',reload:()=>setAttempt(n=>n+1)};
}
