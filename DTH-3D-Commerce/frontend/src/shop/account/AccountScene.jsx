import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
function Bearing({ running }) {
  const assembly = useRef(null), rollers = useRef(null), elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!running) return;
    elapsed.current += Math.min(delta, .05);
    assembly.current.rotation.y = -.4 + Math.sin(elapsed.current * .22) * .3;
    assembly.current.position.y = Math.sin(elapsed.current * .7) * .055;
    rollers.current.rotation.z += Math.min(delta, .05) * .16;
  });
  const metal = { color: '#cbdde7', metalness: .9, roughness: .22 };
  return <group ref={assembly} rotation={[.38,-.4,-.35]}>
    {[[-.12,1.32,.095], [.12,1.32,.095],[-.08,.64,.105],[.08,.64,.105]].map(([z,r,t],i)=><mesh key={i} position={[0,0,z]}><torusGeometry args={[r,t,24,96]}/><meshStandardMaterial {...metal}/></mesh>)}
    <mesh position={[0,0,-.10]}><torusGeometry args={[1.04,.23,24,96]}/><meshStandardMaterial color="#547a94" metalness={.7} roughness={.28}/></mesh>
    <group ref={rollers}>{Array.from({length:14},(_,i)=>{const angle=i*Math.PI*2/14;return <mesh key={i} position={[1.01*Math.cos(angle),1.01*Math.sin(angle),.10]}><sphereGeometry args={[.165,24,16]}/><meshStandardMaterial color="#edf5fa" metalness={1} roughness={.16}/></mesh>;})}</group>
    {[1.44,.49].map((r,i)=><mesh key={r} position={[0,0,i*.2]}><torusGeometry args={[r,.022,12,96]}/><meshStandardMaterial color="#00bbee" metalness={.35} roughness={.24}/></mesh>)}
  </group>;
}
function Studio({ onReady, onFailure }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(gl), environment = pmrem.fromScene(room, .04);
    room.dispose(); pmrem.dispose(); scene.environment = environment.texture;
    const lost = e => { e.preventDefault(); onFailure(); };
    gl.domElement.addEventListener('webglcontextlost', lost); invalidate();
    return () => { gl.domElement.removeEventListener('webglcontextlost', lost); scene.environment = null; environment.dispose(); };
  }, [gl, scene, invalidate]);
  const reported = useRef(false);
  useFrame(() => { if (!reported.current) { reported.current = true; onReady(); } });
  return <><ambientLight intensity={.35}/><directionalLight position={[3,4,5]} intensity={2}/></>;
}
export default function AccountScene({ running, onReady, onFailure }) {
  return <Canvas dpr={[1,1.4]} camera={{position:[0,0,4.7],fov:42}} frameloop={running?'always':'demand'} gl={{alpha:true,antialias:true,powerPreference:'low-power'}} fallback={null} onCreated={({gl})=>{gl.toneMapping=THREE.NeutralToneMapping;gl.toneMappingExposure=1;}}><Studio onReady={onReady} onFailure={onFailure}/><Bearing running={running}/></Canvas>;
}
