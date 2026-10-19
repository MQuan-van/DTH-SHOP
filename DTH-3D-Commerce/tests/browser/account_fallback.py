"""Compiled Flow: Access181 poster, genuine WebGL retry and usable no-WebGL login."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get('DTH_FLOW_URL', 'http://127.0.0.1:4173').rstrip('/')
OUT = Path('test-results/account-flow')
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, api_requests = [], [], []
expect.set_options(timeout=20_000)


def passed(name):
    checks.append(name)
    print('PASS:', name, flush=True)


def fills_stage(page):
    stage = page.get_by_role('region', name='DTH brand sculpture', exact=True)
    expect(stage).to_be_visible()
    expect(stage).to_have_attribute('data-ready', 'false')
    poster = stage.locator('.dth-access181-poster')
    expect(poster).to_be_visible()
    sizes = poster.evaluate('''element => {
      const box = element.getBoundingClientRect();
      const parent = element.parentElement.getBoundingClientRect();
      const image = element.querySelector('img');
      const imageBox = image.getBoundingClientRect();
      return { width: box.width, height: box.height, parentWidth: parent.width,
        parentHeight: parent.height, imageWidth: imageBox.width,
        loaded: image.complete && image.naturalWidth > 0 };
    }''')
    assert sizes['parentWidth'] > 100 and sizes['parentHeight'] > 100, sizes
    assert abs(sizes['width'] - sizes['parentWidth']) <= 1, sizes
    assert abs(sizes['height'] - sizes['parentHeight']) <= 1, sizes
    assert sizes['loaded'] and sizes['imageWidth'] > sizes['parentWidth'] * .5, sizes


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=[
        '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    ])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    # Only unsupported capability is simulated. Retry uses original getContext
    # and must render real WebGL. No renderer or ready flags are mocked.
    context.add_init_script('''
      const original = HTMLCanvasElement.prototype.getContext;
      window.__dthBlockWebGL = true;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        if (window.__dthBlockWebGL && ['webgl', 'webgl2', 'experimental-webgl'].includes(type)) return null;
        return original.call(this, type, ...args);
      };
    ''')
    context.on('request', lambda request: api_requests.append(request.url)
               if '/api/' in urlparse(request.url).path else None)
    page = context.new_page()
    page.set_default_timeout(20_000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(BASE + '/login?return=%2Faccount')
        screen = page.locator('[data-access181][data-mode="flow"]')
        expect(screen.get_by_role('heading', name=re.compile(r'Welcome\s+back\.'))).to_be_visible()
        expect(screen.get_by_role('button', name=re.compile(r'^Retry 3D'))).to_be_visible()
        fills_stage(page)
        expect(screen.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
        page.screenshot(path=str(OUT / '05-fallback-login-desktop.png'), full_page=True)
        passed('WebGL unavailable: actual Access181 poster fills stage and login stays enabled')

        page.evaluate('window.__dthBlockWebGL = false')
        screen.get_by_role('button', name=re.compile(r'^Retry 3D')).click()
        canvas = page.locator('[data-access181-canvas]')
        expect(canvas).to_have_attribute('data-ready', 'true')
        assert canvas.evaluate('canvas => canvas.__dthRenderCount > 0'), 'Retry did not render actual WebGL'
        expect(page.get_by_role('region', name='DTH brand sculpture', exact=True)).to_have_attribute('data-ready', 'true')
        passed('Retry creates genuinely rendered native WebGL after capability returns')

        canvas.evaluate("canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
        expect(screen.get_by_role('button', name=re.compile(r'^Retry 3D'))).to_be_visible()
        fills_stage(page)
        expect(screen.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
        passed('Real WebGL context loss returns to usable poster without hiding login')

        screen.get_by_label('Email', exact=True).fill('demo@dth.test')
        screen.get_by_label('Password', exact=True).fill('DthFlow2026!')
        screen.get_by_role('button', name='Sign in', exact=True).click()
        expect(page).to_have_url(BASE + '/account')
        expect(page.get_by_role('heading', name='Overview', exact=True)).to_be_visible()
        expect(page.get_by_role('navigation', name='Account navigation')).to_be_visible()
        page.screenshot(path=str(OUT / '06-fallback-overview-desktop.png'), full_page=True)
        passed('Sign in reaches current Account Overview even after WebGL failure')

        page.set_viewport_size({'width': 390, 'height': 844})
        page.get_by_role('button', name='Sign out', exact=True).click()
        expect(screen.get_by_role('heading', name=re.compile(r'Welcome\s+back\.'))).to_be_visible()
        expect(screen.get_by_role('button', name='Sign in', exact=True)).to_be_enabled()
        expect(page.locator('[data-access181-canvas]')).to_have_count(0)
        fills_stage(page)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        page.screenshot(path=str(OUT / '07-fallback-login-mobile.png'), full_page=True)
        passed('Mobile login retains sized poster and usable form without automatic 3D')

        page.emulate_media(reduced_motion='reduce')
        expect(screen).to_have_attribute('data-motion', 'off')
        assert screen.evaluate('element => element.getAnimations({subtree:true}).every(animation => animation.playState !== "running")')
        expect(screen.get_by_role('button', name='Reduced motion', exact=True)).to_be_disabled()
        passed('Fallback login respects reduced motion')
        assert not errors, errors
        assert not api_requests, api_requests
        passed('Fallback flow has zero real API requests and no uncaught exceptions')
    except Exception:
        page.screenshot(path=str(OUT / 'fallback-failure.png'), full_page=True)
        (OUT / 'fallback-failure.html').write_text(page.content(), encoding='utf-8')
        raise
    finally:
        (OUT / 'fallback-regression.json').write_text(json.dumps({
            'checks': checks, 'browserErrors': errors, 'apiRequests': api_requests,
        }, indent=2), encoding='utf-8')
        browser.close()
