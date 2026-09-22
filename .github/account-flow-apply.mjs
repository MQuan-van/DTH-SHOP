// One-time exact-match integration on the isolated feature branch. Removed after publication.
import fs from 'node:fs';
const root='DTH-3D-Commerce/';
function edit(path,changes){let text=fs.readFileSync(root+path,'utf8');for(const[before,after]of changes){const count=text.split(before).length-1;if(count!==1)throw Error(`${path}: expected one ${JSON.stringify(before)}, found ${count}`);text=text.replace(before,after);}fs.writeFileSync(root+path,text);}
edit('frontend/src/shop/StoreApp.jsx',[
 ["import { PREVIEW, createOrder,","import { PREVIEW, FLOW, createOrder,"],
 ["import AccountPage from './account/AccountPage';","import AccountPage from './account/AccountPage';\nimport { ConfirmationSeal } from './account/AccountMotion';"],
 ["<b>{PREVIEW ? 'LOCAL PREVIEW' : 'MONGODB / API MODE'}</b>","<b data-flow={FLOW}>{FLOW ? 'FLOW DEMO / NO DATABASE' : PREVIEW ? 'LOCAL PREVIEW' : 'MONGODB / API MODE'}</b>"],
 ["'dth.commerce.checkout-intent.v2'","(FLOW ? 'dth.flow.checkout-intent.v2' : 'dth.commerce.checkout-intent.v2')"],
 ["'API / SIMULATED ORDER'","(FLOW ? 'FLOW DEMO / NO DATABASE' : 'API / SIMULATED ORDER')"],
 ["'The server checks current prices and vehicle matches before saving a simulated order.'","(FLOW ? 'This rehearsal stays in this tab when storage is available. Nothing is sent to a server.' : 'The server checks current prices and vehicle matches before saving a simulated order.')"],
 ["'SAVED SIMULATED ORDER'","(FLOW ? 'FLOW DEMO RECEIPT' : 'SAVED SIMULATED ORDER')"],
 ["<h1>Your demo order is confirmed.</h1>","<ConfirmationSeal />\n      <h1>Your demo order is confirmed.</h1>"],
 ["'Loaded from your account'","(FLOW ? 'Demo data in this tab only — not MongoDB' : 'Loaded from your account')"],
]);
edit('frontend/src/shop/useStore.jsx',[
 ["import { currentUser, loadCatalog, logout as apiLogout }","import { FLOW, currentUser, loadCatalog, logout as apiLogout }"],
 ["const CART_KEY = 'dth.commerce.bag.v1';","const CART_KEY = FLOW ? 'dth.flow.bag.v1' : 'dth.commerce.bag.v1';"],
 ["const VEHICLE_KEY = 'dth.commerce.vehicle.v1';","const VEHICLE_KEY = FLOW ? 'dth.flow.vehicle.v1' : 'dth.commerce.vehicle.v1';"],
]);
edit('frontend/src/shop/account/AccountPage.jsx',[
 ["loadAccountOrders, PREVIEW, saveAccountVehicle","loadAccountOrders, PREVIEW, FLOW, saveAccountVehicle"],
 ["import AccountVisual from './AccountVisual';","import AccountVisual from './AccountVisual';\nimport AccountExperience from './AccountMotion';\nimport './account-flow.css';"],
 ["<AccountVisual />","<AccountVisual phase={busy ? 'working' : registering ? 'register' : undefined} />"],
 ["<aside className={s.sidebar}>","<aside className={s.sidebar}>\n      <AccountVisual compact />"],
 ["'SAVED IN ACCOUNT'","(FLOW ? 'SAVED IN THIS TAB' : 'SAVED IN ACCOUNT')"],
 ["'Vehicle saved to your account.'","(FLOW ? 'Demo vehicle saved in this tab.' : 'Vehicle saved to your account.')"],
 ["export default function AccountPage() {","function AccountContent() {"],
 ["return <section className={`dth-container ${s.root}`}>","return <section className={`dth-container ${s.root}`}>\n    {FLOW && !store.user && <div className=\"dth-flow-note\" role=\"note\"><strong>UI rehearsal — not real authentication.</strong><br />Sign in: <code>demo@dth.test</code> · <code>DthFlow2026!</code><br />To try registration, use another fictitious <code>@dth.test</code> email and the same published password. Do not enter real credentials.</div>}"],
]);
fs.appendFileSync(root+'frontend/src/shop/account/AccountPage.jsx','\n\nexport default function AccountPage() { return <AccountExperience><AccountContent /></AccountExperience>; }\n');
fs.appendFileSync(root+'frontend/src/shop/account/AccountPage.module.css',fs.readFileSync(root+'frontend/src/shop/account/scene-style-extra.txt','utf8'));
fs.rmSync(root+'frontend/src/shop/account/scene-style-extra.txt');
const p=root+'package.json',pkg=JSON.parse(fs.readFileSync(p));
pkg.scripts['dev:flow']='npm run dev --workspace frontend -- --mode flow';
pkg.scripts['build:flow']='npm run build --workspace frontend -- --mode flow';
pkg.scripts['test:account']='node --test tests/account.test.mjs tests/flow.test.mjs';
fs.writeFileSync(p,JSON.stringify(pkg,null,2)+'\n');
fs.writeFileSync(root+'frontend/.env.flow','# Public build mode only. Never put secrets in VITE_* variables.\nVITE_STORE_MODE=flow\nVITE_SHOP_API_URL=/api/shop\n');
fs.appendFileSync(root+'.gitignore','\n# Public explicit UI rehearsal mode (no secrets).\n!.env.flow\n');
const workflow='.github/workflows/account-quality.yml';let wf=fs.readFileSync(workflow,'utf8');
const first=wf.indexOf('  prepare:\n'),last=wf.indexOf('  flow:\n',first);
if(first<0||last<0)throw Error('Bootstrap workflow not found.');
wf=wf.slice(0,first)+wf.slice(last);
wf=wf.replace('    needs: prepare\n','').replace('    needs: [prepare, flow]\n','    needs: flow\n').replaceAll('          ref: ${{ needs.prepare.outputs.source-sha }}\n','');
fs.writeFileSync(workflow,wf);
console.log('Exact source integration complete; temporary integration removed; subsequent workflow read-only.');
