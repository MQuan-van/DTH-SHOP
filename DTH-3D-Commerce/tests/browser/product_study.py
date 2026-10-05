"""Actual compiled Flow + WebGL test. Never pretends a poster is a rendered model.
Set DTH_APP_URL to preview server. No production API, orders or database writes.
"""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from cart_helpers import close_added_cart
BASE=os.environ.get('DTH_APP_URL','http://127.0.0.1:4173').rstrip('/')
OUT=Path('test-results/product-study');OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];webgl=False
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'])
    c=b.new_context(viewport={'width':1440,'height':1100})
    c.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1');localStorage.setItem('dth.flow.vehicle.v1',JSON.stringify('street155-2022'));")
    page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and re.search(r'Shader Error|VALIDATE_STATUS|THREE.WebGL',m.text) else None)
    try:
        page.goto(BASE+'/products/apex-suspension')
        media=page.locator('[data-product-media]')
        expect(media).to_have_attribute('data-media-state','ready',timeout=30000)
        webgl=True;checks.append('real model rendered; onAfterRender reported readiness')
        modes=page.get_by_role('group',name='3D study mode')
        page.get_by_role('button',name='Reset view',exact=True).click()
        modes.get_by_role('button',name='Surface',exact=True).click()
        expect(media).to_have_attribute('data-study-mode','surface')
        page.get_by_label('Light angle',exact=True).fill('35');page.wait_for_timeout(700)
        checks.append('Surface mode and controlled neutral light')
        modes.get_by_role('button',name='Technical',exact=True).click()
        page.wait_for_timeout(700);before=page.locator('canvas').last.screenshot()
        page.wait_for_timeout(3400);expect(media).to_have_attribute('data-study-progress','1.000')
        after=page.locator('canvas').last.screenshot();assert before!=after,'Technical output did not change across the scan'
        checks.append('shader render differs across finite technical scan')
        page.get_by_label('Scan position',exact=True).fill('0.38');page.wait_for_timeout(200)
        assert abs(float(media.get_attribute('data-study-progress'))-.38)<.002
        checks.append('manual scan positioning stays fixed')
        page.screenshot(path=str(OUT/'technical.png'),full_page=True)
        modes.get_by_role('button',name='Hotspots',exact=True).click()
        notes=page.get_by_role('group',name='Model annotations')
        expect(notes.get_by_role('button',name='Spring')).to_be_visible()
        notes.get_by_role('button',name='Spring').click();page.wait_for_timeout(900)
        expect(notes.get_by_role('button',name='Spring')).to_have_attribute('aria-pressed','true')
        expect(page.get_by_role('button',name='Focus Spring',exact=True)).to_be_visible()
        checks.append('verified hotspot projected on real scene and focus available')
        page.screenshot(path=str(OUT/'hotspots.png'),full_page=True)
        page.get_by_role('button',name='Reset view',exact=True).click()
        expect(media).to_have_attribute('data-study-mode','explore')
        page.get_by_role('button',name='Ⅱ Motion on',exact=True).click()
        modes.get_by_role('button',name='Technical',exact=True).click()
        page.get_by_label('Scan position',exact=True).fill('0.42');page.wait_for_timeout(250)
        assert media.get_attribute('data-study-progress')=='0.420'
        expect(page.get_by_role('button',name='Replay scan',exact=False)).to_be_disabled()
        checks.append('Motion off: static study only, no replay')
        page.get_by_role('button',name='Image',exact=True).click();expect(media).to_have_attribute('data-media-state','image')
        page.get_by_role('button',name='3D view',exact=True).click();expect(media).to_have_attribute('data-media-state','ready',timeout=30000)
        checks.append('Image/3D round-trip safe')
        page.get_by_role('button',name='Add to bag',exact=True).click(); close_added_cart(page)
        expect(page.get_by_role('button',name='Add to bag',exact=True)).to_have_attribute('data-added','true')
        bag=page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1'))")
        assert bag[0]['vehicleId']=='street155-2022' and bag[0]['quantity']==1
        checks.append('existing compatible purchase still accepted, per-line vehicle retained')
        page.goto(BASE+'/products/vector-wheels');expect(page.locator('[data-product-media]')).to_have_attribute('data-media-state','ready',timeout=30000)
        expect(page.get_by_role('group',name='3D study mode').get_by_role('button',name='Hotspots',exact=True)).to_be_disabled()
        checks.append('different model does not inherit Apex hotspots')
        for width,height in [(390,844),(768,1024),(1440,1100)]:
            page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(180)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            checks.append(f'layout fits {width}x{height}')
        assert not errors,errors
    finally:
        (OUT/'results.json').write_text(json.dumps({'count':len(checks),'checks':checks,'webglRendered':webgl,'errors':errors,'scope':'HTTP compiled Flow; not API/MongoDB, real payment or Windows GPU'},indent=2),encoding='utf8')
        b.close()
print('Product study checks:',len(checks))
