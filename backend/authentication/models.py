from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    ROLE_USER = "user"
    ROLE_CLIENT = "client"
    ROLE_SALES_LEAD = "saleslead"
    ROLE_SALES_HEAD = "saleshead"
    ROLE_DEPT_HEAD = "depthead"
    ROLE_MD = "md"
    ROLE_DOCUMENT_CONTROLLER = "documentcontroller"
    ROLE_OPERATION_HEAD = "operationhead"
    ROLE_SITE_ENGINEER = "siteengineer"
    ROLE_STORE_QUEUE = "storequeue"

    ROLE_CHOICES = [
        (ROLE_USER, "User"),
        (ROLE_CLIENT, "Client"),
        (ROLE_SALES_LEAD, "Sales Lead"),
        (ROLE_SALES_HEAD, "Sales Head"),
        (ROLE_DEPT_HEAD, "Department Head"),
        (ROLE_MD, "MD"),
        (ROLE_DOCUMENT_CONTROLLER, "Document Controller"),
        (ROLE_OPERATION_HEAD, "Operation Head"),
        (ROLE_SITE_ENGINEER, "Site Engineer"),
        (ROLE_STORE_QUEUE, "Store Manager"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_USER)
    designation = models.CharField(max_length=100, blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        designation = f" ({self.designation})" if self.designation else ""
        return f"{self.user.username} - {self.role}{designation}"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
