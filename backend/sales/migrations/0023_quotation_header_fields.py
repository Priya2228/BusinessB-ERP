from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0022_quotation_and_quotationitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="quotation",
            name="attention_name",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="company_name",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="expiry_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="phone_no",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="quote_validity",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="rfq_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="rfq_no",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="scope_name",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="scope_no",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="scope_remarks",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="quotation",
            name="scope_specification",
            field=models.TextField(blank=True, null=True),
        ),
    ]
