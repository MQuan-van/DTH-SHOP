"""Sign in through the *real* DTH Access181 UI in an isolated compiled Flow browser test.

This helper is exclusively for no-database Playwright regressions. It never writes
session cookies, fakes StoreProvider state, skips authorization or uses an API login.
The genuine access screen and flowSession authenticate the published fictitious user.
The dedicated app_loader.py checks the brand loader separately.
"""
from urllib.parse import quote
from playwright.sync_api import expect


def login_flow(page, base, destination='/shop'):
    """Return a freshly created browser page to its intended guarded deep link."""
    if not destination.startswith('/') or destination.startswith('//') or any(c in destination for c in '#\\\n\r'):
        raise ValueError('A safe same-origin route is required for the regression')
    root = base.rstrip('/')
    page.goto(root + '/login?return=' + quote(destination, safe=''), wait_until='domcontentloaded')
    access = page.locator('[data-access181][data-mode="flow"]')
    expect(access).to_be_visible(timeout=20_000)
    access.get_by_label('Email', exact=True).fill('demo@dth.test')
    access.get_by_label('Password', exact=True).fill('DthFlow2026!')
    access.get_by_role('button', name='Sign in', exact=True).click()
    expect(access).to_have_count(0, timeout=20_000)
    page.wait_for_url(root + destination, timeout=20_000)
    # Subsequent hard navigations in focused Shop/WebGL tests should not replay
    # the independent brand-loader test. This does not change the actual app UX.
    page.evaluate("sessionStorage.setItem('dth.ignition.seen.v1','1')")
