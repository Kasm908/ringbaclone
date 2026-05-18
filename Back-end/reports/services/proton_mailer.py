import os
import base64
import tempfile
import logging
from datetime import datetime
from seleniumbase import SB

logger = logging.getLogger(__name__)

PROTON_EMAIL    = os.environ.get("PROTON_EMAIL", "")
PROTON_PASSWORD = os.environ.get("PROTON_PASSWORD", "")
SCREENSHOT_DIR  = os.environ.get("PROTON_SCREENSHOT_DIR", "sent_screenshots")
DEBUG_DIR       = "/tmp/proton_debug"


def _debug_shot(sb, label: str):
    """Save a screenshot at a checkpoint and log it."""
    os.makedirs(DEBUG_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%H%M%S")
    path = os.path.join(DEBUG_DIR, f"{timestamp}_{label}.png")
    try:
        sb.save_screenshot(path)
        logger.error(f"[PROTON DEBUG] {label}: {path}")
        print(f"[PROTON DEBUG] {label}: {path}", flush=True)
    except Exception as e:
        logger.error(f"[PROTON DEBUG] Failed to screenshot {label}: {e}")


def send_complaint(
    to: str,
    cc: list,
    phone_number: str,
    scam_url: str,
    carrier_name: str,
    image: dict = None,
):
    logger.error(f"[PROTON DEBUG] START — to={to}, cc={cc}, phone={phone_number}")
    logger.error(f"[PROTON DEBUG] PROTON_EMAIL set: {bool(PROTON_EMAIL)}, PROTON_PASSWORD set: {bool(PROTON_PASSWORD)}")
    print(f"[PROTON DEBUG] START — to={to}", flush=True)
    print(f"[PROTON DEBUG] Credentials present: email={bool(PROTON_EMAIL)}, pass={bool(PROTON_PASSWORD)}", flush=True)

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

    cc_list = [c for c in (cc or []) if c and c.strip()]
    screenshot_path = None

    try:
        with SB(uc=True, headless=True) as sb:
            logger.error("[PROTON DEBUG] SB session started")
            print("[PROTON DEBUG] SB session started", flush=True)

            sb.open("https://account.proton.me/mail")
            sb.sleep(5)
            _debug_shot(sb, "01_after_open")
            logger.error(f"[PROTON DEBUG] Current URL after open: {sb.get_current_url()}")

            logger.error("[PROTON DEBUG] Waiting for username field")
            sb.wait_for_element_visible('#username', timeout=15)
            sb.type('#username', PROTON_EMAIL)
            _debug_shot(sb, "02_username_typed")

            sb.wait_for_element_visible('input[type="password"]', timeout=15)
            sb.type('input[type="password"]', PROTON_PASSWORD)
            _debug_shot(sb, "03_password_typed")

            sb.click('button[type="submit"]')
            logger.error("[PROTON DEBUG] Login submitted, waiting 10s")
            sb.sleep(10)
            _debug_shot(sb, "04_after_login")
            logger.error(f"[PROTON DEBUG] Current URL after login: {sb.get_current_url()}")
            logger.error(f"[PROTON DEBUG] Page title: {sb.get_page_title()}")

            logger.error("[PROTON DEBUG] Waiting for compose button")
            sb.wait_for_element_visible('button[data-testid="sidebar:compose"]', timeout=20)
            _debug_shot(sb, "05_inbox_loaded")
            sb.click('button[data-testid="sidebar:compose"]')
            sb.sleep(4)
            _debug_shot(sb, "06_compose_opened")

            sb.wait_for_element_visible('input[data-testid="composer:to"]', timeout=15)
            sb.type('input[data-testid="composer:to"]', to)
            sb.send_keys('input[data-testid="composer:to"]', "\t")
            _debug_shot(sb, "07_to_filled")

            if cc_list:
                sb.click('button[data-testid="composer:recipients:cc-button"]')
                sb.sleep(1)
                sb.wait_for_element_visible('input[data-testid="composer:cc"]', timeout=10)
                for addr in cc_list:
                    sb.type('input[data-testid="composer:cc"]', addr)
                    sb.send_keys('input[data-testid="composer:cc"]', "\t")
                    sb.sleep(0.3)
                _debug_shot(sb, "08_cc_filled")

            sb.type('input[data-testid="composer:subject"]', subject)
            _debug_shot(sb, "09_subject_filled")

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
                    data_b64 = image["data"]
                    if "," in data_b64:
                        data_b64 = data_b64.split(",", 1)[1]
                    mime = image.get("type") or "image/png"
                    data_url = f"data:{mime};base64,{data_b64}"
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
                except Exception as e:
                    logger.error(f"[PROTON DEBUG] Image embed failed: {e}")

            sb.switch_to_default_content()
            _debug_shot(sb, "10_body_filled")

            logger.error("[PROTON DEBUG] Clicking send button")
            sb.click('button[data-testid="composer:send-button"]')
            _debug_shot(sb, "11_send_clicked")

            logger.error("[PROTON DEBUG] Waiting for composer to close")
            sb.wait_for_element_not_visible('section[data-testid="composer-0"]', timeout=60)
            _debug_shot(sb, "12_after_send")
            logger.error(f"[PROTON DEBUG] URL after send: {sb.get_current_url()}")

            sb.sleep(2)
            sb.click('a[data-testid="navigation-link:all-sent"]')
            sb.sleep(3)
            _debug_shot(sb, "13_sent_folder")

            sb.wait_for_element_visible('div[data-testid^="message-item:"]', timeout=15)
            sb.sleep(1)
            sb.execute_script("""
                var items = Array.from(document.querySelectorAll('div[data-testid^="message-item:"]'));
                var best = null; var bestTime = 0;
                items.forEach(function(item) {
                    var timeEl = item.querySelector('time[data-testid="item-date-simple"]');
                    if (timeEl && timeEl.getAttribute('datetime')) {
                        var t = new Date(timeEl.getAttribute('datetime')).getTime();
                        if (t > bestTime) { bestTime = t; best = item; }
                    }
                });
                if (best) { best.click(); }
                else if (items.length) { items[0].click(); }
            """)
            sb.sleep(4)
            _debug_shot(sb, "14_email_opened")

            os.makedirs(SCREENSHOT_DIR, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_to = to.replace("@", "_at_")
            screenshot_path = os.path.join(SCREENSHOT_DIR, f"sent_{safe_to}_{timestamp}.png")
            sb.save_screenshot(screenshot_path)
            logger.error(f"[PROTON DEBUG] FINAL screenshot saved: {screenshot_path}")

        return True, "Email sent successfully", screenshot_path

    except Exception as e:
        logger.error(f"[PROTON DEBUG] EXCEPTION: {type(e).__name__}: {e}", exc_info=True)
        return False, f"Send failed: {type(e).__name__}: {e}", screenshot_path