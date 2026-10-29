"""Optional real-browser acceptance for the installed Studio 22H.2.
Requires Python + Playwright. Does NOT create products, orders, or call Meshy.
Run against your running dev server. For an authenticated store use --headed --login.
No saved login state or personal data is bundled with this script.
"""
import argparse
import asyncio
import json
from pathlib import Path
import sys
import time

async def run(args):
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise SystemExit("Optional test needs Playwright for Python. Manual checks remain available in README-VI.md.") from exc
    report = {"url": args.url, "checks": [], "console_errors": [], "page_errors": [], "notes": []}
    out = Path(args.out).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    def record(name, ok, detail=None):
        report["checks"].append({"name": name, "passed": bool(ok), "detail": detail})
        print(("PASS " if ok else "FAIL ") + name)
    async with async_playwright() as p:
        options = {"headless": not args.headed}
        if args.channel:
            options["channel"] = args.channel
        browser = await p.chromium.launch(**options)
        context_options = {"viewport": {"width": 1440, "height": 1000}, "reduced_motion": "no-preference"}
        if args.storage_state:
            path = Path(args.storage_state).expanduser().resolve()
            if not path.is_file():
                raise SystemExit("Storage-state file does not exist.")
            context_options["storage_state"] = str(path)
        context = await browser.new_context(**context_options)
        page = await context.new_page()
        page.on("pageerror", lambda error: report["page_errors"].append(str(error)))
        page.on("console", lambda msg: report["console_errors"].append(msg.text) if msg.type == "error" else None)
        try:
            await page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
            if args.login:
                if not args.headed:
                    raise ValueError("--login requires --headed so you can sign in manually.")
                await asyncio.to_thread(input, "Sign in in the opened browser, open Studio, then press Enter here: ")
            await page.locator('.s222[data-studio="22H.2"]').wait_for(timeout=30000)
            stage = page.locator('.s222-canvas')
            await page.wait_for_function("document.querySelector('.s222-canvas')?.dataset.state === 'ready'", timeout=100000)
            record("Original GLB rendered in hero", await stage.get_attribute("data-state") == "ready")
            record("Old redundant controls absent", await page.get_by_text('Browse the edit', exact=True).count() == 0 and await page.get_by_text('Pause motion', exact=True).count() == 0)
            bounds_before = await page.locator('.s222-scene').bounding_box()
            await page.locator('.s222-actions button').click()
            await page.wait_for_function("document.querySelector('.s222-hero').dataset.mode === 'orbit'")
            bounds_after = await page.locator('.s222-scene').bounding_box()
            record("Inspect keeps exact canvas rectangle", all(abs(bounds_before[k] - bounds_after[k]) < 1 for k in ['x','y','width','height']))
            await page.get_by_role('button', name='Zoom product in', exact=True).click()
            await page.wait_for_timeout(850)
            await page.get_by_role('button', name='Rotate right', exact=True).click()
            await page.wait_for_timeout(850)
            await page.keyboard.press('Escape')
            await page.wait_for_timeout(850)
            record("Escape returns Full view", await page.locator('.s222-hero').get_attribute('data-mode') == 'overview')
            record("Exit restores keyboard focus", await page.locator('.s222-actions button').evaluate('(el)=>el===document.activeElement'))
            await page.get_by_role('button', name='Pick a detail', exact=False).first.click()
            await page.get_by_role('button', name='Center detail', exact=True).click()
            await page.wait_for_timeout(850)
            record("Center-detail command acknowledged", await page.get_by_text('Selected detail', exact=True).count() > 0)
            report['notes'].append('Center detail was exercised. Selecting a semantic part is NOT inferred; manually click a visible surface to test raycast targeting on each GLB.')
            camera = await page.locator('.s222-canvas canvas').get_attribute('data-studio-camera')
            hull = await page.locator('.s222-canvas canvas').get_attribute('data-studio-bounds')
            if camera and hull:
                pose, hull = json.loads(camera), json.loads(hull)
                distance = sum((pose['position'][i]-hull['center'][i])**2 for i in range(3))**0.5
                record('Camera outside complete model hull', distance >= hull['radius']*1.079, {'distance':distance,'radius':hull['radius']})
            else:
                report['notes'].append('Numeric browser-camera check NOT RUN: restart Vite with VITE_EXPERIENCE_TESTS=true to expose diagnostics.')
            await page.locator('.s222-inspector').get_by_role('button', name='Reset', exact=True).click()
            await page.wait_for_timeout(850)
            for width, height in [(1024,768),(390,844),(1440,1000)]:
                await page.set_viewport_size({'width':width,'height':height})
                await page.wait_for_timeout(350)
                record(f'No horizontal overflow {width}x{height}', await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            await page.screenshot(path=str(out/'hero-real-browser.png'))
            await page.locator('.s222-garage').scroll_into_view_if_needed()
            await page.wait_for_function("['ready','missing','error'].includes(document.querySelector('.s222-vehicle-stage')?.dataset.state)", timeout=100000)
            vehicle_state = await page.locator('.s222-vehicle-stage').get_attribute('data-state')
            if vehicle_state == 'missing':
                report['notes'].append('Vehicle GLB absent for this version; explicit missing state observed. Vehicle rendering NOT verified.')
            else:
                record('Selected NVX preview rendered', vehicle_state == 'ready', vehicle_state)
            record('No fabricated undefined vehicle year', 'undefined' not in await page.locator('.s222-garage-summary').inner_text())
            await page.screenshot(path=str(out/'garage-real-browser.png'))
            await page.locator('.s222-hero').scroll_into_view_if_needed()
            await page.wait_for_function("document.querySelector('.s222-canvas')?.dataset.state === 'ready'", timeout=100000)
            record('Hero reopens after Garage lease', True)
            record('No application page exceptions', not report['page_errors'], report['page_errors'])
        except Exception as exc:
            record('Acceptance completed', False, str(exc))
        finally:
            report['finished_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')
            (out/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
            await browser.close()
    return 0 if report['checks'] and all(c['passed'] for c in report['checks']) else 1

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',default='http://127.0.0.1:5173/')
    parser.add_argument('--channel',choices=['chrome','msedge','chromium'])
    parser.add_argument('--headed',action='store_true')
    parser.add_argument('--login',action='store_true')
    parser.add_argument('--storage-state',help='Optional explicit local auth state; never commit this file.')
    parser.add_argument('--out',default='evidence/studio22h2-live')
    sys.exit(asyncio.run(run(parser.parse_args())))
