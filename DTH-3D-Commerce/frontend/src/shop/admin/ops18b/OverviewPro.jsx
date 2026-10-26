import PremiumOverview213 from '../premium213/PremiumOverview213.jsx';
import {useRef} from 'react';
import {Link} from 'react-router-dom';
import {useStore} from '../../useStore';
import {useSupport} from '../../support/SupportProvider';
import {studioRequest} from '../../api';
import {formatMoney} from '../../../../../shared/domain.mjs';
import useOpsUI,{useOpsEntrance,useResource} from './useOpsUI';
import {coverage,relativeTime,sortRows,metrics} from './opsPro.logic.mjs';
import {Topbar,Hero,Value,SectionTitle,ResourceState,Empty,usePageTitle} from './ProShared';
import ProIcon from './ProIcon';
import s from './adminPro.module.css';
const cards=[['openChats','Open conversations','inbox','/admin/inbox?status=open'],['active','Visible products','cube','/admin/products?active=true'],['orders','Demo orders','order','/admin/orders'],['vehicles','NVX versions','vehicle','/admin/vehicles']];
export default function OverviewPro(){
  const store=useStore(),support=useSupport(),ui=useOpsUI(),root=useRef(null);
  const overview=useResource('/admin/studio/overview',support.revision,studioRequest,store.user?.id);
  const queue=useResource('/chat/conversations?page=1',support.revision,studioRequest,store.user?.id);
  const orders=useResource('/admin/studio/orders?page=1',0,studioRequest,store.user?.id);
  const stats=overview.data?.data,catalog=coverage(stats),rows=queue.data?.data||[],recent=sortRows(rows,'unread').slice(0,5),q=metrics(rows);
  usePageTitle('Overview');useOpsEntrance(root,ui.motion);
  // DTH_PREMIUM_213A_OVERVIEW — all resources and calculations above are retained.
  return <PremiumOverview213 root={root} ui={ui} overview={overview} queue={queue} orders={orders}
    stats={stats} catalog={catalog} rows={rows} recent={recent} q={q} cards={cards}/>;
}
