"""B3B: Yamaha NVX V1/V2/V3 Fitment in compiled Flow + real BrowserRouter.

No manufacturer fitment claims. Synthetic catalog only; no API or database.
The legacy Make/Model/Year test fixture is intentionally NOT used here.
"""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

from playwright.sync_api import sync_playwright, expect
from flow_auth import login_flow

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--out', default='test-results/shop-fitment')
parser.add_argument('--browser')
parser.add_argument('--harness', help='Legacy offline harness is not an HTTP/auth/WebGL test. Run compiled Flow instead.')
args = parser.parse_args()
if args.harness:
    parser.error('B3B tests real Login-first + NVX Flow. The legacy Make/Year offline harness must be migrated separately; do not treat it as an NVX verdict.')
base = args.url.rstrip('/')
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
checks, errors, api_requests = [], [], []
V1, V2, V3 = 'yamaha-nvx-v1', 'yamaha-nvx-v2', 'yamaha-nvx-v3'


def check(description, value=True):
    if not value:
        raise AssertionError(description)
    checks.append(description)
    print('PASS:', description, flush=True)


with sync_playwright() as playwright:
    options = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    if args.browser:
        options['executable_path'] = args.browser
    browser = playwright.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, device_scale_factor=1)
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1')")
    page = context.new_page()
    page.set_default_timeout(15000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: api_requests.append(request.url)
            if '/api/shop/' in request.url else None)
    strip = page.locator('[data-fitment-vehicle]')
    nvx = strip.get_by_role('group', name='Yamaha NVX version')
    products = page.locator('[data-shop-id]')

    def start(path='/shop'):
        # The real page, not a pre-authenticated DOM or a mocked MemoryRouter.
        page.goto(base + path, wait_until='domcontentloaded')
        if path.startswith('/shop'):
            expect(page.locator('[data-discovery-shell][data-mode="shop"]')).to_be_visible()
            expect(strip).to_be_visible()
            expect(page.get_by_role('combobox', name='Search parts by name or finish')).to_be_visible()
        return urlsplit(page.url).path

    def choose(version):
        nvx.get_by_role('button', name=f'NVX {version}', exact=True).click()
        expect(strip).to_have_attribute('data-fitment-vehicle', 'selected')
        expect(nvx.get_by_role('button', name=f'NVX {version}', exact=True)).to_have_attribute('aria-pressed', 'true')
        expect(strip.get_by_role('checkbox', name='Matches only')).to_be_checked()

    def bag():
        return page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1') || '[]')")

    try:
        login_flow(page, base, '/shop')
        start()
        expect(strip).to_have_attribute('data-fitment-vehicle', 'unselected')
        check('Guest uses actual Flow Login; initial vehicle remains unselected')
        expect(nvx.get_by_role('button')).to_have_count(3)
        check('Exactly the three published NVX versions appear; no model-year picker')
        choose('V1')
        check('NVX V1 selection is explicit and activates Matches only')
        # Synthetic mapping: 5 Apex products + 5 Studio products; catalog page size is 9.
        expect(strip).to_contain_text('10 demo matches in 20 filtered parts')
        expect(products).to_have_count(9)
        expect(products.locator('[data-status="compatible"]')).to_have_count(9)
        check('NVX V1 has 10 mapped demo products, paginated 9 at a time')
        page.screenshot(path=str(out / 'fitment-nvx-v1.png'), full_page=True)

        # strip.get_by_role('checkbox', name='Matches only').uncheck()
        toggle = strip.get_by_role('checkbox', name='Matches only')

        expect(toggle).to_be_checked()

        # Trigger the actual React change handler.
        toggle.click()

        # Wait for React Router to commit the filter change.
        expect(page).to_have_url(
            re.compile(r'[?&]fit=all(?:&|$)'),
            timeout=15000
        )

        # Verify the checkbox reflects the updated filter.
        expect(toggle).not_to_be_checked(timeout=15000)
        assert parse_qs(urlsplit(page.url).query).get('fit') == ['all']
        # expect(products.locator('[data-status="incompatible"]')).not_to_have_count(0)
        # Page 1 contains the first nine compatible products.
        expect(products).to_have_count(9)
        expect(products.locator('[data-status="compatible"]')).to_have_count(9)

        # Verify nonmatching products on the next catalog page.
        page.get_by_role('button', name='Page 2', exact=True).click()

        expect(products).to_have_count(9)
        expect(products.locator('[data-status="compatible"]')).to_have_count(1)
        expect(products.locator('[data-status="incompatible"]')).to_have_count(8)

        # Verify the remaining nonmatching products.
        page.get_by_role('button', name='Page 3', exact=True).click()

        expect(products).to_have_count(2)
        expect(products.locator('[data-status="incompatible"]')).to_have_count(2)
        check('All parts option keeps explicit incompatible badges, not fabricated fitment')

        path = '/shop?category=wheels&sort=price-high&fit=all&max=9000000&testKey=keep'
        start(path)
        expect(products).to_have_count(4)
        expect(strip).to_contain_text('2 demo matches in 4 filtered parts')
        check('Wheel/category/price constraints return 2 V1 matches in 4 wheel products')
        page.get_by_role('button', name='Quick view Vector Alloy wheel', exact=True).click()
        quick = page.locator('dialog[open]:not([data-cart-dialog])')
        expect(quick).to_be_visible()
        expect(quick.locator('[data-fitment-status]')).to_have_attribute('data-fitment-status', 'incompatible')
        expect(quick).to_contain_text('This is not a real-world fitment verdict.')
        expect(quick.get_by_role('button', name='Select matching vehicle', exact=True)).to_be_visible()
        check('Incompatible Vector preview makes no physical fitment or purchase claim')
        page.wait_for_timeout(720)
        page.screenshot(path=str(out / 'quickview-incompatible.png'), full_page=True)

        before = bag()
        quick.get_by_role('button', name='Show matching parts', exact=True).click()
        expect(quick).to_have_count(0)
        expected = {'category': 'wheels', 'sort': 'price-high', 'max': '9000000',
                    'testKey': 'keep', 'fit': 'match'}
        query = parse_qs(urlsplit(page.url).query)
        check('QuickView alternatives preserve filters and unrelated URL keys',
              all(query.get(key) == [value] for key, value in expected.items()))
        expect(products).to_have_count(2)
        assert set(products.evaluate_all('(nodes) => nodes.map(n => n.dataset.shopId)')) == {'apex-wheels', 'studio-wheels'}
        check('V1 alternatives contain only Apex and Studio wheels')
        assert bag() == before
        check('Showing alternatives never changes the bag')

        page.get_by_role('button', name='Quick view Apex Alloy wheel', exact=True).click()
        quick = page.locator('dialog[open]:not([data-cart-dialog])')
        expect(quick.locator('[data-fitment-status]')).to_have_attribute('data-fitment-status', 'compatible')
        expect(quick.get_by_role('button', name='Show matching parts', exact=True)).to_have_count(0)
        quick.get_by_role('button', name='Add to bag', exact=True).click()
        cart = page.locator('dialog[data-cart-dialog][open]')
        expect(cart).to_be_visible()
        expect(page.locator('dialog[open]')).to_have_count(1)
        assert bag() == [{'productId': 'apex-wheels', 'vehicleId': V1, 'quantity': 1}]
        check('Compatible Apex QuickView adds NVX V1 line through one real Cart Drawer')
        cart.get_by_role('button', name='Close bag', exact=True).click()
        expect(cart).to_have_count(0)

        before = bag()
        choose('V2')
        assert bag() == before
        expect(products).to_have_count(2)
        assert set(products.evaluate_all('(nodes) => nodes.map(n => n.dataset.shopId)')) == {'vector-wheels', 'studio-wheels'}
        check('Changing header NVX V1 -> V2 updates results without retargeting bag')

        start('/shop?q=does-not-exist&fit=match')
        expect(products).to_have_count(0)
        expect(page.get_by_text('No matching parts.', exact=True)).to_be_visible()
        assert parse_qs(urlsplit(page.url).query).get('q') == ['does-not-exist']
        check('Zero matches do not broaden results or remove search term')

        start('/shop?fit=all')
        page.get_by_role('button', name='Ⅱ Motion on', exact=False).click()
        expect(strip).to_have_attribute('data-motion', 'off')
        check('Motion toggle disables VehicleBar presentation animations')
        page.get_by_role('button', name='▷ Motion off', exact=False).click()
        expect(strip).to_have_attribute('data-motion', 'on')
        page.emulate_media(reduced_motion='reduce')
        expect(strip).to_have_attribute('data-motion', 'off')
        check('System reduced motion is respected')
        page.emulate_media(reduced_motion='no-preference')
        expect(strip).to_have_attribute('data-motion', 'on')

        page.get_by_role('button', name='Open support', exact=True).click()
        expect(page.get_by_role('button', name='Close support', exact=True)).to_be_visible()
        assert bag() == before
        page.get_by_role('button', name='Close support', exact=True).click()
        check('Support UI opens and closes without altering selected bag lines')

        for width in [360, 390, 768, 1024, 1440, 1920, 2560]:
            page.set_viewport_size({'width': width, 'height': 1000})
            page.wait_for_timeout(120)
            check(f'No horizontal overflow at {width}px',
                  page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            expect(nvx.get_by_role('button', name='NVX V2', exact=True)).to_be_visible()
            if width == 390:
                page.screenshot(path=str(out / 'fitment-mobile.png'), full_page=True)
        page.set_viewport_size({'width': 1440, 'height': 1080})

        for _ in range(3):
            start('/products/apex-wheels')
            start('/shop?fit=all')
        expect(strip).to_have_attribute('data-fitment-vehicle', 'selected')
        expect(nvx.get_by_role('button', name='NVX V2', exact=True)).to_have_attribute('aria-pressed', 'true')
        check('Navigation/unmount preserves selected V2 version')

        # Unknown legacy selections are cleared safely by the NVX migration hook;
        # they are never represented as a physical incompatible verdict.
        page.evaluate("localStorage.setItem('dth.flow.vehicle.v1', JSON.stringify('retired-vehicle'))")
        page.reload(wait_until='domcontentloaded')
        expect(strip).to_have_attribute('data-fitment-vehicle', 'unselected', timeout=15000)
        assert page.evaluate("localStorage.getItem('dth.flow.vehicle.v1.before-nvx-step15')") == '"retired-vehicle"'
        assert bag() == before
        expect(products.locator('[data-status="incompatible"]')).to_have_count(0)
        check('Stale vehicle cleared to unselected; original bag and backup retained')

        assert not errors, errors
        assert not api_requests, api_requests
        check('No uncaught JavaScript exceptions or live API calls')
    except Exception:
        page.screenshot(path=str(out / 'failure.png'), full_page=True)
        (out / 'failure.html').write_text(page.content(), encoding='utf-8')
        raise
    finally:
        (out / 'results.json').write_text(json.dumps({
            'passed': len(checks), 'checks': checks, 'errors': errors,
            'apiRequests': api_requests,
            'scope': 'HTTP compiled Flow, NVX synthetic fitment, real BrowserRouter; no database',
            'webgl_tested': False,
        }, indent=2), encoding='utf-8')
        browser.close()
print('Shop Fitment B3B checks:', len(checks))
