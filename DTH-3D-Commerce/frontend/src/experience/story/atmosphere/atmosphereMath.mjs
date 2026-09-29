/** DTH Step 10 — visual-only math. No product measurements or fitment claims. */
export const ATMOSPHERE = Object.freeze({
  desktopCells: 88,
  compactCells: 56,
  maxDpr: 1.5,
  fps: 30,
  lineScale: 3.8,
  lineCount: 2.5,
  waveAmount: 0.37,
  waveSpeed: 0.48,
  seamCell: 24,
  seamLift: 2,
  seamSolid: 0.16,
});

export const clampUnit = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export const safeDelta = value => Number.isFinite(value) ? Math.min(0.05, Math.max(0, value)) : 0;

export function canvasSize(width, height, deviceRatio = 1) {
  if (![width, height].every(v => Number.isFinite(v) && v > 0)) return { width: 0, height: 0, ratio: 1 };
  const dpr = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const ratio = Math.min(dpr, ATMOSPHERE.maxDpr, 4096 / width, 4096 / height, Math.sqrt(6000000 / (width * height)));
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)), ratio };
}

/** Analytic field inspired by the supplied contour reference. Slower for DTH's product view. */
export function contourField(x, y, time = 0) {
  if (![x, y, time].every(Number.isFinite)) return 0;
  const t = time * ATMOSPHERE.waveSpeed;
  const qx = x + Math.sin(y * 0.8 + t * 0.7) * ATMOSPHERE.waveAmount;
  const qy = y + Math.cos(x * 0.7 - t * 0.6) * ATMOSPHERE.waveAmount;
  const field = Math.sin(qx + t * 0.60) * 0.50
    + Math.sin(qy * 0.85 - t * 0.45) * 0.45
    + Math.sin((qx + qy) * 0.65 + t * 0.35) * 0.35
    + Math.sin((qx - qy) * 0.95 - t * 0.55) * 0.25;
  return (field * 0.5 + 0.5) * ATMOSPHERE.lineCount;
}

export function createContourGrid(width, height, compact = false) {
  if (![width, height].every(v => Number.isFinite(v) && v > 0)) throw Error('Invalid contour viewport');
  const longest = compact ? ATMOSPHERE.compactCells : ATMOSPHERE.desktopCells;
  const columns = width >= height ? longest : Math.max(8, Math.round(longest * width / height));
  const rows = height >= width ? longest : Math.max(8, Math.round(longest * height / width));
  return { width, height, columns, rows, values: new Float32Array((columns + 1) * (rows + 1)) };
}

const crossing = (a, b, level) => Math.abs(b - a) < 1e-9 ? 0.5 : clampUnit((level - a) / (b - a));

/** Write line segments without allocating per-cell arrays. Reuse the grid at every frame. */
export function traceContours(grid, time, segment) {
  const { width, height, columns: nx, rows: ny, values } = grid;
  const sx = width / nx, sy = height / ny, aspect = width / height;
  for (let j = 0; j <= ny; j += 1) for (let i = 0; i <= nx; i += 1) {
    values[j * (nx + 1) + i] = contourField(((i / nx) * 2 - 1) * aspect * ATMOSPHERE.lineScale,
      ((j / ny) * 2 - 1) * ATMOSPHERE.lineScale, time);
  }
  let count = 0;
  const send = (x1, y1, x2, y2) => { segment(x1, y1, x2, y2); count += 1; };
  for (let level = 0.5; level < ATMOSPHERE.lineCount; level += 1) {
    for (let j = 0; j < ny; j += 1) for (let i = 0; i < nx; i += 1) {
      const n = j * (nx + 1) + i;
      const a = values[n], b = values[n + 1], c = values[n + nx + 2], d = values[n + nx + 1];
      const mask = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
      if (mask === 0 || mask === 15) continue;
      const x = i * sx, y = j * sy;
      const top = x + sx * crossing(a, b, level), right = y + sy * crossing(b, c, level);
      const bottom = x + sx * crossing(d, c, level), left = y + sy * crossing(a, d, level);
      switch (mask) {
        case 1: case 14: send(x, left, bottom, y + sy); break;
        case 2: case 13: send(bottom, y + sy, x + sx, right); break;
        case 3: case 12: send(x, left, x + sx, right); break;
        case 4: case 11: send(top, y, x + sx, right); break;
        case 6: case 9: send(top, y, bottom, y + sy); break;
        case 7: case 8: send(x, left, top, y); break;
        case 5: case 10: {
          // Resolve the two saddle cases from the cell's centre, avoiding random topology.
          const highCentre = (a + b + c + d) / 4 > level;
          if ((mask === 5 && highCentre) || (mask === 10 && !highCentre)) {
            send(top, y, x, left); send(x + sx, right, bottom, y + sy);
          } else { send(top, y, x + sx, right); send(x, left, bottom, y + sy); }
          break;
        }
        default: break;
      }
    }
  }
  return count;
}

/** Stable hash: scrolling backward / resizing never makes cells flicker randomly. */
export function cellNoise(column, row) {
  let h = Math.imul(column | 0, 374761393) + Math.imul(row | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function seamProgress(top, viewportHeight) {
  if (!Number.isFinite(top) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  return clampUnit(1 - top / viewportHeight);
}

export function checkerCell(column, row, rowCount, progress) {
  if (!Number.isInteger(rowCount) || rowCount < 1 || row < 0 || row >= rowCount) return null;
  const depth = row / Math.max(1, rowCount - 1) + clampUnit(progress) * ATMOSPHERE.seamLift;
  if (depth >= 1) return null;
  if (depth <= ATMOSPHERE.seamSolid) return 'paper';
  const fade = clampUnit(1 - (depth - ATMOSPHERE.seamSolid) / (1 - ATMOSPHERE.seamSolid));
  if (((column + row) & 1) || cellNoise(column, row) > fade) return null;
  return cellNoise(column + 101, row + 57) < 0.055 ? 'accent' : 'paper';
}

/** Ambient movement and scroll-linked visual transforms use the same explicit gate. */
export function canAnimateDecor({ motion, blocked, visible, hidden, reduced }) {
  return motion === true && !blocked && visible === true && !hidden && !reduced;
}
