from decimal import Decimal, ROUND_HALF_UP
import json
import os
import re
import secrets
from datetime import datetime
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers
from inventory.services import get_tax_details, get_tax_rate, normalize_region
User = get_user_model()

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
    JobCard,
    OperationHeadRegistration,
    ShopfloorExecution,
    ShopfloorActivityRequest,
)
from .completion_utils import ensure_completion_cost_estimation


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


def generate_unique_jobcard_no():
    existing_codes = JobCard.objects.values_list("jobcard_no", flat=True)
    highest_number = 0

    for code in existing_codes:
        if not code:
            continue
        digits = re.findall(r"\d+", code)
        if digits:
            highest_number = max(highest_number, int(digits[-1]))

    return f"JC-{highest_number + 1:04d}"


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


class FlexibleDateField(serializers.DateField):
    def to_internal_value(self, value):
        normalized = self._normalize_value(value)
        if normalized is None:
            if self.allow_null:
                return None
            self.fail("null")
        return super().to_internal_value(normalized)

    def _normalize_value(self, value):
        if isinstance(value, datetime):
            return value.date()

        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return None
            if "T" in stripped:
                return stripped.split("T", 1)[0]
            if " " in stripped:
                return stripped.split(" ", 1)[0]
            return stripped

        return value

class UserReferenceField(serializers.PrimaryKeyRelatedField):
    default_error_messages = {
        "user_not_found": "Unable to find a user matching '{value}'."
    }

    def to_internal_value(self, data):
        if data in (None, ""):
            return None
        if isinstance(data, str):
            stripped = data.strip()
            if not stripped:
                return None
            if stripped.isdigit():
                data = int(stripped)
            else:
                user = self._lookup_user(stripped)
                if user:
                    return user
                self.fail("user_not_found", value=data)
        return super().to_internal_value(data)

    def _lookup_user(self, value):
        name_parts = value.split()
        filters = (
            Q(username__iexact=value)
            | Q(email__iexact=value)
            | Q(first_name__iexact=value)
            | Q(last_name__iexact=value)
        )
        if len(name_parts) >= 2:
            filters |= Q(first_name__iexact=name_parts[0], last_name__iexact=name_parts[-1])
        return User.objects.filter(filters).first()

class DisplayChoiceField(serializers.ChoiceField):
    def __init__(self, choices, **kwargs):
        super().__init__(choices=choices, **kwargs)
        self._display_to_value = {}
        for key, label in self.choices.items():
            if isinstance(label, (list, tuple)):
                for sub_key, sub_label in label:
                    self._display_to_value[sub_label] = sub_key
                    if isinstance(sub_label, str):
                        self._display_to_value[sub_label.lower()] = sub_key
            else:
                self._display_to_value[label] = key
                if isinstance(label, str):
                    self._display_to_value[label.lower()] = key

    def to_internal_value(self, data):
        if isinstance(data, str):
            normalized = data.strip()
            mapped = self._display_to_value.get(normalized)
            if mapped is None:
                mapped = self._display_to_value.get(normalized.lower())
            if mapped is not None:
                data = mapped
        return super().to_internal_value(data)

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
    assigned_to_username = serializers.SerializerMethodField(read_only=True)
    assigned_to_designation = serializers.SerializerMethodField(read_only=True)

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

    def get_assigned_to_username(self, instance):
        return instance.assigned_to.username if instance.assigned_to else ""

    def get_assigned_to_designation(self, instance):
        return instance.assigned_to.profile.designation if instance.assigned_to and hasattr(instance.assigned_to, "profile") else ""

    def _apply_category_logic(self, validated_data):
        category = validated_data.get(
            "rfq_category", SalesServiceRequest.RFQ_CATEGORY_STANDARD
        )
        provided_status = validated_data.get("approval_status")

        if category == SalesServiceRequest.RFQ_CATEGORY_ASSESSMENT:
            validated_data["skip_sales_flow"] = True
            if not provided_status:
                validated_data["approval_status"] = SalesServiceRequest.APPROVAL_STATUS_PENDING_HEAD
        elif category == SalesServiceRequest.RFQ_CATEGORY_COMPLETION:
            validated_data["skip_sales_flow"] = True
            validated_data["approval_status"] = SalesServiceRequest.APPROVAL_STATUS_NOT_REQUIRED
        else:
            validated_data["skip_sales_flow"] = False
            if not provided_status:
                validated_data["approval_status"] = SalesServiceRequest.APPROVAL_STATUS_NOT_REQUIRED

        return validated_data

    def _ensure_completion_cost_estimation(self, service_request):
        ensure_completion_cost_estimation(service_request)

    def create(self, validated_data):
        validated_data = self._apply_category_logic(validated_data)
        instance = super().create(validated_data)
        if instance.rfq_category == SalesServiceRequest.RFQ_CATEGORY_COMPLETION:
            self._ensure_completion_cost_estimation(instance)
        return instance

    def update(self, instance, validated_data):
        prev_category = instance.rfq_category
        validated_data = self._apply_category_logic(validated_data)
        instance = super().update(instance, validated_data)
        if instance.rfq_category == SalesServiceRequest.RFQ_CATEGORY_COMPLETION:
            self._ensure_completion_cost_estimation(instance)
        elif prev_category == SalesServiceRequest.RFQ_CATEGORY_COMPLETION and instance.rfq_category != SalesServiceRequest.RFQ_CATEGORY_COMPLETION:
            # No extra cleanup for now
            pass
        return instance


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


class JobCardSerializer(serializers.ModelSerializer):
    purchase_order_id = serializers.PrimaryKeyRelatedField(
        queryset=PurchaseOrder.objects.all(),
        source="purchase_order",
        allow_null=True,
        required=False,
        write_only=True,
    )
    purchase_order_info = serializers.SerializerMethodField()
    supervisor_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="supervisor",
        allow_null=True,
        required=False,
        write_only=True,
    )
    supervisor_info = serializers.SerializerMethodField()

    class Meta:
        model = JobCard
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "purchase_order_info"]

    def create(self, validated_data):
        if not validated_data.get("jobcard_no"):
            validated_data["jobcard_no"] = generate_unique_jobcard_no()
        if not validated_data.get("jobcard_date"):
            validated_data["jobcard_date"] = timezone.now().date()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if not validated_data.get("jobcard_no"):
            validated_data["jobcard_no"] = instance.jobcard_no
        return super().update(instance, validated_data)

    def get_purchase_order_info(self, obj):
        po = obj.purchase_order
        if not po:
            return None
        request = self.context.get("request")
        attachment_url = None
        if po.file_attachment:
            attachment_url = (
                request.build_absolute_uri(po.file_attachment.url) if request else po.file_attachment.url
            )
        return {
            "id": po.id,
            "po_no": po.po_no,
            "po_date": po.po_date,
            "po_received_date": po.po_received_date,
            "expected_delivery_date": po.expected_delivery_date,
            "rfq_no": po.rfq_no,
            "quotation_no": po.quotation_no,
            "attention": po.attention,
            "cost_estimation_no": po.cost_estimation_no,
            "file_name": os.path.basename(po.file_attachment.name) if po.file_attachment else None,
            "file_attachment": attachment_url,
        }

    def get_supervisor_info(self, obj):
        supervisor = obj.supervisor
        if not supervisor:
            return None
        profile = getattr(supervisor, "profile", None)
        return {
            "id": supervisor.id,
            "username": supervisor.username,
            "full_name": supervisor.get_full_name(),
            "designation": profile.designation if profile else "",
        }


class OperationHeadRegistrationSerializer(serializers.ModelSerializer):
    operation_no = serializers.CharField(required=False, allow_blank=True)
    jobcard_id = serializers.PrimaryKeyRelatedField(
        queryset=JobCard.objects.all(),
        source="jobcard",
        allow_null=True,
        required=False,
    )
    jobcard_info = serializers.SerializerMethodField()
    purchase_order_info = serializers.SerializerMethodField()
    shopfloor_incharge_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="shopfloor_incharge",
        allow_null=True,
        required=False,
        write_only=True,
    )
    shopfloor_incharge_info = serializers.SerializerMethodField(method_name="resolve_shopfloor_incharge_info")
    operation_date = FlexibleDateField(required=False, allow_null=True)
    rfq_date = FlexibleDateField(required=False, allow_null=True)
    cost_estimation_date = FlexibleDateField(required=False, allow_null=True)
    po_date = FlexibleDateField(required=False, allow_null=True)
    jobcard_date = FlexibleDateField(required=False, allow_null=True)
    plan_start_date = FlexibleDateField(required=False, allow_null=True)
    target_completion_date = FlexibleDateField(required=False, allow_null=True)
    po_delivery_date = FlexibleDateField(required=False, allow_null=True)
    expected_delivery_date = FlexibleDateField(required=False, allow_null=True)

    class Meta:
        model = OperationHeadRegistration
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        if not validated_data.get("operation_no"):
            validated_data["operation_no"] = self._generate_operation_no()
        if not validated_data.get("operation_date"):
            validated_data["operation_date"] = timezone.now().date()
        return super().create(validated_data)

    def _generate_operation_no(self):
        base = timezone.now().strftime("OP-%y%m%d%H%M%S")
        for _ in range(5):
            candidate = f"{base}-{secrets.token_hex(2).upper()}"
            if not OperationHeadRegistration.objects.filter(operation_no=candidate).exists():
                return candidate
        raise serializers.ValidationError(
            {"operation_no": ["Unable to generate a unique operation number. Please try again."]}
        )

    def validate(self, attrs):
        if self.instance:
            if "operation_no" in attrs and not attrs["operation_no"]:
                attrs.pop("operation_no")
            if "operation_date" in attrs and attrs["operation_date"] is None:
                attrs.pop("operation_date")
        return super().validate(attrs)

    def get_jobcard_info(self, obj):
        jobcard = obj.jobcard
        if not jobcard:
            return None
        return {
            "id": jobcard.id,
            "jobcard_no": jobcard.jobcard_no,
            "rfq_no": jobcard.rfq_no,
        }

    def resolve_shopfloor_incharge_info(self, obj):
        staff = obj.shopfloor_incharge
        if not staff:
            return None
        profile = getattr(staff, "profile", None)
        return {
            "id": staff.id,
            "username": staff.username,
            "full_name": staff.get_full_name(),
            "designation": profile.designation if profile else "",
        }

    def get_purchase_order_info(self, obj):
        jobcard = obj.jobcard
        po = jobcard.purchase_order if jobcard else None
        if not po:
            return None
        return {
            "id": po.id,
            "po_no": po.po_no,
            "po_date": po.po_date,
            "rfq_no": po.rfq_no,
            "quotation_no": po.quotation_no,
        }


class ShopfloorActivityRequestSerializer(serializers.ModelSerializer):
    created_by_info = serializers.SerializerMethodField()
    shopfloor_execution_id = serializers.PrimaryKeyRelatedField(
        queryset=ShopfloorExecution.objects.all(),
        source="shopfloor_execution",
        write_only=True,
    )

    class Meta:
        model = ShopfloorActivityRequest
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "created_by_info"]

    def get_created_by_info(self, obj):
        user = obj.created_by
        if not user:
            return None
        return {"id": user.id, "username": user.username, "full_name": user.get_full_name()}


class ShopfloorExecutionSerializer(serializers.ModelSerializer):
    jobcard_id = serializers.PrimaryKeyRelatedField(
        queryset=JobCard.objects.all(),
        source="jobcard",
        required=False,
        allow_null=True,
    )
    jobcard_info = serializers.SerializerMethodField()
    activity_requests = ShopfloorActivityRequestSerializer(many=True, read_only=True)
    inspection_done_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    inspection_validated_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    disassembly_done_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    disassembly_validated_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assessment_done_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assessment_validated_by_qc = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assessment_validated_by_hod = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assessment_approved_by_hod = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    spare_repair_done_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    spare_repair_validated_by_qc = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assembly_done_by = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assembly_validated_by_qc = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assembly_validated_by_hod = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    assembly_approved_by_hod = UserReferenceField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )
    inspection_start_date = FlexibleDateField(required=False, allow_null=True)
    inspection_end_date = FlexibleDateField(required=False, allow_null=True)
    disassembly_start_date = FlexibleDateField(required=False, allow_null=True)
    disassembly_end_date = FlexibleDateField(required=False, allow_null=True)
    assessment_start_date = FlexibleDateField(required=False, allow_null=True)
    assessment_end_date = FlexibleDateField(required=False, allow_null=True)
    spare_repair_start_date = FlexibleDateField(required=False, allow_null=True)
    spare_repair_end_date = FlexibleDateField(required=False, allow_null=True)
    assembly_start_date = FlexibleDateField(required=False, allow_null=True)
    assembly_end_date = FlexibleDateField(required=False, allow_null=True)
    status = DisplayChoiceField(
        choices=ShopfloorExecution.STATUS_CHOICES,
        required=False,
    )

    class Meta:
        model = ShopfloorExecution
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at", "jobcard_info", "activity_requests"]

    def get_jobcard_info(self, obj):
        jobcard = obj.jobcard
        if not jobcard:
            return None
        sales_request = (
            SalesServiceRequest.objects.filter(rfq_no=jobcard.rfq_no).first()
            if jobcard.rfq_no
            else None
        )
        po = jobcard.purchase_order
        po_info = None
        if po:
            po_info = {
                "id": po.id,
                "po_no": po.po_no,
                "po_date": po.po_date,
                "rfq_no": po.rfq_no,
                "quotation_no": po.quotation_no,
            }
        return {
            "jobcard_no": jobcard.jobcard_no,
            "jobcard_date": jobcard.jobcard_date,
            "jobcard_status": jobcard.jobcard_status,
            "rfq_no": jobcard.rfq_no,
            "rfq_type": jobcard.rfq_type,
            "rfq_category": jobcard.rfq_category,
            "client_name": jobcard.client_name or (sales_request.client_name if sales_request else None),
            "company_name": jobcard.company_name or (sales_request.company_name if sales_request else None),
            "attention": jobcard.attention or (sales_request.attention if sales_request else None),
            "purchase_order": po_info,
            "rfq_date": sales_request.registered_date if sales_request else None,
            "scope_type": jobcard.scope_type,
            "scope_description": jobcard.scope_description,
            "scope_remarks": jobcard.scope_remarks,
        }
