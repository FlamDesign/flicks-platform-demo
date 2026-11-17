#!/usr/bin/env python3
"""Flicks demo QA. Usage: python3 qa.py <url-or-index.html> [--live] [--out qa] [--only ios|android|desktop] [--offline-hosts a.com,b.com]
Default mode loads the demo with ?flicks=stub (layout, navigation, copy). --live loads the real Flick tags.
Exit code: 0 all passed, 1 failures, 2 nothing failed but some checks could not run (NOT VERIFIED)."""
import sys, json, re, pathlib, argparse
from playwright.sync_api import sync_playwright

IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
AND_UA = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36"
DEVICES = [  # name, os, width, height, device scale
    ("iPhone SE", "ios", 375, 667, 2), ("iPhone 13 mini", "ios", 375, 812, 3), ("iPhone 16", "ios", 393, 852, 3),
    ("iPhone 16 Pro Max", "ios", 440, 956, 3), ("iPhone 16 landscape", "ios", 852, 393, 3), ("iPad mini", "ios", 744, 1133, 2),
    ("Galaxy Z Fold cover", "android", 344, 882, 3), ("Android compact", "android", 360, 640, 3), ("Galaxy S25", "android", 360, 780, 3),
    ("Pixel 9", "android", 412, 923, 2.625), ("Pixel 9 Pro XL", "android", 448, 998, 3), ("Pixel 9 landscape", "android", 923, 412, 2.625),
    ("Galaxy Tab S9", "android", 800, 1280, 2), ("Laptop", "desktop", 1440, 900, 1), ("Small laptop", "desktop", 1024, 768, 1)]
BANNED = [(r"tap to (switch|change|swap)", "instruction copy"), (r"\b(AR|VR)\b|augmented reality|virtual reality", "AR/VR wording"),
          (r"\bexperiences?\b", "'experience' wording"), (r"\bFliks?\b", "misspelt Flicks"), (r"\b(Look|Option|Variant|Style) \d\b", "mechanical option name"),
          (r"lorem ipsum|placeholder|TODO", "placeholder text")]
JS_VIS = """id=>{const h=document.querySelector('.flick[data-slot="'+id+'"]');if(!h)return -1;const r=h.getBoundingClientRect();
 const w=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0)),ht=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
 if(!r.width||!r.height)return 0;const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
 return (e&&(h.contains(e)||e.contains(h)))?(w*ht)/(r.width*r.height):0}"""
JS_IN = "s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return r.width>0&&r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1}"
JS_STATE = "id=>{const s=__demo.slots[id]||{};return{ready:!!s.ready,error:s.error||null,live:Object.values(__demo.slots).filter(x=>x.mounted).length}}"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("target"); ap.add_argument("--live", action="store_true")
    ap.add_argument("--out", default="qa"); ap.add_argument("--only")
    ap.add_argument("--offline-hosts", default="", help="comma-separated hosts this machine cannot reach; their requests get a grey stand-in and image checks for them are reported NOT VERIFIED")
    a = ap.parse_args()
    OFF = [h.strip() for h in a.offline_hosts.split(",") if h.strip()]
    url = a.target if re.match(r"https?://", a.target) else pathlib.Path(a.target).resolve().as_uri()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    rows, blocked = [], []
    def rec(dev, check, ok, detail=""): rows.append({"device": dev, "check": check, "status": "PASS" if ok else "FAIL", "detail": detail})
    if OFF: blocked.append("Images and files from " + ", ".join(OFF) + " could not be fetched from this machine, so they were replaced by grey stand-ins. Whether they load is NOT VERIFIED.")
    if not a.live: blocked.append("Real Flick playback, variant switching and click-outs were not tested (stub mode). Run with --live on a machine that can reach the Flick tag hosts.")
    with sync_playwright() as p:
        engines = {}
        for name in ("chromium", "webkit"):
            try: engines[name] = getattr(p, name).launch()
            except Exception: engines[name] = None
        if not engines["chromium"]: sys.exit("FATAL: Chromium is not installed. Run: python3 -m playwright install chromium webkit")
        if not engines["webkit"]: blocked.append("WebKit is not installed, so iOS sizes ran in Chromium with an iPhone user agent. Layout only: Safari rendering is NOT verified. Run: python3 -m playwright install webkit")
        for name, os_, w, h, dpr in DEVICES:
            if a.only and a.only != os_: continue
            eng = engines["webkit"] if os_ == "ios" and engines["webkit"] else engines["chromium"]
            mobile = os_ != "desktop"
            kw = dict(viewport={"width": w, "height": h}, device_scale_factor=dpr, has_touch=mobile)
            if mobile: kw["user_agent"] = IOS_UA if os_ == "ios" else AND_UA
            if mobile and eng is engines["chromium"]: kw["is_mobile"] = True
            ctx = eng.new_context(**kw); page = ctx.new_page(); errs, bad = [], []
            if OFF:
                import zlib, struct
                def _chunk(n, d): return struct.pack(">I", len(d)) + n + d + struct.pack(">I", zlib.crc32(n + d) & 0xffffffff)
                GREY = b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)) + _chunk(b"IDAT", zlib.compress(b"\x00\xd8\xdb\xe0")) + _chunk(b"IEND", b"")
                def stand_in(route, req):
                    if req.resource_type == "image": route.fulfill(status=200, content_type="image/png", body=GREY)
                    else: route.fulfill(status=200, body="")
                for host in OFF: page.route(f"**://{host}/**", stand_in)
            page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errs.append(str(e)))
            page.on("requestfailed", lambda r: bad.append(r.url))
            page.on("response", lambda r: bad.append(f"{r.status} {r.url}") if r.status >= 400 else None)
            shots = out / re.sub(r"\W+", "-", name).lower(); shots.mkdir(exist_ok=True)
            try:
                page.goto(url + ("" if a.live else ("&" if "?" in url else "?") + "flicks=stub"), wait_until="load", timeout=45000)
                page.wait_for_function("window.__demo && window.__demo.cfg", timeout=8000)
            except Exception as e:
                rec(name, "demo loads and exposes the kit contract", False, str(e)[:160]); ctx.close(); continue
            page.wait_for_timeout(900)
            d = page.evaluate("({os:document.documentElement.dataset.os,flows:__demo.flows.map(f=>({id:f.id,label:f.label,slot:f.slot,steps:f.steps||[]})),max:__demo.maxLive})")
            flows = d["flows"]
            if mobile: rec(name, "OS skin matches device", d["os"] == os_, f"data-os={d['os']}")
            page.screenshot(path=str(shots / "00-open.png"))
            first = page.evaluate("(vis)=>Math.max(0,...[...document.querySelectorAll('.flick[data-slot]')].map(h=>eval(vis)(h.dataset.slot)))", JS_VIS)
            rec(name, "a Flick is on screen when the demo opens", first >= 0.5, f"best visible share {first:.2f}")
            rec(name, "no sideways scroll", page.evaluate("document.scrollingElement.scrollWidth<=innerWidth+1"))
            rec(name, "Explore Flicks control fully on screen", bool(page.evaluate(JS_IN, "[data-flicks-button]")))
            page.click("[data-flicks-button]"); page.wait_for_timeout(250)
            items = page.evaluate("[...document.querySelectorAll('.fk-menu:not([hidden]) [role=menuitem]')].map(b=>{const r=b.getBoundingClientRect();return{t:b.textContent,ok:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}})")
            rec(name, "Explore Flicks lists every flow once", [i["t"] for i in items] == [f["label"] for f in flows], f"{len(items)} items, {len(flows)} flows")
            rec(name, "Explore Flicks menu fits on screen", bool(items) and all(i["ok"] for i in items))
            page.screenshot(path=str(shots / "01-explore-open.png")); page.keyboard.press("Escape"); page.mouse.click(2, 2); page.wait_for_timeout(150)
            for n, f in enumerate(flows):
                tag = f"flow '{f['label']}'"
                try:
                    if page.evaluate("document.querySelector('.fk-menu').hidden"): page.click("[data-flicks-button]"); page.wait_for_timeout(200)
                    page.click(f".fk-menu [data-go='{f['id']}']"); page.wait_for_timeout(1500)
                    vis = page.evaluate(JS_VIS, f["slot"])
                    rec(name, f"{tag}: its Flick is on screen and uncovered", vis >= 0.5, f"visible share {vis:.2f}")
                    st = page.evaluate(JS_STATE, f["slot"])
                    if a.live and not st["ready"] and not st["error"]:
                        try: page.wait_for_function("id=>{const s=__demo.slots[id];return s&&(s.ready||s.error)}", arg=f["slot"], timeout=15000)
                        except Exception: pass
                        st = page.evaluate(JS_STATE, f["slot"])
                    rec(name, f"{tag}: Flick ready", st["ready"], st["error"] or "")
                    rec(name, f"{tag}: at most {d['max']} Flicks running", st["live"] <= d["max"], f"{st['live']} running")
                    rec(name, f"{tag}: no sideways scroll", page.evaluate("document.scrollingElement.scrollWidth<=innerWidth+1"))
                    rec(name, f"{tag}: Explore Flicks still on screen", bool(page.evaluate(JS_IN, "[data-flicks-button]")))
                    page.screenshot(path=str(shots / f"{n+2:02d}-{f['id']}.png"))
                    text = page.evaluate("document.body.innerText")
                    for rx, why in BANNED:
                        m = re.search(rx, text, re.I if "AR|VR" not in rx else 0)
                        if m: rec(name, f"{tag}: copy check ({why})", False, repr(m.group(0)))
                    if a.live and st["ready"]:
                        page.wait_for_timeout(1500)
                        nv = page.evaluate("id=>__demo.slots[id].variants||0", f["slot"])
                        rec(name, f"{tag}: Flick offers variants to switch", nv >= 2, f"{nv} variant buttons")
                        if nv >= 2:
                            page.evaluate("id=>__demo.switchVariant(id,1)", f["slot"]); page.wait_for_timeout(1500)
                            rec(name, f"{tag}: variant switch works", page.evaluate("id=>__demo.log.some(l=>l.slot===id&&l.type==='switch'&&l.diff===1)", f["slot"]))
                    for k, s in enumerate(f["steps"]):
                        if s.get("live") and not a.live: continue
                        try:
                            if s.get("tap"): page.click(s["tap"], timeout=4000)
                            if s.get("cta"): page.evaluate("id=>__demo.pressCta(id)", f["slot"])
                            page.wait_for_timeout(s.get("wait", 500))
                            ok = (page.is_visible(s["expect"]) if s.get("expect") else True) and not (s.get("gone") and page.is_visible(s["gone"]))
                            rec(name, f"{tag}: step {k+1} {s.get('name','')}", ok, "" if ok else f"expected {s.get('expect') or 'gone: '+s.get('gone','')}")
                            page.screenshot(path=str(shots / f"{n+2:02d}-{f['id']}-step{k+1}.png"))
                        except Exception as e: rec(name, f"{tag}: step {k+1} {s.get('name','')}", False, str(e)[:140])
                except Exception as e: rec(name, f"{tag}: runs", False, str(e)[:160])
            box = page.locator("[data-flicks-button]").bounding_box()
            if box:
                page.mouse.move(box["x"] + 20, box["y"] + box["height"] / 2); page.mouse.down(); page.mouse.move(w + 300, -200, steps=6); page.mouse.up(); page.wait_for_timeout(200)
                where = page.evaluate("(()=>{const r=document.querySelector('[data-flicks-button]').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.right),Math.round(r.bottom),innerWidth,innerHeight]})()")
                rec(name, "Explore Flicks stays on screen when dragged to the edge", bool(page.evaluate(JS_IN, "[data-flicks-button]")), f"control at {where[:4]} on a {where[4]}x{where[5]} screen")
            imgs = page.evaluate("[...document.images].filter(i=>i.complete&&!i.naturalWidth&&i.getBoundingClientRect().width>0).map(i=>i.currentSrc||i.src)")
            rec(name, "every image loaded", not imgs, "; ".join(imgs[:3]))
            rec(name, "no console errors", not errs, " | ".join(errs[:3])[:300])
            rec(name, "no failed requests", not bad, " | ".join(bad[:3])[:300])
            ctx.close()
    fails = [r for r in rows if r["status"] == "FAIL"]
    (out / "results.json").write_text(json.dumps({"target": url, "live": a.live, "not_verified": blocked, "results": rows}, indent=1))
    md = [f"# Flicks demo QA\n\nTarget: {url}\nMode: {'live Flicks' if a.live else 'stub (layout only)'}\n\n**{len(rows)-len(fails)} passed, {len(fails)} FAILED across {len({r['device'] for r in rows})} device profiles**\n"]
    if blocked: md += ["## NOT VERIFIED\n"] + [f"- {b}" for b in blocked] + [""]
    if fails: md += ["## Failures\n", "| Device | Check | Detail |", "|---|---|---|"] + [f"| {r['device']} | {r['check']} | {r['detail']} |" for r in fails]
    (out / "report.md").write_text("\n".join(md)); print("\n".join(md))
    sys.exit(1 if fails else 2 if blocked else 0)
if __name__ == "__main__": main()
