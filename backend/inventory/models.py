from django.db import models
from django.core.validators import MinValueValidator

class TaxRule(models.Model):
    REGION_CHOICES = [
        ('IN', 'India'),
        ('UAE', 'United Arab Emirates'),
        ('USA', 'United States'),
        ('UK', 'United Kingdom'),
        ('GLOBAL', 'Other Regions'),
    ]

    region = models.CharField(
        max_length=10, 
        choices=REGION_CHOICES, 
        default='IN',
        help_text="The geographical area where this tax rate applies."
    )
    
    item_category = models.CharField(
        max_length=100,
        help_text="E.g., Electronics, Essentials, Services, or Luxury Goods."
    )
    
    tax_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="Percentage rate (e.g., 18.00 for 18%)."
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Disable this instead of deleting it to keep historical records safe."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('region', 'item_category')
        verbose_name = "Tax Rule"
        verbose_name_plural = "Tax Rules"
    @property
    def tax_label(self):
        """
        Returns a human-readable tax name based on the region.
        Example: 'GST 18.00%' for India, 'VAT 5.00%' for UAE.
        """
        prefix = "GST" if self.region == 'IN' else "VAT" if self.region in ['UAE', 'UK'] else "Sales Tax"
        return f"{prefix} {self.tax_rate}%"

    def __str__(self):
        return f"{self.region} | {self.item_category} : {self.tax_rate}%"


class StockEntry(models.Model):
    SOURCE_CHOICES = [
        ('OPENING', 'Opening Stock'),
        ('PURCHASE', 'Purchase Invoice'),
        ('SALE_RETURN', 'Sales Return'),
        ('ADJUSTMENT', 'Manual Adjustment'),
    ]

    # FIXED: Pointing to 'sales.Item' to resolve Migration Error
    item = models.ForeignKey(
        'sales.Item', 
        on_delete=models.CASCADE, 
        related_name='stock_entries'
    )
    
    quantity = models.DecimalField(
        max_digits=12, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="The quantity of items being entered."
    )
    
    # UPDATED: Added default date from >90 days ago (Oct 1, 2025)
    stock_date = models.DateField(
        default='2025-10-01',
        help_text="The effective date for this stock entry (used for aging)."
    )
    
    source_type = models.CharField(
        max_length=20, 
        choices=SOURCE_CHOICES, 
        default='OPENING'
    )
    
    is_active = models.BooleanField(
        default=False, 
        help_text="Must be False by default if Admin Approval is required."
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock Entry"
        verbose_name_plural = "Stock Entries"
        ordering = ['-stock_date', '-created_at']

    def __str__(self):
        return f"{self.item.item_name} - {self.quantity} ({self.source_type})"