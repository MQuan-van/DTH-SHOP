import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { NVX_MODELS, NVX_STAGE } from '../../shop/discovery174/nvx3d/nvx3d.config.mjs';
import { usePublishedNVXModels } from '../../shop/discovery174/nvx3d/usePublishedNVXModels.mjs';
import { garageSpec22H2, matching22H2 } from './studio22h2.logic.mjs';
import StudioIcon from './StudioIcons22H2.jsx';

function VehicleStage22H2({ spec, active, reduced, signal, interactive, onReady, command }) {
  const host = useRef(null), renderer = useRef(null), latest = useRef(null);
  const [status, setStatus] = useState({ phase: 'idle' }), [attempt, setAttempt] = useState(0);
  latest.current = { spec, reduced, interactive, onReady };
  useEffect(() => {
    if (!active || !host.current || !spec) return;
    let live = true, stage = null;
    const el = host.current;
    const allowed = () => !signal.state.blocked && !document.hidden;
    const sync = () => { stage?.setVisible(allowed()); };
    // Keep wheel scrolling native even during deliberate vehicle inspection.
    const wheel = e => e.stopPropagation();
    el.addEventListener('wheel', wheel, { capture: true, passive: true });
    const off = signal.subscribe(sync);
    const visibility = () => sync(); document.addEventListener('visibilitychange', visibility);
    setStatus({ phase: 'loading', id: spec.id }); latest.current.onReady?.(false);
    import('../../shop/discovery174/nvx3d/createNVXStage.mjs').then(({ createNVXStage }) => {
      if (!live) return;
      stage = createNVXStage(el, {
        compact: matchMedia('(max-width: 700px)').matches || !!navigator.connection?.saveData,
        onStatus: value => { if (live) { setStatus(value); latest.current.onReady?.(value.phase === 'ready' && value.id === latest.current.spec.id); } },
      });
      renderer.current = stage; command.current = name => { if (allowed()) stage?.command(name); };
      stage.setOptions({ motion: !latest.current.reduced, autoRotate: !latest.current.interactive });
      sync(); void stage.select(latest.current.spec, 1);
    }).catch(e => { if (live) { setStatus({ phase: 'error', id: latest.current.spec.id, message: e.message }); latest.current.onReady?.(false); } });
    return () => {
      live = false; off(); document.removeEventListener('visibilitychange', visibility);
      el.removeEventListener('wheel', wheel, true); stage?.dispose();
      if (renderer.current === stage) renderer.current = null; command.current = null;
    };
  }, [active, attempt, signal, command]);
  useEffect(() => { if (renderer.current && spec) { onReady(false); void renderer.current.select(spec, 1); } }, [spec]);
  useEffect(() => { renderer.current?.setOptions({ motion: !reduced, autoRotate: !interactive }); }, [reduced, interactive]);
  const ready = status.phase === 'ready' && status.id === spec?.id;
  const absent = !spec?.file;
  return <div className="s222-vehicle-stage" data-state={ready ? 'ready' : absent ? 'missing' : status.phase} data-interactive={interactive}>
    <div className="s222-vehicle-host" ref={host} role="img" aria-label={`${spec?.label || 'NVX'} 3D preview`} />
    {!ready && <div className="s222-loading" role="status">
      {absent ? <><strong>{spec?.label}: 3D model not supplied</strong><p>Matching parts are still available below.</p></>
      : status.phase === 'error' ? <><strong>Vehicle preview unavailable</strong><p>{status.message}</p><button type="button" className="s222-button s222-ghost" data-precision-button onClick={() => setAttempt(n => n + 1)}>Retry preview</button></>
      : <><i aria-hidden="true"/><span>{active ? `Loading ${spec?.label || 'NVX'}` : 'Preview loads when in view'}</span></>}
    </div>}
  </div>;
}
export default function Garage22H2({ sectionRef, active, reduced, signal, products, vehicles, vehicleId, setVehicle, chooseVehicle }) {
  const published = usePublishedNVXModels(), command = useRef(null), [interactive, setInteractive] = useState(false), [ready, setReady] = useState(false);
  const blocked = useSyncExternalStore(signal.subscribe, () => signal.state.blocked, () => false);
  const choices = vehicles.filter(v => /^yamaha-nvx-v[123]$/.test(v?.id || ''));
  const selected = choices.find(v => v.id === vehicleId);
  const preview = selected || choices.find(v => v.id === NVX_STAGE.defaultPreviewId) || choices[0];
  const rawSpec = garageSpec22H2(preview, NVX_MODELS, published);
  // A manifest focus-refresh with the same URL must not reload the vehicle GLB.
  const spec = useMemo(() => rawSpec, [rawSpec?.id, rawSpec?.file, rawSpec?.label, ...(rawSpec?.rotation || [0, 0, 0])]);
  const match = useMemo(() => matching22H2(products, vehicleId, vehicles), [products, vehicleId, vehicles]);
  useEffect(() => { setInteractive(false); setReady(false); }, [preview?.id, active]);
  function change(id) { if (choices.some(v => v.id === id)) setVehicle(id); }
  return <section ref={sectionRef} className="s222-garage" id="studio-garage" aria-labelledby="s222-garage-title" data-blocked={blocked}>
    <div className="s222-garage-head" data-studio-reveal>
      <div><p className="s222-overline">Your garage</p><h2 id="s222-garage-title">Built around<br />your ride.</h2></div>
      <div className="s222-version-tabs" role="group" aria-label="Select your Yamaha NVX">
        {choices.map((v, i) => <button type="button" key={v.id} aria-pressed={vehicleId === v.id} data-precision-button onClick={() => change(v.id)}><span>0{i + 1}</span><strong>{v.model}</strong><i aria-hidden="true" /></button>)}
      </div>
    </div>
    <div className="s222-garage-body">
      <div className="s222-garage-art">
        <div className="s222-garage-watermark" aria-hidden="true">NVX</div><div className="s222-floor-lines" aria-hidden="true" />
        {spec ? <VehicleStage22H2 spec={spec} active={active} reduced={reduced} signal={signal} interactive={interactive && !blocked} command={command} onReady={setReady} />
          : <div className="s222-loading"><p>No NVX vehicle is available in this catalog.</p></div>}
        <div className="s222-garage-toolbar" role="group" aria-label="Vehicle preview controls">
          <button type="button" className="s222-tool" data-precision-button disabled={!ready || blocked} aria-pressed={interactive} onClick={() => setInteractive(v => !v)}><StudioIcon name="orbit"/>{interactive ? 'Auto orbit' : 'Explore 3D'}</button>
          {interactive && <><button type="button" className="s222-tool" disabled={!ready || blocked} onClick={() => command.current?.('in')} aria-label="Zoom vehicle in">+</button><button type="button" className="s222-tool" disabled={!ready || blocked} onClick={() => command.current?.('out')} aria-label="Zoom vehicle out">−</button></>}
          <button type="button" className="s222-tool" data-precision-button disabled={!ready || blocked} onClick={() => command.current?.('reset')}><StudioIcon name="reset"/>Reset</button>
        </div>
      </div>
      <div className="s222-garage-summary" data-studio-reveal>
        <p className="s222-overline">{selected ? 'Selected vehicle' : 'Preview vehicle'}</p>
        <h3>{preview ? vehicleLabel(preview) : 'Choose your NVX'}</h3>
        {selected ? <>
          <div className="s222-match-total"><strong>{match.count}</strong><span>matching parts<br/>in the demo catalog</span></div>
          <div className="s222-fit-categories" aria-label="Matching categories">
            {match.categories.filter(c => c.count > 0).map(c => <Link key={c.id} to={`/shop?mode=shop&fit=match&category=${c.id}`} data-precision-button><StudioIcon name={c.id}/><span>{c.label}</span><b>{c.count}</b></Link>)}
            {match.count === 0 && <p>No matching parts in this demo catalog.</p>}
          </div>
          <Link to="/shop?mode=shop&fit=match" className="s222-button s222-primary" data-precision-button>Explore matching parts</Link>
          <Link to="/shop?mode=build" className="s222-text-link">Open build studio</Link>
        </> : <button type="button" className="s222-button s222-primary" data-precision-button onClick={() => preview ? change(preview.id) : chooseVehicle()}>{preview ? `Use ${preview.model}` : 'Choose vehicle'}</button>}
        <p className="s222-demo-note">Demo compatibility. Confirm real fitment with your supplier.</p>
      </div>
    </div>
  </section>;
}
