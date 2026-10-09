import { useStore } from '../useStore';
import { isNVXId } from '../../../../shared/nvx.mjs';
import { summarizeFitment, vehicleCaption } from '../catalog/fitment/fitment.logic.mjs';

/** A compact selector, not a replacement for authoritative fitment validation. */
export default function VehicleBar({ products, vehicles, vehicleId, query, onPatch, onChooseVehicle, onClearVehicle, motion }) {
  const store = useStore();
  const available = vehicles.filter(v => v && isNVXId(v.id));
  const vehicle = available.find(v => v.id === vehicleId);
  const counts = summarizeFitment(products, vehicles, vehicleId, query);
  function select(id) {
    if (store.loading || store.error || !available.some(v => v.id === id)) return;
    store.setVehicle(id);
    onPatch({ fit: 'match', page: 1 });
  }
  return <section className="ux17-vehicle" data-motion={motion ? 'on' : 'off'}
    data-fitment-vehicle={vehicle ? 'selected' : vehicleId ? 'unknown' : 'unselected'} aria-label="Selected vehicle">
    <div className="ux17-vehicle-options" role="group" aria-label="Yamaha NVX version">
      <span>Your NVX</span>
      {available.map(v => <button key={v.id} type="button" aria-pressed={v.id === vehicleId}
        disabled={store.loading || !!store.error} onClick={() => select(v.id)}>{v.model}</button>)}
      {!available.length && <button type="button" onClick={onChooseVehicle}>Choose vehicle</button>}
      {vehicleId && <button type="button" className="ux17-clear" onClick={onClearVehicle} aria-label="Clear selected vehicle">Clear</button>}
    </div>
    {vehicle && <label className="ux17-match-toggle"><input type="checkbox" checked={query.fit === 'match'}
      onChange={event => onPatch({ fit: event.target.checked ? 'match' : 'all', page: 1 })} />Matches only</label>}
    {vehicleId && !vehicle && <p className="ux17-warning" role="status">Saved vehicle unavailable. Choose an NVX above.</p>}
    <p className="ux17-sr" role="status" aria-live="polite" aria-atomic="true">
      {vehicle ? `${vehicleCaption(vehicle)}. ${counts.compatible} demo matches in ${counts.total} filtered parts. ${query.fit === 'match' ? 'Matches only.' : 'All parts shown.'}` : 'Choose an NVX to check compatibility.'}
    </p>
  </section>;
}
