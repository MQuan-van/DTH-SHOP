import PremiumAdminShell213 from './premium213/PremiumAdminShell213.jsx';
import { lazy, Suspense } from 'react';
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from '../useStore';
import { MODE } from '../api';
import { useSupport } from '../support/SupportProvider';
import './admin.css';
import './motion.css';
import './ops18/ops18.global.css';
import './ops18b/admin-pro.css';
const Overview=lazy(()=>import('./ops18b/OverviewPro'));
const Inbox=lazy(()=>import('./ops18b/InboxPro'));
const Products=lazy(()=>import('./Products'));
const Orders=lazy(()=>import('./Orders'));
const Experience=lazy(()=>import('../../experience/admin/ExperienceStudio'));
const AIAssetStudio=lazy(()=>import('../../experience/admin/ai-assets/AIAssetStudio.jsx'));
const Vehicles=lazy(()=>import('./Vehicles'));
const MODULES=[['','Overview','◈'],['inbox','Inbox','◌'],['products','Products','▧'],['experience','Experience','◉'],['ai-assets','AI Assets','✦'],['vehicles','Vehicles','◇'],['orders','Orders','▤']];
export default function AdminLayout(){
  const store=useStore(),support=useSupport();
  if(store.authLoading)return <div className="dth-admin-gate" role="status">Checking access…</div>;
  if(MODE!=='api')return <section className="dth-admin-gate"><h1>Admin Studio</h1><p>Catalog management and live support require API mode. Preview never impersonates an administrator.</p><Link to="/account">Back to account →</Link></section>;
  if(store.authError)return <section className="dth-admin-gate"><h1>Session unavailable.</h1><p role="alert">{store.authError}</p><button onClick={store.retrySession}>Try again</button></section>;
  if(store.user?.role!=='admin')return <section className="dth-admin-gate"><h1>Administrator access required.</h1><p>Sign in with an administrator account.</p><Link to="/account">Go to account →</Link></section>;
  // DTH_PREMIUM_213A_SHELL — existing auth and route children are unchanged.
  return <PremiumAdminShell213 modules={MODULES} user={store.user} support={support}><Suspense fallback={<p className="dth-admin-loading" role="status">Loading workspace…</p>}><Routes><Route index element={<Overview/>}/><Route path="inbox" element={<Inbox/>}/><Route path="products/*" element={<Products/>}/><Route path="experience" element={<Experience/>}/><Route path="ai-assets" element={<AIAssetStudio/>}/><Route path="vehicles" element={<Vehicles/>}/><Route path="orders/*" element={<Orders/>}/><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes></Suspense></PremiumAdminShell213>;
}
