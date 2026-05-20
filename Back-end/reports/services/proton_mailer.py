import os
import base64
import urllib.request
import tempfile
import logging
from datetime import datetime
from seleniumbase import SB

logger = logging.getLogger(__name__)

PROTON_EMAIL    = os.environ.get("PROTON_EMAIL", "")
PROTON_PASSWORD = os.environ.get("PROTON_PASSWORD", "")


def resolve_image(path_or_url):
    if path_or_url.startswith(("http://", "https://")):
        ext = os.path.splitext(path_or_url.split("?")[0])[1] or ".png"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        tmp.close()
        req = urllib.request.Request(path_or_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r, open(tmp.name, "wb") as f:
            f.write(r.read())
        return tmp.name
    return path_or_url


def embed_image_as_base64(sb, image_path):
    ext = os.path.splitext(image_path)[1].lower().lstrip(".")
    mime = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "gif": "gif", "webp": "webp"}.get(ext, "png")
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    data_url = f"data:image/{mime};base64,{b64}"
    sb.execute_script(
        """
        var editor = document.querySelector('#rooster-editor');
        editor.focus();
        var img = document.createElement('img');
        img.src = arguments[0];
        img.style.maxWidth = '100%';
        editor.appendChild(document.createElement('br'));
        editor.appendChild(img);
        """,
        data_url,
    )


def send_complaint(to, cc, phone_number, scam_url, carrier_name, image=None):
    logger.error(f"[SELENIUM] START — to={to}, cc={cc}, phone={phone_number}")
    logger.error(f"[SELENIUM] PROTON_EMAIL set: {bool(PROTON_EMAIL)}, PROTON_PASSWORD set: {bool(PROTON_PASSWORD)}")

    subject = "Formal Abuse Report — Tech Support Scam Infrastructure"
    body = f"""To the Compliance and Legal Departments of {carrier_name} and Microsoft Corporation,

This is a formal notification that your respective infrastructures — specifically {carrier_name}'s call-routing services and Microsoft's Azure Front Door — are currently being utilized to facilitate a criminal tech support scam.

EVIDENCE OF FRAUDULENT ACTIVITY:
Scam Phone Number: {phone_number}
Scam URL: {scam_url}
Carrier / Routing Provider: {carrier_name}

LEGAL NOTICE & ESCALATION:
Comprehensive evidence of this fraud, including the technical architecture used to trap victims, has been compiled and formally submitted to the Federal Bureau of Investigation (FBI), the Federal Communications Commission (FCC), and Federal Court authorities.

By providing the telecommunications and hosting infrastructure for this scam, your companies are enabling the financial exploitation of consumers. Under federal regulations, continuing to provide service to these known malicious actors after receiving this formal evidence may constitute negligence and complicity in fraudulent activities.

DEMAND FOR IMMEDIATE ACTION:
I demand the immediate termination of the following:
- {carrier_name}: Shut down all routing, tracking, and voice services associated with the phone number listed above.
- Microsoft: Deactivate the Azure Front Door endpoint and all associated hosting resources for the malicious URL listed above.

Failure to act immediately to neutralize these fraudulent assets will result in further legal escalations and the inclusion of your company details in the formal evidence packets provided to federal prosecutors and the courts regarding this criminal enterprise.

We expect a confirmation of service termination within 24 hours.

Evidence attached below:
"""

    try:
        with SB(uc=True, headless=True) as sb:
            logger.error("[SELENIUM] Opening Proton Mail")
            sb.open("https://account.proton.me/mail")
            sb.sleep(5)

            logger.error("[SELENIUM] Logging in")
            sb.wait_for_element_visible('#username', timeout=15)
            sb.type('#username', PROTON_EMAIL)
            sb.wait_for_element_visible('input[type="password"]', timeout=15)
            sb.type('input[type="password"]', PROTON_PASSWORD)
            sb.click('button[type="submit"]')
            sb.sleep(10)

            logger.error(f"[SELENIUM] URL after login: {sb.get_current_url()}")
            sb.save_screenshot("/tmp/after_login.png")
            logger.error("[SELENIUM] Screenshot saved to /tmp/after_login.png")

            logger.error("[SELENIUM] Opening compose")
            sb.wait_for_element_visible('button[data-testid="sidebar:compose"]', timeout=40)
            sb.click('button[data-testid="sidebar:compose"]')
            sb.sleep(4)

            logger.error(f"[SELENIUM] Filling To: {to}")
            sb.wait_for_element_visible('input[data-testid="composer:to"]', timeout=15)
            sb.type('input[data-testid="composer:to"]', to)
            sb.send_keys('input[data-testid="composer:to"]', "\t")

            cc_list = [c for c in (cc or []) if c and c.strip()]
            if cc_list:
                sb.click('button[data-testid="composer:recipients:cc-button"]')
                sb.sleep(1)
                sb.wait_for_element_visible('input[data-testid="composer:cc"]', timeout=10)
                for addr in cc_list:
                    sb.type('input[data-testid="composer:cc"]', addr)
                    sb.send_keys('input[data-testid="composer:cc"]', "\t")

            logger.error("[SELENIUM] Filling subject and body")
            sb.type('input[data-testid="composer:subject"]', subject)

            sb.switch_to_frame('iframe[data-testid="rooster-iframe"]')
            sb.wait_for_element_visible('#rooster-editor', timeout=15)
            sb.click('#rooster-editor')
            sb.execute_script(
                "document.querySelector('#rooster-editor').innerHTML = "
                "arguments[0].split('\\n').map(function(l){return '<div>' + (l || '<br>') + '</div>';}).join('');",
                body,
            )

            if image and image.get("data"):
                try:
                    logger.error("[SELENIUM] Embedding image")
                    data_b64 = image["data"]
                    if "," in data_b64:
                        data_b64 = data_b64.split(",", 1)[1]
                    ext = (image.get("type") or "image/png").split("/")[-1]
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
                    tmp.write(base64.b64decode(data_b64))
                    tmp.close()
                    embed_image_as_base64(sb, tmp.name)
                    logger.error("[SELENIUM] Image embedded")
                except Exception as e:
                    logger.error(f"[SELENIUM] Image embed failed: {e}")

            sb.switch_to_default_content()

            logger.error("[SELENIUM] Clicking send")
            sb.click('button[data-testid="composer:send-button"]')
            sb.wait_for_element_not_visible('section[data-testid="composer-0"]', timeout=30)
            logger.error("[SELENIUM] Email sent successfully")

        return True, "Email sent successfully", None

    except Exception as e:
        logger.error(f"[SELENIUM] FAILED: {type(e).__name__}: {e}", exc_info=True)
        return False, f"Send failed: {type(e).__name__}: {e}", None