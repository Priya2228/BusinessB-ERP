from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0020_align_salesservicerequest_with_rfq_form"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CostEstimationApproval",
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
                ("cost_estimation", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="approval_workflow", to="sales.costestimation")),
                ("head_reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="head_cost_estimation_reviews", to=settings.AUTH_USER_MODEL)),
                ("md_reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="md_cost_estimation_reviews", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "verbose_name_plural": "Cost Estimation Approvals",
                "ordering": ["-updated_at", "-id"],
            },
        ),
    ]
