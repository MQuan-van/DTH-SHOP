import { useState } from 'react';
/** A photograph, not a 3D model or proof of a part fitted to this bike. */
export default function Photo({ photo, eager = false, contain = false, sizes = '(max-width: 760px) 100vw, 55vw' }) {
  const [failed, setFailed] = useState('');
  if (!photo || failed === photo.src) return <span className="d174-photo-empty" role="img" aria-label="Community photograph unavailable">DTH <small>Photo unavailable</small></span>;
  return <img className={contain ? 'd174-photo d174-contain' : 'd174-photo'} src={photo.src} srcSet={photo.srcSet} sizes={sizes}
    alt={photo.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable="false" onError={() => setFailed(photo.src)}
    style={{ objectPosition: photo.position }} />;
}
