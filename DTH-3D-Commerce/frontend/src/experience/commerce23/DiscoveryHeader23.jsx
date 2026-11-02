import {Link,Navigate,useLocation} from 'react-router-dom';
export default function DiscoveryHeader23({mode,story,onView}){
 if(mode!=='shop')return null;
 return <header className="c23-shop-head"><div><p>Parts for your next ride</p><h1>The collection.</h1></div><div className="c23-shop-actions"><Link to="/shop?mode=build" className="c23-text-link">Choose on your NVX</Link><div className="c23-view-switch" role="group" aria-label="Catalogue view"><button type="button" aria-pressed={story} onClick={()=>onView('story')}>Showcase</button><button type="button" aria-pressed={!story} onClick={()=>onView('grid')}>Catalog</button></div></div></header>;
}
export function ExploreRedirect23(){
 const {search}=useLocation(),p=new URLSearchParams(search);p.delete('mode');const hasFilters=['category','q','fit','max'].some(k=>p.has(k));if(hasFilters){p.set('mode','shop');return <Navigate to={`/shop?${p}`} replace/>;}return <Navigate to="/story" replace/>;
}
