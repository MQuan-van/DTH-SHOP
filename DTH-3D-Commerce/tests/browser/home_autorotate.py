"""Autoplay regression on a real compiled Home, without API/database.
VITE_EXPERIENCE_TESTS=true only exposes observations of rendered frames.
"""
import json, math, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=20000)
out=Path('test-results/home-autoplay');out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def ok(text):checks.append(text);print('PASS:',text,flush=True)
def pose(canvas):return json.loads(canvas.get_attribute('data-pose'))
def angle(canvas):return float(canvas.get_attribute('data-turntable-angle'))
def quat(p):
 x,y,z=[a/2 for a in p['rotation']];c1,c2,c3=math.cos(x),math.cos(y),math.cos(z);s1,s2,s3=math.sin(x),math.sin(y),math.sin(z)
 return [s1*c2*c3+c1*s2*s3,c1*s2*c3-s1*c2*s3,c1*c2*s3+s1*s2*c3,c1*c2*c3-s1*s2*s3]
def angular_distance(a,b):return 2*math.acos(min(1,abs(sum(x*y for x,y in zip(quat(a),quat(b))))))
base=os.environ.get('DTH_BROWSER_URL','http://127.0.0.1:4173')
with sync_playwright() as p:
 options={'headless':True,'args':['--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('DTH_CHROMIUM_EXECUTABLE'):options['executable_path']=os.environ['DTH_CHROMIUM_EXECUTABLE']
 browser=p.chromium.launch(**options)
 page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(base+'/');stage=page.locator('[data-scene]');canvas=page.locator('[data-stage] canvas')
  expect(stage).to_have_attribute('data-scene','ready');expect(canvas).to_have_attribute('data-turntable-running','true')
  expect(canvas).to_have_attribute('data-owner','story');expect(page.get_by_role('button',name='Inspect in 3D',exact=False)).to_have_attribute('aria-pressed','false')
  page.wait_for_timeout(1800);before=pose(canvas);camera=json.loads(canvas.get_attribute('data-camera'))
  page.screenshot(path=str(out/'01-home-autoplay.png'),full_page=False)
  page.wait_for_timeout(1500);assert angular_distance(before,pose(canvas))>.04
  assert math.dist(camera,json.loads(canvas.get_attribute('data-camera')))<.08
  ok('The rendered product turns automatically on entry, without clicking Inspect or orbiting the camera')
  page.screenshot(path=str(out/'02-home-another-angle.png'),full_page=False)
  page.get_by_role('button',name='Open support',exact=True).click();expect(canvas).to_have_attribute('data-blocked','true')
  before=pose(canvas);a=angle(canvas);page.wait_for_timeout(700);assert angle(canvas)==a;assert angular_distance(before,pose(canvas))<.001
  page.get_by_role('button',name='Close support',exact=True).click();expect(canvas).to_have_attribute('data-turntable-running','true')
  page.wait_for_timeout(400);assert angle(canvas)!=a;ok('Support pauses the product and closing it resumes without losing the phase')
  enter=page.get_by_role('button',name='Inspect in 3D',exact=False)
  enter.evaluate('button=>button.addEventListener("click",()=>{const c=document.querySelector("[data-stage] canvas");c.dataset.entryPose=c.dataset.pose;},{capture:true,once:true})')
  enter.click();expect(canvas).to_have_attribute('data-owner','inspect');expect(canvas).to_have_attribute('data-turntable-running','false')
  before=json.loads(canvas.get_attribute('data-entry-pose'));page.wait_for_timeout(300);assert angular_distance(before,pose(canvas))<.08
  before=pose(canvas);a=angle(canvas);page.wait_for_timeout(700);assert angle(canvas)==a;assert angular_distance(before,pose(canvas))<.001
  page.get_by_role('button',name='Rotate right',exact=True).click();expect(canvas).to_have_attribute('data-moving','true');expect(canvas).to_have_attribute('data-moving','false')
  ok('Inspect keeps the displayed orientation, stops autoplay and permits manual rotation')
  page.get_by_role('button',name='Reset view',exact=True).click();expect(canvas).to_have_attribute('data-moving','false')
  page.get_by_role('button',name='Return to story',exact=False).click();expect(canvas).to_have_attribute('data-owner','story');expect(canvas).to_have_attribute('data-turntable-running','true')
  a=angle(canvas);page.wait_for_timeout(700);assert angle(canvas)!=a;ok('Returning from Inspect resumes automatic rotation')
  # Scroll a real Home chapter. The turntable yields while the timeline changes.
  page.evaluate('''()=>{const el=document.querySelector('[data-cinematic]');const st=el.querySelector('[data-stage]');const h=document.querySelector('.dth-header').getBoundingClientRect().height;scrollTo(0,el.getBoundingClientRect().top+scrollY-h+(el.offsetHeight-st.offsetHeight)*.61);}''')
  expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter','assembly')
  expect(canvas).to_have_attribute('data-turntable-running','true');ok('Scroll-driven Assembly remains available and idle rotation resumes after scrolling')
  page.get_by_role('button',name='Pause cinematic motion',exact=True).click();expect(canvas).to_have_attribute('data-turntable-running','false')
  page.wait_for_timeout(300);a=angle(canvas);before=pose(canvas);page.wait_for_timeout(700);assert angle(canvas)==a;assert angular_distance(before,pose(canvas))<.001
  page.get_by_role('button',name='Enable cinematic motion',exact=True).click();expect(canvas).to_have_attribute('data-turntable-running','true');ok('Motion off actually stops autoplay and Motion on restarts it')
  page.locator('.dth-header .dth-navigation a[href="/shop"]').click();expect(page.locator('[data-stage] canvas')).to_have_count(0)
  page.locator('.dth-header .dth-navigation a[href="/"]').click();expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');expect(page.locator('[data-stage] canvas')).to_have_count(1);expect(page.locator('[data-stage] canvas')).to_have_attribute('data-turntable-running','true')
  ok('Route return creates one Home stage and automatically restarts the turntable')
  page.emulate_media(reduced_motion='reduce');page.reload();expect(stage).to_have_attribute('data-scene','ready');page.wait_for_timeout(500)
  a=angle(canvas);page.wait_for_timeout(500);assert angle(canvas)==a==0;expect(canvas).to_have_attribute('data-turntable-running','false')
  page.get_by_role('button',name='Inspect in 3D',exact=False).click();expect(canvas).to_have_attribute('data-owner','inspect');ok('Reduced motion prevents autoplay while keeping manual inspection available')
  page.emulate_media(reduced_motion='no-preference');page.route('**/models/**/*.glb*',lambda route:route.abort());page.goto(base+'/');expect(stage).to_have_attribute('data-scene','fallback');expect(page.get_by_role('link',name='View product',exact=False)).to_be_visible();ok('A failed GLB still leaves the product link and image fallback usable')
  assert not errors,errors;ok('No uncaught page errors in the autoplay interaction checks')
 except Exception:
  page.screenshot(path=str(out/'failure.png'),full_page=False);(out/'failure.html').write_text(page.content());raise
 finally:
  (out/'results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2));browser.close()
