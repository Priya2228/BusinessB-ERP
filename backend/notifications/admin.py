from django.contrib import admin
from .models import DeviceToken, InventoryAlert, ApprovalRequest, NotificationLog

@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'platform', 'is_active', 'created_at')
    list_filter = ('platform', 'is_active')

@admin.register(InventoryAlert)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display = ('item', 'alert_type', 'severity', 'status', 'created_at')
    list_filter = ('alert_type', 'severity', 'status')
    search_fields = ('item__item_name', 'message')

@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ('approval_type', 'status', 'requested_to', 'approved_at', 'created_at')
    list_filter = ('status', 'approval_type')
    readonly_fields = ('created_at',)
    
    # Action to approve multiple requests at once
    actions = ['mark_as_approved']

    def mark_as_approved(self, request, queryset):
        queryset.update(status='approved', approved_at=admin.utils.timezone.now())
    mark_as_approved.short_description = "Approve selected requests"

@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('channel', 'recipient', 'status', 'sent_at')
    list_filter = ('channel', 'status')
    readonly_fields = ('response_payload', 'sent_at')