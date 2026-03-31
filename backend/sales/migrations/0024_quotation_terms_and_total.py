from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0023_quotation_header_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="quotation",
            name="delivery_terms",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="general_terms",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="payment_terms",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="total_net_amount",
            field=models.FloatField(default=0),
        ),
    ]
