"""Compiled Flow integration (not run by the ZIP installer). No live database/payment.
python tests/browser/cart_drawer.py --url http://127.0.0.1:4173
"""
import argparse, json, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from flow_auth import login_flow

p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4173');p.add_argument('--out',default='test-results/cart-drawer');p.add_argument('--browser')
a=p.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
checks=[];errors=[];api=[]
def ok(name): checks.append(name)
with sync_playwright() as pw:
    opts={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    if a.browser: opts['executable_path']=a.browser
    browser=pw.chromium.launch(**opts)
    context=browser.new_context(viewport={'width':1440,'height':1000})
    context.add_init_script("sessionStorage.setItem('dth.ignition.seen.v1','1');")
    page=context.new_page();page.on('pageerror',lambda e: errors.append(str(e)))
    page.on('request',lambda r: api.append(r.url) if '/api/shop/' in r.url else None)
    cart=page.locator('dialog[data-cart-dialog][open]')
    def close():
        cart.get_by_role('button',name='Close bag',exact=True).click();expect(cart).to_have_count(0)
    def bag(): return page.evaluate("JSON.parse(localStorage.getItem('dth.flow.bag.v1')||'[]')")
    def open_header():
        page.locator('.dth-bag-button').click();expect(cart).to_be_visible();expect(page.locator('dialog[open]')).to_have_count(1)
    try:
        login_flow(page, a.url, '/shop')
        page.goto(a.url+'/shop',wait_until='domcontentloaded')
        page.evaluate("localStorage.setItem('dth.flow.vehicle.v1',JSON.stringify('yamaha-nvx-v1'));localStorage.setItem('dth.flow.bag.v1','[]')")
        page.goto(a.url+'/products/apex-suspension',wait_until='domcontentloaded')
        product=page.locator('[data-product-detail]');expect(product).to_be_visible()
        page.get_by_label('Quantity',exact=True).select_option('2')
        page.get_by_role('button',name='Add to bag',exact=True).click()
        expect(cart).to_be_visible();expect(page.locator('dialog[open]')).to_have_count(1)
        expect(cart).to_contain_text('2 × Apex Coilover added.');expect(cart).to_contain_text('NVX V1')
        assert bag()==[{'productId':'apex-suspension','vehicleId':'yamaha-nvx-v1','quantity':2}];ok('product add opens one drawer after successful local store transaction')
        expect(cart.get_by_role('button',name='Close bag',exact=True)).to_be_focused()
        page.keyboard.press('Shift+Tab');assert page.evaluate("document.querySelector('[data-cart-dialog]').contains(document.activeElement)")
        page.keyboard.press('Tab');ok('keyboard focus remains inside native modal')
        cart.get_by_role('button',name='Increase Apex Coilover',exact=True).click();assert bag()[0]['quantity']==3
        cart.get_by_role('button',name='Decrease Apex Coilover',exact=True).click();assert bag()[0]['quantity']==2
        expect(cart.locator('[data-cart-subtotal]')).to_contain_text('5.600.000');ok('quantity and integer VND subtotal are shared with stored cart')
        page.wait_for_timeout(550);page.screenshot(path=str(out/'drawer-desktop.png'))
        page.keyboard.press('Escape');expect(cart).to_have_count(0)
        assert page.evaluate("document.body.style.overflow!=='hidden'");ok('Escape restores scrolling')
        page.goto(a.url+'/shop?fit=all&q=apex');expect(page.get_by_role('heading',name='Apex Coilover',exact=True)).to_be_visible()
        page.get_by_role('button',name='Quick view Apex Coilover',exact=True).click()
        quick=page.locator('dialog[open]:not([data-cart-dialog])');expect(quick).to_be_visible()
        page.wait_for_timeout(750);quick.get_by_role('button',name='Add to bag',exact=True).click()
        expect(cart).to_be_visible();expect(quick).to_have_count(0);expect(page.locator('dialog[open]')).to_have_count(1)
        assert bag()[0]['quantity']==3;ok('QuickView releases itself before the cart becomes modal')
        close();page.locator('.dth-vehicle-button').click();picker=page.get_by_role('dialog',name='Choose your Yamaha NVX')
        picker.get_by_role('radio',name='NVX V2',exact=True).check()
        picker.get_by_role('button',name='Use NVX V2',exact=True).click()
        expect(picker).to_have_count(0)
        open_header();expect(cart).to_contain_text('NVX V1');assert bag()[0]['vehicleId']=='yamaha-nvx-v1';ok('global vehicle changes do not rewrite stored item vehicles')
        close();page.goto(a.url+'/products/apex-suspension');expect(product).to_be_visible()
        page.get_by_role('button',name='Choose matching vehicle',exact=True).click();expect(cart).to_have_count(0)
        expect(page.get_by_role('dialog',name='Choose your Yamaha NVX')).to_be_visible();page.keyboard.press('Escape');ok('mismatch opens picker, never a false success drawer')
        page.goto(a.url+'/shop');open_header()
        for w,h in [(320,720),(390,844),(640,900),(1024,768),(1440,900),(2560,1440),(844,390)]:
            page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(160)
            assert page.evaluate("(()=>{const p=document.querySelector('[data-cart-panel]'),r=p.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&p.scrollWidth<=p.clientWidth+1})()")
            ok(f'drawer bounds at {w}x{h}')
            if w==390: page.screenshot(path=str(out/'drawer-mobile.png'))
        page.set_viewport_size({'width':1440,'height':1000});close()
        page.emulate_media(reduced_motion='reduce');open_header()
        assert page.evaluate("document.querySelector('[data-cart-dialog]').getAnimations({subtree:true}).filter(a=>a.playState==='running').length===0")
        ok('reduced motion skips drawer transforms')
        cart.get_by_role('button',name=re.compile('^Remove Apex Coilover')).click();expect(cart).to_contain_text('Your next build starts here.')
        assert bag()==[];ok('remove shows empty state and preserves valid empty storage')
        close();open_header();expect(cart).to_contain_text('Your next build starts here.');close()
        page.evaluate("localStorage.setItem('dth.flow.bag.v1',JSON.stringify([{productId:'missing-part',vehicleId:'yamaha-nvx-v1',quantity:1}]))")
        page.reload();open_header();expect(cart).to_contain_text('Product unavailable');expect(cart.locator('[data-cart-subtotal]')).to_contain_text('Review needed')
        expect(cart.get_by_role('button',name='Increase missing-part',exact=True)).to_be_disabled();ok('missing catalog item is removable and never included in a misleading total')
        cart.get_by_role('link',name='Review your bag',exact=True).click();page.wait_for_url(a.url+'/bag');expect(cart).to_have_count(0);ok('review action reaches existing bag route without submitting an order')
        assert not errors,errors;assert not api,api;ok('no uncaught errors or API requests in Flow test')
    except Exception:
        page.screenshot(path=str(out/'failure.png'));(out/'failure.html').write_text(page.content(),encoding='utf8');raise
    finally:
        (out/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'apiRequests':api},indent=2),encoding='utf8')
        browser.close()
