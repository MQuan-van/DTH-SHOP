import { Component, lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import { validLocalModel } from '../../garage/nvx.logic.mjs';
import ProductImage from '../../catalog/components/ProductImage';
import useGarageMotion from './useGarageMotion';
import styles from './GarageWorkspace.module.css';
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Poster({ product, label = 'Preparing 3D…' }) {
  return <div className={styles.poster}><ProductImage product={product} eager /><span role="status">{label}</span></div>;
}
export default function GarageStage({ parts, vehicleId }) {
  const [selection, setSelection] = useState({ vehicleId, id: '' }), [attempt, setAttempt] = useState(0);
  const chosen = selection.vehicleId === vehicleId ? selection.id : '';
  const Viewer3D = useMemo(() => lazy(() => import('../../Viewer3D')), [attempt]);
  const product = parts.find(p => p.id === chosen) || parts.find(validLocalModel) || parts[0];
  const motion = useGarageMotion(product ? `${product.id}:${product.modelUrl}` : 'empty', '[data-garage-stage-enter]');
  // Keep the stage mounted; a new part remounts only its existing viewer boundary.
  if (!product) return <div className={styles.emptyStage} aria-label="Part preview"><span aria-hidden="true">NVX</span><p>{vehicleId ? 'No matching parts yet.' : 'Your next build.'}</p></div>;
  const fallback = <div><Poster product={product} label="3D unavailable. Product details are still available." />
    <button className={styles.textButton} type="button" onClick={() => setAttempt(n => n + 1)}>Retry 3D</button></div>;
  return <section ref={motion.ref} className={styles.stage} data-garage-stage aria-label="Interactive part preview">
    <div className={styles.stageBar}><span className={styles.stageLabel}>PART PREVIEW</span>
      {parts.length > 1 && <label className={styles.partSelect}><span className={styles.srOnly}>Preview part</span>
        <select aria-label="Preview part" value={product.id} onChange={e => { setSelection({ vehicleId, id: e.target.value }); setAttempt(0); }}>
          {parts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>}
    </div>
    <div className={styles.scene} key={`${product.id}:${product.modelUrl}:${attempt}`} data-garage-stage-enter>
      {validLocalModel(product) ? <SceneBoundary fallback={fallback}>
        <Suspense fallback={<Poster product={product} />}><Viewer3D product={product} /></Suspense>
      </SceneBoundary> : <Poster product={product} label="Image preview" />}
    </div>
    <div className={styles.partCaption}><div><Link to={`/products/${product.slug}`}>{product.name}</Link><span>{formatMoney(product.price)}</span></div>
      <Link className={styles.iconButton} to={`/products/${product.slug}`} aria-label={`View ${product.name}`}>↗</Link>
    </div>
  </section>;
}
