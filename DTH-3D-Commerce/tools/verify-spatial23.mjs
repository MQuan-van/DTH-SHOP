/** Runs from the application directory, independent of CMD's current folder. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const required=['frontend/src/experience/commerce23/BuildExperience23.jsx','frontend/src/experience/commerce23/DTHNavigation23.jsx','tests/spatial-commerce-23.test.mjs','frontend/package.json'];
for(const file of required)if(!fs.existsSync(path.join(root,file))){console.error('VERIFY STOP: missing '+file);process.exit(1);}
function run(command,args){const p=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:false});if(p.error){console.error(p.error.message);process.exit(1);}if(p.status!==0)process.exit(p.status||1);}
console.log('STEP 23: new logic/source tests');
run(process.execPath,['--test','tests/spatial-commerce-23.test.mjs']);
const previous=['tests/studio-precision-22h2.test.mjs','tests/account-one-22a.test.mjs','tests/story-shop-21-4.test.mjs','tests/vertical-story-21-5.test.mjs'].filter(f=>fs.existsSync(path.join(root,f)));
if(previous.length){console.log('STEP 23: existing relevant regression tests (unchanged modules)');run(process.execPath,['--test',...previous]);}
console.log('STEP 23: real frontend production build');
if(process.platform==='win32')run(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm run build --workspace frontend']);else run('npm',['run','build','--workspace','frontend']);
console.log('\nVERIFY OK: tests and frontend build passed on this machine.\nThis is NOT a claim of visual approval, hotspot calibration or FPS. Open /shop?mode=build and run the browser acceptance checklist.');
