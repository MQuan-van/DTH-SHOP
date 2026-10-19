"""Manual/CI browser smoke test for Step 17.3A. Run against a compiled API or Flow frontend."""
import argparse, json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:4173');p.add_argument('--out',default='test-results/cinematic173a');a=p.parse_args()
out=Path(a.out);out.mkdir(parents=True,exist_ok=True);checks=[]
def check(n,v=True):
  if not v: raise AssertionError(n)
  checks.append(n)
with sync_playwright() as pw:
  browser=pw.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page()
  page.goto(a.url.rstrip('/')+'/',wait_until='domcontentloaded')
  expect(page.locator('[data-dth-ignition]')).to_be_visible(timeout=10000);check('loader visible')
  page.get_by_role('button',name='Skip intro').click()
  expect(page.locator('[data-cinematic-auth]')).to_be_visible(timeout=10000);check('signed-out root shows cinematic login')
  check('no horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'))
  page.screenshot(path=str(out/'login-desktop.png'),full_page=True)
  ctx.close();browser.close()
(out/'results.json').write_text(json.dumps(checks,indent=2));print(json.dumps(checks,indent=2))
