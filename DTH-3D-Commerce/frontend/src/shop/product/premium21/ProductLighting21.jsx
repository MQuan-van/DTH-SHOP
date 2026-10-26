import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { STUDIO_PRESETS21, normalizeStudio21 } from './studio21.mjs';

/** Local softbox environment. This is not an HDR photo or a model/material edit. */
function makeSoftboxRoom21() {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0.055, 0.065, 0.08);
  const owned = [];
  const panel = (position, width, height, intensity) => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(intensity, intensity, intensity),
      side: THREE.DoubleSide, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.lookAt(0, 0, 0); room.add(mesh);
    owned.push(geometry, material);
  };
  // Broad key, narrower fill and overhead/back panels create readable metal reflections.
  panel([-4, 4, 4], 3.5, 6, 5);
  panel([4, 2, 1], 1.5, 6, 3);
  panel([0, 6, -1], 5, 4, 4);
  panel([1, 2, -5], 2, 5, 4);
  return { room, dispose() { owned.forEach(item => item.dispose()); room.clear(); } };
}

export default function ProductLighting21({ onFailure, study, lightAngle, studio, active = true }) {
  const { gl, scene, invalidate } = useThree();
  const keyLight = useRef(null);
  const targets = useRef(null);
  const settings = normalizeStudio21(studio);
  const latest = useRef({ settings, lightAngle });
  latest.current = { settings, lightAngle };
  const preset = STUDIO_PRESETS21[settings.preset];

  useLayoutEffect(() => {
    const previous = { environment: scene.environment, intensity: scene.environmentIntensity,
      rotation: scene.environmentRotation.clone(), exposure: gl.toneMappingExposure };
    let generator = null, originalRoom = null, softbox = null, original = null, studioTarget = null;
    const lost = event => {
      event.preventDefault();
      onFailure('WebGL context was lost. Close other 3D tabs and choose Retry 3D.');
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    try {
      generator = new THREE.PMREMGenerator(gl);
      originalRoom = new RoomEnvironment();
      original = generator.fromScene(originalRoom, 0.04);
      softbox = makeSoftboxRoom21();
      studioTarget = generator.fromScene(softbox.room, 0.035, 0.1, 50);
      targets.current = { original, studio: studioTarget };
      const initial = latest.current.settings;
      scene.environment = (initial.preset === 'original' ? original : studioTarget).texture;
      scene.environmentIntensity = STUDIO_PRESETS21[initial.preset].environment;
      gl.toneMappingExposure = initial.exposure;
      invalidate();
    } catch (error) {
      onFailure(error?.message || 'Unable to prepare the studio lighting.');
    } finally {
      originalRoom?.dispose(); softbox?.dispose(); generator?.dispose();
    }
    return () => {
      gl.domElement.removeEventListener('webglcontextlost', lost);
      scene.environment = previous.environment;
      scene.environmentIntensity = previous.intensity;
      scene.environmentRotation.copy(previous.rotation);
      gl.toneMappingExposure = previous.exposure;
      targets.current = null;
      original?.dispose(); studioTarget?.dispose();
    };
  }, [gl, scene, invalidate, onFailure]);

  useLayoutEffect(() => {
    const available = targets.current;
    if (!available) return;
    scene.environment = (settings.preset === 'original' ? available.original : available.studio).texture;
    scene.environmentIntensity = preset.environment;
    const angle = Number.isFinite(lightAngle) ? lightAngle * Math.PI / 180 : 0;
    // Original retains the previous environment orientation at zero.
    scene.environmentRotation.set(0, settings.preset === 'original' ? 0 : angle, 0);
    gl.toneMappingExposure = settings.exposure;
    invalidate();
  }, [settings.preset, settings.exposure, preset.environment, lightAngle, gl, scene, invalidate]);

  useFrame(() => {
    if (!keyLight.current || !active) return;
    const surface = study?.current?.read?.().surface ?? 0;
    const angle = (Number.isFinite(lightAngle) ? lightAngle : 0) * Math.PI / 180;
    keyLight.current.position.set(-4 + Math.sin(angle) * 5, 5, 5 + Math.cos(angle) * surface);
    keyLight.current.intensity = preset.key + surface * 0.35;
  });
  return <>
    <ambientLight intensity={preset.ambient} />
    <hemisphereLight args={['#ffffff', '#2b343b', preset.hemi]} />
    <directionalLight ref={keyLight} position={[-4, 5, 5]} intensity={preset.key} />
    <directionalLight position={[4, 1, -3]} intensity={preset.fill} />
    <directionalLight position={[-2, 4, -5]} intensity={preset.rim} />
  </>;
}
