import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import { navRoute22A } from '../account22a/account22a.logic.mjs';
import OneIcon from './OneIcon22A';
import './tokens22a.css';
import './navigation22a.css';
const destinations = [{to:'/',label:'Studio'}, {to:'/story',label:'Story'}, {to:'/shop',label:'Shop'}, {to:'/account',label:'Account'}];
export default function DTHNavigation22A({ vehicle, count, disabled, onChooseVehicle, openCart }) {
  const location = useLocation(), active = navRoute22A(location.pathname);
  const header = useRef(null), nav = useRef(null), marker = useRef(null), [open, setOpen] = useState(false);
  const menu = useRef(null);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useLayoutEffect(() => {
    const host=nav.current, bar=marker.current; if(!host||!bar) return;
    let alive=true, raf=0; const media=matchMedia('(prefers-reduced-motion: reduce)');
    const locate=()=>{
      if(!alive)return; const link=host.querySelector('[aria-current="page"]');
      if(!link){bar.style.opacity='0';return;} const a=link.getBoundingClientRect(), b=host.getBoundingClientRect();
      gsap.to(bar,{x:a.left-b.left+host.scrollLeft,y:a.bottom-b.top-5,width:a.width,opacity:1,duration:media.matches?0:.36,ease:'power3.out',overwrite:true});
    };
    const schedule=()=>{if(!alive)return;cancelAnimationFrame(raf);raf=requestAnimationFrame(locate);};
    const ro=new ResizeObserver(schedule);ro.observe(host);host.querySelectorAll('a').forEach(a=>ro.observe(a));
    document.fonts?.ready.then(schedule);media.addEventListener('change',schedule);locate();
    return()=>{alive=false;ro.disconnect();cancelAnimationFrame(raf);gsap.killTweensOf(bar);media.removeEventListener('change',schedule);};
  },[active,open]);
  useEffect(()=>{
    const el=header.current; if(!el)return;
    const report=()=>document.documentElement.style.setProperty('--dth-one-header-height',`${Math.ceil(el.getBoundingClientRect().height)}px`);
    const old=document.documentElement.style.getPropertyValue('--dth-one-header-height'); const ro=new ResizeObserver(report);ro.observe(el);report();
    return()=>{ro.disconnect();old?document.documentElement.style.setProperty('--dth-one-header-height',old):document.documentElement.style.removeProperty('--dth-one-header-height');};
  },[]);
  useEffect(()=>{
    const small=matchMedia('(max-width: 720px)');
    if(open){nav.current?.querySelector('a')?.focus({preventScroll:true});}
    const close=e=>{if(e.key==='Escape'&&open){setOpen(false);menu.current?.focus();}};
    const pointer=e=>{if(open&&!header.current?.contains(e.target))setOpen(false);};
    const resize=()=>{if(!small.matches)setOpen(false);};
    document.addEventListener('keydown',close);document.addEventListener('pointerdown',pointer);small.addEventListener('change',resize);
    return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',pointer);small.removeEventListener('change',resize);};
  },[open]);
  function bag(event){
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||location.pathname==='/bag')return;
    event.preventDefault();openCart(event.currentTarget);
  }
  return <header ref={header} className="dth-header dth-one-header" data-one-header data-menu-open={open}>
    <Link to="/" className="one-brand" aria-label="DTH store home"><span className="one-brand-mark" aria-hidden="true"><i/><i/><i/></span><span>DTH<small>PARTS STUDIO</small></span></Link>
    <nav ref={nav} id="dth-one-navigation" className="one-nav" aria-label="Main navigation">
      <span ref={marker} className="one-nav-trace" aria-hidden="true" />
      {destinations.map(item=><Link key={item.to} to={item.to} aria-current={active===item.to?'page':undefined} onClick={()=>setOpen(false)}><span>{item.label}</span></Link>)}
    </nav>
    <div className="one-header-tools">
      <button type="button" className="one-vehicle" onClick={onChooseVehicle} disabled={disabled} aria-label={vehicle?`Shopping vehicle: ${vehicleLabel(vehicle)}. Change vehicle`:'Select your vehicle'}><OneIcon name="vehicle"/><span>{vehicle?vehicleLabel(vehicle):'Choose vehicle'}</span><i aria-hidden="true"/></button>
      <Link to="/account" className="one-icon-action one-account-link" aria-label="Your account"><OneIcon name="profile"/></Link>
      <Link to="/bag" className="one-icon-action one-bag" onClick={bag} aria-label={`Shopping bag, ${count} items`} aria-haspopup="dialog" aria-controls="dth-cart-drawer"><OneIcon name="orders"/><span>{count}</span></Link>
      <button type="button" ref={menu} className="one-menu" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="dth-one-navigation" onClick={()=>setOpen(v=>!v)}><OneIcon name={open?'close':'menu'}/></button>
    </div>
  </header>;
}
