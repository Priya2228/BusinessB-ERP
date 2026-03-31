from django.contrib import admin
from .models import TaxRule, StockEntry

@admin.register(TaxRule)
class TaxRuleAdmin(admin.ModelAdmin):
    list_display = ('region', 'item_category', 'tax_rate', 'is_active', 'created_at')
    list_filter = ('region', 'is_active')
    search_fields = ('item_category',)

@admin.register(StockEntry)
class StockEntryAdmin(admin.ModelAdmin):
    # Added 'is_active' so you can manually approve stock from Admin if needed
    list_display = ('item', 'quantity', 'stock_date', 'source_type', 'is_active')
    list_filter = ('source_type', 'is_active', 'stock_date')
    search_fields = ('item__item_name', 'item__item_code')
    date_hierarchy = 'stock_date'