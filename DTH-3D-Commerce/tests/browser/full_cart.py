"""B3B: BrowserRouter + real compiled Flow / Full Cart / Checkout integration.

Run against `npm run build:flow` + Vite Preview. Uses fictitious demo account,
no live API, no MongoDB and no actual payment/shipment.
"""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright, expect
from flow_auth import login_flow

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--out', default='test-results/full-cart')
parser.add_argument('--browser')
args = parser.parse_args()
base = args.url.rstrip('/')
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
checks, errors, api_requests = [], [], []

V1, V2, V3 = 'yamaha-nvx-v1', 'yamaha-nvx-v2', 'yamaha-nvx-v3'
APEX = {'productId': 'apex-suspension', 'vehicleId': V1, 'quantity': 2}
STUDIO = {'productId': 'studio-suspension', 'vehicleId': V1, 'quantity': 1}


def ok(description):
    checks.append(description)
    print('PASS:', description, flush=True)


def row(bag, product_id):
    return next(item for item in bag if item['productId'] == product_id)


with sync_playwright() as playwright:
    options = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    if args.browser:
        options['executable_path'] = args.browser
    browser = playwright.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1')")
    page = context.new_page()
    page.set_default_timeout(15000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: api_requests.append(request.url)
            if '/api/shop/' in request.url else None)
    cart = page.locator('[data-full-cart]')

    def bag():
        return page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1') || '[]')")

    def seed(items):
        """Replace demo local bag and perform real document navigation into the cart."""
        page.evaluate('(items) => localStorage.setItem("dth.flow.bag.v1", JSON.stringify(items))', items)
        page.goto(base + '/bag', wait_until='domcontentloaded')
        expect(cart).to_be_visible()
        expect(cart.locator('[data-bag-line]')).to_have_count(len(items))

    try:
        # Guard remains active. Auth through the public Flow form, not a forged session.
        page.goto(base + '/bag', wait_until='domcontentloaded')
        expect(page.locator('[data-access181]')).to_be_visible()
        ok('Guest cannot see Full Cart before Login')
        login_flow(page, base, '/bag')
        expect(cart).to_be_visible()
        assert urlsplit(page.url).path == '/bag'
        ok('Flow sign-in returns to original protected bag URL')

        seed([APEX, STUDIO])
        expect(cart.locator('[data-bag-line][data-state="compatible"]')).to_have_count(2)
        expect(cart.get_by_role('button', name='Review order', exact=True)).to_be_enabled()
        ok('NVX V1 Apex and Studio rows have valid price, fitment and review action')

        cart.get_by_role('button', name='Increase quantity of Apex Coilover', exact=True).click()
        assert row(bag(), 'apex-suspension')['quantity'] == 3
        cart.get_by_label('Quantity for Apex Coilover', exact=True).select_option('2')
        assert row(bag(), 'apex-suspension')['quantity'] == 2
        ok('Per-line quantity changes persist without losing other lines')

        # Header selector is independent from every bag line.
        page.locator('.dth-vehicle-button').click()
        picker = page.get_by_role('dialog', name='Choose your Yamaha NVX')
        expect(picker).to_be_visible()
        picker.get_by_role('radio', name='NVX V2', exact=True).check()
        picker.get_by_role('button', name=re.compile(r'^Use NVX V2')).click()
        expect(picker).to_have_count(0)
        assert row(bag(), 'apex-suspension')['vehicleId'] == V1
        assert row(bag(), 'studio-suspension')['vehicleId'] == V1
        ok('Changing global NVX from V1 to V2 does not retarget bag lines')

        # Only Studio has explicit multi-NVX demo compatibility.
        cart.get_by_label('Vehicle for Studio Coilover', exact=True).select_option(V2)
        assert row(bag(), 'studio-suspension')['vehicleId'] == V2
        assert row(bag(), 'apex-suspension')['vehicleId'] == V1
        expect(cart.locator('[data-bag-line][data-state="compatible"]')).to_have_count(2)
        ok('Explicitly changing Studio line to NVX V2 leaves Apex line on V1')
        page.screenshot(path=str(out / 'cart-desktop.png'), full_page=True)

        for width, height in [(320, 720), (390, 844), (768, 1024), (1024, 768),
                              (1440, 1000), (1920, 1080), (2560, 1440)]:
            page.set_viewport_size({'width': width, 'height': height})
            page.wait_for_timeout(120)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), width
            if width == 390:
                page.screenshot(path=str(out / 'cart-mobile.png'), full_page=True)
            ok(f'Full Cart has no horizontal overflow at {width}x{height}')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.emulate_media(reduced_motion='reduce')
        expect(cart.get_by_role('button', name='Reduced motion · system', exact=True)).to_be_disabled()
        page.wait_for_timeout(180)
        assert cart.evaluate('(node) => node.getAnimations({subtree:true}).filter(a => a.playState === "running").length') == 0
        ok('Reduced-motion setting disables Cart animations')

        # Do not hide invalid lines or let them enter Checkout.
        for product, vehicle, status in [
            ('missing-part', V1, 'unavailable'),
            ('apex-suspension', V2, 'incompatible'),
            ('apex-suspension', 'retired-vehicle', 'unknown'),
        ]:
            invalid = {'productId': product, 'vehicleId': vehicle, 'quantity': 1}
            seed([invalid])
            line = cart.locator('[data-bag-line]')
            expect(line).to_have_attribute('data-state', status)
            assert bag() == [invalid]
            expect(cart.get_by_role('button', name='Review order', exact=True)).to_be_enabled()
            cart.get_by_role('button', name='Review order', exact=True).click()
            expect(cart.locator('[data-quote-source="flow"]')).to_be_visible()
            expect(line).to_have_attribute('data-state', status)
            expect(cart.get_by_role('button', name='Continue to checkout', exact=True)).to_have_count(0)
            expect(cart.get_by_role('button', name='Check again', exact=True)).to_be_enabled()
            assert bag() == [invalid]
            ok(f'Fresh Flow quote identifies {status}, keeps line, blocks checkout')

        cart.get_by_role('button', name='Remove Apex Coilover', exact=True).click()
        expect(cart.get_by_role('heading', name='Your bag is empty.', exact=True)).to_be_visible()
        assert bag() == []
        ok('Remove invalid last line produces the actual empty bag state')

        # Successful Bag -> Review -> Checkout -> Confirmation, all simulated.
        seed([APEX])
        cart.get_by_role('button', name='Review order', exact=True).click()
        expect(cart.locator('[data-quote-source="flow"]')).to_be_visible()
        proceed = cart.get_by_role('button', name='Continue to checkout', exact=True)
        expect(proceed).to_be_disabled()
        cart.get_by_role('checkbox').check()
        expect(proceed).to_be_enabled()
        cart.get_by_role('button', name='Edit bag', exact=True).click()
        cart.get_by_role('button', name='Review order', exact=True).click()
        expect(cart.get_by_role('checkbox')).not_to_be_checked()
        ok('Changing review state invalidates the prior acknowledgement')

        cart.get_by_role('checkbox').check()
        cart.get_by_role('button', name='Continue to checkout', exact=True).click()
        expect(page.locator('[data-checkout]')).to_be_visible()
        expect(page.locator('[data-checkout]')).to_contain_text('Flow catalog checked')
        checkout = page.locator('[data-checkout]')
        checkout.get_by_label('Recipient name', exact=True).fill('DTH Demo Customer')
        checkout.get_by_label('Phone', exact=True).fill('0987654321')
        checkout.get_by_label('Email', exact=True).fill('demo@dth.test')
        checkout.get_by_label('Address', exact=True).fill('123 Example Street')
        checkout.get_by_label('City', exact=True).fill('Ho Chi Minh')
        place = checkout.get_by_role('button', name='Place demo order', exact=True)
        expect(place).to_be_disabled()
        checkout.get_by_role('checkbox').check()
        expect(place).to_be_enabled()
        place.click()
        page.wait_for_url(re.compile(re.escape(base) + r'/order-complete\?order=FLOW-'), timeout=20000)
        expect(page.get_by_role('heading', name='Your demo order is confirmed.', exact=True)).to_be_visible()
        assert bag() == []
        ok('Flow checkout revalidates NVX V1 and completes simulated order with cleared bag')
        page.reload()
        expect(page.get_by_role('heading', name='Your demo order is confirmed.', exact=True)).to_be_visible()
        ok('Demo receipt remains available across same-tab reload')

        assert not errors, errors
        assert not api_requests, api_requests
        ok('No uncaught page errors or API requests in database-free Flow')
    except Exception:
        page.screenshot(path=str(out / 'failure.png'), full_page=True)
        (out / 'failure.html').write_text(page.content(), encoding='utf-8')
        raise
    finally:
        (out / 'results.json').write_text(json.dumps({
            'passed': len(checks), 'checks': checks, 'errors': errors,
            'apiRequests': api_requests, 'mode': 'HTTP compiled Flow; test fixture only',
        }, indent=2), encoding='utf-8')
        browser.close()
print('Full Cart B3B checks:', len(checks))
