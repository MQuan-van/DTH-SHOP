/** Read-only GLB structure audit. Never modifies models, database, .env or Git state. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readGLBReport23,validateProfile23} from '../frontend/src/experience/commerce23/spatial23.logic.mjs';
const appRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let root=appRoot,output=null;
for(let i=2;i<process.argv.length;i++){const a=process.argv[i];if(a==='--project'&&process.argv[i+1])root=path.resolve(process.argv[++i]);else if(a==='--output'&&process.argv[i+1])output=path.resolve(process.argv[++i]);else if(a==='--help'){console.log('node tools/audit-nvx23.mjs [--project "app folder"] [--output "report.json"]\nRead-only V1/V2/V3 audit. Output is a new file, never overwritten.');process.exit(0);}else throw Error(`Unknown or incomplete argument: ${a}`);}
const report={kind:'GLB metadata and hash audit; not visual inspection or fitment certification',project:root,models:[]};
for(const version of [1,2,3]){
 const id=`yamaha-nvx-v${version}`,relative=`models/nvx/nvx-v${version}.glb`,file=path.join(root,'frontend/public',relative);
 const row={id,path:relative};
 try{const stat=await fs.stat(file);if(stat.size>128*1024*1024)throw Error('File exceeds the 128 MiB audit limit.');const bytes=await fs.readFile(file),meta=readGLBReport23(bytes);row.sha256=crypto.createHash('sha256').update(bytes).digest('hex');row.status='read';Object.assign(row,meta);
  const focusFile=path.join(root,'frontend/public/models/nvx/focus',id+'.json');
  const focus=await fs.readFile(focusFile,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(focus){const p=JSON.parse(focus);validateProfile23(p,{id,file:relative,rotation:p.rotation},row.sha256);row.focus={status:'hash validated',anchors:Object.keys(p.anchors),note:'Confirm authored orientation against nvx3d.config.mjs and inspect the rendered points. This CLI cannot certify semantic positions.'};}else row.focus={status:'not authored'};
 }catch(e){row.status=e.code==='ENOENT'?'not supplied':'error';row.message=e.message;}
 report.models.push(row);
}
console.log(JSON.stringify(report,null,2));
if(output){await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2),{encoding:'utf8',flag:'wx'}).then(()=>{});console.log(`Report written: ${output}`);}
if(report.models.some(m=>m.status==='error'))process.exitCode=1;
