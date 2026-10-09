import { Component, lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { matchingNVXParts, validLocalModel } from './nvx.logic.mjs';
import ProductImage from '../catalog/components/ProductImage';
import styles from './NVXGarage.module.css';
const Viewer3D = lazy(() => import('../Viewer3D'));
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function Poster({ product, note }) {
  return <div className={styles.poster}><ProductImage product={product} eager /><p role="status">{note}</p></div>;
}
export default function NVXShowcase({ vehicleId, products, vehicles, compact = false }) {
  const parts = matchingNVXParts(products, vehicles, vehicleId);
  const product = parts.find(validLocalModel) || parts[0];
  const [request3D, setRequest3D] = useState(!compact);
  return <section className={styles.showcase} aria-label="Compatible illustrative part preview" data-nvx-viewer>
    <header><span>PARTS IN PERSPECTIVE</span><span className={styles.liveDot}>3D STUDIO</span></header>
    {product ? <>
      <div className={styles.scene} key={product.id} data-nvx-enter>
        {request3D && validLocalModel(product) ? <SceneBoundary key={product.id}
          fallback={<Poster product={product} note="3D unavailable. Your vehicle selection still works." />}>
          <Suspense fallback={<Poster product={product} note="Preparing the interactive model…" />}>
            <Viewer3D product={product} />
          </Suspense>
        </SceneBoundary> : <><Poster product={product} note="Illustrative part matched in the demo catalogue." />
          {validLocalModel(product) && <button type="button" className={styles.preview3D} onClick={() => setRequest3D(true)}>Open interactive 3D ↗</button>}
        </>}
      </div>
      <div className={styles.partCaption}><div><small>DEMO PART / {product.category}</small><h3>{product.name}</h3></div>
        {!compact && <Link to={`/products/${product.slug}`} className={styles.textLink}>View part ↗</Link>}
      </div>
    </> : <div className={styles.emptyStudio}><strong>NVX</strong><p>Select an available NVX version to explore its demo parts.</p></div>}
    <p className={styles.disclaimer}>This is an interactive <b>part</b> model, not a 3D model of the motorcycle. Synthetic fitment only — not installation advice.</p>
  </section>;
}
