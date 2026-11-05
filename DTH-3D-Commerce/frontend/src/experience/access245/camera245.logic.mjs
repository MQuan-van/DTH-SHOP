import { fitDistance21, rotatePoint21 } from '../../shop/presentation21/presentationMath21.mjs';

export const CAMERA245 = Object.freeze({ registerArc: Math.PI / 10, introArc: -.24, studyArc: .16,
  overviewDistance: .88, pointerArc: .035, macroDistance: .62, settleEpsilon: .0003, response: 10 });
const finite = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unit = (value, fallback = 0) => clamp(finite(value, fallback), 0, 1);
const vector = (value, fallback) => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite) ? value.slice() : fallback.slice();

/** The exact saved presentation wrapper, sampled only at source-box corners for camera framing. */
export function presentationCorners245(bounds, presentation) {
  const offset = vector(presentation?.offset, [0, 0, 0]), center = vector(presentation?.center, [0, 0, 0]);
  const rotation = vector(presentation?.rotation, [0, 0, 0]), scale = finite(presentation?.scale, 1), points = [];
  if (!Array.isArray(bounds?.min) || !Array.isArray(bounds?.max) || bounds.min.length !== 3 || bounds.max.length !== 3
    || !bounds.min.every(Number.isFinite) || !bounds.max.every(Number.isFinite)) return points;
  for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) {
    points.push(rotatePoint21([x + offset[0], y + offset[1], z + offset[2]], rotation).map((n, i) => n * scale + center[i]));
  }
  return points;
}

/** Distance needed to fit a presented bounding box in the current camera basis. */
export function cornerFitDistance245(points, yaw, pitch, target, fov, aspect) {
  if (!Array.isArray(points) || !points.length) return 0;
  const sinY = Math.sin(yaw), cosY = Math.cos(yaw), sinP = Math.sin(pitch), cosP = Math.cos(pitch);
  const right = [cosY, 0, -sinY], up = [-sinY * sinP, cosP, -cosY * sinP], back = [sinY * cosP, sinP, cosY * cosP];
  const tanV = Math.tan(fov * Math.PI / 360), tanH = tanV * Math.max(.001, aspect);
  const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
  let distance = 0;
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 3 || !point.every(Number.isFinite)) continue;
    const q = point.map((n, i) => n - target[i]);
    distance = Math.max(distance, dot(q, back) + Math.max(Math.abs(dot(q, right)) / tanH, Math.abs(dot(q, up)) / tanV));
  }
  return Math.max(0, distance) * 1.06;
}

export function stagePermission245(policy = {}, director = {}) {
  const mount = policy.allowed === true && !policy.compact && !policy.reduced && !policy.saveData;
  return { mount, move: mount && policy.motion !== false && !policy.hidden && !policy.paused
    && director.motion !== false && !director.blocked };
}

export function pointer245(pointer) {
  if (!pointer || pointer.active === false) return { x: 0, y: 0 };
  return { x: clamp(finite(pointer.x), -1, 1), y: clamp(finite(pointer.y), -1, 1) };
}

/** Exact convergence parks the demand renderer after the last pointer event. */
export function settlePointer245(previous, target, delta) {
  const aim = pointer245(target), amount = 1 - Math.exp(-CAMERA245.response * clamp(finite(delta), 0, .05));
  const x = finite(previous?.x) + (aim.x - finite(previous?.x)) * amount;
  const y = finite(previous?.y) + (aim.y - finite(previous?.y)) * amount;
  const settled = Math.max(Math.abs(x - aim.x), Math.abs(y - aim.y)) <= CAMERA245.settleEpsilon;
  return settled ? { ...aim, settled: true } : { x, y, settled: false };
}

/** Pause/focus freeze the last semantic sample; a resize may reframe that same sample. */
export function retainSample245(previous, requested = {}, pointer = {}, moving = true) {
  if (!moving && previous) return previous;
  return {
    intro: moving ? unit(requested.intro, 1) : 1,
    mode: unit(requested.mode), detail: moving ? unit(requested.detail) : 0,
    pointer: moving ? pointer245(pointer) : { x: 0, y: 0 },
  };
}

/** Camera-only composition. Never edits an asset transform or invents a semantic mesh anchor. */
export function cameraPose245(front = {}, frame = {}, sample = {}) {
  const position = vector(front.position, [0, 0, 5]), target = vector(front.target, [0, 0, 0]);
  const direction = position.map((n, i) => n - target[i]);
  const authoredDistance = Math.max(.01, Math.hypot(...direction));
  const width = Math.max(1, finite(frame.width, 800)), height = Math.max(1, finite(frame.height, 600));
  const radius = Math.max(.01, finite(frame.radius, 1.35));
  const frameRadius = Math.max(.01, finite(frame.frameRadius, 1.35));
  const fov = clamp(finite(frame.fov, 36), 20, 65);
  const referenceDistance = Math.max(.01, finite(frame.referenceDistance, fitDistance21(800, 600, frameRadius, fov)));
  const authoredFit = authoredDistance * fitDistance21(width, height, frameRadius, fov) / referenceDistance;
  const intro = unit(sample.intro, 1), mode = unit(sample.mode), detail = unit(sample.detail);
  const macro = Math.max(1 - intro, detail), pointer = pointer245(sample.pointer);
  const yawBase = Math.atan2(direction[0], direction[2]);
  const pitchBase = Math.asin(clamp(direction[1] / authoredDistance, -1, 1));
  const yaw = yawBase + CAMERA245.studyArc + (1 - intro) * CAMERA245.introArc + mode * CAMERA245.registerArc
    + pointer.x * CAMERA245.pointerArc * (1 - macro * .35);
  const pitch = clamp(pitchBase + macro * .075 + mode * .035 + pointer.y * .018, -Math.PI / 3, Math.PI / 3);
  const look = [target[0], target[1] + radius * (macro * .16 + mode * .025), target[2]];
  const distance = Math.max(authoredFit * CAMERA245.overviewDistance, radius * 1.9,
    cornerFitDistance245(frame.points, yaw, pitch, look, fov, width / height));
  const cameraDistance = Math.max(radius * 1.25, distance * (1 - macro * (1 - CAMERA245.macroDistance)));
  const cos = Math.cos(pitch);
  return { position: [look[0] + Math.sin(yaw) * cos * cameraDistance,
    look[1] + Math.sin(pitch) * cameraDistance, look[2] + Math.cos(yaw) * cos * cameraDistance],
    target: look, fov, near: .04, far: Math.max(30, cameraDistance + radius * 5),
    yaw, pitch, distance: cameraDistance, macro };
}
