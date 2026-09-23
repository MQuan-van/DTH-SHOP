import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createDirector } from '../frontend/src/experience/motion/story.mjs';
import { createInspectionCommands } from '../frontend/src/experience/world/inspectionCommands.mjs';

function fixture(options = {}) {
  const camera = new PerspectiveCamera(32, 1.4, 0.1, 50);
  camera.position.set(0, 0.3, 10.8);
  const control = new OrbitControls(camera);
  Object.assign(control, { minDistance:4.5, maxDistance:20, minPolarAngle:0.15, maxPolarAngle:Math.PI-0.15, enableDamping:false });
  const target = new Vector3(); control.update();
  const director = createDirector(); director.set({ inspecting:true });
  director.state.pose = { position:[0,0,0], rotation:[0,0,0], scale:1.4 };
  director.state.renderedExplode = 0;
  const command = createInspectionCommands({ camera, control, target, director, ...options });
  const settle = () => { for(let i=0;i<300 && command.isMoving();i++) command.step(1/60); assert.equal(command.isMoving(),false); };
  return { camera, control, target, director, command, settle };
}
const near=(actual,expected,epsilon=1e-5)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} != ${expected}`);

test('Four same-frame rotation presses accumulate rather than collapse to one',()=>{
  const {camera,command,settle}=fixture();for(let i=0;i<4;i++)assert.equal(command('right'),true);
  settle();near(Math.atan2(camera.position.x,camera.position.z),1.2);
});
test('Consecutive zoom buttons accumulate against the queued destination',()=>{
  const {camera,command,settle}=fixture(),start=camera.position.length();
  for(let i=0;i<3;i++)command('in');settle();near(camera.position.length(),start*.88**3);
});
test('Opposite same-frame nudges undo each other',()=>{
  const {camera,command,settle}=fixture(),start=camera.position.clone();
  command('left');command('right');settle();assert.ok(camera.position.distanceTo(start)<1e-5);
});
test('Repeated zoom commands stop at both safe distance limits',()=>{
  const {camera,command,settle}=fixture();for(let i=0;i<80;i++)command('in');settle();near(camera.position.length(),4.5);
  for(let i=0;i<80;i++)command('out');settle();near(camera.position.length(),20);
});
test('A drag cancellation preserves the displayed camera and leaves no queued motion',()=>{
  const {camera,command}=fixture();command('view-rear');command.step(1/60);command.cancel();
  const stopped=camera.position.clone();for(let i=0;i<100;i++)command.step(1/60);
  assert.equal(command.isMoving(),false);assert.ok(camera.position.equals(stopped));
});
test('The most recent named view replaces previous destinations',()=>{
  const {camera,command,settle}=fixture();command('view-rear');command('view-side');settle();
  near(Math.atan2(camera.position.x,camera.position.z),Math.PI/2);
});
test('Top view converges to OrbitControls polar limits without an endless render loop',()=>{
  const {camera,control,command,settle}=fixture();command('view-top');settle();
  near(control.getPolarAngle(),.15);assert.ok(camera.position.toArray().every(Number.isFinite));
});
for(const gate of ['blocked','inactive','story'])test(`Commands cannot move the scene while ${gate}`,()=>{
  const {camera,command,director}=fixture();command('right');
  director.set(gate==='blocked'?{blocked:true}:gate==='inactive'?{active:false}:{inspecting:false});
  const before=camera.position.clone();assert.equal(command('reset'),false);command.step(1/60);
  assert.ok(camera.position.equals(before));assert.equal(command.isMoving(),false);assert.equal(command.capture(),null);
});
test('Reset clears separation, selected part and user relighting atomically',()=>{
  const {camera,command,settle,director}=fixture();director.set({manualExplode:.8,selectedPart:'spring',lightAngle:45});
  command('view-rear');command.step(.02);command('reset');settle();
  assert.equal(director.state.manualExplode,0);assert.equal(director.state.selectedPart,'');assert.equal(director.state.lightAngle,0);
  assert.equal(director.state.resetSerial,1);assert.ok(camera.position.distanceTo(new Vector3(0,.3,10.8))<1e-5);
});
test('Compact reset uses the compact framing',()=>{
  const {camera,command,settle}=fixture({compact:true});command('reset');settle();near(camera.position.z,12);
});
test('Reduced-motion commands reach their destination in one rendered step',()=>{
  const {command,director}=fixture();director.set({motion:false});command('view-rear');command.step(1/60);assert.equal(command.isMoving(),false);
});
test('Capture uses displayed assembly amount, not the in-flight slider target',()=>{
  const {command,director}=fixture();director.set({manualExplode:1});director.state.renderedExplode=.23;
  near(command.capture().explode,.23);
});
test('Captured pose arrays are independent and cannot mutate the running scene',()=>{
  const {command,director}=fixture(),snapshot=command.capture();snapshot.position[0]=99;snapshot.rotation[0]=5;
  assert.equal(director.state.pose.position[0],0);assert.equal(director.state.pose.rotation[0],0);
});
test('Capture is unavailable before an actual model frame has been rendered',()=>{
  const {command,director}=fixture();director.state.renderedExplode=null;assert.equal(command.capture(),null);
});
test('Invalid or inherited command names fail without changing camera state',()=>{
  const {camera,command}=fixture(),before=camera.position.clone();
  for(const value of [null,{},'','view-constructor','view-__proto__','wrongfront'])assert.equal(command(value),false);
  assert.ok(camera.position.equals(before));assert.equal(command.isMoving(),false);
});
test('Explicit owner updates keep the inspection flag in agreement',()=>{
  const d=createDirector();d.set({mode:'inspect'});assert.equal(d.state.inspecting,true);
  d.set({mode:'returning'});assert.equal(d.state.inspecting,false);
  d.set({mode:'story'});assert.equal(d.state.inspecting,false);
  assert.throws(()=>d.set({inspecting:'yes'}));assert.throws(()=>d.set({mode:'unknown'}));
});
