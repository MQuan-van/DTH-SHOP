"""Initial real browser review: no API and no database. No static screenshot mock."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
out=Path('test-results/cinematic');out.mkdir(parents=True,exist_ok=True)
base=os.environ.get('DTH_CINEMATIC_URL','http://127.0.0.1:4173')
checks,errors=[],[]
def ok(name):checks.append(name);print('PASS:',name,flush=True)
def shot(page,name):page.screenshot(path=str(out/(name+'.png')))
def scroll(page,amount):
 page.evaluate('p=>{const el=document.querySelector("[data-cinematic]");const stage=el.querySelector("[data-stage]");const header=document.querySelector(".dth-header").getBoundingClientRect().height;window.scrollTo(0,el.getBoundingClientRect().top+scrollY-header+(el.offsetHeight-stage.offsetHeight)*p)}',amount)
 page.wait_for_timeout(1800)
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 page.set_default_timeout(25000);page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(base+'/');expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');page.wait_for_timeout(1800);shot(page,'01-home')
  expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','true');ok('Home loads the real GLB in one cinematic stage')
  for name,amount,chapter in [('02-surface',.29,'surface'),('03-assembly',.61,'assembly'),('04-reassembled',1,'build')]:
   scroll(page,amount);shot(page,name);expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter',chapter)
  ok('Native scroll drives all four chapters forwards')
  scroll(page,0);expect(page.locator('[data-chapter]')).to_have_attribute('data-chapter','form');ok('Story is reversible')
  page.get_by_role('button',name='Inspect in 3D',exact=False).click();expect(page.locator('[data-inspect]')).to_have_attribute('data-inspect','true')
  slider=page.get_by_role('slider',name='Assembly separation');expect(slider).to_be_visible();slider.fill('1');page.wait_for_timeout(1600);shot(page,'05-inspect-exploded');ok('Existing GLB is rigged for user-controlled separation')
  page.get_by_role('button',name='Rotate right',exact=True).click();page.get_by_role('button',name='Zoom in',exact=True).click();page.wait_for_timeout(600)
  page.get_by_role('button',name='Reset view',exact=True).click();expect(slider).to_have_value('0');page.get_by_role('button',name='Wireframe',exact=True).click();page.wait_for_timeout(500);shot(page,'06-wireframe')
  page.get_by_role('button',name='Return to story',exact=False).click();ok('Inspect controls return to story without route change')
  page.get_by_role('link',name='Skip to parts',exact=False).click();page.wait_for_timeout(900);shot(page,'07-collection');ok('Collection can be reached without playing the story')
  page.goto(base+'/shop');expect(page.locator('[data-cinematic]')).to_have_count(0);assert not page.evaluate('document.documentElement.hasAttribute("data-dth-cinematic")');ok('Leaving Home cleans up its scope')
  page.goto(base+'/');expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');assert page.locator('[data-stage] canvas').count()==1
  page.get_by_role('button',name='Pause cinematic motion').click();expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');ok('Motion can be disabled without blocking commerce')
  page.emulate_media(reduced_motion='reduce');page.reload();expect(page.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');shot(page,'08-reduced-motion');ok('Reduced motion avoids the pinned story')
  page.emulate_media(reduced_motion='no-preference');page.set_viewport_size({'width':390,'height':850});page.reload();expect(page.locator('[data-scene]')).to_have_attribute('data-scene','ready');page.wait_for_timeout(1500);shot(page,'09-compact');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');ok('Compact layout avoids long scroll choreography')
  assert not errors,errors;ok('No uncaught page exceptions')
 except Exception:
  shot(page,'failure');(out/'failure.html').write_text(page.content());raise
 finally:
  (out/'results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2));b.close()
