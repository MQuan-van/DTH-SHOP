import { usePublishedNVXModels } from './usePublishedNVXModels.mjs';
import { useMemo, useRef, useState } from 'react';
import NVXStage from './NVXStage.jsx';
import { NVX_MODELS, NVX_STAGE } from './nvx3d.config.mjs';
import { nextIndex, swipeDirection, transitionDirection } from './nvx3d.logic.mjs';
import './nvx3d.css';

export default function NVXBuildStudio({ vehicles, vehicleId, onVehicle, motion = true, policy = {} }) {
  const commandRef = useRef(null), gesture = useRef(null), selection = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const publishedModels = usePublishedNVXModels();
  const selected = vehicles.find(item => item.id === vehicleId);
  // Preview V3 without silently changing the shared shopping vehicle or a build list.
  const preview = selected || vehicles.find(item => item.id === NVX_STAGE.defaultPreviewId) || vehicles[0];
  const previewId = preview?.id || null;
  const spec = useMemo(() => ({
    id: previewId,
    label: preview?.model || 'NVX',
    file: null,
    rotation: [0, 0, 0],
    ...(NVX_MODELS[previewId] || {}),
    ...(publishedModels[previewId] || {}),
  }), [previewId, preview?.model, publishedModels]);
  const currentIndex = vehicles.findIndex(item => item.id === previewId);
  // Explicit next/previous direction is retained across the V3 <-> V1 wrap.
  const direction = selection.current?.id === previewId ? selection.current.direction : 1;
  const animate = motion && !policy.reduced;

  function select(id, explicit = 0) {
    if (!vehicles.some(item => item.id === id)) return;
    const nextDirection = transitionDirection(previewId, id, vehicles, explicit);
    if (id !== previewId) selection.current = { id, direction: nextDirection };
    // Even clicking the initial V3 preview must call the existing selection handler.
    onVehicle(id);
  }
  function step(value) {
    const index = nextIndex(currentIndex, value, vehicles.length);
    if (index >= 0) select(vehicles[index].id, value);
  }
  function pointerDown(event) {
    if (!event.isPrimary || event.button !== 0) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerUp(event) {
    const start = gesture.current;
    gesture.current = null;
    if (!start || event.pointerId !== start.id) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const move = swipeDirection(event.clientX - start.x, event.clientY - start.y, event.currentTarget.clientWidth);
    if (move) step(move);
  }
  function control(name) {
    // Keep the reset angle still until the user explicitly resumes auto rotation.
    if (name === 'reset') setAutoRotate(false);
    commandRef.current?.(name);
  }
  if (!preview) return <p className="d174-empty" role="status">No NVX is available. Check the catalog before building.</p>;
  return <div className="nvx3d-root" data-nvx-build-studio data-motion={animate ? 'on' : 'off'}>
    <div className="d174-vehicle-strip nvx3d-selector" role="group" aria-label="Build vehicle" data-discovery-enter>
      {vehicles.map((item, index) => <button
        key={item.id} type="button" aria-pressed={previewId === item.id}
        data-nvx-choice={item.id} onClick={() => select(item.id)}
      >
        <small>{String(index + 1).padStart(2, '0')}</small>
        <strong>{item.model}</strong>
        <span>{vehicleId === item.id ? 'Selected ✓' : previewId === item.id ? 'Select this NVX →' : 'Select →'}</span>
      </button>)}
    </div>
    <section className="nvx3d-studio" aria-label="Interactive NVX vehicle studio" aria-describedby="nvx3d-inspection-help">
      <header className="nvx3d-stage-header">
        <div><span className="nvx3d-eyebrow">YAMAHA / THE NEXT DETAIL</span><h2>{spec.label}</h2></div>
        <span className="nvx3d-model-badge">{spec.file ? '3D MODEL' : 'PREVIEW PENDING'}</span>
      </header>
      <NVXStage spec={spec} direction={direction} motion={animate} autoRotate={autoRotate}
        compact={policy.compact || policy.saveData} commandRef={commandRef} />
      <div className="nvx3d-toolbar" role="group" aria-label="3D inspection controls">
        <div className="nvx3d-button-group">
          <button type="button" disabled={!spec.file} aria-label="Rotate vehicle left" onClick={() => control('left')}>↶</button>
          <button type="button" disabled={!spec.file} aria-label="Rotate vehicle right" onClick={() => control('right')}>↷</button>
          <button type="button" disabled={!spec.file} aria-label="Zoom in" onClick={() => control('in')}>＋</button>
          <button type="button" disabled={!spec.file} aria-label="Zoom out" onClick={() => control('out')}>−</button>
        </div>
        <div className="nvx3d-button-group">
          <button type="button" disabled={!spec.file || !animate} aria-pressed={autoRotate && animate}
            onClick={() => setAutoRotate(value => !value)}>
            {!animate ? 'Motion paused' : autoRotate ? 'Pause rotation' : 'Auto rotate'}
          </button>
          <button type="button" disabled={!spec.file} onClick={() => control('reset')}>Reset view</button>
        </div>
      </div>
      <div className="nvx3d-version-navigation">
        <button type="button" className="nvx3d-arrow" aria-label="Previous NVX version" disabled={vehicles.length < 2} onClick={() => step(-1)}>←</button>
        <div className="nvx3d-swipe" tabIndex={0} role="group" aria-label="Swipe or use left and right arrow keys to change NVX version"
          onPointerDown={pointerDown} onPointerUp={pointerUp} onPointerCancel={() => { gesture.current = null; }}
          onLostPointerCapture={() => { gesture.current = null; }}
          onKeyDown={event => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1);
            }
          }}>
          <span aria-hidden="true">←</span><span>Swipe here to change version</span><span aria-hidden="true">→</span>
        </div>
        <button type="button" className="nvx3d-arrow" aria-label="Next NVX version" disabled={vehicles.length < 2} onClick={() => step(1)}>→</button>
      </div>
      {!selected && <p className="nvx3d-preview-note">Viewing {spec.label}. Select a version above to filter matching parts.</p>}
    </section>
  </div>;
}
