import mongoose from 'mongoose';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Product } from '../models.mjs';
import { InputError } from '../../../shared/domain.mjs';
import { DEFAULT_EXPERIENCE, validateExperience, expectedRevision, MAX_EXPERIENCE_HISTORY } from '../../../shared/experience.mjs';
const schema = new mongoose.Schema({_id:String,revision:{type:Number,required:true},draft:mongoose.Schema.Types.Mixed,published:mongoose.Schema.Types.Mixed,history:[mongoose.Schema.Types.Mixed]}, {collection:'store_experiences',timestamps:true});
export const Experience=mongoose.models.StoreExperience||mongoose.model('StoreExperience',schema);
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const root=fileURLToPath(new URL('../../../frontend/public/',import.meta.url));
const view=document=>({revision:document?.revision||0,draft:document?.draft||structuredClone(DEFAULT_EXPERIENCE),published:document?.published||null,history:(document?.history||[]).map(({version,createdAt,config})=>({version,createdAt,productId:config.productId,preset:config.preset,enabled:config.enabled}))});
/** Bind a saved scene to a real local product asset, not an arbitrary remote URL. */
export async function inspectAsset(config,{publish=false}={}) {
  const product=await Product.findOne({id:config.productId}).lean();
  if(!product||(publish&&product.active===false))throw new InputError('Choose an existing, visible product before publishing.',409);
  if(product.modelUrl!==config.modelUrl)throw new InputError('The product model changed. Select it again and review the scene.',409);
  let bytes;
  try {
    const absolute=await realpath(path.join(root,config.modelUrl)),publicRoot=await realpath(root);
    if(!absolute.startsWith(publicRoot+path.sep))throw new Error('Outside asset directory');
    const info=await stat(absolute);
    if(!info.isFile()||info.size>16*1024*1024)throw new Error('Size limit');
    bytes=await readFile(absolute);
    if(bytes.length<24||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('Invalid GLB header');
    const jsonLength=bytes.readUInt32LE(12);
    if(jsonLength>1024*1024||jsonLength+20>bytes.length||bytes.readUInt32LE(16)!==0x4e4f534a)throw new Error('Invalid JSON chunk');
    const json=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
    if(!json.meshes?.length||(json.buffers||[]).some(b=>b.uri)||(json.images||[]).some(i=>i.uri))throw new Error('Use a self-contained GLB');
  }catch{throw new InputError('The local GLB is missing, invalid, external, or over the 16 MiB studio limit.',400);}
  return {modelUrl:config.modelUrl,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
}
async function commitRevision(previous,patch) {
  // One document and CAS keep draft, publication and history atomic on standalone MongoDB.
  try {
    const result=await Experience.findOneAndUpdate({_id:'home',revision:previous},{$set:patch,$inc:{revision:1},...(previous===0?{$setOnInsert:{_id:'home'}}:{})},{upsert:previous===0,new:true,runValidators:true}).lean();
    if(!result)throw new InputError('Another editor saved a newer revision. Reload before saving; your local draft is retained.',409);
    return result;
  }catch(e){if(e.code===11000)throw new InputError('Another editor saved first. Reload the latest revision.',409);throw e;}
}
export function installExperience(router,{authenticated,admin,writeLimit}) {
  router.get('/experience/home',wrap(async(req,res)=>{
    const document=await Experience.findById('home').lean(),published=document?.published;
    if(!published)return res.json({data:null,source:'bundled'});
    if(!published.config.enabled)return res.json({data:{config:published.config,version:published.version},source:'published'});
    try {
      const config=validateExperience(published.config),binding=await inspectAsset(config,{publish:true});
      if(binding.sha256!==published.binding?.sha256)return res.json({data:null,source:'bundled',reason:'Published model changed; safe scene defaults are in use.'});
      return res.json({data:{config,version:published.version,binding},source:'published'});
    }catch{return res.json({data:null,source:'bundled',reason:'Published product is unavailable; safe scene defaults are in use.'});}
  }));
  const access=[authenticated,admin];
  router.get('/admin/experience/home',...access,wrap(async(req,res)=>res.json({data:view(await Experience.findById('home').lean())})));
  router.put('/admin/experience/home/draft',...access,writeLimit,wrap(async(req,res)=>{
    const revision=expectedRevision(req.body.expectedRevision),draft=validateExperience(req.body.config);
    if(draft.enabled)await inspectAsset(draft);
    res.json({data:view(await commitRevision(revision,{draft}))});
  }));
  router.post('/admin/experience/home/publish',...access,writeLimit,wrap(async(req,res)=>{
    const revision=expectedRevision(req.body.expectedRevision),document=await Experience.findById('home').lean();
    if(!document||document.revision!==revision)throw new InputError('Save or reload the current draft before publishing.',409);
    const config=validateExperience(document.draft),binding=config.enabled?await inspectAsset(config,{publish:true}):null;
    const entry={version:revision+1,createdAt:new Date().toISOString(),config,binding};
    const history=[...(document.history||[]),entry].slice(-MAX_EXPERIENCE_HISTORY);
    res.json({data:view(await commitRevision(revision,{published:entry,history}))});
  }));
  router.post('/admin/experience/home/restore',...access,writeLimit,wrap(async(req,res)=>{
    const revision=expectedRevision(req.body.expectedRevision),version=expectedRevision(req.body.version),document=await Experience.findById('home').lean();
    if(!document||document.revision!==revision)throw new InputError('Reload the latest revision before restoring.',409);
    const previous=document.history?.find(item=>item.version===version);
    if(!previous)throw new InputError('That publication is not in the retained history.',404);
    const config=validateExperience(previous.config),binding=config.enabled?await inspectAsset(config,{publish:true}):null;
    if(config.enabled&&binding.sha256!==previous.binding?.sha256)throw new InputError('The model changed since that version. Review and publish a new draft instead.',409);
    const entry={version:revision+1,createdAt:new Date().toISOString(),config,binding};
    res.json({data:view(await commitRevision(revision,{draft:config,published:entry,history:[...document.history,entry].slice(-MAX_EXPERIENCE_HISTORY)}))});
  }));
}
