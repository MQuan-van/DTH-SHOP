import AccountAccess232 from '../refinement232/AccountAccess232';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import gsap from 'gsap';
import {vehicleLabel} from '../../../../shared/nvx.mjs';
import {nav23} from './spatial23.logic.mjs';
import Icon23 from './Icon23';
import '../../shop/design22a/tokens22a.css';
import './commerce23.css';
import StudioHeader26 from '../header26/StudioHeader26.jsx';
import {useStudioHeader26} from '../header26/header26.logic.mjs';
const destinations=[{id:'studio',label:'Studio',to:'/'},{id:'build',label:'Build',to:'/shop?mode=build'},{id:'shop',label:'Shop',to:'/shop?mode=shop'},{id:'story',label:'Story',to:'/story'}];
export default function DTHNavigation23({vehicle,count,disabled,onChooseVehicle,openCart}){
 const location=useLocation(),active=nav23(location.pathname,location.search),dark=['build','story'].includes(active),studioHeader=useStudioHeader26(location.pathname,location.search);
 const header=useRef(null),nav=useRef(null),marker=useRef(null),menu=useRef(null),[open,setOpen]=useState(false);
 useLayoutEffect(()=>{const html=document.documentElement,old=html.getAttribute('data-dth23');html.setAttribute('data-dth23','true');return()=>{old===null?html.removeAttribute('data-dth23'):html.setAttribute('data-dth23',old);};},[]);
 useEffect(()=>{setOpen(false);},[location.pathname,active,studioHeader]);
 useEffect(()=>{const q=matchMedia('(max-width:900px)'),resize=()=>{if(!q.matches)setOpen(false);};q.addEventListener('change',resize);return()=>q.removeEventListener('change',resize);},[]);
 useLayoutEffect(()=>{const el=header.current;if(!el)return;let alive=true;const style=document.documentElement.style,old=style.getPropertyValue('--dth-one-header-height');const report=()=>{if(!alive||!el.isConnected)return;const height=Math.round(el.getBoundingClientRect().height);if(height>0)style.setProperty('--dth-one-header-height',`${height}px`);};const o=new ResizeObserver(report);o.observe(el);report();return()=>{alive=false;o.disconnect();old?style.setProperty('--dth-one-header-height',old):style.removeProperty('--dth-one-header-height');};},[studioHeader]);
 useLayoutEffect(()=>{const host=nav.current,bar=marker.current;if(!host||!bar)return;let alive=true,frame=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)'),context=gsap.context(()=>{},host);
  const locate=()=>{if(!alive)return;const selected=host.querySelector('[aria-current="page"]');if(!selected){context.add(()=>gsap.set(bar,{opacity:0}));return;}const a=selected.getBoundingClientRect(),b=host.getBoundingClientRect();context.add(()=>gsap.to(bar,{x:a.left-b.left,scaleX:a.width,opacity:1,duration:reduced.matches?0:.32,ease:'power3.out',overwrite:true}));};
  const queue=()=>{if(!alive)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(locate);};const o=new ResizeObserver(queue);o.observe(host);for(const a of host.querySelectorAll('a'))o.observe(a);document.fonts?.ready.then(queue);reduced.addEventListener('change',queue);locate();return()=>{alive=false;o.disconnect();cancelAnimationFrame(frame);context.revert();reduced.removeEventListener('change',queue);};
 },[active,open,studioHeader]);
 useEffect(()=>{if(!open||studioHeader)return;nav.current?.querySelector('a')?.focus({preventScroll:true});const close=e=>{if(e.key==='Escape'){setOpen(false);menu.current?.focus();}},outside=e=>{if(!header.current?.contains(e.target))setOpen(false);};document.addEventListener('keydown',close);document.addEventListener('pointerdown',outside);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',outside);};},[open,studioHeader]);
 function bag(e){if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||location.pathname==='/bag')return;e.preventDefault();openCart(e.currentTarget);}
 if(studioHeader)return <StudioHeader26 vehicle={vehicle} count={count} disabled={disabled} onChooseVehicle={onChooseVehicle} openCart={openCart} headerRef={header}/>;
 return <header ref={header} className="dth-header c23-header p24-nav" data-tone={dark?'dark':'light'} data-open={open}>
  <Link to="/" className="c23-brand" aria-label="DTH home"><span className="c23-brand-mark" aria-hidden="true"><i/><i/><i/></span><strong>DTH</strong><span className="c23-brand-caption">Motorcycle parts</span></Link>
  <nav ref={nav} id="c23-main-nav" className="c23-main-nav" aria-label="Main navigation"><span ref={marker} className="c23-nav-marker" aria-hidden="true"/>{destinations.map(d=><Link key={d.id} to={d.to} aria-current={active===d.id?'page':undefined} onClick={()=>setOpen(false)}>{d.label}</Link>)}</nav>
  <div className="c23-header-actions"><button type="button" className="c23-header-vehicle" disabled={disabled} onClick={onChooseVehicle} aria-label={vehicle?`Change shopping vehicle: ${vehicleLabel(vehicle)}`:'Choose shopping vehicle'}><Icon23 name="vehicle"/><span>{vehicle?vehicleLabel(vehicle):'Choose vehicle'}</span></button><AccountAccess232 active={active==='account'}/><Link to="/bag" className="c23-header-bag" onClick={bag} aria-label={`Shopping bag, ${count} items`} aria-haspopup="dialog" aria-controls="dth-cart-drawer"><Icon23 name="bag"/><span>{count}</span></Link><button type="button" ref={menu} className="c23-mobile-menu" aria-expanded={open} aria-controls="c23-main-nav" onClick={()=>setOpen(v=>!v)} aria-label={open?'Close menu':'Open menu'}><Icon23 name={open?'close':'menu'}/></button></div>
 </header>;
}
