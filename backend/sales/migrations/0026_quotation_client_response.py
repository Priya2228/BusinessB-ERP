from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0025_quotationapproval"),
    ]

    operations = [
        migrations.AddField(
            model_name="quotation",
            name="client_response_remarks",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="client_status",
            field=models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected")], default="pending", max_length=20),
        ),
    ]
