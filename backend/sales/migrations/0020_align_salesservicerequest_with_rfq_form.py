from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0019_addoncostoption_miscellaneousoption_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="salesservicerequest",
            name="delivery_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="email",
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="phone_no",
            field=models.CharField(blank=True, max_length=15, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="item_name",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="payment_terms",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="tax_preference",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="delivery_location",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="delivery_mode",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="quantity",
            field=models.FloatField(blank=True, default=0, null=True),
        ),
        migrations.AlterField(
            model_name="salesservicerequest",
            name="unit",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="branding_type",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="client_location",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="delivery_department",
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="enquiry_mode",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="expected_deadline",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="fabric_specs",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="plan_end_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="plan_rfq_type",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="plan_start_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="project_title",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="scope_of_work",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="service_category",
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name="salesservicerequest",
            name="size_breakdown",
            field=models.TextField(blank=True, null=True),
        ),
    ]
