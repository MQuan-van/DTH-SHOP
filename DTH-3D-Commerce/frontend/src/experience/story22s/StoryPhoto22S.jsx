import { useState } from 'react';
import { photo22S } from './story22s.logic.mjs';

/** Non-destructive crop/grade. The original files, bikes and colours are not overwritten. */
export default function StoryPhoto22S({ name, className = '', eager = false, sizes = '100vw', decorative = false, style }) {
  const [failed, setFailed] = useState(false);
  const photo = photo22S(name);
  return <div className={`s22-photo ${className}`} style={style} data-photo={name}>
    {failed ? <div className="s22-photo-failed" role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : photo.alt}>
      {!decorative && <span>Photo unavailable</span>}
    </div> : <img src={photo.src} srcSet={photo.srcSet} sizes={sizes} width="1536" height="2048"
      alt={decorative ? '' : photo.alt} loading={eager ? 'eager' : 'lazy'} decoding="async"
      fetchPriority={eager ? 'high' : 'auto'} onError={() => setFailed(true)} />}
  </div>;
}
