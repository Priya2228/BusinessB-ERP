from django.conf import settings
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0028_purchaseorder_quotation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="salesservicerequest",
            name="rfq_category",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="assigned_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_sales_requests",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
