import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NVX_VEHICLES, publishedNVXVehicles } from '../../../../../shared/nvx.mjs';
import { FLOW } from '../../api';
import { useStore } from '../../useStore';
import { matchingNVXParts } from '../../garage/nvx.logic.mjs';
import { pickGarageVehicle } from './garageClient.mjs';
import useGarage from './useGarage';
import useGarageMotion from './useGarageMotion';
import GarageDialog from './GarageDialog';
import GarageStage from './GarageStage';
import styles from './GarageWorkspace.module.css';

export default function GarageWorkspace() {
  const store = useStore(), state = useGarage(), { garage, loading, busy, error, message } = state;
  const [preferred, setPreferred] = useState(store.vehicleId), [dialog, setDialog] = useState(null);
  const [candidate, setCandidate] = useState('');
  const selection = pickGarageVehicle(garage, preferred, store.vehicleId);
  const vehicle = NVX_VEHICLES.find(v => v.id === selection);
  const available = publishedNVXVehicles(store.data.vehicles);
  const canBrowse = !!vehicle && available.some(v => v.id === selection) && !store.loading && !store.error;
  const parts = canBrowse ? matchingNVXParts(store.data.products, store.data.vehicles, selection) : [];
  const choices = available.filter(v => !garage.vehicleIds.includes(v.id));
  const disabled = loading || busy || store.loading || !!store.error;
  const movement = useGarageMotion(garage.vehicleIds.join(':'));
  const addButton = useRef(null), heading = useRef(null);
  const isDefault = selection && garage.defaultVehicleId === selection;
  useEffect(() => {
    if (dialog === 'add' && !choices.some(v => v.id === candidate)) setCandidate(choices[0]?.id || '');
  }, [dialog, candidate, choices.map(v => v.id).join(':')]);
  function openAdd() { setCandidate(choices[0]?.id || ''); setDialog('add'); }
  async function add(event) {
    event.preventDefault();
    if (!candidate || disabled) return;
    if (await state.mutate('add', candidate)) { setPreferred(candidate); setDialog(null); }
  }
  async function remove() {
    const id = dialog?.remove;
    if (!id || disabled) return;
    if (await state.mutate('remove', id)) {
      setDialog(null);
      // Removed card no longer owns focus; use a stable heading instead.
      heading.current?.focus({ preventScroll: true });
    }
  }
  return <section ref={movement.ref} className={styles.root} data-garage16 data-garage-default={garage.defaultVehicleId} data-motion={movement.reduced ? 'off' : 'on'} aria-busy={loading || busy}>
    {FLOW && <p className={styles.modeNote} role="note">Demo tab · Garage is not saved to MongoDB.</p>}
    <div className={styles.toolbar}><p className={styles.count}>{loading ? 'Syncing garage…' : `${garage.vehicleIds.length} / 3 vehicles`}</p>
      <button ref={addButton} className={styles.addButton} disabled={disabled || !choices.length} onClick={openAdd}>＋ Add vehicle</button>
    </div>
    {error && !dialog && <div className={styles.feedback} role="alert"><span>{error}</span><button className={styles.textButton} disabled={busy || loading} onClick={() => void state.refresh()}>Refresh</button></div>}
    {message && !dialog && <p className={styles.savedFeedback} role="status">✓ {message}</p>}
    <div className={styles.hero}>
      <GarageStage parts={parts} vehicleId={selection} />
      <div className={styles.vehicleInfo} data-garage-enter>
        <div className={styles.meta}><span>YAMAHA</span>{isDefault && <span className={styles.badge}>Default</span>}</div>
        <h2>{vehicle ? vehicle.model : 'Choose your NVX.'}</h2>
        {vehicle ? <>
          <p>{canBrowse ? `${parts.length} matching ${parts.length === 1 ? 'part' : 'parts'}` : 'Currently unavailable'}</p>
          {canBrowse ? <Link className={styles.primary} to="/shop?fit=match" onClick={() => store.setVehicle(selection)}>Shop matching parts <span aria-hidden="true">↗</span></Link>
            : <button className={styles.primary} disabled>Shop matching parts</button>}
          <div className={styles.defaultAction}>
            {isDefault ? <span>Ready on your next sign-in.</span>
              : <button className={styles.textButton} disabled={disabled || !canBrowse} onClick={() => void state.mutate('set-default', selection)}>Set as default</button>}
          </div>
        </> : <><p>Save a version. Find its parts.</p><button className={styles.primary} disabled={disabled || !choices.length} onClick={openAdd}>Add vehicle <span aria-hidden="true">＋</span></button></>}
      </div>
    </div>
    <section className={styles.fleet} aria-label="Saved vehicles">
      <div className={styles.fleetHeading}><h2 ref={heading} tabIndex={-1}>Your vehicles</h2>{garage.vehicleIds.length > 0 && <span>Select to preview</span>}</div>
      {garage.vehicleIds.length ? <div className={styles.cards}>
        {garage.vehicleIds.map(id => {
          const v = NVX_VEHICLES.find(item => item.id === id), selected = id === selection, active = id === store.vehicleId, defaulted = id === garage.defaultVehicleId;
          return <article key={id} data-garage-vehicle={id} className={styles.card} data-selected={selected} data-garage-enter>
            <button className={styles.cardSelect} type="button" aria-pressed={selected} aria-label={`Preview ${v.model}`} onClick={() => setPreferred(id)}>
              <span className={styles.cardVersion} aria-hidden="true">{v.model.replace('NVX ', '')}</span>
              <span className={styles.cardText}><strong>{v.model}</strong><small>{active ? 'Shopping selection' : 'Saved vehicle'}</small></span>
              <span className={styles.selectionDot} aria-hidden="true" />
            </button>
            <div className={styles.cardFoot}><span>{defaulted ? 'Default' : 'Yamaha'}</span>
              <details className={styles.menu} name="garage16-options" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}><summary aria-label={`Options for ${v.model}`}>•••</summary>
                <div>
                  {!defaulted && <button disabled={disabled || !available.some(item => item.id === id)} onClick={event => { event.currentTarget.closest('details').open = false; void state.mutate('set-default', id); }}>Set as default</button>}
                  {defaulted && <button disabled={disabled} onClick={event => { event.currentTarget.closest('details').open = false; void state.mutate('clear-default', ''); }}>Clear default</button>}
                  <button className={styles.removeAction} disabled={disabled} onClick={event => { event.currentTarget.closest('details').open = false; setDialog({ remove: id }); }}>Remove vehicle</button>
                </div>
              </details>
            </div>
          </article>;
        })}
      </div> : <p className={styles.emptyList}>No vehicles saved yet.</p>}
    </section>
    <p className={styles.disclaimer}>Illustrative part models · Demo fitment, not installation guidance.</p>
    {dialog === 'add' && <GarageDialog title="Add an NVX" busy={busy} onClose={() => setDialog(null)}>
      <form onSubmit={add}>
        <fieldset className={styles.addChoices} disabled={disabled}><legend className={styles.srOnly}>NVX version</legend>
          {choices.map(v => <label key={v.id} data-selected={candidate === v.id}><input type="radio" name="garage16-add" value={v.id} checked={candidate === v.id} onChange={() => setCandidate(v.id)} />{v.model}<span aria-hidden="true">{candidate === v.id ? '✓' : '+'}</span></label>)}
        </fieldset>
        {!garage.vehicleIds.length && <p className={styles.dialogNote}>Your first vehicle becomes the default.</p>}
        {error && <p role="alert" className={styles.feedback}>{error}</p>}
        <div className={styles.dialogActions}><button className={styles.secondary} type="button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className={styles.primary} type="submit" disabled={disabled || !candidate}>{busy ? 'Saving…' : 'Add to garage'}</button></div>
      </form>
    </GarageDialog>}
    {dialog?.remove && <GarageDialog title={`Remove ${NVX_VEHICLES.find(v => v.id === dialog.remove)?.model}?`} busy={busy} onClose={() => setDialog(null)}>
      <p className={styles.dialogNote}>{garage.defaultVehicleId === dialog.remove ? 'This will also clear your default. ' : ''}Your bag and orders will not change.</p>
      {error && <p role="alert" className={styles.feedback}>{error}</p>}
      <div className={styles.dialogActions}><button className={styles.secondary} type="button" disabled={busy} onClick={() => setDialog(null)}>Cancel</button><button className={styles.danger} type="button" disabled={disabled} onClick={() => void remove()}>{busy ? 'Removing…' : 'Remove vehicle'}</button></div>
    </GarageDialog>}
  </section>;
}
