import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SLOTS233,slot233,emptyProfile233,validateProfile233,resolveSlot233,pickSlot233,isClick233,focusPose233,journey233,mixPose233,posePosition233,layout233,visibleCache233} from '../frontend/src/experience/hotspots233/hotspots233.logic.mjs';
const spec={id:'yamaha-nvx-v2',file:'models/nvx/nvx-v2.glb',rotation:[0,0,0]},hash='a'.repeat(64);
const a=()=>({point:[.5,1,.4],normal:[1,0,0],pose:{target:[.5,1,.4],radius:2.2,phi:1.2,theta:.8},pickRadius:.18,viewAspect:1.6,confirmed:true});
const profile=()=>({...emptyProfile233(spec,hash),anchors:{'suspension-rear':a()}});
const bounds={min:[-2,0,-1],max:[2,2,1]};
test('Slots have unique stable IDs and five existing catalogue categories',()=>{assert.equal(new Set(SLOTS233.map(x=>x.id)).size,SLOTS233.length);assert.deepEqual([...new Set(SLOTS233.map(x=>x.category))].sort(),['brakes','exhausts','mirrors','suspension','wheels']);});
test('Empty profile contains no fabricated anchors',()=>assert.deepEqual(emptyProfile233(spec,hash).anchors,{}));
test('Validated profile is independent of caller mutations',()=>{const p=profile(),v=validateProfile233(p,spec,hash,{bounds});p.anchors['suspension-rear'].point[0]=7;assert.equal(v.anchors['suspension-rear'].point[0],.5);});
test('V1 migrates without inventing a front/rear mechanical label',()=>{const p={...emptyProfile233(spec,hash),schemaVersion:1,anchors:{wheels:a()}};const v=validateProfile233(p,spec,hash);assert.equal(v.schemaVersion,2);assert.equal(slot233(Object.keys(v.anchors)[0]).label,'Wheels');});
const invalid=[
 ['wrong hash',p=>p.sha256='b'.repeat(64)],['wrong ID',p=>p.vehicleId='yamaha-nvx-v3'],['wrong path',p=>p.assetFile='models/nvx/other.glb'],
 ['wrong orientation',p=>p.rotation[1]=1],['wrong coordinate space',p=>p.coordinateSpace='raw'],['unknown schema',p=>p.schemaVersion=9],
 ['unconfirmed point',p=>p.anchors['suspension-rear'].confirmed=false],['point NaN',p=>p.anchors['suspension-rear'].point[0]=NaN],
 ['point out of bounds',p=>p.anchors['suspension-rear'].point[0]=4],['zero normal',p=>p.anchors['suspension-rear'].normal=[0,0,0]],
 ['invalid target',p=>p.anchors['suspension-rear'].pose.target=[0,Infinity,0]],['negative radius',p=>p.anchors['suspension-rear'].pose.radius=-1],
 ['too near radius',p=>p.anchors['suspension-rear'].pose.radius=.01],['unbounded radius',p=>p.anchors['suspension-rear'].pose.radius=41],
 ['invalid polar angle',p=>p.anchors['suspension-rear'].pose.phi=0],['string radius',p=>p.anchors['suspension-rear'].pose.radius='2'],
 ['oversize hit region',p=>p.anchors['suspension-rear'].pickRadius=1],['negative hit region',p=>p.anchors['suspension-rear'].pickRadius=-.2],
 ['invalid aspect',p=>p.anchors['suspension-rear'].viewAspect=0],['unknown hotspot ID',p=>{p.anchors.engine=a();}],
 ['array anchors',p=>p.anchors=[]],['missing pose',p=>delete p.anchors['suspension-rear'].pose],
];
for(const [name,mutate]of invalid)test('Profile rejects '+name,()=>{const p=profile();mutate(p);assert.throws(()=>validateProfile233(p,spec,hash,{bounds}));});
test('Normals are normalized without editing the asset',()=>{const p=profile();p.anchors['suspension-rear'].normal=[1.2,0,0];assert.deepEqual(validateProfile233(p,spec,hash).anchors['suspension-rear'].normal,[1,0,0]);});
test('Front/rear wheels resolve independently with the same category',()=>{const p={...profile(),anchors:{'wheels-front':a(),'wheels-rear':a()}};assert.equal(resolveSlot233(p,'wheels'),'wheels-front');assert.equal(resolveSlot233(p,'wheels','wheels-rear'),'wheels-rear');assert.equal(resolveSlot233(p,'brakes'),'');});
test('A visible real surface hit selects its authored neighbourhood',()=>assert.equal(pickSlot233([.52,1,.4],profile(),['suspension-rear']),'suspension-rear'));
test('A body click outside authored regions selects nothing',()=>assert.equal(pickSlot233([-1,1,0],profile(),['suspension-rear']),null));
test('An occluded anchor is not selectable through the body',()=>assert.equal(pickSlot233([.5,1,.4],profile(),[]),null));
test('Ambiguous overlap does not silently pick one part',()=>{const p={...profile(),anchors:{'wheels-front':a(),'brakes-front':a()}};assert.equal(pickSlot233([.51,1,.4],p,['wheels-front','brakes-front']),null);});
const down={id:7,x:100,y:100,time:1000,primary:true,button:0};
test('Short primary tap is a click',()=>assert.equal(isClick233(down,{...down,time:1100,x:103}),true));
for(const [name,change]of [['drag',{x:110}],['long press',{time:2000}],['other pointer',{id:8}],['secondary touch',{primary:false}],['time reversed',{time:999}]])test('Picking ignores '+name,()=>assert.equal(isClick233(down,{...down,time:1100,...change}),false));
test('Narrow viewport increases focus distance, not magnification',()=>{const p=a();assert.ok(focusPose233(p,.6).radius>p.pose.radius);assert.equal(focusPose233(p,2).radius,p.pose.radius);});
test('Transition angle follows the short route over 2π',()=>{const p=a().pose,from={...p,theta:Math.PI-.1},to={...p,theta:-Math.PI+.1};const mid=mixPose233(from,to,.5);assert.ok(Math.abs(mid.theta-Math.PI)<1e-9);});
test('Quintic interpolation preserves start/end target and radius',()=>{const x=a().pose,y={...x,target:[0,1,0],radius:5};assert.deepEqual(mixPose233(x,y,0),x);assert.deepEqual(mixPose233(x,y,1),y);});
test('Guided journey retreats, orbits outside bounds, then approaches',()=>{const from={...a().pose,target:[0,1,0],radius:6},to=a().pose,legs=journey233(from,to,bounds);assert.equal(legs.length,3);assert.ok(legs[1].to.radius>Math.hypot(4,2,2)/2);assert.deepEqual(legs[2].to,to);assert.ok(legs.every(x=>posePosition233(x.to).every(Number.isFinite)));});
test('Projection cache rejects stale or far-away camera samples',()=>{const s={visible:true,camera:[0,0,5],time:100};assert.equal(visibleCache233(s,[0,0,5],200),true);assert.equal(visibleCache233(s,[0,0,6],200),false);assert.equal(visibleCache233(s,[0,0,5],1000),false);assert.equal(visibleCache233(s,[0,0,5],50),false);assert.equal(visibleCache233({visible:true},[0,0,5],200),false);});
const points=SLOTS233.slice(0,9).map((s,i)=>({id:s.id,x:100+i*30,y:120+(i%3)*10,visible:true}));
for(const [w,h]of [[320,320],[390,440],[720,560],[1280,720],[1920,900]])test(`Labels fit ${w}x${h} without overlap`,()=>{
 const source=points.map(p=>Object.freeze({...p,x:Math.min(w-10,p.x)}));const layout=layout233(source,w,h);
 for(const p of layout){assert.ok(p.labelX>=0&&p.labelX+p.labelWidth<=w);assert.ok(p.labelY>=56&&p.labelY<=h-100);assert.ok(!p.path.includes('NaN'));}
 for(const side of ['left','right']){const items=layout.filter(p=>p.side===side).sort((a,b)=>a.labelY-b.labelY);for(let i=1;i<items.length;i++)assert.ok(items[i].labelY-items[i-1].labelY>=44);}
});
test('Narrow layout limits floating labels but not profile contents',()=>{assert.ok(layout233(points,390,440).length<=3);assert.equal(points.length,9);});
test('Selected point is the only prominent callout',()=>{assert.deepEqual(layout233(points,1000,650,{active:points[2].id}).map(p=>p.id),[points[2].id]);});
test('Side hysteresis avoids label flipping around the centre',()=>{const p={id:'wheels-front',x:510,y:200,visible:true};assert.equal(layout233([p],1000,650,{previousSides:{'wheels-front':'left'}})[0].side,'left');});
test('Offscreen and hidden points are excluded',()=>assert.deepEqual(layout233([{id:'wheels-front',x:-1,y:200,visible:true},{id:'wheels-rear',x:100,y:200,visible:false}],1000,600),[]));
test('Engine preserves original materials and one renderer',()=>{const s=fs.readFileSync(new URL('../frontend/src/experience/hotspots233/createHotspotStage233.mjs',import.meta.url),'utf8');assert.equal((s.match(/new THREE.WebGLRenderer/g)||[]).length,1);assert.doesNotMatch(s,/\.material\.(?:color|metalness|roughness)\s*=/);assert.match(s,/controls\.enableZoom=false/);assert.match(s,/controller\?\.abort/);assert.match(s,/profile\.anchors/);});
test('UI keeps the existing stage contract, no commerce/auth writes',()=>{const s=fs.readFileSync(new URL('../frontend/src/experience/hotspots233/VehicleStage233.jsx',import.meta.url),'utf8');assert.match(s,/spec,system='',onSystem,apiRef,author=false/);assert.doesNotMatch(s,/onPin\(|authenticate\(|studioRequest\(|\/api\//);assert.doesNotMatch(s,/Pause motion|Browse the edit/);assert.match(s,/context\.revert\(\)/);});
