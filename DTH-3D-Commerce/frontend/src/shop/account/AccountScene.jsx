import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ACCOUNT_MOTION as motion } from './motion.config.mjs';
function Bearing({ running, phase, expanded, pointer }) {
  const assembly = useRef(null), rollers = useRef(null), front = useRef(null), back = useRef(null);
  const elapsed = useRef(0), amount = useRef(0);
  const { invalidate } = useThree();
  const separation = expanded ? .62 : phase === 'password' ? .02 : phase === 'register' ? .26 : phase === 'vehicle' ? .18 : .08;
  function apply(value) { front.current.position.z = .12 + value; back.current.position.z = -.12 - value; rollers.current.position.z = value * .3; }
  useEffect(() => { if (!running) { amount.current = separation; apply(separation); } invalidate(); }, [separation, running, invalidate]);
  useFrame((_, delta) => {
    if (!running || !assembly.current) return;
    const dt = Math.min(delta, .05); elapsed.current += dt;
    amount.current = THREE.MathUtils.damp(amount.current, separation, motion.settleSpeed, dt); apply(amount.current);
    const x = phase === 'password' ? .2 : .36, y = phase === 'identify' ? -.16 : -.40;
    assembly.current.rotation.x = THREE.MathUtils.damp(assembly.current.rotation.x, x + pointer.current.y * .1, 4, dt);
    assembly.current.rotation.y = THREE.MathUtils.damp(assembly.current.rotation.y, y + pointer.current.x * .26 + Math.sin(elapsed.current * .22) * .10, 4, dt);
    assembly.current.position.y = Math.sin(elapsed.current * .65) * .035;
    rollers.current.rotation.z += dt * motion.spinRadiansPerSecond * (phase === 'working' ? 2 : 1);
  });
  const metal = { color: '#cbdde7', metalness: .9, roughness: .22 };
  return <group ref={assembly} rotation={[.36,-.4,-.35]}>
    <group ref={front} position={[0,0,.20]}>{[1.32,.64].map(r => <mesh key={r}><torusGeometry args={[r,.095,20,96]}/><meshStandardMaterial {...metal}/></mesh>)}</group>
    <group ref={back} position={[0,0,-.20]}>{[1.32,.64].map(r => <mesh key={r}><torusGeometry args={[r,.095,20,96]}/><meshStandardMaterial {...metal}/></mesh>)}<mesh><torusGeometry args={[1.04,.23,20,96]}/><meshStandardMaterial color="#426983" metalness={.75} roughness={.3}/></mesh></group>
    <group ref={rollers}>{Array.from({length:14},(_,i)=>{const a=i*Math.PI*2/14;return <mesh key={i} position={[1.01*Math.cos(a),1.01*Math.sin(a),.10]}><sphereGeometry args={[.165,20,14]}/><meshStandardMaterial color="#edf5fa" metalness={1} roughness={.16}/></mesh>;})}</group>
    {[1.44,.49].map(r=><mesh key={r}><torusGeometry args={[r,.018,10,96]}/><meshStandardMaterial color="#00bbee" metalness={.35} roughness={.24}/></mesh>)}
  </group>;
}
function Studio({ onReady, onFailure }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const previous = scene.environment;
    const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(gl), environment = pmrem.fromScene(room,.04);
    room.dispose(); pmrem.dispose(); scene.environment = environment.texture;
    const lost = e => { e.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost',lost); invalidate();
    return () => { gl.domElement.removeEventListener('webglcontextlost',lost); scene.environment=previous; environment.dispose(); };
  },[gl,scene,invalidate,onFailure]);
  const reported = useRef(false);
  useFrame(()=>{if(!reported.current){reported.current=true;onReady();}});
  return <><ambientLight intensity={.35}/><directionalLight position={[3,4,5]} intensity={2}/></>;
}
export default function AccountScene({ running, phase, expanded, pointer, onReady, onFailure }) {
  return <Canvas dpr={[1,motion.maxDpr]} camera={{position:[0,0,5.1],fov:43}} frameloop={running?'always':'demand'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={null}
    onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=1;gl.outputColorSpace=THREE.SRGBColorSpace;}}>
    <Studio onReady={onReady} onFailure={onFailure}/><Bearing running={running} phase={phase} expanded={expanded} pointer={pointer}/>
  </Canvas>;
}
