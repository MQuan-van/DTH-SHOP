"""Real compiled React + API + MongoDB, not a static layout mock."""
import json, re, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

out = Path('test-results/account'); out.mkdir(parents=True, exist_ok=True)
base = 'http://127.0.0.1:5000'
email = 'browser-' + uuid.uuid4().hex[:10] + '@example.test'
password = 'Browser test only 27!'
checks, errors = [], []

def checked(name):
    checks.append(name)
    print('PASS:', name, flush=True)

def screenshot(page, name):
    page.screenshot(path=str(out / (name + '.png')), full_page=True)

def no_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Horizontal overflow'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.on('pageerror', lambda err: errors.append(str(err)))
    try:
        page.goto(base + '/account')
        expect(page.get_by_role('heading', name='Welcome back.')).to_be_visible()
        no_overflow(page); screenshot(page, '01-sign-in-desktop')
        checked('Login page renders from the real built React application')
        page.get_by_role('button', name='Create account', exact=True).click()
        page.get_by_label('Email', exact=True).fill(email)
        page.get_by_label('Password', exact=True).fill(password)
        page.get_by_label('Confirm password', exact=True).fill('different password here')
        page.get_by_role('button', name='Create account', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('do not match')
        checked('Mismatched confirmation is blocked before account creation')
        page.get_by_label('Confirm password', exact=True).fill(password)
        page.get_by_role('button', name='Create account', exact=True).click()
        expect(page.get_by_role('heading', name='Your account.')).to_be_visible()
        checked('Register -> authenticated account dashboard')
        page.get_by_role('navigation', name='Account navigation').get_by_role('link', name='Saved vehicle').click()
        page.get_by_label('Make', exact=True).select_option(label='Demo Moto')
        page.get_by_label('Model', exact=True).select_option(label='Street 155')
        page.get_by_label('Year', exact=True).select_option(label='2022')
        page.get_by_role('button', name='Save vehicle', exact=True).click()
        expect(page.get_by_role('status').filter(has_text='Vehicle saved to your account.')).to_be_visible()
        me = context.request.get(base + '/api/shop/auth/me').json()
        assert me['user']['savedVehicleId'] == 'street155-2022'
        screenshot(page, '02-saved-vehicle-desktop')
        checked('Vehicle picker saves through the real API')
        page.reload()
        expect(page.get_by_label('Year', exact=True)).to_have_value('2022')
        expect(page.get_by_role('button', name=re.compile('Street 155'))).to_be_visible()
        checked('Full page reload restores saved vehicle and header selection')
        page.goto(base + '/products/apex-suspension')
        page.get_by_role('button', name='Add to bag', exact=True).click()
        page.goto(base + '/bag')
        page.get_by_role('checkbox').check()
        page.get_by_role('button', name='Place simulated order', exact=True).click()
        page.wait_for_url('**/order-complete*')
        checked('Product -> bag -> simulated checkout creates an order')
        page.goto(base + '/account?view=orders')
        order_button = page.get_by_role('button', name=re.compile(r'DTH-')).first
        expect(order_button).to_be_visible()
        screenshot(page, '03-orders-desktop')
        order_button.click()
        expect(page.get_by_role('heading', name='Order detail.')).to_be_visible()
        expect(page.get_by_text('Apex Coilover', exact=True)).to_be_visible()
        page.reload()
        expect(page.get_by_text('Apex Coilover', exact=True)).to_be_visible()
        screenshot(page, '04-receipt-desktop')
        checked('Persisted receipt loads after F5 via owner-scoped endpoint')
        page.goto(base + '/account')
        expect(page.get_by_role('heading', name='Your account.')).to_be_visible()
        screenshot(page, '05-overview-desktop')
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(page.get_by_role('heading', name='Welcome back.')).to_be_visible()
        assert context.request.get(base + '/api/shop/auth/me').json()['user'] is None
        checked('Logout revokes server session')
        page.goto(base + '/account?return=/bag')
        page.get_by_label('Email', exact=True).fill(email)
        page.get_by_label('Password', exact=True).fill(password)
        page.get_by_role('button', name='Sign in', exact=True).click()
        page.wait_for_url('**/bag')
        checked('Login returns to checkout safely')
        for width in [320, 390, 768]:
            page.set_viewport_size({'width': width, 'height': 900})
            for view in ['', '?view=vehicle', '?view=orders', '?view=security']:
                page.goto(base + '/account' + view)
                expect(page.get_by_role('heading', level=1)).to_be_visible()
                page.wait_for_timeout(400)
                no_overflow(page)
            screenshot(page, 'account-settings-' + str(width))
        checked('Account views have no horizontal overflow at 320 / 390 / 768px')
        page.emulate_media(reduced_motion='reduce')
        page.goto(base + '/account?view=vehicle')
        expect(page.get_by_role('heading', name='Your vehicle.')).to_be_visible()
        assert page.get_by_role('heading', name='Your vehicle.').evaluate("e => getComputedStyle(e.parentElement.parentElement).animationName") == 'none'
        checked('Reduced motion disables account page transition')
        page.goto(base + '/account?view=security')
        page.get_by_role('button', name='Delete account', exact=True).click()
        dialog = page.get_by_role('dialog')
        expect(dialog).to_be_visible()
        expect(dialog.get_by_role('button', name='Cancel', exact=True)).to_be_focused()
        page.keyboard.press('Escape')
        expect(dialog).not_to_be_visible()
        checked('Delete dialog focuses Cancel and Escape closes without deleting')
        assert not errors, errors
        checked('No uncaught browser exceptions during account flows')
    except Exception:
        screenshot(page, 'failure')
        (out / 'failure-page.html').write_text(page.content(), encoding='utf8')
        raise
    finally:
        (out / 'results.json').write_text(json.dumps({'checks': checks, 'browserErrors': errors}, indent=2))
        browser.close()
