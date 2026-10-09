import { isLocalModelURL, modelPath } from '../../../../../shared/product3dProfile.mjs';
/** Product-viewer budgets, not universal glTF validity rules. */
export const ASSET_LIMITS = Object.freeze({ bytes:16*1024*1024, jsonBytes:2*1024*1024, decodedBytes:96*1024*1024,
  vertices:1000000, triangles:500000, meshes:256, nodes:2048, materials:128, images:16, textureEdge:4096, texturePixels:32*1024*1024 });
export class AssetValidationError extends Error { constructor(code,message){super(message);this.name='AssetValidationError';this.code=code;} }
const stop=(code,text)=>{throw new AssetValidationError(code,text);};
const index=(n,size)=>Number.isSafeInteger(n)&&n>=0&&n<size;
const integer=(n,low,high)=>Number.isSafeInteger(n)&&n>=low&&n<=high;
const array=(v,limit,name)=>{if(v===undefined)return [];if(!Array.isArray(v)||v.length>limit)stop('structure',`Unsupported ${name} list.`);return v;};
const knownExtensions = new Set(['EXT_meshopt_compression','KHR_mesh_quantization','EXT_texture_webp','KHR_materials_unlit',
  'KHR_materials_clearcoat','KHR_materials_transmission','KHR_materials_volume','KHR_materials_ior','KHR_materials_specular',
  'KHR_materials_sheen','KHR_materials_emissive_strength','KHR_materials_iridescence','KHR_materials_anisotropy','KHR_texture_transform','KHR_materials_dispersion']);

export function embeddedImageSize(bytes,mime) {
  const b=bytes, d=new DataView(b.buffer,b.byteOffset,b.byteLength);
  if(mime==='image/png' && b.length>=24 && [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return [d.getUint32(16),d.getUint32(20)];
  if(mime==='image/jpeg' && b.length>=4 && b[0]===255&&b[1]===216){
    let i=2;while(i+4<=b.length){if(b[i++]!==255)stop('image','Invalid JPEG marker.');while(b[i]===255)i++;const marker=b[i++];if(marker===217||marker===218)break;if(marker===1||(marker>=208&&marker<=215))continue;
      if(i+2>b.length)break;const n=d.getUint16(i);if(n<2||i+n>b.length)break;
      if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&n>=7)return[d.getUint16(i+5),d.getUint16(i+3)];i+=n;
    }
  }
  if(mime==='image/webp' && b.length>=30 && String.fromCharCode(...b.slice(0,4))==='RIFF' && String.fromCharCode(...b.slice(8,12))==='WEBP'){
    const tag=String.fromCharCode(...b.slice(12,16));
    if(tag==='VP8X')return[1+b[24]+(b[25]<<8)+(b[26]<<16),1+b[27]+(b[28]<<8)+(b[29]<<16)];
    if(tag==='VP8 '&&b[23]===157&&b[24]===1&&b[25]===42)return[d.getUint16(26,true)&16383,d.getUint16(28,true)&16383];
    if(tag==='VP8L'&&b[20]===47){const n=d.getUint32(21,true);return[(n&16383)+1,((n>>>14)&16383)+1];}
  }
  stop('image','Use embedded PNG, JPEG or WebP textures with readable dimensions.');
}
/** Bounded preflight before GLTFLoader/texture decode. Not a replacement for Khronos glTF Validator. */
export function inspectGLB(input, limits=ASSET_LIMITS) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.length<20||bytes.length>limits.bytes)stop('size','GLB must be nonempty and at most 16 MiB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.length)stop('header','Expected a valid glTF 2.0 GLB header.');
  let offset=12,json=null,bin=null;
  while(offset<bytes.length){
    if(offset+8>bytes.length)stop('chunks','Truncated GLB chunk.');
    const length=view.getUint32(offset,true),type=view.getUint32(offset+4,true);offset+=8;
    if(length%4||length>bytes.length-offset)stop('chunks','Invalid GLB chunk bounds.');
    if(type===0x4e4f534a){if(json!==null||offset!==20||length>limits.jsonBytes)stop('json','Invalid JSON chunk.');try{json=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(offset,offset+length)).trimEnd());}catch{stop('json','Unreadable GLB JSON.');}}
    else if(type===0x004e4942){if(!json||bin)stop('chunks','Unexpected GLB binary chunk.');bin=bytes.subarray(offset,offset+length);}
    else stop('chunks','This viewer does not accept extra GLB chunk types.');
    offset+=length;
  }
  if(!json||json.asset?.version!=='2.0')stop('version','Expected glTF asset version 2.0.');
  const ext=array(json.extensionsUsed,80,'extensions'),required=array(json.extensionsRequired,80,'required extensions');
  if([...ext,...required].some(x=>typeof x!=='string'))stop('extensions','Malformed extension names.');
  if([...ext,...required].some(x=>x==='KHR_draco_mesh_compression'||x==='KHR_texture_basisu'))stop('decoder','Export standard GLB or Meshopt; Draco/KTX2 decoders are not installed in this viewer.');
  if(required.some(x=>!knownExtensions.has(x)))stop('extensions','A required model extension is not supported.');
  if(array(json.skins,64,'skins').length||array(json.animations,128,'animations').length)stop('animated','Export a static product GLB without skins or animation.');
  const buffers=array(json.buffers,8,'buffers'),views=array(json.bufferViews,8192,'bufferViews'),accessors=array(json.accessors,8192,'accessors');
  let decoded=0;
  for(const b of buffers){if(!b||b.uri!==undefined)stop('external','Embed all buffers in the GLB. External and data-URI buffers are not loaded.');if(!integer(b.byteLength,1,limits.decodedBytes))stop('memory','Invalid decoded buffer size.');decoded+=b.byteLength;}
  if(decoded>limits.decodedBytes)stop('memory','Decoded buffer budget exceeded.');
  if(buffers.length>1 && !ext.includes('EXT_meshopt_compression'))stop('buffers','Only a self-contained GLB buffer is supported.');
  for(const v of views){
    if(!v||!index(v.buffer,buffers.length)||!integer(v.byteOffset??0,0,limits.decodedBytes)||!integer(v.byteLength,1,limits.decodedBytes)||(v.byteOffset??0)+v.byteLength>buffers[v.buffer].byteLength)stop('buffers','Invalid buffer view.');
    const compression=v.extensions?.EXT_meshopt_compression;
    if(compression){if(!index(compression.buffer,buffers.length)||compression.buffer!==0||!integer(compression.byteOffset??0,0,bytes.length)||!integer(compression.byteLength,1,bytes.length)||!bin||(compression.byteOffset??0)+compression.byteLength>bin.length||!integer(compression.count,1,limits.vertices*3)||!integer(compression.byteStride,1,256)||compression.count*compression.byteStride!==v.byteLength)stop('meshopt','Invalid or excessive Meshopt decoded buffer.');}
    else if(v.buffer!==0||!bin||(v.byteOffset??0)+v.byteLength>bin.length)stop('buffers','Buffer view is outside the embedded binary data.');
  }
  for(const a of accessors){
    if(!a||!integer(a.count,1,limits.vertices*3))stop('accessor','Invalid or excessive accessor count.');
    if(a.sparse)stop('sparse','Export a static GLB without sparse accessors.');
    if(!index(a.bufferView,views.length))stop('accessor','Missing accessor buffer view.');
    const components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},sizes={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
    if(!Object.hasOwn(components,a.type)||!Object.hasOwn(sizes,a.componentType))stop('accessor','Unsupported accessor type.');
    const packed=components[a.type]*sizes[a.componentType],v=views[a.bufferView],stride=v.byteStride??packed,base=a.byteOffset??0;
    if(!integer(base,0,v.byteLength)||!integer(stride,packed,256)||base+(a.count-1)*stride+packed>v.byteLength)stop('accessor','Accessor exceeds its buffer view.');
    for(const k of ['min','max'])if(a[k]!==undefined&&(!Array.isArray(a[k])||a[k].some(x=>typeof x!=='number'||!Number.isFinite(x))))stop('geometry','Nonfinite declared bounds.');
  }
  const meshes=array(json.meshes,limits.meshes,'meshes'),nodes=array(json.nodes,limits.nodes,'nodes'),materials=array(json.materials,limits.materials,'materials'),images=array(json.images,limits.images,'images');
  let triangles=0,vertices=0;
  for(const m of meshes)for(const p of array(m?.primitives,128,'primitives')){
    if(!p||p.mode!==undefined&&p.mode!==4||p.targets?.length)stop('primitive','Only static triangle product meshes are supported.');
    if(!index(p.attributes?.POSITION,accessors.length))stop('geometry','A mesh is missing its POSITION accessor.');
    const a=accessors[p.attributes.POSITION];if(a.type!=='VEC3')stop('geometry','Expected VEC3 positions.');
    if(p.indices!==undefined&&!index(p.indices,accessors.length))stop('geometry','Invalid index accessor.');
    const n=p.indices!==undefined?accessors[p.indices].count:a.count;
    if(n%3)stop('geometry','Triangle indices must be a multiple of three.');vertices+=a.count;triangles+=n/3;
  }
  if(!vertices||vertices>limits.vertices||triangles>limits.triangles)stop('complexity','Model exceeds the product-viewer geometry budget.');
  const parents=new Uint16Array(nodes.length),state=new Uint8Array(nodes.length);
  for(const n of nodes){if(!n||n.extensions?.EXT_mesh_gpu_instancing)stop('nodes','Instanced products require a separate asset profile pipeline.');if(n.mesh!==undefined&&!index(n.mesh,meshes.length))stop('nodes','Invalid mesh reference.');for(const key of ['matrix','translation','rotation','scale'])if(n[key]!==undefined&&(!Array.isArray(n[key])||n[key].length!==({matrix:16,translation:3,rotation:4,scale:3})[key]||n[key].some(x=>typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>1e9)))stop('transform','Invalid authored transform.');
    for(const child of array(n.children,limits.nodes,'children')){if(!index(child,nodes.length)||++parents[child]>1)stop('nodes','Invalid or multi-parent scene node.');}}
  const visit=(i,depth)=>{if(depth>128||state[i]===1)stop('nodes','Cyclic or excessively deep node hierarchy.');if(state[i]===2)return;state[i]=1;for(const c of nodes[i].children||[])visit(c,depth+1);state[i]=2;};nodes.forEach((_,i)=>visit(i,0));
  let pixels=0;const textureDimensions=[];
  for(const im of images){if(!im||im.uri!==undefined||!index(im.bufferView,views.length))stop('external','Textures must be embedded as GLB bufferViews; no external or data-URI images.');
    const v=views[im.bufferView];if(v.extensions?.EXT_meshopt_compression)stop('image','Compressed buffer view cannot contain an image.');
    const dimensions=embeddedImageSize(bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength),im.mimeType);
    if(!dimensions.every(n=>integer(n,1,limits.textureEdge)))stop('texture-size','Texture exceeds 4096px on an edge.');pixels+=dimensions[0]*dimensions[1];textureDimensions.push(dimensions);
  }
  if(pixels>limits.texturePixels)stop('texture-memory','Total decoded texture pixel budget exceeded.');
  return {byteLength:bytes.length,vertices,triangles,meshes:meshes.length,nodes:nodes.length,materials:materials.length,textureDimensions,decodedBufferBytes:decoded,
    extensions:ext.slice(),warnings:[...(triangles>120000?['Technical effects may be unavailable above 120,000 triangles.']:[])]};
}
export async function sha256Bytes(bytes, subtle=globalThis.crypto?.subtle) {
  if(!subtle)return null;
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  const h=await subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h),n=>n.toString(16).padStart(2,'0')).join('');
}
export function versionedModelURL(url,candidate) {
  if(!isLocalModelURL(url))stop('url','Use a same-origin /models/...glb URL.');
  return candidate?.asset?.url===modelPath(url)&&/^[a-f0-9]{64}$/.test(candidate.asset.sha256)?`${modelPath(url)}?v=${candidate.asset.sha256}`:url;
}
export async function fetchModelBytes(url, {signal,fetcher=globalThis.fetch,maximum=ASSET_LIMITS.bytes}={}) {
  if(!isLocalModelURL(url))stop('url','Unsupported model URL.');
  const response=await fetcher(url,{signal,credentials:'same-origin',redirect:'error',cache:'no-cache'});
  if(!response.ok)stop('http',`Model request failed (${response.status}). Image preview is available.`);
  const length=Number(response.headers.get('content-length'));
  if(length>maximum){await response.body?.cancel?.();stop('size','Model exceeds 16 MiB.');}
  if(!response.body?.getReader){const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>maximum)stop('size','Model exceeds 16 MiB.');return bytes;}
  const reader=response.body.getReader(),chunks=[];let received=0;
  try{while(true){if(signal?.aborted)throw new DOMException('Aborted','AbortError');const {done,value}=await reader.read();if(done)break;received+=value.byteLength;if(received>maximum){await reader.cancel();stop('size','Model exceeds 16 MiB while downloading.');}chunks.push(value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(received);let cursor=0;for(const c of chunks){bytes.set(c,cursor);cursor+=c.length;}return bytes;
}
