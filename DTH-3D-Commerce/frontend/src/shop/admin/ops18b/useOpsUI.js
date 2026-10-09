import {useEffect,useRef,useState} from 'react';
import {UI_KEY} from './opsPro.logic.mjs';
function initial() { try { const x=JSON.parse(sessionStorage.getItem(UI_KEY)||'{}');return {motion:x.motion!==false,focus:!!x.focus}; } catch {return {motion:true,focus:false};} }
export default function useOpsUI() {
  const [prefs,setPrefs]=useState(initial),[reduced,setReduced]=useState(false),[compact,setCompact]=useState(false);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 900px)');
    const sync=()=>{setReduced(media.matches);setCompact(mobile.matches);};sync();
    media.addEventListener('change',sync);mobile.addEventListener('change',sync);
    return()=>{media.removeEventListener('change',sync);mobile.removeEventListener('change',sync);};
  },[]);
  function update(next){setPrefs(p=>{const value={...p,...next};try{sessionStorage.setItem(UI_KEY,JSON.stringify(value));}catch{}return value;});}
  return {motion:prefs.motion&&!reduced,reduced,compact,focus:prefs.focus,setMotion:v=>update({motion:v}),setFocus:v=>update({focus:v})};
}
/** Animate only once on arrival. Text and hit targets stay stable afterwards. */
export function useOpsEntrance(root,motion) {
  useEffect(()=>{
    if(!motion||!root.current)return;
    const nodes=[...root.current.querySelectorAll('[data-pro-enter]')];
    const animations=nodes.map((el,i)=>{try{return el.animate([{opacity:0,transform:'translate3d(0,12px,0)'},{opacity:1,transform:'none'}],{duration:450,delay:Math.min(i,5)*35,easing:'cubic-bezier(.16,1,.3,1)'});}catch{return null;}});
    return()=>animations.forEach(a=>a?.cancel());
  },[motion,root]);
}
/** Keep the last valid result visible while refreshing; never keep another identity's data. */
export function useResource(path,revision,request,identity) {
  const [state,setState]=useState({key:'',identity:null,data:null,error:'',busy:true}),[retry,setRetry]=useState(0);
  const serial=useRef(0);
  useEffect(()=>{
    let live=true; const token=++serial.current;
    setState(s=>({key:path,identity,data:s.key===path&&s.identity===identity?s.data:null,error:'',busy:true}));
    const timer=setTimeout(()=>request(path).then(data=>{if(live&&token===serial.current)setState({key:path,identity,data,error:'',busy:false});})
      .catch(e=>{if(live&&token===serial.current)setState(s=>({...s,error:e.message||'Could not load this panel.',busy:false}));}),80);
    return()=>{live=false;clearTimeout(timer);};
  },[path,revision,request,identity,retry]);
  const same=state.key===path&&state.identity===identity;
  return {data:same?state.data:null,error:same?state.error:'',busy:same?state.busy:true,reload:()=>setRetry(x=>x+1)};
}
