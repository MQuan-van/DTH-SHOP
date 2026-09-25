import { Euler, MathUtils, Spherical, Vector3 } from 'three';
import { createOrbitStepper } from './orbitTransition.mjs';

const VIEWS = {
  front: [0, 0.15, 1], side: [1, 0.12, 0],
  rear: [0, 0.15, -1], top: [0, 1, 0.05],
};
const Y_AXIS = new Vector3(0, 1, 0);
const finiteVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

/** A single, interruptible command queue shared by Home and the admin renderer.
 * Relative button presses accumulate against the pending destination, never an
 * out-of-date rendered frame. Pointer gestures always take over immediately.
 */
export function createInspectionCommands({ camera, control, target, director, compact = false, invalidate = () => {} }) {
  const stepOrbit = createOrbitStepper();
  const center = new Vector3(), offset = new Vector3(), spherical = new Spherical();
  const rotation = new Euler();
  let move = null;
  const allowed = () => director.state.inspecting && director.state.active && !director.state.blocked;

  function boundOffset() {
    if (offset.lengthSq() < 1e-10) offset.set(0, 0, 1);
    spherical.setFromVector3(offset);
    spherical.radius = MathUtils.clamp(spherical.radius, control.minDistance, control.maxDistance);
    spherical.phi = MathUtils.clamp(spherical.phi, control.minPolarAngle, control.maxPolarAngle);
    offset.setFromSpherical(spherical);
  }

  function command(name) {
    if (!allowed() || typeof name !== 'string') return false;
    const relative = ['left', 'right', 'in', 'out'].includes(name);
    const named = name.startsWith('view-') && Object.hasOwn(VIEWS, name.slice(5));
    if (!relative && name !== 'reset' && !named) return false;
    // A new named view replaces the old one. Consecutive nudges are additive.
    const pending = relative && move?.kind === 'relative' ? move : null;
    center.copy(pending ? pending.target : target);
    offset.copy(pending ? pending.camera : camera.position).sub(center);
    if (name === 'reset') {
      director.set({ manualExplode: 0, selectedPart: '', lightAngle: 0, resetSerial: director.state.resetSerial + 1 });
      center.set(0, 0, 0); offset.set(0, 0.3, compact ? 12 : 10.8);
    } else if (name.startsWith('view-')) {
      const pose = director.state.pose;
      const distance = MathUtils.clamp(offset.length(), 6, 14);
      if (pose) center.fromArray(pose.position);
      offset.fromArray(VIEWS[name.slice(5)]).normalize().multiplyScalar(distance);
      if (pose) offset.applyEuler(rotation.set(...pose.rotation));
    } else if (name === 'left' || name === 'right') {
      offset.applyAxisAngle(Y_AXIS, name === 'left' ? -0.3 : 0.3);
    } else {
      offset.multiplyScalar(name === 'in' ? 0.88 : 1.12);
    }
    boundOffset();
    move = { camera: center.clone().add(offset), target: center.clone(), kind: relative ? 'relative' : 'absolute' };
    invalidate();
    return true;
  }

  command.cancel = () => { move = null; };
  command.isMoving = () => move !== null;
  command.step = delta => {
    if (!allowed()) { command.cancel(); return; }
    if (!move) return;
    const dt = Number.isFinite(delta) ? MathUtils.clamp(delta, 0, 0.05) : 1 / 60;
    const factor = director.state.motion ? 1 - Math.exp(-12 * dt) : 1;
    stepOrbit(camera.position, control.target, move.camera, move.target, factor);
    control.update(); target.copy(control.target);
    if (camera.position.distanceToSquared(move.camera) < 1e-6 && control.target.distanceToSquared(move.target) < 1e-6) {
      camera.position.copy(move.camera); control.target.copy(move.target);
      control.update(); target.copy(control.target); move = null;
    } else invalidate();
  };
  command.capture = () => {
    const { pose, renderedExplode } = director.state;
    if (!allowed() || !pose || !finiteVector(pose.position) || !finiteVector(pose.rotation) || !Number.isFinite(pose.scale) || !Number.isFinite(renderedExplode)) return null;
    // Return a detached snapshot of what has actually rendered, not the slider's
    // destination while assembly animation is still catching up.
    return {
      camera: camera.position.toArray(), target: target.toArray(),
      position: [...pose.position], rotation: [...pose.rotation], scale: pose.scale,
      explode: MathUtils.clamp(renderedExplode, 0, 1),
    };
  };
  return command;
}
