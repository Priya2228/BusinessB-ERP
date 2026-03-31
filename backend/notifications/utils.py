import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import os

if not firebase_admin._apps:
    if os.path.exists(settings.FIREBASE_CONFIG_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CONFIG_PATH)
        firebase_admin.initialize_app(cred)

def send_push_notification(user, title, body, data=None):
    from .models import DeviceToken
    
    tokens = list(DeviceToken.objects.filter(
        user=user, 
        is_active=True
    ).values_list('token', flat=True))
    
    if not tokens:
        return {"error": "No active device tokens found."}

    # Prepare individual messages for each token
    messages = [
        messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=token,
            data=data or {}
        ) for token in tokens
    ]

    try:
        # send_each replaces the old send_multicast in newer SDKs
        response = messaging.send_each(messages)
        return {
            "success": response.success_count,
            "failure": response.failure_count
        }
    except Exception as e:
        return {"error": str(e)}