from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceTokenViewSet, InventoryAlertSyncView

router = DefaultRouter()
router.register(r'device-tokens', DeviceTokenViewSet, basename='device-tokens')

urlpatterns = [
    path('inventory-alerts/sync/', InventoryAlertSyncView.as_view(), name='inventory-alert-sync'),
    path('', include(router.urls)),
]
