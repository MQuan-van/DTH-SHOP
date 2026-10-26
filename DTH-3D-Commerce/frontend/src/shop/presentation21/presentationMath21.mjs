/** Pure presentation maths; geometry, UVs and materials are never edited. */
export const radians21 = degrees => degrees * Math.PI / 180;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function rotatePoint21(point, rotation) {
  // THREE.Euler XYZ: q = qX * qY * qZ. Keep this order in every viewer.
  const [a,b,c] = rotation.map(n => n/2), s1=Math.sin(a),c1=Math.cos(a),s2=Math.sin(b),c2=Math.cos(b),s3=Math.sin(c),c3=Math.cos(c);
  const qx=s1*c2*c3+c1*s2*s3, qy=c1*s2*c3-s1*c2*s3, qz=c1*c2*s3+s1*s2*c3, qw=c1*c2*c3-s1*s2*s3;
  const [x,y,z]=point, tx=2*(qy*z-qz*y),ty=2*(qz*x-qx*z),tz=2*(qx*y-qy*x);
  return [x+qw*tx+qy*tz-qz*ty,y+qw*ty+qz*tx-qx*tz,z+qw*tz+qx*ty-qy*tx];
}
export function pose21(yaw, pitch, distance, target = [0,0,0]) {
  return { position: [Math.sin(yaw)*Math.cos(pitch)*distance+target[0], Math.sin(pitch)*distance+target[1], Math.cos(yaw)*Math.cos(pitch)*distance+target[2]], target: target.slice() };
}
export function fitDistance21(width, height, radius=1.35, fov=36) {
  const v=radians21(fov), h=2*Math.atan(Math.tan(v/2)*Math.max(1,width)/Math.max(1,height));
  return radius/Math.sin(Math.min(v,h)/2)*1.16;
}
export function presentationFromBounds21(bounds, normalization, settings, frameDistance = fitDistance21) {
  const rotation=settings.rotationDeg.map(radians21), scale=normalization.scale*settings.scale;
  const offset=normalization.offset.slice(), center=settings.offset.slice(), frameRadius=1.35;
  const radius=frameRadius*settings.scale, envelope=radius+Math.hypot(...center);
  const points=[];
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){
    const p=rotatePoint21([x+offset[0],y+offset[1],z+offset[2]],rotation).map((n,i)=>n*scale+center[i]);points.push(p);
  }
  const low=Math.min(...points.map(p=>p[1])),high=Math.max(...points.map(p=>p[1]));
  const referenceDistance=frameDistance(800,600,frameRadius,36);
  const d=Math.max(referenceDistance/settings.camera.zoom,envelope*1.6),yaw=radians21(settings.camera.yawDeg),pitch=radians21(settings.camera.pitchDeg);
  const camera={radius:envelope,frameRadius,center:[0,0,0],fov:36,referenceDistance,secondsPerTurn:settings.spin.secondsPerTurn,
    presets:{front:pose21(yaw,pitch,d),side:pose21(yaw+Math.PI/2,pitch,d),rear:pose21(yaw+Math.PI,pitch,d),detail:pose21(yaw,pitch,Math.max(d*.82,envelope*1.6))}};
  return {scale,offset,rotation,center,radius,camera,hotspots:[],heightRange:[low,Math.max(high-low,.00001)],sourceBounds:{min:bounds.min.slice(),max:bounds.max.slice()}};
}
export function capturedCamera21(position,target,referenceDistance) {
  const v=position.map((n,i)=>n-target[i]),r=Math.hypot(...v);
  if(!Number.isFinite(r)||r<=0||!Number.isFinite(referenceDistance)||referenceDistance<=0)return null;
  return {yawDeg:Math.atan2(v[0],v[2])*180/Math.PI,pitchDeg:clamp(Math.asin(clamp(v[1]/r,-1,1))*180/Math.PI,-65,65),zoom:clamp(referenceDistance/r,.7,1.25)};
}
