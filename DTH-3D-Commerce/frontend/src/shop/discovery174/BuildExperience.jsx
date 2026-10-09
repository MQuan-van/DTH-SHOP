import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../shared/domain.mjs';
import { CATEGORY_NAMES, CATEGORY_ORDER, VEHICLE_PHOTOS } from './discovery.config.mjs';
import { nvxChoices } from './discovery.logic.mjs';
import { useDiscoveryReveal } from './useDiscoveryMotion';
import ProductSpotlight from './ProductSpotlight';
import ProductRail from './ProductRail';
import Photo from './Photo';
export default function BuildExperience({ store, query, matches, eligible, selected, draft, motion, policy, fromShop,
  onSelect, onVehicle, onChooseVehicle, onCategory, onReset, onPin, onRemove, onMode }) {
  const vehicles = nvxChoices(store.data.vehicles), vehicle = vehicles.find(item => item.id === store.vehicleId);
  const root = useDiscoveryReveal(vehicle?.id || 'choose', motion);
  const photo = vehicle && VEHICLE_PHOTOS[vehicle.id];
  const validTotal = draft.every(item => Number.isSafeInteger(item.price) && item.price > 0 && item.price <= 1000000000);
  const estimate = validTotal ? draft.reduce((total, item) => total + item.price, 0) : null;
  return <section className="d174-build" ref={root} aria-label="NVX parts build">
    <header className="d174-build-title" data-discovery-enter><div><p className="d174-kicker">YOUR NVX / YOUR CHOICE</p><h1>Choose your next detail.</h1></div><Link className="d174-text-button" to="/account?view=vehicle">My Garage ↗</Link></header>
    <div className="d174-vehicle-strip" role="group" aria-label="Build vehicle" data-discovery-enter>
      {vehicles.map((item, index) => <button key={item.id} type="button" aria-pressed={store.vehicleId === item.id} onClick={() => onVehicle(item.id)}><small>0{index + 1}</small><strong>{item.model}</strong><span>{store.vehicleId === item.id ? 'Selected ✓' : 'Select →'}</span></button>)}
      {!vehicles.length && <p role="status">No NVX is available. Check the catalog before building.</p>}
    </div>
    {!vehicle ? <div className="d174-empty"><h2>Start with your NVX.</h2><p>Choose V1, V2 or V3 to see matching demo parts.</p></div> : <>
      <div className="d174-build-context" data-discovery-enter>
        <figure className={`d174-build-photo ${!photo ? 'd174-missing-photo' : ''}`}>{photo ? <Photo photo={photo} contain={vehicle.id === 'yamaha-nvx-v2'} sizes="(max-width:760px) 100vw, 320px" /> : <span>NVX <b>V3</b><small>Version photo not supplied yet</small></span>}</figure>
        <div><span className="d174-kicker">{photo ? 'OWNER-SUPPLIED REFERENCE' : 'VEHICLE CONTEXT'}</span><h2>{vehicle.make} {vehicle.model}</h2><p>{eligible.length} matching demo parts</p><small>Shopping selection only. Your account default and existing bag lines stay unchanged.</small></div>
      </div>
      <div className="d174-build-categories" role="group" aria-label="Build part category">
        <button type="button" aria-pressed={!query.categories.length} onClick={() => onCategory('')}>All parts <span>{eligible.length}</span></button>
        {CATEGORY_ORDER.map(category => <button key={category} type="button" aria-pressed={query.categories.includes(category)} onClick={() => onCategory(category)}>{CATEGORY_NAMES[category]} <span>{eligible.filter(product => product.category === category).length}</span></button>)}
      </div>
      {query.search || query.maxPrice < Infinity && matches.length < eligible.length ? <div className="d174-filter-context"><span>{matches.length} results with your current filters</span><button type="button" className="d174-text-button" onClick={onReset}>Clear product filters</button></div> : null}
      {selected ? <><ProductSpotlight key={`${store.user?.id || 'guest'}:${store.vehicleId}:${selected.id}`} product={selected} build motion={motion} policy={policy} fromShop={fromShop} onChooseVehicle={onChooseVehicle} onPin={onPin} pinned={draft.some(item => item.id === selected.id)} />
        <ProductRail products={matches} selectedId={selected.id} onSelect={onSelect} label="Matching build parts" /></>
        : <div className="d174-empty"><h3>No matching parts in this view.</h3><p>Try another category or clear your product filters.</p><button className="d174-primary" type="button" onClick={onReset}>Clear product filters →</button></div>}
    </>}
    {draft.length > 0 && <section className="d174-build-list" aria-label="Current build shortlist"><header><div><h2>Your build list <small>{draft.length} / 5</small></h2><p>One part per category. Kept in this page only; not saved to your account.</p></div><div className="d174-estimate"><small>Catalog estimate · 1 each</small><strong>{estimate === null ? 'Unavailable' : formatMoney(estimate)}</strong></div></header>
      <ul>{draft.map(item => <li key={item.id}><span>{CATEGORY_NAMES[item.category]}</span><button type="button" className="d174-text-button" onClick={() => onSelect(item.id)}>{item.name}</button><button className="d174-remove" type="button" aria-label={`Remove ${item.name} from build`} onClick={() => onRemove(item.id)}>Remove</button></li>)}</ul>
      <p className="d174-fine">Keeping a part here does not add it to the bag. Review each selected part before adding. Changing vehicle clears this list.</p>
    </section>}
    <footer className="d174-build-foot"><button type="button" className="d174-text-button" onClick={() => onMode('shop')}>Back to catalog →</button><span>Parts planning, not a vehicle installation simulator.</span></footer>
  </section>;
}
