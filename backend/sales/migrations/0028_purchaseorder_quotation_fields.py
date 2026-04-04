from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0027_purchaseorder"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchaseorder",
            name="cost_estimation_no",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="expected_delivery_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="po_received_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="purchaseorder",
            name="quotation_no",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
