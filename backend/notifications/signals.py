from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from inventory.models import StockEntry
from .models import InventoryAlert
from .utils import send_push_notification
from django.db.models import Sum

@receiver(post_save, sender=StockEntry)
def check_stock_levels(sender, instance, created, **kwargs):
    """
    Automatically triggers an alert if stock levels are low.
    """
    if created:
        item = instance.item
        # Calculate total current stock for this item
        total_stock = StockEntry.objects.filter(item=item).aggregate(Sum('quantity'))['quantity__sum'] or 0
        
        alert_type = None
        message = ""

        # Logic for Out of Stock
        if total_stock <= 0:
            alert_type = 'out_of_stock'
            message = f"CRITICAL: {item.item_name} is out of stock!"
        
        # Logic for Low Stock
        elif total_stock <= item.min_stock_qty:
            alert_type = 'low_stock'
            message = f"Warning: {item.item_name} is below minimum levels ({total_stock} left)."

        if alert_type:
            # 1. Create the Database Record
            alert = InventoryAlert.objects.create(
                item=item,
                alert_type=alert_type,
                message=message,
                severity='critical' if alert_type == 'out_of_stock' else 'warning'
            )

            # 2. Notify all Superusers (Admins)
            admins = User.objects.filter(is_superuser=True)
            for admin in admins:
                send_push_notification(
                    user=admin,
                    title="Inventory Alert",
                    body=message,
                    data={"alert_id": str(alert.id), "item_code": item.item_code}
                )