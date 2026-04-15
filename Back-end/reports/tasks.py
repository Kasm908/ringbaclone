import logging
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

logger = logging.getLogger(__name__)


def broadcast_update(report_data: dict):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "scam_reports",
        {
            "type": "scam_update",
            "data": report_data,
        }
    )


@shared_task
def process_resporg_lookup(report_id: str):
    from reports.models import ScamReport, RespOrg, ReportLog
    from reports.services.resporg import lookup_resporg

    try:
        report = ScamReport.objects.get(id=report_id)
        result = lookup_resporg(report.phone_number)

        report.resporg_raw = result.resporg_code

        if result.resporg_code not in ("UNKNWN", "N/A"):
            resporg_obj, _ = RespOrg.objects.get_or_create(
                code=result.resporg_code,
                defaults={
                    "carrier_name": result.carrier_name,
                    "abuse_email": result.abuse_email,
                    "website": result.website,
                },
            )
            report.resporg = resporg_obj

        report.save()

        ReportLog.objects.create(
            report=report,
            action=ReportLog.Action.RESPORG_LOOKUP,
            detail=f"RespOrg: {result.resporg_code} ({result.carrier_name})",
            success=result.resporg_code != "UNKNWN",
        )

        broadcast_update({
            "id": str(report.id),
            "status": report.status,
            "resporg_raw": report.resporg_raw,
            "carrier_name": result.carrier_name,
        })

    except Exception as e:
        logger.error(f"RespOrg lookup failed for report {report_id}: {e}")


@shared_task
def process_report_complaint(report_id: str):

    from reports.models import ScamReport, ReportLog
    from reports.services.mailer import send_resporg_complaint

    try:
        report = ScamReport.objects.select_related("resporg").get(id=report_id)

        abuse_email = report.resporg.abuse_email if report.resporg else ""
        carrier_name = report.resporg.carrier_name if report.resporg else "Unknown"

        success, message = send_resporg_complaint(
            report_id=str(report.id),
            phone_number=report.phone_number,
            brand=report.brand,
            landing_url=report.landing_url,
            resporg_code=report.resporg_raw,
            carrier_name=carrier_name,
            abuse_email=abuse_email,
        )

        if success:
            report.status = ScamReport.Status.REPORTED
            report.report_sent_at = timezone.now()
        else:
            report.status = ScamReport.Status.FAILED

        report.save()

        ReportLog.objects.create(
            report=report,
            action=ReportLog.Action.EMAIL_SENT,
            detail=message,
            success=success,
        )

        broadcast_update({
            "id": str(report.id),
            "status": report.status,
            "message": message,
        })

    except Exception as e:
        logger.error(f"Complaint failed for report {report_id}: {e}")

@shared_task(time_limit=65, soft_time_limit=60)
def scrape_phone_from_url(url: str, lookup_id: str):
    from reports.services.resporg import extract_phone_from_url, lookup_resporg
    
    phone = extract_phone_from_url(url)
    
    if phone:
        # Direct Twilio lookup for the scraped phone number
        result = lookup_resporg(phone)
        broadcast_update({
            "type": "lookup_result",
            "lookup_id": lookup_id,
            "phone_number": phone,
            "carrier_name": result.carrier_name,
            "resporg_code": result.resporg_code,
            "abuse_email": result.abuse_email,
            "is_toll_free": result.is_toll_free,
        })
    else:
        broadcast_update({
            "type": "lookup_result",
            "lookup_id": lookup_id,
            "phone_number": "",
            "carrier_name": "",
            "resporg_code": "",
            "abuse_email": "",
            "is_toll_free": False,
        })


