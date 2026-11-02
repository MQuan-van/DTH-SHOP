import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateProfile233} from '../frontend/src/experience/hotspots233/hotspots233.logic.mjs';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function safe(root,rel){
 if(typeof rel!=='string'||rel.includes('\\')||rel.includes(':')||path.isAbsolute(rel)||rel.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe relative path.');
 let p=root;for(const part of rel.split('/')){p=path.join(p,part);const stat=await fs.lstat(p).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(stat?.isSymbolicLink())throw Error(`Symbolic link refused: ${rel}`);}return p;
}
export async function planPublish233(root,profileFile){
 root=await fs.realpath(path.resolve(root));const data=await fs.readFile(profileFile);if(data.length>65536)throw Error('Profile exceeds 64 KB.');
 const input=JSON.parse(data.toString('utf8'));if(!/^yamaha-nvx-v[123]$/.test(input.vehicleId))throw Error('Invalid vehicle ID.');
 const config=await safe(root,'frontend/src/shop/discovery174/nvx3d/nvx3d.config.mjs');
 const {NVX_MODELS,NVX_STAGE}=await import(pathToFileURL(config).href);
 const known=NVX_MODELS?.[input.vehicleId];if(!known?.file)throw Error('This vehicle has no local configured model.');
 if(input.assetFile!==known.file)throw Error('Profile asset does not match the local NVX config. Published API models require a separate verified publishing workflow; no file was changed.');
 const spec={id:input.vehicleId,...known};
 const model=await safe(root,'frontend/public/'+known.file),stat=await fs.stat(model);
 if(stat.size<20||stat.size>(NVX_STAGE?.maxModelBytes||128*1024*1024))throw Error('Invalid model size.');
 const fd=await fs.open(model,'r'),header=Buffer.alloc(20);try{await fd.read(header,0,20,0);}finally{await fd.close();}
 if(header.toString('ascii',0,4)!=='glTF'||header.readUInt32LE(4)!==2||header.readUInt32LE(8)!==stat.size||header.readUInt32LE(16)!==0x4e4f534a||20+header.readUInt32LE(12)>stat.size)throw Error('Not a complete GLB 2.0 file. Download LFS content before publishing.');
 const hash=crypto.createHash('sha256');for await(const chunk of createReadStream(model))hash.update(chunk);
 const sha256=hash.digest('hex'),parsed=validateProfile233(input,spec,sha256);if(!Object.keys(parsed.anchors).length)throw Error('Author at least one point before publishing.');
 const rel=`frontend/public/models/nvx/focus/${input.vehicleId}.json`,dest=await safe(root,rel);
 const before=await fs.readFile(dest).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 return{root,rel,dest,model,modelStat:{size:stat.size,mtimeMs:stat.mtimeMs},sha256,profile:parsed,before,after:Buffer.from(JSON.stringify(parsed,null,2)+'\n')};
}
export async function applyPublish233(plan,backupRoot=path.join(os.homedir(),'DTH-Backups','focus233')){
 await safe(plan.root,plan.rel);
 await safe(plan.root,path.relative(plan.root,plan.model).split(path.sep).join('/'));
 const current=await fs.readFile(plan.dest).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(plan.before?!current?.equals(plan.before):current!==null)throw Error('Published profile changed after validation. Retry CHECK.');
 const stat=await fs.stat(plan.model);if(stat.size!==plan.modelStat.size||stat.mtimeMs!==plan.modelStat.mtimeMs)throw Error('Model changed after validation. Retry CHECK.');
 if(current?.equals(plan.after))return null;
 const backupBase=path.resolve(backupRoot);if(backupBase===plan.root||backupBase.startsWith(plan.root+path.sep))throw Error('Backup must be outside the project.');
 const folder=path.join(backupBase,new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8));await fs.mkdir(folder,{recursive:true});
 if(current)await fs.writeFile(path.join(folder,'previous.json'),current,{flag:'wx'});
 await fs.writeFile(path.join(folder,'receipt.json'),JSON.stringify({step:'23.3-focus',destination:plan.dest,modelSha256:plan.sha256,before:current?digest(current):null,after:digest(plan.after)},null,2),{flag:'wx'});
 await fs.mkdir(path.dirname(plan.dest),{recursive:true});const temp=plan.dest+`.focus233-${crypto.randomUUID()}.tmp`;
 try{await fs.writeFile(temp,plan.after,{flag:'wx'});await fs.rename(temp,plan.dest);}finally{await fs.rm(temp,{force:true}).catch(()=>{});}
 return folder;
}
export async function mainPublish233(args=process.argv.slice(2)){
 let root='.',file='',mode='check';for(let i=0;i<args.length;i++){const a=args[i];if(a==='--project')root=args[++i];else if(a==='--file')file=args[++i];else if(a==='--apply')mode='apply';else if(a==='--check')mode='check';else if(a==='--help'){console.log('node tools/publish-focus233.mjs --project . --file "exported.json" --check | --apply');return;}else throw Error(`Unknown argument: ${a}`);}
 if(!root||!file)throw Error('Provide --project and --file.');const plan=await planPublish233(root,file);
 console.log(`Vehicle: ${plan.profile.vehicleId}\nGLB SHA-256: ${plan.sha256}\nPoints: ${Object.keys(plan.profile.anchors).join(', ')}\nDestination: ${plan.dest}`);
 if(mode==='check'){console.log('CHECK OK. No files changed. This checks identity/structure, not mechanical compatibility or semantic placement.');return;}
 const backup=await applyPublish233(plan);console.log(backup?`PUBLISHED. Backup receipt: ${backup}\nReload Build. Model geometry, catalogue and database are unchanged.`:'ALREADY PUBLISHED. No files changed.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)mainPublish233().catch(e=>{console.error('STOP: '+e.message);process.exitCode=1;});
