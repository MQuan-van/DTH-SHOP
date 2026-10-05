import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { formatMoney } from '../../../../shared/domain.mjs';
import { useStore } from '../useStore';
import { SHOP_CONFIG } from './catalog.config.mjs';
import { getPriceCeiling, paginateProducts, patchShopQuery, readShopQuery, resetShopFilters, selectShopProducts } from './catalog.logic.mjs';
import { useGridMotion, useShopMotion } from './hooks/useShopMotion';
import ShopIcon from './components/ShopIcon';
import FilterPanel from './components/FilterPanel';
import ShopProductCard from './components/ShopProductCard';
import QuickView from './components/QuickView';
import ShopDialog from './components/ShopDialog';
import VehicleFitmentStrip from './fitment/VehicleFitmentStrip';
import { matchingQuery } from './fitment/fitment.logic.mjs';
import SearchDiscovery from './search/SearchDiscovery';
import styles from './ShopPage.module.css';

export default function ShopPage() {
  const { data, vehicleId, setVehicle } = useStore();
  const { chooseVehicle } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const ceiling = useMemo(() => getPriceCeiling(data.products, SHOP_CONFIG.priceStep), [data.products]);
  const query = useMemo(() => readShopQuery(params, ceiling), [params, ceiling]);
  const [searchDraft, setSearchDraft] = useState(query.search);
  const [quick, setQuick] = useState(null), [mobileFilters, setMobileFilters] = useState(false);
  const filterTrigger = useRef(null), pendingVehicleFrame = useRef(0), resultHeading = useRef(null), scrollToResults = useRef(false);
  const { motion, paused, reduced, setPaused } = useShopMotion(SHOP_CONFIG.motion.enabled);
  useEffect(() => setSearchDraft(query.search), [query.search]);
  useEffect(() => { const old = document.title; document.title = 'Shop parts — DTH Parts Studio'; return () => { document.title = old; cancelAnimationFrame(pendingVehicleFrame.current); }; }, []);
  const vehicle = data.vehicles.find(item => item.id === vehicleId);
  const visible = useMemo(() => selectShopProducts(data.products, data.vehicles, vehicleId, query), [data.products, data.vehicles, vehicleId, query]);
  const counts = useMemo(() => {
    const pool = selectShopProducts(data.products, data.vehicles, vehicleId, query, { ignoreCategories: true });
    return Object.fromEntries(SHOP_CONFIG.categories.map(c => [c.id, pool.filter(p => p.category === c.id).length]));
  }, [data.products, data.vehicles, vehicleId, query]);
  const pagination = paginateProducts(visible, query.page, SHOP_CONFIG.pageSize);
  const signature = pagination.items.map(item => item.id).join('|');
  const gridRef = useGridMotion(signature, motion, SHOP_CONFIG.motion);
  const product = quick ? data.products.find(item => item.id === quick.id && item.active !== false) : null;
  // Close stale previews if the catalog is refreshed while they are open.
  useEffect(() => { if (quick && !product) setQuick(null); }, [quick, product]);
  function update(patch, options = {}) { setParams(previous => patchShopQuery(previous, patch), options); }
  function reset() { setSearchDraft(''); setParams(previous => resetShopFilters(previous)); }
  function openVehicle() {
    setQuick(null); setMobileFilters(false);
    // Avoid overlapping native dialogs and allow focus restoration first.
    cancelAnimationFrame(pendingVehicleFrame.current);
    pendingVehicleFrame.current = requestAnimationFrame(() => chooseVehicle());
  }
  function pageChange(page) { scrollToResults.current = true; update({ page }); }
  function showCompatibleParts() {
    setQuick(null);
    scrollToResults.current = true;
    setParams(previous => matchingQuery(previous));
  }
  useEffect(() => {
    if (!scrollToResults.current) return;
    scrollToResults.current = false;
    resultHeading.current?.scrollIntoView({ block: 'start', behavior: motion ? 'smooth' : 'auto' });
    resultHeading.current?.focus({ preventScroll: true });
  }, [query.page, query.fit, quick, motion]);
  const filterProps = { query, counts, ceiling, vehicle, vehicleId, onPatch: update, onChooseVehicle: openVehicle, onReset: reset };
  const selectedFilterCount = query.categories.length + Number(Boolean(query.search)) + Number(query.maxPrice < ceiling);
  const allProductsCount = data.products.filter(item => item.active !== false).length;
  return <section className={styles.page} data-motion={motion ? 'on' : 'off'} style={{ '--shop-hover-scale': SHOP_CONFIG.motion.hoverScale, '--shop-hover-duration': `${SHOP_CONFIG.motion.hoverDurationMs}ms` }}>
    <div className={styles.container}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link to="/">Studio</Link><span aria-hidden="true">/</span><span aria-current="page">Shop parts</span></nav>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}><span />DTH / THE PARTS COLLECTION</p><h1>{SHOP_CONFIG.title}</h1><p className={styles.intro}>{SHOP_CONFIG.description}</p></div>
        <div className={styles.headingSide}><span><ShopIcon name="cube" />{allProductsCount} demo parts. Every angle.</span><button type="button" className={styles.motionButton} disabled={reduced || !SHOP_CONFIG.motion.enabled} aria-pressed={motion} onClick={() => setPaused(!paused)}>{motion ? 'Ⅱ Motion on' : '▷ Motion off'}{reduced && ' · system'}</button></div>
      </header>
      <SearchDiscovery
        products={data.products} vehicles={data.vehicles} vehicleId={vehicleId}
        query={query} params={params} value={searchDraft} onValueChange={setSearchDraft}
        onSearch={value => update({ q: value })}
        onClear={() => { setSearchDraft(''); update({ q: '' }); }}
        onReset={reset} motion={motion}
      />
      <VehicleFitmentStrip
        products={data.products} vehicles={data.vehicles} vehicleId={vehicleId}
        query={query} motion={motion} onPatch={update} onChooseVehicle={openVehicle}
        onClearVehicle={() => { setVehicle(''); update({ page: 1 }); }}
      />
      <div className={styles.catalogLayout}>
        <aside className={styles.sidebar} aria-label="Catalog filters"><FilterPanel {...filterProps} /></aside>
        <div className={styles.results}>
          <div className={styles.toolbar}><h2 ref={resultHeading} tabIndex="-1"><strong>{visible.length}</strong> parts<span> / {pagination.from}–{pagination.to} in view</span></h2><div className={styles.toolbarActions}><button ref={filterTrigger} type="button" className={`${styles.outlineButton} ${styles.mobileFilterButton}`} onClick={() => setMobileFilters(true)}><ShopIcon name="filter" />Filters{selectedFilterCount > 0 && <b>{selectedFilterCount}</b>}</button><label className={styles.sortLabel}>Sort by<select value={query.sort} aria-label="Sort parts" onChange={e => update({ sort: e.target.value })}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A–Z</option></select></label></div></div>
          <p className={styles.srOnly} role="status" aria-live="polite">{visible.length} products found. Page {pagination.page} of {pagination.pages}.</p>
          {selectedFilterCount > 0 && <div className={styles.chips} aria-label="Active product filters">
            {query.search && <button type="button" className={styles.chip} aria-label={`Remove search ${query.search}`} onClick={() => update({ q: '' })}>“{query.search}”<ShopIcon name="close" /></button>}
            {query.categories.map(c => <button type="button" className={styles.chip} key={c} aria-label={`Remove category ${c}`} onClick={() => update({ category: query.categories.filter(item => item !== c) })}>{SHOP_CONFIG.categories.find(item => item.id === c)?.label}<ShopIcon name="close" /></button>)}
            {query.maxPrice < ceiling && <button type="button" className={styles.chip} onClick={() => update({ max: '' })}>Up to {formatMoney(query.maxPrice)}<ShopIcon name="close" /></button>}
            <button type="button" className={styles.textButton} onClick={reset}>Clear filters</button>
          </div>}
          {visible.length ? <><ul ref={gridRef} className={styles.grid} aria-label="Products">
            {pagination.items.map((item, index) => <li data-shop-id={item.id} key={item.id}><ShopProductCard product={item} vehicleId={vehicleId} vehicles={data.vehicles} motion={motion} eager={index < 3} onQuickView={(id, trigger) => setQuick({ id, trigger })} /></li>)}
          </ul><nav className={styles.pagination} aria-label="Catalog pagination"><span>{pagination.from}–{pagination.to} of {pagination.total} parts</span><div><button type="button" className={styles.pageButton} disabled={pagination.page === 1} onClick={() => pageChange(pagination.page - 1)} aria-label="Previous page">←</button>{Array.from({ length: pagination.pages }, (_, index) => index + 1).map(page => <button type="button" key={page} className={styles.pageButton} aria-current={page === pagination.page ? 'page' : undefined} aria-label={`Page ${page}`} onClick={() => pageChange(page)}>{page}</button>)}<button type="button" className={styles.pageButton} disabled={pagination.page === pagination.pages} onClick={() => pageChange(pagination.page + 1)} aria-label="Next page">→</button></div></nav></> : <div className={styles.empty}><span><ShopIcon name="search" /></span><h3>No matching parts.</h3><p>Try a broader search, a different price limit or another demo vehicle. Your selected vehicle will not be cleared automatically.</p><div><button className={styles.primaryButton} type="button" onClick={reset}>Reset product filters</button><button className={styles.outlineButton} type="button" onClick={openVehicle}>Change vehicle</button>{vehicleId && query.fit === 'match' && <button className={styles.textButton} type="button" onClick={() => update({ fit: 'all' })}>Show all parts</button>}</div></div>}
          <p className={styles.catalogNote}><ShopIcon name="info" />Illustrative products and prices. Compatibility is based on synthetic demo data. No real transactions.</p>
        </div>
      </div>
    </div>
    {mobileFilters && <ShopDialog title="Refine your search" onClose={() => setMobileFilters(false)} restoreFocus={filterTrigger.current} motion={motion} duration={SHOP_CONFIG.motion.modalDurationMs} className={styles.filterDialog}><FilterPanel {...filterProps} /><footer className={styles.filterDialogFooter}><button type="button" className={styles.primaryButton} onClick={() => setMobileFilters(false)}>Show {visible.length} parts<ShopIcon name="arrow" /></button></footer></ShopDialog>}
    {product && <QuickView key={product.id} product={product} trigger={quick.trigger} onClose={() => setQuick(null)} onChooseVehicle={openVehicle} onExploreMatches={showCompatibleParts} motion={motion} />}
  </section>;
}
