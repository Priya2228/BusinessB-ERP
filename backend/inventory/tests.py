from django.test import TestCase
from rest_framework.test import APIClient

from .models import TaxRule


class TaxRuleApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        TaxRule.objects.create(region='IN', item_category='Bought-out', tax_rate='18.00', is_active=True)
        TaxRule.objects.create(region='GLOBAL', item_category='Manufactures', tax_rate='7.50', is_active=True)

    def test_tax_rule_endpoint_returns_selected_tax_for_country_and_category(self):
        response = self.client.get('/api/tax-rules/', {
            'country': 'India',
            'item_category': 'Bought-out',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['selected_tax']['region'], 'IN')
        self.assertEqual(response.data['selected_tax']['tax_rate'], '18.00')
        self.assertEqual(response.data['selected_tax']['tax_label'], 'GST 18%')

    def test_tax_rule_endpoint_falls_back_to_global(self):
        response = self.client.get('/api/tax-rules/', {
            'country': 'USA',
            'item_category': 'Manufactures',
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['selected_tax']['region'], 'USA')
        self.assertEqual(response.data['selected_tax']['tax_rate'], '7.50')
