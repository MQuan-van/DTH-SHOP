import * as THREE from 'three';

export const PART_OFFSETS = {
  shaft: [0, 0, 0], body: [0, -0.18, 0], spring: [-0.72, 0.05, 0.12],
  upperMount: [0, 0.68, 0], lowerMount: [0, -0.68, 0],
  upperCollar: [0, 0.25, 0], lowerCollar: [0, -0.34, 0],
  reservoir: [0.62, 0.04, 0], bridge: [0.34, 0.24, 0],
};
const SIGNATURE = { 'part-0': [908, 5424], 'part-1': [164, 960], 'part-2': [3574, 19872] };
const PALETTE = [[165,174,183],[37,43,51],[215,245,92]];

/** Connected components of the ORIGINAL indexed mesh; no invented internal parts. */
export function componentsOf(geometry) {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index || !position) return [];
  const parent = Array.from({ length: position.count }, (_, i) => i);
  const find = value => { while (parent[value] !== value) { parent[value] = parent[parent[value]]; value = parent[value]; } return value; };
  for (let i = 0; i < index.count; i += 3) {
    const a = find(index.getX(i));
    parent[find(index.getX(i + 1))] = a;
    parent[find(index.getX(i + 2))] = a;
  }
  const components = new Map();
  for (let i = 0; i < index.count; i += 3) {
    const key = find(index.getX(i));
    if (!components.has(key)) components.set(key, []);
    components.get(key).push(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  }
  return [...components.values()].map(indices => {
    const bounds = new THREE.Box3();
    const point = new THREE.Vector3();
    indices.forEach(i => bounds.expandByPoint(point.fromBufferAttribute(position, i)));
    return { indices, center: bounds.getCenter(new THREE.Vector3()), size: bounds.getSize(new THREE.Vector3()) };
  });
}
function classify(name, { center, size }) {
  if (name === 'part-0') {
    if (size.y > 1.5) return 'shaft';
    if (center.y < -0.8) return 'lowerMount';
    if (center.y > 0.8) return 'upperMount';
    return 'bridge';
  }
  if (name === 'part-1') return center.x > 0.2 ? 'reservoir' : 'body';
  if (center.x > 0.30) return 'reservoir';
  if (size.x > 0.45) return center.y > 0 ? 'upperCollar' : 'lowerCollar';
  return 'spring';
}
function subset(source, indices) {
  const position = source.getAttribute('position');
  const map = new Map(), vertices = [], faces = [];
  for (const id of indices) {
    if (!map.has(id)) { map.set(id, vertices.length / 3); vertices.push(position.getX(id), position.getY(id), position.getZ(id)); }
    faces.push(map.get(id));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export function createProductRig(scene, url) {
  const meshes = [];
  scene.traverse(object => { if (object.isMesh) meshes.push(object); });
  const supported = url === '/models/dth-demo/apex-suspension.glb' && meshes.length === 3 && meshes.every(mesh => {
    const expected = SIGNATURE[mesh.name];
    return expected && mesh.geometry.attributes.position.count === expected[0] && mesh.geometry.index?.count === expected[1];
  });
  const root = new THREE.Group(), parts = new Map(), materials = [], geometries = [];
  const cloneMaterial = original => {
    const material = original.clone();
    if (supported && !material.map && material.color) {
      const rgb = PALETTE.find(values => ['r','g','b'].every((key, i) => Math.abs(material.color[key] - values[i]/255) < 1e-6));
      if (rgb) material.color.setRGB(...rgb.map(v => v / 255), THREE.SRGBColorSpace);
      material.flatShading = false;
    }
    materials.push(material); return material;
  };
  if (supported) {
    for (const mesh of meshes) {
      const groups = new Map();
      for (const component of componentsOf(mesh.geometry)) {
        const name = classify(mesh.name, component);
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(...component.indices);
      }
      const material = cloneMaterial(mesh.material);
      for (const [name, indices] of groups) {
        if (!parts.has(name)) { const part = new THREE.Group(); part.name = name; parts.set(name, part); root.add(part); }
        const geometry = subset(mesh.geometry, indices); geometries.push(geometry);
        const piece = new THREE.Mesh(geometry, material);
        piece.name = name + '-' + mesh.name; parts.get(name).add(piece);
      }
    }
  } else {
    // An admin may replace the model. Never apply Apex-specific segmentation to it.
    const copy = scene.clone(true);
    copy.traverse(object => {
      if (object.isMesh) object.material = Array.isArray(object.material) ? object.material.map(cloneMaterial) : cloneMaterial(object.material);
    });
    copy.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(copy), size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.length()) || size.length() === 0) throw new Error('Empty model geometry');
    const scale = 2.394 / Math.max(size.x, size.y, size.z);
    copy.position.sub(bounds.getCenter(new THREE.Vector3())); root.add(copy); root.scale.setScalar(scale);
  }
  return {
    root, parts, supported,
    explode(amount) { for (const [name, group] of parts) group.position.fromArray(PART_OFFSETS[name]).multiplyScalar(Math.max(0, Math.min(1, amount))); },
    wireframe(value) { materials.forEach(material => { material.wireframe = value; }); },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
