"""Compiled Flow, BrowserRouter and real Product/StoreProvider over HTTP.
Recommendations use image media. This gate does NOT certify WebGL or physical fit.
Run from DTH-3D-Commerce with DTH_APP_URL pointing at a compiled Flow preview.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from cart_helpers import close_added_cart

BASE = os.environ.get('DTH_APP_URL', 'http://127.0.0.1:4173').rstrip('/')
OUT = Path('test-results/product-recommendations')
OUT.mkdir(parents=True, exist_ok=True)
checks, errors = [], []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1100})
    context.add_init_script("""sessionStorage.setItem('dth.ignition.seen.v1','1');
localStorage.setItem('dth.flow.vehicle.v1',JSON.stringify('street155-2022'));""")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(BASE + '/products/apex-suspension')
        rec = page.locator('[data-product-recommendations]')
        expect(rec).to_have_attribute('data-rec-mode', 'build', timeout=20000)
        expect(rec.locator('[data-rec-id]')).to_have_count(4)
        assert rec.locator('[data-rec-id]').evaluate_all('(ns)=>ns.map(n=>n.dataset.recId)') == [
            'apex-wheels', 'apex-exhausts', 'apex-mirrors', 'apex-brakes']
        checks.append('real demo dataset gives four individually matched other categories')
        # No WebGL requirement in this recommendation gate; pin explicit Image mode.
        image = page.locator('[data-product-media]').get_by_role('button', name='Image', exact=True)
        if image.count():
            image.click()
        page.get_by_label('Quantity', exact=True).select_option('2')
        page.get_by_role('button', name='Add to bag', exact=True).click(); close_added_cart(page)
        expect(page.locator('[data-product-detail]')).to_contain_text('2 × Apex Coilover')
        bag = page.evaluate("localStorage.getItem('dth.flow.bag.v1')")
        assert json.loads(bag)[0]['vehicleId'] == 'street155-2022'
        checks.append('existing add operation stores quantity and per-line vehicle')
        rec.scroll_into_view_if_needed()
        rec.get_by_role('link', name='View Apex Alloy wheel product details').focus()
        page.keyboard.press('Enter')
        expect(page).to_have_url(BASE + '/products/apex-wheels')
        expect(page.locator('[data-product-detail] h1')).to_have_text('Apex Alloy wheel')
        assert page.evaluate("localStorage.getItem('dth.flow.bag.v1')") == bag
        page.go_back()
        expect(page.locator('[data-product-detail] h1')).to_have_text('Apex Coilover')
        checks.append('keyboard product navigation and actual browser Back preserve bag')
        rec.get_by_role('button', name='Change vehicle', exact=True).click()
        dialog = page.locator('dialog[open]')
        dialog.get_by_label('Make', exact=True).select_option(label='Demo Moto')
        dialog.get_by_label('Model', exact=True).select_option(label='Road 300')
        dialog.get_by_label('Year', exact=True).select_option(label='2024')
        dialog.get_by_role('button', name='Show matching parts', exact=True).click()
        expect(rec).to_have_attribute('data-rec-mode', 'alternatives')
        expect(rec.locator('[data-rec-id]')).to_have_count(1)
        expect(rec.locator('[data-rec-id]')).to_have_attribute('data-rec-id', 'vector-suspension')
        assert page.evaluate("localStorage.getItem('dth.flow.bag.v1')") == bag
        checks.append('actual vehicle picker updates alternatives without editing earlier cart lines')
        rec.scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / 'alternatives.png'), full_page=True)
        for width, height in [(320,780),(390,844),(768,1024),(1440,1100),(2560,1440)]:
            page.set_viewport_size({'width':width,'height':height})
            rec.scroll_into_view_if_needed()
            page.wait_for_timeout(150)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            checks.append(f'no page overflow at {width}x{height}')
        page.emulate_media(reduced_motion='reduce')
        expect(rec).to_have_attribute('data-motion','off')
        page.wait_for_timeout(300)
        assert rec.evaluate('(node)=>node.getAnimations({subtree:true}).length') == 0
        checks.append('reduced motion removes recommendation animation')
        rec.get_by_role('link', name='All matches in this category').click()
        expect(page).to_have_url(BASE + '/shop?fit=match&category=suspension')
        checks.append('matching-category destination has explicit, non-stale filters')
        assert not errors, errors
    finally:
        (OUT / 'results.json').write_text(json.dumps({
            'scope':'Compiled Flow over HTTP. Image recommendation UX, actual StoreProvider and browser history; no live MongoDB or WebGL/physical-fit certification.',
            'count':len(checks),'checks':checks,'errors':errors,
        }, indent=2), encoding='utf-8')
        browser.close()
print('Recommendation browser checkpoints:', len(checks))
