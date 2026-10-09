#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, realpathSync, mkdirSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { inspectGLB } from '../frontend/src/shop/product/3d/modelValidation.mjs';
import { automaticCamera } from '../frontend/src/shop/product/3d/profileTransform.mjs';
import { validate3DProfile, isLocalModelURL } from '../shared/product3dProfile.mjs';
const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function run(){
  const args=process.argv.slice(2),options={};
  if(args.includes('--help')){console.log('node tools/inspect-product-asset.mjs --file frontend/public/models/...glb --product PRODUCT_ID --url /models/...glb [--out path.profile.json]\nChecks a local GLB and emits a profile template. Does not register, upload or publish it.');return;}
  for(let i=0;i<args.length;i+=2){if(!['--file','--product','--url','--out'].includes(args[i])||!args[i+1]||args[i+1].startsWith('--')||Object.hasOwn(options,args[i]))throw Error('Invalid or repeated option. Use --help.');options[args[i]]=args[i+1];}
  if(!options['--file']||!options['--product']||!options['--url'])throw Error('Supply --file, --product and --url.');
  if(!isLocalModelURL(options['--url'])||options['--url'].includes('?'))throw Error('Use an unversioned local /models/...glb URL.');
  const file=realpathSync(resolve(project,options['--file'])),models=realpathSync(resolve(project,'frontend/public/models'));
  const rel=relative(models,file);if(rel.startsWith('..')||isAbsolute(rel)||!file.endsWith('.glb'))throw Error('File must be inside frontend/public/models and have .glb extension.');
  const expected=resolve(project,'frontend/public','.'+options['--url']);
  if(realpathSync(expected)!==file)throw Error('--url must point to the same local file as --file.');
  const bytes=readFileSync(file),report=inspectGLB(bytes),sha256=createHash('sha256').update(bytes).digest('hex');
  const cam=automaticCamera();
  const template={schemaVersion:1,profileId:`${options['--product']}-profile`,productId:options['--product'],version:'1.0.0',asset:{url:options['--url'],sha256},
    transform:{rotation:[0,0,0],scale:1,offset:[0,0,0]},camera:{fov:cam.fov,presets:cam.presets},
    modes:{surface:true,technical:true,hotspots:false},hotspots:[],
    provenance:{source:'unknown',tool:'',license:'Not recorded; verify before publication',attribution:'',captureDate:null,optimized:null,purpose:'visualization-only'}};
  const validated=validate3DProfile(template);if(!validated.ok)throw Error(validated.errors.join('; '));
  if(options['--out']){const out=resolve(project,options['--out']);if(!out.endsWith('.json'))throw Error('Profile output must be a .json file.');if(existsSync(out))throw Error('Refusing to overwrite an existing profile. Choose a new output file.');mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(validated.profile,null,2)+'\n',{flag:'wx'});console.log('Profile template written: '+out);}
  console.log(JSON.stringify({file:rel.replaceAll('\\','/'),sha256,...report,profileTemplate:validated.profile},null,2));
  console.log('No geometry-derived fitment, dimensions, ownership or capture method was inferred. Register the reviewed profile explicitly.');
}
try{run();}catch(error){console.error(`STOP: ${error.message}`);process.exitCode=1;}
