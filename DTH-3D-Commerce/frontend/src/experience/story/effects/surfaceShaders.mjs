import * as THREE from 'three';
import { SURFACE_FX } from './surfaceMotion.mjs';

/** Shared mask in surface AND wireframe: neither can drift off the moving product. */
export const maskGLSL = /* glsl */ `
uniform vec3 uDthTrail[${SURFACE_FX.samples}];
uniform vec4 uDthBounds;
uniform float uDthAspect;
uniform float uDthTime;
uniform float uDthLevel;
uniform float uDthPace;
uniform float uDthReveal;
uniform float uDthScan;
uniform vec2 uDthHeightRange;
uniform vec3 uDthAccent;
varying vec4 vDthClip;
varying float vDthHeight;
float dthHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
float dthNoise(vec2 p) {
  vec2 a=floor(p), b=fract(p); b=b*b*(3.0-2.0*b);
  return mix(mix(dthHash(a),dthHash(a+vec2(1.,0.)),b.x),
    mix(dthHash(a+vec2(0.,1.)),dthHash(a+vec2(1.,1.)),b.x),b.y);
}
float dthSegment(vec2 p,vec2 a,vec2 b) {
  vec2 ba=b-a; return length(p-a-ba*clamp(dot(p-a,ba)/max(dot(ba,ba),0.000001),0.,1.));
}
float dthTrail(vec2 p) {
  float gate=smoothstep(0.018,0.17,uDthPace);
  if(uDthReveal<0.5 || gate<0.001) return 0.;
  if(any(lessThan(p,uDthBounds.xy)) || any(greaterThan(p,uDthBounds.zw))) return 0.;
  vec2 warp=vec2(dthNoise(p*5.7+vec2(uDthTime*.23,0.)),dthNoise(p*7.1-vec2(0.,uDthTime*.19)))-.5;
  p+=warp*${(SURFACE_FX.warp * 2).toFixed(4)};
  float brush=${SURFACE_FX.radius.toFixed(4)}*mix(.36,1.,uDthPace);
  float value=0.;
  for(int i=0;i<${SURFACE_FX.samples - 1};i++) {
    float weight=uDthTrail[i].z;
    if(weight<=value) break;
    float r=brush*weight;
    float d=dthSegment(p,uDthTrail[i].xy,uDthTrail[i+1].xy);
    value=max(value,weight*(1.-smoothstep(r*.32,r,d)));
    if(value>.12) break;
  }
  return smoothstep(.065,.095,value)*gate;
}
vec2 dthMask() {
  vec2 ndc=vDthClip.xy/max(vDthClip.w,.00001);
  vec2 p=vec2(ndc.x*uDthAspect,ndc.y);
  float n=dthNoise(p*5.7)*.7+dthNoise(p*12.3)*.3;
  float threshold=(1.-vDthHeight)*.72+n*.28;
  float front=mix(-.10,1.10,uDthLevel);
  float soft=max(fwidth(threshold)*1.2,.012);
  float burn=1.-smoothstep(front-soft,front+soft,threshold);
  float liquid=dthTrail(p);
  float mask=max(burn,liquid);
  float edge=4.*burn*(1.-burn);
  // Cursor rim is intentionally quieter than the entrance edge.
  edge+=4.*liquid*(1.-liquid)*.22*(1.-burn);
  return vec2(clamp(mask,0.,1.),edge);
}
`;

const vertexVaryings = `varying vec4 vDthClip; varying float vDthHeight; uniform vec2 uDthHeightRange;`;
const vertexValues = `
vDthClip=gl_Position;
vec4 dthWorld=modelMatrix*vec4(transformed,1.);
vDthHeight=clamp((dthWorld.y-uDthHeightRange.x)/max(uDthHeightRange.y,.0001),0.,1.);
`;

export function injectSurfaceShader(shader, uniforms) {
  for (const [source, token] of [[shader.vertexShader,'#include <common>'],[shader.vertexShader,'#include <project_vertex>'],
    [shader.fragmentShader,'#include <common>'],[shader.fragmentShader,'#include <alphamap_fragment>'],
    [shader.fragmentShader,'#include <emissivemap_fragment>']]) {
    if (!source.includes(token)) throw new Error(`Unsupported material shader: ${token}`);
  }
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${vertexVaryings}`)
    .replace('#include <project_vertex>', `#include <project_vertex>\n${vertexValues}`);
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${maskGLSL}`)
    .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>\nvec2 dthSurface=dthMask();\ndiffuseColor.a*=dthSurface.x;\nif(diffuseColor.a<.005) discard;`)
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance+=uDthAccent*dthSurface.y*1.7;`);
  return shader;
}

export const wireVertex = /* glsl */ `
${vertexVaryings}
void main(){
  vec3 transformed=position;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
  ${vertexValues}
}`;
export const wireFragment = /* glsl */ `
${maskGLSL}
void main(){
  float centre=1.3-mod(uDthTime,${SURFACE_FX.scanSeconds.toFixed(3)})/${SURFACE_FX.scanSeconds.toFixed(3)}*1.6;
  float d=(vDthHeight-centre)/${SURFACE_FX.scanWidth.toFixed(3)};
  float wave=exp(-d*d);
  vec2 mask=dthMask();
  float alpha=(.028+wave*${SURFACE_FX.scanOpacity.toFixed(3)})*(1.-mask.x)*uDthScan;
  if(alpha<.002) discard;
  gl_FragColor=vec4(mix(vec3(.16,.27,.32),uDthAccent,wave*.65),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function compatible(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const triangles = (mesh.geometry?.index?.count ?? mesh.geometry?.attributes?.position?.count ?? 0) / 3;
  return !mesh.isSkinnedMesh && !mesh.isInstancedMesh && !Object.keys(mesh.geometry?.morphAttributes || {}).length
    && triangles > 0 && materials.every(m => m?.isMeshStandardMaterial && m.opacity >= .999
      && !m.alphaMap && !m.alphaTest && !(m.transmission > 0));
}

/** Only attaches to this Story-owned rig. Geometry/maps remain borrowed and are not disposed here. */
export function attachSurfaceEffects(root, engine, heightRange) {
  const meshes=[]; root.traverse(node=>{if(node.isMesh)meshes.push(node);});
  const triangles=meshes.reduce((n,m)=>n+(m.geometry.index?.count ?? m.geometry.attributes.position.count)/3,0);
  if(!meshes.length || !meshes.every(compatible) || triangles>SURFACE_FX.maxWireTriangles) return null;
  const uniforms={
    uDthTrail:{value:engine.state.trail}, uDthBounds:{value:new THREE.Vector4(-10,-10,-10,-10)},
    uDthAspect:{value:1},uDthTime:{value:0},uDthLevel:{value:1},uDthPace:{value:0},
    uDthReveal:{value:0},uDthScan:{value:0},uDthHeightRange:{value:new THREE.Vector2(...heightRange)},
    uDthAccent:{value:new THREE.Color('#02d2e3')},
  };
  const originals=[],owned=[],children=[],wireMeshes=[];
  try {
    for(const mesh of meshes) {
      originals.push({mesh,material:mesh.material,renderOrder:mesh.renderOrder});
      const makeSurface=old=>{
        const m=old.clone();
        m.transparent=true;m.depthWrite=false;m.side=THREE.FrontSide;
        m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;
        m.onBeforeCompile=shader=>injectSurfaceShader(shader,uniforms);
        m.customProgramCacheKey=()=>`dth-story-surface-v1-${SURFACE_FX.samples}`;
        owned.push(m);return m;
      };
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(makeSurface):makeSurface(mesh.material);
      mesh.renderOrder=1;
      const ghostMaterial=new THREE.MeshStandardMaterial({color:'#cfdee3',roughness:.7,metalness:.08,side:THREE.FrontSide});
      const wireMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:wireVertex,fragmentShader:wireFragment,
        wireframe:true,transparent:true,depthWrite:false,depthTest:true,
        polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const ghost=new THREE.Mesh(mesh.geometry,ghostMaterial),wire=new THREE.Mesh(mesh.geometry,wireMaterial);
      ghost.name='dth-story-technical-underlay';wire.name='dth-story-wire-scan';
      ghost.renderOrder=0;wire.renderOrder=2;
      ghost.raycast=()=>{};wire.raycast=()=>{};
      mesh.add(ghost,wire);children.push(ghost,wire);wireMeshes.push(wire);owned.push(ghostMaterial,wireMaterial);
    }
  } catch(error) {
    children.forEach(m=>m.removeFromParent());
    originals.forEach(({mesh,material,renderOrder})=>{mesh.material=material;mesh.renderOrder=renderOrder;});
    owned.forEach(m=>m.dispose());throw error;
  }
  let disposed=false;
  return {
    uniforms,
    update(state,aspect) {
      wireMeshes.forEach(mesh => { mesh.visible = state.scanning; });
      uniforms.uDthTime.value=state.time;uniforms.uDthLevel.value=state.level;
      uniforms.uDthPace.value=state.pace;uniforms.uDthReveal.value=state.mode==='reveal'?1:0;
      uniforms.uDthScan.value=state.scanning?1:0;uniforms.uDthBounds.value.fromArray(state.bounds);
      uniforms.uDthAspect.value=Number.isFinite(aspect)&&aspect>0?aspect:1;
    },
    dispose(){
      if(disposed)return;disposed=true;
      children.forEach(m=>m.removeFromParent());
      originals.forEach(({mesh,material,renderOrder})=>{mesh.material=material;mesh.renderOrder=renderOrder;});
      owned.forEach(m=>m.dispose());
    },
  };
}
