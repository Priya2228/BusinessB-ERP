from django.contrib import admin

from .models import (
    AddonCostOption,
    CostEstimation,
    CostEstimationApproval,
    MiscellaneousOption,
    PackagingLogisticsOption,
    PurchaseOrder,
    ProductionCostOption,
    RawMaterialOption,
    SalesServiceRequest,
    SewingCostOption,
    ThreadworkFinishingOption,
)


@admin.register(SalesServiceRequest)
class SalesServiceRequestAdmin(admin.ModelAdmin):
    list_display = ("rfq_no", "client_name", "company_name", "service_category", "plan_rfq_type", "created_at")
    search_fields = ("rfq_no", "client_name", "company_name", "project_title", "service_category", "phone_no", "email")


@admin.register(CostEstimation)
class CostEstimationAdmin(admin.ModelAdmin):
    list_display = ("estimation_no", "rfq_no", "company_name", "client_name", "grand_total", "status", "created_at")
    search_fields = ("estimation_no", "rfq_no", "company_name", "client_name")
    list_filter = ("status", "created_at")


@admin.register(CostEstimationApproval)
class CostEstimationApprovalAdmin(admin.ModelAdmin):
    list_display = ("cost_estimation", "sent_to_head", "head_status", "md_status", "updated_at")
    search_fields = ("cost_estimation__estimation_no", "cost_estimation__company_name", "cost_estimation__client_name")
    list_filter = ("sent_to_head", "head_status", "md_status", "updated_at")


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = (
        "po_no",
        "quotation_no",
        "cost_estimation_no",
        "po_date",
        "po_received_date",
        "expected_delivery_date",
        "created_at",
    )
    search_fields = ("po_no", "quotation_no", "cost_estimation_no", "rfq_no", "attention", "email", "phone_number")
    list_filter = ("po_date", "po_received_date", "expected_delivery_date", "created_at")


class CostOptionAdmin(admin.ModelAdmin):
    list_display = ("item_name", "unit", "cost", "display_order", "is_active")
    search_fields = ("item_name", "unit", "details")
    list_filter = ("is_active",)
    ordering = ("display_order", "id")


admin.site.register(RawMaterialOption, CostOptionAdmin)
admin.site.register(ProductionCostOption, CostOptionAdmin)
admin.site.register(AddonCostOption, CostOptionAdmin)
admin.site.register(SewingCostOption, CostOptionAdmin)
admin.site.register(ThreadworkFinishingOption, CostOptionAdmin)
admin.site.register(PackagingLogisticsOption, CostOptionAdmin)
admin.site.register(MiscellaneousOption, CostOptionAdmin)
