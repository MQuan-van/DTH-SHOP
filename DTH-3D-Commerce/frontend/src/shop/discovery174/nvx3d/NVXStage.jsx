import { useEffect, useRef, useState } from 'react';
import { useStartupAllowed } from '../../../experience/loader/StartupRenderContext.jsx';

export default function NVXStage({ spec, direction, motion, autoRotate, compact, commandRef }) {
  const host = useRef(null), api = useRef(null);
  const allowed = useStartupAllowed();
  const latest = useRef(null);
  const [status, setStatus] = useState({ phase: 'idle' });
  const [rendererAttempt, setRendererAttempt] = useState(0);
  const [modelAttempt, setModelAttempt] = useState(0);
  latest.current = { spec, direction, motion, autoRotate, compact };

  useEffect(() => {
    if (!allowed || !host.current) return undefined;
    let alive = true, started = false, stage = null, inView = false;
    const element = host.current;
    async function start() {
      if (started || !alive) return;
      started = true;
      setStatus({ phase: 'loading', message: 'Preparing 3D studio…' });
      try {
        const { createNVXStage } = await import('./createNVXStage.mjs');
        if (!alive) return;
        stage = createNVXStage(element, {
          compact: latest.current.compact,
          onStatus: value => { if (alive) setStatus(value); },
        });
        api.current = stage;
        stage.setVisible(inView);
        stage.setOptions(latest.current);
        void stage.select(latest.current.spec, latest.current.direction);
      } catch (error) {
        if (alive) setStatus({ phase: 'error', fatal: true, message: `Cannot start WebGL: ${error.message}` });
      }
    }
    const observer = new IntersectionObserver(entries => {
      inView = entries[0]?.isIntersecting === true;
      stage?.setVisible(inView);
      if (inView) void start();
    }, { rootMargin: '80px 0px' });
    observer.observe(element);
    const command = name => stage?.command(name);
    commandRef.current = command;
    return () => {
      alive = false;
      observer.disconnect();
      stage?.dispose();
      if (api.current === stage) api.current = null;
      if (commandRef.current === command) commandRef.current = null;
    };
  }, [allowed, rendererAttempt, commandRef]);

  useEffect(() => {
    if (api.current) void api.current.select(spec, direction);
  }, [spec, direction, modelAttempt]);
  useEffect(() => { api.current?.setOptions({ motion, autoRotate }); }, [motion, autoRotate]);

  const ready = status.phase === 'ready' && status.id === spec.id;
  const absent = !spec.file && status.phase === 'unavailable' && status.id === spec.id;
  const failed = status.phase === 'error';
  function retry() {
    if (status.fatal) setRendererAttempt(value => value + 1);
    else setModelAttempt(value => value + 1);
  }
  return <>
    <div className="nvx3d-viewport" data-nvx-stage data-state={ready ? 'ready' : status.phase}>
      <div className="nvx3d-watermark" aria-hidden="true">NVX</div>
      <div className="nvx3d-canvas-host" ref={host} aria-label={`${spec.label} interactive 3D preview`} />
      {!ready && <div className={`nvx3d-overlay ${absent ? 'nvx3d-overlay--empty' : ''}`} role="status" aria-live="polite">
        {failed ? <div className="nvx3d-status-card">
          <span className="nvx3d-eyebrow">3D PREVIEW UNAVAILABLE</span>
          <h3>{spec.label}</h3><p>{status.message}</p>
          <button type="button" onClick={retry}>Retry 3D ↻</button>
        </div> : absent ? <div className="nvx3d-status-card nvx3d-coming" key={spec.id} style={{ '--nvx-entry': `${direction * 32}px` }}>
          <span className="nvx3d-eyebrow">YAMAHA / {spec.label}</span>
          <h3>3D model coming soon.</h3>
          <p>You can still browse parts for this version.</p>
          <small>This space will use the correct {spec.label} model, not the V3 model.</small>
        </div> : <div className="nvx3d-status-card">
          <span className="nvx3d-spinner" aria-hidden="true" />
          <p>{!allowed ? 'Waiting for the opening sequence…' : status.message || `Preparing ${spec.label}…`}</p>
        </div>}
      </div>}
      <span className="nvx3d-corner-label" aria-hidden="true">360° / STUDIO VIEW</span>
    </div>
    <p className="nvx3d-help" id="nvx3d-inspection-help">
      Drag to rotate · Scroll or pinch to zoom · Right-drag to pan
    </p>
  </>;
}
