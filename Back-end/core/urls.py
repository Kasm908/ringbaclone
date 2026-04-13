from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI
from ninja.security import HttpBearer
from authentication.api import router as auth_router, AuthBearer
from reports.api import router as reports_router

auth = AuthBearer()

api = NinjaAPI(
    title="Scam Slayer API",
    version="1.0.0",
    description="Real-time scam number tracking and automated reporting.",
    docs_url="/docs",
)

api.add_router("/auth/", auth_router)
api.add_router("/v1/", reports_router)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]