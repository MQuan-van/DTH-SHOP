"""Compiled app regression. DTH_STATIC_DIR is for offline file interception only.
CI defaults to actual HTTP at DTH_APP_URL; DTH_REQUIRE_WEBGL=1 requires real model rendering.
No API, real user, payment or production database is written by this Flow test.
"""
import json, mimetypes, os, time, re
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright, expect
from cart_helpers import close_added_cart
from flow_auth import login_flow
BASE = os.environ.get('DTH_APP_URL', 'http://127.0.0.1:4173')
OUT = Path(os.environ.get('DTH_EVIDENCE', 'test-results/product-decision')); OUT.mkdir(parents=True, exist_ok=True)
STATIC = os.environ.get('DTH_STATIC_DIR')
checks, errors = [], []
def ok(name): checks.append(name)
def results(webgl=False):
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'count':len(checks),'pageErrors':errors,'webglRendered':webgl,
      'transport':'intercepted compiled files; no live HTTP' if STATIC else 'HTTP compiled Flow',
      'notTested':['real API/MongoDB','real payment','Windows GPU','screen reader']},indent=2),encoding='utf8')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('DTH_CHROMIUM') or None,
      args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
    context = browser.new_context(viewport={'width':1440,'height':1100})
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1');")
    if STATIC:
        folder=Path(STATIC).resolve()
        def serve(route):
            u=urlparse(route.request.url)
            if u.netloc != urlparse(BASE).netloc: route.abort(); return
            path=unquote(u.path).lstrip('/')
            f=(folder/path).resolve()
            if not f.is_relative_to(folder): route.abort(); return
            if not f.is_file():
                if Path(path).suffix: route.fulfill(status=404,body='not found'); return
                f=folder/'index.html'
            route.fulfill(status=200,body=f.read_bytes(),content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
        context.route('**/*',serve)
    page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    webgl=False
    try:
        login_flow(page, BASE, '/products/apex-suspension')
        page.goto(BASE+'/products/apex-suspension')
        expect(page.locator('[data-product-detail]')).to_be_visible()
        expect(page.get_by_role('heading',name='Apex Coilover',exact=True)).to_be_visible(); ok('product route mounts new detail page')
        # expect(page.locator('#dth-product-specs > summary')).to_have_text('Specifications'); ok('specifications retained')
        expect(page.locator('#dth-product-specs > summary > span').first).to_have_text('Specifications')
        ok('specifications retained')
        expect(page.get_by_role('button',name='Choose matching vehicle',exact=True)).to_be_visible(); ok('unselected cannot add')
        page.get_by_role('button',name='Choose matching vehicle',exact=True).click()
        dialog=page.locator('dialog[open]')
        expect(dialog).to_have_attribute('aria-labelledby',re.compile('.+'))
        dialog.get_by_role('radio',name='NVX V1',exact=True).check()
        dialog.get_by_role('button',name='Use NVX V1',exact=True).click()
        expect(page.locator('[data-product-detail] [data-fitment-status]')).to_have_attribute('data-fitment-status','compatible');ok('vehicle picker uses existing store / correct mapping')
        page.get_by_label('Quantity',exact=True).select_option('2')
        page.get_by_role('button',name='Add to bag',exact=True).click(); close_added_cart(page)
        expect(page.get_by_text('2 × Apex Coilover',exact=True)).to_be_visible()
        expect(page.get_by_role('link',name='Shopping bag, 2 items')).to_be_visible();ok('two items added only after store accepted')
        bag=page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1'))")
        assert bag[0]['vehicleId']=='yamaha-nvx-v1' and bag[0]['quantity']==2;ok('bag records selected vehicle per line')
        media=page.locator('[data-product-media]')
        for _ in range(25):
            if media.get_attribute('data-media-state') in ['ready','fallback']: break
            page.wait_for_timeout(800)
        webgl=media.get_attribute('data-media-state')=='ready'
        if webgl:
            page.locator('#dth-product-tools > summary').click()
            page.get_by_role('button',name='Side',exact=True).click();page.wait_for_timeout(600)
            page.get_by_role('button',name='Rear',exact=True).click();page.get_by_role('button',name='Reset view',exact=True).click()
            ok('WebGL real frame rendered and camera controls called')
        elif os.environ.get('DTH_REQUIRE_WEBGL')=='1': raise AssertionError('WebGL required but actual model did not render')
        else:
            expect(page.get_by_text('3D unavailable. Image preview.',exact=True)).to_be_visible();ok('no-WebGL fallback keeps commerce available')
        # page.get_by_role('button',name='Change vehicle',exact=True).click()
        page.locator(
            '[data-product-detail] [data-fitment-status]'
        ).get_by_role(
            'button',
            name='Change vehicle',
            exact=True
        ).click()
        dialog=page.get_by_role('dialog',name='Choose your Yamaha NVX');dialog.get_by_role('radio',name='NVX V2',exact=True).check();dialog.get_by_role('button',name='Use NVX V2',exact=True).click()
        expect(page.locator('[data-product-detail] [data-fitment-status]')).to_have_attribute('data-fitment-status','incompatible')
        assert page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1'))")==bag;ok('global vehicle change never reassigns bag lines')
        expect(page.get_by_role('button',name='Choose matching vehicle',exact=True)).to_be_visible();ok('mismatch routes to choose vehicle instead of adding')
        page.screenshot(path=str(OUT/'mismatch-desktop.png'),full_page=True)
        # The fitment alternative uses same-origin Shop route.
        page.get_by_role('button',name='Show matching parts',exact=True).click()
        page.wait_for_url('**/shop?fit=match');ok('compatible alternatives navigate back to Shop')
        page.goto(BASE+'/products/apex-suspension')
        expect(page.locator('[data-product-detail]')).to_be_visible()
        page.get_by_role('button',name='Ⅱ Motion on',exact=True).click()
        expect(page.locator('[data-product-detail]')).to_have_attribute('data-motion','off');ok('page Motion off works')
        # Device policy is honored even during the mounted route.
        page.emulate_media(reduced_motion='reduce')
        expect(page.get_by_role('button',name='Reduced motion',exact=True)).to_be_disabled();ok('system reduced motion honored')
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate("localStorage.setItem('dth.flow.vehicle.v1',JSON.stringify('yamaha-nvx-v1'))")
        page.reload();expect(page.locator('[data-product-detail] [data-fitment-status]')).to_have_attribute('data-fitment-status','compatible')
        page.wait_for_timeout(700)
        for w,h in [(320,740),(390,844),(768,1024),(1024,900),(1280,900),(1440,1100),(1920,1080),(2560,1440)]:
            page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(130)
            dims=page.evaluate("({w:innerWidth,scroll:document.documentElement.scrollWidth})")
            assert dims['scroll']<=dims['w']+1,(w,dims)
            info=page.locator('[data-product-detail] h1').bounding_box()
            assert info and info['width']>0 and info['x']>=0
            ok(f'no horizontal overflow at {w}x{h}')
            if w in [390,1440]: page.screenshot(path=str(OUT/f'detail-{w}.png'),full_page=True)
        # Per-line maximum remains enforced after reload, not interpreted as stock.
        page.evaluate("localStorage.setItem('dth.flow.bag.v1',JSON.stringify([{productId:'apex-suspension',vehicleId:'yamaha-nvx-v1',quantity:10}]))")
        page.reload();expect(page.get_by_role('button',name='Demo limit reached',exact=True)).to_be_disabled();ok('ten-item demo limit enforced')
        page.goto(BASE+'/products/does-not-exist');expect(page.get_by_role('heading',name='This part of the studio is empty.')).to_be_visible();ok('unknown product still returns existing not-found view')
        page.goto(BASE+'/products/apex-suspension');expect(page.locator('[data-product-detail]')).to_be_visible();ok('unmount/remount does not lose route')
        assert not errors, errors
        ok('no uncaught browser errors')
    finally:
        results(webgl); browser.close()
print(json.dumps({'passed':len(checks),'webglRendered':webgl,'evidence':str(OUT)}))
