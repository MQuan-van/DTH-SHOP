
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as THREE from 'three';

class ModelErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[DTH Shop Card 3D]', error);
    this.props.onError?.();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;

    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const target = generator.fromScene(room, 0.04);

    room.dispose();
    generator.dispose();

    scene.environment = target.texture;
    scene.environmentIntensity = 0.7;

    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      target.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#53616a', 0.65]} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} />
    </>
  );
}

function Model({ url, motion, onReady }) {
  const { scene } = useGLTF(
    url,
    `${import.meta.env.BASE_URL || '/'}decoders/nvx3d/draco/`
  );

  const group = useRef(null);

  const normalized = useMemo(() => {
    const copy = scene.clone(true);
    copy.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(copy);
    if (bounds.isEmpty()) {
      throw new Error('No renderable 3D geometry');
    }

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());

    return {
      object: copy,
      scale: 2.5 / Math.max(size.x, size.y, size.z, 0.01),
      offset: center.multiplyScalar(-1),
    };
  }, [scene]);

  useEffect(() => {
    onReady();
  }, [normalized, onReady]);

  useFrame((_, delta) => {
    if (motion && group.current) {
      group.current.rotation.y += Math.min(delta, 0.05) * 0.4;
    }
  });

  return (
    <group ref={group} scale={normalized.scale}>
      <group position={normalized.offset}>
        <primitive object={normalized.object} dispose={null} />
      </group>
    </group>
  );
}

export default function ShopCardModel3D({ product, motion = true }) {
  const root = useRef(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const markReady = useCallback(() => setReady(true), []);
  const markFailed = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [product.modelUrl]);

  const validUrl =
    typeof product.modelUrl === 'string' &&
    /^\/models\/[a-zA-Z0-9_/-]+\.glb(?:\?v=[a-zA-Z0-9_-]+)?$/.test(
      product.modelUrl
    );

  const render3D = visible && validUrl && !failed;

  return (
    <div
      ref={root}
      className="dth-shop-card-3d"
      role="img"
      aria-label={`${product.name} — 3D model preview`}
    >
      {render3D && (
        <ModelErrorBoundary onError={markFailed}>
          <Canvas
            dpr={1}
            frameloop={motion ? 'always' : 'demand'}
            camera={{
              position: [0, 0, 5.3],
              fov: 36,
              near: 0.1,
              far: 100,
            }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'default',
            }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.NeutralToneMapping;
              gl.toneMappingExposure = 1;
              gl.outputColorSpace = THREE.SRGBColorSpace;
            }}
          >
            <StudioEnvironment />
            <Suspense fallback={null}>
              <Model
                url={product.modelUrl}
                motion={motion}
                onReady={markReady}
              />
            </Suspense>
          </Canvas>
        </ModelErrorBoundary>
      )}

      {(!ready || !visible || failed) && (
        <span className="dth-shop-card-3d-status">
          {failed || !validUrl
            ? '3D preview unavailable'
            : 'Preparing 3D…'}
        </span>
      )}
    </div>
  );
}
