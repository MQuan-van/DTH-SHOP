/** Decorative brand-study math. It never receives credentials or account data. */
export const SCENE243 = Object.freeze({
  maxTilt: Math.PI / 60,
  sweepSeconds: .78,
  settleEpsilon: .00035,
  response: 11,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export function scenePermission243(policy = {}, { focusing = false, busy = false } = {}) {
  const mount = policy.allowed === true && !policy.compact && !policy.saveData && !policy.reduced;
  return {
    mount,
    run: mount && policy.motion !== false && !policy.hidden && !policy.paused && !focusing && !busy,
  };
}

export function pointerTarget243(pointer, running = true) {
  if (!running || pointer?.active === false) return { x: 0, y: 0 };
  return { x: clamp(finite(pointer?.x), -1, 1), y: clamp(finite(pointer?.y), -1, 1) };
}

/** Exact convergence lets a demand-rendered scene sleep instead of asymptotic idle work. */
export function settlePointer243(previous, target, delta) {
  const dt = clamp(finite(delta), 0, .05);
  const amount = 1 - Math.exp(-SCENE243.response * dt);
  const x = finite(previous?.x) + (finite(target?.x) - finite(previous?.x)) * amount;
  const y = finite(previous?.y) + (finite(target?.y) - finite(previous?.y)) * amount;
  const settled = Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) <= SCENE243.settleEpsilon;
  return settled ? { ...target, settled: true } : { x, y, settled: false };
}

export function lightStudyPose243(pointer, sweep = 1) {
  const { x, y } = pointerTarget243(pointer);
  const progress = clamp(finite(sweep), 0, 1);
  // The combined angular offset, rather than each individual axis, is bounded at three degrees.
  let tiltX = -y * .55 * SCENE243.maxTilt, tiltY = x * .8 * SCENE243.maxTilt;
  const length = Math.hypot(tiltX, tiltY);
  if (length > SCENE243.maxTilt) {
    const ratio = SCENE243.maxTilt / length; tiltX *= ratio; tiltY *= ratio;
  }
  return {
    tiltX, tiltY,
    lightX: -3.8 + x * 1.8 + (1 - progress) * 5,
    lightY: -2.7 + y * 1.15,
    lightZ: 2.4,
  };
}

/** Keep all authored triangles; split only their material assignment by surface normal. */
export function logoSurfaces243(meshes) {
  const positions = [], normals = [], groups = [];
  for (const mesh of meshes) {
    if (!Array.isArray(mesh.positions) || !Array.isArray(mesh.normals) || mesh.positions.length !== mesh.normals.length || mesh.positions.length % 9) {
      throw new Error('Invalid DTH brand geometry.');
    }
    const offset = finite(mesh.x);
    for (let i = 0; i < mesh.positions.length; i += 9) {
      const nz = mesh.normals[i + 2];
      const materialIndex = nz > .9 ? 0 : nz > .1 ? 1 : 2;
      const start = positions.length / 3;
      for (let j = 0; j < 9; j++) {
        if (!Number.isFinite(mesh.positions[i + j]) || !Number.isFinite(mesh.normals[i + j])) throw new Error('Non-finite DTH brand geometry.');
        positions.push(mesh.positions[i + j] + (j % 3 === 0 ? offset : 0));
        normals.push(mesh.normals[i + j]);
      }
      const previous = groups.at(-1);
      if (previous?.materialIndex === materialIndex) previous.count += 3;
      else groups.push({ start, count: 3, materialIndex });
    }
  }
  return { positions, normals, groups };
}

export function logoPosterPath243(meshes) {
  const paths = [];
  for (const mesh of meshes) for (let i = 0; i < mesh.positions.length; i += 9) {
    if (mesh.normals[i + 2] < .9) continue;
    const p = mesh.positions, x = finite(mesh.x);
    paths.push(`M${(p[i] + x).toFixed(4)},${(-p[i + 1]).toFixed(4)}L${(p[i + 3] + x).toFixed(4)},${(-p[i + 4]).toFixed(4)}L${(p[i + 6] + x).toFixed(4)},${(-p[i + 7]).toFixed(4)}Z`);
  }
  return paths.join('');
}
