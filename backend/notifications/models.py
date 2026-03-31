from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class DeviceToken(models.Model):
    PLATFORM_CHOICES = [('ANDROID', 'Android'), ('IOS', 'iOS'), ('WEB', 'Web')]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_tokens')
    token = models.TextField(unique=True)
    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class InventoryAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('out_of_stock', 'Out of Stock'),
        ('low_stock', 'Low Stock'),
        ('stock_aging', 'Stock Aging'),
        ('stock_cover', 'Stock Cover'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]

    # FIXED: Pointing to 'sales.Item' to resolve Migration Error
    item = models.ForeignKey('sales.Item', on_delete=models.CASCADE)
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    message = models.TextField()
    severity = models.CharField(max_length=10, default='info')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

class ApprovalRequest(models.Model):
    APPROVAL_TYPE_CHOICES = [
        ('purchase_request', 'Purchase Request'),
        ('clearance_sale', 'Clearance Sale'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    alert = models.OneToOneField(InventoryAlert, on_delete=models.CASCADE, related_name='approval')
    requested_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    approval_type = models.CharField(max_length=20, choices=APPROVAL_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    remarks = models.TextField(blank=True, null=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class NotificationLog(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    alert = models.ForeignKey(InventoryAlert, on_delete=models.SET_NULL, null=True)
    channel = models.CharField(max_length=20) 
    recipient = models.CharField(max_length=255)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    response_payload = models.JSONField(null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)