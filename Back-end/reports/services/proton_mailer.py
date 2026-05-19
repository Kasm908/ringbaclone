import os
import ssl
import smtplib
import logging
import base64
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Proton Bridge SMTP settings
#
# Proton Bridge exposes a local SMTP server on 127.0.0.1:1025 (STARTTLS) or
# 127.0.0.1:1026 (SSL). Set these env vars to match your Bridge config.
#
# Required env vars:
#   PROTON_EMAIL           — your Proton address (e.g. you@proton.me)
#   PROTON_BRIDGE_PASSWORD — the Bridge-generated SMTP password (NOT your
#                            Proton account password; found in Bridge app)
#
# Optional env vars (defaults match Bridge defaults):
#   PROTON_BRIDGE_HOST     — default: 127.0.0.1
#   PROTON_BRIDGE_PORT     — default: 1025  (use 1026 for SSL)
#   PROTON_BRIDGE_SSL      — set to "true" to use SSL instead of STARTTLS
#   PROTON_SCREENSHOT_DIR  — where to save sent confirmations (text receipts)
# ---------------------------------------------------------------------------

PROTON_EMAIL           = os.environ.get("PROTON_EMAIL", "")
PROTON_BRIDGE_PASSWORD = os.environ.get("PROTON_BRIDGE_PASSWORD", "")
BRIDGE_HOST            = os.environ.get("PROTON_BRIDGE_HOST", "127.0.0.1")
BRIDGE_PORT            = int(os.environ.get("PROTON_BRIDGE_PORT", "1025"))
BRIDGE_SSL             = os.environ.get("PROTON_BRIDGE_SSL", "").lower() == "true"
SCREENSHOT_DIR         = os.environ.get("PROTON_SCREENSHOT_DIR", "sent_screenshots")


def send_complaint(
    to: str,
    cc: list,
    phone_number: str,
    scam_url: str,
    carrier_name: str,
    image: dict = None,
):
    logger.error(f"[PROTON] START — to={to}, cc={cc}, phone={phone_number}")
    logger.error(f"[PROTON] PROTON_EMAIL set: {bool(PROTON_EMAIL)}, BRIDGE_PASSWORD set: {bool(PROTON_BRIDGE_PASSWORD)}")
    print(f"[PROTON] START — to={to}", flush=True)

    if not PROTON_EMAIL:
        return False, "PROTON_EMAIL env var not set", None
    if not PROTON_BRIDGE_PASSWORD:
        return False, "PROTON_BRIDGE_PASSWORD env var not set", None

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
    all_recipients = [to] + cc_list

    # -----------------------------------------------------------------------
    # Build the MIME message
    # -----------------------------------------------------------------------
    if image and image.get("data"):
        msg = MIMEMultipart("mixed")
    else:
        msg = MIMEMultipart()

    msg["From"]    = PROTON_EMAIL
    msg["To"]      = to
    msg["Subject"] = subject
    if cc_list:
        msg["Cc"] = ", ".join(cc_list)

    msg.attach(MIMEText(body, "plain", "utf-8"))

    # Attach image if provided
    if image and image.get("data"):
        try:
            data_b64 = image["data"]
            if "," in data_b64:
                data_b64 = data_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(data_b64)
            mime_type = (image.get("type") or "image/png").split("/")[-1]  # e.g. "png"
            img_part = MIMEImage(img_bytes, _subtype=mime_type)
            img_part.add_header(
                "Content-Disposition",
                "attachment",
                filename=f"evidence.{mime_type}",
            )
            msg.attach(img_part)
            logger.error("[PROTON] Image attachment added")
        except Exception as e:
            logger.error(f"[PROTON] Image attach failed (continuing without it): {e}")

    # -----------------------------------------------------------------------
    # Send via Proton Bridge SMTP
    # -----------------------------------------------------------------------
    receipt_path = None
    try:
        logger.error(f"[PROTON] Connecting to Bridge at {BRIDGE_HOST}:{BRIDGE_PORT} (SSL={BRIDGE_SSL})")
        print(f"[PROTON] Connecting to Bridge at {BRIDGE_HOST}:{BRIDGE_PORT}", flush=True)

        context = ssl.create_default_context()
        # Bridge uses a self-signed cert — disable verification for localhost
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if BRIDGE_SSL:
            server = smtplib.SMTP_SSL(BRIDGE_HOST, BRIDGE_PORT, context=context)
        else:
            server = smtplib.SMTP(BRIDGE_HOST, BRIDGE_PORT)
            server.starttls(context=context)

        server.login(PROTON_EMAIL, PROTON_BRIDGE_PASSWORD)
        logger.error("[PROTON] Bridge login successful")
        print("[PROTON] Bridge login successful", flush=True)

        server.sendmail(PROTON_EMAIL, all_recipients, msg.as_string())
        server.quit()

        logger.error(f"[PROTON] Email sent to {all_recipients}")
        print(f"[PROTON] Email sent to {all_recipients}", flush=True)

        # Save a text receipt as the "screenshot" (no browser = no PNG)
        os.makedirs(SCREENSHOT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_to = to.replace("@", "_at_")
        receipt_path = os.path.join(SCREENSHOT_DIR, f"sent_{safe_to}_{timestamp}.txt")
        with open(receipt_path, "w") as f:
            f.write(f"Sent at: {timestamp}\n")
            f.write(f"From: {PROTON_EMAIL}\n")
            f.write(f"To: {to}\n")
            f.write(f"Cc: {', '.join(cc_list)}\n")
            f.write(f"Subject: {subject}\n")
            f.write(f"Phone: {phone_number}\n")
            f.write(f"URL: {scam_url}\n")
            f.write(f"Carrier: {carrier_name}\n")
        logger.error(f"[PROTON] Receipt saved: {receipt_path}")

        return True, "Email sent successfully via Proton Bridge", receipt_path

    except smtplib.SMTPAuthenticationError as e:
        err = (
            f"Bridge authentication failed: {e}. "
            "Make sure PROTON_BRIDGE_PASSWORD is the Bridge app password "
            "(not your Proton account password), and that Bridge is running."
        )
        logger.error(f"[PROTON] {err}")
        return False, err, None

    except ConnectionRefusedError:
        err = (
            f"Could not connect to Proton Bridge at {BRIDGE_HOST}:{BRIDGE_PORT}. "
            "Make sure Proton Bridge is running and the host/port env vars are correct."
        )
        logger.error(f"[PROTON] {err}")
        return False, err, None

    except Exception as e:
        logger.error(f"[PROTON] EXCEPTION: {type(e).__name__}: {e}", exc_info=True)
        return False, f"Send failed: {type(e).__name__}: {e}", receipt_path