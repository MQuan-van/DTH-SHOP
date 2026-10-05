"""Compiled Flow integration check. Run after npm run build:flow + npm run preview.
Usage: python tests/browser/app_loader.py --url http://127.0.0.1:4173
No MongoDB, user account or payment changes. Screenshots contain demo data only.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--output', default='test-results/app-loader')
args = parser.parse_args()
base = args.url.rstrip('/')
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
checks = []

def check(name, condition):
    checks.append({'name': name, 'pass': bool(condition)})
    if not condition:
        raise AssertionError(name)

with sync_playwright() as p:
    browser = p.chromium.launch()
    def fresh(reduced=False):
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce' if reduced else 'no-preference')
        page = ctx.new_page()
        return ctx, page
    def finished(page):
        expect(page.locator('[data-dth-app-shell]')).to_have_attribute('data-dth-intro-state', 'complete', timeout=10000)
        expect(page.locator('[data-dth-ignition]')).to_have_count(0)
        check('background inert released', page.locator('[data-dth-app-shell]').evaluate('(e) => !e.inert'))
        check('body scroll restored', page.evaluate("document.body.style.overflow !== 'hidden'"))

    ctx, page = fresh()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(base + '/shop', wait_until='domcontentloaded')
    expect(page.locator('[data-dth-ignition]')).to_be_visible(timeout=10000)
    check('app is mounted while logo is visible', page.locator('#dth-content').count() == 1)
    page.evaluate("document.querySelector('[data-dth-app-shell]').__mountToken='retained'")
    page.get_by_role('button', name='Skip intro').click()
    finished(page)
    check('same app DOM after intro', page.evaluate("document.querySelector('[data-dth-app-shell]').__mountToken === 'retained'"))
    check('only intro session key added', page.evaluate("sessionStorage.getItem('dth.ignition.seen.v1') === '1'"))
    page.reload(wait_until='domcontentloaded')
    finished(page)
    check('reload in same tab does not replay', page.locator('[data-dth-app-shell]').get_attribute('data-dth-intro-reason') == 'not-shown')
    page.get_by_role('navigation', name='Main navigation').get_by_role('link', name='Studio', exact=True).click()
    finished(page)
    check('normal routes still work', page.url.rstrip('/') == base)
    check('no runtime errors in this Flow run', not errors)
    ctx.close()

    ctx, page = fresh()
    page.goto(base + '/shop', wait_until='domcontentloaded')
    expect(page.locator('[data-dth-ignition]')).to_be_visible(timeout=10000)
    page.screenshot(path=str(out / 'intro-desktop.png'))
    finished(page)
    check('natural entry exits normally', page.locator('[data-dth-app-shell]').get_attribute('data-dth-intro-reason') == 'ready')
    ctx.close()

    ctx, page = fresh()
    page.route('**/branding/dth-logo-original.png', lambda route: route.abort())
    page.goto(base + '/shop', wait_until='domcontentloaded')
    finished(page)
    check('failed logo cannot hide app', page.locator('[data-dth-app-shell]').get_attribute('data-dth-intro-reason') == 'logo-error')
    ctx.close()

    ctx, page = fresh(True)
    page.goto(base + '/shop', wait_until='domcontentloaded')
    finished(page)
    check('reduced motion finishes without replay requirement', page.locator('[data-dth-app-shell]').get_attribute('data-dth-intro-reason') == 'ready')
    ctx.close()

    for path in ['/account', '/bag', '/admin']:
        ctx, page = fresh()
        page.goto(base + path, wait_until='domcontentloaded')
        finished(page)
        check('intro bypass on '+path, page.locator('[data-dth-app-shell]').get_attribute('data-dth-intro-reason') == 'not-shown')
        ctx.close()
    browser.close()

(out / 'results.json').write_text(json.dumps(checks, indent=2))
print(f'{len(checks)} loader browser assertions passed.')
