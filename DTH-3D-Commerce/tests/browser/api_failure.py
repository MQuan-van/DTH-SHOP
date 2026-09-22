"""An API outage must not silently turn the application into a fixture demo."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
out=Path('test-results/account');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1280,'height':900})
    context.route('**/api/shop/**', lambda route: route.fulfill(status=503,content_type='application/json',body=json.dumps({'message':'Test API unavailable'})))
    page=context.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5000/account')
    expect(page.get_by_role('heading',name='We could not load the store.')).to_be_visible()
    expect(page.get_by_role('alert')).to_contain_text('Test API unavailable')
    expect(page.locator('.dth-demo-banner')).to_contain_text('MONGODB / API MODE')
    assert page.get_by_text('demo@dth.test',exact=True).count()==0
    assert page.locator('[data-account-scene]').count()==0
    assert not errors,errors
    page.screenshot(path=str(out/'api-unavailable.png'),full_page=True)
    (out/'api-failure-isolation.json').write_text(json.dumps({'pass':True,'browserErrors':errors}))
    print('PASS: API outage surfaces an error and never falls back to demo authentication or catalog',flush=True)
    browser.close()
