import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { createAccessDirector245, directorPermission245 } from './director245.logic.mjs';

export default function useAccessDirector245(root, { policy, focusing, busy, registering, ready }) {
  const [director] = useState(() => createAccessDirector245(registering));
  const tweens = useRef({}), context = useRef(null), introduced = useRef(false);
  const latest = useRef({ policy, focusing, busy, ready });
  latest.current = { policy, focusing, busy, ready };
  const sync = useCallback(() => {
    director.state.active = !director.state.blocked && Object.values(tweens.current).some(tween => tween?.isActive());
    director.emit();
  }, [director]);
  useLayoutEffect(() => {
    context.current = gsap.context(() => {}, root);
    return () => {
      Object.values(tweens.current).forEach(tween => tween?.kill());
      tweens.current = {}; context.current?.revert(); context.current = null;
    };
  }, [root]);
  const animate = useCallback((key, value, duration, instant = false) => {
    tweens.current[key]?.kill(); delete tweens.current[key];
    const permission = directorPermission245(latest.current.policy, latest.current);
    if (instant || !permission.motion || permission.blocked || !latest.current.ready) {
      director.state[key] = value; sync(); return;
    }
    context.current?.add(() => {
      tweens.current[key] = gsap.to(director.state, { [key]: value, duration, ease: 'power3.inOut', overwrite: 'auto',
        onStart: sync, onUpdate: sync, onComplete: () => { delete tweens.current[key]; sync(); } });
    });
    sync();
  }, [director, sync]);
  useLayoutEffect(() => {
    const permission = directorPermission245(policy, { focusing, busy });
    Object.assign(director.state, permission);
    if (!introduced.current && !ready) director.state.intro = permission.blocked ? 1 : 0;
    if (policy.reduced || policy.compact || policy.saveData) {
      Object.values(tweens.current).forEach(tween => tween?.kill()); tweens.current = {};
      director.state.intro = 1; director.state.mode = registering ? 1 : 0; director.state.detail = 0;
    } else Object.values(tweens.current).forEach(tween => permission.blocked ? tween?.pause() : tween?.resume());
    sync();
  }, [policy.allowed, policy.motion, policy.reduced, policy.compact, policy.saveData, policy.hidden, policy.paused, focusing, busy, registering, ready, director, sync]);
  useEffect(() => {
    if (!ready || introduced.current) return;
    introduced.current = true;
    if (director.state.blocked) { director.state.intro = 1; sync(); return; }
    director.state.intro = 0; director.state.detail = 0; director.emit();
    animate('intro', 1, 1.25);
  }, [ready, animate, director, sync]);
  useEffect(() => {
    const instant = director.intent.modeInstant; director.intent.modeInstant = false;
    animate('mode', registering ? 1 : 0, .8, instant);
  }, [registering, animate, director]);
  const view = useCallback((detail, instant = false) => {
    tweens.current.intro?.kill(); delete tweens.current.intro;
    director.state.intro = 1; animate('detail', detail ? 1 : 0, .85, instant);
  }, [director, animate]);
  const replay = useCallback(() => {
    if (!latest.current.ready || director.state.blocked) return;
    tweens.current.detail?.kill(); delete tweens.current.detail;
    director.state.detail = 0; director.state.intro = 0; director.emit(); animate('intro', 1, 1.25);
  }, [director, animate]);
  return { director, view, replay };
}
