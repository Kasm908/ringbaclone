from ninja import Schema
from typing import Optional
from uuid import UUID
from datetime import datetime
import re


class RespOrgOut(Schema):
    code: str
    carrier_name: str
    abuse_email: str
    website: str


class ReportLogOut(Schema):
    action: str
    detail: str
    success: bool
    created_at: datetime

class ScamReportIn(Schema):
    brand: str
    phone_number: Optional[str] = ""
    landing_url: Optional[str] = ""
    notes: Optional[str] = ""
    submitted_by: Optional[str] = "api"


class ScamReportOut(Schema):
    id: UUID
    brand: str
    phone_number: str
    landing_url: str
    resporg_raw: str
    resporg: Optional[RespOrgOut] = None
    status: str
    report_sent_at: Optional[datetime] = None
    screenshot_path: str
    notes: str
    submitted_by: str
    created_at: datetime
    updated_at: datetime


class ScamReportDetail(ScamReportOut):
    logs: list[ReportLogOut] = []


class StatsOut(Schema):
    total: int
    pending: int
    reported: int
    killed: int
    failed: int
    this_week: int


class ReportActionOut(Schema):
    success: bool
    message: str
    report_id: UUID
    new_status: str


class PaginatedReports(Schema):
    total: int
    page: int
    page_size: int
    results: list[ScamReportOut]



class LookupIn(Schema):
    input: str
    is_url: bool = False

