import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useProduct3DProfile } from '../../shop/product/3d/useProduct3DProfile.js';
import { useProfiledModel } from '../../shop/product/3d/useProfiledModel.js';
import { galleryKey24 } from '../galleryDemo24/gallery-demo.logic.mjs';
import { captureShelfPoster25, describeProduct25, nextShelfCapture25 } from './shelf-capture25.logic.mjs';

function CaptureFrame25({ asset, descriptor, product, onDone }) {
  const invalidate = useThree(state => state.invalidate);
  const pending = useRef(true);
  useLayoutEffect(() => { invalidate(); }, [invalidate]);
  useFrame(({ gl, scene }) => {
    if (!pending.current || document.hidden) return;
    pending.current = false;
    let poster = null;
    try { poster = captureShelfPoster25(gl, scene, asset, descriptor, product); }
    catch { /* A shelf failure leaves the hero renderer and original model in service. */ }
    onDone(poster);
  }, -.5);
  return null;
}

function CaptureLoader25({ product, onDone }) {
  const profile = useProduct3DProfile(product);
  const asset = useProfiledModel(product, profile, () => onDone(null));
  const descriptor = useMemo(() => describeProduct25(asset, product), [asset, product]);
  useEffect(() => {
    if (asset) {
      if (!descriptor) onDone(null);
      return undefined;
    }
    const timer = setTimeout(() => onDone(null), 45000);
    return () => clearTimeout(timer);
  }, [asset, descriptor, onDone]);
  return descriptor && <CaptureFrame25 asset={asset} descriptor={descriptor} product={product} onDone={onDone} />;
}

/** One visible job at a time. A resident asset is borrowed only for the draw. */
export default function ShelfCapture25({ products, registry, allowed, onPoster }) {
  const [job, setJob] = useState(null);
  const [hidden, setHidden] = useState(() => document.hidden);
  const completed = useRef(new Set());
  const latest = useRef(null);
  latest.current = { products, allowed, onPoster, job };
  const eligible = allowed && !hidden;
  const active = eligible && job && products.some(product => galleryKey24(product) === job.key);
  const requestKeys = products.map(galleryKey24).join('\0');

  useEffect(() => {
    const visible = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visible);
    return () => document.removeEventListener('visibilitychange', visible);
  }, []);
  useEffect(() => {
    const requested = new Set(latest.current.products.map(galleryKey24));
    for (const key of completed.current) if (!requested.has(key)) completed.current.delete(key);
    if (job && !active) { setJob(null); return undefined; }
    if (!eligible || job || !products.length) return undefined;
    // Yield to the selected product and input before starting each bounded capture.
    const timer = setTimeout(() => {
      if (document.hidden) return;
      const next = nextShelfCapture25(latest.current.products, completed.current, registry.entries);
      if (next) setJob(next);
    }, 160);
    return () => clearTimeout(timer);
  }, [active, eligible, job, requestKeys, registry]);

  const finish = useCallback(poster => {
    const current = latest.current;
    if (current.job !== job || !current.allowed || document.hidden || completed.current.has(job.key)) return;
    if (!current.products.some(product => galleryKey24(product) === job.key)) return;
    completed.current.add(job.key);
    setJob(null);
    current.onPoster(job.key, poster);
  }, [job]);

  if (!active) return null;
  const resident = registry.entries.get(job.product.id);
  if (resident?.posterKey === job.key) {
    return <CaptureFrame25 key={job.key} asset={resident.asset} descriptor={resident.descriptor} product={job.product} onDone={finish} />;
  }
  return <CaptureLoader25 key={job.key} product={job.product} onDone={finish} />;
}
