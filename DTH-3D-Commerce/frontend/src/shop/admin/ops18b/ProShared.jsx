import {useEffect,useRef} from 'react';
import {Link} from 'react-router-dom';
import ProIcon from './ProIcon';
import Mechanism from './Mechanism';
import {connectionLabel,count} from './opsPro.logic.mjs';
import s from './adminPro.module.css';
export function Topbar({label,ui,status,children}) {
  return <div className={s.topbar}><div className={s.breadcrumb}><Link to="/admin">DTH Studio</Link><span>/</span><strong>{label}</strong></div><div className={s.topActions}>
    <span className={s.connection} data-live={status==='live'}><i/>{connectionLabel(status)}</span>
    <button className={s.iconButton} type="button" aria-label={ui.motion?'Pause interface motion':'Enable interface motion'} aria-pressed={ui.motion} disabled={ui.reduced} onClick={()=>ui.setMotion(!ui.motion)}><ProIcon name={ui.motion?'pause':'play'}/></button>{children}
  </div></div>;
}
export function Hero({inbox=false,ui,status}) {
  return <header className={s.hero} data-compact={inbox} data-pro-enter hidden={inbox&&ui.focus}>
    <div className={s.heroGrid} aria-hidden="true"/><div className={s.heroCopy}><span className={s.eyebrow}>DTH / {inbox?'CUSTOMER CARE':'OPERATIONS'}</span>
      <h1>{inbox?<>Inbox.<br/><em>Closer to the rider.</em></>:<>Your studio.<br/><em>In motion.</em></>}</h1>
      <p>{inbox?'Every conversation. The right context.':'The catalog, the conversations, the next move.'}</p>
      {!inbox&&<div className={s.heroActions}><Link to="/admin/inbox" className={s.heroPrimary}>Open inbox <ProIcon name="arrow"/></Link><Link to="/admin/products" className={s.heroLink}>Manage products <ProIcon name="chevron" size={14}/></Link></div>}
    </div><Mechanism motion={ui.motion} compact={ui.compact} reduced={ui.reduced} connected={status==='live'} hidden={inbox&&ui.focus}/>
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
