import { useEffect, useState } from 'react';

// Approved remote assets override the optional hard-coded local GLB paths.
// An absent manifest is not an error: existing hand-supplied models keep working.
export function usePublishedNVXModels() {
  const [models, setModels] = useState({});
  useEffect(() => {
    let active = true;
    const api = (import.meta.env.VITE_SHOP_API_URL || '/api/shop').replace(/\/$/, '');
    async function refresh() {
      try {
        const response = await fetch(`${api}/ai-assets/models`, { credentials: 'include', cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json();
        const next = {};
        for (const version of ['v1', 'v2', 'v3']) {
          const id = `yamaha-nvx-${version}`;
          const url = result?.data?.[id]?.url;
          // Only allow the known public model endpoints, never a remote URL from an API response.
          if (typeof url === 'string' && new RegExp(`^api/shop/ai-assets/models/${version}\\.glb\\?rev=[a-f0-9-]{36}$`).test(url)) {
            next[id] = { file: url };
          }
        }
        if (active) setModels(next);
      } catch { /* Preview/offline mode: retain the local assets. */ }
    }
    void refresh();
    const onFocus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.removeEventListener('focus', onFocus); };
  }, []);
  return models;
}
