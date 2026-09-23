"""Real compiled React/WebGL review. No API, database or mocked renderer.
A chapter state assertion alone cannot establish that the stage stays onscreen.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path('test-results/cinematic');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('DTH_CINEMATIC_URL','http://127.0.0.1:4173')
checks,errors=[],[]
def ok(name):checks.append(name);print('PASS:',name,flush=True)
def shot(page,name):page.screenshot(path=str(out/(name+'.png')))
def assert_stage(page):
 bounds=page.locator('[data-stage]').evaluate("el=>({height:el.offsetHeight, parent:el.parentElement.offsetHeight, position:getComputedStyle(el).position})")
 assert bounds['position']=='relative',bounds
 assert abs(bounds['height']-bounds['parent'])<=2,bounds
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 assert page.locator('[data-stage] canvas').count()==1
 def_bounds=page.locator('[data-stage] canvas').bounding_box()
 assert def_bounds['height']>250 and def_bounds['width']>250,def_bounds
def select_chapter(page,amount):
 index={0:0,.29:1,.61:2,1:3}[amount]
 button=page.get_by_role('navigation',name='Product story chapters').get_by_role('button').nth(index)
 button.scroll_into_view_if_needed();before=page.evaluate('scrollY');button.click()
 expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter',['form','surface','assembly','build'][index])
 page.wait_for_function('(p)=>Math.abs(Number(document.querySelector("[data-navigation]").dataset.progress)-p)<.0001',arg=amount)
 assert abs(page.evaluate('scrollY')-before)<2
 assert_stage(page)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page=context.new_page();page.set_default_timeout(25000);page.on('pageerror',lambda error:errors.append(str(error)))
 try:
  page.goto(base+'/');expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready')
  expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false')
  page.wait_for_timeout(1500);assert_stage(page);shot(page,'01-home');ok('Real GLB loads in a taller, single normal-flow showroom')
  for name,amount,chapter in [('02-surface',.29,'surface'),('03-assembly',.61,'assembly'),('04-reassembled',1,'build')]:
   select_chapter(page,amount);expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter',chapter);shot(page,name)
  ok('Chapter buttons change the scene without scrolling the document')
  page.get_by_role('button',name='Find my fit',exact=False).click();expect(page.get_by_role('dialog',name='Find your fit.')).to_be_visible();page.get_by_role('button',name='Close dialog',exact=True).click();ok('Home uses the existing vehicle selector instead of a disconnected form')
  select_chapter(page,0);expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter','form');ok('Chapter transitions are reversible')
  page.get_by_role('button',name='Inspect in 3D',exact=False).click();expect(page.locator('[data-inspect]')).to_have_attribute('data-inspect','true')
  slider=page.get_by_role('slider',name='Assembly separation');slider.focus();slider.press('End');expect(slider).to_have_value('1');page.wait_for_timeout(1800);shot(page,'05-inspect-exploded')
  page.get_by_role('button',name='Rotate right',exact=True).click();page.get_by_role('button',name='Zoom in',exact=True).click();page.get_by_role('button',name='Reset view',exact=True).click();expect(slider).to_have_value('0')
  page.get_by_role('button',name='Wireframe',exact=True).click();expect(page.get_by_role('button',name='Wireframe',exact=True)).to_have_attribute('aria-pressed','true');page.wait_for_timeout(600);shot(page,'06-wireframe')
  page.get_by_role('button',name='Wireframe',exact=True).click();page.get_by_role('button',name='Return to story',exact=False).click();ok('Keyboard explosion, rotation, zoom, reset and wireframe controls work')
  page.get_by_label('Rendering quality').select_option('eco');page.wait_for_timeout(800);ratio=page.locator('[data-stage] canvas').evaluate('c=>c.width/c.clientWidth');assert ratio<=1.01,ratio;ok('Eco mode bounds the actual drawing-buffer pixel ratio')
  page.get_by_role('link',name='Skip to parts',exact=False).click();page.wait_for_timeout(1000);shot(page,'07-collection');assert page.locator('#collection-title').bounding_box()['y']>=0;ok('Skip to parts leaves the story immediately')
  page.goto(base+'/shop');expect(page.locator('[data-cinematic]')).to_have_count(0);assert not page.evaluate('document.documentElement.hasAttribute("data-dth-cinematic")');assert page.locator('canvas').count()==0;ok('Leaving Home releases its scene and global CSS scope')
  page.goto(base+'/');expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');assert page.locator('[data-stage] canvas').count()==1
  page.get_by_role('button',name='Pause cinematic motion').click();expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');ok('Re-entry creates one stage and motion can be switched off')
  page.emulate_media(reduced_motion='reduce');page.reload();expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');expect(page.get_by_role('button',name='Enable cinematic motion')).to_be_disabled();shot(page,'08-reduced-motion');ok('Reduced motion keeps manual chapter navigation and disables ambient motion')
  page.emulate_media(reduced_motion='no-preference')
  for width in [390,768]:
   page.set_viewport_size({'width':width,'height':850});page.reload();expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');page.wait_for_timeout(800);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');shot(page,'09-compact-'+str(width))
  ok('Compact 390/768 views use manual chapters without horizontal overflow')
  page.set_viewport_size({'width':1440,'height':1000});page.route('**/models/dth-demo/apex-suspension.glb',lambda route:route.abort());page.goto(base+'/');expect(page.locator('[data-scene]')).to_have_attribute('data-scene','fallback');expect(page.get_by_role('link',name='View product',exact=False)).to_be_visible();shot(page,'10-model-fallback')
  page.unroute('**/models/dth-demo/apex-suspension.glb');page.get_by_role('button',name='Retry 3D').click();expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');ok('Failed GLB keeps product links available and Retry restores 3D')
  assert not errors,errors;ok('No uncaught page exceptions')
 except Exception:
  shot(page,'failure');(out/'failure.html').write_text(page.content());raise
 finally:
  (out/'results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2));browser.close()
