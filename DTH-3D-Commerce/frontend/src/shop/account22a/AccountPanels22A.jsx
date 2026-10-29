import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatMoney } from '../../../../shared/domain.mjs';
import { orderUnits } from '../../../../shared/account.mjs';
import { vehicleLabel } from '../../../../shared/nvx.mjs';
import OneIcon from '../design22a/OneIcon22A';
import { safeDate22A } from './account22a.logic.mjs';
export function AccountDialog22A({title,busy,onClose,children}){
  const ref=useRef(null),titleId=useId(),closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{const el=ref.current,previous=document.activeElement;el.showModal();el.querySelector('[data-initial-focus]')?.focus();return()=>{if(el.open)el.close();if(previous?.isConnected)previous.focus({preventScroll:true});};},[]);
  return <dialog className="aa22-dialog" ref={ref} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)closeRef.current();}}>
    <header><h2 id={titleId}>{title}</h2><button type="button" className="aa22-control" onClick={onClose} disabled={busy} aria-label="Close dialog"><OneIcon name="close"/></button></header>{children}
  </dialog>;
}
export function OrderRows22A({rows,openOrder}){
  return <ul className="aa22-orders-list">{rows.map(order=><li key={order.id}><button type="button" className="aa22-order-row" data-aa-light onClick={()=>openOrder(order.id)}>
    <span className="aa22-order-symbol"><OneIcon name="orders"/></span><span className="aa22-order-name"><strong>{order.id}</strong><small>{safeDate22A(order.createdAt)} · {orderUnits(order)} items</small></span>
    <span className="aa22-order-value"><strong>{formatMoney(order.total)}</strong><small>Demo confirmed</small></span><span className="aa22-order-open">View</span>
  </button></li>)}</ul>;
}
export function OrdersPanel22A({member:m,detail}){
  const rows=Array.isArray(m.records?.data)?m.records.data:[];
  const genuinelyEmpty=m.records&&m.records.total===0&&!m.search&&m.page===1;
  return <section className="aa22-panel aa22-orders-panel" aria-labelledby="aa22-orders-title" data-aa-enter>
    <header className="aa22-panel-heading"><div><p className="aa22-label">Your activity</p><h1 ref={m.heading} tabIndex={-1} id="aa22-orders-title">{m.orderId?'Order detail':'Orders'}</h1></div>{m.records&&!m.orderId&&<span className="aa22-count">{m.records.total} {m.records.total===1?'order':'orders'}</span>}</header>
    {m.orderId?<div className="aa22-original-detail">{detail}</div>:<>
      {!genuinelyEmpty&&<form className="aa22-order-search" onSubmit={e=>{e.preventDefault();m.go('orders',m.draft.trim()?{q:m.draft.trim()}:{});}}><label htmlFor="aa22-search">Search your orders</label><div><OneIcon name="search"/><input id="aa22-search" type="search" maxLength={64} placeholder="Order number or product" value={m.draft} onChange={e=>m.setDraft(e.target.value)}/><button type="submit" className="aa22-action aa22-primary" data-aa-light>Search</button></div></form>}
      {m.error?<div className="aa22-feedback" role="alert"><strong>Orders could not be loaded.</strong><p>{m.error}</p><button className="aa22-action aa22-secondary" type="button" onClick={m.retry}>Try again</button></div>:!m.records?<div className="aa22-loading" role="status"><span className="aa22-loader"/>Loading orders</div>:!rows.length?<div className="aa22-empty-orders"><span className="aa22-empty-order-icon" aria-hidden="true"><OneIcon name="orders"/></span><h2>{m.search||m.page>1?'No matching orders.':'Nothing ordered. Yet.'}</h2><p>{m.search||m.page>1?'Try a different search or return to your order list.':'Your orders will appear here after a demo checkout.'}</p>{m.search||m.page>1?<button type="button" className="aa22-action aa22-secondary" onClick={()=>m.go('orders')}>Clear search</button>:<Link className="aa22-action aa22-primary" data-aa-light to="/shop">Explore parts</Link>}</div>:<OrderRows22A rows={rows} openOrder={m.openOrder}/>}
      {m.records&&m.records.pageSize>0&&m.records.total>m.records.pageSize&&<nav className="aa22-pagination" aria-label="Order pages"><button type="button" className="aa22-action aa22-secondary" disabled={m.page<=1} onClick={()=>m.go('orders',{...(m.search?{q:m.search}:{}),page:String(m.page-1)})}>Previous</button><span>Page {m.page} of {Math.ceil(m.records.total/m.records.pageSize)}</span><button type="button" className="aa22-action aa22-secondary" disabled={m.page*m.records.pageSize>=m.records.total} onClick={()=>m.go('orders',{...(m.search?{q:m.search}:{}),page:String(m.page+1)})}>Next</button></nav>}
    </>}
  </section>;
}
export function ProfilePanel22A({member:m,defaultVehicle,shoppingVehicle}){
  return <section className="aa22-panel aa22-profile-panel" aria-labelledby="aa22-profile-title" data-aa-enter>
    <header className="aa22-panel-heading"><div><p className="aa22-label">Personal details</p><h1 ref={m.heading} tabIndex={-1} id="aa22-profile-title">Profile</h1></div><span className="aa22-profile-avatar" aria-hidden="true">{m.store.user.email.slice(0,1).toUpperCase()}</span></header>
    <dl className="aa22-spec-sheet"><div><dt>Email</dt><dd>{m.store.user.email}</dd></div><div><dt>Member since</dt><dd>{safeDate22A(m.store.user.createdAt)}</dd></div><div><dt>Saved default</dt><dd>{defaultVehicle?vehicleLabel(defaultVehicle):'No default vehicle'}<button type="button" className="aa22-text-action" onClick={()=>m.go('vehicle')}>Manage garage</button></dd></div><div><dt>Shopping vehicle</dt><dd>{shoppingVehicle?vehicleLabel(shoppingVehicle):'Not selected'}<small>This selection is separate from your saved default.</small></dd></div></dl>
    <div className="aa22-danger-zone"><div><h2>Delete account</h2><p>Permanently removes this demo account, saved vehicles and simulated orders.</p></div><button type="button" className="aa22-action aa22-danger" onClick={m.onDelete}>Delete account</button></div>
  </section>;
}
