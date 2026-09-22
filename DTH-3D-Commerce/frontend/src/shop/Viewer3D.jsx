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
import * as THREE from 'three';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import ProductImage from './catalog/components/ProductImage';

// Chỉ điều khiển trang chi tiết, không thay cấu hình Home.
const DETAIL_VIEW = {
  exposure: 1,
  environmentIntensity: 0.65,

  autoSpeed: -3,
  dragSpeed: 1.7,
  zoomSpeed: 1.1,

  radius: 1.3,
  fov: 38,
  timeoutMs: 20000,
};

const DEMO_RGB = [
  [215, 245, 92],
  [165, 174, 183],
  [37, 43, 51],
  [22, 25, 29],
  [232, 124, 70],
  [125, 176, 203],
  [200, 187, 165],
  [125, 163, 177],
];

function originalDemoColor(url, color, hasMap) {
  const demoPath =
    /^\/models\/dth-demo\/(apex|vector|touring|studio)-(suspension|wheels|exhausts|mirrors|brakes)\.glb$/;

  if (hasMap || !color || !demoPath.test(url)) return null;

  return (
    DEMO_RGB.find(rgb =>
      ['r', 'g', 'b'].every(
        (key, i) => Math.abs(color[key] - rgb[i] / 255) < 1e-6
      )
    ) || null
  );
}

function supports3D() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');

    if (!gl) return false;

    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

class ModelBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('[DTH product 3D]', error);
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Part({ product, onReady }) {
  const { scene } = useGLTF(product.modelUrl);
  const { invalidate } = useThree();

  const model = useMemo(() => {
    const copy = scene.clone(true);
    const materials = new Map();

    const clone = material => {
      if (!materials.has(material.uuid)) {
        const fixed = material.clone();

        const rgb = originalDemoColor(
          product.modelUrl,
          fixed.color,
          fixed.map
        );

        // Chỉ sửa bảng màu demo cũ.
        // Model đã có màu đúng sẽ không bị chuyển lần hai.
        if (rgb) {
          fixed.color.setRGB(
            ...rgb.map(value => value / 255),
            THREE.SRGBColorSpace
          );
        }

        materials.set(material.uuid, fixed);
      }

      return materials.get(material.uuid);
    };

    copy.traverse(object => {
      if (!object.isMesh) return;

      object.material = Array.isArray(object.material)
        ? object.material.map(clone)
        : clone(object.material);
    });

    copy.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(copy);
    const sphere = bounds.getBoundingSphere(new THREE.Sphere());

    if (
      bounds.isEmpty() ||
      !Number.isFinite(sphere.radius) ||
      sphere.radius <= 0
    ) {
      materials.forEach(material => material.dispose());
      throw new Error('Model has no usable geometry.');
    }

    return {
      copy,
      center: sphere.center,
      scale: DETAIL_VIEW.radius / sphere.radius,
      materials,
    };
  }, [scene, product.modelUrl]);

  useEffect(() => {
    onReady();
    invalidate();

    return () => {
      model.materials.forEach(material => material.dispose());
    };
  }, [model, onReady, invalidate]);

  return (
    <group
      rotation={[
        0,
        -0.35,
        product.category === 'suspension' ? -0.12 : 0,
      ]}
    >
      <group scale={model.scale}>
        <group position={model.center.toArray().map(value => -value)}>
          <primitive object={model.copy} dispose={null} />
        </group>
      </group>
    </group>
  );
}

function Studio({ onFailure }) {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    const previousEnvironment = scene.environment;
    const previousIntensity = scene.environmentIntensity;

    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(room, 0.04);

    room.dispose();
    pmrem.dispose();

    scene.environment = target.texture;
    scene.environmentIntensity = DETAIL_VIEW.environmentIntensity;

    const lost = event => {
      event.preventDefault();
      onFailure();
    };

    gl.domElement.addEventListener('webglcontextlost', lost);
    invalidate();

    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);

      scene.environment = previousEnvironment;
      scene.environmentIntensity = previousIntensity;

      target.dispose();
    };
  }, [gl, scene, invalidate, onFailure]);

  return (
    <>
      <ambientLight intensity={0.25} />

      <hemisphereLight args={['#ffffff', '#303030', 0.5]} />

      <directionalLight
        position={[-3, 5, 5]}
        intensity={2}
        color="#ffffff"
      />

      <directionalLight
        position={[3, 1, -2]}
        intensity={1}
        color="#ffffff"
      />

      <directionalLight
        position={[-4, -1, -3]}
        intensity={0.4}
        color="#ffffff"
      />
    </>
  );
}

function CameraControls({
  api,
  active,
  ready,
  spin,
  onManual,
}) {
  const { gl, camera, size, invalidate } = useThree();
  const controls = useRef(null);

  const vertical = THREE.MathUtils.degToRad(DETAIL_VIEW.fov);

  const horizontal =
    2 *
    Math.atan(
      Math.tan(vertical / 2) *
        Math.max(1, size.width) /
        Math.max(1, size.height)
    );

  // Tự căn camera theo tỷ lệ khung xem.
  const distance =
    DETAIL_VIEW.radius /
    Math.sin(Math.min(vertical, horizontal) / 2) *
    1.12;

  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);

    control.enablePan = false;
    control.enableDamping = false;

    control.rotateSpeed = DETAIL_VIEW.dragSpeed;
    control.zoomSpeed = DETAIL_VIEW.zoomSpeed;

    control.minPolarAngle = 0.15;
    control.maxPolarAngle = Math.PI - 0.15;

    control.minDistance = 1.65;
    control.maxDistance = distance * 1.9;

    control.autoRotateSpeed = DETAIL_VIEW.autoSpeed;

    camera.position.set(0, 0, distance);
    control.target.set(0, 0, 0);

    control.update();
    control.saveState();

    const start = () => {
      control.autoRotate = false;
      onManual();
    };

    const change = () => invalidate();

    control.addEventListener('start', start);
    control.addEventListener('change', change);

    controls.current = control;

    api.current = command => {
      control.autoRotate = false;
      onManual();

      const offset = camera.position
        .clone()
        .sub(control.target);

      if (command === 'reset') {
        control.reset();
      } else {
        if (command === 'left' || command === 'right') {
          offset.applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            command === 'left' ? -0.3 : 0.3
          );
        } else {
          offset.setLength(
            THREE.MathUtils.clamp(
              offset.length() * (command === 'in' ? 0.86 : 1.16),
              control.minDistance,
              control.maxDistance
            )
          );
        }

        camera.position.copy(control.target).add(offset);
        control.update();
      }

      invalidate();
    };

    invalidate();

    return () => {
      control.removeEventListener('start', start);
      control.removeEventListener('change', change);
      control.dispose();

      controls.current = null;
      api.current = null;
    };
  }, [
    camera,
    gl,
    distance,
    invalidate,
    api,
    onManual,
  ]);

  useEffect(() => {
    if (controls.current) {
      controls.current.enabled = active && ready;
    }

    invalidate();
  }, [active, ready, distance, invalidate]);

  useFrame((_, delta) => {
    if (!controls.current || !active || !ready) return;

    controls.current.autoRotate = spin;
    controls.current.update(Math.min(delta, 0.05));
  });

  return null;
}

function ProductViewer({ product }) {
  const wrapper = useRef(null);
  const api = useRef(null);

  const [capable] = useState(supports3D);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const [imageMode, setImageMode] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [spin, setSpin] = useState(false);
  const [active, setActive] = useState(true);

  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const stop = useCallback(() => setSpin(false), []);
  const loaded = useCallback(() => setReady(true), []);

  const failure = useCallback(() => {
    setFailed(true);
    setReady(false);
    setSpin(false);
  }, []);

  const show3D =
    capable &&
    !!product.modelUrl &&
    !failed &&
    !imageMode;

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      setReduced(media.matches);
      if (media.matches) stop();
    };

    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, [stop]);

  useEffect(() => {
    let seen = true;

    const update = () => {
      setActive(seen && !document.hidden);
    };

    const observer = new IntersectionObserver(([entry]) => {
      seen = entry.isIntersecting;
      update();
    });

    observer.observe(wrapper.current);
    update();

    document.addEventListener('visibilitychange', update);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => {
    if (!show3D || ready) return;

    const timer = setTimeout(failure, DETAIL_VIEW.timeoutMs);

    return () => clearTimeout(timer);
  }, [show3D, ready, attempt, failure]);

  function imageOrRetry() {
    stop();
    setReady(false);

    if (failed) {
      useGLTF.clear(product.modelUrl);

      setFailed(false);
      setImageMode(false);
      setAttempt(value => value + 1);
    } else {
      setImageMode(value => !value);
    }
  }

  const live = show3D && ready;

  const message = imageMode
    ? 'Image preview'
    : failed
      ? '3D could not load. Image preview is still available.'
      : !capable || !product.modelUrl
        ? '3D is unavailable. Image preview.'
        : ready
          ? 'Interactive 3D ready'
          : 'Loading 3D model…';

  return (
    <section
      className="dth-pdv"
      ref={wrapper}
      aria-label={`${product.name}: product viewer`}
    >
      <div className="dth-pdv-heading">
        <span>PRODUCT STUDIO / 01</span>
        <span role="status">{message}</span>
      </div>

      <div className="dth-pdv-stage">
        <div
          className="dth-pdv-poster"
          data-hidden={live}
          aria-hidden={live}
        >
          <ProductImage
            product={product}
            className="dth-pdv-image"
            eager
          />
        </div>

        {show3D && (
          <div
            className="dth-pdv-canvas"
            data-ready={ready}
            aria-hidden="true"
          >
            <ModelBoundary
              key={attempt}
              onFailure={failure}
            >
              <Canvas
                dpr={[1, 1.5]}
                camera={{
                  position: [0, 0, 5],
                  fov: DETAIL_VIEW.fov,
                  near: 0.1,
                  far: 50,
                }}
                frameloop={
                  active && spin && !reduced
                    ? 'always'
                    : 'demand'
                }
                gl={{
                  antialias: true,
                  alpha: true,
                  powerPreference: 'default',
                }}
                fallback={null}
                onCreated={({ gl }) => {
                  gl.toneMapping = THREE.NeutralToneMapping;
                  gl.toneMappingExposure = DETAIL_VIEW.exposure;
                  gl.outputColorSpace = THREE.SRGBColorSpace;
                }}
              >
                <Studio onFailure={failure} />

                <Suspense fallback={null}>
                  <Part product={product} onReady={loaded} />
                </Suspense>

                <CameraControls
                  api={api}
                  active={active}
                  ready={ready}
                  spin={spin && !reduced}
                  onManual={stop}
                />
              </Canvas>
            </ModelBoundary>
          </div>
        )}
      </div>

      <div
        className="dth-pdv-controls"
        role="group"
        aria-label="3D view controls"
      >
        {[
          ['left', '↶', 'Rotate left'],
          ['right', '↷', 'Rotate right'],
          ['in', '+', 'Zoom in'],
          ['out', '−', 'Zoom out'],
          ['reset', 'Reset', 'Reset view'],
        ].map(([key, label, title]) => (
          <button
            key={key}
            type="button"
            disabled={!live}
            aria-label={title}
            title={title}
            onClick={() => api.current?.(key)}
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          disabled={!live || reduced}
          aria-pressed={spin}
          onClick={() => setSpin(value => !value)}
        >
          {spin ? 'Pause rotation' : 'Auto rotate'}
        </button>

        {capable && product.modelUrl && (
          <button type="button" onClick={imageOrRetry}>
            {failed
              ? 'Retry 3D'
              : imageMode
                ? 'View 3D'
                : 'Image'}
          </button>
        )}
      </div>

      <p className="dth-pdv-help">
        {live
          ? 'Drag to rotate · Scroll / pinch to zoom · Dragging pauses auto rotation.'
          : 'You can read product details and check vehicle fit without 3D.'}
      </p>

      <p className="dth-pdv-help">
        Illustrative model · Not manufacturer measurements.
        {reduced && ' Reduced motion is enabled.'}
      </p>
    </section>
  );
}

export default function Viewer3D({ product }) {
  return (
    <ProductViewer
      key={`${product.id}:${product.modelUrl}:${product.imageUrl}`}
      product={product}
    />
  );
}