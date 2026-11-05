/** Finite decorative motion only. The field never receives form values. */
export const FIELD244 = Object.freeze({ entrySeconds: .9, response: 8, epsilon: .0005 });
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function fieldPermission244(policy = {}, { focusing = false, busy = false } = {}) {
  const mount = policy.allowed === true && !policy.compact && !policy.reduced && !policy.saveData;
  return { mount, run: mount && policy.motion !== false && !policy.hidden && !policy.paused && !focusing && !busy };
}

export function fieldTarget244(pointer) {
  if (pointer?.active === false) return { x: 0, y: 0 };
  return { x: clamp(finite(pointer?.x), -1, 1), y: clamp(finite(pointer?.y), -1, 1) };
}

export function settleField244(previous, target, delta) {
  const aim = fieldTarget244(target), dt = clamp(finite(delta), 0, .05);
  const amount = 1 - Math.exp(-FIELD244.response * dt);
  const x = finite(previous?.x) + (aim.x - finite(previous?.x)) * amount;
  const y = finite(previous?.y) + (aim.y - finite(previous?.y)) * amount;
  const settled = Math.max(Math.abs(x - aim.x), Math.abs(y - aim.y)) < FIELD244.epsilon;
  return settled ? { ...aim, settled: true } : { x, y, settled: false };
}

export const FIELD_VERTEX244 = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const FIELD_FRAGMENT244 = /* glsl */ `
  uniform vec2 uPointer;
  uniform float uAspect;
  uniform float uEntry;
  varying vec2 vUv;

  float gaussian(float distance, float width) {
    float value = distance / width;
    return exp(-value * value);
  }
  float grain(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  void main() {
    vec2 uv = vUv;
    vec2 point = uv + uPointer * vec2(.018, .012);
    float wide = min(uAspect, 2.2);
    float entry = (1.0 - uEntry) * .055;
    float sweep = .22 + .47 * point.x + .115 * sin(point.x * 4.6 - .5);
    float d = point.y - sweep - entry;
    float spread = .12 + .075 * sin(point.x * 2.5 + .5);

    // A rolled, softly lit fold: broad cobalt body, shadowed trough, and a cool grazing crest.
    float body = gaussian(d + .035, spread);
    float trough = gaussian(d - .06, .065);
    float crest = gaussian(d + .135, .021 + .008 * point.x);
    float feather = gaussian(d + .15, .095);
    float shoulder = gaussian(d - .20, .15);
    float edge = smoothstep(.07, .34, abs(uv.x - .5));
    float protection = mix(.26, 1.0, edge);

    vec3 color = mix(vec3(.0015, .0043, .010), vec3(.0035, .012, .031), uv.y);
    color += vec3(.004, .035, .20) * body * protection;
    color += vec3(.009, .12, .52) * feather * protection * .48;
    color += vec3(.16, .40, .72) * crest * protection * .34;
    color += vec3(.003, .022, .075) * shoulder * protection;
    color *= 1.0 - trough * .46;

    // A second wide fold lights the upper-right margin, leaving a quiet center for the form.
    float upper = point.y - (.98 - .17 * point.x + .055 * sin(point.x * 5.0));
    float upperMask = smoothstep(.40, .95, point.x);
    color += vec3(.014, .075, .25) * gaussian(upper, .12) * upperMask * .7;
    color += vec3(.10, .26, .48) * gaussian(upper - .035, .015) * upperMask * .18;
    float vignette = 1.0 - .26 * smoothstep(.35, .85, distance(uv, vec2(.5, .48)));
    color *= vignette;
    color += (grain(gl_FragCoord.xy) - .5) * .0012;
    gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    #include <colorspace_fragment>
  }
`;
