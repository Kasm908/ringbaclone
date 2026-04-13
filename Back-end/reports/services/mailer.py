import logging
from datetime import datetime
from django.core.mail import EmailMessage
from django.conf import settings

logger = logging.getLogger(__name__)

COMPLAINT_TEMPLATE = """
Dear {carrier_name} Trust & Safety Team,

We are reporting the following toll-free number for fraudulent activity
impersonating {brand}. We request immediate investigation and termination
of service.

REPORTED NUMBER:    {phone_number}
IMPERSONATED BRAND: {brand}
RespOrg ID:         {resporg_code}
LANDING PAGE:       {landing_url}
DATE DETECTED:      {date_detected}
REPORT ID:          {report_id}

Evidence:
This number has been used in active social engineering attacks against
consumers. The landing page (if applicable) has been documented with
screenshot evidence available upon request.

Applicable Law:
- 47 U.S.C. § 228 (Prohibition on Provision of Certain Operator Services)
- FTC Act § 5 (Unfair or Deceptive Acts or Practices)
- TRACED Act (2019) — carrier obligations to combat robocall fraud

We request:
1. Immediate suspension of the number {phone_number}
2. Preservation of all subscriber records for law enforcement
3. Confirmation of action to: {reply_to}

Sincerely,
Scam Slayer Portal
Automated Abuse Reporting System
""".strip()


def send_resporg_complaint(
    report_id: str,
    phone_number: str,
    brand: str,
    landing_url: str,
    resporg_code: str,
    carrier_name: str,
    abuse_email: str,
) -> tuple[bool, str]:
    if not abuse_email:
        return False, "No abuse email configured for this carrier."

    if not settings.EMAIL_HOST_USER:
        return False, "Email not configured in settings."

    reply_to = settings.SCAM_SLAYER_REPLY_EMAIL or settings.EMAIL_HOST_USER

    body = COMPLAINT_TEMPLATE.format(
        abuse_email=abuse_email,
        phone_number=phone_number,
        brand=brand,
        resporg_code=resporg_code,
        carrier_name=carrier_name,
        landing_url=landing_url or "N/A",
        date_detected=datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        reply_to=reply_to,
        report_id=report_id,
    )

    try:
        email = EmailMessage(
            subject=f"[URGENT] Toll-Free Number Abuse — {phone_number}",
            body=body,
            from_email=settings.EMAIL_HOST_USER,
            to=[abuse_email],
            reply_to=[reply_to],
        )
        email.send(fail_silently=False)
        logger.info(f"Complaint sent for {phone_number} to {abuse_email}")
        return True, f"Complaint sent to {abuse_email}"
    except Exception as e:
        logger.error(f"Failed to send complaint for {phone_number}: {e}")
        return False, str(e)