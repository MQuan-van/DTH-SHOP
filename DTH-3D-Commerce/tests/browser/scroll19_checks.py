"""Supplement to the existing real app review; requires its Flow login + loaded GLB."""
from playwright.sync_api import expect

def _position(page, amount):
    target = page.locator('[data-scroll19-story]').evaluate(
        '(el,p)=>Math.max(0,el.getBoundingClientRect().top+scrollY-'
        'parseFloat(getComputedStyle(el).getPropertyValue("--header-height"))+'
        '(el.offsetHeight-el.querySelector("[data-stage]").offsetHeight)*p)', amount)
    page.evaluate('(top)=>window.scrollTo({top,behavior:"instant"})', target)
    page.wait_for_function(
        '(p)=>Math.abs(Number(document.querySelector("[data-scroll19-story]").dataset.progress)-p)<.003', arg=amount)


def review_scroll19(page):
    root = page.locator('[data-scroll19-story]')
    expect(root).to_have_attribute('data-cinematic', 'true')
    _position(page, .15)
    before_y = page.evaluate('scrollY')
    before = float(root.get_attribute('data-progress'))
    page.mouse.move(720, 500)
    page.mouse.wheel(0, 360)
    page.wait_for_function('(v)=>scrollY>v+150', arg=before_y)
    page.wait_for_function(
        '(p)=>Number(document.querySelector("[data-scroll19-story]").dataset.progress)>p+.03', arg=before)
    forward = float(root.get_attribute('data-progress'))
    page.mouse.wheel(0, -360)
    page.wait_for_function(
        '(p)=>Number(document.querySelector("[data-scroll19-story]").dataset.progress)<p-.03', arg=forward)
    # The CSS copy opacity must follow progress, not only a changed chapter label.
    page.evaluate("document.activeElement?.blur()")
    _position(page, .145)
    page.wait_for_function('Number(getComputedStyle(document.querySelector("[data-story-copy]")).opacity)<.15')
    _position(page, .29)
    page.wait_for_function('Number(getComputedStyle(document.querySelector("[data-story-copy]")).opacity)>.98')
    stage = page.locator('[data-stage]').bounding_box()
    assert stage and 0 <= stage['y'] < 180 and stage['height'] > 300, stage
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    _position(page, 0)
    print('PASS: 19A native wheel advances/reverses progress; copy scrubs and stage remains visible', flush=True)


def review_inspection19(page):
    root = page.locator('[data-scroll19-story]')
    expect(root).to_have_attribute('data-inspect', 'true')
    before = float(root.get_attribute('data-progress'))
    previous_y = page.evaluate('scrollY')
    page.mouse.move(720, 460)
    page.mouse.wheel(0, 140)
    page.wait_for_function('(y)=>scrollY>y+50', arg=previous_y)
    page.wait_for_timeout(700)
    assert abs(float(root.get_attribute('data-progress')) - before) < .00001
    page.evaluate('(top)=>window.scrollTo({top,behavior:"instant"})', previous_y)
    page.wait_for_timeout(500)
    print('PASS: 19A Inspect freezes story progress without trapping page scrolling', flush=True)
