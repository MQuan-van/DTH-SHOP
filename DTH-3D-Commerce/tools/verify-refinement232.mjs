import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function run(command,args){const p=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:false});if(p.error){console.error(p.error.message);process.exit(1);}if(p.status!==0)process.exit(p.status||1);}
for(const f of ['frontend/package.json','tests/refinement-23-2.test.mjs','frontend/src/experience/refinement232/Modal232.jsx'])if(!fs.existsSync(path.join(root,f))){console.error('VERIFY STOP: missing '+f);process.exit(1);}
console.log('23.2: pure logic and source contract tests');run(process.execPath,['--test','tests/refinement-23-2.test.mjs']);
const old=['tests/spatial-commerce-23.test.mjs','tests/studio-precision-22h2.test.mjs','tests/account-one-22a.test.mjs'].filter(f=>fs.existsSync(path.join(root,f)));
if(old.length){console.log('Existing regression suites');run(process.execPath,['--test',...old]);}
console.log('Actual frontend build on this machine');
if(process.platform==='win32')run(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm run build --workspace frontend']);else run('npm',['run','build','--workspace','frontend']);
console.log('VERIFY OK: tests and build passed here. This does not certify runtime auth/chat or GLB/FPS. Follow the browser checklist in docs/DTH-REFINEMENT232-README.md.');
