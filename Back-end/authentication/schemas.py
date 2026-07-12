from ninja import Schema
from typing import Optional
from uuid import UUID
from datetime import datetime


class RegisterIn(Schema):
    email: str
    username: str
    password: str
    # NOTE: 'role' intentionally removed. Roles must never be self-assigned at
    # registration; the server forces the default role below.


class LoginIn(Schema):
    email: str
    password: str


class TokenOut(Schema):
    access: str
    refresh: str
    user_id: UUID
    email: str
    username: str
    role: str


class RefreshIn(Schema):
    refresh: str


class RefreshOut(Schema):
    access: str


class UserOut(Schema):
    id: UUID
    email: str
    username: str
    role: str
    created_at: datetime