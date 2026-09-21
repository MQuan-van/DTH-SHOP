import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const theme = read('frontend/src/theme/candy-blue.css');
const token = name => {
  const match = theme.match(new RegExp(`--candy-${name}:\\s*(#[0-9a-f]{6});`, 'i'));
  assert.ok(match, `Missing palette token: ${name}`);
  return match[1];
};
const luminance = hex => {
  const c = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255);
  const [r, g, b] = c.map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
};
const contrast = (a, b) => {
  const l = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l[0] + .05) / (l[1] + .05);
};

test('theme is loaded by the existing entry stylesheet', () => {
  assert.match(read('frontend/src/index.css'), /@import\s+["']\.\/theme\/candy-blue\.css["'];/);
});
test('approved candy-blue and pearl-white palette', () => {
  assert.equal(token('blue'), '#0066e6');
  assert.equal(token('pearl'), '#f5f8fc');
  assert.equal(token('text'), '#0f1c2e');
  assert.match(theme, /color-scheme:\s*light/);
});
for (const foreground of ['text', 'muted', 'blue', 'success', 'warning', 'danger']) {
  test(`${foreground} text meets 4.5:1 on core opaque surfaces`, () => {
    for (const background of ['surface', 'pearl', 'panel', 'tint']) {
      assert.ok(contrast(token(foreground), token(background)) >= 4.5,
        `${foreground} on ${background}: ${contrast(token(foreground), token(background))}`);
    }
  });
}
test('white CTA text meets 4.5:1 for normal and hover blue', () => {
  for (const background of ['blue', 'deep']) {
    assert.ok(contrast(token('on-blue'), token(background)) >= 4.5);
  }
});
test('control outlines meet 3:1 against white and pearl', () => {
  for (const background of ['surface', 'pearl']) {
    assert.ok(contrast(token('control-line'), token(background)) >= 3);
  }
});
test('new theme does not control transforms, canvas rendering or animations', () => {
  const code = theme.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /(?:^|[;{])\s*(?:filter|animation(?:-[\w-]+)?|transform|pointer-events|display)\s*:/m);
  assert.doesNotMatch(code, /@keyframes|hue-rotate\(|brightness\(|saturate\(/);
});
test('hero ring geometry and pause rule remain in the stylesheet', () => {
  const css = read('frontend/src/shop/home/sections/Hero/HeroSection.module.css');
  assert.match(css, /@keyframes orbitTurn/);
  assert.match(css, /animation:orbitTurn var\(--ring-period,55s\) linear infinite/);
  assert.match(css, /\.hero\[data-ambient="off"\][\s\S]*?animation-play-state:paused/);
  assert.match(css, /\.hero \.productLink[\s\S]*?var\(--candy-blue\)/);
});
