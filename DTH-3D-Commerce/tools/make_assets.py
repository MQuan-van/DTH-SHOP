"""Original low-poly illustrative assets. Not manufacturer geometry or fitment data.
Optional regeneration: python -m pip install trimesh numpy pillow
"""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import trimesh as tm
from trimesh.transformations import rotation_matrix, translation_matrix

ROOT = Path(__file__).resolve().parents[1]
metal=(165,174,183,255); dark=(37,43,51,255); rubber=(22,25,29,255)
accents=[(215,245,92,255),(232,124,70,255),(125,176,203,255),(200,187,165,255)]

def mat(mesh, color, metallic=.65, rough=.32):
    mesh.visual=tm.visual.TextureVisuals(material=tm.visual.material.PBRMaterial(
        baseColorFactor=color, metallicFactor=metallic, roughnessFactor=rough))
    return mesh

def move(mesh, xyz=(0,0,0), angle=0, axis=(1,0,0)):
    if angle: mesh.apply_transform(rotation_matrix(angle,axis))
    mesh.apply_translation(xyz); return mesh

def cylinder(r,h,color=metal, xyz=(0,0,0), angle=math.pi/2, axis=(1,0,0), n=40):
    return move(mat(tm.creation.cylinder(r,h,sections=n),color),xyz,angle,axis)

def ring(r,t,color=metal,xyz=(0,0,0),angle=math.pi/2,axis=(1,0,0)):
    return move(mat(tm.creation.torus(r,t,major_sections=40,minor_sections=10),color),xyz,angle,axis)

def bar(a,b,r,color=metal):
    a,b=np.array(a,float),np.array(b,float)
    mesh=mat(tm.creation.cylinder(r,np.linalg.norm(b-a),sections=12),color)
    mesh.apply_transform(tm.geometry.align_vectors([0,0,1], b-a))
    mesh.apply_translation((a+b)/2);return mesh

def model(kind, v):
    A=accents[v]; parts=[]
    if kind=='wheels':
        # Wheel faces the viewer, axis Z.
        parts += [ring(.88,.19,rubber,angle=0),ring(.73,.055,metal,xyz=(0,0,.16),angle=0),ring(.73,.055,metal,xyz=(0,0,-.16),angle=0)]
        parts += [cylinder(.19,.42,metal,angle=0),ring(.87,.025,A,xyz=(0,0,.16),angle=0)]
        for i in range(5+v):
            a=i*math.tau/(5+v)
            parts.append(bar((.14*math.cos(a),.14*math.sin(a),.12),(.7*math.cos(a+.14),.7*math.sin(a+.14),.12),.048,metal))
        for i in range(5):
            a=i*math.tau/5
            parts.append(cylinder(.03,.025,dark,(.12*math.cos(a),.12*math.sin(a),.225),angle=0,n=8))
    elif kind=='exhausts':
        parts += [cylinder(.31,1.48,dark),cylinder(.325,.13,metal,(0,.70,0)),cylinder(.33,.14,A,(0,-.68,0)),cylinder(.20,.23,metal,(0,.84,0)),cylinder(.155,.01,rubber,(0,.963,0)),cylinder(.12,.48,metal,(0,-.96,0))]
        parts += [ring(.325,.017,metal,(0,.38,0)),ring(.325,.017,metal,(0,-.35,0))]
        plaque=mat(tm.creation.box([.21,.33,.03]),A);parts.append(move(plaque,(0,.05,.31)))
        for i in range(8):
            a=i*math.tau/8
            parts.append(cylinder(.016,.022,dark,(.27*math.cos(a),.779,.27*math.sin(a)),n=8))
        for p in parts: p.apply_transform(rotation_matrix(-.65,[0,0,1]))
    elif kind=='suspension':
        parts += [cylinder(.11,1.7,metal),cylinder(.16,.60,dark,(0,-.54,0)),cylinder(.25,.13,A,(0,.66,0)),cylinder(.25,.13,A,(0,-.46,0))]
        for y in [-1.02,.98]:
            parts.append(ring(.145,.052,metal,xyz=(0,y,0),angle=0))
        steps=128
        for i in range(steps):
            t=i/steps; u=(i+1)/steps
            a=(.245*math.cos(t*math.tau*(7+v)),t*1.05-.43,.245*math.sin(t*math.tau*(7+v)))
            b=(.245*math.cos(u*math.tau*(7+v)),u*1.05-.43,.245*math.sin(u*math.tau*(7+v)))
            parts.append(bar(a,b,.032,A))
        parts += [cylinder(.14,.47,dark,(.34,.41,0)),cylinder(.145,.07,A,(.34,.67,0)),bar((0,.65,0),(.34,.65,0),.075)]
    elif kind=='mirrors':
        for side in [-1,1]:
            parts += [bar((side*.24,-.71,0),(side*.45,-.16,0),.042,dark),bar((side*.45,-.16,0),(side*.78,.20,0),.047,metal),cylinder(.085,.15,A,(side*.24,-.72,0))]
            shell=mat(tm.creation.icosphere(subdivisions=2,radius=1),dark);shell.apply_scale([.37,.23,.10]);parts.append(move(shell,(side*.78,.28,0)))
            glass=mat(tm.creation.icosphere(subdivisions=2,radius=1),(125,163,177,255),.92,.15);glass.apply_scale([.33,.19,.017]);parts.append(move(glass,(side*.78,.28,.093)))
    elif kind=='brakes':
        # Lathed annulus, with radial cutouts represented by surface inlays.
        for radius,t in [(.78,.08),(.53,.14),(.18,.10)]:
            parts.append(ring(radius,t,metal,angle=0))
        for i in range(12):
            a=i*math.tau/12
            parts += [bar((.22*math.cos(a),.22*math.sin(a),0),(.52*math.cos(a+.08),.52*math.sin(a+.08),0),.045,dark)]
        for i in range(20):
            a=i*math.tau/20
            parts.append(cylinder(.019,.017,dark,(.77*math.cos(a),.77*math.sin(a),.08),angle=0,n=8))
        caliper=mat(tm.creation.box([.32,.64,.28]),A);parts.append(move(caliper,(.74,0,.13),.08,(0,0,1)))
        for y in [-.17,.17]:parts.append(cylinder(.075,.025,dark,(.74,y,.28),angle=0))
    return parts

def preview(parts,path):
    # Orthographic software-rendered preview of the actual mesh, not a separate stock image.
    W,H=960,720; scale=235
    bg=Image.new('RGB',(W,H),(24,27,31)); layer=Image.new('RGBA',(W,H))
    d=ImageDraw.Draw(layer); d.ellipse((245,530,715,590),fill=(0,0,0,95));layer=layer.filter(ImageFilter.GaussianBlur(24));bg=Image.alpha_composite(bg.convert('RGBA'),layer)
    d=ImageDraw.Draw(bg)
    R=rotation_matrix(-.24,[1,0,0])[:3,:3]@rotation_matrix(-.37,[0,1,0])[:3,:3]
    faces=[];light=np.array([-.3,.7,1]);light/=np.linalg.norm(light)
    for mesh in parts:
        v=mesh.vertices@R.T; col=np.array(mesh.visual.material.baseColorFactor[:3],float)
        normals=mesh.face_normals@R.T
        for idx,f in enumerate(mesh.faces):
            pts=v[f]
            if normals[idx,2] < -.12: continue
            brightness=.47+.65*max(0,float(normals[idx]@light))
            c=tuple(np.clip(col*brightness,0,255).astype(int))
            faces.append((pts[:,2].mean(),[(float(x*scale+W/2),float(-y*scale+H/2)) for x,y,z in pts],c))
    for _,poly,c in sorted(faces,key=lambda x:x[0]):d.polygon(poly,fill=(*c,255))
    bg.convert('RGB').save(path,optimize=True)

vehicles=[]
for make,mod,code,yrs in [('Demo Moto','Street 155','street155',[2022,2023]),('Demo Moto','Road 300','road300',[2023,2024]),('Demo Auto','Touring 1.6','touring16',[2021,2022]),('Demo Auto','Sport 2.0','sport20',[2023,2024])]:
 for yr in yrs: vehicles.append({'id':f'{code}-{yr}','make':make,'model':mod,'year':yr,'demoOnly':True})
series=['Apex','Vector','Touring','Studio']
bases={'exhausts':2400000,'wheels':3200000,'mirrors':650000,'brakes':1500000,'suspension':2800000}
labels={'exhausts':'Exhaust','wheels':'Alloy wheel','mirrors':'Mirror set','brakes':'Brake set','suspension':'Coilover'}
desc={'exhausts':'Explore the canister, mounting band and outlet from every angle.','wheels':'Inspect the spoke pattern, hub and rim profile in a real-time 3D view.','mirrors':'Examine the mirror pair, stem design and surface treatment.','brakes':'Inspect the disc and caliper layout from multiple viewpoints.','suspension':'Explore the spring, damper body and reservoir geometry.'}
products=[]
for kind in ['suspension','wheels','exhausts','mirrors','brakes']:
 for v in range(4):
  slug=f'{series[v].lower()}-{kind}';raw_parts=model(kind,v)
  groups={}
  for mesh in raw_parts:
   m=mesh.visual.material
   k=(tuple(m.baseColorFactor),m.metallicFactor,m.roughnessFactor)
   groups.setdefault(k,[]).append(mesh)
  parts=[mat(tm.util.concatenate(meshes),k[0],k[1],k[2]) for k,meshes in groups.items()]
  scene=tm.Scene()
  for idx,mesh in enumerate(parts):scene.add_geometry(mesh,node_name=f'part-{idx}',geom_name=f'part-{idx}')
  modelpath=ROOT/'frontend/public/models/dth-demo'/f'{slug}.glb';modelpath.write_bytes(scene.export(file_type='glb'))
  preview(parts,ROOT/'frontend/public/previews/dth-demo'/f'{slug}.png')
  ids=[x['id'] for x in vehicles[v*2:v*2+2]]
  products.append({'id':slug,'slug':slug,'name':f'{series[v]} {labels[kind]}','category':kind,'price':bases[kind]+v*250000,'currency':'VND','finish':['Acid / Graphite','Ember / Alloy','Ice / Titanium','Sand / Graphite'][v], 'accent':'#%02x%02x%02x'%accents[v][:3], 'description':desc[kind]+' Original illustrative FYP model; not a manufacturer product or a dimensionally verified part.', 'modelUrl':f'/models/dth-demo/{slug}.glb','imageUrl':f'/previews/dth-demo/{slug}.png','vehicleIds':ids,'active':True,'demoOnly':True,'assetLicense':'Original illustrative project asset','specs':{'Collection':series[v],'Asset purpose':'Visual prototype only','Fitment source':'Synthetic demo mapping','Payment':'Simulation only'}, 'featured':v==0})
(ROOT/'shared/catalog.json').write_text(json.dumps({'version':1,'demoOnly':True,'vehicles':vehicles,'products':products},indent=2)+'\n')
print(f'Wrote {len(products)} GLB models, previews and {len(vehicles)} demo vehicle configurations.')
