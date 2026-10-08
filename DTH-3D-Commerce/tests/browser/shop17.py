"""Read-only regression for a compiled, RUNNING Flow site.
python tests/browser/shop17.py --url http://127.0.0.1:4173
Requires Playwright Python + Chromium; no DB, accounts or orders are changed.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4173');p.add_argument('--out',default='test-results/shop17');a=p.parse_args()
out=Path(a.out);out.mkdir(parents=True,exist_ok=True);checks=[]
def check(name,ok):
    assert ok,name
    checks.append(name)
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':1000})
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1')")
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(a.url.rstrip('/')+'/shop',wait_until='domcontentloaded')
    expect(page.locator('[data-shop-ux="17"]')).to_be_visible()
    check('scoped Shop rendered',True)
    for width in [1440,1024,768,390,360,320]:
        page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(400)
        check(f'no horizontal document overflow {width}',page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
    page.set_viewport_size({'width':1440,'height':1000})
    page.locator('[data-ux17-filter-button]').click()
    expect(page.get_by_role('dialog')).to_be_visible()
    page.keyboard.press('Escape');expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.locator('[data-ux17-filter-button]')).to_be_focused();check('filters restore keyboard focus',True)
    categories=page.get_by_role('group',name='Product categories')
    categories.get_by_role('button').nth(1).click()
    expect(categories.get_by_role('button').nth(1)).to_have_attribute('aria-pressed','true')
    check('category encoded in URL','category=' in page.url)
    categories.get_by_role('button',name='All categories',exact=True).click()
    expect(page.locator('.ux17-card').first).to_be_visible()
    quick=page.locator('.ux17-quick').first;quick.click();expect(page.get_by_role('dialog')).to_be_visible()
    page.keyboard.press('Escape');expect(page.get_by_role('dialog')).to_have_count(0);expect(quick).to_be_focused()
    check('quick view stays separate and restores focus',True)
    page.screenshot(path=str(out/'shop-desktop.png'),full_page=True)
    page.locator('.ux17-card h3 a').first.click()
    expect(page.locator('[data-product-ux="17"]')).to_be_visible()
    tools=page.locator('#dth-product-tools');check('advanced tools start closed',tools.evaluate('e=>!e.open'))
    specs=page.locator('#dth-product-specs > summary');specs.focus();page.keyboard.press('Space')
    expect(page.locator('#dth-product-specs')).to_have_attribute('open','')
    check('keyboard opens specifications',True)
    page.locator('#dth-product-tools > summary').click()
    expect(page.get_by_role('group',name='3D study mode')).to_be_visible()
    check('3D tools can be opened',True)
    page.emulate_media(reduced_motion='reduce');page.locator('#dth-product-about > summary').click()
    check('reduced motion stops disclosure animation',page.locator('#dth-product-about .ux17-disclosure-body').evaluate("e=>getComputedStyle(e).animationName==='none'"))
    page.screenshot(path=str(out/'product-desktop.png'),full_page=True)
    check('no page JavaScript errors',not errors)
    browser.close()
(out/'results.json').write_text(json.dumps({'checks':checks,'scope':'compiled-site read-only browser test; no purchase/API persistence proof'},indent=2))
print(f'{len(checks)} browser checks passed.')
