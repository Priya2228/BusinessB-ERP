from django.conf import settings
from django.db import models

class Dispatchdetails(models.Model):
    ledger = models.CharField(max_length=100, blank=True, null=True)
    sup_ref = models.CharField(max_length=50, unique=True)
    dispatch_docno = models.CharField(max_length=50, unique=True)
    dispatch_through = models.CharField(max_length=50)
    destination = models.CharField(max_length=100, blank=True, null=True)
    credit_days = models.IntegerField(default=0)
    quantity = models.FloatField()
    rate = models.FloatField()
    discount_percent = models.FloatField(default=0)
    tax_amount = models.FloatField()
    amount = models.FloatField()
    description = models.TextField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    terms_type = models.CharField(max_length=50, blank=True, null=True)
    terms_conditions = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True) 

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Dispatch Details"

    def __str__(self):
        return f"{self.dispatch_docno} - {self.ledger}"

class InvoiceItem(models.Model):
    dispatch = models.ForeignKey(
        Dispatchdetails, 
        related_name='items', 
        on_delete=models.CASCADE,
        null=True, 
        blank=True
    )
    item_code = models.CharField(max_length=50) 
    item_name = models.CharField(max_length=100)
    unit = models.CharField(max_length=20)
    quantity = models.FloatField()
    rate = models.FloatField()
    discount_percent = models.FloatField(default=0)
    tax_amount = models.FloatField() 
    amount = models.FloatField() 
    ledger = models.CharField(max_length=100, blank=True, null=True)
    bill_type = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        # Commented out to prevent the IntegrityError crash
        # unique_together = ('dispatch', 'item_code') 
        verbose_name_plural = "Invoice Items"

    def __str__(self):
        return f"{self.item_name} ({self.item_code})"


class Quotation(models.Model):
    customer_name = models.CharField(max_length=150)
    quotation_code = models.CharField(max_length=50, unique=True)
    quotation_date = models.DateField()
    expiry_date = models.DateField(blank=True, null=True)
    quote_validity = models.CharField(max_length=20, blank=True, null=True)
    rfq_no = models.CharField(max_length=50, blank=True, null=True)
    rfq_date = models.DateField(blank=True, null=True)
    attention_name = models.CharField(max_length=150, blank=True, null=True)
    company_name = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone_no = models.CharField(max_length=20, blank=True, null=True)
    scope_no = models.CharField(max_length=50, blank=True, null=True)
    scope_name = models.CharField(max_length=255, blank=True, null=True)
    scope_specification = models.TextField(blank=True, null=True)
    scope_remarks = models.TextField(blank=True, null=True)
    payment_terms = models.TextField(blank=True, null=True)
    delivery_terms = models.TextField(blank=True, null=True)
    general_terms = models.TextField(blank=True, null=True)
    total_net_amount = models.FloatField(default=0)
    remarks = models.TextField(blank=True, null=True)
    terms_type = models.CharField(max_length=100, blank=True, null=True)
    terms_conditions = models.TextField(blank=True, null=True)
    currency_country = models.CharField(max_length=50, default="India")
    currency_symbol = models.CharField(max_length=20, default="Rs.")
    conversion_rate = models.FloatField(default=1)
    tax_rate = models.FloatField(default=0)
    decimal_places = models.PositiveIntegerField(default=2)
    taxable_amount = models.FloatField(default=0)
    tax_amount = models.FloatField(default=0)
    discount_amount = models.FloatField(default=0)
    subtotal = models.FloatField(default=0)
    round_off = models.FloatField(default=0)
    net_amount = models.FloatField(default=0)
    revise_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Quotations"

    def __str__(self):
        return f"{self.quotation_code} - {self.customer_name}"


class QuotationItem(models.Model):
    quotation = models.ForeignKey(
        Quotation,
        related_name="items",
        on_delete=models.CASCADE,
    )
    item_code = models.CharField(max_length=50, blank=True, null=True)
    item_name = models.CharField(max_length=150)
    item_category = models.CharField(max_length=100, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    quantity = models.FloatField(default=0)
    rate = models.FloatField(default=0)
    discount_percent = models.FloatField(default=0)
    tax_amount = models.FloatField(default=0)
    amount = models.FloatField(default=0)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        verbose_name_plural = "Quotation Items"

    def __str__(self):
        return f"{self.item_name} ({self.quotation_id})"


class Item(models.Model):
    # Basic Information
    item_code = models.CharField(max_length=50, unique=True)
    item_name = models.CharField(max_length=100)
    item_image = models.ImageField(upload_to='items/', blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    item_type = models.CharField(max_length=50, blank=True, null=True)
    item_group = models.CharField(max_length=50, blank=True, null=True)
    item_category = models.CharField(max_length=50, blank=True, null=True)
    
    # Financials (Matching your table screenshot)
    hsn_sac_code = models.CharField(max_length=20, blank=True, null=True)
    mrp = models.DecimalField(max_digits=12, decimal_places=3, default=0.000)
    purchase_price = models.DecimalField(max_digits=12, decimal_places=3, default=0.000)
    sales_price = models.DecimalField(max_digits=12, decimal_places=3, default=0.000)
    tax = models.CharField(max_length=20, blank=True, null=True)
    
    # Inventory Details
    part_no = models.CharField(max_length=20, blank=True, null=True)
    batch_no = models.CharField(max_length=20, blank=True, null=True)
    min_order_qty = models.IntegerField(default=1)
    min_stock_qty = models.IntegerField(default=0)
    description = models.TextField(max_length=250, blank=True, null=True)
    
    # Status Flags
    is_stock = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    need_qc = models.BooleanField(default=False)
    need_service = models.BooleanField(default=False)
    need_warranty = models.BooleanField(default=False)
    need_serial_no = models.BooleanField(default=False)

    def __str__(self):
        return self.item_name


class SalesServiceRequest(models.Model):
    rfq_no = models.CharField(max_length=50, unique=True)
    registered_date = models.DateField()
    delivery_date = models.DateField(blank=True, null=True)
    enquiry_mode = models.CharField(max_length=20, blank=True, null=True)
    client_name = models.CharField(max_length=150)
    company_name = models.CharField(max_length=150)
    client_location = models.CharField(max_length=255, blank=True, null=True)
    phone_no = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    email_ref_no = models.CharField(max_length=100, blank=True, null=True)
    email_attachment = models.FileField(upload_to="sales_service_attachments/", blank=True, null=True)
    project_title = models.CharField(max_length=255, blank=True, null=True)
    service_category = models.CharField(max_length=100, blank=True, null=True)
    fabric_specs = models.TextField(blank=True, null=True)
    branding_type = models.CharField(max_length=100, blank=True, null=True)
    size_breakdown = models.TextField(blank=True, null=True)
    scope_of_work = models.TextField(blank=True, null=True)
    plan_rfq_type = models.CharField(max_length=100, blank=True, null=True)
    delivery_department = models.CharField(max_length=150, blank=True, null=True)
    plan_start_date = models.DateField(blank=True, null=True)
    plan_end_date = models.DateField(blank=True, null=True)
    expected_deadline = models.DateField(blank=True, null=True)
    item_name = models.CharField(max_length=150, blank=True, null=True)
    quantity = models.FloatField(default=0, blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    tax_preference = models.CharField(max_length=100, blank=True, null=True)
    delivery_location = models.CharField(max_length=255, blank=True, null=True)
    delivery_mode = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Sales Service Requests"

    def __str__(self):
        return f"{self.rfq_no} - {self.client_name}"


class CostEstimation(models.Model):
    estimation_no = models.CharField(max_length=50, unique=True)
    rfq_no = models.CharField(max_length=50)
    registered_date = models.DateField()
    delivery_date = models.DateField(blank=True, null=True)
    client_name = models.CharField(max_length=150)
    company_name = models.CharField(max_length=150)
    phone_no = models.CharField(max_length=15, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    delivery_location = models.CharField(max_length=255, blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    tax_preference = models.CharField(max_length=100, blank=True, null=True)
    delivery_mode = models.CharField(max_length=100, blank=True, null=True)
    dress_name = models.CharField(max_length=150, blank=True, null=True)
    dress_code = models.CharField(max_length=50, blank=True, null=True)
    dress_type = models.CharField(max_length=50, blank=True, null=True)
    dress_category = models.CharField(max_length=50, blank=True, null=True)
    dress_unit = models.CharField(max_length=50, blank=True, null=True)
    dress_rate = models.FloatField(default=0)
    quantity = models.FloatField(default=0)
    remarks = models.TextField(blank=True, null=True)
    sections = models.JSONField(default=dict, blank=True)
    section_totals = models.JSONField(default=dict, blank=True)
    grand_total = models.FloatField(default=0)
    status = models.CharField(max_length=20, default="ACTIVE")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Cost Estimations"

    def __str__(self):
        return f"{self.estimation_no} - {self.company_name}"


class CostEstimationApproval(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("declined", "Declined"),
    ]

    cost_estimation = models.OneToOneField(
        CostEstimation,
        on_delete=models.CASCADE,
        related_name="approval_workflow",
    )
    sent_to_head = models.BooleanField(default=False)
    sent_to_head_at = models.DateTimeField(blank=True, null=True)

    head_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    head_comment = models.TextField(blank=True, null=True)
    head_reviewed_at = models.DateTimeField(blank=True, null=True)
    head_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="head_cost_estimation_reviews",
    )

    md_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    md_comment = models.TextField(blank=True, null=True)
    md_reviewed_at = models.DateTimeField(blank=True, null=True)
    md_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="md_cost_estimation_reviews",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        verbose_name_plural = "Cost Estimation Approvals"

    def __str__(self):
        return f"Approval - {self.cost_estimation.estimation_no}"


class CostEstimationOptionBase(models.Model):
    item_name = models.CharField(max_length=150)
    details = models.CharField(max_length=255, blank=True, null=True)
    unit = models.CharField(max_length=50)
    cost = models.FloatField(default=0)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.item_name


class RawMaterialOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Raw Material Options"


class ProductionCostOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Production Cost Options"


class AddonCostOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Add-on Cost Options"


class SewingCostOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Sewing Cost Options"


class ThreadworkFinishingOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Threadwork & Finishing Options"


class PackagingLogisticsOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Packaging & Logistics Options"


class MiscellaneousOption(CostEstimationOptionBase):
    class Meta(CostEstimationOptionBase.Meta):
        verbose_name_plural = "Miscellaneous Options"
