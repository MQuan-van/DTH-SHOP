/** Small, self-contained decorative WebGL2 scene. No model downloads or postprocessing.
 * Geometry is an abstract mechanical assembly, NOT a product or an NVX model.
 */
const VS=`#version 300 es
in vec3 aPosition; in vec3 aNormal;
uniform mat4 uModel; uniform mat4 uViewProjection;
out vec3 vNormal; out vec3 vPosition;
void main(){vec4 p=uModel*vec4(aPosition,1.0);vPosition=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uViewProjection*p;}`;
const FS=`#version 300 es
precision highp float;
in vec3 vNormal; in vec3 vPosition; uniform vec3 uColor; uniform float uGlow;
out vec4 outColor;
void main(){vec3 n=normalize(vNormal),v=normalize(vec3(0.,0.,5.4)-vPosition);
vec3 l=normalize(vec3(-2.5,4.,4.)),r=reflect(-v,n);
float d=max(dot(n,l),0.),h=pow(max(dot(n,normalize(l+v)),0.),72.);
float edge=pow(1.-max(dot(n,v),0.),3.);
float strip=pow(max(0.,1.-abs(r.x-.2)),26.)*.72;
vec3 steel=uColor*(.23+.64*d+.18*max(n.y,0.))+vec3(.78,.91,1.)*(h*.95+strip*.52)+vec3(.09,.38,.58)*edge*.4;
vec3 col=mix(steel,uColor*(.70+edge*.60),uGlow);
outColor=vec4(pow(max(col,vec3(0.)),vec3(.82)),1.);}`;
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a,b){const c=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)c[col*4+row]+=a[k*4+row]*b[col*4+k];return c;}
export function rotation(x,y,z){const c=Math.cos,s=Math.sin;return multiply(multiply(new Float32Array([1,0,0,0,0,c(x),s(x),0,0,-s(x),c(x),0,0,0,0,1]),new Float32Array([c(y),0,-s(y),0,0,1,0,0,s(y),0,c(y),0,0,0,0,1])),new Float32Array([c(z),s(z),0,0,-s(z),c(z),0,0,0,0,1,0,0,0,0,1]));}
const translation=(x,y,z)=>{const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;};
function projection(aspect){const f=1/Math.tan(.69/2),n=.1,far=30;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+n)/(n-far),-1,0,0,2*far*n/(n-far),0]);}
export function torus(radius,tube,segments=56,sides=12){
  const pos=[],normal=[],indices=[];
  for(let i=0;i<=segments;i++){const u=i/segments*Math.PI*2;for(let j=0;j<=sides;j++){const v=j/sides*Math.PI*2,cv=Math.cos(v),sv=Math.sin(v),cu=Math.cos(u),su=Math.sin(u);pos.push((radius+tube*cv)*cu,(radius+tube*cv)*su,tube*sv);normal.push(cv*cu,cv*su,sv);}}
  for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}return {pos,normal,indices};
}
function sphere(radius){const pos=[],normal=[],indices=[],u=16,v=10;for(let j=0;j<=v;j++){const t=j/v*Math.PI;for(let i=0;i<=u;i++){const a=i/u*Math.PI*2;const n=[Math.sin(t)*Math.cos(a),Math.sin(t)*Math.sin(a),Math.cos(t)];normal.push(...n);pos.push(...n.map(x=>x*radius));}}for(let j=0;j<v;j++)for(let i=0;i<u;i++){const a=j*(u+1)+i,b=a+u+1;indices.push(a,b,a+1,b,b+1,a+1);}return{pos,normal,indices};}
export function createMechanism(canvas,{onFailure=()=>{},onReady=()=>{}}={}) {
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power',depth:true,preserveDrawingBuffer:false});
  if(!gl)throw new Error('WebGL2 unavailable');
  const resources=[],shaders=[];let program=null,disposed=false,frame=0,running=false,last=0,elapsed=0,live=false;
  let target={x:0,y:0},pointer={x:0,y:0},aspect=1,revision=0,draws=0;
  const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(frame);canvas.removeEventListener('webglcontextlost',lost);resources.forEach(b=>gl.deleteBuffer(b));shaders.forEach(s=>gl.deleteShader(s));if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();};
  function lost(e){e.preventDefault();cancelAnimationFrame(frame);running=false;onFailure('context-lost');}
  try{
    function shader(type,text){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Scene shader unavailable');return s;}
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Scene linking unavailable');
    const locations={p:gl.getAttribLocation(program,'aPosition'),n:gl.getAttribLocation(program,'aNormal'),model:gl.getUniformLocation(program,'uModel'),vp:gl.getUniformLocation(program,'uViewProjection'),color:gl.getUniformLocation(program,'uColor'),glow:gl.getUniformLocation(program,'uGlow')};
    function geometry(data){const result={count:data.indices.length};for(const [key,values,type,arr]of [['p',data.pos,gl.ARRAY_BUFFER,Float32Array],['n',data.normal,gl.ARRAY_BUFFER,Float32Array],['i',data.indices,gl.ELEMENT_ARRAY_BUFFER,Uint16Array]]){const b=gl.createBuffer();resources.push(b);gl.bindBuffer(type,b);gl.bufferData(type,new arr(values),gl.STATIC_DRAW);result[key]=b;}return result;}
    const outer=geometry(torus(1.19,.092)),inner=geometry(torus(.63,.085)),race=geometry(torus(.92,.225,56,16)),trim=geometry(torus(1.33,.014,72,6)),core=geometry(torus(.49,.024)),ball=geometry(sphere(.16));
    function draw(mesh,model,color,glow=0){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.p);gl.enableVertexAttribArray(locations.p);gl.vertexAttribPointer(locations.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.enableVertexAttribArray(locations.n);gl.vertexAttribPointer(locations.n,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.i);gl.uniformMatrix4fv(locations.model,false,model);gl.uniform3fv(locations.color,color);gl.uniform1f(locations.glow,glow);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);}
    function render(now=performance.now()){
      if(disposed||gl.isContextLost())return;
      const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(running)elapsed+=dt;
      const follow=1-Math.exp(-5*dt);pointer.x+=(target.x-pointer.x)*follow;pointer.y+=(target.y-pointer.y)*follow;
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);
      gl.uniformMatrix4fv(locations.vp,false,multiply(projection(aspect),translation(0,0,-5.4)));
      const base=multiply(translation(0,Math.sin(elapsed*.48)*.025,0),rotation(.36+pointer.y*.13,-.62+pointer.x*.18,-.27));
      const cyan=live?[.03,.71,1.]:[.35,.52,.67],steel=[.66,.77,.83],dark=[.09,.20,.28];
      draw(race,multiply(base,translation(0,0,-.12)),dark);
      for(const z of [-.29,.29]){draw(outer,multiply(base,translation(0,0,z)),steel);draw(inner,multiply(base,translation(0,0,z)),steel);}
      const rollers=multiply(base,rotation(0,0,elapsed*.10));
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;draw(ball,multiply(rollers,translation(.91*Math.cos(a),.91*Math.sin(a),.19)),[.82,.90,.96]);}
      draw(trim,multiply(base,translation(0,0,.08)),cyan,.8);draw(core,multiply(base,translation(0,0,.12)),cyan,.65);
      draws++;canvas.__dthRenderCount=draws;
      if(draws===1){canvas.dataset.ready='true';onReady();}
      if(running)frame=requestAnimationFrame(render);
    }
    const resize=()=>{if(disposed)return;const r=canvas.getBoundingClientRect(),dpr=Math.min(globalThis.devicePixelRatio||1,1.5);if(!r.width||!r.height)return;aspect=r.width/r.height;canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));if(!running)render();};
    canvas.addEventListener('webglcontextlost',lost);resize();
    return {resize,dispose,setRunning(value){if(disposed)return;const next=!!value;if(next===running)return;running=next;cancelAnimationFrame(frame);last=0;canvas.dataset.running=String(running);if(running)frame=requestAnimationFrame(render);else render();},setConnected(value){live=!!value;canvas.dataset.status=live?'connected':'neutral';if(!running)render();},setPointer(x,y){target={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};},reset(){elapsed=0;target={x:0,y:0};pointer={x:0,y:0};if(!running)render();},snapshot(){return {draws,running,disposed,revision};}};
  }catch(e){dispose();throw e;}
}
