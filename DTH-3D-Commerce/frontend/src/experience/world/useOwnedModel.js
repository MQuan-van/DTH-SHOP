import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const rawModels = new Map();
export const clearOwnedModelCache = url => rawModels.delete(url);

/** These assets belong to this scene, never to the Product Detail loader cache. */
function disposeModel(gltf) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set();
  for (const scene of gltf.scenes || [gltf.scene]) scene.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(value => value.dispose());
  materials.forEach(value => value.dispose());
  textures.forEach(value => { if (value.image) images.add(value.image); value.dispose(); });
  images.forEach(value => value.close?.());
}

/** Network/parse errors are explicit UI states, not Suspense render exceptions. */
export function useOwnedModel(url, onFailure) {
  const [asset, setAsset] = useState(null);
  const failure = useRef(onFailure);
  failure.current = onFailure;
  useEffect(() => {
    let live = true, owned = null;
    const controller = new AbortController();
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    async function load() {
      try {
        let bytes = rawModels.get(url);
        if (!bytes) {
          const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
          if (!response.ok) throw new Error('Model request failed');
          if (Number(response.headers.get('content-length')) > 16 * 1024 * 1024) throw new Error('Model size limit');
          bytes = await response.arrayBuffer();
          if (bytes.byteLength > 16 * 1024 * 1024) throw new Error('Model size limit');
        }
        if (!live) return;
        const gltf = await loader.parseAsync(bytes, new URL('.', new URL(url, window.location.href)).href);
        if (!live) { disposeModel(gltf); return; }
        // Bounded raw-byte cache; parsed geometry and GPU objects are never shared.
        rawModels.delete(url);
        rawModels.set(url, bytes);
        while (rawModels.size > 2) rawModels.delete(rawModels.keys().next().value);
        owned = gltf;
        setAsset({ url, scene: gltf.scene });
      } catch (error) {
        if (live && error.name !== 'AbortError') failure.current();
      }
    }
    void load();
    return () => {
      live = false;
      controller.abort();
      if (owned) disposeModel(owned);
    };
  }, [url]);
  return asset?.url === url ? asset.scene : null;
}
