"""Run against the ACTUAL compiled app, with its existing API available.
python tests/browser/loader172.py --url http://127.0.0.1:4173 --path /
Requires Playwright Python + a Chromium installation. No database writes or login.
Frame gaps are rAF timing observations, NOT a guarantee of compositor/GPU FPS.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:4173')
parser.add_argument('--path', default='/')
parser.add_argument('--out', default='test-results/loader172')
parser.add_argument('--browser', default=None, help='Optional installed Chromium executable path.')
args = parser.parse_args()
if not args.path.startswith('/') or args.path.startswith('//'):
    parser.error('--path must be an application path such as / or /story')
out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
checks = []
probe = """(() => {
 const data = window.__dthLoaderProbe = {contexts:[],frames:[],errors:[]};
 const original = HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext = function(type,...args) {
   if(type==='webgl' || type==='webgl2') data.contexts.push({type,at:performance.now(),
     phase:document.querySelector('[data-dth-app-shell]')?.getAttribute('data-dth-intro-state') || 'no-shell'});
   return original.call(this,type,...args);
 };
 let previous=null;
 const sample=now=>{
   const intro=document.querySelector('[data-dth-ignition]');
   if(intro && intro.getAttribute('data-phase')!=='exit') {
     if(previous!==null) data.frames.push(now-previous); previous=now;
   } else previous=null;
   requestAnimationFrame(sample);
 };
 requestAnimationFrame(sample);
})();"""

def check(name, value):
    checks.append({'name': name, 'pass': bool(value)})
    if not value:
        raise AssertionError(name)

with sync_playwright() as p:
    options = {'headless': True}
    if args.browser:
        options['executable_path'] = args.browser
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='no-preference')
    context.add_init_script(probe)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    try:
        page.goto(args.url.rstrip('/') + args.path, wait_until='domcontentloaded')
        intro = page.locator('[data-dth-ignition]')
        expect(intro).to_be_visible(timeout=10000)
        expect(intro).to_have_attribute('data-ignition-version', '17.2-performance')
        expect(intro).to_have_attribute('data-logo-ready', 'true')
        check('page shell stays mounted', page.locator('#dth-content').count() == 1)
        check('zero WebGL probes before intro exit', not page.evaluate('window.__dthLoaderProbe.contexts'))
        page.screenshot(path=str(out / 'intro.png'))
        shell = page.locator('[data-dth-app-shell]')
        expect(shell).to_have_attribute('data-dth-intro-state', 'complete', timeout=9000)
        check('normal exit, not timeout/API error', shell.get_attribute('data-dth-intro-reason') == 'ready')
        check('inert released', shell.evaluate('(e)=>!e.inert'))
        check('body scrolling restored', page.evaluate("document.body.style.overflow!=='hidden'"))
        page.wait_for_timeout(1000)
        metrics = page.evaluate('window.__dthLoaderProbe')
        check('all observed context creation after intro', all(c['phase'] == 'complete' for c in metrics['contexts']))
        check('no unhandled JavaScript errors', not errors)
        intervals = sorted(metrics['frames'])
        metrics['raf_p95_ms'] = intervals[min(len(intervals)-1, int(len(intervals)*.95))] if intervals else None
        metrics['raf_gaps_above_34ms'] = sum(x > 34 for x in intervals)
        metrics['note'] = 'No FPS pass threshold: verify frame timeline on the target PC/laptop. First load / cache state affects measurements.'
        (out / 'metrics.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')
        # Fresh document, same tab/session: intro should not replay.
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('[data-dth-app-shell]')).to_have_attribute('data-dth-intro-state', 'complete', timeout=10000)
        check('session reload does not replay intro', page.locator('[data-dth-ignition]').count() == 0)
    finally:
        (out / 'results.json').write_text(json.dumps({'checks': checks, 'errors': errors}, indent=2), encoding='utf-8')
        context.close(); browser.close()
print(f'{len(checks)} actual-app loader assertions passed; see {out}.')
