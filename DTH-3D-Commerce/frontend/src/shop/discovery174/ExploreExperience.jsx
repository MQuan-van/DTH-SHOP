import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MOODS, PHOTOS, CATEGORY_ORDER, CATEGORY_NAMES } from './discovery.config.mjs';
import { useDiscoveryReveal, usePhotoParallax } from './useDiscoveryMotion';
import ProductSpotlight from './ProductSpotlight';
import ProductRail from './ProductRail';
import Photo from './Photo';
export default function ExploreExperience({ products, selected, motion, policy, fromShop, onSelect, onMode, onCategory, onBuild, onChooseVehicle }) {
  const [moodId, setMood] = useState('street');
  const mood = MOODS.find(item => item.id === moodId) || MOODS[0];
  const root = useDiscoveryReveal(mood.id, motion), parallax = usePhotoParallax(motion && !policy.compact);
  return <div className="d174-explore">
    <section className="d174-editorial" ref={root} aria-label="Rider collection">
      <div className="d174-editorial-copy" data-discovery-enter><p className="d174-kicker">{mood.detail}</p>
        <h1>{mood.title.split('\n').map((line, index) => <span key={`${mood.id}-${index}`}>{line}</span>)}</h1>
        <p className="d174-intro">Discover the details. Make them yours.</p>
        <div className="d174-hero-actions"><button type="button" className="d174-primary" onClick={() => onMode('build')}>Build your NVX <span aria-hidden="true">↗</span></button>
          <button type="button" className="d174-text-button" onClick={() => onMode('shop')}>Shop all parts →</button></div>
        <div className="d174-moods" role="group" aria-label="Photographic mood">{MOODS.map((item, index) => <button type="button" key={item.id} aria-pressed={item.id === moodId} onClick={() => setMood(item.id)}><small>0{index + 1}</small>{item.label}</button>)}</div>
      </div>
      <figure className={`d174-hero-photo d174-photo-${mood.id}`} ref={parallax} data-discovery-enter>
        <Photo key={mood.photo.id} photo={mood.photo} eager />
        <figcaption><span>Community builds</span><span>{mood.label} / DTH</span></figcaption>
      </figure>
    </section>
    <section className="d174-category-strip" aria-label="Explore parts by category">{CATEGORY_ORDER.map((category, index) => <button type="button" key={category} onClick={() => onCategory(category)}><span>0{index + 1}</span>{CATEGORY_NAMES[category]}<b aria-hidden="true">↗</b></button>)}</section>
    <section className="d174-studio" id="d174-studio" aria-label="Parts showroom">
      <header className="d174-section-head"><h2>Inside the studio.</h2><button type="button" className="d174-text-button" onClick={() => onMode('shop')}>See the catalog →</button></header>
      {selected ? <><ProductSpotlight product={selected} motion={motion} policy={policy} fromShop={fromShop} onBuild={onBuild} onChooseVehicle={onChooseVehicle} />
        <ProductRail products={products.slice(0, 12)} selectedId={selected.id} onSelect={onSelect} label="Showroom products" />
        {products.length > 12 && <button type="button" className="d174-text-button" onClick={() => onMode('shop')}>View all {products.length} results →</button>}</>
        : <div className="d174-empty"><h3>No parts in this view.</h3><p>Your filters and selected vehicle are kept.</p><button type="button" className="d174-primary" onClick={() => onMode('shop')}>Review filters →</button></div>}
    </section>
    <section className="d174-journal" aria-label="Community image journal">
      <header className="d174-section-head"><div><p className="d174-kicker">THE RIDER JOURNAL</p><h2>Beyond the parts.</h2></div><Link className="d174-text-button" to="/story">Read the story →</Link></header>
      <div className="d174-journal-main"><figure className="d174-journal-crew"><Photo photo={PHOTOS.crew} contain /><figcaption>Shared streets. Individual builds.</figcaption></figure>
        <figure className="d174-journal-night"><Photo photo={PHOTOS.bluehour} /><figcaption>After the city slows down.</figcaption></figure></div>
      <details className="d174-archive"><summary>More from the community <span aria-hidden="true">+</span></summary><div className="d174-archive-grid">
        {[PHOTOS.titanium, PHOTOS.workshop, PHOTOS.light].map(photo => <figure key={photo.id}><Photo photo={photo} contain sizes="(max-width: 760px) 90vw, 30vw" /></figure>)}
      </div></details>
      <p className="d174-fine">Community photographs are inspiration, not evidence that catalog parts are fitted to these vehicles.</p>
    </section>
  </div>;
}
