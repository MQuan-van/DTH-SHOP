"""Step 15 compiled-Flow contract. Run only against a local Flow build, NOT the live API.
Example: python tests/browser/nvx_step15.py --url http://127.0.0.1:4173 --require-3d
Requires existing Playwright Python + Chromium. No database writes or real account credentials.
This script is supplied for the user's full app. It was NOT run against the full repository in the authoring environment.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--out', default='test-results/nvx-step15')
parser.add_argument('--require-3d', action='store_true')
parser.add_argument('--browser', default=None, help='Optional Chromium executable path.')
a = parser.parse_args()
base = a.url.rstrip('/')
if urlsplit(base).hostname not in ('127.0.0.1', 'localhost', '::1'):
    raise SystemExit('Use a localhost compiled Flow build only.')
out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
checks, errors = [], []
def check(label, passed):
    if not passed:
        raise AssertionError(label)
    checks.append(label)
try:
    with sync_playwright() as p:
        options = {'headless': True}
        if a.browser:
            options['executable_path'] = a.browser
        browser = p.chromium.launch(**options)
        context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(base + '/shop', wait_until='domcontentloaded')
        # Fail before login or other writes unless explicit no-database Flow mode is visible.
        expect(page.get_by_text('FLOW DEMO / NO DATABASE', exact=True)).to_be_visible()
        expect(page.locator('[data-dth-ignition]')).to_have_count(0, timeout=10000)
        rail = page.get_by_role('group', name='Quick NVX selection')
        expect(rail).to_be_visible()
        check('Exactly three quick-select versions', rail.get_by_role('button').count() == 3)
        rail.get_by_role('button', name='NVX V1').click()
        expect(rail.get_by_role('button', name='NVX V1')).to_have_attribute('aria-pressed','true')
        page.locator('button.dth-vehicle-button').click()
        dialog = page.get_by_role('dialog', name='Choose your Yamaha NVX')
        expect(dialog).to_be_visible()
        check('Picker is version-only', dialog.get_by_role('radio').count() == 3 and dialog.locator('select').count() == 0)
        dialog.get_by_role('radio', name='NVX V3', exact=True).check()
        page.keyboard.press('Escape')
        expect(dialog).to_have_count(0)
        expect(rail.get_by_role('button',name='NVX V1')).to_have_attribute('aria-pressed','true')
        check('Cancelled picker leaves committed version untouched', True)
        page.goto(base + '/account', wait_until='domcontentloaded')
        expect(page.get_by_text('FLOW DEMO / NO DATABASE', exact=True)).to_be_visible()
        page.get_by_label('Email', exact=True).fill('demo@dth.test')
        page.get_by_label('Password', exact=True).fill('DthFlow2026!')
        page.get_by_role('button',name='Sign in',exact=True).click()
        expect(page.get_by_role('button',name='Sign in',exact=True)).to_have_count(0)
        page.goto(base + '/account?view=vehicle', wait_until='domcontentloaded')
        garage = page.locator('[data-nvx-garage]')
        expect(garage).to_be_visible()
        garage.get_by_role('radio', name='NVX V2', exact=True).check()
        garage.get_by_role('button', name='Save as my default NVX').click()
        expect(garage.get_by_text('NVX saved in this demo tab.', exact=True)).to_be_visible()
        page.reload(wait_until='domcontentloaded')
        expect(garage.get_by_role('radio',name='NVX V2',exact=True)).to_be_checked()
        check('Saved Flow version survives reload', True)
        check('Garage has no year select or undefined label', garage.locator('select').count() == 0 and 'undefined' not in garage.inner_text())
        if a.require_3d:
            expect(garage.get_by_text('Interactive 3D ready',exact=True)).to_be_visible(timeout=30000)
            check('Existing GLB viewer reaches ready state', garage.locator('canvas').count() > 0)
            garage.get_by_role('button',name='Rotate left',exact=True).click()
            garage.get_by_role('button',name='Reset view',exact=True).click()
            check('Existing 3D view controls respond without an immediate page error', not errors)
        for width,height in [(1440,1000),(768,1024),(390,844),(360,800)]:
            page.set_viewport_size({'width':width,'height':height})
            check(f'No horizontal overflow {width}', page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
        page.screenshot(path=str(out/'garage-mobile.png'),full_page=True)
        check('No uncaught page errors', not errors)
        browser.close()
    report={'passed':len(checks),'checks':checks,'errors':errors,'mode':'compiled Flow; no live database','webgl_ready_checked':a.require_3d}
    (out/'results.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
except Exception as error:
    (out/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'failure':str(error)},indent=2))
    raise
