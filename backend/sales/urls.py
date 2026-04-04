from django.urls import path
from .views import *

urlpatterns = [
    # 1. This is the main one. We point 'dispatch-details/' to 'dispatch_list_create' 
    # because that function handles both GET (listing) and POST (saving).
    path('dispatch-details/', dispatch_list_create), 

    # 2. This is for specific invoice updates/deletes
    path('dispatch-details/<int:pk>/', dispatch_detail_update_delete),
    path('quotations/', quotation_list_create),
    path('quotations/<int:pk>/', quotation_detail_update_delete),
    path('quotations/<int:pk>/approval/', quotation_approval_update),
    path('purchase-orders/', purchase_order_list_create),
    path('purchase-orders/<int:pk>/', purchase_order_detail_update_delete),
    path('quotation-terms/', quotation_terms_list),
    path('view_quotation/<int:quotation_id>/', view_quotation, name='view_quotation'),

    # 3. Item-level paths
    path('invoice-items/', invoice_items),
    path('invoice-items/<int:pk>/', invoice_items),
    # The <int:dispatch_id>/ part captures the ID from the URL and sends it to your view
    path('view_invoice/<int:dispatch_id>/', view_invoice, name='view_invoice'), 
    path('items/', create_item, name='create_item'),
    path('items/<int:pk>/', item_detail_update_delete, name='item_detail'),
    path('sales-services/', sales_service_list_create, name='sales_service_list_create'),
    path('sales-services/<int:pk>/', sales_service_detail_update_delete, name='sales_service_detail_update_delete'),
    path('website-company-profile/', website_company_profile, name='website_company_profile'),
    path('cost-estimations/', cost_estimation_list_create, name='cost_estimation_list_create'),
    path('cost-estimations/<int:pk>/', cost_estimation_detail_update_delete, name='cost_estimation_detail_update_delete'),
    path('cost-estimations/<int:pk>/approval/', cost_estimation_approval_update, name='cost_estimation_approval_update'),
    path('cost-estimation-options/', cost_estimation_option_catalog, name='cost_estimation_option_catalog'),
]
