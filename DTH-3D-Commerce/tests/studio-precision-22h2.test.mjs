import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES22H2, catalog22H2, playable22H2, choose22H2, gallery22H2, bindProduct22H2, matching22H2, garageSpec22H2,
  fullDistance22H2, overview22H2, focus22H2, clearance22H2, position22H2, distance22H2, interpolate22H2, createCamera22H2, createSignal22H2, direction22H2 } from '../frontend/src/experience/studio22h2/studio22h2.logic.mjs';
const b = { center: [0.1, -0.2, 0.05], radius: 1.35 };
const front = { position: [2, 1, 6], target: [0, 0, 0] };
const make = (id, extra = {}) => ({ id, slug: id, name: id, category: 'suspension', modelUrl: '/models/dth-demo/'+id+'.glb', vehicleIds:['yamaha-nvx-v3'], ...extra });
const source = name => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../frontend/src/experience/studio22h2/', name), 'utf8');
const settle = m => { for (let i=0;i<180;i++) m.tick(1/120); return m.read(); };
const finite = s => [...s.position,...s.target,s.distance,s.yaw,s.pitch].every(Number.isFinite);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit = v => {const l=Math.hypot(...v);return v.map(x=>x/l);};
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
function visible(point, pose, width, height, fov=36) {
 const pos=position22H2(pose),forward=unit(pose.target.map((x,i)=>x-pos[i])),right=unit(cross(forward,[0,1,0])),up=cross(right,forward);
 const delta=point.map((x,i)=>x-pos[i]),z=dot(delta,forward),t=Math.tan(fov*Math.PI/360);
 return z>0 && Math.abs(dot(delta,right)/(z*t*width/height))<=1+1e-8 && Math.abs(dot(delta,up)/(z*t))<=1+1e-8;
}
test('catalog preserves source records and excludes inactive/unsafe/duplicate records',()=>{const a=[make('a'),make('a'),make('b',{active:false}),make('c',{slug:'https://bad'}),make('d',{category:'invented'})];const before=JSON.stringify(a);assert.deepEqual(catalog22H2(a).map(p=>p.id),['a']);assert.equal(JSON.stringify(a),before);});
test('playable accepts real local model paths only',()=>{assert.equal(playable22H2([make('a'),make('b',{modelUrl:'https://elsewhere/m.glb'})]).length,1);});
test('hero selection uses requested then published config, without fabricating a product',()=>{const a=[make('a'),make('b',{featured:true})];assert.equal(choose22H2(a,'a','b').id,'a');assert.equal(choose22H2(a,'none','b').id,'b');assert.equal(choose22H2([]),null);});
test('gallery prioritises other featured products and never repeats current',()=>{const a=[make('a',{featured:true}),make('b'),make('c',{featured:true})];assert.deepEqual(gallery22H2(a,'a').map(p=>p.id),['c','b','a']);});
test('binding retargets saved presentation only in a view copy',()=>{const p=make('a');p.presentation3d={settings:{assetUrl:p.modelUrl}};const original=JSON.stringify(p);const copy=bindProduct22H2(p,{modelUrl:p.modelUrl,sha256:'a'.repeat(64)});assert.match(copy.modelUrl,/\?v=/);assert.equal(copy.presentation3d.settings.assetUrl,copy.modelUrl);assert.equal(JSON.stringify(p),original);});
test('invalid hashes do not change model identity',()=>{const p=make('a');assert.equal(bindProduct22H2(p,{modelUrl:p.modelUrl,sha256:'bad'}),p);});
test('unknown vehicle never produces compatibility claims',()=>{assert.equal(matching22H2([make('a')],'missing',[]).count,null);});
test('counts come from active recorded mappings',()=>{const v=[{id:'yamaha-nvx-v3'}];const r=matching22H2([make('a'),make('b',{active:false}),make('c',{vehicleIds:[]})],v[0].id,v);assert.equal(r.count,1);assert.equal(r.categories.find(c=>c.id==='suspension').count,1);});
test('V1 absence never borrows V3 asset',()=>{const r=garageSpec22H2({id:'yamaha-nvx-v1',model:'NVX V1'},{'yamaha-nvx-v3':{file:'models/nvx/nvx-v3.glb'}});assert.equal(r.file,null);assert.equal(r.label,'NVX V1');});
test('garage selects same-version local and approved published files',()=>{const v={id:'yamaha-nvx-v3',model:'NVX V3'};assert.equal(garageSpec22H2(v,{[v.id]:{file:'models/nvx/nvx-v3.glb'}}).file,'models/nvx/nvx-v3.glb');assert.equal(garageSpec22H2(v,{}, {[v.id]:{file:'https://bad/x.glb'}}).file,null);});
for(const [w,h] of [[320,600],[390,430],[720,390],[760,800],[980,600],[1440,900],[2560,1080]])test(`full view has complete sphere containment ${w}x${h}`,()=>{
 const pose=overview22H2(b,w,h,front);
 for(let i=0;i<64;i++)for(let j=0;j<=32;j++){
  const u=i*Math.PI/32,v=j*Math.PI/32,p=[b.center[0]+b.radius*Math.cos(u)*Math.sin(v),b.center[1]+b.radius*Math.cos(v),b.center[2]+b.radius*Math.sin(u)*Math.sin(v)];
  assert.ok(visible(p,pose,w,h),`clipped ${p}`);
 }
});
test('non-finite bounds are rejected instead of corrupting projection',()=>{for(const n of [0,-1,Infinity,NaN])assert.throws(()=>fullDistance22H2(1,n,700));assert.throws(()=>fullDistance22H2(1,800,600,130));});
test('focus targets the actual selected point, not only camera distance',()=>{const p=[b.center[0]+.6,b.center[1]+.3,b.center[2]+.5],base=overview22H2(b,1000,700,front),f=focus22H2(p,base,b,1000,700);assert.deepEqual(f.target,p);assert.notDeepEqual(f.target,base.target);assert.ok(f.distance<base.distance);assert.ok(distance22H2(position22H2(f),b.center)>b.radius);assert.ok(visible(p,f,1000,700));});
test('out-of-bounds detail points are rejected',()=>{assert.throws(()=>focus22H2([99,0,0],overview22H2(b,800,600,front),b,800,600));});
test('off-centre focus transitions never fly through the model sphere',()=>{
 const a=overview22H2(b,1000,650,front),target=b.center.map((v,i)=>v+([.9,.4,.5][i]));const z=focus22H2(target,a,b,1000,650);
 for(let i=0;i<=300;i++)assert.ok(distance22H2(position22H2(interpolate22H2(a,z,i/300,b)),b.center)>=b.radius*1.07999);
});
test('180 degree camera transition stays outside the hull throughout',()=>{const a=overview22H2(b,800,700,front),z={...a,yaw:a.yaw+Math.PI};for(let i=0;i<=200;i++)assert.ok(distance22H2(position22H2(interpolate22H2(a,z,i/200,b)),b.center)>b.radius);});
test('shortest yaw interpolation crosses the angle seam correctly',()=>{const a=overview22H2(b,800,600,front);a.yaw=179*Math.PI/180;const z={...a,yaw:-179*Math.PI/180};const mid=interpolate22H2(a,z,.5,b);assert.ok(Math.abs(Math.abs(mid.yaw)-Math.PI)<1e-9);});
test('automatic rotation is the initial state',()=>{const m=createCamera22H2(b,800,600,front),before=m.read().yaw;m.tick(1/60);assert.equal(m.read().mode,'overview');assert.ok(m.read().yaw>before);});
test('auto rotation independent of 30/60/120 Hz',()=>{const values=[30,60,120].map(fps=>{const m=createCamera22H2(b,800,600,front);for(let i=0;i<fps*5;i++)m.tick(1/fps);return m.read().yaw;});assert.ok(Math.max(...values)-Math.min(...values)<1e-10);});
test('background/input gates freeze the pose without reset',()=>{const m=createCamera22H2(b,800,600,front);m.tick(.016);const before=m.read();m.tick(20,false);assert.deepEqual(m.read(),before);});
test('reduced motion produces an immediate usable still view',()=>{const m=createCamera22H2(b,800,600,front,{reduced:true});const before=m.read();m.tick(1);assert.deepEqual(m.read(),before);m.mode('pick');m.focus(b.center);assert.equal(m.read().moving,false);});
test('entering free orbit preserves the current automatic angle',()=>{const m=createCamera22H2(b,800,600,front);for(let i=0;i<100;i++)m.tick(.016);const before=m.read();m.mode('orbit');assert.deepEqual(m.read().position,before.position);assert.equal(m.read().moving,false);});
test('manual orbit owns the camera until exit',()=>{const m=createCamera22H2(b,800,600,front);m.mode('orbit');m.absorb([4,2,5],[0,0,0]);const before=m.read();m.tick(.05);assert.deepEqual(m.read(),before);m.mode('overview');settle(m);assert.equal(m.read().mode,'overview');assert.deepEqual(m.read().target,b.center);});
test('detail mode ignores idle spin',()=>{const m=createCamera22H2(b,800,600,front);m.mode('pick');m.focus(b.center);settle(m);const p=m.read();m.tick(.05);assert.deepEqual(m.read(),p);});
test('reset after manual inspection returns full fit and auto orbit',()=>{const m=createCamera22H2(b,1000,600,front);m.mode('orbit');m.zoom(.3);settle(m);m.mode('overview');settle(m);assert.ok(m.read().distance>=fullDistance22H2(b.radius,1000,600)-1e-9);const y=m.read().yaw;m.tick(.03);assert.ok(m.read().yaw>y);});
test('rapid mode changes are last-action-wins, not queued tweens',()=>{const m=createCamera22H2(b,1000,650,front);for(let i=0;i<50;i++){m.mode('pick');m.focus(b.center);m.tick(.03);m.mode('orbit');m.rotate(.5);m.mode('overview');}const r=settle(m);assert.equal(r.mode,'overview');assert.ok(finite(r));assert.deepEqual(r.target,b.center);});
for(const mode of ['overview','pick','orbit'])test(`resize reframes without changing mode: ${mode}`,()=>{const m=createCamera22H2(b,1500,700,front);m.mode(mode);if(mode==='pick')m.focus(b.center);settle(m);m.resize(350,650);const s=m.read();assert.equal(s.mode,mode);assert.ok(finite(s));assert.ok(distance22H2(s.position,b.center)>b.radius);if(mode==='overview')assert.ok(s.distance>=fullDistance22H2(b.radius,350,650));});
test('zoom is clamped against complete-model hull even in detail',()=>{const m=createCamera22H2(b,1000,650,front);m.mode('pick');m.focus(b.center.map((v,i)=>v+([.7,0,.8][i])));settle(m);for(let i=0;i<80;i++){m.zoom(.1);settle(m);}assert.ok(distance22H2(m.read().position,b.center)>=b.radius*1.0799);});
test('invalid commands cannot corrupt the camera',()=>{const m=createCamera22H2(b,800,600,front);assert.equal(m.mode('rear'),false);m.mode('orbit');for(const n of [0,-1,NaN,Infinity])assert.equal(m.zoom(n),false);assert.equal(m.rotate(NaN),false);assert.ok(finite(m.read()));});
test('signal cleanup and duplicate values are stable',()=>{const s=createSignal22H2();let n=0;const off=s.subscribe(()=>n++);s.set({mode:'overview'});s.set({blocked:true});s.set({blocked:true});assert.equal(n,1);off();assert.equal(s.listenerCount,0);});
test('source has no global pause/browse or meaningless rear rail',()=>{const s=source('StudioAtelier22H2.jsx');assert.doesNotMatch(s,/Pause motion|Browse the edit|setMotion\(false\)|\['front',\s*'detail',\s*'rear'\]/);});
test('canvas geometry is not changed between Inspect modes',()=>{const css=source('studio22h2.css');assert.doesNotMatch(css,/data-mode[^\n]*\{[^}]*\b(?:left|right|width|height)\s*:/);});
test('raycast uses explicit pointer-up and only mesh targets',()=>{const s=source('ProductStage22H2.jsx');assert.match(s,/addEventListener\('pointerup'/);assert.match(s,/intersectObjects\(meshes\.current, false\)/);assert.doesNotMatch(s,/addEventListener\('pointermove'/);});
test('inspection preserves native wheel and no pan',()=>{const s=source('ProductStage22H2.jsx');assert.match(s,/controls.enableZoom = false/);assert.match(s,/controls.enablePan = false/);assert.doesNotMatch(s,/addEventListener\('wheel'/);});
test('scene reads existing profiled asset and never replaces its material',()=>{const s=source('ProductStage22H2.jsx');assert.match(s,/useProfiledModel/);assert.match(s,/dispose=\{null\}/);assert.doesNotMatch(s,/\.material\s*=|\.color\.set|\.geometry\s*=/);});
test('header and footer changes are route-scoped and preserve shell logic',()=>{const css=source('studio22h2.css');assert.match(css,/html\[data-dth-precision="true"\] \.dth-navigation/);assert.match(source('useStudioEffects22H2.js'),/removeAttribute\('data-dth-precision'\)/);});
test('garage reuses the real NVX loader and does not substitute a product for a vehicle',()=>{const s=source('Garage22H2.jsx');assert.match(s,/createNVXStage/);assert.match(s,/usePublishedNVXModels/);assert.doesNotMatch(s,/useProfiledModel/);assert.match(s,/3D model not supplied/);});
test('renderer lease returns null for nonvisible sections',()=>{assert.match(source('useStudioEffects22H2.js'),/Math\.max\(h, g\) < 50 \? null/);});
test('scope maintains actual vehicle selection and existing cart/account handlers',()=>{const s=source('StudioAtelier22H2.jsx');assert.match(s,/setVehicle=\{store.setVehicle\}/);assert.doesNotMatch(s,/setBag|fetch\(|localStorage\.clear|document\.body\.style/);});
test('published vehicle URL cannot substitute another NVX version',()=>{const id='yamaha-nvx-v1';const file='api/shop/ai-assets/models/v3.glb?rev=01234567-0123-0123-0123-0123456789ab';assert.equal(garageSpec22H2({id,model:'NVX V1'}, {}, {[id]:{file}}).file,null);});
test('same-version approved manifest is accepted',()=>{const id='yamaha-nvx-v2';const file='api/shop/ai-assets/models/v2.glb?rev=01234567-0123-0123-0123-0123456789ab';assert.equal(garageSpec22H2({id,model:'NVX V2'}, {}, {[id]:{file}}).file,file);});
test('product selection does not key and recreate the complete Canvas',()=>{assert.doesNotMatch(source('StudioAtelier22H2.jsx'),/<ProductStage22H2\s+key=/);assert.match(source('ProductStage22H2.jsx'),/<Body22H2 key=\{key\}/);});
test('header enhancement only positions a decorative indicator',()=>{const s=source('useStudioEffects22H2.js');assert.match(s,/data-precision-nav/);assert.doesNotMatch(s,/innerHTML\s*=|replaceChildren|preventDefault\(/);assert.match(s,/removeEventListener\('focusin'/);});
