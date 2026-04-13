import re
from dataclasses import dataclass
import logging
logger = logging.getLogger(__name__)

CARRIER_TABLE = {
    "800": {"code": "TWLIO", "carrier": "Twilio Inc.", "abuse_email": "abuse@twilio.com", "website": "https://twilio.com"},
    "833": {"code": "BNDWD", "carrier": "Bandwidth Inc.", "abuse_email": "abuse@bandwidth.com", "website": "https://bandwidth.com"},
    "844": {"code": "SINCH", "carrier": "Sinch AB", "abuse_email": "abuse@sinch.com", "website": "https://sinch.com"},
    "855": {"code": "TELNX", "carrier": "Telnyx LLC", "abuse_email": "abuse@telnyx.com", "website": "https://telnyx.com"},
    "866": {"code": "VONET", "carrier": "VoIP.ms", "abuse_email": "support@voip.ms", "website": "https://voip.ms"},
    "877": {"code": "LMTLS", "carrier": "Lumen Technologies", "abuse_email": "abuse@lumen.com", "website": "https://lumen.com"},
    "888": {"code": "VZBUS", "carrier": "Verizon Business", "abuse_email": "abuse@verizon.com", "website": "https://verizonbusiness.com"},
}

TFN_PREFIXES = {"800", "833", "844", "855", "866", "877", "888"}


@dataclass
class RespOrgResult:
    resporg_code: str
    carrier_name: str
    abuse_email: str
    website: str
    is_toll_free: bool


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if digits.startswith("1") and len(digits) == 11:
        digits = digits[1:]
    return digits


def lookup_resporg(phone: str) -> RespOrgResult:
    digits = normalize_phone(phone)
    prefix = digits[:3]

    if prefix not in TFN_PREFIXES:
        return RespOrgResult(
            resporg_code="N/A",
            carrier_name="Not a toll-free number",
            abuse_email="",
            website="",
            is_toll_free=False,
        )

    carrier = CARRIER_TABLE.get(prefix)

    if not carrier:
        return RespOrgResult(
            resporg_code="UNKNWN",
            carrier_name="Unknown Carrier",
            abuse_email="",
            website="",
            is_toll_free=True,
        )

    return RespOrgResult(
        resporg_code=carrier["code"],
        carrier_name=carrier["carrier"],
        abuse_email=carrier["abuse_email"],
        website=carrier["website"],
        is_toll_free=True,
    )

def extract_phone_from_url(url: str) -> str:
    import subprocess
    import sys

    script = f"""
import re
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-gpu",
        ]
    )
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={{"width": 1366, "height": 768}},
        locale="en-US",
    )
    page = context.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', {{get: () => undefined}})")
    try:
        page.goto("{url}", timeout=20000, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # Handle Cloudflare phishing warning - click Ignore & Proceed
        try:
            proceed = page.locator("text=Ignore & Proceed")
            if proceed.count() > 0:
                proceed.click()
                page.wait_for_timeout(3000)
        except:
            pass

        text = page.inner_text("body")
    except Exception as e:
        text = ""
    browser.close()

matches = re.findall(
    r'1?[-.\\s]?\\(?(800|833|844|855|866|877|888)\\)?[-.\\s]?\\d{{3}}[-.\\s]?\\d{{4}}',
    text
)
if matches:
    full = re.search(
        r'1?[-.\\s]?\\(?(800|833|844|855|866|877|888)\\)?[-.\\s]?\\d{{3}}[-.\\s]?\\d{{4}}',
        text
    )
    print(re.sub(r'\\D', '', full.group()) if full else "")
else:
    print("")
"""

    try:
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=40,
        )
        phone = result.stdout.strip()
        if phone:
            return phone
        if result.stderr:
            logger.error(f"Playwright subprocess error: {result.stderr}")
        return ""
    except Exception as e:
        logger.error(f"Playwright extraction failed for {url}: {e}")
        return ""