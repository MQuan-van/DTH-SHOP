import { lazy, Suspense } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../useStore';
import { MODE } from '../api';
import { useSupport } from '../support/SupportProvider';
import './admin.css';
import './motion.css';
const Overview=lazy(()=>import('./Overview'));
const Inbox=lazy(()=>import('./Inbox'));
const Products=lazy(()=>import('./Products'));
const Orders=lazy(()=>import('./Orders'));
const Experience=lazy(()=>import('../../experience/admin/ExperienceStudio'));
const Vehicles=lazy(()=>import('./Vehicles'));
const MODULES=[['','Overview','◈'],['inbox','Inbox','◌'],['products','Products','▧'],['experience','Experience','◉'],['vehicles','Vehicles','◇'],['orders','Orders','▤']];
export default function AdminLayout(){
  const store=useStore(),support=useSupport();
  if(store.authLoading)return <div className="dth-admin-gate" role="status">Checking access…</div>;
  if(MODE!=='api')return <section className="dth-admin-gate"><h1>Admin Studio</h1><p>Catalog management and live support require API mode. Preview never impersonates an administrator.</p><Link to="/account">Back to account →</Link></section>;
  if(store.authError)return <section className="dth-admin-gate"><h1>Session unavailable.</h1><p role="alert">{store.authError}</p><button onClick={store.retrySession}>Try again</button></section>;
  if(store.user?.role!=='admin')return <section className="dth-admin-gate"><h1>Administrator access required.</h1><p>Sign in with an administrator account.</p><Link to="/account">Go to account →</Link></section>;
  return <section className="dth-admin"><aside className="dth-admin-sidebar"><Link className="dth-admin-logo" to="/admin">DTH<span>ADMIN STUDIO</span></Link><nav aria-label="Admin navigation">{MODULES.map(([path,label,icon])=><NavLink end={!path} key={path} to={`/admin${path?'/'+path:''}`}><span aria-hidden="true">{icon}</span>{label}{path==='inbox'&&support.conversations.some(c=>c.unread>0)&&<i aria-label="Unread conversations"/>}</NavLink>)}</nav><div className="dth-admin-operator"><span>WORKSPACE</span><strong>{store.user.email}</strong><Link to="/account">Account settings ↗</Link><Link to="/shop">Open storefront ↗</Link></div></aside><main className="dth-admin-main"><Suspense fallback={<p className="dth-admin-loading" role="status">Loading workspace…</p>}><Routes><Route index element={<Overview/>}/><Route path="inbox" element={<Inbox/>}/><Route path="products/*" element={<Products/>}/><Route path="experience" element={<Experience/>}/><Route path="vehicles" element={<Vehicles/>}/><Route path="orders/*" element={<Orders/>}/><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes></Suspense></main></section>;
}
