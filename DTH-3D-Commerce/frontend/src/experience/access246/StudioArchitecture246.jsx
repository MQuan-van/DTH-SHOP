import { CAMERA245 } from '../access245/camera245.logic.mjs';

/** Owned studio architecture, never a product/fitment object. R3F disposes these JSX resources. */
export default function StudioArchitecture246({ fit }) {
  const radius = Math.max(.1, fit.camera.radius);
  const front = fit.camera.presets.front;
  const yaw = Math.atan2(front.position[0] - front.target[0], front.position[2] - front.target[2]) + CAMERA245.studyArc;
  const floorY = fit.heightRange[0] - radius * .2;
  return <group name="DTH studio light architecture" rotation={[0, yaw, 0]}>
    {/* Physical planes stay behind the normalized asset envelope for all authored camera arcs. */}
    <mesh position={[-radius * 1.68, radius * .1, -radius * 1.65]} rotation={[0, .08, -.27]} scale={[radius * .22, radius * 4.7, radius * .08]}>
      <boxGeometry args={[1, 1, 1]}/>
      <meshStandardMaterial color="#0a2643" metalness={.52} roughness={.42}/>
    </mesh>
    <mesh position={[-radius * 1.58, radius * .1, -radius * 1.60]} rotation={[0, .08, -.27]} scale={[radius * .018, radius * 4.66, radius * .018]}>
      <boxGeometry args={[1, 1, 1]}/>
      <meshBasicMaterial color="#7bbcff" transparent opacity={.74} toneMapped={false}/>
    </mesh>
    <mesh position={[-radius * 1.58, radius * .1, -radius * 1.615]} rotation={[0, .08, -.27]} scale={[radius * .11, radius * 4.66, radius * .012]}>
      <boxGeometry args={[1, 1, 1]}/>
      <meshBasicMaterial color="#287cff" transparent opacity={.09} depthWrite={false} toneMapped={false}/>
    </mesh>
    <mesh position={[radius * 1.72, radius * .24, -radius * 1.88]} rotation={[0, -.18, -.27]} scale={[radius * .48, radius * 5, radius * .07]}>
      <boxGeometry args={[1, 1, 1]}/>
      <meshStandardMaterial color="#102f53" metalness={.64} roughness={.36}/>
    </mesh>
    <mesh position={[radius * 1.51, radius * .19, -radius * 1.82]} rotation={[0, -.18, -.27]} scale={[radius * .014, radius * 4.95, radius * .014]}>
      <boxGeometry args={[1, 1, 1]}/>
      <meshBasicMaterial color="#4d9cff" transparent opacity={.52} toneMapped={false}/>
    </mesh>
    {/* DOM floor fade supplies the broad floor; this low line only marks spatial depth. */}
    <mesh position={[0, floorY + .002, -radius * 1.6]} rotation={[-Math.PI / 2, 0, -.27]}>
      <planeGeometry args={[radius * 6.5, radius * .012]}/>
      <meshBasicMaterial color="#4b91d5" transparent opacity={.13} depthWrite={false} toneMapped={false}/>
    </mesh>
  </group>;
}
