"""Home wheel must browse the document, never scrub the scene or zoom the model.
Uses real wheel/drag events on a compiled Flow build with test telemetry enabled.
No database, API mock or renderer stub. Failure evidence is retained.
"""
import json, math, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
expect.set_options(timeout=25000)
out=Path('test-results/home-freescroll');out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
base=os.environ.get('DTH_BROWSER_URL','http://127.0.0.1:4173')
def ok(name):checks.append(name);print('PASS:',name,flush=True)
def read(canvas,key):return json.loads(canvas.get_attribute('data-'+key))
def settle(canvas):
 canvas.evaluate('el=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
 expect(canvas).to_have_attribute('data-moving','false')
def radius(canvas):
 snap=read(canvas,'capture');return math.dist(snap['camera'],snap['target'])
def ready(page):
 expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready')
 expect(page.locator('[data-navigation]')).to_have_attribute('data-navigation','chapters')
 expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false')
def turn_on_form(page):
 page.get_by_role('navigation',name='Product story chapters').get_by_role('button').nth(0).click()
 page.wait_for_function('Math.abs(Number(document.querySelector("[data-navigation]").dataset.progress))<.0001')
with sync_playwright() as p:
 args={'headless':True,'args':['--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('DTH_CHROMIUM_EXECUTABLE'):args['executable_path']=os.environ['DTH_CHROMIUM_EXECUTABLE']
 browser=p.chromium.launch(**args);page=browser.new_page(viewport={'width':1440,'height':1000})
 page.on('pageerror',lambda error:errors.append(str(error)))
 try:
  page.goto(base+'/');ready(page);canvas=page.locator('[data-stage] canvas');stage=page.locator('[data-stage]')
  page.wait_for_function('Math.hypot(...JSON.parse(document.querySelector("[data-stage] canvas").dataset.camera).map((v,i)=>v-[0,.35,8.4][i]))<.01')
  geometry=stage.evaluate('el=>({height:el.offsetHeight,parentHeight:el.parentElement.offsetHeight,position:getComputedStyle(el).position})')
  assert geometry['position']=='relative' and abs(geometry['height']-geometry['parentHeight'])<2,geometry
  assert read(canvas,'pedestal-scale')==[1.4,1,1.12]
  page.screenshot(path=str(out/'01-wide-showroom.png'),full_page=False)
  ok('One taller normal-flow hero, with an actually widened 3D pedestal, not a sticky spacer')
  expect(canvas).to_have_attribute('data-turntable-running','true')
  old_angle=float(canvas.get_attribute('data-turntable-angle'));page.wait_for_timeout(500)
  assert abs(float(canvas.get_attribute('data-turntable-angle'))-old_angle)>.01
  ok('Product still autorotates before Inspect is opened')
  old_camera=read(canvas,'camera');old_top=stage.bounding_box()['y'];old_scroll=page.evaluate('scrollY')
  page.mouse.move(950,400);page.mouse.wheel(0,280)
  page.wait_for_function('(y)=>scrollY>y+200',arg=old_scroll)
  delta=page.evaluate('scrollY')-old_scroll
  assert abs(stage.bounding_box()['y']-old_top+delta)<3
  assert page.locator('[data-navigation]').get_attribute('data-progress')=='0.0000'
  assert math.dist(old_camera,read(canvas,'camera'))<.02
  ok('Wheel over the showroom scrolls the hero out normally without changing its camera or chapter')
  page.get_by_role('button',name='Inspect in 3D',exact=False).click();expect(canvas).to_have_attribute('data-owner','inspect')
  box=canvas.bounding_box();page.mouse.move(box['x']+box['width']*.55,max(180,box['y']+box['height']*.45))
  old_camera=read(canvas,'camera');old_scroll=page.evaluate('scrollY');page.mouse.wheel(0,140)
  page.wait_for_function('(y)=>scrollY>y+90',arg=old_scroll)
  assert math.dist(old_camera,read(canvas,'camera'))<.001
  ok('Wheel over the interactive Inspect canvas scrolls the page and does not accidentally zoom')
  page.get_by_role('button',name='Zoom in',exact=True).scroll_into_view_if_needed();initial=radius(canvas)
  page.get_by_role('button',name='Zoom in',exact=True).click();settle(canvas);assert radius(canvas)<initial-.1
  page.get_by_role('button',name='Zoom out',exact=True).click();settle(canvas);assert radius(canvas)>initial*.88+.1
  ok('Explicit zoom buttons still work while wheel zoom is disabled')
  page.get_by_role('button',name='Reset view',exact=True).click();settle(canvas)
  box=canvas.bounding_box();x=box['x']+box['width']*.55;y=max(180,box['y']+box['height']*.45)
  old_camera=read(canvas,'camera');page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+60,y+8,steps=10);page.mouse.up()
  assert math.dist(old_camera,read(canvas,'camera'))>.1
  ok('Dragging still rotates the model in Inspect')
  page.get_by_role('button',name='Return to story',exact=False).click();expect(canvas).to_have_attribute('data-owner','story')
  nav=page.get_by_role('navigation',name='Product story chapters')
  nav.scroll_into_view_if_needed();old_scroll=page.evaluate('scrollY')
  nav.get_by_role('button').nth(2).click();expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter','assembly')
  page.wait_for_function('Math.abs(Number(document.querySelector("[data-navigation]").dataset.progress)-.61)<.0001')
  page.wait_for_function('Number(document.querySelector("[data-stage] canvas").dataset.renderedExplode)>.98')
  assert abs(page.evaluate('scrollY')-old_scroll)<2
  # Same-frame button presses exercise tween replacement rather than long sequential waits.
  nav.evaluate('el=>{const b=el.querySelectorAll("button");b[0].click();b[2].click();b[1].click();}')
  page.wait_for_function('Math.abs(Number(document.querySelector("[data-navigation]").dataset.progress)-.29)<.0001')
  expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter','surface')
  ok('Chapter clicks animate camera/assembly without moving the document; the latest rapid selection wins')
  turn_on_form(page);page.evaluate('scrollTo({top:0,behavior:"instant"})')
  before=stage.bounding_box()['height'];page.get_by_role('button',name='Pause cinematic motion',exact=True).click()
  expect(page.locator('[data-motion]')).to_have_attribute('data-motion','off');expect(canvas).to_have_attribute('data-turntable-running','false')
  assert abs(stage.bounding_box()['height']-before)<1
  page.get_by_role('button',name='Enable cinematic motion',exact=True).click();expect(canvas).to_have_attribute('data-turntable-running','true')
  ok('Motion toggle does not add or remove a long scroll spacer')
  page.get_by_role('button',name='Open support',exact=True).click();expect(canvas).to_have_attribute('data-blocked','true')
  page.get_by_role('button',name='Close support',exact=True).click();expect(canvas).to_have_attribute('data-turntable-running','true')
  ok('Support pauses background autoplay and closing it resumes normal presentation')
  page.get_by_role('link',name='Skip to parts',exact=False).click()
  expect(page.locator('#collection-title')).to_be_in_viewport()
  page.mouse.wheel(0,550);expect(canvas).to_have_attribute('data-turntable-running','false')
  page.screenshot(path=str(out/'02-collection-after-scroll.png'),full_page=False)
  ok('Collection is reachable directly and offscreen autoplay stops')
  for _ in range(3):
   page.locator('.dth-header .dth-navigation a[href="/shop"]').click();expect(page.locator('[data-stage] canvas')).to_have_count(0)
   page.locator('.dth-header .dth-navigation a[href="/"]').click();ready(page);expect(page.locator('[data-stage] canvas')).to_have_count(1)
  ok('SPA navigation does not duplicate the scene or bring back sticky scrolling')
  for width,height in [(1920,1080),(1280,720),(768,850),(390,850)]:
   page.set_viewport_size({'width':width,'height':height});page.reload();ready(page)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   assert stage.evaluate('el=>Math.abs(el.parentElement.offsetHeight-el.offsetHeight)<2 && getComputedStyle(el).position==="relative"')
   page.screenshot(path=str(out/f'03-layout-{width}.png'),full_page=False)
  ok('Desktop, short laptop, tablet and compact widths have no sticky spacer or horizontal overflow')
  page.emulate_media(reduced_motion='reduce');page.reload();ready(page)
  expect(page.get_by_role('button',name='Enable cinematic motion',exact=True)).to_be_disabled()
  expect(canvas).to_have_attribute('data-turntable-running','false')
  nav.get_by_role('button').nth(2).click();expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter','assembly')
  ok('Reduced-motion users keep chapter controls and ordinary page scrolling')
  assert not errors,errors;ok('No uncaught browser exception in the free-scroll review')
 except Exception:
  page.screenshot(path=str(out/'failure.png'),full_page=False);(out/'failure.html').write_text(page.content());raise
 finally:
  (out/'results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2));browser.close()
