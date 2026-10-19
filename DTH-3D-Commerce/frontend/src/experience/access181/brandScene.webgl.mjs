import { LOGO_MESHES } from './logo.mesh.mjs';
import { identity, multiply, translation, rotation, projection, torus, spring, hexNut } from './scene.geometry.mjs';
import { validateScenePhase } from './access.logic.mjs';
const VS = `#version 300 es
in vec3 aPosition;in vec3 aNormal;uniform mat4 uModel,uVP;out vec3 vPosition,vNormal;
void main(){vec4 p=uModel*vec4(aPosition,1.);vPosition=p.xyz;vNormal=normalize(mat3(uModel)*aNormal);gl_Position=uVP*p;}`;
const FS = `#version 300 es
precision highp float;
in vec3 vPosition,vNormal;uniform vec3 uColor,uAccent;uniform vec2 uPointer;uniform float uGlow,uTime,uEyeZ;out vec4 outColor;
void main(){
 vec3 n=normalize(vNormal),v=normalize(vec3(0.,0.,uEyeZ)-vPosition),r=reflect(-v,n);
 vec3 light=normalize(vec3(-3.+uPointer.x,4.+uPointer.y,5.));
 float d=max(dot(n,light),0.),edge=pow(1.-max(dot(n,v),0.),3.);
 float whitebox=pow(max(0.,1.-abs(r.x+.25+sin(uTime*.25)*.10)),18.);
 float longbox=pow(max(0.,1.-abs(r.y-.62)),34.);
 float spec=pow(max(dot(n,normalize(light+v)),0.),65.);
 vec3 env=vec3(.08,.16,.22)+vec3(.83,.93,1.)*(whitebox*.60+longbox*.52+spec*.48);
 vec3 metal=uColor*(.18+d*.72)+env*1.05+uAccent*edge*.6;
 vec3 color=mix(metal,uColor*.6+uAccent*(.65+edge*.7),uGlow);
 color=color/(color+vec3(.42));outColor=vec4(pow(max(color,vec3(0.)),vec3(.78)),1.);
}`;
/** Native WebGL2 brand sculpture, not a video or a catalog model. One owned context. */
export function createBrandScene(canvas, { onReady = () => {}, onFailure = () => {}, pointer = { current: { x:0,y:0 } } } = {}) {
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power',depth:true,preserveDrawingBuffer:false});
  if(!gl)throw new Error('WebGL2 unavailable');
  let disposed=false,frame=0,running=false,last=0,time=0,phase='idle',draws=0,aspect=1,px=0,py=0;
  let program=null;const buffers=[],shaders=[];
  const lost=event=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;running=false;onFailure('The 3D scene was interrupted. Sign-in is still available.');};
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);frame=0;canvas.removeEventListener('webglcontextlost',lost);for(const b of buffers)gl.deleteBuffer(b);for(const s of shaders)gl.deleteShader(s);if(program)gl.deleteProgram(program);canvas.dataset.running='false';}
  try {
    function shader(type,text){const s=gl.createShader(type);shaders.push(s);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Unable to compile the brand scene.');return s;}
    program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VS));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FS));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Unable to link the brand scene.');
    const l={p:gl.getAttribLocation(program,'aPosition'),n:gl.getAttribLocation(program,'aNormal')};for(const k of ['Model','VP','Color','Accent','Pointer','Glow','Time','EyeZ'])l[k]=gl.getUniformLocation(program,'u'+k);
    function geometry(data){const mesh={count:data.positions.length/3};for(const [key,values] of [['p',data.positions],['n',data.normals]]){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);mesh[key]=b;}return mesh;}
    const logos=LOGO_MESHES.map(m=>({x:m.x,mesh:geometry(m)}));
    const ring=geometry(torus(1.82,.009,80,6)),coil=geometry(spring()),nut=geometry(hexNut()),disc=geometry(torus(.38,.047,48,10));
    function draw(mesh,matrix,color,glow=0){gl.bindBuffer(gl.ARRAY_BUFFER,mesh.p);gl.enableVertexAttribArray(l.p);gl.vertexAttribPointer(l.p,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.n);gl.enableVertexAttribArray(l.n);gl.vertexAttribPointer(l.n,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(l.Model,false,matrix);gl.uniform3fv(l.Color,color);gl.uniform1f(l.Glow,glow);gl.drawArrays(gl.TRIANGLES,0,mesh.count);}
    function render(now=performance.now()){
      if(disposed||gl.isContextLost())return;
      const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(running)time+=dt;
      const p=pointer.current||{x:0,y:0},follow=running?1-Math.exp(-5*dt):1;px+=(p.x-px)*follow;py+=(p.y-py)*follow;
      const accent=phase==='error'?[1.,.10,.18]:phase==='working'?[.2,.83,1.]:[.015,.50,.96];
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(program);
      gl.uniformMatrix4fv(l.VP,false,multiply(projection(aspect),translation(0,0,-Math.max(5.0,10.9/aspect))));gl.uniform1f(l.EyeZ,Math.max(5.0,10.9/aspect));gl.uniform3fv(l.Accent,accent);gl.uniform2f(l.Pointer,px,py);gl.uniform1f(l.Time,time);
      const secure=phase==='secure',work=phase==='working';
      const base=multiply(translation(0,.12+Math.sin(time*.45)*.035,0),rotation(secure?.02:.12+py*.08,secure?-.08:-.29+px*.12,work?-.035:-.10));
      const steel=[.65,.74,.83];for(const logo of logos)draw(logo.mesh,multiply(base,translation(logo.x,0,0)),steel);
      // Thin orbital line + restrained accessory silhouettes: never presented as purchasable parts.
      draw(ring,multiply(translation(.08,.1,-.45),rotation(.56,-.30,-.14+time*.012)),[.04,.23,.34],.35);
      const spread=phase==='register'?1.08:secure?.72:1;
      draw(coil,multiply(translation(-2.12*spread,1.15*spread,-.25),rotation(.12,-.20,-.50+Math.sin(time*.27)*.10)),[.36,.49,.61]);
      draw(nut,multiply(translation(2.1*spread,1.02*spread,.12),rotation(.46+py*.2,-.3,time*(work?.2:.06)+.20)),[.45,.60,.73]);
      draw(disc,multiply(translation(-1.47*spread,-1.09*spread,.25),rotation(.45,-.70,time*.04-.18)),[.53,.62,.7]);
      draws++;canvas.__dthRenderCount=draws;
      if(draws===1){canvas.dataset.ready='true';onReady();}
      if(running)frame=requestAnimationFrame(render);
    }
    function resize(){if(disposed)return;const b=canvas.getBoundingClientRect();if(b.width<=0||b.height<=0)return;aspect=b.width/b.height;const dpr=Math.min(devicePixelRatio||1,matchMedia('(max-width:800px)').matches?1:1.5);canvas.width=Math.max(1,Math.round(b.width*dpr));canvas.height=Math.max(1,Math.round(b.height*dpr));if(!running)render();}
    canvas.addEventListener('webglcontextlost',lost);resize();
    return {dispose,resize,setPhase(next){phase=validateScenePhase(next);canvas.dataset.phase=phase;if(!running)render();},setRunning(next){next=Boolean(next);if(disposed||next===running)return;running=next;cancelAnimationFrame(frame);frame=0;last=0;canvas.dataset.running=String(running);if(running)frame=requestAnimationFrame(render);},reset(){time=0;px=0;py=0;if(!running)render();},snapshot(){return {draws,running,disposed,phase,triangles:LOGO_MESHES.reduce((n,m)=>n+m.positions.length/9,0)};}};
  } catch(error){dispose();throw error;}
}
