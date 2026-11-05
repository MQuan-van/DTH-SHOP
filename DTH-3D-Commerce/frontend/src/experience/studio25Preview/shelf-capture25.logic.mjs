import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getPresentation21 } from '../../../../shared/productPresentation21.mjs';
import { galleryCamera24, galleryKey24 } from '../galleryDemo24/gallery-demo.logic.mjs';
import { stationPose25 } from './spatial-stage25.logic.mjs';

const SIDE = 352;
const GT4_URL = '/models/ai-products/587efa2d-8287-4fa2-aba4-9f075c521277.glb';
const GT4_SHA256 = 'b17864e59b39faf6455ded70018795d9fb972b4d618ca33fba82e1dd472e9aab';

export function describeProduct25(asset, product) {
  const fit = asset?.presentation;
  if (!asset?.measured?.box || !fit) return null;
  const matrix = new THREE.Matrix4().makeTranslation(...fit.center)
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...fit.rotation, 'XYZ')))
    .multiply(new THREE.Matrix4().makeScale(fit.scale, fit.scale, fit.scale))
    .multiply(new THREE.Matrix4().makeTranslation(...fit.offset));
  const sphere = asset.measured.box.clone().applyMatrix4(matrix).getBoundingSphere(new THREE.Sphere());
  if (!(sphere.radius > 0) || !Number.isFinite(sphere.radius)) return null;
  const center = sphere.center.toArray();
  const preview = galleryCamera24(product, center, sphere.radius, !!asset.profile);
  const settings = getPresentation21(product);
  return {
    center, radius: sphere.radius, front: preview || fit.camera?.presets?.front, fov: fit.camera?.fov || 36,
    spinEnabled: settings?.spin.enabled !== false, spinSeconds: settings?.spin.secondsPerTurn || fit.camera?.secondsPerTurn || 38,
  };
}

export function nextShelfCapture25(products, completed, entries) {
  let next = null;
  for (const product of products) {
    const key = galleryKey24(product);
    if (!key || completed.has(key)) continue;
    const resident = entries.get(product.id);
    if (resident?.posterKey === key) return { product, key };
    next ??= { product, key };
  }
  return next;
}

/** A side-biased portrait shows both the reservoir and spring of the original GT4. */
export function shelfPose25(asset, descriptor, product) {
  const originalGT4 = product?.id === 'x1r-red' && product.modelUrl === GT4_URL
    && asset.report?.sha256 === GT4_SHA256 && !asset.profile && !product.presentation3d;
  if (!originalGT4) return stationPose25(descriptor, [0, 0, 0], SIDE, SIDE);
  const yaw = 1.18, pitch = .18;
  const direction = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
  const target = descriptor.center;
  const position = target.map((value, i) => value + direction[i] * descriptor.radius * 4);
  return stationPose25({ ...descriptor, front: { position, target } }, [0, 0, 0], SIDE, SIDE);
}

/** The target is bottom-up. Preserve the model aspect ratio when centering its silhouette. */
export function orientShelfPixels25(pixels, image, side) {
  let left = side, top = side, right = -1, bottom = -1;
  for (let y = 0; y < side; y++) {
    const start = (side - y - 1) * side * 4;
    image.set(pixels.subarray(start, start + side * 4), y * side * 4);
    for (let x = 0; x < side; x++) {
      if (pixels[start + x * 4 + 3] < 4) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function pngFromPixels(pixels) {
  const source = document.createElement('canvas');
  source.width = SIDE;
  source.height = SIDE;
  const context = source.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(SIDE, SIDE);
  const bounds = orientShelfPixels25(pixels, image.data, SIDE);
  if (!bounds) return null;
  context.putImageData(image, 0, 0);
  const output = document.createElement('canvas');
  output.width = SIDE;
  output.height = SIDE;
  const target = output.getContext('2d');
  if (!target) return null;
  const scale = SIDE * .82 / Math.max(bounds.width, bounds.height);
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  target.drawImage(source, bounds.left, bounds.top, bounds.width, bounds.height,
    (SIDE - width) / 2, (SIDE - height) / 2, width, height);
  return output.toDataURL('image/png');
}

/** One fixed-pose draw on the live renderer. Only the temporary target and hierarchy are owned here. */
export function captureShelfPoster25(gl, liveScene, asset, descriptor, product) {
  const fit = asset.presentation;
  const pose = shelfPose25(asset, descriptor, product);
  const camera = new THREE.PerspectiveCamera(pose.fov, 1, .005, 250);
  camera.position.fromArray(pose.position);
  camera.lookAt(new THREE.Vector3(...pose.target));

  const scene = new THREE.Scene();
  scene.environment = liveScene.environment;
  scene.environmentIntensity = liveScene.environmentIntensity;
  for (const light of liveScene.children.filter(child => child.isLight)) scene.add(light.clone());
  const root = new THREE.Group();
  root.position.fromArray(fit.center);
  root.rotation.set(...fit.rotation, 'XYZ');
  root.scale.setScalar(fit.scale);
  const offset = new THREE.Group();
  offset.position.fromArray(fit.offset);
  const model = clone(asset.scene);
  offset.add(model);
  root.add(offset);
  scene.add(root);

  const target = new THREE.WebGLRenderTarget(SIDE, SIDE, { colorSpace: THREE.SRGBColorSpace });
  const previous = gl.getRenderTarget(), face = gl.getActiveCubeFace(), mip = gl.getActiveMipmapLevel();
  const clear = gl.getClearColor(new THREE.Color()), alpha = gl.getClearAlpha(), autoClear = gl.autoClear;
  const pixels = new Uint8Array(SIDE * SIDE * 4);
  try {
    gl.setRenderTarget(target);
    gl.setClearColor(0, 0);
    gl.autoClear = true;
    gl.render(scene, camera);
    gl.readRenderTargetPixels(target, 0, 0, SIDE, SIDE, pixels);
  } finally {
    gl.setRenderTarget(previous, face, mip);
    gl.setClearColor(clear, alpha);
    gl.autoClear = autoClear;
    target.dispose();
    model.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
  }
  return pngFromPixels(pixels);
}
