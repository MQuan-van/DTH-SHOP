"""Optional real React/Flow browser regression. No application DB or real credentials.
Build Flow then preview it; run: python tests/browser/garage16.py --url http://127.0.0.1:4173
Requires existing Playwright Python + Chromium. Fails closed on a non-Flow app.
"""
import argparse,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4173');p.add_argument('--out',default='test-results/garage16');a=p.parse_args()
out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
checks=[]
def check(label,result=True):
    if not result: raise AssertionError(label)
    checks.append(label)
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='no-preference')
    page=context.new_page();errors=[];api=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:api.append(r.url) if '/api/shop' in r.url else None)
    page.goto(a.url.rstrip('/')+'/account')
    expect(page.get_by_text('FLOW DEMO / NO DATABASE',exact=True)).to_be_visible()
    page.get_by_label('Email',exact=True).fill('demo@dth.test')
    page.get_by_label('Password',exact=True).fill('DthFlow2026!')
    page.get_by_role('button',name='Sign in',exact=True).click()
    page.get_by_role('navigation',name='Account navigation').get_by_role('link',name='Garage',exact=True).click()
    root=page.locator('[data-garage16]');expect(root).to_have_attribute('aria-busy','false')
    check('empty garage',root.locator('[data-garage-vehicle]').count()==0)
    def add(version):
        root.get_by_role('button',name=re.compile('Add vehicle')).first.click()
        dialog=page.get_by_role('dialog',name='Add an NVX')
        dialog.get_by_role('radio',name=version,exact=False).check()
        dialog.get_by_role('button',name='Add to garage').click()
        expect(dialog).to_have_count(0)
        expect(root).to_have_attribute('aria-busy','false')
    add('NVX V2');expect(root).to_have_attribute('data-garage-default','yamaha-nvx-v2');check('first add defaults V2')
    add('NVX V1');expect(root).to_have_attribute('data-garage-default','yamaha-nvx-v2');check('second add keeps default')
    page.reload();expect(root).to_have_attribute('aria-busy','false')
    expect(root.locator('[data-garage-vehicle]')).to_have_count(2);check('Flow tab survives reload; not MongoDB proof')
    root.get_by_role('button',name='Preview NVX V1').click()
    root.get_by_role('button',name='Set as default',exact=True).first.click()
    expect(root).to_have_attribute('data-garage-default','yamaha-nvx-v1');check('default changes explicitly')
    v1=root.locator('[data-garage-vehicle="yamaha-nvx-v1"]')
    v1.locator('summary').click();v1.get_by_role('button',name='Remove vehicle').click()
    confirm=page.get_by_role('dialog',name='Remove NVX V1?');expect(confirm).to_be_visible()
    page.keyboard.press('Escape');expect(confirm).to_have_count(0)
    expect(root.locator('[data-garage-vehicle]')).to_have_count(2);check('Escape cancels removal')
    v1.locator('summary').click();v1.get_by_role('button',name='Remove vehicle').click()
    page.get_by_role('dialog',name='Remove NVX V1?').get_by_role('button',name='Remove vehicle').click()
    expect(root).to_have_attribute('data-garage-default','');expect(root.locator('[data-garage-vehicle]')).to_have_count(1)
    check('removing default clears it without choosing another')
    for width,height in [(1440,1000),(768,1024),(390,844),(320,740)]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(350)
        check(f'no horizontal overflow at {width}',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(out/f'garage-{width}.png'),full_page=True)
    page.emulate_media(reduced_motion='reduce');expect(root).to_have_attribute('data-motion','off');check('reduced motion state')
    check('Flow makes no shop API calls',not api)
    check('no uncaught browser errors',not errors)
    browser.close()
(out/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'mode':'compiled Flow; no live MongoDB'},indent=2))
print(f'{len(checks)} garage browser assertions passed')
