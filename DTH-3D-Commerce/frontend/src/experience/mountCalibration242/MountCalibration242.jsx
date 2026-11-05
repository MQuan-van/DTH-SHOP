import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../shop/useStore.jsx';
import { createCalibration242, createCalibrationHistory242, reviewCalibration242 } from '../../../../shared/mount-calibration242.mjs';
import { attachmentFields242, calibrationProduct242, calibrationShortcut242, calibrationVehicle242, changeAttachmentField242, numericCommit242, PROFILE_FILE242, VEHICLE242 } from './calibration-ui242.logic.mjs';
import './mount-calibration242.css';
const CalibrationScene242 = lazy(() => import('./CalibrationScene242.jsx'));
const AXES = ['X', 'Y', 'Z'];
const EMPTY_SNAPSHOT = {profile:null,canUndo:false,canRedo:false,transaction:false};

function NumberField242({ label, value, step = .01, min, disabled, onCommit }) {
  const [text, setText] = useState(String(value)), [error, setError] = useState(''), focused = useRef(false);
  const edited = useRef(false), initialText = useRef(text);
  useEffect(() => { if (!focused.current) setText(String(Math.round(value * 1e6) / 1e6)); }, [value]);
  function commit() {
    focused.current = false;
    try {
      const result = numericCommit242(text, initialText.current, edited.current); edited.current = false;
      if (!result.changed) return;
      onCommit(result.value); setError(''); setText(String(Math.round(result.value * 1e6) / 1e6));
    } catch (cause) { setError(cause.message); setText(String(Math.round(value * 1e6) / 1e6)); }
  }
  return <label className="mc242-number"><span>{label}</span><input name={label.toLowerCase().replaceAll(' ', '-')} aria-label={label} type="number" inputMode="decimal" autoComplete="off" step={step} min={min} disabled={disabled} value={text} aria-invalid={!!error}
    onFocus={() => { focused.current = true; edited.current = false; initialText.current = text; }} onChange={event => { edited.current = true; setText(event.target.value); setError(''); }} onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); edited.current = false; setText(String(Math.round(value * 1e6) / 1e6)); setError(''); } }}/>{error && <small role="alert">{error}</small>}</label>;
}
function useExternalGate242() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const read = () => setBlocked(!!document.querySelector('dialog[open],.dth-support-panel'));
    const observer = new MutationObserver(read);
    observer.observe(document.body, {subtree:true,childList:true,attributes:true,attributeFilter:['open']}); read();
    return () => observer.disconnect();
  }, []);
  return blocked;
}

export default function MountCalibration242() {
  const [params, setParams] = useSearchParams(), sourceMode = params.get('source') === 'local' ? 'local' : 'published';
  const store = useStore(), root = useRef(null), sceneApi = useRef(null), history = useRef(null), context = useRef(null), contextKey = useRef(''), input = useRef(null), pendingImport = useRef(0), exported = useRef('');
  const [source, setSource] = useState({phase:'loading',vehicle:null,error:''}), [reload, setReload] = useState(0), [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState({phase:'loading',message:'Opening the workspace…'}), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [mode, setMode] = useState('translate'), [partVisible, setPartVisible] = useState(true), [ghost, setGhost] = useState(false), [grid, setGrid] = useState(true), [axes, setAxes] = useState(true), [note, setNote] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);
  const blocked = useExternalGate242(), product = calibrationProduct242(store.data?.products);
  const productKey = product ? `${product.id}|${product.modelUrl}|${product.category}` : '';
  const sceneProduct = useMemo(() => product ? {id:product.id,name:product.name,category:product.category,modelUrl:product.modelUrl} : null, [productKey]);
  const workspaceKey = `${source.vehicle?.assetUrl || ''}|${source.vehicle?.rotationXYZ?.join(',') || ''}|${productKey}|${store.user?.id || ''}`;
  const latestKey = useRef(workspaceKey); latestKey.current = workspaceKey;
  const profile = snapshot.profile, ready = status.phase === 'ready' && !!profile && !blocked;
  const editing = ready && !snapshot.transaction, fields = profile ? attachmentFields242(profile.attachment) : {position:[0,0,0],rotation:[0,0,0],scale:1};
  const dirty = !!profile && profile.calibrationStatus !== 'uncalibrated' && JSON.stringify(profile) !== exported.current;
  const downloadUrls = useRef(new Set());

  useEffect(() => {
    document.title = 'Mount calibration — DTH Admin';
    return () => { pendingImport.current++; for (const url of downloadUrls.current) URL.revokeObjectURL(url); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    setSource(previous => ({...previous,phase:'loading',error:''}));
    const api = (import.meta.env.VITE_SHOP_API_URL || '/api/shop').replace(/\/$/, '');
    async function load() {
      try {
        if (sourceMode === 'local') {
          if (live) setSource({phase:'ready',vehicle:calibrationVehicle242({data:{}}, 'local'),error:''});
          return;
        }
        const response = await fetch(`${api}/ai-assets/models`, {signal:controller.signal,credentials:'include',cache:'no-store'});
        // An absent optional publication endpoint permits the existing local V2 only.
        if (!response.ok && response.status !== 404) throw new Error('Cannot read the published vehicle manifest. Check the API and reload assets.');
        const vehicle = calibrationVehicle242(response.status === 404 ? {data:{}} : await response.json());
        if (live) setSource({phase:'ready',vehicle,error:''});
      } catch (cause) { if (live && cause.name !== 'AbortError') setSource(previous => ({...previous,phase:'error',error:cause.message})); }
    }
    void load(); return () => { live = false; controller.abort(); };
  }, [reload, sourceMode]);
  useEffect(() => {
    pendingImport.current++; context.current = null; contextKey.current = ''; history.current = null; exported.current = '';
    setSnapshot(EMPTY_SNAPSHOT); setNote(''); setError(''); setNotice(''); setStatus({phase:'loading',message:'Checking asset identities…'});
  }, [workspaceKey]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const update = useCallback(() => { if (history.current) setSnapshot(history.current.snapshot()); }, []);
  const onReady = useCallback(loaded => {
    if (latestKey.current !== workspaceKey) return;
    try {
      const next = {vehicle:loaded.vehicle,product:loaded.product,nodeIndices:loaded.nodeIndices,
        normalizationRevision:loaded.normalizationRevision,orientationRevision:loaded.orientationRevision,stockClassification:loaded.stockClassification || 'indeterminate'};
      const signature = JSON.stringify(next);
      if (contextKey.current !== signature || !history.current) {
        const initial = createCalibration242(next);
        if (history.current) setNotice('Asset identity changed. A new uncalibrated draft is open; old profiles must match the new bytes before import.');
        context.current = next; contextKey.current = signature; history.current = createCalibrationHistory242(initial, next); exported.current = ''; setNote('');
      }
      setError(''); update();
    } catch (cause) { setError(cause.message); setStatus({phase:'error',message: 'The loaded asset identities cannot initialize a profile.'}); throw cause; }
  }, [workspaceKey, update]);
  const onTransform = useCallback(pose => {
    if (!history.current) return;
    try { if (history.current.snapshot().transaction) history.current.preview(pose); else history.current.setAttachment(pose); update(); }
    catch (cause) { setError(cause.message); sceneApi.current?.cancelDrag(); }
  }, [update]);
  const onDragStart = useCallback(() => { if (history.current) { history.current.begin(); setError(''); setNotice(''); update(); } }, [update]);
  const onDragEnd = useCallback(() => { if (history.current) { history.current.commit(); update(); } }, [update]);
  const onDragCancel = useCallback(() => { if (history.current) { history.current.cancel(); update(); } }, [update]);
  function action(command) {
    if (!history.current) return;
    if (history.current.snapshot().transaction) { sceneApi.current?.cancelDrag(); return; }
    try { setError(''); setNotice(''); history.current[command](); update(); } catch (cause) { setError(cause.message); }
  }
  const latest = useRef({}); latest.current = {ready,action};
  useEffect(() => {
    const keys = event => {
      if (!root.current?.contains(event.target) || !latest.current.ready) return;
      const editingField = !!event.target.closest?.('input,textarea,select,[contenteditable="true"]');
      const command = calibrationShortcut242({key:event.key,ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey,altKey:event.altKey,editing:editingField});
      if (!command) return; event.preventDefault();
      if (command === 'undo' || command === 'redo') latest.current.action(command);
      else if (command === 'cancel') sceneApi.current?.cancelDrag();
      else if (['translate','rotate','scale'].includes(command)) setMode(command);
      else sceneApi.current?.camera(command);
    };
    window.addEventListener('keydown', keys); return () => window.removeEventListener('keydown', keys);
  }, []);
  function commitNumber(kind, index, value) {
    if (!editing || !history.current) throw new Error('Finish the current drag before editing a number.');
    const current = history.current.snapshot().profile.attachment;
    history.current.setAttachment(changeAttachmentField242(current, kind, index, value)); setError(''); setNotice(''); update();
  }
  function exportProfile() {
    if (!editing || !history.current) return;
    try {
      const json = history.current.exportJSON(), url = URL.createObjectURL(new Blob([json], {type:'application/json'}));
      downloadUrls.current.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = PROFILE_FILE242; anchor.click();
      exported.current = JSON.stringify(history.current.snapshot().profile); setNotice('Mounting profile exported. No server data was changed.'); setError('');
    } catch (cause) { setError(cause.message); }
  }
  async function importProfile(event) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || !history.current) return;
    const ticket = ++pendingImport.current, expected = contextKey.current, expectedHistory = history.current, expectedWorkspace = latestKey.current;
    try {
      if (file.size > 128 * 1024) throw new Error('Choose a mounting JSON file no larger than 128 KiB.');
      const json = await file.text();
      if (ticket !== pendingImport.current || expected !== contextKey.current || expectedHistory !== history.current || expectedWorkspace !== latestKey.current) return;
      history.current.importJSON(json); setError(''); setNotice('Profile imported after checking both assets and the coordinate frame.'); setNote(history.current.snapshot().profile.review?.note || ''); update();
    } catch (cause) { if (ticket === pendingImport.current && expectedWorkspace === latestKey.current) setError(`Import rejected. ${cause.message} The current draft is unchanged.`); }
  }
  function review() {
    if (!editing || !history.current) return;
    try { history.current.set(reviewCalibration242(history.current.snapshot().profile, note, context.current)); setError(''); setNotice('Visual placement reviewed. Mechanical compatibility remains not assessed.'); update(); } catch (cause) { setError(cause.message); }
  }
  function changeSource(value) {
    if (dirty && !window.confirm('Changing the vehicle model source clears this session draft. Export it first if needed. Continue?')) return;
    setParams(previous => { const next = new URLSearchParams(previous); if (value === 'local') next.set('source','local'); else next.delete('source'); return next; }, {replace:true});
  }
  const missingVehicle = !store.loading && !store.data?.vehicles?.some(vehicle => vehicle.id === VEHICLE242);
  const sourceError = store.error || source.error || (!store.loading && !product ? 'The active Ohlins TTX suspension product is missing from the catalog.' : '') || (missingVehicle ? 'Yamaha NVX V2 is missing from the catalog.' : '');
  const canMount = source.phase === 'ready' && !!sceneProduct && !store.loading && !sourceError;
  const assetInfo = profile ? [['Vehicle asset',profile.vehicle],['Part asset',profile.product]] : [];
  return <section ref={root} className="mc242" data-mount-calibration="242" data-status={profile?.calibrationStatus || 'loading'}>
    <header className="mc242-heading"><div><h1>Mount calibration</h1><p>Yamaha NVX V2 <span aria-hidden="true">/</span> {product?.name || 'Ohlins TTX'} <span aria-hidden="true">/</span> Rear suspension</p></div>
      <div className="mc242-files"><span className="mc242-state" data-state={profile?.calibrationStatus}>{profile?.calibrationStatus || 'Preparing'}</span><button type="button" disabled={!editing} onClick={() => input.current?.click()}>Import JSON</button><button type="button" className="mc242-primary" disabled={!editing} onClick={exportProfile}>Export JSON</button><input ref={input} type="file" accept=".json,application/json" aria-label="Import mounting profile JSON" onChange={importProfile} hidden/></div>
    </header>
    <div className="mc242-source"><label>Vehicle model source<select aria-label="Vehicle model source" value={sourceMode} disabled={snapshot.transaction} onChange={event => changeSource(event.target.value)}><option value="published">Published NVX V2 slot</option><option value="local">Local NVX V2 GLB</option></select></label><p>Sources have different bytes. Verify the model visually; each profile is bound to the selected URL and SHA-256.</p></div>
    <p className="mc242-disclosure">Calibration preview — stock part is not removed. <span>Visual placement only; physical compatibility is not assessed.</span></p>
    {(error || sourceError) && <div className="mc242-error" role="alert">{error || sourceError}{sourceError && <button type="button" onClick={() => { store.refresh(); setReload(value => value + 1); }}>Reload catalog and assets</button>}</div>}
    {notice && <p className="mc242-notice" role="status">{notice}</p>}
    <div className="mc242-layout">
      <div className="mc242-visual">
        <div className="mc242-tools"><div role="group" aria-label="Attachment transform mode">{[['translate','Move','W'],['rotate','Rotate','E'],['scale','Scale','R']].map(([id,label,key]) => <button key={id} type="button" aria-pressed={mode === id} disabled={!editing} onClick={() => setMode(id)}>{label}<kbd>{key}</kbd></button>)}</div><div role="group" aria-label="Transform history"><button type="button" disabled={!editing || !snapshot.canUndo} onClick={() => action('undo')}>Undo</button><button type="button" disabled={!editing || !snapshot.canRedo} onClick={() => action('redo')}>Redo</button></div></div>
        <div className="mc242-viewport" aria-label="Vehicle and attachment calibration viewport">
          {canMount ? <Suspense fallback={<div className="mc242-loading" role="status">Opening calibration renderer…</div>}><CalibrationScene242 key={workspaceKey} vehicle={source.vehicle} product={sceneProduct} attachment={profile?.attachment || null} mode={mode} partVisible={partVisible} ghost={ghost} grid={grid} axes={axes} blocked={blocked} apiRef={sceneApi} onStatus={setStatus} onReady={onReady} onTransform={onTransform} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}/></Suspense> : <div className="mc242-loading" role="status">{sourceError ? 'Assets unavailable. Resolve the error above to continue.' : 'Checking the published vehicle and live catalog…'}</div>}
          {canMount && status.phase !== 'ready' && <div className="mc242-stage-status" role={status.phase === 'error' ? 'alert' : 'status'}><p>{status.message || 'Loading the original models…'}</p>{status.phase === 'error' && <button type="button" onClick={() => sceneApi.current?.retry()}>Retry 3D models</button>}</div>}
          {snapshot.transaction && <span className="mc242-drag">Adjusting attachment · Escape to cancel</span>}
        </div>
        <div className="mc242-cameras" role="group" aria-label="Calibration camera"><span>View</span>{[['overview','Whole vehicle'],['left','Left'],['right','Right'],['rear','Rear'],['part','Focus part'],['reset','Reset camera']].map(([id,label]) => <button key={id} type="button" disabled={!editing} onClick={() => sceneApi.current?.camera(id)}>{label}</button>)}</div>
        <div className="mc242-display"><label><input type="checkbox" checked={partVisible} onChange={event => setPartVisible(event.target.checked)} disabled={!editing}/>Show TTX</label><label><input type="checkbox" checked={ghost} onChange={event => setGhost(event.target.checked)} disabled={!editing}/>Ghost vehicle</label><label><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)}/>Display grid</label><label><input type="checkbox" checked={axes} onChange={event => setAxes(event.target.checked)}/>Display axes</label></div>
        <p className="mc242-help">Drag the gizmo to adjust the selected TTX assembly. Orbit or zoom outside the gizmo. W / E / R change mode; F focuses the part. Numeric controls provide the same adjustments.</p>
      </div>
      <details className="mc242-inspector" open={inspectorOpen} onToggle={event => setInspectorOpen(event.currentTarget.open)}><summary>Attachment inspector <span>{snapshot.transaction ? 'Adjusting' : profile ? 'Selected' : 'Loading'}</span></summary><div className="mc242-inspector-body" key={contextKey.current || workspaceKey}>
        <p className="mc242-unit">Vehicle source frame · scene units</p>
        <fieldset disabled={!editing}><legend>Position</legend><div className="mc242-axis-fields">{AXES.map((axis,index) => <NumberField242 key={axis} label={`Position ${axis}`} value={fields.position[index]} disabled={!editing} onCommit={value => commitNumber('position',index,value)}/>)}</div></fieldset>
        <fieldset disabled={!editing}><legend>Rotation <small>degrees · XYZ</small></legend><div className="mc242-axis-fields">{AXES.map((axis,index) => <NumberField242 key={axis} label={`Rotation ${axis}`} value={fields.rotation[index]} step={1} disabled={!editing} onCommit={value => commitNumber('rotation',index,value)}/>)}</div></fieldset>
        <fieldset disabled={!editing}><legend>Uniform scale</legend><NumberField242 label="Uniform scale" value={fields.scale} min={.000001} step={.01} disabled={!editing} onCommit={value => commitNumber('scale',null,value)}/></fieldset>
        <button type="button" className="mc242-reset" disabled={!editing} onClick={() => action('reset')}>Reset attachment</button>
        <dl className="mc242-facts"><div><dt>Instance</dt><dd>{profile?.product.sha256 === '79d2b2bdf8824a775e5cc8adffce313e2a687fb864fcef540c09eb084d536e98' ? 'One original TTX pair' : 'One whole-asset assembly'}</dd></div><div><dt>Stock geometry</dt><dd>{profile?.stock.classification.toUpperCase() || 'Checking'}</dd></div><div><dt>Source</dt><dd>{source.vehicle?.source || 'Checking'}</dd></div><div><dt>Calibration</dt><dd>{profile?.calibrationStatus || 'Not loaded'}</dd></div></dl>
        <details className="mc242-identity"><summary>Asset identity and frame</summary>{assetInfo.map(([label,binding]) => <div key={label}><strong>{label}</strong><code>{binding.id}</code><code>{binding.assetUrl}</code><code>SHA-256 {binding.sha256}</code></div>)}<p>vehicle-source-root-v1<br/>normalized-stage-4-v1<br/>Quaternion [x, y, z, w] · source-origin pivot</p><p>The common display normalization is applied once. No physical dimensions are inferred.</p></details>
        <div className="mc242-review"><h2>Visual review</h2><label>Review note<textarea name="visual-review-note" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={!editing} placeholder="Describe what you inspected…"/></label><button type="button" disabled={!editing || profile?.calibrationStatus === 'uncalibrated' || !note.trim()} onClick={review}>Mark visually reviewed</button><p>Confirms the visible placement only. Editing the transform returns it to Draft.</p></div>
      </div></details>
    </div>
    <footer className="mc242-footer"><p>{dirty ? 'Unsaved session draft. Export before leaving.' : 'Session workspace. No mounting profile is published or stored on the server.'}</p><Link to="/shop?mode=build">Open Build</Link><Link to="/">Open Studio</Link></footer>
  </section>;
}
