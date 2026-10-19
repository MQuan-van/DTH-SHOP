import {useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import ProIcon from './ProIcon';
import calm from './adminCalm19B.module.css';
import {connectionLabel,count} from './opsPro.logic.mjs';
import s from './adminPro.module.css';
// const { chars } = splitText(target, { chars: true });

export function Topbar({label,status,children}) {
  return <div className={s.topbar}><div className={s.breadcrumb}><Link to="/admin">DTH Studio</Link><span>/</span><strong>{label}</strong></div><div className={s.topActions}>
    <span className={s.connection} data-live={status==='live'}><i/>{connectionLabel(status)}</span>
    {children}
  </div></div>;

}
export function Hero({inbox=false,ui,status}) {
  return <header className={`${s.hero} ${calm.calmHero}`} data-compact={inbox} data-inbox-hero={inbox?'true':undefined} data-pro-enter>
    <div className={s.heroGrid} aria-hidden="true"/><div className={s.heroCopy}><span className={s.eyebrow}>DTH / {inbox?'CUSTOMER CARE':'OPERATIONS'}</span>
      <h1>{inbox?<>Inbox.<br/><em>Closer to the rider.</em></>:<>Your studio.<br/><em>In control.</em></>}</h1>
      <p>{inbox?'Every conversation. The right context.':'The catalog, the conversations, the next move.'}</p>
      {!inbox&&<div className={s.heroActions}><Link to="/admin/inbox" className={s.heroPrimary}>Open inbox <ProIcon name="arrow"/></Link><Link to="/admin/products" className={s.heroLink}>Manage products <ProIcon name="chevron" size={14}/></Link></div>}
    </div><div className={calm.heroGraphic} aria-hidden="true">
      <span className={calm.graphicKicker}>DTH / OPERATIONS</span>
      <strong className={calm.graphicWord}>DTH<span>STUDIO</span></strong>
      <span className={calm.graphicLine}/>
      <div className={calm.graphicMeta}><span>01 / CATALOG</span><span>02 / SUPPORT</span><span>03 / GARAGE</span></div>
    </div>
  </header>;
}
export function ErrorPanel({children,retry}) {return children?<div className={s.error} role="alert">{children}{retry&&<button type="button" onClick={retry}>Try again</button>}</div>:null;}
export function Value({value,motion=false}){
  const ref=useRef(null),valid=count(value);
  useEffect(()=>{if(!motion||valid===null||!ref.current)return;let a;try{a=ref.current.animate([{opacity:.3,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:240,easing:'ease-out'});}catch{}return()=>a?.cancel();},[valid,motion]);
  return <strong ref={ref}>{valid===null?'—':new Intl.NumberFormat('en').format(valid)}</strong>;
}
export function SectionTitle({title,aside}) {return <div className={s.sectionTitle}><h2>{title}</h2>{aside}</div>;}
export function Empty({title,children}) {return <div className={s.empty}><ProIcon name="inbox" size={26}/><h3>{title}</h3><p>{children}</p></div>;}
export function ResourceState({resource,label}) {return <><ErrorPanel retry={resource.reload}>{resource.error}</ErrorPanel>{!resource.data&&!resource.error&&<div className={s.skeleton} role="status" aria-label={`Loading ${label}`}><i/><i/><i/></div>}</>;}
export function usePageTitle(title){useEffect(()=>{const previous=document.title;document.title=`${title} — DTH Admin`;return()=>{document.title=previous;};},[title]);}
