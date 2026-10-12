import { frameDistance } from '../inspection.logic.mjs';
import { PRODUCT_VIEW } from '../productDecision.logic.mjs';
import { STUDY, finiteDelta, clamp } from './study.logic.mjs';
const COMMANDS=new Set(['front','side','rear','detail','reset','left','right','in','out']);
const nearest=(angle,previous)=>previous+Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));
/** Camera orbit and look-at are one owner. A bounded target cannot pull the camera into geometry. */
export function createFocusedInspection(initialDistance) {
  let distance=Number.isFinite(initialDistance)&&initialDistance>0?initialDistance:frameDistance(800,600);
  let look=[0,0,0],aim=[0,0,0],moving=false;
  const limits=()=>({min:Math.max(PRODUCT_VIEW.radius*1.55,distance*.57,STUDY.minCameraClearance+Math.max(Math.hypot(...look),Math.hypot(...aim))),max:distance*1.9});
  const home=()=>({theta:.28,phi:Math.PI/2-.08,radius:distance});
  const bound=p=>{const b=limits();return {theta:p.theta,phi:clamp(p.phi,.18,Math.PI-.18),radius:clamp(p.radius,b.min,Math.max(b.min,b.max))};};
  let current=home(),target={...current};
  return {
    read:()=>({...current}),target:()=>({...target}),readTarget:()=>look.slice(),limits,
    get moving(){return moving;},
    sync(pose){
      if(!pose||!['theta','phi','radius'].every(k=>Number.isFinite(pose[k])))return false;
      aim=look.slice();current=bound(pose);target={...current};moving=false;return true;
    },
    reframe(next){
      if(!Number.isFinite(next)||next<=0)return false;
      const ratio=current.radius/distance;distance=next;aim=look.slice();current=bound({...current,radius:next*ratio});target={...current};moving=false;return true;
    },
    cancel(){aim=look.slice();target={...current};moving=false;},
    settle(){look=aim.slice();current=bound(target);target={...current};moving=false;return {...current};},
    command(name,enabled=true){
      if(!enabled||!COMMANDS.has(name))return false;
      const next={...target};
      if(name==='left')next.theta-=.32;
      if(name==='right')next.theta+=.32;
      if(name==='in')next.radius*=.86;
      if(name==='out')next.radius/=.86;
      if(['reset','front','side','rear'].includes(name))aim=[0,0,0];
      if(name==='reset'||name==='front')Object.assign(next,home(),{theta:nearest(home().theta,target.theta)});
      if(name==='side')Object.assign(next,{theta:nearest(Math.PI/2,target.theta),phi:Math.PI/2,radius:distance});
      if(name==='rear')Object.assign(next,{theta:nearest(Math.PI,target.theta),phi:Math.PI/2-.08,radius:distance});
      if(name==='detail')Object.assign(next,{radius:distance*.76,phi:Math.PI/2-.16});
      target=bound(next);moving=true;return true;
    },
    focus(point,enabled=true){
      if(!enabled||!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite)||Math.hypot(...point)>1.36)return false;
      const factor=Math.min(1,STUDY.maxFocusOffset/Math.max(Math.hypot(...point),.00001));aim=point.map(x=>x*factor);
      target=bound({theta:nearest(.28,target.theta),phi:Math.PI/2-.08,radius:distance*.76});
      // Never jump to the target: all coordinates settle on the same frame-time curve.
      moving=true;return true;
    },
    tick(dt,{enabled=true,motion=true,spin=false}={}){
      if(!enabled)return {...current};
      if(!motion)return this.settle();
      const delta=finiteDelta(dt);
      if(moving){
        const alpha=1-Math.exp(-12*delta);
        look=look.map((x,i)=>x+(aim[i]-x)*alpha);
        for(const k of ['theta','phi','radius'])current[k]+=(target[k]-current[k])*alpha;
        // Use the actual target offset here; queued focus need not cause a radius jump.
        current.radius=Math.max(current.radius,STUDY.minCameraClearance+Math.hypot(...look));
        if(['theta','phi','radius'].every(k=>Math.abs(target[k]-current[k])<.0002)&&look.every((x,i)=>Math.abs(aim[i]-x)<.0002))this.settle();
      }else if(spin&&delta>0){current.theta=(current.theta+Math.PI*2*delta/PRODUCT_VIEW.secondsPerTurn)%(Math.PI*2);target={...current};}
      return {...current};
    },
  };
}
