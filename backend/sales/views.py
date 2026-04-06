from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .models import (
    Dispatchdetails,
    InvoiceItem,
    Quotation,
    PurchaseOrder,
    QuotationApproval,
    Item,
    SalesServiceRequest,
    CostEstimation,
    CostEstimationApproval,
    RawMaterialOption,
    ProductionCostOption,
    AddonCostOption,
    SewingCostOption,
    ThreadworkFinishingOption,
    PackagingLogisticsOption,
    MiscellaneousOption,
)
from .serializers import (
    DispatchdetailsSerializer,
    InvoiceItemSerializer,
    QuotationSerializer,
    PurchaseOrderSerializer,
    ItemSerializer,
    SalesServiceRequestSerializer,
    CostEstimationSerializer,
    CostEstimationApprovalSerializer,
    RawMaterialOptionSerializer,
    ProductionCostOptionSerializer,
    AddonCostOptionSerializer,
    SewingCostOptionSerializer,
    ThreadworkFinishingOptionSerializer,
    PackagingLogisticsOptionSerializer,
    MiscellaneousOptionSerializer,
)
import json
import re
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
# Remove SalesInvoice and use Dispatchdetails
from .models import Dispatchdetails, InvoiceItem
from django.shortcuts import render
# CORRECT IMPORT
from rest_framework.authtoken.models import Token
from .website_profile import get_website_profile
from authentication.models import UserProfile
from authentication.rbac import has_any_role, has_role

ITEM_BOOLEAN_FIELDS = [
    'is_stock',
    'is_active',
    'need_qc',
    'need_service',
    'need_warranty',
    'need_serial_no',
]

QUOTATION_TERMS_OPTIONS = [
    {
        "termsCategory": "payment",
        "termsName": "Advance Payment",
        "termsContent": (
            "Advance payment shall be released as per the approved quotation and commercial discussion.\n"
            "The initial advance is required to confirm the order and block production capacity.\n"
            "No material procurement or job planning will begin until the agreed advance is received.\n"
            "Balance payment must be settled before final dispatch unless otherwise approved in writing.\n"
            "Any statutory taxes, duties, levies, or cess will be charged extra wherever applicable.\n"
            "Bank charges, remittance charges, and third-party transaction costs shall be borne by the buyer.\n"
            "Delayed payment may affect committed delivery schedules and release timelines.\n"
            "Part payments, if any, must strictly follow the mutually accepted milestone schedule.\n"
            "No deduction, set-off, or retention is permitted without prior written consent.\n"
            "Any variation in quantity, specification, or approved scope may require commercial revision.\n"
            "Credit, if specially approved, will be valid only for the period mentioned in the quotation.\n"
            "All overdue amounts may attract applicable interest as per company policy.\n"
            "Goods remain the property of the supplier until full payment is received.\n"
            "Final invoice values shall be considered conclusive unless disputed within the agreed time.\n"
            "Payment confirmation should be shared along with reference details for accounting reconciliation."
        ),
    },
    {
        "termsCategory": "payment",
        "termsName": "Milestone Payment",
        "termsContent": (
            "Payment shall be released stage by stage as agreed during the commercial finalization.\n"
            "Each milestone becomes payable immediately upon completion of the corresponding work stage.\n"
            "Delay in milestone approval from the customer side may impact production continuity.\n"
            "Delay in milestone payment may automatically extend the committed delivery timeline.\n"
            "Raw material booking and process execution will proceed only against timely payment clearance.\n"
            "All taxes, freight, insurance, and statutory liabilities are payable extra where applicable.\n"
            "No dispatch or handover will be made unless the due milestone amount is cleared.\n"
            "Partial acceptance of work shall not delay the payment due for completed milestones.\n"
            "Customer-requested hold, deferment, or scope change may trigger milestone re-alignment.\n"
            "Any rework outside approved specifications may involve additional charges and revised billing.\n"
            "Amounts once billed under an approved milestone shall be payable without unauthorized deduction.\n"
            "Any dispute must be communicated formally within the agreed review period.\n"
            "Final settlement of invoice is mandatory before dispatch of balance goods.\n"
            "Credit support, if offered, remains subject to management approval and payment track record.\n"
            "All remittance references must be shared for smooth ledger confirmation and release."
        ),
    },
    {
        "termsCategory": "delivery",
        "termsName": "Standard Delivery",
        "termsContent": (
            "Delivery schedule will commence only after final approval and receipt of confirmed advance.\n"
            "Committed timelines are based on uninterrupted workflow and timely customer approvals.\n"
            "Any delay in artwork approval, measurement confirmation, or technical sign-off may affect delivery.\n"
            "Changes in quantity, specification, branding, or packing requirements may revise the lead time.\n"
            "Freight, loading, unloading, and insurance will be handled as per mutually agreed terms.\n"
            "Transit time is indicative and subject to transporter route conditions and external factors.\n"
            "Readiness date shall be treated as dispatch commitment from our end unless otherwise specified.\n"
            "Unforeseen issues such as material shortages, strikes, or force majeure may extend schedules.\n"
            "Customer-requested hold after readiness may attract storage or handling charges where applicable.\n"
            "Part delivery may be made when commercially or operationally required.\n"
            "Delivery location must be accessible and suitable for unloading during business hours.\n"
            "Any local entry tax, unloading charge, or destination-specific expense shall be borne by the buyer.\n"
            "Delivery completion shall be deemed effective upon handover to transporter or customer representative.\n"
            "Claims relating to visible transit shortage or damage must be raised immediately upon receipt.\n"
            "Verbal commitments shall not override the written delivery terms mentioned in the quotation."
        ),
    },
    {
        "termsCategory": "delivery",
        "termsName": "Dispatch Conditions",
        "termsContent": (
            "Dispatch will be arranged only after production clearance, packing readiness, and payment compliance.\n"
            "Finished goods will be released based on transporter availability and operational feasibility.\n"
            "Urgent dispatch, split shipment, or partial lot movement will be subject to logistics coordination.\n"
            "Packing type and dispatch mode shall be as agreed in the confirmed order terms.\n"
            "Special packing, barcoding, labeling, or palletization requirements may attract extra charges.\n"
            "Once goods are handed over to the carrier, transit responsibility shall apply as per agreed terms.\n"
            "Transit delays caused by weather, strike, route restriction, or third-party issues are beyond our control.\n"
            "Any change in destination after dispatch planning may alter freight and delivery timelines.\n"
            "The customer must ensure prompt unloading and acknowledgement at destination.\n"
            "Detention, demurrage, or re-delivery charges due to customer-side delay shall be recoverable.\n"
            "Dispatch documents will be issued as per agreed billing and statutory requirements.\n"
            "Any shortage or damage claim should be supported with documentary proof and transporter remarks.\n"
            "Non-acceptance at destination without valid cause will not cancel the supply obligation.\n"
            "Reshipment or return movement, if required, will be arranged at the buyer's cost unless mutually agreed.\n"
            "All dispatch commitments remain subject to final stock, packing, and compliance verification."
        ),
    },
    {
        "termsCategory": "general",
        "termsName": "Commercial General",
        "termsContent": (
            "This quotation is subject to final technical review and internal commercial approval.\n"
            "Prices are based on the current scope, quantity, specification, and agreed commercial assumptions.\n"
            "Any change in quantity, design, specification, or approved scope may require price revision.\n"
            "Lead time mentioned in the quotation is subject to approval flow and payment compliance.\n"
            "Quoted rates are valid only for the period specified under quote validity.\n"
            "Taxes, duties, statutory charges, and government-imposed levies are extra wherever applicable.\n"
            "The quotation shall be treated as confidential and intended only for the addressed customer.\n"
            "No commitment shall arise unless the quotation is formally approved by the customer.\n"
            "Customer approval by mail, PO, or written confirmation will be treated as acceptance of terms.\n"
            "Cancellation after approval may attract charges for materials procured and work already executed.\n"
            "All intellectual property, samples, drawings, and process methods remain proprietary where applicable.\n"
            "Minor process deviations consistent with industry standards shall not be treated as breach.\n"
            "Disputes, if any, should be discussed in good faith before escalation.\n"
            "Any special condition not mentioned here must be recorded separately in writing.\n"
            "Only written commitments from authorized representatives shall be considered binding."
        ),
    },
    {
        "termsCategory": "general",
        "termsName": "Technical General",
        "termsContent": (
            "Final execution shall be carried out strictly based on approved sample and technical confirmation.\n"
            "Artwork, branding details, color references, and measurement charts must be approved before production.\n"
            "Any variation in fabric, trim, accessory, or workmanship expectation may affect price and lead time.\n"
            "Measurements and tolerances shall be considered as per the approved technical sheet.\n"
            "Shade variation within acceptable commercial tolerance shall not be treated as a defect.\n"
            "Availability of exact raw material, trim, or accessory is subject to market supply conditions.\n"
            "Equivalent substitutions, if required, will be made only after communication and acceptance.\n"
            "Sample approval is critical and production output will follow the approved reference standard.\n"
            "Customer-supplied inputs must be accurate, complete, and released in time for production planning.\n"
            "Delay in approvals, revised artwork, or new technical comments may impact delivery schedule.\n"
            "Packing, folding, tagging, and finishing standards should be clearly defined before execution.\n"
            "Inspection shall be carried out as per mutually accepted quality parameters.\n"
            "Claims regarding hidden defects must be supported with batch details and review evidence.\n"
            "Rework requests beyond the approved technical scope may involve additional commercial impact.\n"
            "All technical execution remains subject to practical manufacturing tolerance and feasibility."
        ),
    },
]


def parse_scope_rows(quotation):
    def load_field(value):
        if not value:
            return []
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except (TypeError, ValueError, json.JSONDecodeError):
            return []

    names = load_field(getattr(quotation, "scope_name", ""))
    specifications = load_field(getattr(quotation, "scope_specification", ""))
    remarks = load_field(getattr(quotation, "scope_remarks", ""))
    max_length = max(len(names), len(specifications), len(remarks))

    if max_length:
        rows = []
        for index in range(max_length):
            rows.append({
                "name": str(names[index] if index < len(names) else "") or "",
                "specification": str(specifications[index] if index < len(specifications) else "") or "",
                "remarks": str(remarks[index] if index < len(remarks) else "") or "",
            })
        return rows

    return [{
        "name": getattr(quotation, "scope_name", "") or "",
        "specification": getattr(quotation, "scope_specification", "") or "",
        "remarks": getattr(quotation, "scope_remarks", "") or "",
    }]


def normalize_term_lines(value):
    lines = []
    for raw_line in str(value or "").splitlines():
        cleaned = re.sub(r'^\s*\d+(?:\.\d+)*[.)]?\s*', '', raw_line).strip()
        if cleaned:
            lines.append(cleaned)
    return lines


def get_default_general_terms_lines():
    for option in QUOTATION_TERMS_OPTIONS:
        if option.get("termsCategory") == "general" and option.get("termsName") == "Commercial General":
            return normalize_term_lines(option.get("termsContent", ""))
    return []

@api_view(['GET', 'POST', 'PUT', 'DELETE'])
def invoice_items(request, pk=None):
    # --- HANDLE DELETE ---
    if request.method == 'DELETE':
        if pk is None:
            return Response({'error': 'ID required for delete'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            item = InvoiceItem.objects.get(pk=pk)
            item.delete()
            return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
        except InvoiceItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    # --- HANDLE UPDATE (PUT) ---
    elif request.method == 'PUT':
        # ... your existing PUT code ...
        try:
            item = InvoiceItem.objects.get(pk=pk)
        except InvoiceItem.DoesNotExist:
            return Response({'error': 'Not Found'}, status=status.HTTP_404_NOT_FOUND)
            
        serializer = InvoiceItemSerializer(item, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- HANDLE POST (ADD) ---
    elif request.method == 'POST':
        # ... your existing POST code ...
        serializer = InvoiceItemSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # --- HANDLE GET (LIST) ---
    else:
        items = InvoiceItem.objects.all()
        serializer = InvoiceItemSerializer(items, many=True)
        return Response(serializer.data)
    
@api_view(['GET'])
def dispatch_details_view(request):
    dispatches = Dispatchdetails.objects.all().prefetch_related('items')
    
    print("\n" + "="*50)
    print("BACKEND DATABASE CHECK")
    print("="*50)
    
    for d in dispatches:
        items = d.items.all()
        print(f"DISPATCH ID: {d.id} | DOC NO: {d.dispatch_docno}")
        print(f"TOTAL ITEMS LINKED: {items.count()}")
        for item in items:
            print(f"  - Item: {item.item_name} | Rate: {item.rate}")
        if items.count() == 0:
            print("  - [!] ERROR: No items found for this dispatch in InvoiceItem table.")
    
    print("="*50 + "\n")

    serializer = DispatchdetailsSerializer(dispatches, many=True)
    return Response(serializer.data)
@api_view(['GET', 'POST'])
@csrf_exempt
def dispatch_list_create(request):
    if request.method == 'GET':
        invoices = Dispatchdetails.objects.all()
        serializer = DispatchdetailsSerializer(invoices, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Use the Serializer to validate and save
        serializer = DispatchdetailsSerializer(data=request.data)
        
        if serializer.is_valid():
            invoice = serializer.save()
            return Response({
                "message": "Invoice created", 
                "id": invoice.id
            }, status=status.HTTP_201_CREATED)
        else:
            # This will now return the EXACT field that is failing
            # e.g., {"dispatch_docno": ["This field must be unique."]}
            print("Serializer Errors:", serializer.errors) 
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
@api_view(['GET', 'PUT', 'DELETE'])
def dispatch_detail_update_delete(request, pk):
    # FIX: Change Serializer to Model name here
    invoice = get_object_or_404(Dispatchdetails, pk=pk) 

    if request.method == 'GET':
        return JsonResponse({
            "id": invoice.id,
            "dispatch_docno": invoice.dispatch_docno,
            "ledger": invoice.ledger,
            "tax_amount": invoice.tax_amount,
            "amount": invoice.amount,
            "terms_type": invoice.terms_type,
            "terms_conditions": invoice.terms_conditions,
        })

    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            # Update the fields
            invoice.dispatch_docno = data.get('dispatch_docno', invoice.dispatch_docno)
            invoice.ledger = data.get('ledger', invoice.ledger)
            invoice.tax_amount = data.get('tax_amount', invoice.tax_amount)
            invoice.amount = data.get('amount', invoice.amount)
            invoice.save() # This commits the changes to the DB
            return JsonResponse({"message": "Updated successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    elif request.method == 'DELETE':
        invoice.delete()
        return JsonResponse({"message": "Deleted successfully"}, status=204)


@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def quotation_list_create(request):
    if request.method == 'POST' and has_role(request.user, UserProfile.ROLE_CLIENT):
        return Response({'detail': 'Client users cannot create quotations.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        quotations = Quotation.objects.all().prefetch_related('items')
        for quotation in quotations:
            QuotationApproval.objects.get_or_create(quotation=quotation)
        serializer = QuotationSerializer(quotations, many=True)
        return Response(serializer.data)

    serializer = QuotationSerializer(data=request.data)
    if serializer.is_valid():
        quotation = serializer.save()
        QuotationApproval.objects.get_or_create(quotation=quotation)
        return Response(QuotationSerializer(quotation).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST'])
def purchase_order_list_create(request):
    if request.method == 'GET':
        purchase_orders = PurchaseOrder.objects.all()
        serializer = PurchaseOrderSerializer(purchase_orders, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = PurchaseOrderSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        purchase_order = serializer.save()
        return Response(PurchaseOrderSerializer(purchase_order, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def purchase_order_detail_update_delete(request, pk):
    purchase_order = get_object_or_404(PurchaseOrder, pk=pk)

    if request.method == 'GET':
        serializer = PurchaseOrderSerializer(purchase_order, context={'request': request})
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = PurchaseOrderSerializer(
            purchase_order,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if serializer.is_valid():
            purchase_order = serializer.save()
            return Response(PurchaseOrderSerializer(purchase_order, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    purchase_order.delete()
    return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'PUT', 'DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def quotation_detail_update_delete(request, pk):
    quotation = get_object_or_404(Quotation.objects.prefetch_related('items'), pk=pk)

    if request.method == 'DELETE' and has_role(request.user, UserProfile.ROLE_CLIENT):
        return Response({'detail': 'Client users cannot delete quotations.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT' and has_role(request.user, UserProfile.ROLE_CLIENT):
        allowed_keys = {'client_status', 'client_response_remarks'}
        submitted_keys = set(request.data.keys())
        if not submitted_keys.issubset(allowed_keys):
            return Response(
                {'detail': 'Client users can only update client response fields.'},
                status=status.HTTP_403_FORBIDDEN,
            )

    if request.method == 'GET':
        QuotationApproval.objects.get_or_create(quotation=quotation)
        return Response(QuotationSerializer(quotation).data)

    if request.method == 'PUT':
        serializer = QuotationSerializer(quotation, data=request.data, partial=True)
        if serializer.is_valid():
            quotation = serializer.save()
            approval, _ = QuotationApproval.objects.get_or_create(quotation=quotation)
            reset_approval_workflow(approval)
            return Response(QuotationSerializer(quotation).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    quotation.delete()
    return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def quotation_terms_list(request):
    return Response(QUOTATION_TERMS_OPTIONS)


def _number_to_words(number):
    units = [
        "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen",
    ]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def below_thousand(value):
        parts = []
        if value >= 100:
            parts.append(f"{units[value // 100]} Hundred")
            value %= 100
        if value >= 20:
            parts.append(tens[value // 10])
            if value % 10:
                parts.append(units[value % 10])
        elif value > 0:
            parts.append(units[value])
        return " ".join(parts).strip()

    value = int(round(float(number or 0)))
    if value == 0:
        return "Zero"

    chunks = [
        (10000000, "Crore"),
        (100000, "Lakh"),
        (1000, "Thousand"),
        (1, ""),
    ]

    words = []
    remaining = value
    for divisor, label in chunks:
        chunk_value = remaining // divisor
        if chunk_value:
            words.append(below_thousand(chunk_value))
            if label:
                words.append(label)
            remaining %= divisor

    return " ".join(words).strip()


def sync_approved_estimation_to_quotation(estimation, increment_revision=True):
    quotation = Quotation.objects.filter(rfq_no=estimation.rfq_no).order_by("-id").first()
    if quotation is None:
        return

    decimal_places = int(getattr(quotation, "decimal_places", 2) or 2)
    conversion_rate = float(getattr(quotation, "conversion_rate", 1) or 1)
    tax_rate = float(getattr(quotation, "tax_rate", 0) or 0)
    base_amount = float(getattr(estimation, "grand_total", 0) or 0)
    taxable_amount = round(base_amount * conversion_rate, decimal_places)
    tax_amount = round(taxable_amount * tax_rate, decimal_places)
    total_net_amount = round(taxable_amount + tax_amount, decimal_places)

    quotation.taxable_amount = taxable_amount
    quotation.tax_amount = tax_amount
    quotation.subtotal = taxable_amount
    quotation.net_amount = total_net_amount
    quotation.total_net_amount = total_net_amount
    if increment_revision:
        quotation.revise_count = int(getattr(quotation, "revise_count", 0) or 0) + 1
    quotation.save(update_fields=[
        "taxable_amount",
        "tax_amount",
        "subtotal",
        "net_amount",
        "total_net_amount",
        "revise_count",
        "updated_at",
    ])


def reset_approval_workflow(approval):
    approval.sent_to_head = False
    approval.sent_to_head_at = None
    approval.head_status = 'pending'
    approval.head_comment = ''
    approval.head_reviewed_at = None
    approval.head_reviewed_by = None
    approval.md_status = 'pending'
    approval.md_comment = ''
    approval.md_reviewed_at = None
    approval.md_reviewed_by = None
    approval.save()


def view_quotation(request, quotation_id):
    quotation = get_object_or_404(Quotation, id=quotation_id)
    sales_service = SalesServiceRequest.objects.filter(rfq_no=quotation.rfq_no).first()
    website_profile = get_website_profile()
    host_name = request.get_host().split(":")[0]
    logo_url = f"{request.scheme}://{host_name}:3000/majesticlogo.png"
    decimal_places = int(getattr(quotation, "decimal_places", 2) or 2)
    scope_rows = [
        row for row in parse_scope_rows(quotation)
        if row.get("name") or row.get("specification") or row.get("remarks")
    ] or [{"name": "-", "specification": "-", "remarks": "-"}]
    payment_lines = normalize_term_lines(quotation.payment_terms)
    delivery_lines = normalize_term_lines(quotation.delivery_terms)
    general_lines = normalize_term_lines(quotation.general_terms)
    if len(general_lines) < 10:
        general_lines = get_default_general_terms_lines()
    terms_lines = payment_lines + delivery_lines + general_lines
    sender_name = (website_profile.get("company_name") or "Marine Dubai").strip()
    if sender_name.lower().startswith("welcome to "):
        sender_name = sender_name[11:].strip()

    context = {
        "quotation": quotation,
        "logo_url": logo_url,
        "decimal_places": decimal_places,
        "formatted_total_amount": f"{float(quotation.total_net_amount or quotation.net_amount or 0):.{decimal_places}f}",
        "scope_rows": scope_rows,
        "single_scope_row": len(scope_rows) == 1,
        "sender_name": sender_name,
        "sender_address_lines": [
            website_profile.get("client_location") or "-",
            f"Email: {website_profile.get('email') or '-'}",
            f"TEL NO.: {website_profile.get('phone_no') or '-'}",
        ],
        "client_location": getattr(sales_service, "client_location", "") or website_profile.get("client_location") or "-",
        "client_email": quotation.email or getattr(sales_service, "email", "") or website_profile.get("email") or "-",
        "client_phone": quotation.phone_no or getattr(sales_service, "phone_no", "") or website_profile.get("phone_no") or "-",
        "payment_lines": payment_lines,
        "delivery_lines": delivery_lines,
        "general_lines": general_lines,
        "terms_lines": terms_lines,
        "amount_in_words": _number_to_words(quotation.total_net_amount or quotation.net_amount or 0),
    }
    return render(request, "quotation_print.html", context)

def view_invoice(request, dispatch_id):
    # Fetch the header
    dispatch = get_object_or_404(Dispatchdetails, id=dispatch_id)
    
    # Fetch all items related to this dispatch
    # Using the related_name='items' defined in your InvoiceItem model
    records = dispatch.items.all() 

    # Prepare data for the template
    for rec in records:
        # Create a temporary attribute for the template to show CGST/SGST
        rec.tax_split = rec.tax_amount / 2

    # Map variables to match your HTML exactly
    context = {
        'dispatch_docno': dispatch.dispatch_docno,
        'ledger': dispatch.ledger,
        'terms_type': dispatch.terms_type,       # Explicitly pass this
        'terms_conditions': dispatch.terms_conditions,
        'records': records,
        'taxable_total': dispatch.amount - dispatch.tax_amount, # Net - Tax
        'net_total': dispatch.amount,
    }
    
    return render(request, 'invoice.html', context)
@api_view(['GET', 'POST'])
def create_item(request):
    # 1. Handle GET: Return the list of items
    if request.method == 'GET':
        items = Item.objects.all().order_by('-id') # Newest items first
        serializer = ItemSerializer(items, many=True, context={'request': request})
        return Response(serializer.data)

    # 2. Handle POST: Save a new item
    if request.method == 'POST':
        data = request.data.copy()
        for field_name in ITEM_BOOLEAN_FIELDS:
            if field_name not in data:
                data[field_name] = Item._meta.get_field(field_name).default

        serializer = ItemSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def item_detail_update_delete(request, pk):
    item = get_object_or_404(Item, pk=pk)

    if request.method == 'GET':
        serializer = ItemSerializer(item, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'PUT':
        data = request.data.copy()
        for field_name in ITEM_BOOLEAN_FIELDS:
            if field_name not in data:
                data[field_name] = getattr(item, field_name)

        serializer = ItemSerializer(item, data=data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        item.delete()
        return Response({'message': 'Item deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def sales_service_list_create(request):
    if request.method == 'GET':
        requests = SalesServiceRequest.objects.all()
        serializer = SalesServiceRequestSerializer(requests, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = SalesServiceRequestSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def sales_service_detail_update_delete(request, pk):
    item = get_object_or_404(SalesServiceRequest, pk=pk)

    if request.method == 'GET':
        serializer = SalesServiceRequestSerializer(item, context={'request': request})
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = SalesServiceRequestSerializer(item, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    item.delete()
    return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def cost_estimation_list_create(request):
    if request.method == 'POST' and has_role(request.user, UserProfile.ROLE_CLIENT):
        return Response({'detail': 'Client users cannot create cost estimations.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        estimations = CostEstimation.objects.all()
        serializer = CostEstimationSerializer(estimations, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = CostEstimationSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        estimation = serializer.save()
        CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
        return Response(CostEstimationSerializer(estimation, context={'request': request}).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def cost_estimation_detail_update_delete(request, pk):
    estimation = get_object_or_404(CostEstimation, pk=pk)

    if request.method in {'PUT', 'DELETE'} and has_role(request.user, UserProfile.ROLE_CLIENT):
        return Response(
            {'detail': 'Client users cannot modify cost estimations.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'GET':
        CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
        serializer = CostEstimationSerializer(estimation, context={'request': request})
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = CostEstimationSerializer(
            estimation,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        if serializer.is_valid():
            estimation = serializer.save()
            approval, _ = CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
            reset_approval_workflow(approval)
            return Response(CostEstimationSerializer(estimation, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    estimation.delete()
    return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def cost_estimation_option_catalog(request):
    website_profile = get_website_profile()
    website_options = website_profile.get("cost_estimation_options") or {}

    if any(website_options.get(section) for section in website_options):
        return Response(website_options)

    return Response({
        'rawMaterial': RawMaterialOptionSerializer(RawMaterialOption.objects.filter(is_active=True), many=True).data,
        'productionCost': ProductionCostOptionSerializer(ProductionCostOption.objects.filter(is_active=True), many=True).data,
        'addonCost': AddonCostOptionSerializer(AddonCostOption.objects.filter(is_active=True), many=True).data,
        'sewingCost': SewingCostOptionSerializer(SewingCostOption.objects.filter(is_active=True), many=True).data,
        'threadworkFinishing': ThreadworkFinishingOptionSerializer(ThreadworkFinishingOption.objects.filter(is_active=True), many=True).data,
        'packagingLogistics': PackagingLogisticsOptionSerializer(PackagingLogisticsOption.objects.filter(is_active=True), many=True).data,
        'miscellaneous': MiscellaneousOptionSerializer(MiscellaneousOption.objects.filter(is_active=True), many=True).data,
    })


@api_view(['GET'])
def website_company_profile(request):
    return Response(get_website_profile())


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def cost_estimation_approval_update(request, pk):
    estimation = get_object_or_404(CostEstimation, pk=pk)
    approval, _ = CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
    action = request.data.get('action')

    if action == 'send_to_head':
        if not has_any_role(request.user, [UserProfile.ROLE_USER, UserProfile.ROLE_SALES_LEAD, UserProfile.ROLE_DEPT_HEAD, UserProfile.ROLE_MD]):
            return Response({'detail': 'You do not have permission to send this estimation for approval.'}, status=status.HTTP_403_FORBIDDEN)
        approval.sent_to_head = True
        approval.sent_to_head_at = timezone.now()
        approval.head_status = 'pending'
        approval.head_comment = ''
        approval.head_reviewed_at = None
        approval.head_reviewed_by = None
        approval.md_status = 'pending'
        approval.md_comment = ''
        approval.md_reviewed_at = None
        approval.md_reviewed_by = None
        approval.save()
        return Response(CostEstimationApprovalSerializer(approval).data)

    if action == 'head_review':
        if not has_any_role(request.user, [UserProfile.ROLE_DEPT_HEAD, UserProfile.ROLE_MD]):
            return Response({'detail': 'Only Department Head or MD can review this stage.'}, status=status.HTTP_403_FORBIDDEN)
        review_status = request.data.get('status')
        if review_status not in {'approved', 'declined'}:
            return Response({'status': ['Status must be approved or declined.']}, status=status.HTTP_400_BAD_REQUEST)

        approval.sent_to_head = True
        approval.sent_to_head_at = approval.sent_to_head_at or timezone.now()
        approval.head_status = review_status
        approval.head_comment = (request.data.get('comment') or '').strip()
        approval.head_reviewed_at = timezone.now()
        approval.head_reviewed_by = getattr(request, 'user', None) if getattr(request, 'user', None) and request.user.is_authenticated else None

        if review_status != 'approved':
            approval.md_status = 'pending'
            approval.md_comment = ''
            approval.md_reviewed_at = None
            approval.md_reviewed_by = None

        approval.save()
        return Response(CostEstimationApprovalSerializer(approval).data)

    if action == 'md_review':
        if not has_any_role(request.user, [UserProfile.ROLE_MD]):
            return Response({'detail': 'Only MD can complete this review.'}, status=status.HTTP_403_FORBIDDEN)
        if approval.head_status != 'approved':
            return Response({'detail': 'Head approval required first.'}, status=status.HTTP_400_BAD_REQUEST)

        review_status = request.data.get('status')
        if review_status not in {'approved', 'declined'}:
            return Response({'status': ['Status must be approved or declined.']}, status=status.HTTP_400_BAD_REQUEST)

        previous_md_status = approval.md_status
        approval.md_status = review_status
        approval.md_comment = (request.data.get('comment') or '').strip()
        approval.md_reviewed_at = timezone.now()
        approval.md_reviewed_by = getattr(request, 'user', None) if getattr(request, 'user', None) and request.user.is_authenticated else None
        approval.save()

        if review_status == 'approved' and previous_md_status != 'approved':
            sync_approved_estimation_to_quotation(estimation, increment_revision=True)

        return Response(CostEstimationApprovalSerializer(approval).data)

    return Response({'action': ['Unsupported approval action.']}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def quotation_approval_update(request, pk):
    quotation = get_object_or_404(Quotation, pk=pk)
    approval, _ = QuotationApproval.objects.get_or_create(quotation=quotation)
    action = request.data.get('action')

    if action == 'send_to_head':
        if not has_any_role(request.user, [UserProfile.ROLE_USER, UserProfile.ROLE_SALES_LEAD, UserProfile.ROLE_SALES_HEAD, UserProfile.ROLE_DEPT_HEAD, UserProfile.ROLE_MD]):
            return Response({'detail': 'You do not have permission to send this quotation for approval.'}, status=status.HTTP_403_FORBIDDEN)
        approval.sent_to_head = True
        approval.sent_to_head_at = timezone.now()
        approval.head_status = 'pending'
        approval.head_comment = ''
        approval.head_reviewed_at = None
        approval.head_reviewed_by = None
        approval.md_status = 'pending'
        approval.md_comment = ''
        approval.md_reviewed_at = None
        approval.md_reviewed_by = None
        approval.save()
        return Response(CostEstimationApprovalSerializer(approval).data)

    if action == 'head_review':
        if not has_any_role(request.user, [UserProfile.ROLE_SALES_HEAD, UserProfile.ROLE_MD]):
            return Response({'detail': 'Only Sales Head or MD can review this stage.'}, status=status.HTTP_403_FORBIDDEN)
        review_status = request.data.get('status')
        if review_status not in {'approved', 'declined'}:
            return Response({'status': ['Status must be approved or declined.']}, status=status.HTTP_400_BAD_REQUEST)

        approval.sent_to_head = True
        approval.sent_to_head_at = approval.sent_to_head_at or timezone.now()
        approval.head_status = review_status
        approval.head_comment = (request.data.get('comment') or '').strip()
        approval.head_reviewed_at = timezone.now()
        approval.head_reviewed_by = getattr(request, 'user', None) if getattr(request, 'user', None) and request.user.is_authenticated else None

        if review_status != 'approved':
            approval.md_status = 'pending'
            approval.md_comment = ''
            approval.md_reviewed_at = None
            approval.md_reviewed_by = None

        approval.save()
        return Response(CostEstimationApprovalSerializer(approval).data)

    if action == 'md_review':
        if not has_any_role(request.user, [UserProfile.ROLE_MD]):
            return Response({'detail': 'Only MD can complete this review.'}, status=status.HTTP_403_FORBIDDEN)
        if approval.head_status != 'approved':
            return Response({'detail': 'Head approval required first.'}, status=status.HTTP_400_BAD_REQUEST)

        review_status = request.data.get('status')
        if review_status not in {'approved', 'declined'}:
            return Response({'status': ['Status must be approved or declined.']}, status=status.HTTP_400_BAD_REQUEST)

        approval.md_status = review_status
        approval.md_comment = (request.data.get('comment') or '').strip()
        approval.md_reviewed_at = timezone.now()
        approval.md_reviewed_by = getattr(request, 'user', None) if getattr(request, 'user', None) and request.user.is_authenticated else None
        approval.save()
        return Response(CostEstimationApprovalSerializer(approval).data)

    return Response({'action': ['Unsupported approval action.']}, status=status.HTTP_400_BAD_REQUEST)
