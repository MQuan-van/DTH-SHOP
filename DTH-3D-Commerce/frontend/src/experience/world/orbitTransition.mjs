import { MathUtils, Quaternion, Vector3 } from 'three';

/** Reused scratch objects keep named-view transitions off the model's interior. */
export function createOrbitStepper() {
  const offset = new Vector3(), destination = new Vector3();
  const turn = new Quaternion(), step = new Quaternion();
  return (position, target, nextPosition, nextTarget, amount) => {
    const factor = MathUtils.clamp(amount, 0, 1);
    offset.copy(position).sub(target);
    destination.copy(nextPosition).sub(nextTarget);
    const fromRadius = MathUtils.clamp(offset.length(), 4.5, 20);
    const toRadius = MathUtils.clamp(destination.length(), 4.5, 20);
    if (offset.lengthSq() < 1e-10) offset.set(0, 0, 1);
    if (destination.lengthSq() < 1e-10) destination.set(0, 0, 1);
    turn.setFromUnitVectors(offset.normalize(), destination.normalize());
    step.identity().slerp(turn, factor);
    offset.applyQuaternion(step).setLength(MathUtils.lerp(fromRadius, toRadius, factor));
    target.lerp(nextTarget, factor);
    position.copy(target).add(offset);
  };
}
