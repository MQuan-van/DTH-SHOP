import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { createOrbitStepper } from '../frontend/src/experience/world/orbitTransition.mjs';
test('Front-to-rear named views remain outside the model radius',()=>{
  const step=createOrbitStepper(),position=new Vector3(0,0,8),target=new Vector3(),next=new Vector3(0,0,-8);
  for(let i=0;i<160;i++){step(position,target,next,new Vector3(),.1);assert.ok(position.distanceTo(target)>=7.999);assert.ok(position.toArray().every(Number.isFinite));}
  assert.ok(position.distanceTo(next)<.001);
});
test('Named-view interpolation supports interruption and a moving target',()=>{
  const step=createOrbitStepper(),position=new Vector3(0,0,8),target=new Vector3();
  step(position,target,new Vector3(8,0,0),new Vector3(),.4);
  const nextTarget=new Vector3(1,.2,0),nextPosition=new Vector3(1,.5,10.8);
  for(let i=0;i<160;i++){step(position,target,nextPosition,nextTarget,.1);assert.ok(position.distanceTo(target)>=4.5);}
  assert.ok(position.distanceTo(nextPosition)<.001);assert.ok(target.distanceTo(nextTarget)<.001);
});
