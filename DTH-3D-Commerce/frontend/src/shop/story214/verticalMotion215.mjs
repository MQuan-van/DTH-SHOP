/* DTH21.5.1: patched */
/** Step 21.5: presentation-only, deterministic in scroll position. */
import { camera214, clamp214, smooth214 } from './story214.logic.mjs';
// DTH21.5.1: chapter traversal is longer; final scene remains pinned for an exit hold.
export const CHAPTER2151 = Object.freeze({ segmentViewport: 1.70, exitViewport: 1.15 });

export function verticalCamera215(frame, leftSettings, rightSettings, width, height, motion = true) {
  const pose = camera214(frame, leftSettings, rightSettings, width, height, motion);
  const [x, y, z] = pose.position;
  const distance = Math.hypot(x, y, z);
  const flat = Math.hypot(x, z);
  // Screen-up expressed in world space. Keeps travel vertical at EVERY saved camera angle.
  const up = distance > 0 && flat > 1e-8
    ? [-x * y / (flat * distance), flat / distance, -z * y / (flat * distance)]
    : [0, 1, 0];
  const travel = distance * Math.tan(pose.fov * Math.PI / 360) + pose.envelope * 1.65;
  // Slightly overlapping travel windows avoid an empty gap for short horizontal parts.
  const mix = clamp214(frame.mix, 0, 1);
  return { ...pose, up, travel, outgoing: travel * Math.pow(mix, 1.5), incoming: -travel * Math.pow(1 - mix, 1.5) };
}

/** Positive screenY goes DOWN. Never changes authored model rotation/materials. */
export function verticalPlacement215(frame, index, pose) {
  const left = index === frame.left;
  const right = index === frame.right && frame.right !== frame.left;
  const visible = left ? frame.mix < .99999 : right && frame.mix > .00001;
  const screenY = left ? pose.outgoing : pose.incoming;
  const weight = left ? 1 - frame.mix : frame.mix;
  return {
    visible: Boolean(visible),
    position: pose.up.map(value => -value * screenY),
    scale: .985 + .015 * clamp214(weight, 0, 1),
  };
}

export function copyMotion215(frame, index, motion = true) {
  const left = index === frame.left;
  const right = index === frame.right && frame.right !== frame.left;
  if (!left && !right) return { opacity: 0, y: 0, active: false };
  if (!motion) return { opacity: index === frame.primary ? 1 : 0, y: 0, active: index === frame.primary };
  const mix = clamp214(frame.mix, 0, 1);
  // DTH21.5.1: overlapping soft fades avoid the dead zone between adjacent chapters.
  const opacity = left ? 1 - smooth214(.22, .75, mix) : smooth214(.25, .78, mix);
  const eased = smooth214(.04, .96, mix);
  return { opacity, y: left ? 30 * eased : -30 * (1 - eased), active: index === frame.primary && opacity > .2 };
}

export function railProgress215(position, count) {
  if (!Number.isSafeInteger(count) || count <= 0) return 0;
  if (count === 1) return .5;
  return clamp214(position / (count - 1), 0, 1);
}

export function trail215(progress, length) {
  const total = Number.isFinite(length) && length > 0 ? length : 1;
  const end = clamp214(progress, 0, 1) * total;
  const span = Math.min(total * .13, end);
  const core = Math.min(total * .032, end);
  return { end, span, start: end - span, core, coreStart: end - core };
}

const WORDS215 = Object.freeze({ suspension: 'SUSPENSION', wheels: 'WHEELS', exhausts: 'EXHAUSTS', mirrors: 'MIRRORS', brakes: 'BRAKES' });
export function categoryWord215(product) { return WORDS215[product?.category] || 'PARTS'; }

export function atmosphere215(frame, products, motion = true) {
  const first = categoryWord215(products[frame.left]);
  const second = categoryWord215(products[frame.right]);
  const mix = clamp214(frame.mix, 0, 1);
  const same = first === second;
  return {
    progress: railProgress215(frame.position, products.length),
    first, second,
    // DTH21.5.1: category change crossfades with no blank interval.
    firstOpacity: same ? 1 : 1 - smooth214(.20, .80, mix),
    secondOpacity: same ? 0 : smooth214(.20, .80, mix),
    // DTH21.5.1: background category words are anchored to the stage, not tied to hold/reset.
    firstY: 0,
    secondY: 0,
  };
}
