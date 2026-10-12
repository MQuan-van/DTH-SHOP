import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useStartupAllowed } from '../../experience/loader/StartupRenderContext';
import { useProductActivity } from '../product/useProductMotion';
import ProductImage from '../catalog/components/ProductImage';
import mediaStyles from '../product/ProductDecision.module.css';
const ProductMedia = lazy(() => import('../product/ProductMedia'));
class MediaBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
/** Exactly one existing ProductMedia at a time. Grid and photo thumbnails never mount canvases. */
export default function DiscoveryStage({ product, motion, policy }) {
  const root = useRef(null), allowed = useStartupAllowed();
  const { active, blocked } = useProductActivity(root);
  const [requested, setRequested] = useState(false), [manual, setManual] = useState(false);
  useEffect(() => {
    if (!product?.modelUrl || !allowed || !active || blocked || policy.compact || policy.saveData || policy.reduced || !motion || requested) return undefined;
    // Let the short entry transition paint before lazy importing the 3D module.
    const timer = setTimeout(() => setRequested(true), 520);
    return () => clearTimeout(timer);
  }, [product?.modelUrl, allowed, active, blocked, policy.compact, policy.saveData, policy.reduced, motion, requested]);
  const poster = <div className="d174-stage-poster"><ProductImage product={product} eager />
    <span className="d174-stage-mark" aria-hidden="true">DTH</span></div>;
  const fallback = <>{poster}<p role="status" className="d174-stage-note">3D unavailable here. Open the product for more viewing options.</p></>;
  const render = requested && allowed && (manual || !policy.compact && !policy.saveData && !policy.reduced);
  return <div className={`d174-stage ${mediaStyles.page}`} ref={root} data-product-ux="17" data-discovery-stage data-stage-requested={render}>
    {render ? <MediaBoundary fallback={fallback}><Suspense fallback={<>{poster}<p className="d174-stage-note" role="status">Preparing 3D…</p></>}>
      <ProductMedia key={`${product.id}:${product.modelUrl}`} product={product} motion={motion && active && !blocked} policy={manual ? { ...policy, saveData: false } : policy} />
    </Suspense></MediaBoundary> : <>{poster}<div className="d174-stage-loader"><span>Interactive product view</span>
      {product.modelUrl && <button type="button" disabled={!allowed || blocked} onClick={() => { setManual(true); setRequested(true); }}>View in 3D <span aria-hidden="true">↗</span></button>}</div></>}
  </div>;
}
