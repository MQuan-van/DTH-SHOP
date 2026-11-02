"""Read-only acceptance probe for the running Step 23 app, not executed in this package build.
No account/garage/order writes. A private storage-state may be supplied OUTSIDE Git.
Requires Python 3 + Playwright and a local browser. Application auth must already work.
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as BrowserTimeout


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--base-url', default='http://127.0.0.1:5173')
    p.add_argument('--headed', action='store_true')
    p.add_argument('--storage-state', type=Path)
    p.add_argument('--out', type=Path, default=Path.home() / 'DTH-QA' / 'spatial23')
    args = p.parse_args()
    parsed = urlparse(args.base_url)
    if parsed.scheme not in ('http', 'https') or parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
        p.error('Only the local application is accepted.')
    args.out.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []
    def record(name, result='PASS', note=''):
        checks.append(dict(check=name, result=result, note=note))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, storage_state=str(args.storage_state) if args.storage_state else None)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(args.base_url.rstrip('/') + '/shop?mode=build', wait_until='domcontentloaded')
            if args.headed:
                print('Sign in in the test browser if requested. No credentials are recorded.')
            page.locator('[data-commerce-build]').wait_for(timeout=180000 if args.headed else 30000)
            assert page.locator('header.c23-header').count() == 1
            assert page.get_by_role('navigation', name='Main navigation', exact=True).get_by_role('link', name='Build', exact=True).get_attribute('aria-current') == 'page'
            record('Build uses one integrated shared header')
            try:
                page.wait_for_function("() => document.querySelector('.c23-vehicle-stage')?.dataset.ready === 'true' || /not been supplied|failed|timed out|context|WebGL|incomplete|Git LFS/i.test(document.querySelector('.c23-scene-status')?.innerText || '')", timeout=120000)
            except BrowserTimeout:
                record('Vehicle load settled', 'NOT VERIFIED', 'Loading did not settle before timeout.')
            ready = page.locator('.c23-vehicle-stage').get_attribute('data-ready') == 'true'
            if ready:
                canvas = page.locator('canvas[data-spatial-vehicle="23"]').element_handle()
                page.get_by_role('button', name='Rotate vehicle', exact=True).click()
                assert page.locator('.c23-vehicle-stage').get_attribute('data-orbit') == 'true'
                page.get_by_role('button', name='Zoom in', exact=True).click()
                page.wait_for_timeout(500)
                page.get_by_role('button', name='Full vehicle', exact=True).click()
                assert page.locator('.c23-vehicle-stage').get_attribute('data-orbit') == 'false'
                assert page.evaluate('(c) => c === document.querySelector("canvas[data-spatial-vehicle]")', canvas)
                record('Real renderer / orbit / reset retain one canvas')
                page.get_by_role('navigation', name='Vehicle systems', exact=True).get_by_role('button', name='Suspension', exact=False).click()
                page.wait_for_timeout(900)
                assert page.evaluate('(c) => c === document.querySelector("canvas[data-spatial-vehicle]")', canvas)
                record('Category selection does not remount vehicle canvas')
                count = page.locator('.c23-callouts button:visible').count()
                record('Authored focus points', 'PASS' if count else 'NOT VERIFIED', 'Visible points still require semantic visual review.' if count else 'No visible calibrated points; use the admin local focus editor. Do not count this as hotspot acceptance.')
            else:
                record('Real GLB camera and focus', 'NOT VERIFIED', 'Renderer did not report ready; inspect model or WebGL state.')
            page.screenshot(path=str(args.out / 'build-desktop.png'), full_page=True)
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(500)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.get_by_role('button', name='Open menu', exact=True).click()
            assert page.get_by_role('navigation', name='Main navigation', exact=True).is_visible()
            page.keyboard.press('Escape')
            assert page.get_by_role('button', name='Open menu', exact=True).get_attribute('aria-expanded') == 'false'
            page.screenshot(path=str(args.out / 'build-mobile.png'), full_page=True)
            record('Mobile layout/menu/keyboard Escape')
            page.set_viewport_size({'width': 1440, 'height': 1000})
            page.goto(args.base_url.rstrip('/') + '/account', wait_until='domcontentloaded')
            try:
                page.locator('.c23-account').wait_for(timeout=20000)
                nav = page.get_by_role('navigation', name='Account navigation', exact=True)
                for name in ('Garage', 'Orders', 'Profile', 'Overview'):
                    nav.get_by_role('link', name=name, exact=True).click()
                    page.wait_for_timeout(350)
                record('Account tabs use the revised shell')
                page.screenshot(path=str(args.out / 'account.png'), full_page=True)
            except BrowserTimeout:
                record('Authenticated Account', 'NOT VERIFIED', 'No authenticated account or new member shell visible.')
            assert not errors, '\n'.join(errors)
            record('No uncaught application page errors')
        except Exception as error:
            record('Acceptance probe', 'FAIL', str(error))
        finally:
            (args.out / 'report.json').write_text(json.dumps({'checks': checks, 'pageErrors': errors, 'notTested': ['GPU frame-time benchmark', 'semantic correctness of authored points', 'physical fitting', 'saving/deleting user data', 'checkout']}, ensure_ascii=False, indent=2), encoding='utf-8')
            context.close()
            browser.close()
    print(json.dumps(checks, ensure_ascii=False, indent=2))
    return 1 if any(c['result'] == 'FAIL' for c in checks) else 2 if any(c['result'] == 'NOT VERIFIED' for c in checks) else 0


if __name__ == '__main__':
    raise SystemExit(main())
