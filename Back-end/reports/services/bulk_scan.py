"""
Bulk landing-page scanner.

Takes a list of scam landing URLs and, for each one, harvests any phone numbers
found in the DOM, in rendered text, and via OCR of a full-page screenshot, plus
the network endpoints the page called. Dead domains are reported as such rather
than silently returning nothing — a taken-down ad is itself a useful signal.

Playwright runs in a subprocess, matching reports.services.resporg: it keeps the
browser out of the Django process, survives crashes, and gives a hard timeout.
Results stream back one JSON line per URL so the UI can show live progress.
"""

import json
import logging
import os
import re
import socket
import subprocess
import sys
import tempfile
from urllib.parse import urlparse

import phonenumbers
from phonenumbers import carrier

from reports.services.resporg import assert_url_is_public, UnsafeURLError

logger = logging.getLogger(__name__)

# A scan holds a browser open for the whole run, so keep batches bounded.
MAX_URLS = 25
PER_URL_TIMEOUT_MS = 15000
PER_URL_BUDGET_S = 45
OVERHEAD_S = 30

PHONE_REGEX = r'(?:\+?1[-. ]?)?\(?([2-9][0-9]{2})\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})'


def lookup_carrier(phone_number: str) -> str:
    """Resolve the assigned carrier offline from the bundled LERG tables."""
    clean = re.sub(r'\D', '', phone_number or '')
    if len(clean) == 10:
        clean = "1" + clean
    try:
        parsed = phonenumbers.parse("+" + clean, "US")
        return carrier.name_for_number(parsed, "en") or "Wholesale / VoIP Provider"
    except Exception:
        return "Unknown Carrier"


def classify_url(url: str) -> str:
    """
    Decide whether a URL is safe and worth loading.

    Distinguishes a dead domain (the ad got pulled — worth recording) from one
    pointing at internal infrastructure (an SSRF attempt — refuse). The public
    check reuses resporg's guard so both scanners enforce one policy.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return "INVALID_SCHEME"
    if not parsed.hostname:
        return "INVALID_URL"
    try:
        socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        return "DEAD_DNS"
    except Exception:
        return "DEAD_DNS"
    try:
        assert_url_is_public(url)
    except UnsafeURLError:
        return "BLOCKED_PRIVATE"
    return "OK"


# ── Playwright script (runs in subprocess) ────────────────────────────────────
_SCAN_SCRIPT = r'''
import sys, json, re, io

PHONE_REGEX = r'(?:\+?1[-. ]?)?\(?([2-9][0-9]{2})\)?[-. ]?([2-9][0-9]{2})[-. ]?([0-9]{4})'

def emit(obj):
    sys.stdout.write("RESULT " + json.dumps(obj) + "\n")
    sys.stdout.flush()

def main():
    payload = json.load(open(sys.argv[1]))
    urls = payload["urls"]
    timeout = payload.get("timeout_ms", 15000)

    from playwright.sync_api import sync_playwright

    try:
        import pytesseract
        from PIL import Image
        ocr_ready = True
    except Exception:
        ocr_ready = False

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"),
            viewport={"width": 1366, "height": 768},
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )

        for url in urls:
            page = context.new_page()
            calls = []
            page.on("request", lambda req: calls.append(req.url))
            numbers, status_code, error, ocr_used = set(), None, "", False

            try:
                resp = page.goto(url, wait_until="domcontentloaded", timeout=timeout)
                if resp:
                    status_code = resp.status
                page.wait_for_timeout(3000)

                # 1. DOM + rendered text
                try:
                    content = page.content()
                except Exception:
                    content = ""
                try:
                    body_text = page.inner_text("body")
                except Exception:
                    body_text = ""
                for m in re.findall(PHONE_REGEX, content + " " + body_text):
                    numbers.add("%s-%s-%s" % m)

                # 2. OCR fallback — catches numbers baked into images or canvas
                if ocr_ready and not numbers:
                    try:
                        shot = page.screenshot(full_page=True)
                        text = pytesseract.image_to_string(Image.open(io.BytesIO(shot)))
                        for m in re.findall(PHONE_REGEX, text):
                            numbers.add("%s-%s-%s" % m)
                            ocr_used = True
                    except Exception as e:
                        sys.stderr.write("OCR failed for %s: %s\n" % (url, e))
            except Exception as e:
                msg = str(e)
                if "ERR_NAME_NOT_RESOLVED" in msg:
                    error = "DNS resolution failed — domain is gone"
                elif "Timeout" in msg or "timeout" in msg:
                    error = "Page load timed out"
                else:
                    error = msg.split("\n")[0][:200]
            finally:
                try:
                    page.close()
                except Exception:
                    pass

            telemetry = [
                ep for ep in calls
                if any(k in ep.lower() for k in
                       ["api", "number", "get", "call", "json", "events", "collect"])
            ]
            emit({
                "url": url,
                "status_code": status_code,
                "numbers": sorted(numbers),
                "telemetry": telemetry[:25],
                "telemetry_total": len(telemetry),
                "ocr_used": ocr_used,
                "error": error,
            })

        browser.close()

main()
'''


def _blank(url: str, status: str, error: str = "") -> dict:
    return {
        "url": url,
        "status": status,
        "status_code": None,
        "harvested_numbers": [],
        "telemetry": [],
        "telemetry_total": 0,
        "ocr_used": False,
        "error": error,
    }


def scan_urls(urls, progress=None):
    """
    Scan each URL and return a list of result dicts.

    `progress` is an optional callback receiving the results list so far; it is
    how the API surfaces live progress while a scan is still running.
    """
    # Preserve the caller's ordering while dropping duplicates.
    urls = list(dict.fromkeys(u.strip() for u in urls if u and u.strip()))
    dropped = 0
    if len(urls) > MAX_URLS:
        dropped = len(urls) - MAX_URLS
        logger.warning(f"[BULK SCAN] Truncating batch to {MAX_URLS} URLs — {dropped} dropped")
        urls = urls[:MAX_URLS]

    results = []
    loadable = []
    for url in urls:
        verdict = classify_url(url)
        if verdict == "OK":
            loadable.append(url)
        elif verdict == "DEAD_DNS":
            results.append(_blank(url, "DEAD_DNS", "Domain does not resolve — ad likely taken down"))
        elif verdict == "BLOCKED_PRIVATE":
            results.append(_blank(url, "BLOCKED", "Refused: URL points at internal infrastructure"))
        else:
            results.append(_blank(url, "INVALID", f"Not a scannable http(s) URL ({verdict})"))

    if progress:
        progress(results)

    if not loadable:
        return results

    script_file = payload_file = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as sf:
            sf.write(_SCAN_SCRIPT)
            script_file = sf.name
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as pf:
            json.dump({"urls": loadable, "timeout_ms": PER_URL_TIMEOUT_MS}, pf)
            payload_file = pf.name

        budget = OVERHEAD_S + PER_URL_BUDGET_S * len(loadable)
        proc = subprocess.Popen(
            [sys.executable, script_file, payload_file],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, bufsize=1,
        )

        seen = set()
        try:
            # Read as the subprocess emits, so the UI advances per URL rather
            # than waiting for the whole batch.
            for line in proc.stdout:
                if not line.startswith("RESULT "):
                    continue
                try:
                    raw = json.loads(line[len("RESULT "):])
                except json.JSONDecodeError:
                    continue
                seen.add(raw["url"])
                results.append({
                    "url": raw["url"],
                    "status": "DEAD_DNS" if "DNS" in (raw.get("error") or "")
                              else ("ERROR" if raw.get("error") else "SCANNED"),
                    "status_code": raw.get("status_code"),
                    "harvested_numbers": [
                        {"number": n, "carrier": lookup_carrier(n)} for n in raw.get("numbers", [])
                    ],
                    "telemetry": raw.get("telemetry", []),
                    "telemetry_total": raw.get("telemetry_total", 0),
                    "ocr_used": raw.get("ocr_used", False),
                    "error": raw.get("error", ""),
                })
                if progress:
                    progress(results)
            proc.wait(timeout=budget)
        except subprocess.TimeoutExpired:
            logger.error(f"[BULK SCAN] Batch exceeded {budget}s budget — killing browser")
            proc.kill()
        finally:
            stderr = ""
            try:
                stderr = proc.stderr.read()
            except Exception:
                pass
            if stderr.strip():
                logger.debug(f"[BULK SCAN] subprocess stderr:\n{stderr.strip()[:2000]}")

        # Anything the subprocess never reported on (crash / kill) still needs a row.
        for url in loadable:
            if url not in seen:
                results.append(_blank(url, "ERROR", "Scan did not complete"))

    except Exception as e:
        logger.error(f"[BULK SCAN] Failed: {e}", exc_info=True)
        for url in loadable:
            results.append(_blank(url, "ERROR", str(e)[:200]))
    finally:
        for path in (script_file, payload_file):
            if path and os.path.exists(path):
                try:
                    os.unlink(path)
                except Exception:
                    pass

    if progress:
        progress(results)
    return results
