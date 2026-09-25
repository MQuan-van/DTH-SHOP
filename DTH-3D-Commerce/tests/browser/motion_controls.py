"""Focused real-browser motion regression; no API/database needed.
Run a Flow production build with VITE_EXPERIENCE_TESTS=true on port 4173.
Telemetry observes actual rendered frames; no successful interaction is mocked.
"""
import json, math, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=20000)
out=Path('test-results/motion-controls');out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
base=os.environ.get('DTH_BROWSER_URL','http://127.0.0.1:4173')
def ok(text): checks.append(text);print('PASS:',text,flush=True)
def capture(canvas): return json.loads(canvas.get_attribute('data-capture'))
def radius(frame): return math.dist(frame['camera'],frame['target'])
def yaw(frame): return math.atan2(frame['camera'][0]-frame['target'][0],frame['camera'][2]-frame['target'][2])
def click_many(page,label,count):
 page.evaluate('''([label,n])=>{const b=[...document.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===label);if(!b)throw new Error(label);for(let i=0;i<n;i++)b.click();}''',[label,count])
def settle(canvas):
 # Observe frames after the command before testing the previous frame's flag.
 canvas.evaluate('node=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
 expect(canvas).to_have_attribute('data-moving','false')
def reset(page,canvas):
 page.get_by_role('button',name='Reset view',exact=True).click();settle(canvas)
 page.wait_for_function('Number(document.querySelector("[data-stage] canvas").dataset.renderedExplode)<.001')
 page.wait_for_timeout(200)
with sync_playwright() as p:
 args={'headless':True,'args':['--use-angle=swiftshader','--enable-unsafe-swiftshader']}
 if os.environ.get('DTH_CHROMIUM_EXECUTABLE'):args['executable_path']=os.environ['DTH_CHROMIUM_EXECUTABLE']
 browser=p.chromium.launch(**args)
 page=browser.new_page(viewport={'width':1440,'height':1000});page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(base+'/');expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');page.wait_for_timeout(1600)
  canvas=page.locator('[data-stage] canvas')
  enter=page.get_by_role('button',name='Inspect in 3D',exact=False)
  # Observe the actual camera at the click, not before Playwright waits for an
  # animating button to become actionable. This also exercises mid-intro entry.
  enter.evaluate('button=>button.addEventListener("click",()=>{const canvas=document.querySelector("[data-stage] canvas");canvas.dataset.entryCamera=canvas.dataset.camera;},{once:true,capture:true})')
  enter.click();before=json.loads(canvas.get_attribute('data-entry-camera'))
  expect(canvas).to_have_attribute('data-owner','inspect');page.wait_for_timeout(200)
  after=capture(canvas)['camera']
  assert math.dist(before,after)<.08,(before,after);ok('Inspect keeps the current camera rather than jumping to a preset')
  reset(page,canvas);initial=capture(canvas)
  click_many(page,'Rotate right',4);settle(canvas);rotated=capture(canvas)
  delta=(yaw(rotated)-yaw(initial)+math.pi)%(2*math.pi)-math.pi
  assert abs(delta-1.2)<.025,delta;ok('Four same-frame rotation clicks produce four steps, not one')
  reset(page,canvas);initial=capture(canvas)
  click_many(page,'Zoom in',3);settle(canvas)
  assert abs(radius(capture(canvas))-radius(initial)*.88**3)<.02;ok('Repeated zoom buttons accumulate correctly')
  click_many(page,'Zoom in',80);settle(canvas);assert abs(radius(capture(canvas))-4.5)<.02
  click_many(page,'Zoom out',80);settle(canvas);assert abs(radius(capture(canvas))-20)<.02;ok('Repeated zoom stays inside both safe camera limits')
  reset(page,canvas)
  page.get_by_role('button',name='Rear',exact=True).click()
  box=canvas.bounding_box();x=box['x']+box['width']*.55;y=box['y']+box['height']*.5
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+65,y+18,steps=7);page.mouse.up();settle(canvas)
  held=capture(canvas)['camera'];page.wait_for_timeout(700)
  assert math.dist(held,capture(canvas)['camera'])<.01;ok('Dragging interrupts a named-view animation without resuming it later')
  page.get_by_role('button',name='Side',exact=True).click()
  page.get_by_role('button',name='Open support',exact=True).click();expect(canvas).to_have_attribute('data-blocked','true')
  held=json.loads(canvas.get_attribute('data-camera'));page.wait_for_timeout(300)
  page.get_by_role('button',name='Close support',exact=True).click();expect(canvas).to_have_attribute('data-blocked','false');settle(canvas);page.wait_for_timeout(500)
  assert math.dist(held,capture(canvas)['camera'])<.03;ok('Support overlay cancels pending camera motion without click-through or delayed jumps')
  page.get_by_role('slider',name='Assembly separation',exact=True).fill('0.7')
  page.get_by_role('slider',name='Light direction',exact=True).fill('45')
  page.get_by_role('button',name='Spring',exact=True).click();page.get_by_role('button',name='Wireframe',exact=True).click()
  reset(page,canvas)
  expect(page.get_by_role('slider',name='Assembly separation',exact=True)).to_have_value('0')
  expect(page.get_by_role('slider',name='Light direction',exact=True)).to_have_value('0')
  expect(page.get_by_role('button',name='Wireframe',exact=True)).to_have_attribute('aria-pressed','false')
  assert math.dist(capture(canvas)['camera'],[0,.3,10.8])<.03;ok('Reset restores camera, assembly, light and wireframe together')
  page.get_by_role('button',name='Top',exact=True).click();settle(canvas)
  assert all(math.isfinite(v) for v in capture(canvas)['camera']);ok('Top preset converges without an endless movement loop')
  page.screenshot(path=str(out/'01-inspection-controls.png'),full_page=False)
  page.get_by_role('button',name='Return to story',exact=False).click();expect(canvas).to_have_attribute('data-owner','story')
  for _ in range(3):
   page.locator('.dth-header .dth-navigation a[href="/shop"]').click();expect(page.locator('[data-stage] canvas')).to_have_count(0)
   page.locator('.dth-header .dth-navigation a[href="/"]').click();expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');expect(page.locator('[data-stage] canvas')).to_have_count(1)
  ok('Re-entering Home does not duplicate canvases or retain inspection commands')
  page.emulate_media(reduced_motion='reduce');page.reload();expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready')
  page.get_by_role('button',name='Inspect in 3D',exact=False).click();page.get_by_role('button',name='Side',exact=True).click()
  settle(page.locator('[data-stage] canvas'));expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');ok('Reduced-motion inspection remains usable without the pinned scroll story')
  assert not errors,errors;ok('No uncaught browser exception in the focused interaction checks')
 except Exception:
  page.screenshot(path=str(out/'failure.png'),full_page=False);(out/'failure.html').write_text(page.content());raise
 finally:
  (out/'results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2));browser.close()
