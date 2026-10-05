"""Compiled Flow / BrowserRouter regression. Run against a local built Flow server, not production.
python tests/browser/full_cart.py --url http://127.0.0.1:4173
This test uses only demo account and catalog, no live API/database/payments.
"""
import argparse, json, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
parser=argparse.ArgumentParser();parser.add_argument('--url',default='http://127.0.0.1:4173');parser.add_argument('--out',default='test-results/full-cart');parser.add_argument('--browser')
a=parser.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];api=[]
def ok(name):checks.append(name)
with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    if a.browser:opts['executable_path']=a.browser
    browser=pw.chromium.launch(**opts);context=browser.new_context(viewport={'width':1440,'height':1000})
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1')")
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:api.append(r.url) if '/api/shop/' in r.url else None)
    bag=lambda:page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1')||'[]')")
    def seed(items):
        page.evaluate('(items)=>localStorage.setItem("dth.flow.bag.v1",JSON.stringify(items))',items);page.goto(a.url+'/bag');expect(page.locator('[data-full-cart]')).to_be_visible()
    row={'productId':'apex-suspension','vehicleId':'street155-2022','quantity':2}
    try:
        page.goto(a.url+'/bag');expect(page.locator('[data-full-cart]')).to_be_visible();ok('Full cart route mounted')
        seed([row]);cart=page.locator('[data-full-cart]');expect(cart.get_by_role('button',name='Review order',exact=True)).to_be_enabled();ok('valid catalog total and review action')
        cart.get_by_role('button',name='Increase quantity of Apex Coilover',exact=True).click();assert bag()[0]['quantity']==3
        cart.get_by_label('Quantity for Apex Coilover',exact=True).select_option('2');assert bag()[0]['quantity']==2;ok('quantity updates use same persistent bag as drawer')
        page.locator('.dth-vehicle-button').click();picker=page.get_by_role('dialog',name='Find your fit.')
        picker.get_by_role('combobox',name=re.compile(r'^Make')).select_option(label='Demo Moto');picker.get_by_role('combobox',name=re.compile(r'^Model')).select_option(label='Road 300');picker.get_by_role('combobox',name=re.compile(r'^Year')).select_option(label='2024')
        picker.get_by_role('button',name='Show matching parts',exact=True).click();expect(picker).not_to_be_visible();assert bag()[0]['vehicleId']=='street155-2022';ok('header vehicle never retargets existing bag')
        cart.get_by_label('Vehicle for Apex Coilover',exact=True).select_option('street155-2023');assert bag()[0]['vehicleId']=='street155-2023';ok('line vehicle changes explicitly')
        page.wait_for_timeout(400);page.screenshot(path=str(out/'cart-desktop.png'),full_page=True)
        for width,height in [(320,720),(390,844),(768,1024),(1024,768),(1440,1000),(1920,1080),(2560,1440)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');ok(f'no horizontal overflow {width}x{height}')
            if width==390:page.screenshot(path=str(out/'cart-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1000});page.emulate_media(reduced_motion='reduce');expect(cart.get_by_role('button',name='Reduced motion · system',exact=True)).to_be_disabled()
        page.wait_for_timeout(150);assert cart.evaluate("e=>e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length===0");ok('reduced motion cancels presentation')
        for product,vehicle,status in [('missing-part','street155-2022','unavailable'),('apex-suspension','road300-2024','incompatible'),('apex-suspension','retired-vehicle','unknown')]:
            seed([{'productId':product,'vehicleId':vehicle,'quantity':1}]);expect(page.locator('[data-bag-line]')).to_have_attribute('data-state',status)
            expect(cart.get_by_role('button',name='Review order',exact=True)).to_be_enabled()
            cart.get_by_role('button',name='Review order',exact=True).click()
            expect(cart.locator('[data-quote-source="flow"]')).to_be_visible()
            expect(page.locator('[data-bag-line]')).to_have_attribute('data-state',status)
            expect(cart.get_by_role('button',name='Place simulated order',exact=True)).to_have_count(0)
            expect(cart.get_by_role('button',name='Check again',exact=True)).to_be_enabled();assert len(bag())==1;ok(status+' is freshly checked, remains visible and blocks confirmation')
        cart.get_by_role('button',name='Remove Apex Coilover',exact=True).click();expect(cart.get_by_role('heading',name='Your bag is empty.',exact=True)).to_be_visible();assert bag()==[];ok('remove last item shows empty state')
        seed([row]);cart.get_by_role('button',name='Review order',exact=True).click();cart.get_by_role('link',name='Sign in to continue',exact=True).click()
        page.get_by_label('Email',exact=True).fill('demo@dth.test');page.get_by_label('Password',exact=True).fill('DthFlow2026!');page.get_by_role('button',name='Sign in',exact=True).click()
        page.wait_for_url(a.url+'/bag');expect(cart).to_be_visible();ok('login returns to bag and keeps guest selection')
        cart.get_by_role('button',name='Review order',exact=True).click();expect(cart.get_by_role('button',name='Place simulated order',exact=True)).to_be_disabled()
        cart.get_by_role('checkbox').check();cart.get_by_role('button',name='Edit bag',exact=True).click();cart.get_by_role('button',name='Review order',exact=True).click();expect(cart.get_by_role('checkbox')).not_to_be_checked();ok('edit clears acknowledgement')
        cart.get_by_role('checkbox').check();cart.get_by_role('button',name='Place simulated order',exact=True).click()
        page.wait_for_url(re.compile(re.escape(a.url)+r'/order-complete\?order=FLOW-'));expect(page.get_by_role('heading',name='Your demo order is confirmed.',exact=True)).to_be_visible();assert bag()==[];ok('existing Flow order and confirmation complete')
        page.reload();expect(page.get_by_role('heading',name='Your demo order is confirmed.',exact=True)).to_be_visible();ok('existing confirmation survives refresh')
        assert not errors,errors;assert not api,api;ok('no uncaught exceptions or API calls in Flow')
    except Exception:
        page.screenshot(path=str(out/'failure.png'),full_page=True);raise
    finally:
        (out/'results.json').write_text(json.dumps({'checks':checks,'browserErrors':errors,'apiRequests':api},indent=2));browser.close()
