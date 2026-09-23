import { useEffect, useState } from 'react';
function readPolicy() {
  return {
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    compact: !window.matchMedia('(min-width: 1000px) and (min-height: 680px) and (pointer: fine)').matches,
    saveData: !!navigator.connection?.saveData,
  };
}
export function useExperiencePolicy() {
  const [policy, setPolicy] = useState(readPolicy);
  useEffect(() => {
    const queries = [matchMedia('(prefers-reduced-motion: reduce)'), matchMedia('(min-width: 1000px) and (min-height: 680px) and (pointer: fine)')];
    const update = () => setPolicy(readPolicy());
    queries.forEach(query => query.addEventListener('change', update));
    navigator.connection?.addEventListener?.('change', update);
    return () => { queries.forEach(query => query.removeEventListener('change', update)); navigator.connection?.removeEventListener?.('change', update); };
  }, []);
  return policy;
}
export function hasWebGL() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}
