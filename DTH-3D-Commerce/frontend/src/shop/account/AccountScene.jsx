import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ACCOUNT_MOTION as motion } from './motion.config.mjs';

function Bearing({ running, phase, expanded, pointer }) {
  const assembly=useRef(null),rollers=useRef(null),front=useRef(null),back=useRef(null);
  const elapsed=useRef(0),amount=useRef(0),scale=useRef(1);
  const { invalidate }=useThree();
  const separation=expanded?.62:phase==='password'?.02:phase==='register'?.26:phase==='identify'?.14:phase==='working'?.04:.08;
  function apply(value){front.current.position.z=.12+value;back.current.position.z=-.12-value;rollers.current.position.z=value*.3;}
  useEffect(()=>{if(!running){amount.current=separation;apply(separation);}invalidate();},[separation,running,invalidate]);
  useFrame((_,delta)=>{
    if(!running||!assembly.current)return;
    const dt=Math.min(delta,.05);elapsed.current+=dt;
    amount.current=THREE.MathUtils.damp(amount.current,separation,motion.settleSpeed,dt);apply(amount.current);
    const x=phase==='password'?.18:phase==='register'?.31:.36;
    const y=phase==='identify'?-.14:phase==='working'?-.30:-.40;
    assembly.current.rotation.x=THREE.MathUtils.damp(assembly.current.rotation.x,x+pointer.current.y*.11,4,dt);
    assembly.current.rotation.y=THREE.MathUtils.damp(assembly.current.rotation.y,y+pointer.current.x*.28+Math.sin(elapsed.current*.22)*.10,4,dt);
    assembly.current.position.y=Math.sin(elapsed.current*.65)*.035;
    const pulse=phase==='working'?1+Math.sin(elapsed.current*7)*.018:1;
    scale.current=THREE.MathUtils.damp(scale.current,pulse,7,dt);assembly.current.scale.setScalar(scale.current);
    rollers.current.rotation.z+=dt*motion.spinRadiansPerSecond*(phase==='working'?2.35:phase==='password'?.7:1);
  });
  const metal={color:'#cbdde7',metalness:.9,roughness:.22};
  return <group ref={assembly} rotation={[.36,-.4,-.35]}>
    <group ref={front} position={[0,0,.20]}>{[1.32,.64].map(r=><mesh key={r}><torusGeometry args={[r,.095,20,96]}/><meshStandardMaterial {...metal}/></mesh>)}</group>
    <group ref={back} position={[0,0,-.20]}>{[1.32,.64].map(r=><mesh key={r}><torusGeometry args={[r,.095,20,96]}/><meshStandardMaterial {...metal}/></mesh>)}<mesh><torusGeometry args={[1.04,.23,20,96]}/><meshStandardMaterial color="#426983" metalness={.75} roughness={.3}/></mesh></group>
    <group ref={rollers}>{Array.from({length:14},(_,i)=>{const a=i*Math.PI*2/14;return <mesh key={i} position={[1.01*Math.cos(a),1.01*Math.sin(a),.10]}><sphereGeometry args={[.165,20,14]}/><meshStandardMaterial color="#edf5fa" metalness={1} roughness={.16}/></mesh>;})}</group>
    {[1.44,.49].map(r=><mesh key={r}><torusGeometry args={[r,.018,10,96]}/><meshStandardMaterial color="#00bbee" metalness={.35} roughness={.24}/></mesh>)}
  </group>;
}

function LightRig({ running, phase, pointer }) {
  const key=useRef(null),cyan=useRef(null),red=useRef(null),time=useRef(0);
  useFrame((_,delta)=>{
    if(!running)return;const dt=Math.min(delta,.05);time.current+=dt;
    const px=pointer.current.x,py=pointer.current.y;
    key.current.position.x=THREE.MathUtils.damp(key.current.position.x,3+px*1.5,4,dt);
    key.current.position.y=THREE.MathUtils.damp(key.current.position.y,4+py*.8,4,dt);
    cyan.current.position.x=THREE.MathUtils.damp(cyan.current.position.x,-2.4+px*.8,3,dt);
    cyan.current.intensity=THREE.MathUtils.damp(cyan.current.intensity,phase==='identify'?2.2:phase==='working'?2.6:1.45,4,dt);
    red.current.intensity=THREE.MathUtils.damp(red.current.intensity,phase==='error'?2.4:phase==='password'?.7:.28,5,dt);
    red.current.position.y=Math.sin(time.current*.7)*.35-1;
  });
  return <><ambientLight intensity={.28}/><directionalLight ref={key} position={[3,4,5]} intensity={2.1}/>
    <pointLight ref={cyan} color="#00bbee" position={[-2.4,1.4,2.6]} intensity={1.45} distance={8}/>
    <pointLight ref={red} color="#e73445" position={[2.3,-1,2]} intensity={.28} distance={7}/></>;
}

function Studio({ onReady, onFailure, running, phase, pointer }) {
  const { gl,scene,invalidate }=useThree();
  useEffect(()=>{
    const previous=scene.environment;const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(gl),environment=pmrem.fromScene(room,.04);
    room.dispose();pmrem.dispose();scene.environment=environment.texture;
    const lost=e=>{e.preventDefault();onFailure();};gl.domElement.addEventListener('webglcontextlost',lost);invalidate();
    return()=>{gl.domElement.removeEventListener('webglcontextlost',lost);scene.environment=previous;environment.dispose();};
  },[gl,scene,invalidate,onFailure]);
  const reported=useRef(false);useFrame(()=>{if(!reported.current){reported.current=true;onReady();}});
  return <LightRig running={running} phase={phase} pointer={pointer}/>;
}

export default function AccountScene({ running,phase,expanded,pointer,onReady,onFailure }) {
  return <Canvas dpr={[1,Math.min(motion.maxDpr,1.5)]} camera={{position:[0,0,5.1],fov:43}} frameloop={running?'always':'demand'}
    gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={null}
    onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=1;gl.outputColorSpace=THREE.SRGBColorSpace;}}>
    <Studio onReady={onReady} onFailure={onFailure} running={running} phase={phase} pointer={pointer}/>
    <Bearing running={running} phase={phase} expanded={expanded} pointer={pointer}/>
  </Canvas>;
}
