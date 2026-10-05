import { PRODUCT_VIEW } from '../productDecision.logic.mjs';
import { automaticCamera, validateCameraPose } from './profileTransform.mjs';
import { finiteDelta, clamp } from '../advanced/study.logic.mjs';
const names=new Set(['front','side','rear','detail','reset','left','right','in','out']);
const nearest=(a,b)=>b+Math.atan2(Math.sin(a-b),Math.cos(a-b));
const norm=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
const clone=v=>v.slice();
/** One owner for orbit, profile presets and hotspot focus; never lerp through the model centre. */
export function createProfileInspection(initialDistance) {
  let config=automaticCamera(),distance=Number.isFinite(initialDistance)&&initialDistance>0?initialDistance:config.referenceDistance;
  let look=clone(config.center),aim=clone(look),moving=false;
  const clearance=()=>config.radius*(2.05/1.35);
  const limits=()=>({min:Math.max(config.radius*1.55,distance*.57,clearance()+Math.max(norm(look,config.center),norm(aim,config.center))),max:distance*1.9});
  const bound=p=>{const b=limits();return {theta:p.theta,phi:clamp(p.phi,.18,Math.PI-.18),radius:clamp(p.radius,b.min,Math.max(b.min,b.max))};};
  function convert(pose,theta=0){const d=pose.position.map((v,i)=>v-pose.target[i]),r=Math.hypot(...d);return {theta:nearest(Math.atan2(d[0],d[2]),theta),phi:Math.acos(clamp(d[1]/r,-1,1)),radius:r*distance/config.referenceDistance};}
  let current=bound(convert(config.presets.front)),target={...current};
  function destination(pose){aim=clone(pose.target);target=bound(convert(pose,target.theta));moving=true;}
  return {
    read:()=>({...current}),target:()=>({...target}),readTarget:()=>clone(look),limits,
    get moving(){return moving;},
    configure(next){
      if(!next||!Number.isFinite(next.radius)||next.radius<=0||!Number.isFinite(next.referenceDistance)||next.referenceDistance<=0)return false;
      try{for(const n of ['front','side','rear','detail'])validateCameraPose(next.presets[n],next);}catch{return false;}
      // Copy all data so caller changes cannot move a running camera.
      config={radius:next.radius,center:clone(next.center),referenceDistance:next.referenceDistance,presets:Object.fromEntries(Object.entries(next.presets).map(([k,p])=>[k,{position:clone(p.position),target:clone(p.target)}]))};
      distance=next.referenceDistance;look=clone(config.presets.front.target);aim=clone(look);current=bound(convert(config.presets.front));target={...current};moving=false;return true;
    },
    sync(p){if(!p||!['theta','phi','radius'].every(k=>Number.isFinite(p[k])))return false;aim=clone(look);current=bound(p);target={...current};moving=false;return true;},
    reframe(next){if(!Number.isFinite(next)||next<=0)return false;const ratio=current.radius/distance;distance=next;aim=clone(look);current=bound({...current,radius:next*ratio});target={...current};moving=false;return true;},
    cancel(){aim=clone(look);target={...current};moving=false;},
    settle(){look=clone(aim);current=bound(target);target={...current};moving=false;return {...current};},
    command(name,enabled=true){
      if(!enabled||!names.has(name))return false;
      const preset=name==='reset'?'front':name;
      if(Object.hasOwn(config.presets,preset)){destination(config.presets[preset]);return true;}
      const next={...target};if(name==='left')next.theta-=.32;if(name==='right')next.theta+=.32;if(name==='in')next.radius*=.86;if(name==='out')next.radius/=.86;
      target=bound(next);moving=true;return true;
    },
    focus(point,enabled=true,pose=null){
      if(!enabled||!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite)||norm(point,config.center)>config.radius*1.025)return false;
      if(pose){try{validateCameraPose(pose,{...config});}catch{return false;}destination(pose);return true;}
      const vector=point.map((n,i)=>n-config.center[i]),factor=Math.min(1,(config.radius*.65)/Math.max(Math.hypot(...vector),.000001));
      aim=vector.map((n,i)=>config.center[i]+n*factor);
      target=bound({theta:nearest(.28,target.theta),phi:Math.PI/2-.08,radius:distance*.76});moving=true;return true;
    },
    tick(dt,{enabled=true,motion=true,spin=false}={}){
      if(!enabled)return {...current};if(!motion)return this.settle();const delta=finiteDelta(dt);
      if(moving){const alpha=1-Math.exp(-12*delta);look=look.map((x,i)=>x+(aim[i]-x)*alpha);for(const k of ['theta','phi','radius'])current[k]+=(target[k]-current[k])*alpha;
        current.radius=Math.max(current.radius,clearance()+norm(look,config.center));
        if(['theta','phi','radius'].every(k=>Math.abs(target[k]-current[k])<.0002)&&look.every((x,i)=>Math.abs(aim[i]-x)<.0002))this.settle();
      }else if(spin&&delta>0){current.theta=(current.theta+Math.PI*2*delta/PRODUCT_VIEW.secondsPerTurn)%(Math.PI*2);target={...current};}
      return {...current};
    },
  };
}
