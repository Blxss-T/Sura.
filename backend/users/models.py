from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
        SECURITY = 'SECURITY', 'Security'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.RECEPTIONIST)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.get_username()} ({self.get_role_display()})"

    def get_role_display(self):
        return self.Role(self.role).label if self.role else self.role
