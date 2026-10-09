import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehicleCaption } from '../../catalog/fitment/fitment.logic.mjs';
import { CATEGORY_LABELS } from '../productDecision.logic.mjs';
import { useProductActivity } from '../useProductMotion';
import { recommendationBrowseHref, recommendationSignature, selectProductRecommendations } from './recommendation.logic.mjs';
import { useRecommendationEntrance } from './useRecommendationMotion';
import RecommendationCard from './RecommendationCard';
import styles from './ProductRecommendations.module.css';

const TEXT = {
  build: { eyebrow: 'DTH / SAME VEHICLE. NEW POSSIBILITIES.', title: 'Complete your build.',
    note: 'Explore other categories mapped to your selected vehicle. Each part matches individually; this is not a validated kit.' },
  alternatives: { eyebrow: 'DTH / FIND YOUR NEXT MATCH', title: 'Compatible alternatives.',
    note: 'This part has no match in the demo data. These alternatives are from the same category and map to your selected vehicle.' },
  unknown: { eyebrow: 'DTH / COMPATIBILITY NOT ESTABLISHED', title: 'Known demo matches.',
    note: 'The current part has no established compatibility result. The parts below have a mapping for your selected vehicle in this category.' },
  unselected: { eyebrow: 'DTH / START WITH YOUR VEHICLE', title: 'Find the right direction.',
    note: 'Select a vehicle before we suggest compatible parts. We do not guess a match from the product image or 3D model.' },
  'unknown-vehicle': { eyebrow: 'DTH / CHECK YOUR VEHICLE', title: 'Your vehicle needs an update.',
    note: 'The saved vehicle is missing or ambiguous in this catalog. Choose a listed vehicle to see mapped recommendations.' },
  unavailable: { eyebrow: 'DTH / CATALOG UPDATE', title: 'Recommendations unavailable.',
    note: 'This product cannot be used as a recommendation reference. Browse the current catalog or choose another vehicle.' },
};

export default function ProductRecommendations({ product, products, vehicles, vehicleId, fromShop, onChooseVehicle, motion = false }) {
  const root = useRef(null), track = useRef(null), heading = useRef(null), focusedId = useRef(null);
  const titleId = useId(), trackId = useId();
  const result = useMemo(() => selectProductRecommendations({ currentProduct: product, products, vehicles, vehicleId }),
    [product, products, vehicles, vehicleId]);
  const text = TEXT[result.mode], signature = recommendationSignature(result);
  const { active, blocked } = useProductActivity(root);
  const animated = !!motion && active && !blocked;
  const label = result.vehicle ? vehicleCaption(result.vehicle) : '';
  const browseHref = recommendationBrowseHref(result.mode, result.category);
  const [edges, setEdges] = useState({ start: true, end: true });
  const scopeKey = `${product?.id || ''}:${vehicleId || ''}`;
  useRecommendationEntrance(root, signature, animated);
  useLayoutEffect(() => {
    if (track.current) track.current.scrollLeft = 0;
  }, [scopeKey]);
  useLayoutEffect(() => {
    if (focusedId.current && !result.items.some(item => item.id === focusedId.current)) {
      // Restore focus only when React removed the focused card, never steal it
      // from a vehicle picker, Support, browser chrome or another page control.
      if (document.activeElement === document.body) heading.current?.focus({ preventScroll: true });
      focusedId.current = null;
    }
  }, [signature, result.items]);
  useEffect(() => {
    const node = track.current; if (!node) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const start = node.scrollLeft <= 2, end = node.scrollLeft + node.clientWidth >= node.scrollWidth - 2;
      setEdges(old => old.start === start && old.end === end ? old : { start, end });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observer?.observe(node); node.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true }); measure();
    return () => { observer?.disconnect(); cancelAnimationFrame(frame); node.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [signature]);
  function slide(direction) {
    const node = track.current;
    if (!node || blocked) return;
    node.scrollBy({ left: direction * node.clientWidth * .85, behavior: animated ? 'smooth' : 'auto' });
  }
  const vehicleKnown = !!result.vehicle;
  const empty = result.mode === 'build'
    ? 'No other product categories currently have a matching part in this demo catalog.'
    : `No other ${CATEGORY_LABELS[result.category]?.toLowerCase() || 'product'} parts in this catalog are mapped to this vehicle.`;
  const announcement = result.items.length
    ? `${result.items.length} ${result.mode === 'build' ? 'parts from other categories' : 'same-category parts'} match ${label} in the demo data.`
    : vehicleKnown && ['build','unknown','alternatives'].includes(result.mode) ? empty : text.note;
  return <section ref={root} id="dth-product-recommendations" className={styles.recommendations}
    data-product-recommendations data-rec-mode={result.mode} data-motion={animated ? 'on' : 'off'} aria-labelledby={titleId}
    onFocusCapture={event => { const card = event.target.closest('[data-rec-id]'); if (card) focusedId.current = card.dataset.recId; }}
    onBlurCapture={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusedId.current = null; }}>
    <div className={styles.rule} aria-hidden="true"><i data-rec-sweep /></div>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>{text.eyebrow}</p>
        <h2 id={titleId} ref={heading} tabIndex={-1}>{text.title}</h2>
        <p className={styles.intro}>{text.note}</p>
      </div>
      <div className={styles.vehicle}>
        <span>SELECTED VEHICLE</span><strong>{label || (vehicleId ? 'Not in this catalog' : 'Not selected')}</strong>
        <button type="button" onClick={onChooseVehicle} disabled={blocked}>
          {vehicleId ? 'Change vehicle' : 'Select vehicle'} <span aria-hidden="true">↗</span>
        </button>
      </div>
    </header>
    <p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {result.items.length ? <>
      <div className={styles.resultsBar}><p><strong>{String(result.items.length).padStart(2,'0')}</strong> mapped suggestions <span> / demo catalog</span></p>
        {result.items.length > 1 && <div className={styles.trackControls}>
          <button type="button" aria-label="Previous recommendations" aria-controls={trackId} disabled={edges.start || blocked} onClick={() => slide(-1)}>←</button>
          <button type="button" aria-label="Next recommendations" aria-controls={trackId} disabled={edges.end || blocked} onClick={() => slide(1)}>→</button>
        </div>}
      </div>
      <ul id={trackId} ref={track} className={styles.grid} data-count={result.items.length} style={{ '--rec-columns': result.items.length }} data-recommendation-track aria-label={text.title}>
        {result.items.map((item, index) => <li key={item.id} data-rec-enter>
          <RecommendationCard product={item} vehicleLabel={label} fromShop={fromShop} index={index} motion={animated}/>
        </li>)}
      </ul>
      <div className={styles.footer}>
        <p>Demo mappings only. Verify real fitment with your supplier. {result.mode === 'build' ? 'Not a bundle or installation guide.' : 'Same category; not a claim of identical specifications.'}</p>
        <Link to={browseHref}>{result.mode === 'build' ? 'Browse matching parts' : 'All matches in this category'} <span aria-hidden="true">↗</span></Link>
      </div>
      <details className={styles.explanation}><summary>Why these parts?</summary>
        <p>Only active, linkable parts with a valid VND price and a matching vehicle mapping are eligible. Featured items come first; ties use price distance, name and ID. {result.mode === 'build' ? 'One item is selected within each other category.' : 'Only the current category is considered.'} This is a rules-based selection, not an AI or quality rating. Shop search filters are kept in your Back to parts link, but do not restrict this section.</p>
      </details>
    </> : <div className={styles.empty} data-rec-enter>
      <span className={styles.emptyMark} aria-hidden="true">{result.mode === 'unselected' ? '+' : '—'}</span>
      <div><h3>{vehicleKnown && result.mode !== 'unavailable' ? 'No mapped suggestions yet.' : result.mode === 'unselected' ? 'Start with your ride.' : 'A clearer match starts with the catalog.'}</h3>
        <p>{vehicleKnown && result.mode !== 'unavailable' ? empty : text.note}</p>
        <div className={styles.emptyActions}>
          <button type="button" onClick={onChooseVehicle} disabled={blocked}>{vehicleId ? 'Change vehicle' : 'Select vehicle'} <span aria-hidden="true">↗</span></button>
          <Link to="/shop">Browse all parts <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>}
  </section>;
}
