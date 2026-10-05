"""Shop search regression. Run against a compiled Flow build, never a live DB.
python tests/browser/shop_discovery.py --url http://127.0.0.1:4173
Requires Playwright Python + Chromium; neither is a production JS dependency.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--out', default='test-results/shop-discovery')
parser.add_argument('--browser', default=None)
parser.add_argument('--harness', default=None, help='Offline React MemoryRouter harness HTML; not an HTTP/WebGL E2E run.')
args = parser.parse_args()
out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
checks, errors = [], []
def check(name, condition=True):
    if not condition:
        raise AssertionError(name)
    checks.append(name)

def run():
    with sync_playwright() as p:
        opts = {'headless': True, 'args': ['--no-sandbox','--disable-dev-shm-usage']}
        if args.browser: opts['executable_path'] = args.browser
        browser = p.chromium.launch(**opts)
        context = browser.new_context(viewport={'width':1440,'height':1000}, device_scale_factor=1)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        def current():
            if args.harness:
                return page.evaluate("window.__shopHarness.location.pathname + window.__shopHarness.location.search")
            return urlsplit(page.url).path + ('?' + urlsplit(page.url).query if urlsplit(page.url).query else '')
        def start(path='/shop'):
            if args.harness:
                if page.url == 'about:blank' and not page.locator('#root').count():
                    page.set_content(Path(args.harness).read_text(), wait_until='load')
                    page.wait_for_function('!!window.__shopHarness')
                page.evaluate('(path) => window.__shopHarness.navigate(path)', path)
                page.wait_for_function('(path) => window.__shopHarness.location.pathname + window.__shopHarness.location.search === path', arg=path)
            else:
                page.goto(args.url.rstrip('/')+path, wait_until='domcontentloaded')
            expect(page.get_by_role('combobox',name='Search parts by name or finish')).to_be_visible()
            page.wait_for_timeout(80)
            expected_query = parse_qs(urlsplit(path).query).get('q',[''])[0]
            if expected_query == '' and page.get_by_role('combobox',name='Search parts by name or finish').input_value():
                page.get_by_role('button',name='Clear search',exact=True).click()
            expect(page.get_by_role('combobox',name='Search parts by name or finish')).to_have_value(expected_query)
        field=lambda: page.get_by_role('combobox',name='Search parts by name or finish')
        panel=lambda: page.locator('[data-search-panel]')
        options=lambda: panel().get_by_role('option')
        start()
        expect(field()).to_have_attribute('aria-expanded','false'); check('collapsed initially')
        field().fill('a'); expect(field()).to_have_attribute('aria-expanded','false'); check('one character does not open suggestions')
        field().fill('apex'); expect(panel()).to_be_visible(); expect(options()).to_have_count(5)
        check('five actual Apex suggestions, not sort-select options')
        check('typing does not push query history yet', current() == '/shop')
        check('six-result cap', options().count() <= 6)
        field().press('ArrowDown'); expect(options().nth(0)).to_have_attribute('aria-selected','true')
        check('DOM focus stays in combobox',field().evaluate('(e)=>e===document.activeElement'))
        target=options().nth(0).get_attribute('href')
        check('active descendant references a live option', field().get_attribute('aria-activedescendant') == options().nth(0).get_attribute('id'))
        page.wait_for_timeout(420); page.screenshot(path=str(out/'01-search-desktop.png'))
        field().press('Escape'); expect(panel()).to_have_count(0); expect(field()).to_have_value('apex'); check('Escape closes without clearing query')
        field().press('ArrowUp'); expect(options().nth(4)).to_have_attribute('aria-selected','true'); check('ArrowUp opens last suggestion')
        field().press('Escape'); field().press('ArrowDown'); field().press('Enter')
        page.wait_for_timeout(200); check('Enter selected product opens exact route',current()==target)
        if args.harness: page.evaluate('window.__shopHarness.navigate(-1)')
        else: page.go_back(wait_until='domcontentloaded')
        expect(field()).to_have_value('apex'); expect(field()).to_have_attribute('aria-expanded','false')
        check('back preserves search query',parse_qs(urlsplit(current()).query).get('q')==['apex'])
        check('back restores field focus',field().evaluate('(e)=>e===document.activeElement'))
        field().fill('coil'); field().press('Enter'); page.wait_for_timeout(100)
        check('Enter without selection searches rather than opening arbitrary first result',urlsplit(current()).path=='/shop' and parse_qs(urlsplit(current()).query).get('q')==['coil'])
        expect(field()).to_have_attribute('aria-expanded','false')
        start('/shop?category=wheels&sort=price-high&fit=all&max=9000000&page=2&testKey=keep')
        field().fill('apex'); expect(options()).to_have_count(1)
        check('suggestions honor current category', 'wheel' in options().first.inner_text().lower())
        product=options().first.get_attribute('href'); options().first.click(); page.wait_for_timeout(100)
        check('mouse selects exact product', current()==product)
        if args.harness: page.evaluate('window.__shopHarness.navigate(-1)')
        else: page.go_back(wait_until='domcontentloaded')
        expect(field()).to_have_value('apex')
        qs=parse_qs(urlsplit(current()).query)
        check('back retains category, price, fit, sort and unrelated URL keys', all(qs.get(k)==[v] for k,v in {'category':'wheels','sort':'price-high','fit':'all','max':'9000000','testKey':'keep'}.items()))
        check('changed query resets pagination', 'page' not in qs)
        field().fill('zz-nothing'); expect(page.get_by_text('No parts match “zz-nothing”.')).to_be_visible()
        check('empty state displayed'); check('no fabricated suggestions',options().count()==0)
        page.screenshot(path=str(out/'02-empty.png'))
        page.get_by_role('button',name='Reset product filters',exact=True).click()
        expect(field()).to_have_value('');check('reset preserves fit and sort', all(parse_qs(urlsplit(current()).query).get(k)==[v] for k,v in {'fit':'all','sort':'price-high'}.items()))
        field().fill('apex'); field().press('ArrowDown'); field().fill('no-match-at-all'); field().press('Enter'); page.wait_for_timeout(100)
        check('stale selected item cannot navigate after query edit',urlsplit(current()).path=='/shop')
        start('/shop')
        field().dispatch_event('compositionstart');field().fill('apex');field().press('Enter')
        check('IME Enter does not submit prematurely',current()=='/shop')
        field().dispatch_event('compositionend'); expect(panel()).to_be_visible();check('suggestions resume after composition')
        field().press('Tab');expect(panel()).to_have_count(0);check('Tab dismisses without trapping focus')
        field().fill('apex');expect(panel()).to_be_visible()
        page.locator('h1').click();expect(panel()).to_have_count(0);check('outside click closes popup')
        field().click();expect(panel()).to_be_visible()
        page.evaluate("(()=>{let el=document.createElement('div');el.className='dth-support-panel';el.id='test-support-gate';document.body.append(el)})()")
        expect(panel()).to_have_count(0);page.evaluate("document.getElementById('test-support-gate').remove()")
        check('programmatic support gate dismisses popup')
        # A live catalog Flow app exposes a Motion button, shared with the new component.
        page.get_by_role('button',name='Ⅱ Motion on',exact=False).click()
        field().fill('apex');expect(panel()).to_be_visible()
        check('Motion off suppresses panel and row animations',panel().evaluate("(e)=>[e,...e.querySelectorAll('*')].every(n=>getComputedStyle(n).animationName==='none')"))
        context.clear_permissions()
        page.emulate_media(reduced_motion='reduce'); field().press('Escape'); field().click();expect(panel()).to_be_visible()
        check('system reduced motion disables all new animation',panel().evaluate("(e)=>[e,...e.querySelectorAll('*')].every(n=>getComputedStyle(n).animationName==='none')"))
        for width,height in [(2560,1440),(1920,1080),(1440,900),(1280,720),(768,1024),(390,844),(360,640)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(90)
            field().fill('apex');expect(panel()).to_be_visible()
            check(f'no horizontal overflow {width}x{height}',page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
            box=panel().bounding_box();check(f'panel stays inside horizontal viewport {width}',box['x']>=0 and box['x']+box['width']<=width+1)
            if width<=390: page.screenshot(path=str(out/f'03-mobile-{width}.png'),full_page=True)
        start('/shop');page.set_viewport_size({'width':1440,'height':1000});field().fill('apex');
        page.get_by_role('button',name='Clear search',exact=True).click();expect(field()).to_have_value('');expect(panel()).to_have_count(0);check('clear closes and focuses field')
        # Repeat navigation to exercise effect cleanup under StrictMode.
        for _ in range(3):
            field().fill('apex');field().press('ArrowDown');field().press('Enter');page.wait_for_timeout(80)
            if args.harness: page.evaluate('window.__shopHarness.navigate(-1)')
            else: page.go_back(wait_until='domcontentloaded')
            expect(field()).to_have_value('apex')
        check('repeated unmount and return stays usable')
        check('no uncaught JavaScript errors', not errors)
        browser.close()
try:
    run()
    report={'passed':len(checks),'checks':checks,'errors':errors,'mode':'offline React StrictMode + MemoryRouter + real Shop/Product components; embedded demo images' if args.harness else 'HTTP compiled Flow application + BrowserRouter; no live database', 'webgl_tested':False}
    (out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
except Exception as e:
    (out/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'failure':str(e)},indent=2));raise
