import os
import base64
import tempfile
from datetime import datetime
from seleniumbase import SB

PROTON_EMAIL    = os.environ.get("PROTON_EMAIL", "")
PROTON_PASSWORD = os.environ.get("PROTON_PASSWORD", "")


def send_complaint(to, cc, phone_number, scam_url, carrier_name, image=None):
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
            sb.open("https://account.proton.me/mail")
            sb.sleep(5)

            sb.wait_for_element_visible('#username', timeout=15)
            sb.type('#username', PROTON_EMAIL)
            sb.type('input[type="password"]', PROTON_PASSWORD)
            sb.click('button[type="submit"]')
            sb.sleep(10)

            sb.wait_for_element_visible('button[data-testid="sidebar:compose"]', timeout=20)
            sb.click('button[data-testid="sidebar:compose"]')
            sb.sleep(4)

            sb.type('input[data-testid="composer:to"]', to)
            sb.send_keys('input[data-testid="composer:to"]', "\t")

            cc_list = [c for c in (cc or []) if c and c.strip()]
            if cc_list:
                sb.click('button[data-testid="composer:recipients:cc-button"]')
                sb.sleep(1)
                for addr in cc_list:
                    sb.type('input[data-testid="composer:cc"]', addr)
                    sb.send_keys('input[data-testid="composer:cc"]', "\t")

            sb.type('input[data-testid="composer:subject"]', subject)

            sb.switch_to_frame('iframe[data-testid="rooster-iframe"]')
            sb.wait_for_element_visible('#rooster-editor', timeout=15)
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
                    ext = (image.get("type") or "image/png").split("/")[-1]
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
                    tmp.write(base64.b64decode(data_b64))
                    tmp.close()
                    with open(tmp.name, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")
                    data_url = f"data:image/{ext};base64,{b64}"
                    sb.execute_script("""
                        var editor = document.querySelector('#rooster-editor');
                        editor.focus();
                        var img = document.createElement('img');
                        img.src = arguments[0];
                        img.style.maxWidth = '100%';
                        editor.appendChild(document.createElement('br'));
                        editor.appendChild(img);
                    """, data_url)
                except Exception as e:
                    print(f"Image embed failed: {e}")

            sb.switch_to_default_content()
            sb.click('button[data-testid="composer:send-button"]')
            sb.wait_for_element_not_visible('section[data-testid="composer-0"]', timeout=30)

        return True, "Email sent successfully", None

    except Exception as e:
        return False, f"Send failed: {type(e).__name__}: {e}", None