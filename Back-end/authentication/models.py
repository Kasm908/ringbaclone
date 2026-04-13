from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=[
            ("admin", "Admin"),
            ("operator", "Operator"),
            ("viewer", "Viewer"),
        ],
        default="operator",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"


    def __str__(self):
        return f"{self.email} ({self.role})"