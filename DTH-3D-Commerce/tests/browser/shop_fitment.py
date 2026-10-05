"""Fitment UI regression: compiled Flow in CI; optional offline component harness.
No live API/database credentials. python tests/browser/shop_fitment.py --url http://127.0.0.1:4173
"""
import argparse, json, re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--out', default='test-results/shop-fitment')
parser.add_argument('--browser')
parser.add_argument('--harness')
args = parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name, value=True):
    if not value: raise AssertionError(name)
    checks.append(name)

def run():
    with sync_playwright() as p:
        opts=dict(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
        if args.browser:opts['executable_path']=args.browser
        browser=p.chromium.launch(**opts)
        context=browser.new_context(viewport={'width':1440,'height':1080},device_scale_factor=1)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        def start(path='/shop'):
            if args.harness:
                if not page.locator('#root').count():
                    page.set_content(Path(args.harness).read_text(),wait_until='load')
                    page.wait_for_function('!!window.__fitmentHarness')
                page.evaluate('(path)=>window.__fitmentHarness.navigate(path)',path)
                page.wait_for_function('(path)=>window.__fitmentHarness.location.pathname+window.__fitmentHarness.location.search===path',arg=path)
            else:page.goto(args.url.rstrip('/')+path,wait_until='domcontentloaded')
            if path.startswith('/shop'): expect(page.locator('[data-fitment-vehicle]')).to_be_visible()
            page.wait_for_timeout(80)
        def current():
            return page.evaluate('window.__fitmentHarness.location.pathname+window.__fitmentHarness.location.search') if args.harness else urlsplit(page.url).path+'?'+urlsplit(page.url).query
        def choose(model='Street 155',year='2022'):
            strip=page.locator('[data-fitment-vehicle]')
            strip.get_by_role('button',name=re.compile('^(Select|Change) vehicle')).click()
            dialog=page.get_by_role('dialog',name='Find your fit.')
            expect(dialog).to_be_visible()
            dialog.get_by_label(re.compile('^Make')).select_option(label='Demo Moto')
            dialog.get_by_label(re.compile('^Model')).select_option(label=model)
            dialog.get_by_label(re.compile('^Year')).select_option(label=year)
            dialog.get_by_role('button',name='Show matching parts').click()
            expect(dialog).to_have_count(0)
        def bag():
            if args.harness:return page.evaluate('JSON.stringify(window.__fitmentHarness.bag)')
            return page.evaluate("localStorage.getItem('dth.flow.bag.v1')")
        start();strip=page.locator('[data-fitment-vehicle]')
        expect(strip).to_have_attribute('data-fitment-vehicle','unselected');check('starts unselected without fabricated compatibility')
        expect(page.get_by_role('combobox',name='Search parts by name or finish')).to_be_visible();check('Search Discovery preserved')
        choose();expect(strip).to_have_attribute('data-fitment-vehicle','selected');expect(strip).to_contain_text('Demo Moto Street 155 · 2022');check('existing vehicle picker connected')
        expect(strip.get_by_role('button',name='Matches my vehicle')).to_have_attribute('aria-pressed','true')
        expect(strip.get_by_role('button',name='Matches my vehicle')).to_contain_text('5');check('matching count from current demo catalog')
        expect(page.locator('[data-shop-id]')).to_have_count(5);check('fit selection filters products')
        expect(page.locator('[data-shop-id] [data-fitment-status="compatible"]')).to_have_count(5);check('card badges match selected vehicle')
        page.screenshot(path=str(out/'fitment-desktop.png'));check('desktop screenshot saved')
        strip.get_by_role('button',name='All parts').click()
        expect(strip.get_by_role('button',name='All parts')).to_have_attribute('aria-pressed','true')
        check('fit-all encoded in URL',parse_qs(urlsplit(current()).query).get('fit')==['all'])
        check('nonmatching products visible with explicit label',page.locator('[data-shop-id] [data-fitment-status="incompatible"]').count()>0)
        start('/shop?category=wheels&sort=price-high&fit=all&max=9000000&testKey=keep')
        expect(strip.get_by_role('button',name='Matches my vehicle')).to_contain_text('1')
        expect(strip.get_by_role('button',name='All parts')).to_contain_text('4');check('counts respect category and price')
        page.get_by_role('button',name='Quick view Vector Alloy wheel',exact=True).click()
        dialog=page.locator('dialog[open]');expect(dialog).to_be_visible()
        expect(dialog.locator('[data-fitment-status]')).to_have_attribute('data-fitment-status','incompatible')
        expect(dialog).to_contain_text('This is not a real-world fitment verdict.');check('QuickView distinguishes demo no-match from real verdict')
        expect(dialog.get_by_role('button',name='Select matching vehicle')).to_be_visible();check('nonmatching product cannot be added directly')
        page.wait_for_timeout(750);page.screenshot(path=str(out/'quickview-fitment.png'))
        before=bag();dialog.get_by_role('button',name='Show matching parts',exact=True).click()
        expect(page.locator('dialog[open]')).to_have_count(0);check('alternatives closes the existing animated dialog')
        params=parse_qs(urlsplit(current()).query)
        check('alternatives preserves filters and unrelated keys',all(params.get(k)==[v] for k,v in {'category':'wheels','sort':'price-high','max':'9000000','testKey':'keep','fit':'match'}.items()))
        expect(page.locator('[data-shop-id]')).to_have_count(1)
        check('results focus restored after modal closes',page.evaluate("document.activeElement?.tagName==='H2'"))
        check('alternatives does not mutate bag',bag()==before)
        page.get_by_role('button',name='Quick view Apex Alloy wheel',exact=True).click();dialog=page.locator('dialog[open]')
        expect(dialog.locator('[data-fitment-status]')).to_have_attribute('data-fitment-status','compatible')
        expect(dialog.get_by_role('button',name='Show matching parts',exact=True)).to_have_count(0);check('matching product does not show redundant alternatives')
        dialog.get_by_role('button',name='Add to bag',exact=True).click()
        cart=page.locator('dialog[data-cart-dialog][open]');expect(cart).to_be_visible()
        expect(page.locator('dialog[open]')).to_have_count(1)
        expect(cart).to_contain_text('Apex Alloy wheel');check('successful QuickView add opens one bag drawer')
        before=bag();cart.get_by_role('button',name='Close bag',exact=True).click();expect(page.locator('dialog[open]')).to_have_count(0)
        choose('Road 300','2023');expect(strip).to_contain_text('Road 300');check('vehicle change updates strip')
        check('changing vehicle does not rewrite existing bag lines',bag()==before)
        expect(page.locator('[data-shop-id="vector-wheels"]')).to_have_count(1);check('new match appears without stale badge')
        start('/shop?q=does-not-exist&fit=match')
        expect(strip.get_by_role('button',name='Matches my vehicle')).to_contain_text('0')
        expect(page.get_by_text('No matching parts.',exact=True)).to_be_visible();check('zero results not silently broadened')
        check('search preserved on zero matches',parse_qs(urlsplit(current()).query).get('q')==['does-not-exist'])
        start('/shop?fit=all');page.evaluate('window.scrollTo(0,0)')
        page.get_by_role('button',name=re.compile('Motion on')).click()
        expect(strip).to_have_attribute('data-fitment-motion','off');check('Motion off disables fitment animations')
        choose('Street 155','2022');page.wait_for_timeout(100)
        check('no active fitment animation when paused',strip.evaluate('(e)=>e.getAnimations({subtree:true}).filter(a=>a.playState==="running").length')==0)
        page.get_by_role('button',name=re.compile('Motion off')).click()
        page.get_by_role('button',name='Open support').click()
        expect(strip).to_have_attribute('data-fitment-motion','off');check('Support cancels fitment motion without changing results')
        page.get_by_role('button',name='Close support').click();expect(strip).to_have_attribute('data-fitment-motion','on')
        page.emulate_media(reduced_motion='reduce');expect(strip).to_have_attribute('data-fitment-motion','off');check('live reduced-motion preference respected')
        page.emulate_media(reduced_motion='no-preference');expect(strip).to_have_attribute('data-fitment-motion','on')
        for width in [360,390,768,1024,1440,1920,2560]:
            page.set_viewport_size({'width':width,'height':1000});page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(120)
            check(f'no document horizontal overflow at {width}px',page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'))
            expect(strip.get_by_role('button',name='Change vehicle')).to_be_visible()
            check(f'vehicle actions visible at {width}px')
            if width==390:page.screenshot(path=str(out/'fitment-390.png'))
        page.set_viewport_size({'width':1440,'height':1080})
        for _ in range(3):
            start('/products/apex-wheels');start('/shop?fit=all')
        expect(strip).to_contain_text('Street 155');check('repeated unmount and return keeps vehicle context')
        if args.harness:
            page.evaluate("window.__fitmentHarness.setVehicle('missing-vehicle')")
        else:
            page.evaluate("localStorage.setItem('dth.flow.vehicle.v1', JSON.stringify('missing-vehicle'))")
            start('/shop?fit=all')
        expect(strip).to_have_attribute('data-fitment-vehicle','unknown')
        expect(strip).to_contain_text('Saved vehicle unavailable')
        expect(page.locator('[data-shop-id] [data-fitment-status="incompatible"]')).to_have_count(0);check('stale ID never becomes an incompatible verdict')
        check('unknown statuses are shown',page.locator('[data-shop-id] [data-fitment-status="unknown"]').count()>0)
        strip.get_by_role('button',name='Clear vehicle',exact=True).click()
        expect(strip).to_have_attribute('data-fitment-vehicle','unselected');check('explicit clear recovers from stale vehicle')
        check('no uncaught JavaScript errors',not errors)
        browser.close()

try:
    run()
    report={'passed':len(checks),'checks':checks,'errors':errors,
      'scope':'Offline React StrictMode, real Shop/QuickView/StoreProvider, copied vehicle-picker component, MemoryRouter, product route placeholder; embedded images' if args.harness else 'Compiled HTTP Flow application, native BrowserRouter; no database',
      'webgl_tested':False,'live_api_tested':False}
    (out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
except Exception as e:
    (out/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'failure':str(e)},indent=2));raise
