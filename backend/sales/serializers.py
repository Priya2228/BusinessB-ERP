from decimal import Decimal, ROUND_HALF_UP
import json
from rest_framework import serializers
from inventory.services import get_tax_details, get_tax_rate, normalize_region
from .models import (
    InvoiceItem,
    Dispatchdetails,
    Quotation,
    QuotationItem,
    PurchaseOrder,
    Item,
    SalesServiceRequest,
    CostEstimation,
    CostEstimationApproval,
    QuotationApproval,
    RawMaterialOption,
    ProductionCostOption,
    AddonCostOption,
    SewingCostOption,
    ThreadworkFinishingOption,
    PackagingLogisticsOption,
    MiscellaneousOption,
)


def generate_unique_quotation_code():
    existing_codes = Quotation.objects.values_list("quotation_code", flat=True)
    highest_number = 0

    for code in existing_codes:
        if not code:
            continue
        normalized_code = str(code).strip().upper()
        if not normalized_code.startswith("QU"):
            continue
        suffix = normalized_code[2:]
        if suffix.isdigit():
            highest_number = max(highest_number, int(suffix))

    return f"QU{highest_number + 1:03d}"


def generate_unique_purchase_order_no():
    existing_codes = PurchaseOrder.objects.values_list("po_no", flat=True)
    highest_number = 0

    for code in existing_codes:
        if not code:
            continue
        normalized_code = str(code).strip().upper()
        digits = "".join(character for character in normalized_code if character.isdigit())
        if digits.isdigit():
            highest_number = max(highest_number, int(digits))

    return f"PO{highest_number + 1:03d}"


def resolve_item_category(validated_data):
    item_category = validated_data.pop('item_category', None)
    if item_category:
        return item_category

    item_code = validated_data.get('item_code')
    item_name = validated_data.get('item_name')
    item = Item.objects.filter(item_code=item_code).first()
    if item is None and item_name:
        item = Item.objects.filter(item_name=item_name).first()
    return getattr(item, 'item_category', '') or ''


def apply_tax_rule(validated_data):
    region = normalize_region(validated_data.pop('region', None))
    item_category = resolve_item_category(validated_data)

    quantity = Decimal(str(validated_data.get('quantity', 0) or 0))
    rate = Decimal(str(validated_data.get('rate', 0) or 0))
    discount_percent = Decimal(str(validated_data.get('discount_percent', 0) or 0))

    amount = quantity * rate
    discount_amount = amount * (discount_percent / Decimal('100'))
    net_amount = amount - discount_amount

    tax_rate = get_tax_rate(region, item_category) if item_category else Decimal('0.00')
    if tax_rate and tax_rate > 0:
        tax_amount = net_amount * (Decimal(str(tax_rate)) / Decimal('100'))
        validated_data['tax_amount'] = float(tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
        validated_data['amount'] = float(net_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    return validated_data

class InvoiceItemSerializer(serializers.ModelSerializer):
    region = serializers.CharField(write_only=True, required=False, allow_blank=True)
    item_category = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = InvoiceItem
        fields = '__all__'

    def validate(self, attrs):
        return apply_tax_rule(attrs)

class DispatchdetailsSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True) 
    region = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Dispatchdetails
        fields = '__all__'

    def create(self, validated_data):
        # 1. Extract items list safely
        items_data = validated_data.pop('items', [])
        region = validated_data.pop('region', '')
        
        # 2. Create the Header
        dispatch = Dispatchdetails.objects.create(**validated_data)
        
        # 3. Create linked items
        for item_data in items_data:
            # Remove dispatch key if it exists in item_data to avoid the Multiple Values error
            item_data.pop('dispatch', None) 
            if region and not item_data.get('region'):
                item_data['region'] = region
            item_data = apply_tax_rule(item_data)
            InvoiceItem.objects.create(dispatch=dispatch, **item_data)
            
        return dispatch


class QuotationItemSerializer(serializers.ModelSerializer):
    region = serializers.CharField(write_only=True, required=False, allow_blank=True)
    item_category = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = QuotationItem
        fields = "__all__"

    def validate(self, attrs):
        return apply_tax_rule(attrs)


class QuotationSerializer(serializers.ModelSerializer):
    items = QuotationItemSerializer(many=True, required=False)
    region = serializers.CharField(write_only=True, required=False, allow_blank=True)
    approval_workflow = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = "__all__"

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        region = validated_data.pop("region", "")
        customer_name = validated_data.get("customer_name")
        quotation_code = (validated_data.get("quotation_code") or "").strip()

        if not quotation_code or Quotation.objects.filter(quotation_code=quotation_code).exists():
            validated_data["quotation_code"] = generate_unique_quotation_code()

        if customer_name:
            last_revision = (
                Quotation.objects.filter(customer_name=customer_name)
                .order_by("-revise_count", "-id")
                .values_list("revise_count", flat=True)
                .first()
            )
            validated_data["revise_count"] = int(last_revision or 0) + 1

        quotation = Quotation.objects.create(**validated_data)
        QuotationApproval.objects.get_or_create(quotation=quotation)

        for item_data in items_data:
            item_data.pop("quotation", None)
            if region and not item_data.get("region"):
                item_data["region"] = region
            item_data = apply_tax_rule(item_data)
            QuotationItem.objects.create(quotation=quotation, **item_data)

        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        region = validated_data.pop("region", "")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if items_data is not None:
            instance.save()
            instance.items.all().delete()

            for item_data in items_data:
                item_data.pop("quotation", None)
                if region and not item_data.get("region"):
                    item_data["region"] = region
                item_data = apply_tax_rule(item_data)
                QuotationItem.objects.create(quotation=instance, **item_data)
        else:
            instance.save()

        return instance

    def get_approval_workflow(self, obj):
        approval, _ = QuotationApproval.objects.get_or_create(quotation=obj)
        return CostEstimationApprovalSerializer(approval).data


class PurchaseOrderSerializer(serializers.ModelSerializer):
    file_attachment = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"

    def create(self, validated_data):
        po_no = (validated_data.get("po_no") or "").strip()
        if not po_no or PurchaseOrder.objects.filter(po_no=po_no).exists():
            validated_data["po_no"] = generate_unique_purchase_order_no()
        return super().create(validated_data)

    def validate_scope_rows(self, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except (TypeError, ValueError, json.JSONDecodeError):
                raise serializers.ValidationError("Scope rows must be valid JSON.")
            if not isinstance(parsed, list):
                raise serializers.ValidationError("Scope rows must be a list.")
            return parsed
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.file_attachment:
            request = self.context.get("request")
            attachment_url = instance.file_attachment.url
            data["file_attachment"] = (
                request.build_absolute_uri(attachment_url) if request is not None else attachment_url
            )
        return data

class ItemSerializer(serializers.ModelSerializer):
    item_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Item
        fields = '__all__'

    def _get_country_from_request(self):
        request = self.context.get('request')
        if request is None:
            return ''

        return (
            request.query_params.get('country')
            or request.query_params.get('region')
            or request.headers.get('X-Country')
            or ''
        )

    def _resolve_tax_label(self, item_category, explicit_country=''):
        country = explicit_country or self._get_country_from_request()
        if not item_category or not country:
            return None

        details = get_tax_details(country, item_category)
        tax_rate = Decimal(str(details['tax_rate']))
        if tax_rate <= 0:
            return None
        return details['tax_label']

    def validate(self, attrs):
        attrs = super().validate(attrs)
        item_category = attrs.get('item_category')
        country = attrs.pop('country', None) or self.initial_data.get('country') or self.initial_data.get('region')
        resolved_tax = self._resolve_tax_label(item_category, explicit_country=country or '')
        if resolved_tax:
            attrs['tax'] = resolved_tax
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.item_image:
            request = self.context.get('request')
            image_url = instance.item_image.url
            data['item_image'] = request.build_absolute_uri(image_url) if request is not None else image_url

        resolved_tax = self._resolve_tax_label(instance.item_category)
        if resolved_tax:
            data['tax'] = resolved_tax
            data['country'] = normalize_region(self._get_country_from_request())
        return data


class SalesServiceRequestSerializer(serializers.ModelSerializer):
    email_attachment = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = SalesServiceRequest
        fields = "__all__"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.email_attachment:
            request = self.context.get("request")
            attachment_url = instance.email_attachment.url
            data["email_attachment"] = (
                request.build_absolute_uri(attachment_url) if request is not None else attachment_url
            )
        return data


class CostEstimationApprovalSerializer(serializers.ModelSerializer):
    head_reviewed_by_username = serializers.SerializerMethodField()
    md_reviewed_by_username = serializers.SerializerMethodField()

    class Meta:
        model = CostEstimationApproval
        fields = [
            "sent_to_head",
            "sent_to_head_at",
            "head_status",
            "head_comment",
            "head_reviewed_at",
            "head_reviewed_by",
            "head_reviewed_by_username",
            "md_status",
            "md_comment",
            "md_reviewed_at",
            "md_reviewed_by",
            "md_reviewed_by_username",
        ]
        read_only_fields = [
            "sent_to_head_at",
            "head_reviewed_at",
            "head_reviewed_by",
            "head_reviewed_by_username",
            "md_reviewed_at",
            "md_reviewed_by",
            "md_reviewed_by_username",
        ]

    def get_head_reviewed_by_username(self, obj):
        return obj.head_reviewed_by.username if obj.head_reviewed_by else ""

    def get_md_reviewed_by_username(self, obj):
        return obj.md_reviewed_by.username if obj.md_reviewed_by else ""


class CostEstimationSerializer(serializers.ModelSerializer):
    approval_workflow = CostEstimationApprovalSerializer(read_only=True)

    class Meta:
        model = CostEstimation
        fields = "__all__"


class CostEstimationOptionSerializer(serializers.ModelSerializer):
    class Meta:
        fields = "__all__"


class RawMaterialOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = RawMaterialOption


class ProductionCostOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = ProductionCostOption


class AddonCostOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = AddonCostOption


class SewingCostOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = SewingCostOption


class ThreadworkFinishingOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = ThreadworkFinishingOption


class PackagingLogisticsOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = PackagingLogisticsOption


class MiscellaneousOptionSerializer(CostEstimationOptionSerializer):
    class Meta(CostEstimationOptionSerializer.Meta):
        model = MiscellaneousOption
