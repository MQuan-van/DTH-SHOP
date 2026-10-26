/** Bounded, abortable raw-byte LRU. Parsed GLTF/GPU objects are never cached here. */
export function createByteCache214({load,maxBytes=192*1048576,maxEntries=3,concurrency=1}) {
  if(typeof load!=='function')throw new TypeError('A loader is required.');
  if(![maxBytes,maxEntries,concurrency].every(n=>Number.isSafeInteger(n)&&n>0))throw new TypeError('Cache budgets must be positive integers.');
  const cache=new Map(),jobs=new Map(),queue=[];let bytes=0,running=0,closed=false;
  const abortError=()=>Object.assign(new Error('Model request cancelled.'),{name:'AbortError'});
  const trim=()=>{while(cache.size>maxEntries||bytes>maxBytes){const k=cache.keys().next().value;bytes-=cache.get(k).byteLength;cache.delete(k);}};
  const store=(key,value)=>{if(!(value instanceof Uint8Array))throw new TypeError('Expected model bytes.');if(cache.has(key))bytes-=cache.get(key).byteLength;cache.delete(key);cache.set(key,value);bytes+=value.byteLength;trim();};
  function removeWaiter(job,w){job.waiters.delete(w);w.signal?.removeEventListener('abort',w.abort);}
  function settle(job,error,result){for(const w of [...job.waiters]){removeWaiter(job,w);error?w.reject(error):w.resolve(result);}}
  function pump(){
    if(closed)return;
    while(running<concurrency&&queue.length){
      const job=queue.shift();if(job.controller.signal.aborted||!job.waiters.size)continue;
      running++;job.started=true;
      Promise.resolve().then(()=>load(job.key,job.controller.signal)).then(result=>{
        if(closed||job.controller.signal.aborted)throw abortError();store(job.key,result);settle(job,null,result);
      }).catch(error=>settle(job,error)).finally(()=>{running--;if(jobs.get(job.key)===job)jobs.delete(job.key);pump();});
    }
  }
  function get(key,{signal}={}) {
    if(closed||signal?.aborted)return Promise.reject(abortError());
    if(cache.has(key)){const v=cache.get(key);cache.delete(key);cache.set(key,v);return Promise.resolve(v);}
    let job=jobs.get(key);
    if(!job||job.controller.signal.aborted){job={key,controller:new AbortController(),waiters:new Set(),started:false};jobs.set(key,job);queue.push(job);}
    const selected=job;
    const promise=new Promise((resolve,reject)=>{
      const w={resolve,reject,signal,abort:null};
      w.abort=()=>{removeWaiter(selected,w);reject(abortError());if(!selected.waiters.size){selected.controller.abort();if(jobs.get(key)===selected)jobs.delete(key);}};
      selected.waiters.add(w);signal?.addEventListener('abort',w.abort,{once:true});
    });
    pump();return promise;
  }
  return {get,
    invalidate(key){if(cache.has(key)){bytes-=cache.get(key).byteLength;cache.delete(key);}},
    stats:()=>({bytes,entries:cache.size,running,queued:queue.filter(j=>j.waiters.size&&!j.controller.signal.aborted).length}),
    close(){closed=true;for(const j of jobs.values()){j.controller.abort();settle(j,abortError());}jobs.clear();queue.length=0;cache.clear();bytes=0;},
  };
}
/** The scene belongs to one mount. Never dispose an asset shared by useGLTF. */
export function disposeStoryAsset214(gltf) {
  if(!gltf)return;const geo=new Set(),mat=new Set(),tex=new Set(),images=new Set();
  for(const root of gltf.scenes||[gltf.scene])root?.traverse(node=>{if(node.geometry)geo.add(node.geometry);
    for(const m of Array.isArray(node.material)?node.material:node.material?[node.material]:[]){mat.add(m);for(const value of Object.values(m))if(value?.isTexture)tex.add(value);}});
  geo.forEach(g=>g.dispose());mat.forEach(m=>m.dispose());tex.forEach(t=>{if(t.image)images.add(t.image);t.dispose();});images.forEach(i=>i.close?.());
}
