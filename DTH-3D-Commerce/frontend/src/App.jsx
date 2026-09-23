import { lazy, Suspense, useLayoutEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import StoreApp from './shop/StoreApp.jsx';
import { StoreProvider } from './shop/useStore';
const AdminLayout=lazy(()=>import('./shop/admin/AdminLayout'));
function AdminApp(){
  useLayoutEffect(()=>{document.documentElement.dataset.dthStore='true';document.title='Admin Studio — DTH';return()=>{delete document.documentElement.dataset.dthStore;};},[]);
  return <StoreProvider><div className="dth-store"><Suspense fallback={<p role="status" style={{padding:40}}>Loading Admin Studio…</p>}><AdminLayout/></Suspense></div></StoreProvider>;
}
// Separate back-office shell; customer page implementation is intentionally untouched.
export default function App(){return <Routes><Route path="/admin/*" element={<AdminApp/>}/><Route path="*" element={<StoreApp/>}/></Routes>;}
