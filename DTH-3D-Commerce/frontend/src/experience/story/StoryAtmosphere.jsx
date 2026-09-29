import { useEffect, useRef, useState } from 'react';
import { ATMOSPHERE, canvasSize, checkerCell, seamProgress, createContourGrid, traceContours, canAnimateDecor } from './atmosphere/atmosphereMath.mjs';
import { getAtmosphereTicker } from './atmosphere/frameLoop.mjs';
import styles from './StoryAtmosphere.module.css';

/** A 2D decoration never uses signal.active: that flag belongs to the HERO's 3D frame.
 * Each section has its own viewport gate, sharing only motion/overlay preferences.
 */
function useDecorativeCanvas(canvasRef, regionRef, signal, { kind, compact, tone }) {
  const [failed, setFailed] = useState(false);
  const time = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current, host = regionRef.current;
    if (!canvas || !host) return;
    let context;
    try { context = canvas.getContext('2d'); } catch { context = null; }
    if (!context) { setFailed(true); return; }
    let live = true, subscription, grid, dimensions = { width: 0, height: 0 }, progress = 0, draws = 0;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches;
    const box = host.getBoundingClientRect();
    let visible = box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
    let colors = { line: '#cad9df', paper: '#f7fafb', accent: '#02d2e3' };
    const available = () => live && visible && !document.hidden && dimensions.width > 0 && dimensions.height > 0;
    const moving = () => canAnimateDecor({ ...signal.state, visible, hidden: document.hidden, reduced });
    function paint({ delta }) {
      if (!live) return;
      try {
        const { width, height } = dimensions;
        context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        context.clearRect(0, 0, width, height);
        if (kind === 'contour') {
          if (moving()) time.current += delta;
          context.strokeStyle = colors.line;
          context.globalAlpha = tone === 'dark' ? 0.36 : 0.72;
          context.lineWidth = tone === 'dark' ? 0.9 : 1.0;
          context.beginPath();
          traceContours(grid, time.current, (x1, y1, x2, y2) => { context.moveTo(x1, y1); context.lineTo(x2, y2); });
          context.stroke(); context.globalAlpha = 1;
        } else if (signal.state.motion && !reduced) {
          // This only redraws on native scroll / resize. It does not drive the page's scroll.
          if (!signal.state.blocked) progress = seamProgress(host.getBoundingClientRect().top, window.innerHeight);
          const cell = ATMOSPHERE.seamCell, columns = Math.ceil(width / cell), rows = Math.ceil(height / cell);
          for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
            const color = checkerCell(column, row, rows, progress);
            if (!color) continue;
            context.fillStyle = color === 'accent' ? colors.accent : colors.paper;
            context.fillRect(column * cell, row * cell, cell, cell);
          }
        }
        draws += 1;
        if (import.meta.env.VITE_EXPERIENCE_TESTS === 'true') {
          canvas.dataset.atmosphereTime = time.current.toFixed(4);
          canvas.dataset.atmosphereDraws = String(draws);
          canvas.dataset.seamProgress = progress.toFixed(4);
          canvas.dataset.atmosphereMoving = String(moving());
        }
      } catch (error) {
        subscription?.stop(); setFailed(true);
        console.warn('DTH Story decoration unavailable; content remains usable.', error);
      }
    }
    function measure() {
      const rect = canvas.getBoundingClientRect();
      dimensions = { width: rect.width, height: rect.height };
      const size = canvasSize(rect.width, rect.height, window.devicePixelRatio);
      if (!size.width || !size.height) { subscription?.invalidate(); return; }
      if (canvas.width !== size.width) canvas.width = size.width;
      if (canvas.height !== size.height) canvas.height = size.height;
      if (kind === 'contour') grid = createContourGrid(rect.width, rect.height, compact);
      const tokens = getComputedStyle(host);
      colors = {
        line: tokens.getPropertyValue('--atmosphere-line').trim() || (tone === 'dark' ? '#66808d' : '#cad9df'),
        paper: tokens.getPropertyValue('--story-paper').trim() || '#f7fafb',
        accent: tokens.getPropertyValue('--story-accent').trim() || '#02d2e3',
      };
      subscription?.invalidate();
    }
    measure();
    subscription = getAtmosphereTicker().subscribe({ render: paint, enabled: available,
      animate: () => kind === 'contour' && moving(), interval: 1000 / ATMOSPHERE.fps });
    const update = () => subscription.invalidate();
    const preference = () => { reduced = media.matches; update(); };
    const stopSignal = signal.subscribe(update);
    const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; update();
    }, { threshold: 0 }) : null;
    observer?.observe(host);
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    resize?.observe(canvas);
    window.addEventListener('resize', measure, { passive: true });
    if (kind === 'seam') window.addEventListener('scroll', update, { passive: true });
    document.addEventListener('visibilitychange', update);
    media.addEventListener('change', preference);
    return () => {
      live = false; subscription.stop(); stopSignal(); observer?.disconnect(); resize?.disconnect();
      window.removeEventListener('resize', measure);
      if (kind === 'seam') window.removeEventListener('scroll', update);
      document.removeEventListener('visibilitychange', update); media.removeEventListener('change', preference);
    };
  }, [canvasRef, regionRef, signal, kind, compact, tone]);
  return failed;
}

function StaticContours() {
  return <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M-90 170C140 80 290 154 367 271S324 523 173 606S-42 816 53 954" />
      <path d="M-130 225C102 117 248 204 299 290S288 483 135 553S-58 763-7 904" />
      <path d="M1219-90C1044 79 1205 173 1157 307S951 430 966 578S1125 701 1168 812S1232 966 1420 897" />
    </g>
  </svg>;
}

export function StoryContour({ signal, regionRef, compact = false, tone = 'light', fallback }) {
  const canvas = useRef(null);
  const failed = useDecorativeCanvas(canvas, regionRef, signal, { kind: 'contour', compact, tone });
  return <div className={styles.contour} data-tone={tone} aria-hidden="true">
    <canvas ref={canvas} data-story-contour={tone} hidden={failed} />
    {failed && (fallback || <StaticContours />)}
  </div>;
}

export function StoryCheckerSeam({ signal, compact = false }) {
  const host = useRef(null), canvas = useRef(null);
  const failed = useDecorativeCanvas(canvas, host, signal, { kind: 'seam', compact, tone: 'dark' });
  return <div ref={host} className={styles.seam} data-story-seam aria-hidden="true">
    <canvas ref={canvas} hidden={failed} />
    {failed && <div className={styles.seamFallback} />}
  </div>;
}
