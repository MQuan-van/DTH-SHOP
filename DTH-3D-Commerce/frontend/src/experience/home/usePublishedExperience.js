import { useEffect, useState } from 'react';
import { MODE, studioRequest } from '../../shop/api';
import { DEFAULT_EXPERIENCE, validateExperience } from '../../../../shared/experience.mjs';
/** No credentials in URLs. Drafts are never requested by the storefront. */
export function usePublishedExperience() {
  const [result,setResult]=useState({config:DEFAULT_EXPERIENCE,loading:MODE==='api',source:'bundled',version:0});
  useEffect(()=>{
    if(MODE!=='api')return;
    let live=true;const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    studioRequest('/experience/home',{signal:controller.signal}).then(response=>{
      const config=response.data?validateExperience(response.data.config):DEFAULT_EXPERIENCE;
      if(live)setResult({config,loading:false,source:response.source,version:response.data?.version||0,binding:response.data?.binding});
    }).catch(()=>{if(live)setResult({config:DEFAULT_EXPERIENCE,loading:false,source:'bundled-unavailable',version:0});})
      .finally(()=>clearTimeout(timer));
    return()=>{live=false;clearTimeout(timer);controller.abort();};
  },[]);
  return result;
}
