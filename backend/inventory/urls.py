from django.urls import path

from .views import tax_rule_list


urlpatterns = [
    path('tax-rules/', tax_rule_list, name='tax_rule_list'),
]
