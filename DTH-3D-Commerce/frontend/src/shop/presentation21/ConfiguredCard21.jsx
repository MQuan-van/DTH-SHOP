import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import './presentation21.css';
const Preview21=lazy(()=>import('./ProductPresentationPreview21.jsx'));
/** Keeps the card's Link/Quick View untouched; no photograph or shopper lighting panel. */
export default function ConfiguredCard21({product,motion=true}) {
  const root=useRef(null),[visible,setVisible]=useState(false);
  useEffect(()=>{const node=root.current;if(!node)return;
    if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.1});observer.observe(node);return()=>observer.disconnect();},[]);
  return <div ref={root} className="dth-configured-card21" role="img" aria-label={`${product.name}: 3D preview`}>
    {visible?<Suspense fallback={<span className="dth-card-message21">Preparing 3D…</span>}><Preview21 key={`${product.id}:${product.modelUrl}`} product={product} motion={motion} interactive={false}/></Suspense>
      :<span className="dth-card-message21">3D preview</span>}
  </div>;
}
