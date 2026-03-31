from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from sales.models import Item
from notifications.models import InventoryAlert


class InventoryAlertSyncTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='secret', is_superuser=True)
        self.token = Token.objects.create(user=self.user)
        self.item = Item.objects.create(
            item_code='ITEM-001',
            item_name='Widget',
            item_category='Bought-out',
            min_stock_qty=5,
        )

    def test_inventory_alert_sync_requires_token_auth(self):
        response = self.client.post(
            '/api/notifications/inventory-alerts/sync/',
            {'alerts': []},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_inventory_alert_sync_creates_single_alert_for_duplicate_payload(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        payload = {
            'alerts': [
                {
                    'type': 'out_of_stock',
                    'item_code': self.item.item_code,
                    'item_name': self.item.item_name,
                    'severity': 'critical',
                    'quantity': '0.00',
                }
            ]
        }

        first = self.client.post('/api/notifications/inventory-alerts/sync/', payload, format='json')
        second = self.client.post('/api/notifications/inventory-alerts/sync/', payload, format='json')

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(InventoryAlert.objects.count(), 1)
