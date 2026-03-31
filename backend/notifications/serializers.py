from rest_framework import serializers
from .models import DeviceToken


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['token', 'platform']


class InventoryAlertSyncItemSerializer(serializers.Serializer):
    type = serializers.CharField(max_length=20)
    item_code = serializers.CharField(max_length=50)
    item_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    severity = serializers.CharField(max_length=10, required=False, allow_blank=True)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    min_stock_qty = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    days_cover = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    age_days = serializers.IntegerField(required=False)
    clearance_required = serializers.BooleanField(required=False)


class InventoryAlertSyncSerializer(serializers.Serializer):
    alerts = InventoryAlertSyncItemSerializer(many=True)
