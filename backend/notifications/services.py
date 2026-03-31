from sales.models import Item
from .models import DeviceToken, InventoryAlert, NotificationLog
from .firebase import send_push

def send_alert_push(alert):
    """Rule 17: Fetch tokens and log results"""
    # Notify all admins or specific assigned users
    tokens = DeviceToken.objects.filter(is_active=True) 
    
    for device in tokens:
        success, response = send_push(
            token=device.token,
            title=f"ERP Alert: {alert.get_alert_type_display()}",
            body=alert.message,
            data={"alert_id": str(alert.id)}
        )
        
        # Log the attempt
        NotificationLog.objects.create(
            alert=alert,
            channel='push',
            recipient=device.user.username,
            status='sent' if success else 'failed',
            response_payload={"response": response}
        )
    
    if tokens.exists():
        alert.status = 'sent'
        alert.save()


ALERT_TYPE_LABELS = {
    'out_of_stock': 'Out of Stock',
    'low_stock': 'Low Stock',
    'stock_aging': 'Stock Aging',
    'stock_cover': 'Stock Cover',
}


def build_alert_message(payload):
    alert_type = payload.get('type')
    item_name = payload.get('item_name') or payload.get('item_code') or 'Item'
    quantity = payload.get('quantity')
    min_stock_qty = payload.get('min_stock_qty')
    days_cover = payload.get('days_cover')
    age_days = payload.get('age_days')

    if alert_type == 'out_of_stock':
        return f"CRITICAL: {item_name} is out of stock!"
    if alert_type == 'low_stock':
        balance = quantity if quantity is not None else 0
        threshold = min_stock_qty if min_stock_qty is not None else 0
        return f"Warning: {item_name} is below minimum levels ({balance} left, minimum {threshold})."
    if alert_type == 'stock_aging':
        aging = age_days if age_days is not None else 0
        return f"Warning: {item_name} stock is aging ({aging} days old)."
    if alert_type == 'stock_cover':
        cover = days_cover if days_cover is not None else 0
        return f"Warning: {item_name} has low stock cover ({cover} days)."
    return f"{ALERT_TYPE_LABELS.get(alert_type, 'Inventory Alert')}: {item_name}"


def sync_inventory_alerts(alert_payloads):
    created_alerts = []
    skipped = 0

    for payload in alert_payloads:
        alert_type = payload.get('type')
        item_code = str(payload.get('item_code') or '').strip()
        if not alert_type or not item_code:
            skipped += 1
            continue

        item = Item.objects.filter(item_code=item_code).first()
        if not item:
            skipped += 1
            continue

        message = build_alert_message(payload)
        severity = payload.get('severity') or ('critical' if alert_type == 'out_of_stock' else 'warning')

        existing_alert = InventoryAlert.objects.filter(
            item=item,
            alert_type=alert_type,
            message=message,
            status__in=['pending', 'sent', 'read']
        ).order_by('-created_at').first()

        if existing_alert:
            skipped += 1
            continue

        alert = InventoryAlert.objects.create(
            item=item,
            alert_type=alert_type,
            message=message,
            severity=severity,
        )
        send_alert_push(alert)
        created_alerts.append(alert)

    return {
        'created': len(created_alerts),
        'skipped': skipped,
    }
