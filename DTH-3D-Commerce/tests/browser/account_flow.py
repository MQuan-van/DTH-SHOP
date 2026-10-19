"""Compiled Flow: actual Access181/WebGL, Garage and demo checkout; no API/MongoDB."""
import json
import os
import re
import uuid
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse
from playwright.sync_api import expect, sync_playwright
from cart_helpers import close_added_cart

BASE = os.environ.get('DTH_FLOW_URL', 'http://127.0.0.1:4173').rstrip('/')
OUT = Path('test-results/account-flow')
OUT.mkdir(parents=True, exist_ok=True)
PASSWORD = 'DthFlow2026!'
checks, errors, api_requests = [], [], []
expect.set_options(timeout=20_000)


def passed(name):
    checks.append(name)
    print('PASS:', name, flush=True)


def capture(page, name):
    page.screenshot(path=str(OUT / (name + '.png')), full_page=True)


def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Horizontal overflow'


def access(page):
    screen = page.locator('[data-access181][data-mode="flow"]')
    expect(screen).to_be_visible()
    expect(screen.locator('form')).to_have_attribute('aria-busy', 'false')
    return screen


def sign_in(page, email):
    screen = access(page)
    screen.get_by_label('Email', exact=True).fill(email)
    screen.get_by_label('Password', exact=True).fill(PASSWORD)
    screen.get_by_role('button', name='Sign in', exact=True).click()
    expect(screen).to_have_count(0)


def sign_out(page):
    page.get_by_role('button', name='Sign out', exact=True).click()
    # Await the completed adapter/UI logout before a hard navigation can unload
    # the async handler. A click acknowledgement does not establish logout.
    access(page)
    expect(page.get_by_role('navigation', name='Account navigation')).to_have_count(0)


def rendered_login(page):
    canvas = page.locator('[data-access181-canvas]')
    expect(canvas).to_have_attribute('data-ready', 'true')
    assert canvas.evaluate('canvas => canvas.__dthRenderCount > 0'), 'No native WebGL render'
    size = canvas.bounding_box()
    assert size and size['width'] > 250 and size['height'] > 150, size
    return canvas


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=[
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    ])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
    context.on('request', lambda request: api_requests.append(request.url)
               if '/api/' in urlparse(request.url).path else None)
    page = context.new_page()
    page.set_default_timeout(20_000)
    try:
        # Enter naturally. No injected user, readiness flag or Story visit.
        page.goto(BASE + '/', wait_until='domcontentloaded')
        expect(page.locator('[data-dth-ignition]')).to_be_visible()
        expect(page.locator('[data-dth-app-shell]')).to_have_attribute('data-dth-intro-state', 'complete')
        expect(page.locator('[data-dth-ignition]')).to_have_count(0)
        screen = access(page)
        expect(screen.get_by_role('heading', name=re.compile(r'Welcome\s+back\.'))).to_be_visible()
        expect(screen.get_by_role('note')).to_contain_text('not real authentication')
        expect(page.locator('[data-discovery-shell]')).to_have_count(0)
        canvas = rendered_login(page)
        expect(canvas).to_have_attribute('data-running', 'true')
        capture(page, '01-access181-login')
        passed('Loader releases actual Access181 before storefront; native WebGL renders')

        screen.get_by_role('button', name=re.compile(r'^Pause motion')).click()
        expect(canvas).to_have_attribute('data-running', 'false')
        screen.get_by_role('button', name=re.compile(r'^Play motion')).click()
        expect(canvas).to_have_attribute('data-running', 'true')
        screen.get_by_label('Email', exact=True).focus()
        expect(canvas).to_have_attribute('data-phase', 'identify')
        expect(canvas).to_have_attribute('data-running', 'false')
        screen.get_by_label('Password', exact=True).focus()
        expect(canvas).to_have_attribute('data-phase', 'secure')
        expect(canvas).to_have_attribute('data-running', 'false')
        screen.get_by_role('button', name=re.compile(r'^Reset view')).click()
        expect(canvas).to_have_attribute('data-running', 'true')
        passed('Actual login pause/play/reset and form focus control native scene safely')

        password = screen.get_by_label('Password', exact=True)
        expect(password).to_have_attribute('type', 'password')
        expect(password).to_have_attribute('autocomplete', 'current-password')
        expect(password).to_have_attribute('minlength', '12')
        screen.get_by_label('Email', exact=True).fill('demo@dth.test')
        password.fill('wrong password here')
        screen.get_by_role('button', name='Show password', exact=True).click()
        expect(password).to_have_attribute('type', 'text')
        expect(screen.get_by_role('button', name='Hide password', exact=True)).to_have_attribute('aria-pressed', 'true')
        screen.get_by_role('button', name='Hide password', exact=True).click()
        screen.get_by_role('button', name='Sign in', exact=True).click()
        expect(screen.get_by_role('alert')).to_contain_text('incorrect')
        expect(screen.get_by_role('alert')).to_be_focused()
        expect(screen).to_have_attribute('data-phase', 'error')
        expect(page).to_have_url(BASE + '/')
        passed('Wrong credentials keep login; password reveal and focused accessible error work')

        screen.get_by_role('button', name='Create account', exact=True).click()
        expect(screen.get_by_role('heading', name=re.compile(r'Start your\s+build\.'))).to_be_focused()
        email = 'flow-' + uuid.uuid4().hex[:8] + '@dth.test'
        screen.get_by_label('Email', exact=True).fill(email)
        screen.get_by_label('Password', exact=True).fill(PASSWORD)
        confirmation = screen.get_by_label('Confirm password', exact=True)
        expect(confirmation).to_have_attribute('autocomplete', 'new-password')
        confirmation.fill('wrong confirmation')
        screen.get_by_role('button', name='Create account', exact=True).first.click()
        expect(screen.get_by_role('alert')).to_contain_text('do not match')
        expect(screen.get_by_role('alert')).to_be_focused()
        expect(confirmation).to_have_attribute('aria-invalid', 'true')
        confirmation.fill(PASSWORD)
        screen.get_by_role('button', name='Create account', exact=True).first.click()
        expect(page).to_have_url(BASE + '/story?intro=1')
        expect(page.locator('[data-story-editorial]')).to_be_visible()
        expect(page.locator('[data-access181]')).to_have_count(0)
        page.get_by_role('link', name='Enter studio', exact=False).click()
        expect(page).to_have_url(BASE + '/')
        expect(page.locator('[data-scene]')).to_have_attribute('data-scene', 'ready', timeout=30_000)
        assert page.locator('[data-stage] canvas').count() == 1
        passed('Fixture registration validates confirmation and follows Login -> Story -> real Home')

        page.goto(BASE + '/account')
        expect(page.get_by_role('heading', name='Overview', exact=True)).to_be_visible()
        navigation = page.get_by_role('navigation', name='Account navigation')
        expect(navigation.get_by_role('link', name='Overview', exact=False)).to_have_attribute('aria-current', 'page')
        expect(page.get_by_text(email, exact=True)).to_be_visible()
        navigation.get_by_role('link', name='Garage', exact=False).click()
        expect(page.get_by_role('heading', name='My Garage', exact=True)).to_be_visible()
        garage = page.locator('[data-garage16]')
        expect(garage).to_have_attribute('aria-busy', 'false')
        expect(garage.get_by_role('note')).to_contain_text('not saved to MongoDB')
        for version in [1, 2, 3]:
            garage.get_by_role('button', name=re.compile(r'Add vehicle')).first.click()
            dialog = page.get_by_role('dialog', name='Add an NVX')
            expect(dialog.get_by_role('button', name='Cancel', exact=True).first).to_be_focused()
            dialog.get_by_role('radio', name='NVX V' + str(version), exact=True).check()
            dialog.get_by_role('button', name='Add to garage', exact=True).click()
            expect(dialog).to_have_count(0)
            expect(garage.locator('[data-garage-vehicle="yamaha-nvx-v' + str(version) + '"]')).to_be_visible()
        expect(garage.locator('[data-garage-vehicle]')).to_have_count(3)
        expect(garage.get_by_role('button', name=re.compile(r'Add vehicle'))).to_be_disabled()
        expect(garage).to_have_attribute('data-garage-default', 'yamaha-nvx-v1')
        garage.get_by_role('button', name='Preview NVX V2', exact=True).click()
        garage.get_by_role('button', name='Set as default', exact=True).first.click()
        expect(garage).to_have_attribute('data-garage-default', 'yamaha-nvx-v2')
        page.reload()
        expect(garage.locator('[data-garage-vehicle]')).to_have_count(3)
        expect(garage).to_have_attribute('data-garage-default', 'yamaha-nvx-v2')
        expect(page.get_by_label('Year', exact=True)).to_have_count(0)
        users = page.evaluate("JSON.parse(sessionStorage.getItem('dth.flow.rehearsal.v1')).users")
        current = next(user for user in users if user['email'] == email)
        assert set(current['garageVehicleIds']) == {'yamaha-nvx-v1', 'yamaha-nvx-v2', 'yamaha-nvx-v3'}, current
        assert not any('year' in key.lower() for key in current), current
        passed('Garage saves Yamaha NVX V1/V2/V3 and default across F5 without model year')

        card = garage.locator('[data-garage-vehicle="yamaha-nvx-v3"]')
        card.get_by_label('Options for NVX V3', exact=True).click()
        card.get_by_role('button', name='Remove vehicle', exact=True).click()
        dialog = page.get_by_role('dialog', name='Remove NVX V3?')
        expect(dialog.get_by_role('button', name='Cancel', exact=True).first).to_be_focused()
        page.keyboard.press('Escape')
        expect(dialog).to_have_count(0)
        expect(garage.locator('[data-garage-vehicle]')).to_have_count(3)
        passed('Garage removal starts on Cancel and Escape preserves all vehicles')

        # This explicit shopping action selects V1; changing a default alone does not.
        garage.get_by_role('button', name='Preview NVX V1', exact=True).click()
        garage.get_by_role('link', name='Shop matching parts', exact=False).click()
        expect(page).to_have_url(BASE + '/shop?fit=match')
        page.get_by_role('button', name='Quick view Apex Coilover', exact=True).click()
        quick_view = page.get_by_role('dialog')
        expect(quick_view).to_be_visible()
        quick_view.get_by_role('link', name='Open product & 3D').click()
        expect(page).to_have_url(BASE + '/products/apex-suspension')
        expect(page.locator('[data-product-detail] h1')).to_have_text('Apex Coilover')
        page.get_by_label('Quantity', exact=True).select_option('2')
        page.get_by_role('button', name='Add to bag', exact=True).click()
        close_added_cart(page)
        bag = json.loads(page.evaluate("localStorage.getItem('dth.flow.bag.v1')"))
        assert bag == [{'productId': 'apex-suspension', 'vehicleId': 'yamaha-nvx-v1', 'quantity': 2}], bag
        page.goto(BASE + '/bag')
        expect(page.get_by_role('heading', name='Your bag.', exact=True)).to_be_visible()
        page.get_by_role('button', name='Review order', exact=True).click()
        expect(page.get_by_role('heading', name='Review your order.', exact=True)).to_be_focused()
        expect(page.locator('[data-quote-source]')).to_have_attribute('data-quote-source', 'flow')
        continue_checkout = page.get_by_role('button', name='Continue to checkout', exact=True)
        expect(continue_checkout).to_be_disabled()
        page.get_by_role('checkbox').check()
        continue_checkout.click()
        expect(page).to_have_url(BASE + '/checkout')
        expect(page.locator('[data-checkout]')).to_have_attribute('aria-busy', 'false')
        place_order = page.get_by_role('button', name='Place demo order', exact=True)
        expect(place_order).to_be_disabled()
        page.get_by_label('Recipient name', exact=True).fill('Flow Browser Customer')
        page.get_by_label('Phone', exact=True).fill('0900000000')
        expect(page.get_by_label('Email', exact=True)).to_have_value(email)
        page.get_by_label('Address', exact=True).fill('123 Test Studio Street')
        page.get_by_label('City', exact=True).fill('Test City')
        page.get_by_label('Order note', exact=False).fill('Fictitious browser regression order')
        page.get_by_role('checkbox').check()
        expect(place_order).to_be_enabled()
        place_order.click()
        expect(page).to_have_url(re.compile(re.escape(BASE) + r'/order-complete\?order=FLOW-'))
        order_id = parse_qs(urlparse(page.url).query)['order'][0]
        expect(page.get_by_role('heading', name='Your demo order is confirmed.', exact=True)).to_be_visible()
        expect(page.get_by_text('Demo data in this tab only — not MongoDB', exact=True)).to_be_visible()
        expect(page.get_by_role('img', name='Simulated order confirmed')).to_be_visible()
        details = page.get_by_label('Demo checkout details', exact=True)
        expect(details).to_contain_text('Flow Browser Customer')
        expect(details).to_contain_text('123 Test Studio Street')
        expect(page.locator('.dth-receipt-lines')).to_contain_text('Yamaha NVX V1')
        assert json.loads(page.evaluate("localStorage.getItem('dth.flow.bag.v1')")) == []
        capture(page, '02-flow-receipt')
        page.reload()
        expect(page.get_by_role('heading', name='Your demo order is confirmed.', exact=True)).to_be_visible()
        expect(details).to_contain_text('Flow Browser Customer')
        passed('Shop -> Quick View -> Product -> Bag -> Review -> Checkout -> confirmation survives F5')

        page.goto(BASE + '/account?view=orders')
        page.get_by_role('button', name=re.compile(re.escape(order_id))).click()
        expect(page.get_by_role('heading', name='Order detail', exact=True)).to_be_visible()
        expect(page.get_by_text('Apex Coilover', exact=True)).to_be_visible()
        expect(page.get_by_text('Yamaha NVX V1', exact=True)).to_be_visible()
        page.reload()
        expect(page.get_by_text('Apex Coilover', exact=True)).to_be_visible()
        page.get_by_role('button', name=re.compile(r'All orders')).click()
        page.get_by_label('Search orders', exact=True).fill('no matching fixture')
        page.get_by_role('button', name='Search', exact=True).click()
        expect(page.get_by_role('heading', name='No matching orders.', exact=True)).to_be_visible()
        page.get_by_role('button', name='Reset search', exact=True).click()
        expect(page.get_by_role('button', name=re.compile(re.escape(order_id)))).to_be_visible()
        passed('History reopens saved order after F5; search empty state and reset work')

        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            for view in ['', '?view=vehicle', '?view=orders', '?view=security']:
                page.goto(BASE + '/account' + view)
                expect(page.locator('main h1')).to_be_visible()
                expect(page.get_by_role('navigation', name='Account navigation')).to_be_visible()
                no_overflow(page)
            capture(page, '03-account-' + str(width))
        passed('All new Account views fit 320 / 390 / 768 / 1440px')

        page.emulate_media(reduced_motion='reduce')
        page.goto(BASE + '/account?view=vehicle')
        expect(garage).to_have_attribute('data-motion', 'off')
        assert page.locator('[data-motion-panel]').count() == 0 or page.locator('[data-motion-panel]').evaluate(
            'element => element.getAnimations().every(animation => animation.playState !== "running")')
        page.goto(BASE + '/account?view=security')
        delete_button = page.get_by_role('button', name='Delete account', exact=True)
        delete_button.click()
        dialog = page.get_by_role('dialog', name='Delete account?')
        expect(dialog.get_by_role('button', name='Cancel', exact=True)).to_be_focused()
        expect(dialog.get_by_role('button', name='Delete permanently', exact=True)).to_be_disabled()
        page.keyboard.press('Escape')
        expect(dialog).to_have_count(0)
        expect(delete_button).to_be_focused()
        passed('Reduced motion stops Garage/transitions; deletion requires consent and cancels safely')

        sign_out(page)
        screen = access(page)
        expect(screen.get_by_role('heading', name=re.compile(r'Welcome\s+back\.'))).to_be_visible()
        expect(page.get_by_role('navigation', name='Account navigation')).to_have_count(0)
        page.goto(BASE + '/account?return=' + quote('/bag', safe=''))
        sign_in(page, email)
        expect(page).to_have_url(BASE + '/bag')
        expect(page.get_by_role('heading', name='Your bag is empty.', exact=True)).to_be_visible()
        page.goto(BASE + '/account?view=orders')
        expect(page.get_by_role('button', name=re.compile(re.escape(order_id)))).to_be_visible()
        sign_out(page)
        destination = '/account?view=orders&order=' + order_id
        page.goto(BASE + destination)
        sign_in(page, email)
        expect(page).to_have_url(BASE + destination)
        expect(page.get_by_role('heading', name='Order detail', exact=True)).to_be_visible()
        passed('Logout removes member UI; login restores exact bag and saved-order deep links')

        for requested in ['https://example.invalid/stolen', '//example.invalid/stolen', '/admin']:
            sign_out(page)
            page.goto(BASE + '/login?return=' + quote(requested, safe=''))
            sign_in(page, email)
            expect(page).to_have_url(BASE + '/story?intro=1')
            expect(page.locator('[data-story-editorial]')).to_be_visible()
            page.goto(BASE + '/account')
        page.goto(BASE + '/admin')
        expect(page.locator('.dth-admin-gate')).to_contain_text('require API mode')
        expect(page.get_by_role('navigation', name='Admin navigation')).to_have_count(0)
        passed('External/protocol-relative and Admin return routes are rejected for Flow customer')

        rehearsal = page.evaluate("sessionStorage.getItem('dth.flow.rehearsal.v1')")
        assert PASSWORD not in rehearsal and 'wrong password here' not in rehearsal
        assert page.evaluate('Object.keys(localStorage).filter(key => key.startsWith("dth.commerce."))') == []
        assert all(not any('password' in key.lower() for key in user) for user in json.loads(rehearsal)['users'])
        passed('Flow state is separate from API commerce storage and never stores passwords')

        page.goto(BASE + '/account')
        sign_out(page)
        page.goto(BASE + '/login')
        screen = access(page)
        expect(screen).to_have_attribute('data-motion', 'off')
        expect(page.locator('[data-access181-canvas]')).to_have_count(0)
        expect(screen.get_by_role('button', name='Reduced motion', exact=True)).to_be_disabled()
        screen.get_by_role('button', name=re.compile(r'^View in 3D')).click()
        canvas = rendered_login(page)
        # A scene created still does not publish data-running until its running
        # state changes. Verify rendered frames actually stop, including RAF.
        page.wait_for_timeout(150)
        frames = canvas.evaluate('canvas => canvas.__dthRenderCount')
        page.wait_for_timeout(350)
        assert canvas.evaluate('canvas => canvas.dataset.running !== "true"')
        assert canvas.evaluate('canvas => canvas.__dthRenderCount') == frames
        for width in [320, 390, 768, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            expect(screen.get_by_label('Email', exact=True)).to_be_visible()
            expect(screen.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
            no_overflow(page)
        passed('Reduced-motion login uses poster and opt-in real still WebGL; responsive form stays usable')

        assert not api_requests, api_requests
        passed('ZERO real API requests across the complete Flow regression')
        assert not errors, errors
        passed('No uncaught browser exceptions')
    except Exception:
        capture(page, 'failure')
        (OUT / 'failure.html').write_text(page.content(), encoding='utf-8')
        raise
    finally:
        (OUT / 'results.json').write_text(json.dumps({
            'checks': checks, 'browserErrors': errors, 'apiRequests': api_requests,
            'scope': 'Compiled Flow UI, actual native WebGL, no backend or MongoDB',
        }, indent=2), encoding='utf-8')
        browser.close()
