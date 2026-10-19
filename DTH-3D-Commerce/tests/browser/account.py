"""Compiled Access181 + actual API authentication and owner-scoped MongoDB orders.

CI serves this build against its disposable dth_*_browser_test database only.
"""
import json, re, uuid, os
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect
from cart_helpers import close_added_cart

expect.set_options(timeout=25000)
out = Path('test-results/account'); out.mkdir(parents=True, exist_ok=True)
base = os.environ.get('DTH_BROWSER_URL', 'http://127.0.0.1:5000').rstrip('/')
uri = os.environ.get('MONGO_URI', '')
if uri:
    assert re.fullmatch(r'mongodb://127\.0\.0\.1:\d+/dth_(?:account|admin)_browser_test', uri), 'Only the disposable account/admin database is allowed'
email = 'browser-' + uuid.uuid4().hex[:10] + '@example.test'
password = 'Browser test only 27!'
checks, errors = [], []


def checked(name):
    checks.append(name); print('PASS:', name, flush=True)


def screenshot(page, name):
    page.screenshot(path=str(out / (name + '.png')), full_page=True)


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Horizontal overflow'


def member_heading(page, name):
    expect(page.get_by_role('heading', name=name, exact=True)).to_be_visible()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None,
                               args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page(); page.set_default_timeout(25000)
    page.on('pageerror', lambda err: errors.append(str(err)))
    try:
        page.goto(base + '/account')
        access = page.locator('[data-access181][data-mode="api"]')
        expect(access).to_be_visible(); member_heading(page, 'Welcome back.')
        no_overflow(page); screenshot(page, '01-sign-in-desktop')
        assert access.get_by_role('button', name='Sign in', exact=True).evaluate('e => getComputedStyle(e).backgroundColor') == 'rgb(9, 105, 216)'
        sculpture = access.locator('[data-access181-canvas]')
        expect(sculpture).to_have_attribute('data-ready', 'true')
        assert sculpture.evaluate('canvas => canvas.__dthRenderCount > 0')
        access.get_by_role('button', name='Pause motion', exact=False).click()
        expect(sculpture).to_have_attribute('data-running', 'false')
        screenshot(page, '01-studio-3d-paused')
        access.get_by_role('button', name='Play motion', exact=False).click()
        expect(sculpture).to_have_attribute('data-running', 'true')
        checked('Actual Access181 WebGL renders; pause/play and primary theme work')

        access.get_by_role('button', name='Create account', exact=True).click()
        access.get_by_label('Email', exact=True).fill(email)
        access.get_by_label('Password', exact=True).fill(password)
        access.get_by_label('Confirm password', exact=True).fill('different password here')
        access.get_by_role('button', name='Create account', exact=True).click()
        expect(access.get_by_role('alert')).to_contain_text('do not match')
        expect(access.get_by_role('alert')).to_be_focused()
        assert context.request.get(base + '/api/shop/auth/me').json()['user'] is None
        checked('Mismatched confirmation is blocked before creating a real account')
        access.get_by_label('Confirm password', exact=True).fill(password)
        with page.expect_response(lambda response: response.url == base + '/api/shop/auth/register' and response.request.method == 'POST') as registered:
            access.get_by_role('button', name='Create account', exact=True).click()
        assert registered.value.ok
        page.wait_for_url(base + '/story?intro=1'); expect(page.locator('[data-story-editorial]')).to_be_visible()
        assert context.request.get(base + '/api/shop/auth/me').json()['user']['email'] == email
        page.get_by_role('link', name='Skip story', exact=False).click()
        expect(page).to_have_url(base + '/'); expect(page.locator('[data-scene]')).to_have_attribute('data-scene', 'ready')
        checked('Real registration follows Login -> first-visit Story -> rendered Home')

        page.goto(base + '/account'); member_heading(page, 'Overview')
        page.get_by_role('navigation', name='Account navigation').get_by_role('link', name='Garage', exact=False).click()
        member_heading(page, 'My Garage')
        garage = page.locator('[data-garage16]')
        garage.get_by_role('button', name='Add vehicle', exact=False).first.click()
        add = page.get_by_role('dialog', name='Add an NVX')
        expect(add.get_by_role('radio')).to_have_count(3)
        assert page.get_by_label('Year', exact=True).count() == 0
        add.get_by_role('radio', name='NVX V1', exact=True).check()
        add.get_by_role('button', name='Add to garage', exact=True).click()
        expect(garage).to_have_attribute('data-garage-default', 'yamaha-nvx-v1')
        expect(garage.locator('[data-garage-vehicle="yamaha-nvx-v1"]')).to_be_visible()
        me = context.request.get(base + '/api/shop/auth/me').json()
        assert me['user']['savedVehicleId'] == 'yamaha-nvx-v1'
        page.reload(); expect(garage).to_have_attribute('data-garage-default', 'yamaha-nvx-v1')
        expect(garage.get_by_role('button', name='Preview NVX V1', exact=True)).to_be_visible()
        screenshot(page, '02-saved-vehicle-desktop')
        checked('Garage saves Yamaha NVX V1 through real API and restores after F5; no model year')

        garage.get_by_role('link', name='Shop matching parts', exact=False).click()
        page.get_by_role('button', name='Quick view Apex Coilover', exact=True).click()
        quick = page.get_by_role('dialog', name='Apex Coilover', exact=False)
        expect(quick).to_be_visible(); quick.get_by_role('link', name='Open product & 3D', exact=False).click()
        expect(page).to_have_url(base + '/products/apex-suspension')
        expect(page.locator('[data-product-detail] h1')).to_have_text('Apex Coilover')
        page.get_by_role('button', name='Add to bag', exact=True).click(); close_added_cart(page)
        page.goto(base + '/bag'); page.get_by_role('button', name='Review order', exact=True).click()
        expect(page.get_by_role('button', name='Continue to checkout', exact=True)).to_be_disabled()
        page.get_by_role('checkbox').check(); page.get_by_role('button', name='Continue to checkout', exact=True).click()
        expect(page).to_have_url(base + '/checkout')
        expect(page.locator('[data-checkout]')).to_be_visible()
        expect(page.get_by_role('button', name='Place demo order', exact=True)).to_be_disabled()
        for label, value in [('Recipient name', 'Fictitious browser customer'), ('Phone', '0900000000'),
                             ('Address', '1 Disposable Test Street'), ('City', 'Test City')]:
            page.get_by_label(label, exact=True).fill(value)
        page.get_by_role('checkbox').check()
        with page.expect_response(lambda response: response.url == base + '/api/shop/orders' and response.request.method == 'POST') as placed:
            page.get_by_role('button', name='Place demo order', exact=True).click()
        assert placed.value.ok
        page.wait_for_url('**/order-complete?order=DTH-*')
        order_id = parse_qs(urlsplit(page.url).query)['order'][0]
        member_heading(page, 'Your demo order is confirmed.')
        expect(page.get_by_text('Loaded from your account', exact=True)).to_be_visible()
        expect(page.locator('[aria-label="Demo checkout details"]')).to_contain_text('Fictitious browser customer')
        checked('Bag -> checked Review -> Checkout creates a real persisted demo order with consent')

        page.goto(base + '/account?view=orders')
        page.get_by_role('button', name=re.compile(re.escape(order_id))).click()
        member_heading(page, 'Order detail'); expect(page.get_by_text('Apex Coilover', exact=True)).to_be_visible()
        page.reload(); expect(page.get_by_text('Apex Coilover', exact=True)).to_be_visible()
        screenshot(page, '04-receipt-desktop')
        checked('Owner-scoped account history reloads persisted receipt after F5')
        page.goto(base + '/account?view=orders'); page.get_by_label('Search orders', exact=True).fill('no-such-product')
        page.get_by_role('button', name='Search', exact=True).click()
        member_heading(page, 'No matching orders.'); page.get_by_role('button', name='Reset search', exact=True).click()
        expect(page.get_by_role('button', name=re.compile(re.escape(order_id)))).to_be_visible()
        checked('Search empty state and reset restore the same saved order')

        page.goto(base + '/account'); member_heading(page, 'Overview'); screenshot(page, '05-overview-desktop')
        page.get_by_role('button', name='Sign out', exact=True).click(); member_heading(page, 'Welcome back.')
        assert context.request.get(base + '/api/shop/auth/me').json()['user'] is None
        checked('Logout revokes the real server session')
        page.get_by_label('Email', exact=True).fill(email); page.get_by_label('Password', exact=True).fill('wrong password sample')
        page.get_by_role('button', name='Sign in', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('incorrect'); expect(page.get_by_role('alert')).to_be_focused()
        assert context.request.get(base + '/api/shop/auth/me').json()['user'] is None
        checked('Wrong password is rejected without authentication')
        page.goto(base + '/account?return=/bag')
        page.get_by_label('Email', exact=True).fill(email); page.get_by_label('Password', exact=True).fill(password)
        page.get_by_role('button', name='Sign in', exact=True).click(); expect(page).to_have_url(base + '/bag')
        assert context.request.get(base + '/api/shop/auth/me').json()['user']['email'] == email
        checked('Real login returns to the safe checkout deep link')

        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            for view, heading in [('', 'Overview'), ('?view=vehicle', 'My Garage'), ('?view=orders', 'Orders'), ('?view=security', 'Profile')]:
                page.goto(base + '/account' + view); member_heading(page, heading); no_overflow(page)
            screenshot(page, 'account-settings-' + str(width))
        checked('All current account views fit 320 / 390 / 768 / 1440px')
        page.emulate_media(reduced_motion='reduce'); page.goto(base + '/account?view=vehicle')
        expect(garage).to_have_attribute('data-motion', 'off')
        expect(page.locator('[data-account-phase]')).to_have_attribute('data-reduced', 'true')
        assert page.locator('[data-motion-panel]').count() == 0 or page.locator('[data-motion-panel]').evaluate('e => e.getAnimations().every(a => a.playState !== "running")')
        checked('Reduced motion stops Garage and account page animation')
        page.goto(base + '/account?view=security'); page.get_by_role('button', name='Delete account', exact=True).click()
        dialog = page.get_by_role('dialog'); expect(dialog.get_by_role('button', name='Cancel', exact=True)).to_be_focused()
        page.keyboard.press('Escape'); expect(dialog).not_to_be_visible()
        assert context.request.get(base + '/api/shop/auth/me').json()['user']['email'] == email
        checked('Destructive dialog focuses Cancel; Escape preserves account and session')
        page.get_by_role('button', name='Sign out', exact=True).click()
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900}); page.goto(base + '/account')
            member_heading(page, 'Welcome back.'); no_overflow(page)
            expect(page.locator('[data-access181]')).to_have_attribute('data-motion', 'off')
            assert page.locator('[data-access181-canvas]').count() == 0
            screenshot(page, 'sign-in-' + str(width))
        checked('Responsive Login keeps usable forms and reduced-motion still artwork')
        assert not errors, errors; checked('No uncaught browser exceptions')
    except Exception:
        screenshot(page, 'failure'); (out / 'failure-page.html').write_text(page.content(), encoding='utf8'); raise
    finally:
        (out / 'results.json').write_text(json.dumps({'checks': checks, 'browserErrors': errors}, indent=2), encoding='utf8')
        browser.close()
