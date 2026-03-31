from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0021_costestimationapproval"),
    ]

    operations = [
        migrations.CreateModel(
            name="Quotation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("customer_name", models.CharField(max_length=150)),
                ("quotation_code", models.CharField(max_length=50, unique=True)),
                ("quotation_date", models.DateField()),
                ("remarks", models.TextField(blank=True, null=True)),
                ("terms_type", models.CharField(blank=True, max_length=100, null=True)),
                ("terms_conditions", models.TextField(blank=True, null=True)),
                ("currency_country", models.CharField(default="India", max_length=50)),
                ("currency_symbol", models.CharField(default="Rs.", max_length=20)),
                ("conversion_rate", models.FloatField(default=1)),
                ("tax_rate", models.FloatField(default=0)),
                ("decimal_places", models.PositiveIntegerField(default=2)),
                ("taxable_amount", models.FloatField(default=0)),
                ("tax_amount", models.FloatField(default=0)),
                ("discount_amount", models.FloatField(default=0)),
                ("subtotal", models.FloatField(default=0)),
                ("round_off", models.FloatField(default=0)),
                ("net_amount", models.FloatField(default=0)),
                ("revise_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "Quotations",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="QuotationItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_code", models.CharField(blank=True, max_length=50, null=True)),
                ("item_name", models.CharField(max_length=150)),
                ("item_category", models.CharField(blank=True, max_length=100, null=True)),
                ("unit", models.CharField(blank=True, max_length=50, null=True)),
                ("quantity", models.FloatField(default=0)),
                ("rate", models.FloatField(default=0)),
                ("discount_percent", models.FloatField(default=0)),
                ("tax_amount", models.FloatField(default=0)),
                ("amount", models.FloatField(default=0)),
                ("description", models.TextField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "quotation",
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name="items", to="sales.quotation"),
                ),
            ],
            options={
                "verbose_name_plural": "Quotation Items",
                "ordering": ["id"],
            },
        ),
    ]
