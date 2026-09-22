"""Compiled FLOW UI: verify usable, correctly sized artwork without WebGL."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('DTH_FLOW_URL', 'http://127.0.0.1:4173')
OUT = Path('test-results/account-flow')
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, api_requests = [], [], []


def passed(name):
    checks.append(name)
    print('PASS:', name, flush=True)


def fills_stage(page):
    stage = page.locator('[data-account-scene=fallback]')
    expect(stage).to_be_visible()
    sizes = stage.evaluate('''element => {
      const svg = element.querySelector(':scope > [data-hidden] > svg');
      if (!svg) throw new Error('Missing account fallback SVG');
      const box = svg.getBoundingClientRect();
      const parent = svg.parentElement.getBoundingClientRect();
      return { width: box.width, height: box.height,
               parentWidth: parent.width, parentHeight: parent.height };
    }''')
    assert sizes['parentWidth'] > 100 and sizes['parentHeight'] > 100, sizes
    assert abs(sizes['width'] - sizes['parentWidth']) <= 1, sizes
    assert abs(sizes['height'] - sizes['parentHeight']) <= 1, sizes


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce'
    )
    context.add_init_script('''
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
        return original.call(this, type, ...args);
      };
    ''')
    page = context.new_page()
    page.set_default_timeout(18000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: api_requests.append(request.url)
            if '/api/shop/' in request.url else None)
    try:
        page.goto(BASE + '/account')
        expect(page.get_by_role('heading', name='Welcome back.')).to_be_visible()
        fills_stage(page)
        page.screenshot(path=str(OUT / '05-fallback-login-desktop.png'), full_page=True)
        passed('Login fallback fills the studio, not the global 21px icon size')

        page.get_by_label('Email', exact=True).fill('demo@dth.test')
        page.get_by_label('Password', exact=True).fill('DthFlow2026!')
        page.get_by_role('button', name='Sign in', exact=True).click()
        expect(page.get_by_role('heading', name='Your account.')).to_be_visible()
        passed('Sign in remains usable without WebGL')

        fills_stage(page)
        page.screenshot(path=str(OUT / '06-fallback-overview-desktop.png'), full_page=True)
        passed('Compact account fallback fills its own container')

        page.set_viewport_size({'width': 390, 'height': 844})
        expect(page.locator('[data-account-scene]')).not_to_be_visible()
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(page.get_by_role('heading', name='Welcome back.')).to_be_visible()
        expect(page.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
        expect(page.locator('[data-account-scene]')).not_to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        passed('Decorative fallback hides on mobile while the form stays usable')

        assert not errors, errors
        assert not api_requests, api_requests
        passed('Fallback flow has zero API requests and no uncaught exceptions')
    except Exception:
        page.screenshot(path=str(OUT / 'fallback-failure.png'), full_page=True)
        raise
    finally:
        (OUT / 'fallback-regression.json').write_text(json.dumps({
            'checks': checks, 'browserErrors': errors, 'apiRequests': api_requests
        }, indent=2), encoding='utf-8')
        browser.close()
