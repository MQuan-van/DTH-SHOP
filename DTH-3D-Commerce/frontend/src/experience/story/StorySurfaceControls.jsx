import { useEffect, useState, useSyncExternalStore } from 'react';
import styles from './StorySurfaceControls.module.css';
export { createSurfaceController } from './effects/surfaceMotion.mjs';

/** Text-only navigation; no endless pulse, sound, global cursor or scroll capture. */
export default function StorySurfaceControls({ surface, signal, ready, reduced, compact }) {
  const current=useSyncExternalStore(surface.subscribe,surface.getSnapshot,surface.getSnapshot);
  const [moving,setMoving]=useState(signal.state.motion);
  useEffect(()=>{
    const update=()=>setMoving(signal.state.motion);update();return signal.subscribe(update);
  },[signal]);
  const still=reduced||!moving;
  const canReveal=!compact&&!reduced;
  const displayed=still||!current.supported?'surface':current.mode;
  return <div className={styles.surfaceControls} data-story-surface-controls>
    <div className={styles.tabs} role="group" aria-label="Product surface effects">
      {[['surface','Full surface'],['reveal','Liquid reveal'],['technical','Technical scan']].map(([id,label])=><button
        key={id} type="button" aria-pressed={displayed===id}
        disabled={!ready||!current.supported||(id!=='surface'&&still)||(id==='reveal'&&!canReveal)}
        onClick={()=>surface.choose(id)}>{label}</button>)}
    </div>
    <div className={styles.note}>
      <span>{!ready?'Surface effects become available after 3D loads.':!current.supported?'Full surface · this model is not supported by this effect.':still?'Still view. Play motion to explore the surface.':displayed==='reveal'?'Move across the part. The surface follows your trail.':displayed==='technical'?'A moving wireframe study. Not a physical scan.':'Full product view. Choose an effect to look closer.'}</span>
      <button type="button" disabled={!ready||still||!current.supported} onClick={()=>surface.replay()}>Replay reveal <span aria-hidden="true">↻</span></button>
    </div>
    {!canReveal&&!reduced&&ready&&<p className={styles.touchNote}>Liquid reveal needs a fine pointer and a larger viewport. Full surface and scan remain available.</p>}
  </div>;
}
