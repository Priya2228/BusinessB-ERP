from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0026_quotation_client_response"),
    ]

    operations = [
        migrations.CreateModel(
            name="PurchaseOrder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("po_no", models.CharField(max_length=50, unique=True)),
                ("po_date", models.DateField()),
                ("file_attachment", models.FileField(blank=True, null=True, upload_to="purchase_orders/")),
                ("rfq_no", models.CharField(blank=True, max_length=50, null=True)),
                ("attention", models.CharField(blank=True, max_length=150, null=True)),
                ("company_address", models.TextField(blank=True, null=True)),
                ("client_address", models.TextField(blank=True, null=True)),
                ("email", models.EmailField(blank=True, max_length=254, null=True)),
                ("phone_number", models.CharField(blank=True, max_length=20, null=True)),
                ("scope_rows", models.JSONField(blank=True, default=list)),
                ("total_net_amount", models.FloatField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "Purchase Orders",
                "ordering": ["-created_at"],
            },
        ),
    ]
