import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings
import os

# Initialize once
if not firebase_admin._apps:
    if os.path.exists(settings.FIREBASE_CONFIG_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CONFIG_PATH)
        firebase_admin.initialize_app(cred)

def send_push(token, title, body, data=None):
    """
    Direct wrapper for Firebase Messaging. 
    Returns (success_bool, message_id_or_error)
    """
    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        token=token,
        data=data or {},
    )
    try:
        response = messaging.send(message)
        return True, response
    except Exception as e:
        return False, str(e)