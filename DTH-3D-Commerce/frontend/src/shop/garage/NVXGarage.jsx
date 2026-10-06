import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isNVXId, vehicleLabel } from '../../../../shared/nvx.mjs';
import { FLOW, saveAccountVehicle } from '../api';
import { useStore } from '../useStore';
import NVXSelector, { NVXMotionToggle } from './NVXSelector';
import NVXShowcase from './NVXShowcase';
import { initialNVXSelection, matchingNVXParts } from './nvx.logic.mjs';
import useNVXMotion from './useNVXMotion';
import styles from './NVXGarage.module.css';

/** Explicit, authenticated default-vehicle change using the EXISTING account API. */
export default function NVXGarage() {
  const store = useStore(), live = useRef(false), locked = useRef(false);
  const [selected, setSelected] = useState(() => initialNVXSelection(store.data.vehicles, store.user?.savedVehicleId || store.vehicleId));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const movement = useNVXMotion(store.user?.id || 'garage');
  const saved = store.data.vehicles.find(v => v.id === store.user?.savedVehicleId && isNVXId(v.id));
  const chosen = store.data.vehicles.find(v => v.id === selected && isNVXId(v.id));
  const matches = matchingNVXParts(store.data.products, store.data.vehicles, selected);
  const staleSaved = !!store.user?.savedVehicleId && !saved;
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  // Account component is normally remounted on identity changes. This also guards external identity changes.
  useEffect(() => { setSelected(initialNVXSelection(store.data.vehicles, store.user?.savedVehicleId || store.vehicleId)); setError(''); setMessage(''); }, [store.user?.id]);
  async function save(id) {
    if (locked.current || !store.user || (id && (!isNVXId(id) || !store.data.vehicles.some(v => v.id === id)))) return;
    const epoch = store.getIdentityEpoch(), accountId = store.user.id;
    const current = () => live.current && epoch === store.getIdentityEpoch();
    const previousSaved = store.user.savedVehicleId;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const user = await saveAccountVehicle(id);
      if (!current()) return;
      if (!user || user.id !== accountId || user.savedVehicleId !== id) throw new Error('The saved vehicle response could not be verified. Refresh your account and try again.');
      store.setUser(user);
      if (id || store.vehicleId === previousSaved) store.setVehicle(id);
      setMessage(id ? (FLOW ? 'NVX saved in this demo tab.' : 'Default NVX saved to your account.') : 'Saved vehicle removed. Your bag has not changed.');
    } catch (e) {
      if (!current()) return;
      if (e.status === 401) { store.setUser(null); store.setNotice('Please sign in again to save your NVX.'); }
      else setError(e.message || 'Could not save your vehicle. Try again.');
    } finally { locked.current = false; if (live.current) setBusy(false); }
  }
  function browse() { if (chosen) store.setVehicle(chosen.id); }
  return <section ref={movement.ref} className={styles.root} data-nvx-garage data-motion={movement.motion ? 'on' : 'off'}>
    <header className={styles.heading} data-nvx-enter><div><p className={styles.eyebrow}>DTH / YAMAHA NVX</p><h2>Your ride.<br /><em>Your perspective.</em></h2><p>NVX V1. NVX V2. NVX V3. Choose the version you build around.</p></div><NVXMotionToggle {...movement} /></header>
    {staleSaved && <p className={styles.warning} role="status">Your previous saved vehicle is outside the NVX catalogue. Choose a version below to replace it. Existing orders and cart items have not been changed.</p>}
    <div className={styles.garageGrid}>
      <div className={styles.selectionPanel}>
        <form onSubmit={e => { e.preventDefault(); if (chosen) void save(chosen.id); }} aria-busy={busy}>
          <NVXSelector products={store.data.products} vehicles={store.data.vehicles} value={selected} onChange={id => { setSelected(id); setMessage(''); setError(''); }} disabled={busy || store.loading || !!store.error} />
          <div className={styles.selectedInfo} aria-live="polite"><span>SELECTED VERSION</span><strong>{vehicleLabel(chosen) || 'Select an NVX'}</strong><p>{matches.length} parts in this demo mapping.</p></div>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p className={styles.success} role="status">{message}</p>}
          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={!chosen || busy || store.loading || !!store.error}>{busy ? 'Saving…' : 'Save as my default NVX'} <span aria-hidden="true">→</span></button>
            {isNVXId(store.vehicleId) && <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setSelected(store.vehicleId); setMessage(''); }}>Use current shop selection</button>}
          </div>
        </form>
        <aside className={styles.saved} data-nvx-enter><span className={styles.eyebrow}>{saved ? (FLOW ? 'SAVED IN THIS TAB' : 'ACCOUNT DEFAULT') : 'NO NVX SAVED'}</span><h3>{vehicleLabel(saved) || 'Make room for your NVX.'}</h3><p>Restored on sign-in. Every bag line keeps its own selected version.</p>
          {store.user?.savedVehicleId && <button type="button" className={styles.textLink} disabled={busy} onClick={() => void save('')}>Remove saved vehicle</button>}
        </aside>
        {chosen && <Link to="/shop?fit=match" className={styles.browse} onClick={browse}>Explore parts for {chosen.model} <span aria-hidden="true">↗</span></Link>}
      </div>
      <NVXShowcase vehicleId={selected} products={store.data.products} vehicles={store.data.vehicles} />
    </div>
  </section>;
}
