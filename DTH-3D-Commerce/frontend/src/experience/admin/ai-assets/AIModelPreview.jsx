import { Component, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { studioUrl } from '../../../shop/api';

class PreviewError extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">3D preview failed to load. Confirm the GLB is valid and reload this page.</p> : this.props.children; }
}
function Model({ url }) {
  const { scene } = useGLTF(url, `${import.meta.env.BASE_URL || '/'}decoders/nvx3d/draco/`);
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    if (box.isEmpty()) return cloned;
    const size = box.getSize(new THREE.Vector3());
    const middle = box.getCenter(new THREE.Vector3());
    cloned.position.sub(middle);
    const container = new THREE.Group();
    container.scale.setScalar(3 / Math.max(0.01, size.x, size.y, size.z));
    container.add(cloned);
    return container;
  }, [scene]);
  return <primitive object={model} dispose={null} />;
}
export default function AIModelPreview({ jobId }) {
  const url = studioUrl(`/admin/ai-assets/jobs/${encodeURIComponent(jobId)}/model`);
  return <PreviewError><div className="dth-ai-canvas"><Canvas camera={{ position: [4.2, 2.3, 5.2], fov: 40 }} gl={{ antialias: true }} dpr={[1, 1.5]}>
    <color attach="background" args={['#ebf3f7']} />
    <ambientLight intensity={1.6}/><directionalLight position={[5, 8, 5]} intensity={2.5}/><directionalLight position={[-4, 4, -4]} intensity={1.1}/>
    <Suspense fallback={<Html center>Preparing 3D…</Html>}><Model url={url}/></Suspense>
    <OrbitControls makeDefault enableDamping enableZoom enablePan minDistance={2.5} maxDistance={12} />
  </Canvas></div><p className="dth-ai-preview-note">Drag to rotate · Scroll to zoom · Right-drag to pan. This is a draft, not a published NVX model.</p></PreviewError>;
}
