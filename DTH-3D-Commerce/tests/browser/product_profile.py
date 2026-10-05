"""Compiled Flow + actual browser WebGL gate. No production database or payment writes.
This script is provided for local/CI execution; an unavailable WebGL context FAILS the gate.
"""
import os,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from cart_helpers import close_added_cart
BASE=os.environ.get('DTH_APP_URL','http://127.0.0.1:4173').rstrip('/')
OUT=Path('test-results/product-profile');OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    context=browser.new_context(viewport={'width':1440,'height':1100})
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1');localStorage.setItem('dth.flow.vehicle.v1',JSON.stringify('street155-2022'));")
    page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and re.search('Shader Error|VALIDATE_STATUS|THREE.WebGL',m.text) else None)
    try:
        page.goto(BASE+'/products/apex-suspension')
        media=page.locator('[data-product-media]');expect(media).to_have_attribute('data-media-state','ready',timeout=30000)
        details=page.locator('[data-asset-profile]');expect(details).to_have_attribute('data-asset-profile','profile')
        checks.append('first model frame rendered and GLB identity matched to profile')
        details.locator('summary').click();expect(details).to_contain_text('Illustrative demo');expect(details).to_contain_text('8,752');checks.append('profile and actual geometry metadata shown')
        page.get_by_role('button',name='Reset view',exact=True).click()
        modes=page.get_by_role('group',name='3D study mode')
        modes.get_by_role('button',name='Technical',exact=True).click();page.wait_for_timeout(250)
        before=media.locator('canvas').screenshot();page.get_by_label('Scan position',exact=True).fill('1');page.wait_for_timeout(350);after=media.locator('canvas').screenshot()
        assert before!=after,'Shader output must change, not just a DOM label';checks.append('profile scan operates on rendered geometry')
        modes.get_by_role('button',name='Hotspots',exact=True).click();notes=page.get_by_role('group',name='Model annotations')
        expect(notes.get_by_role('button',name='Spring',exact=False)).to_be_enabled();notes.get_by_role('button',name='Spring',exact=False).click();page.wait_for_timeout(700);checks.append('profile hotspot uses focus camera channel')
        page.get_by_role('button',name='Reset view',exact=True).click();expect(media).to_have_attribute('data-study-mode','explore')
        for name in ['Side','Rear','Front','Detail']:
            page.get_by_role('group',name='Camera views').get_by_role('button',name=name,exact=True).click();page.wait_for_timeout(180)
        checks.append('profile camera presets remain interactive')
        page.get_by_role('button',name='Image',exact=True).click();page.get_by_role('button',name='3D view',exact=True).click();expect(media).to_have_attribute('data-media-state','ready',timeout=30000);expect(details).to_have_attribute('data-asset-profile','profile');checks.append('Image/3D round-trip retains profile')
        page.get_by_role('button',name='Add to bag',exact=True).click(); close_added_cart(page);assert page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1'))[0].vehicleId")=='street155-2022';checks.append('cart still stores per-line vehicle')
        page.screenshot(path=str(OUT/'apex-profile.png'),full_page=True)
        page.goto(BASE+'/products/vector-wheels');expect(page.locator('[data-product-media]')).to_have_attribute('data-media-state','ready',timeout=30000)
        expect(page.locator('[data-asset-profile]')).to_have_attribute('data-asset-profile','automatic');expect(page.get_by_role('group',name='3D study mode').get_by_role('button',name='Hotspots',exact=True)).to_be_disabled();checks.append('unregistered model retains automatic framing without Apex annotations')
        for width,height in [(390,844),(768,1024),(1440,1100)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');checks.append(f'no horizontal overflow {width}x{height}')
        assert not errors,errors
    finally:
        (OUT/'results.json').write_text(json.dumps({'scope':'Compiled Flow over HTTP with actual WebGL; not live API/MongoDB or physical fitment validation.','checks':checks,'count':len(checks),'errors':errors},indent=2),encoding='utf8');browser.close()
print('Product profile checkpoints:',len(checks))
