from django.urls import path
from reports.consumers import ScamConsumer

websocket_urlpatterns = [
    path("ws/reports/", ScamConsumer.as_asgi()),
]