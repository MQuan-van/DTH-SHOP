import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { formatMoney } from '../../../../../shared/domain.mjs';
import ProductImage from '../components/ProductImage';
import ShopIcon from '../components/ShopIcon';
import { describeFit } from '../catalog.logic.mjs';
import { SHOP_CONFIG } from '../catalog.config.mjs';
import { SEARCH_DISCOVERY, cleanSearch, highlightPieces, nextSuggestionIndex, productPath, searchReturnUrl, suggestProducts } from './search.logic.mjs';
import styles from './SearchDiscovery.module.css';

function Match({ children, term }) {
  return highlightPieces(children, term).map((piece, index) => piece.match
    ? <mark key={index}>{piece.text}</mark> : <span key={index}>{piece.text}</span>);
}

/** Catalog-only progressive enhancement; never creates a WebGL renderer or changes data. */
export default function SearchDiscovery({ products, vehicles, vehicleId, query, params, value, onValueChange, onSearch, onClear, onReset, motion }) {
  const root = useRef(null), field = useRef(null), list = useRef(null), composing = useRef(false), suppressFocus = useRef(false);
  const navigate = useNavigate(), location = useLocation(), navigationType = useNavigationType();
  const id = useId().replace(/:/g, '');
  const listId = `dth-discovery-${id}`, helpId = `${listId}-help`;
  const [open, setOpen] = useState(false), [selection, setSelection] = useState(null), [isComposing, setComposing] = useState(false);
  const [layout, setLayout] = useState({ inline: false, height: 500 });
  const results = useMemo(() => suggestProducts(products, vehicles, vehicleId, query, value), [products, vehicles, vehicleId, query, value]);
  const signature = JSON.stringify([results.term, vehicleId, query.categories, query.maxPrice, query.fit, query.sort, results.items.map(p => [p.id, p.price])]);
  const selectedIndex = selection?.signature === signature ? results.items.findIndex(p => p.id === selection.id) : -1;
  const expanded = open && results.eligible && !isComposing;
  const preview = results.items[selectedIndex < 0 ? 0 : selectedIndex];
  const choose = index => setSelection(index < 0 || !results.items[index] ? null : { id: results.items[index].id, signature });
  const close = () => { setOpen(false); setSelection(null); };

  // Browser Back returns to the committed search URL and restores focus, not the popup.
  useEffect(() => {
    if (navigationType !== 'POP' || !location.state?.dthSearchReturn) return;
    const frame = requestAnimationFrame(() => { suppressFocus.current = true; field.current?.focus({ preventScroll: true }); suppressFocus.current = false; });
    return () => cancelAnimationFrame(frame);
  }, []); // Deliberately once per mounted search, not on every query edit.

  useEffect(() => {
    if (!expanded) return;
    const dismissOutside = event => { if (!root.current?.contains(event.target)) close(); };
    const block = () => { if (document.hidden || document.querySelector('dialog[open], .dth-support-panel')) close(); };
    const observer = new MutationObserver(block);
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('visibilitychange', block);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    block();
    return () => { observer.disconnect(); document.removeEventListener('pointerdown', dismissOutside, true); document.removeEventListener('visibilitychange', block); };
  }, [expanded]);

  useLayoutEffect(() => {
    if (!expanded || !root.current) return;
    const measure = () => {
      const viewport = window.visualViewport;
      const available = (viewport?.height || window.innerHeight) + (viewport?.offsetTop || 0) - root.current.querySelector('form').getBoundingClientRect().bottom - 20;
      const inline = window.innerWidth < 760 || available < 220;
      const height = inline ? Math.min(520, Math.max(240, (viewport?.height || window.innerHeight) * .7)) : Math.min(540, available);
      setLayout(previous => previous.inline === inline && previous.height === height ? previous : { inline, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root.current); measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    window.visualViewport?.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure); window.visualViewport?.removeEventListener('resize', measure); };
  }, [expanded]);

  useLayoutEffect(() => {
    const container = list.current;
    if (!expanded || !container || selectedIndex < 0) return;
    const node = container.querySelector(`[data-suggestion-index="${selectedIndex}"]`);
    if (!node) return;
    const a = node.getBoundingClientRect(), b = container.getBoundingClientRect();
    if (a.top < b.top) container.scrollTop -= b.top - a.top;
    else if (a.bottom > b.bottom) container.scrollTop += a.bottom - b.bottom;
  }, [expanded, selectedIndex]);

  function submit(event) {
    event?.preventDefault();
    if (composing.current) return;
    close(); onSearch(cleanSearch(value));
  }
  function openProduct(product, event) {
    const to = productPath(product);
    if (!to) return;
    // Modified link clicks keep normal browser new-tab behavior.
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    event?.preventDefault(); close();
    const returnUrl = searchReturnUrl(params, value);
    // BrowserRouter commits history synchronously. Both destinations are absolute;
    // no timeout or queued stale callback can reopen a product after unmount.
    navigate(returnUrl, { replace: true, state: { ...location.state, dthSearchReturn: true } });
    navigate(to, { state: { fromCatalog: returnUrl } });
  }
  function keys(event) {
    if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
      if (event.key === 'Enter') event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!results.eligible || !results.items.length) return;
      event.preventDefault(); setOpen(true);
      choose(nextSuggestionIndex(expanded ? selectedIndex : -1, results.items.length, event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Escape') {
      if (expanded) { event.preventDefault(); event.stopPropagation(); close(); }
    } else if (event.key === 'Enter' && expanded && selectedIndex >= 0) {
      event.preventDefault(); openProduct(results.items[selectedIndex]);
    } else if (event.key === 'Tab') close();
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') setSelection(null);
  }
  function tilt(event) {
    if (!motion || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
    event.currentTarget.style.setProperty('--tilt-x', `${-y * 5}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${x * 7}deg`);
  }
  const categoryLabel = product => SHOP_CONFIG.categories.find(c => c.id === product.category)?.label || 'Collection';
  const announcement = expanded ? `${results.total} matching parts. ${results.items.length} suggestions. Use arrow keys to choose a product; Enter to open, or Enter without a selection to search all results.` : '';
  return <div ref={root} className={styles.discovery} data-search-discovery data-motion={motion ? 'on' : 'off'} data-open={expanded} data-inline={layout.inline}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}>
    <form className={styles.searchBar} role="search" aria-label="Search product catalog" onSubmit={submit}>
      <ShopIcon name="search" />
      <label className={styles.srOnly} htmlFor="dth-shop-search">Search parts by name or finish</label>
      <input ref={field} id="dth-shop-search" name="q" type="search" role="combobox" aria-autocomplete="list"
        aria-expanded={expanded} aria-controls={expanded ? listId : undefined}
        aria-activedescendant={expanded && selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
        aria-describedby={helpId} autoComplete="off" maxLength={SEARCH_DISCOVERY.maxLength}
        placeholder="Search suspension, wheels, exhausts…" value={value}
        onChange={event => { onValueChange(event.target.value); setSelection(null); setOpen(true); }}
        onFocus={() => { if (!suppressFocus.current) setOpen(true); }} onClick={() => setOpen(true)} onKeyDown={keys}
        onCompositionStart={() => { composing.current = true; setComposing(true); }}
        onCompositionEnd={event => { composing.current = false; setComposing(false); onValueChange(event.currentTarget.value); setSelection(null); setOpen(true); }} />
      {value && <button className={styles.clearButton} type="button" aria-label="Clear search" onClick={() => { close(); onClear(); field.current?.focus(); }}><ShopIcon name="close" /></button>}
      <button type="submit" className={styles.searchButton}>Search <ShopIcon name="arrow" /></button>
    </form>
    <p id={helpId} className={styles.srOnly}>Type at least two characters for product suggestions. Current filters and selected demo vehicle still apply.</p>
    <span role="status" aria-live="polite" aria-atomic="true" className={styles.srOnly}>{announcement}</span>
    {expanded && <div className={styles.panel} data-search-panel style={{ '--panel-height': `${layout.height}px` }}>
      <div className={styles.panelHeader}><span>FIND YOUR NEXT PART</span><span>{results.total} matches · current filters</span></div>
      <div className={styles.panelBody}>
        <div className={styles.optionsColumn}>
          <ul ref={list} id={listId} role="listbox" aria-label="Suggested products" className={styles.options}>
            {results.items.map((product, index) => {
              const fit = describeFit(product, vehicleId, vehicles);
              return <li key={product.id} role="presentation" style={{ '--row-delay': `${Math.min(index, 3) * 25}ms` }}>
                <a id={`${listId}-${index}`} role="option" tabIndex={-1} aria-selected={selectedIndex === index}
                  aria-label={`${product.name}, ${formatMoney(product.price)}. ${fit.label}`}
                  className={styles.option} href={productPath(product)} data-suggestion-index={index}
                  onMouseDown={event => { if (event.button === 0) event.preventDefault(); }}
                  onPointerEnter={event => { if (event.pointerType === 'mouse') choose(index); }} onPointerMove={tilt}
                  onPointerLeave={event => { event.currentTarget.style.removeProperty('--tilt-x'); event.currentTarget.style.removeProperty('--tilt-y'); }}
                  onClick={event => openProduct(product, event)}>
                  <span className={styles.thumbnail} aria-hidden="true"><ProductImage product={product} eager className={styles.thumbnailImage} /></span>
                  <span className={styles.optionCopy}>
                    <span className={styles.category}>{categoryLabel(product)}</span>
                    <strong><Match term={results.term}>{product.name}</Match></strong>
                    <span className={styles.fit} data-fit={fit.status}>{fit.label}</span>
                  </span>
                  <span className={styles.optionEnd}><span>{formatMoney(product.price)}</span><ShopIcon name="arrow" /></span>
                </a>
              </li>;
            })}
          </ul>
          {!results.items.length && <div className={styles.empty}><ShopIcon name="search" /><strong>No parts match “{results.term}”.</strong><p>Try another term or reset product filters. Your selected vehicle will be kept.</p><button type="button" onClick={() => { close(); onReset(); field.current?.focus(); }}>Reset product filters <span aria-hidden="true">↗</span></button></div>}
        </div>
        {preview && <aside className={styles.preview} aria-hidden="true">
          <div className={styles.previewScene} key={preview.id}>
            <span className={styles.orbit} /><span className={styles.base} /><span className={styles.corner} />
            <ProductImage product={preview} eager className={styles.previewImage} />
          </div>
          <span className={styles.category}>IMAGE STUDY / {String((selectedIndex < 0 ? 0 : selectedIndex) + 1).padStart(2, '0')}</span>
          <strong>{preview.name}</strong><span>{preview.finish}</span>
        </aside>}
      </div>
      <div className={styles.panelFooter}>
        <span>↑ ↓ select · Enter open · Esc close</span>
        <button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={submit}>View all {results.total} results <ShopIcon name="arrow" /></button>
      </div>
    </div>}
  </div>;
}
