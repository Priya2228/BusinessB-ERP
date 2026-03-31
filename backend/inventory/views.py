from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import TaxRule
from .services import get_tax_details, normalize_region


@api_view(['GET'])
def tax_rule_list(request):
    country = request.query_params.get('country') or request.query_params.get('region') or 'GLOBAL'
    item_category = request.query_params.get('item_category', '')
    normalized_region = normalize_region(country)

    queryset = TaxRule.objects.filter(is_active=True, region__in=[normalized_region, 'GLOBAL'])
    if item_category:
        queryset = queryset.filter(item_category=item_category)

    rules = []
    seen = set()
    for rule in queryset.order_by('-region', 'item_category', 'tax_rate'):
        key = (rule.region, rule.item_category)
        if key in seen:
            continue
        seen.add(key)
        details = get_tax_details(rule.region, rule.item_category)
        rules.append({
            'region': details['region'],
            'item_category': details['item_category'],
            'tax_rate': str(details['tax_rate']),
            'tax_label': details['tax_label'],
        })

    selected_tax = None
    if item_category:
        details = get_tax_details(normalized_region, item_category)
        selected_tax = {
            'region': details['region'],
            'item_category': details['item_category'],
            'tax_rate': str(details['tax_rate']),
            'tax_label': details['tax_label'],
        }

    return Response({
        'country': normalized_region,
        'item_category': item_category,
        'selected_tax': selected_tax,
        'tax_rules': rules,
    })
