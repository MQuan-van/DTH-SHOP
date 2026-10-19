"""Real application smoke check, run separately against a working local DTH server.
Requires Playwright Python + Chromium. Does not create orders or modify an account.
The isolated packaging checks are different; this script is NOT claimed as executed there.
"""
import argparse, json, re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect
parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5173')
parser.add_argument('--output',default='test-results/discovery174')
parser.add_argument('--require-webgl',action='store_true')
args=parser.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
base=args.url.rstrip('/');checks=[];errors=[]
def check(name,condition=True):
 if not condition: raise AssertionError(name)
 checks.append(name)
with sync_playwright() as p:
 browser=p.chromium.launch()
 context=browser.new_context(viewport={'width':1440,'height':1000})
 # A separate context avoids the user's normal account/cart/browser session.
 context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1')")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base+'/shop?mode=explore',wait_until='domcontentloaded')
 expect(page.locator('[data-discovery-shell]')).to_have_attribute('data-mode','explore',timeout=20000)
 check('explore renders in the actual application')
 page.get_by_role('group',name='Photographic mood').get_by_role('button',name=re.compile('After hours')).click()
 expect(page.get_by_role('heading',name='Own the night.')).to_be_visible();check('mood selector')
 page.get_by_role('group',name='Photographic mood').get_by_role('button',name=re.compile('Daylight')).click()
 page.locator('.d174-studio').scroll_into_view_if_needed();page.wait_for_timeout(1500)
 if page.get_by_role('button',name=re.compile('View in 3D')).count():page.get_by_role('button',name=re.compile('View in 3D')).click()
 if args.require_webgl:
  expect(page.locator('[data-product-media]')).to_have_attribute('data-media-state','ready',timeout=25000)
  check('real GLB ready',page.locator('.d174-stage canvas').count()==1)
 check('never more than one discovery canvas',page.locator('.d174-stage canvas').count()<=1)
 page.locator('.d174-mode-nav').get_by_role('link',name=re.compile('^Build')).click()
 expect(page.locator('[data-discovery-shell]')).to_have_attribute('data-mode','build')
 page.get_by_role('group',name='Build vehicle').get_by_role('button',name=re.compile('NVX V1')).click()
 expect(page.locator('.d174-build-context h2')).to_have_text('Yamaha NVX V1');check('NVX selection')
 # Pinning is page-local and does not create cart/order/account writes.
 pin=page.get_by_role('button',name='Keep in this build +',exact=True)
 if pin.count():
  pin.click();expect(page.get_by_role('region',name='Current build shortlist')).to_be_visible();check('build shortlist')
 page.get_by_role('group',name='Build vehicle').get_by_role('button',name=re.compile('NVX V3')).click()
 expect(page.get_by_role('region',name='Current build shortlist')).to_have_count(0)
 expect(page.get_by_text('Version photo not supplied yet')).to_be_visible();check('V3 placeholder + draft isolation')
 page.locator('.d174-mode-nav').get_by_role('link',name=re.compile('^Shop')).click()
 expect(page.locator('[data-shop-ux="17"]')).to_be_visible();check('original catalog reused')
 for layout in ['Wide','Compact','Grid']:
  page.get_by_role('group',name='Catalog layout').get_by_role('button',name=layout,exact=True).click()
  expect(page.locator('[data-discovery-shell]')).to_have_attribute('data-layout',layout.lower());check('layout '+layout)
 for mode in ['explore','build','shop']:
  page.goto(base+'/shop?mode='+mode,wait_until='domcontentloaded')
  expect(page.locator('[data-discovery-shell]')).to_have_attribute('data-mode',mode)
  for width in [1440,1024,768,390,360]:
   page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(100)
   check(f'no horizontal overflow {mode}/{width}',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 page.goto(base+'/shop?mode=explore',wait_until='domcontentloaded');page.emulate_media(reduced_motion='reduce')
 expect(page.get_by_role('button',name='Reduced motion')).to_be_disabled();check('reduced motion')
 check('no runtime page errors',not errors)
 browser.close()
(out/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'webgl_required':args.require_webgl},indent=2))
print(f'{len(checks)} application checks passed.')
