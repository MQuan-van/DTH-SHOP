"""Read-only smoke test of the real running DTH Account. Never creates/deletes data.
Requires Python + Playwright. Authentication happens in a separate test browser;
keep --storage-state files OUTSIDE the repository. Screenshots may contain account data.
"""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-url', default='http://127.0.0.1:5173')
    parser.add_argument('--headed', action='store_true')
    parser.add_argument('--storage-state', type=Path)
    parser.add_argument('--out', type=Path, default=Path.home() / 'DTH-QA' / 'account22a')
    args = parser.parse_args()
    url = urlparse(args.base_url)
    if url.scheme not in ('http', 'https') or url.hostname not in ('localhost', '127.0.0.1', '::1'):
        parser.error('This test is restricted to your local application.')
    args.out.mkdir(parents=True, exist_ok=True)
    report, errors, requests = [], [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not args.headed)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                      storage_state=str(args.storage_state) if args.storage_state else None)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: requests.append(r.url) if '.glb' in r.url else None)
        try:
            page.goto(args.base_url.rstrip('/') + '/account', wait_until='domcontentloaded')
            if args.headed:
                print('Sign in in the opened test browser. No credentials are recorded by this script.')
            try:
                page.locator('[data-account-one]').wait_for(state='visible', timeout=180000 if args.headed else 15000)
            except PlaywrightTimeoutError:
                raise RuntimeError('Not signed in, or Account ONE is not installed. Use --headed or a private --storage-state file. Not a PASS.')
            assert page.locator('[data-one-header]').count() == 1
            report.append({'check': 'one shared header', 'result': 'pass'})
            page.screenshot(path=str(args.out / 'overview.png'), full_page=True)
            stage = page.locator('[data-account-vehicle]')
            try:
                page.wait_for_function("() => ['ready','missing','error'].includes(document.querySelector('[data-account-vehicle]')?.dataset.state)", timeout=110000)
            except PlaywrightTimeoutError:
                raise RuntimeError('Vehicle stage never settled; inspect its loading/asset error before accepting this build.')
            ready = stage.get_attribute('data-state') == 'ready'
            old_canvas = page.locator('.aa22-vehicle-host canvas').element_handle() if ready else None
            count_before = len(requests)
            nav = page.get_by_role('navigation', name='Account navigation', exact=True)
            nav.get_by_role('link', name='Garage', exact=True).click()
            page.wait_for_url('**/account?view=vehicle')
            page.wait_for_timeout(900)
            assert page.locator('[data-account-one]').get_attribute('data-view') == 'vehicle'
            if ready:
                assert page.evaluate('(previous) => document.querySelector(".aa22-vehicle-host canvas") === previous', old_canvas)
                assert len(requests) == count_before, 'Same vehicle fetched again merely on a view switch.'
                report.append({'check': 'same renderer and no GLB request on Overview→Garage', 'result': 'pass'})
                page.get_by_role('button', name='Explore 3D', exact=True).click()
                assert stage.get_attribute('data-inspecting') == 'true'
                page.get_by_role('button', name='Zoom vehicle in', exact=True).click()
                page.wait_for_timeout(750)
                page.keyboard.press('Escape')
                assert stage.get_attribute('data-inspecting') == 'false'
                page.get_by_role('button', name='Reset vehicle view', exact=True).click()
                report.append({'check': 'inspection controls + Escape + Reset', 'result': 'pass'})
            else:
                report.append({'check': 'real WebGL camera/continuity', 'result': 'NOT VERIFIED', 'reason': stage.get_attribute('data-state')})
            page.screenshot(path=str(args.out / 'garage.png'), full_page=True)
            for name, view in [('Orders', 'orders'), ('Profile', 'security'), ('Overview', 'overview')]:
                nav.get_by_role('link', name=name, exact=True).click()
                page.wait_for_timeout(550)
                assert page.locator('[data-account-one]').get_attribute('data-view') == view
                page.screenshot(path=str(args.out / f'{view}.png'), full_page=True)
            if ready:
                assert page.evaluate('(previous) => document.querySelector(".aa22-vehicle-host canvas") === previous', old_canvas)
                report.append({'check': 'renderer retained through data views', 'result': 'pass'})
            light = page.locator('.aa22-light-primary')
            before = light.evaluate('(el) => getComputedStyle(el).transform')
            page.mouse.move(1170, 550)
            page.wait_for_timeout(350)
            after = light.evaluate('(el) => getComputedStyle(el).transform')
            assert before != after, 'Pointer atmosphere did not respond.'
            report.append({'check': 'pointer atmosphere responds', 'result': 'pass'})
            page.emulate_media(reduced_motion='reduce')
            page.wait_for_timeout(150)
            assert light.evaluate('(el) => getComputedStyle(el).transform') == 'none'
            report.append({'check': 'reduced motion disables light transforms', 'result': 'pass'})
            page.set_viewport_size({'width': 390, 'height': 844})
            page.wait_for_timeout(300)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            page.get_by_role('button', name='Open navigation', exact=True).click()
            assert page.get_by_role('navigation', name='Main navigation', exact=True).is_visible()
            page.keyboard.press('Escape')
            assert page.get_by_role('button', name='Open navigation', exact=True).get_attribute('aria-expanded') == 'false'
            page.screenshot(path=str(args.out / 'mobile.png'), full_page=True)
            report.append({'check': 'mobile layout and keyboard menu', 'result': 'pass'})
            assert not errors, 'Application page errors: ' + '; '.join(errors)
            report.append({'check': 'no uncaught application exception', 'result': 'pass'})
        except Exception as error:
            report.append({'check': 'smoke test', 'result': 'FAIL', 'reason': str(error)})
        finally:
            (args.out / 'report.json').write_text(json.dumps({'checks': report, 'errors': errors, 'glbRequests': requests,
                'notTested': ['FPS/GPU benchmark', 'mutating garage API', 'account deletion', 'payments', 'real fitment']}, indent=2), encoding='utf-8')
            context.close()
            browser.close()
    print(json.dumps(report, indent=2))
    return 1 if any(x['result'] == 'FAIL' for x in report) else 2 if any(x['result'] == 'NOT VERIFIED' for x in report) else 0


if __name__ == '__main__':
    sys.exit(main())
