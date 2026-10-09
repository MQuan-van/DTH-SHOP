/** Compact CPU geometry; no font, model network request, post-processing or external engine. */
export const identity = () => new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a,b) { const c = new Float32Array(16); for (let col=0;col<4;col++) for(let row=0;row<4;row++) for(let k=0;k<4;k++) c[col*4+row]+=a[k*4+row]*b[col*4+k]; return c; }
export function translation(x=0,y=0,z=0) { const a=identity();a[12]=x;a[13]=y;a[14]=z;return a; }
export function rotation(x,y,z) { const c=Math.cos,s=Math.sin;return multiply(multiply(new Float32Array([1,0,0,0,0,c(x),s(x),0,0,-s(x),c(x),0,0,0,0,1]),new Float32Array([c(y),0,-s(y),0,0,1,0,0,s(y),0,c(y),0,0,0,0,1])),new Float32Array([c(z),s(z),0,0,-s(z),c(z),0,0,0,0,1,0,0,0,0,1])); }
export function projection(aspect) { const f=1/Math.tan(.63/2),n=.1,far=40; return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]); }
export function torus(radius,tube,segments=64,sides=10) {
  const positions=[],normals=[];
  function at(u,v) { const cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v);return [[(radius+tube*cv)*cu,(radius+tube*cv)*su,tube*sv],[cv*cu,cv*su,sv]]; }
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++) {
    const u=i/segments*2*Math.PI, un=(i+1)/segments*2*Math.PI,v=j/sides*2*Math.PI,vn=(j+1)/sides*2*Math.PI;
    const a=at(u,v),b=at(un,v),c=at(un,vn),d=at(u,vn);
    for(const [p,n] of [a,b,d,b,c,d]) {positions.push(...p);normals.push(...n);}
  }return {positions,normals};
}
export function spring() {
  const positions=[],normals=[],steps=144,sides=8;
  function at(i,j) {const a=i/steps*Math.PI*12,v=j/sides*Math.PI*2,r=.28+.045*Math.cos(v);return [[Math.cos(a)*r,i/steps*1.25-.625+.045*Math.sin(v),Math.sin(a)*r],[Math.cos(a)*Math.cos(v),Math.sin(v),Math.sin(a)*Math.cos(v)]];}
  for(let i=0;i<steps;i++)for(let j=0;j<sides;j++) for(const [p,n] of [at(i,j),at(i+1,j),at(i,j+1),at(i+1,j),at(i+1,j+1),at(i,j+1)]) {positions.push(...p);normals.push(...n);}
  return {positions,normals};
}
export function hexNut() {
  const positions=[],normals=[],steps=6;
  function tri(a,b,c) {const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);for(const p of [a,b,c]) {positions.push(...p);normals.push(...n.map(v=>v/l));}}
  const p=(i,r,z)=>[Math.cos(i/steps*2*Math.PI)*r,Math.sin(i/steps*2*Math.PI)*r,z];
  for(let i=0;i<steps;i++) {for(const z of [-.13,.13]) {let a=p(i,.38,z),b=p(i+1,.38,z),c=p(i+1,.19,z),d=p(i,.19,z);tri(a,b,d);tri(b,c,d);} for(const r of [.38,.19]) {let a=p(i,r,-.13),b=p(i+1,r,-.13),c=p(i+1,r,.13),d=p(i,r,.13);tri(a,b,d);tri(b,c,d);}}
  return {positions,normals};
}
