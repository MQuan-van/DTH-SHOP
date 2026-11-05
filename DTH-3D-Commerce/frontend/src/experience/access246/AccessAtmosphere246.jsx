import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { atmospherePermission246, atmospherePose246, resetLightPointer246 } from './atmosphere246.logic.mjs';
import WheelWash247 from './WheelWash247';

export default function AccessAtmosphere246({ policy, director, focusing, busy }) {
  const root = useRef(null), latest = useRef({ policy, focusing, busy });
  const controls = useRef(null);
  latest.current = { policy, focusing, busy };
  useLayoutEffect(() => {
    let update, gate;
    const context = gsap.context(() => {
      const glow = root.current.querySelector('.a246-light-follow');
      const aperture = root.current.querySelector('.a246-aperture');
      const xTo = gsap.quickTo(glow, 'x', { duration: .6, ease: 'power3.out' });
      const yTo = gsap.quickTo(glow, 'y', { duration: .6, ease: 'power3.out' });
      const rotate = gsap.quickSetter(aperture, 'rotation', 'deg');
      const scale = gsap.quickSetter(aperture, 'scale');
      const alpha = gsap.quickSetter(aperture, 'opacity');
      update = () => {
        const current = latest.current;
        const permission = atmospherePermission246(current.policy, current);
        if (permission.blocked) return;
        const pose = atmospherePose246(director.state, current.policy.pointer?.current);
        xTo(pose.x); yTo(pose.y);
        rotate(pose.apertureRotation); scale(pose.apertureScale); alpha(pose.opacity);
      };
      gate = () => {
        const current = latest.current;
        const permission = atmospherePermission246(current.policy, current);
        if (permission.blocked) { xTo.tween.pause(); yTo.tween.pause(); }
        else update();
        if (current.policy.reduced || current.policy.compact || current.policy.saveData) {
          resetLightPointer246(xTo, yTo);
          rotate(0); scale(1); alpha(.87);
        }
      };
      controls.current = { gate };
      gate();
    }, root);
    const offPointer = policy.subscribe(update), offDirector = director.subscribe(update);
    return () => { offPointer(); offDirector(); controls.current = null; context.revert(); };
  }, [director, policy.subscribe]);
  useLayoutEffect(() => { controls.current?.gate(); }, [policy.allowed, policy.motion, policy.hidden, policy.paused, policy.compact, policy.reduced, policy.saveData, focusing, busy]);
  const showWheelWash = !policy.compact && !policy.reduced && !policy.saveData;
  return <div ref={root} className="a246-atmosphere" aria-hidden="true">
    <div className="a246-light-follow"><div className="a246-aperture"><div className="a246-light-cut"/><div className="a246-light-spill"/></div></div>
    {showWheelWash && <WheelWash247 blocked={atmospherePermission246(policy, { focusing, busy }).blocked}/>}
    <div className="a246-floor-fade"/>
    <div className="a246-reading-veil"/>
  </div>;
}
