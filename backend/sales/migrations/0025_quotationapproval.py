from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0024_quotation_terms_and_total"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="QuotationApproval",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sent_to_head", models.BooleanField(default=False)),
                ("sent_to_head_at", models.DateTimeField(blank=True, null=True)),
                ("head_status", models.CharField(choices=[("pending", "Pending"), ("approved", "Approved"), ("declined", "Declined")], default="pending", max_length=20)),
                ("head_comment", models.TextField(blank=True, null=True)),
                ("head_reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("md_status", models.CharField(choices=[("pending", "Pending"), ("approved", "Approved"), ("declined", "Declined")], default="pending", max_length=20)),
                ("md_comment", models.TextField(blank=True, null=True)),
                ("md_reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("head_reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="head_quotation_reviews", to=settings.AUTH_USER_MODEL)),
                ("md_reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="md_quotation_reviews", to=settings.AUTH_USER_MODEL)),
                ("quotation", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="approval_workflow", to="sales.quotation")),
            ],
            options={
                "verbose_name_plural": "Quotation Approvals",
                "ordering": ["-updated_at", "-id"],
            },
        ),
    ]
