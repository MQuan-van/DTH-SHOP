import * as THREE from 'three';
import { STUDY } from './study.logic.mjs';

export const studyVertex = /* glsl */ `
varying float vDthStudyY;
varying vec3 vDthStudyWorld;
uniform vec2 uDthStudyRange;
`;
const vertexAssign = /* glsl */ `
vDthStudyWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
vDthStudyY = (vDthStudyWorld.y - uDthStudyRange.x) / max(uDthStudyRange.y, 0.00001);
`;
export const studyCommon = /* glsl */ `
varying float vDthStudyY;
varying vec3 vDthStudyWorld;
uniform float uDthTechnical;
uniform float uDthSurface;
uniform float uDthProgress;
uniform vec3 uDthStudyAccent;
float dthStudyFront(){return mix(1.12,-.12,uDthProgress);}
float dthStudyNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453),f.x),
    mix(fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453),fract(sin(dot(i+vec2(1.,1.),vec2(127.1,311.7)))*43758.5453),f.x),f.y);
}
float dthStudyOffset(){return (dthStudyNoise(vDthStudyWorld.xz*14.0)-.5)*.025;}
float dthStudyPassed(){return smoothstep(-.018,.018,vDthStudyY-dthStudyFront()+dthStudyOffset());}
float dthStudyBand(){
  float d=(vDthStudyY-dthStudyFront()+dthStudyOffset())/.022;
  return exp(-d*d);
}
`;
export function injectStudyShader(shader, uniforms) {
  for (const [src,token] of [[shader.vertexShader,'#include <common>'],[shader.vertexShader,'#include <project_vertex>'],
    [shader.fragmentShader,'#include <common>'],[shader.fragmentShader,'#include <opaque_fragment>']]) {
    if (!src.includes(token)) throw new Error(`Unsupported PBR shader anchor: ${token}`);
  }
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\n${studyVertex}`)
    .replace('#include <project_vertex>',`#include <project_vertex>\n${vertexAssign}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${studyCommon}`)
    .replace('#include <opaque_fragment>',/* glsl */ `
      float dthPassed = dthStudyPassed();
      float dthLuma = dot(outgoingLight, vec3(.2126,.7152,.0722));
      // A technical display treatment only. Never changes texture maps or measured geometry.
      vec3 dthTechnicalLight = vec3(.22,.32,.38) * (.42 + min(dthLuma, 1.5)*.55);
      outgoingLight = mix(outgoingLight,dthTechnicalLight,uDthTechnical*dthPassed*.86);
      outgoingLight += uDthStudyAccent*dthStudyBand()*(uDthSurface*.75 + uDthTechnical*.45);
      #include <opaque_fragment>
    `);
  return shader;
}
export const technicalVertex=/* glsl */ `
attribute vec3 dthBarycentric;
varying vec3 vDthBarycentric;
${studyVertex}
void main(){
  vec3 transformed=position;
  vDthBarycentric=dthBarycentric;
  ${vertexAssign}
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}`;
export const technicalFragment=/* glsl */ `
varying vec3 vDthBarycentric;
${studyCommon}
void main(){
  vec3 width = max(fwidth(vDthBarycentric),vec3(.00001));
  vec3 edge = smoothstep(vec3(0.),width*1.15,vDthBarycentric);
  float line=1.-min(min(edge.x,edge.y),edge.z);
  float passed=dthStudyPassed();
  float wave=exp(-pow((vDthStudyY-dthStudyFront())/.085,2.));
  float alpha = line*uDthTechnical*(passed*.22+wave*.58);
  if(alpha<.002) discard;
  gl_FragColor=vec4(uDthStudyAccent,alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function inspectStudySupport(root) {
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});
  if(!meshes.length || meshes.length>STUDY.maxMeshes)return {ok:false,reason:'The model does not have a supported mesh layout.'};
  let triangles=0,vertices=0;
  for(const m of meshes){
    const g=m.geometry, pos=g?.attributes?.position;
    const mats=Array.isArray(m.material)?m.material:[m.material];
    if(!pos || pos.itemSize!==3 || m.isSkinnedMesh || m.isInstancedMesh || Object.keys(g.morphAttributes || {}).length)
      return {ok:false,reason:'Animated or instanced meshes use ordinary 3D viewing.'};
    const count=g.index?.count ?? pos.count;
    if(count%3 || !count || mats.some(mat=>!mat?.isMeshStandardMaterial || mat.transparent || mat.opacity<.999 || mat.alphaMap || mat.alphaTest || mat.transmission>0 || mat.wireframe
      || mat.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile))
      return {ok:false,reason:'This material uses ordinary viewing; study shaders are not applied.'};
    triangles+=count/3;vertices+=pos.count;
    if(triangles>STUDY.maxTriangles || vertices>STUDY.maxVertices)return {ok:false,reason:'Study effects are disabled for this model size. Ordinary viewing remains available.'};
  }
  return {ok:true,meshes,triangles,vertices};
}

/** All materials and wire geometry created here are private to this viewer. */
export function attachStudyEffects(root, heightRange) {
  const support=inspectStudySupport(root);
  if(!support.ok)return {available:false,reason:support.reason,dispose(){}};
  const uniforms={uDthStudyRange:{value:new THREE.Vector2(...heightRange)},uDthTechnical:{value:0},uDthSurface:{value:0},
    uDthProgress:{value:1},uDthStudyAccent:{value:new THREE.Color('#009cb5')}};
  const originals=[],ownedMaterials=[],ownedGeometry=[],overlays=[];
  let disposed=false;
  const dispose=()=>{if(disposed)return;disposed=true;
    overlays.forEach(m=>m.removeFromParent());originals.forEach(({mesh,material})=>{mesh.material=material;});
    ownedMaterials.forEach(m=>m.dispose());ownedGeometry.forEach(g=>g.dispose());};
  try {
    for(const mesh of support.meshes){
      originals.push({mesh,material:mesh.material});
      const clone=source=>{const m=source.clone();m.onBeforeCompile=shader=>injectStudyShader(shader,uniforms);
        m.customProgramCacheKey=()=> 'dth-pdp-study-v1';ownedMaterials.push(m);return m;};
      mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);
      const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      const count=g.attributes.position.count,bary=new Float32Array(count*3);
      for(let i=0;i<count;i++)bary[i*3+(i%3)]=1;
      g.setAttribute('dthBarycentric',new THREE.BufferAttribute(bary,3));
      ownedGeometry.push(g);
      const mat=new THREE.ShaderMaterial({uniforms,vertexShader:technicalVertex,fragmentShader:technicalFragment,
        transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,
        polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      ownedMaterials.push(mat);
      const wire=new THREE.Mesh(g,mat);wire.name='dth-pdp-study-wire';wire.visible=false;wire.renderOrder=3;wire.raycast=()=>{};
      wire.userData.dthStudyOverlay=true;mesh.add(wire);overlays.push(wire);
    }
  } catch(error){dispose();return {available:false,reason:'Optional study effects could not be prepared.',error,dispose(){}};}
  return {available:true,reason:'',uniforms,overlays,
    update(state){if(disposed)return;uniforms.uDthTechnical.value=state.technical;uniforms.uDthSurface.value=state.surface;uniforms.uDthProgress.value=state.progress;
      overlays.forEach(m=>{m.visible=state.technical>.0001;});},dispose};
}
