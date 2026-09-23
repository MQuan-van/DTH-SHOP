"""Actual compiled R3F scene + isolated MongoDB + authenticated admin publication.
VITE_EXPERIENCE_TESTS=true exposes rendered camera/pose observations in the test build only.
No mocked successful HTTP writes or screenshot-generated interface.
"""
import os,json,subprocess,uuid,re,math
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
expect.set_options(timeout=25000)
uri=os.environ.get('MONGO_URI','')
assert re.fullmatch(r'mongodb://127\.0\.0\.1:\d+/dth_experience_browser_test',uri),'Only the disposable experience database is allowed'
base=os.environ.get('DTH_BROWSER_URL','http://127.0.0.1:5000')
out=Path('test-results/experience');out.mkdir(parents=True,exist_ok=True)
checks,errors=[],[]
password='Experience browser testing 2026!'
admin_email='experience-agent-'+uuid.uuid4().hex[:6]+'@example.test'
customer_email='experience-shopper-'+uuid.uuid4().hex[:6]+'@example.test'
setup="""import {mongoUri} from './backend/commerce/config.mjs';import mongoose from 'mongoose';import {User} from './backend/commerce/models.mjs';import {hashPassword} from './backend/commerce/security.mjs';await mongoose.connect(mongoUri);for(const [email,role] of [[process.env.ADMIN_EMAIL,'admin'],[process.env.CUSTOMER_EMAIL,'customer']])await User.create({email,role,passwordHash:await hashPassword(process.env.TEST_PASSWORD),disabled:false});await mongoose.disconnect();"""
subprocess.run(['node','--input-type=module','-e',setup],check=True,env={**os.environ,'ADMIN_EMAIL':admin_email,'CUSTOMER_EMAIL':customer_email,'TEST_PASSWORD':password})
def ok(s):checks.append(s);print('PASS:',s,flush=True)
def shot(page,name):page.wait_for_timeout(400);page.screenshot(path=str(out/(name+'.png')),full_page=False)
def camera(canvas):return json.loads(canvas.get_attribute('data-camera'))
def distance(a,b):return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))
def public(page):return page.request.get(base+'/api/shop/experience/home').json()
def settle(canvas):
 canvas.evaluate('node=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
 expect(canvas).to_have_attribute('data-moving','false')
def login(page,email):
 page.goto(base+'/account');expect(page.get_by_role('heading',name='Welcome back.')).to_be_visible();page.get_by_label('Email',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(password);page.get_by_role('button',name='Sign in',exact=True).click();expect(page.get_by_role('heading',name='Your account.')).to_be_visible()
def select_chapter(page,n):
 index={0:0,.29:1,.61:2,1:3}[n]
 button=page.get_by_role('navigation',name='Product story chapters').get_by_role('button').nth(index)
 button.scroll_into_view_if_needed();before=page.evaluate('scrollY');button.click()
 page.wait_for_function('(p)=>Math.abs(Number(document.querySelector("[data-navigation]").dataset.progress)-p)<.0001',arg=n)
 assert abs(page.evaluate('scrollY')-before)<2
 page.wait_for_timeout(800)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 ac=browser.new_context(viewport={'width':1600,'height':1000});cc=browser.new_context(viewport={'width':1440,'height':1000})
 admin=ac.new_page();customer=cc.new_page()
 for page in [admin,customer]:
  page.set_default_timeout(25000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda dialog:dialog.accept())
 try:
  customer.goto(base+'/');expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','ready');canvas=customer.locator('[data-stage] canvas');customer.wait_for_timeout(1800)
  assert public(customer)['data'] is None;shot(customer,'01-home-form');initial=camera(canvas)
  for amount,name in [(.29,'02-home-surface'),(.61,'03-home-assembly'),(1,'04-home-return')]:select_chapter(customer,amount);shot(customer,name)
  assert distance(initial,camera(canvas))>.01;ok('Chapter selection drives the rendered camera while page scroll stays independent')
  select_chapter(customer,.29)
  enter=customer.get_by_role('button',name='Inspect in 3D',exact=False)
  # Record the frame at the actual click; autoplay and the timeline may keep
  # rendering while Playwright waits for the button to become actionable.
  enter.evaluate('button=>button.addEventListener("click",()=>{const c=document.querySelector("[data-stage] canvas");c.dataset.entryCamera=c.dataset.camera;},{once:true,capture:true})')
  enter.click();before=json.loads(canvas.get_attribute('data-entry-camera'));customer.wait_for_timeout(250);after=camera(canvas)
  assert distance(before,after)<.08,(before,after);assert canvas.get_attribute('data-owner')=='inspect';ok('Entering Inspect preserves camera position without teleporting')
  slider=customer.get_by_role('slider',name='Assembly separation');slider.fill('0.7');customer.wait_for_timeout(800);assert distance(after,camera(canvas))<.08
  customer.get_by_role('button',name='Spring',exact=True).click();expect(customer.locator('.dth-part-hotspot')).to_contain_text('Spring');shot(customer,'05-inspection-focus')
  customer.get_by_role('slider',name='Light direction').fill('60');customer.wait_for_timeout(400);shot(customer,'06-surface-light');ok('Manual separation, anchored part focus and relighting do not steal camera control')
  customer.get_by_role('button',name='Side',exact=True).click();settle(canvas);assert distance(after,camera(canvas))>.2
  customer.get_by_role('button',name='Reset view',exact=True).click();expect(slider).to_have_value('0');settle(canvas);assert distance(camera(canvas),[0,.3,10.8])<.03;ok('Named view and complete Reset operate on the real scene')
  for i in range(5):
   customer.get_by_role('button',name='Return to story',exact=False).click();customer.get_by_role('button',name='Inspect in 3D',exact=False).click()
  customer.get_by_role('button',name='Return to story',exact=False).click();customer.wait_for_timeout(1500);expect(canvas).to_have_attribute('data-owner','story');assert all(math.isfinite(n) for n in camera(canvas));ok('Rapid interruption returns camera ownership to the story safely')
  customer.get_by_role('button',name='Open support',exact=True).click();expect(canvas).to_have_attribute('data-blocked','true');customer.get_by_role('button',name='Close support',exact=True).click();expect(canvas).to_have_attribute('data-blocked','false');ok('Support overlay blocks background 3D input and restores it after closing')
  for _ in range(3):
   customer.locator('.dth-header .dth-navigation a[href="/shop"]').click();expect(customer.locator('[data-stage] canvas')).to_have_count(0)
   customer.locator('.dth-header .dth-navigation a[href="/"]').click();expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','ready');assert customer.locator('[data-stage] canvas').count()==1;assert int(customer.locator('[data-stage] canvas').get_attribute('data-listeners'))<=4
  ok('SPA route re-entry does not duplicate the WebGL stage or director listeners')
  login(customer,customer_email);customer.goto(base+'/admin/experience');expect(customer.get_by_role('heading',name='Administrator access required.')).to_be_visible();assert customer.request.get(base+'/api/shop/admin/experience/home').status==403;ok('Customer cannot open or fetch the experience editor')
  login(admin,admin_email);admin.goto(base+'/admin/experience');expect(admin.get_by_role('heading',name='Experience',exact=True)).to_be_visible();expect(admin.locator('[data-preview-scene]')).to_have_attribute('data-preview-scene','ready');shot(admin,'07-admin-experience')
  assert admin.evaluate('document.documentElement.scrollWidth<=innerWidth+1');ok('Admin Studio loads the shared real 3D renderer')
  admin.get_by_role('button',name='Inspect / drag',exact=True).click()
  admin.get_by_role('group',name='Preview named views',exact=True).get_by_role('button',name='Side',exact=True).click()
  settle(admin.locator('.dth-exp-viewport canvas'))
  admin.get_by_role('button',name='Wireframe',exact=True).click();admin.get_by_role('button',name='Reset view',exact=True).click()
  expect(admin.get_by_role('button',name='Wireframe',exact=True)).to_have_attribute('aria-pressed','false')
  settle(admin.locator('.dth-exp-viewport canvas'))
  admin.get_by_role('button',name='Return to timeline',exact=True).click();ok('Admin shares named viewpoints and full wireframe reset with the storefront renderer')
  admin.get_by_role('button',name='Camera',exact=True).click();admin.get_by_role('button',name='Inspect / drag',exact=True).click();admin.wait_for_timeout(500)
  c=admin.locator('.dth-exp-viewport canvas');rect=c.bounding_box();old=camera(c);admin.mouse.move(rect['x']+rect['width']*.55,rect['y']+rect['height']*.55);admin.mouse.down();admin.mouse.move(rect['x']+rect['width']*.55+35,rect['y']+rect['height']*.55+10,steps=10);admin.mouse.up();admin.wait_for_timeout(600)
  assert distance(old,camera(c))>.1;admin.get_by_role('button',name='Capture this angle',exact=True).click();expect(admin.get_by_role('button',name='Save draft',exact=True)).to_be_enabled();shot(admin,'08-admin-camera-capture')
  admin.get_by_role('button',name='Save draft',exact=True).click();expect(admin.get_by_text('Draft saved. The live Home has not changed.',exact=True)).to_be_visible();assert public(customer)['data'] is None;ok('Camera capture saves only a private draft, leaving public Home unchanged')
  admin.get_by_role('button',name='Publish Home',exact=False).click();expect(admin.get_by_role('dialog')).to_be_visible();admin.get_by_role('button',name='Confirm publish',exact=True).click();expect(admin.get_by_text('Home published. Open the storefront to review this version.',exact=True)).to_be_visible();first=public(customer)['data']['version'];assert first>0
  customer.goto(base+'/');expect(customer.locator('[data-experience-version]')).to_have_attribute('data-experience-version',str(first));expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','ready');ok('Published configuration and version-bound GLB reach the storefront')
  admin.get_by_role('button',name='Copy',exact=True).click();admin.get_by_label('Headline line 1',exact=True).fill('Precision.');admin.get_by_label('Headline line 2',exact=True).fill('In your hands.');admin.get_by_role('button',name='Save draft',exact=True).click();expect(admin.get_by_text('Draft saved. The live Home has not changed.',exact=True)).to_be_visible();assert public(customer)['data']['version']==first
  admin.get_by_role('button',name='Publish Home',exact=False).click();admin.get_by_role('button',name='Confirm publish',exact=True).click();expect(admin.get_by_text('Home published. Open the storefront to review this version.',exact=True)).to_be_visible();assert public(customer)['data']['config']['chapters'][0]['title'][0]=='Precision.';ok('Copy edits require explicit publication before going live')
  admin.get_by_role('button',name='History',exact=True).click();admin.locator('.dth-exp-history li').filter(has_text=f'Version {first}').get_by_role('button',name='Restore',exact=True).click();admin.get_by_role('button',name='Confirm restore',exact=True).click();expect(admin.get_by_text('Previous scene restored as a new publication.',exact=True)).to_be_visible();assert public(customer)['data']['config']['chapters'][0]['title'][0]!='Precision.';shot(admin,'09-admin-version-history');ok('Restore creates a new publication and recovers the prior configuration')
  admin.get_by_role('button',name='Camera',exact=True).click();admin.get_by_label('Camera X',exact=True).fill('0');admin.get_by_label('Camera Y',exact=True).fill('0');admin.get_by_label('Camera Z',exact=True).fill('0');expect(admin.get_by_role('alert')).to_be_visible();expect(admin.get_by_role('button',name='Save draft',exact=True)).to_be_disabled();expect(admin.locator('[data-preview-scene]')).to_have_attribute('data-preview-scene','ready');admin.get_by_role('button',name='Discard changes',exact=True).click();ok('Invalid camera data is blocked while the last valid preview remains available')
  admin.get_by_role('button',name='Copy',exact=True).click();admin.get_by_label('Headline line 1',exact=True).fill('Recover this draft');admin.wait_for_timeout(700);admin.reload();expect(admin.get_by_role('button',name='Recover draft',exact=True)).to_be_visible();admin.get_by_role('button',name='Recover draft',exact=True).click();admin.get_by_role('button',name='Copy',exact=True).click();expect(admin.get_by_label('Headline line 1',exact=True)).to_have_value('Recover this draft');admin.get_by_role('button',name='Discard changes',exact=True).click();ok('Unsaved valid draft can be recovered after reload in the same tab')
  admin.get_by_role('button',name='Scene',exact=True).click();admin.get_by_label('Hero product',exact=True).select_option('apex-wheels');expect(admin.locator('[data-preview-scene]')).to_have_attribute('data-preview-scene','ready');expect(admin.get_by_text('Unrigged asset: safe whole-model viewing; no Apex assembly is applied.',exact=False)).to_be_visible();shot(admin,'10-admin-unrigged-wheel');admin.get_by_role('button',name='Discard changes',exact=True).click();ok('Replacing Apex with a wheel disables unsupported assembly without crashing')
  customer.goto(base+'/');expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','ready');customer.emulate_media(reduced_motion='reduce');customer.reload();expect(customer.locator('[data-cinematic]')).to_have_attribute('data-cinematic','false');shot(customer,'11-reduced-motion');ok('Reduced motion remains a usable non-pinned Home')
  customer.emulate_media(reduced_motion='no-preference');customer.set_viewport_size({'width':390,'height':850});customer.reload();expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','ready');assert customer.evaluate('document.documentElement.scrollWidth<=innerWidth+1');shot(customer,'12-compact-home');ok('Compact Home remains navigable without a forced desktop scroll story')
  customer.set_viewport_size({'width':1440,'height':1000});customer.route('**/models/**/*.glb*',lambda route:route.abort());customer.goto(base+'/');expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','fallback');expect(customer.get_by_role('link',name='View product',exact=False)).to_be_visible();shot(customer,'13-image-fallback');customer.unroute('**/models/**/*.glb*');customer.get_by_role('button',name='Retry 3D',exact=True).click();expect(customer.locator('[data-scene]')).to_have_attribute('data-scene','ready');ok('Failed versioned GLB preserves commerce links and Retry restores 3D')
  assert not errors,errors;ok('No uncaught page exceptions in the complete experience workflow')
 except Exception:
  for name,page in [('admin',admin),('customer',customer)]:
   shot(page,'failure-'+name);(out/('failure-'+name+'.html')).write_text(page.content())
  raise
 finally:
  (out/'results.json').write_text(json.dumps({'checks':checks,'pageErrors':errors},indent=2));browser.close()
