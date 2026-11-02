import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(process.argv[2]||'.');
if(!fs.existsSync(path.join(root,'frontend/package.json'))){console.error('Run from DTH-3D-Commerce.');process.exit(1);}
function run(command,args){console.log(`\n> ${command} ${args.join(' ')}`);const child=spawnSync(command,args,{cwd:root,stdio:'inherit',shell:false});if(child.error||child.status!==0){console.error(child.error?.message||'Verification failed.');process.exit(child.status||1);}}
run(process.execPath,['--test','tests/hotspots-23-3.test.mjs']);
for(const file of ['createHotspotStage233.mjs','hotspots233.logic.mjs'])run(process.execPath,['--check',`frontend/src/experience/hotspots233/${file}`]);
// Use npm's CLI through node on Windows, instead of shell-interpolating a project path.
const npm=process.platform==='win32'?'npm.cmd':'npm';
if(process.platform==='win32'){
 const result=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm run build --workspace frontend'],{cwd:root,stdio:'inherit'});
 if(result.error||result.status!==0)process.exit(result.status||1);
}else run(npm,['run','build','--workspace','frontend']);
console.log('\nVERIFY OK: logic/syntax/build. This is not proof of actual GPU performance or correct semantic hotspot placement. Test the real GLB in the browser.');
