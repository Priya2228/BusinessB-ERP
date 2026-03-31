from decimal import Decimal
from django.db.models import Sum

from .models import TaxRule, StockEntry


REGION_CODE_MAP = {
    'india': 'IN',
    'in': 'IN',
    'uae': 'UAE',
    'united arab emirates': 'UAE',
    'usa': 'USA',
    'us': 'USA',
    'united states': 'USA',
    'uk': 'UK',
    'gb': 'UK',
    'great britain': 'UK',
    'united kingdom': 'UK',
    'global': 'GLOBAL',
}


def normalize_region(region):
    region_key = str(region or '').strip().lower()
    return REGION_CODE_MAP.get(region_key, str(region or '').strip().upper() or 'GLOBAL')

def get_tax_rate(region, item_category):
    """Rule 14: Tax Lookup"""
    normalized_region = normalize_region(region)

    try:
        rule = TaxRule.objects.get(
            region=normalized_region,
            item_category=item_category,
            is_active=True,
        )
        return rule.tax_rate
    except TaxRule.DoesNotExist:
        if normalized_region != 'GLOBAL':
            try:
                fallback_rule = TaxRule.objects.get(
                    region='GLOBAL',
                    item_category=item_category,
                    is_active=True,
                )
                return fallback_rule.tax_rate
            except TaxRule.DoesNotExist:
                pass

        return Decimal('0.00') # Fallback


def format_tax_label(region, tax_rate):
    normalized_region = normalize_region(region)
    tax_name = 'GST' if normalized_region == 'IN' else 'Tax'
    formatted_rate = Decimal(str(tax_rate or 0)).quantize(Decimal('0.01')).normalize()
    return f"{tax_name} {formatted_rate}%"


def get_tax_details(region, item_category):
    tax_rate = get_tax_rate(region, item_category)
    normalized_region = normalize_region(region)
    return {
        'region': normalized_region,
        'item_category': item_category or '',
        'tax_rate': tax_rate,
        'tax_label': format_tax_label(normalized_region, tax_rate),
    }

def check_stock_alerts(item):
    """Rule 15: Stock Logic"""
    total_stock = StockEntry.objects.filter(item=item).aggregate(Sum('quantity'))['quantity__sum'] or 0
    
    if total_stock <= 0:
        return 'out_of_stock', f"{item.item_name} is completely out of stock!"
    
    if total_stock <= item.min_stock_qty:
        return 'low_stock', f"{item.item_name} is low ({total_stock} remaining)."
    
    return None, None
