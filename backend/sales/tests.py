from django.test import TestCase
from rest_framework.test import APIClient

from inventory.models import TaxRule
from sales.serializers import InvoiceItemSerializer
from sales.models import Item


class InvoiceItemSerializerTests(TestCase):
    def setUp(self):
        Item.objects.create(
            item_code='ITEM-100',
            item_name='Taxed Item',
            item_category='Bought-out',
        )
        TaxRule.objects.create(
            region='IN',
            item_category='Bought-out',
            tax_rate='18.00',
            is_active=True,
        )

    def test_serializer_applies_tax_rule_from_region_and_item_category(self):
        serializer = InvoiceItemSerializer(data={
            'item_code': 'ITEM-100',
            'item_name': 'Taxed Item',
            'item_category': 'Bought-out',
            'region': 'India',
            'unit': 'PCS',
            'quantity': 2,
            'rate': 100,
            'discount_percent': 10,
            'tax_amount': 0,
            'amount': 0,
        })

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['amount'], 180.0)
        self.assertEqual(serializer.validated_data['tax_amount'], 32.4)


class ItemApiTaxTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        TaxRule.objects.create(
            region='IN',
            item_category='Bought-out',
            tax_rate='18.00',
            is_active=True,
        )
        self.item = Item.objects.create(
            item_code='ITEM-200',
            item_name='Country Tax Item',
            item_category='Bought-out',
            tax='GST 5%',
        )

    def test_item_detail_uses_tax_rule_when_country_is_provided(self):
        response = self.client.get(f'/api/items/{self.item.id}/', {'country': 'India'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['tax'], 'GST 18%')
        self.assertEqual(response.data['country'], 'IN')

    def test_create_item_overrides_tax_when_country_is_provided(self):
        response = self.client.post('/api/items/', {
            'item_code': 'ITEM-201',
            'item_name': 'Created Tax Item',
            'unit': 'PCS',
            'item_type': 'Product',
            'item_category': 'Bought-out',
            'item_group': 'Sales',
            'purchase_price': '100.000',
            'sales_price': '120.000',
            'tax': 'GST 5%',
            'country': 'India',
        })

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['tax'], 'GST 18%')
