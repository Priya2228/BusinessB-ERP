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
    CLIENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]

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
    client_status = models.CharField(max_length=20, choices=CLIENT_STATUS_CHOICES, default="pending")
    client_response_remarks = models.TextField(blank=True, null=True)
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


class PurchaseOrder(models.Model):
    po_no = models.CharField(max_length=50, unique=True)
    quotation_no = models.CharField(max_length=50, blank=True, null=True)
    cost_estimation_no = models.CharField(max_length=50, blank=True, null=True)
    po_date = models.DateField()
    po_received_date = models.DateField(blank=True, null=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    file_attachment = models.FileField(upload_to="purchase_orders/", blank=True, null=True)
    rfq_no = models.CharField(max_length=50, blank=True, null=True)
    attention = models.CharField(max_length=150, blank=True, null=True)
    company_address = models.TextField(blank=True, null=True)
    client_address = models.TextField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    scope_rows = models.JSONField(default=list, blank=True)
    total_net_amount = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Purchase Orders"

    def __str__(self):
        return f"{self.po_no} - {self.quotation_no or self.rfq_no or 'Purchase Order'}"


class JobCard(models.Model):
    jobcard_no = models.CharField(max_length=60, unique=True)
    jobcard_date = models.DateField()
    jobcard_status = models.CharField(max_length=60, default="Jobcard created")
    grn_no = models.CharField(max_length=60, blank=True, null=True, unique=True)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="jobcards",
    )
    rfq_no = models.CharField(max_length=50, blank=True, null=True)
    cost_estimation_no = models.CharField(max_length=50, blank=True, null=True)
    client_name = models.CharField(max_length=150, blank=True, null=True)
    company_name = models.CharField(max_length=150, blank=True, null=True)
    attention = models.CharField(max_length=150, blank=True, null=True)
    rfq_type = models.CharField(max_length=100, blank=True, null=True)
    rfq_category = models.CharField(max_length=100, blank=True, null=True)
    job_type = models.CharField(max_length=100, blank=True, null=True)
    scope_type = models.CharField(max_length=150, blank=True, null=True)
    scope_description = models.TextField(blank=True, null=True)
    scope_remarks = models.TextField(blank=True, null=True)
    planning_date = models.DateField(blank=True, null=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="supervised_jobcards",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "Job Cards"

    def __str__(self):
        reference = self.rfq_no or (self.purchase_order and self.purchase_order.po_no) or "JobCard"
        return f"{self.jobcard_no} - {reference}"


class OperationHeadRegistration(models.Model):
    operation_no = models.CharField(max_length=80, unique=True)
    operation_date = models.DateField()
    jobcard = models.ForeignKey(
        JobCard,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="operation_registrations",
    )
    rfq_no = models.CharField(max_length=50, blank=True, null=True)
    rfq_date = models.DateField(blank=True, null=True)
    rfq_category = models.CharField(max_length=100, blank=True, null=True)
    rfq_type = models.CharField(max_length=100, blank=True, null=True)
    cost_estimation_no = models.CharField(max_length=50, blank=True, null=True)
    cost_estimation_date = models.DateField(blank=True, null=True)
    client_name = models.CharField(max_length=150, blank=True, null=True)
    attention_name = models.CharField(max_length=150, blank=True, null=True)
    po_no = models.CharField(max_length=50, blank=True, null=True)
    po_date = models.DateField(blank=True, null=True)
    jobcard_no = models.CharField(max_length=60, blank=True, null=True)
    jobcard_date = models.DateField(blank=True, null=True)
    plan_start_date = models.DateField(blank=True, null=True)
    target_completion_date = models.DateField(blank=True, null=True)
    po_delivery_date = models.DateField(blank=True, null=True)
    expected_delivery_date = models.DateField(blank=True, null=True)
    shopfloor_incharge = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="shopfloor_registrations",
    )
    remarks = models.TextField(blank=True, null=True)
    notified_supervisor = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "Operation Head Registrations"

    def __str__(self):
        return f"{self.operation_no} ({self.rfq_no or 'No RFQ'})"


class ShopfloorExecution(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_IN_PROGRESS, "In Progress"),
        (STATUS_COMPLETED, "Execution Complete"),
    ]

    jobcard = models.OneToOneField(
        JobCard, related_name="shopfloor_execution", on_delete=models.CASCADE
    )
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_DRAFT)

    inspection_start_date = models.DateField(blank=True, null=True)
    inspection_end_date = models.DateField(blank=True, null=True)
    inspection_done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="inspection_done_executions",
    )
    inspection_validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="inspection_validated_executions",
    )
    incoming_inspection_checklist = models.TextField(blank=True, null=True)
    inspection_report = models.FileField(upload_to="shopfloor/inspection/report", blank=True, null=True)
    inspection_additional_file = models.FileField(
        upload_to="shopfloor/inspection/attachments", blank=True, null=True
    )
    inspection_remarks = models.TextField(blank=True, null=True)

    disassembly_start_date = models.DateField(blank=True, null=True)
    disassembly_end_date = models.DateField(blank=True, null=True)
    disassembly_done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="disassembly_done_executions",
    )
    disassembly_validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="disassembly_validated_executions",
    )

    assessment_start_date = models.DateField(blank=True, null=True)
    assessment_end_date = models.DateField(blank=True, null=True)
    assessment_done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assessment_done_executions",
    )
    assessment_validated_by_qc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assessment_validated_qc_executions",
    )
    assessment_validated_by_hod = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assessment_validated_hod_executions",
    )
    assessment_approved_by_hod = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assessment_approved_hod_executions",
    )
    assessment_spare_repair_recommended = models.TextField(blank=True, null=True)
    assessment_opening_report = models.FileField(
        upload_to="shopfloor/assessment/opening_report", blank=True, null=True
    )
    assessment_remarks = models.TextField(blank=True, null=True)

    spare_repair_start_date = models.DateField(blank=True, null=True)
    spare_repair_end_date = models.DateField(blank=True, null=True)
    spare_repair_done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="spare_repair_done_executions",
    )
    spare_repair_validated_by_qc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="spare_repair_validated_qc_executions",
    )
    spare_repair_remarks = models.TextField(blank=True, null=True)

    assembly_start_date = models.DateField(blank=True, null=True)
    assembly_end_date = models.DateField(blank=True, null=True)
    assembly_done_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assembly_done_executions",
    )
    assembly_validated_by_qc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assembly_validated_qc_executions",
    )
    assembly_validated_by_hod = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assembly_validated_hod_executions",
    )
    assembly_approved_by_hod = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assembly_approved_hod_executions",
    )
    assembly_testing_report = models.FileField(upload_to="shopfloor/assembly/testing", blank=True, null=True)
    assembly_job_completion_report = models.FileField(
        upload_to="shopfloor/assembly/job_completion", blank=True, null=True
    )
    assembly_final_report = models.FileField(
        upload_to="shopfloor/assembly/final", blank=True, null=True
    )
    assembly_shipping_checklist = models.FileField(
        upload_to="shopfloor/assembly/shipping", blank=True, null=True
    )
    assembly_remarks = models.TextField(blank=True, null=True)

    opening_report = models.FileField(upload_to="shopfloor/reports/opening", blank=True, null=True)
    testing_report = models.FileField(upload_to="shopfloor/reports/testing", blank=True, null=True)
    job_completion_report = models.FileField(
        upload_to="shopfloor/reports/job_completion", blank=True, null=True
    )

    notify_note = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Shopfloor Execution"
        verbose_name_plural = "Shopfloor Executions"

    def __str__(self):
        return f"Shopfloor Execution - {self.jobcard.jobcard_no}"


class ShopfloorActivityRequest(models.Model):
    REQUEST_INTERNAL = "internal_service"
    REQUEST_PR = "pr_request"
    REQUEST_MATERIAL = "material_request"
    REQUEST_TRANSPORT = "transport_request"
    REQUEST_CHOICES = [
        (REQUEST_INTERNAL, "Internal Service Request"),
        (REQUEST_PR, "PR Request"),
        (REQUEST_MATERIAL, "Material Request"),
        (REQUEST_TRANSPORT, "Transport Request"),
    ]

    shopfloor_execution = models.ForeignKey(
        ShopfloorExecution,
        related_name="activity_requests",
        on_delete=models.CASCADE,
    )
    request_type = models.CharField(max_length=50, choices=REQUEST_CHOICES)
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="shopfloor_activity_requests",
    )
    status = models.CharField(max_length=40, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Shopfloor Activity Request"
        verbose_name_plural = "Shopfloor Activity Requests"

    def __str__(self):
        return f"{self.get_request_type_display()} for {self.shopfloor_execution.jobcard.jobcard_no}"


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
    RFQ_CATEGORY_STANDARD = "Standard"
    RFQ_CATEGORY_ASSESSMENT = "Quote of Assessment"
    RFQ_CATEGORY_COMPLETION = "Quote of Completion"
    RFQ_CATEGORY_CHOICES = [
        (RFQ_CATEGORY_STANDARD, "Standard"),
        (RFQ_CATEGORY_ASSESSMENT, "Quote of Assessment"),
        (RFQ_CATEGORY_COMPLETION, "Quote of Completion"),
    ]
    rfq_category = models.CharField(
        max_length=50,
        choices=RFQ_CATEGORY_CHOICES,
        default=RFQ_CATEGORY_STANDARD,
        blank=True,
    )
    skip_sales_flow = models.BooleanField(default=False)
    APPROVAL_STATUS_NOT_REQUIRED = "Not Required"
    APPROVAL_STATUS_PENDING_HEAD = "Pending Head"
    APPROVAL_STATUS_PENDING_MD = "Pending MD"
    APPROVAL_STATUS_APPROVED = "Approved"
    APPROVAL_STATUS_CHOICES = [
        (APPROVAL_STATUS_NOT_REQUIRED, "Not Required"),
        (APPROVAL_STATUS_PENDING_HEAD, "Pending Head"),
        (APPROVAL_STATUS_PENDING_MD, "Pending MD"),
        (APPROVAL_STATUS_APPROVED, "Approved"),
    ]
    approval_status = models.CharField(
        max_length=20,
        choices=APPROVAL_STATUS_CHOICES,
        default=APPROVAL_STATUS_NOT_REQUIRED,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="assigned_sales_requests",
    )
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


class QuotationApproval(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("declined", "Declined"),
    ]

    quotation = models.OneToOneField(
        Quotation,
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
        related_name="head_quotation_reviews",
    )

    md_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    md_comment = models.TextField(blank=True, null=True)
    md_reviewed_at = models.DateTimeField(blank=True, null=True)
    md_reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="md_quotation_reviews",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]
        verbose_name_plural = "Quotation Approvals"

    def __str__(self):
        return f"Quotation Approval - {self.quotation.quotation_code}"


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
