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
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
# Remove SalesInvoice and use Dispatchdetails
from .models import Dispatchdetails, InvoiceItem
from django.shortcuts import render
# CORRECT IMPORT
from rest_framework.authtoken.models import Token

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
            "Advance payment terms apply as per approved quotation.\n"
            "Balance payment shall be cleared before final dispatch unless otherwise agreed.\n"
            "Taxes, duties, and statutory levies are payable extra wherever applicable."
        ),
    },
    {
        "termsCategory": "payment",
        "termsName": "Milestone Payment",
        "termsContent": (
            "1. Payment shall be released stage by stage as agreed in the commercial discussion.\n"
            "2. Any delay in milestone approval may impact production continuation and delivery timelines.\n"
            "3. Final invoice settlement is mandatory before handover."
        ),
    },
    {
        "termsCategory": "delivery",
        "termsName": "Standard Delivery",
        "termsContent": (
            "1. Delivery schedule starts only after approval and receipt of the confirmed advance.\n"
            "2. Any delay caused by customer-side approval, artwork, or material change will revise the delivery commitment.\n"
            "3. Freight, loading, unloading, and insurance will be handled as per mutually agreed delivery mode."
        ),
    },
    {
        "termsCategory": "delivery",
        "termsName": "Dispatch Conditions",
        "termsContent": (
            "1. Dispatch will be planned only after production clearance and packing confirmation.\n"
            "2. Part delivery, split shipment, or urgent dispatch will be subject to logistics feasibility.\n"
            "3. Transit delays beyond our control shall not be treated as supply default."
        ),
    },
    {
        "termsCategory": "general",
        "termsName": "Commercial General",
        "termsContent": (
            "1. This quotation is subject to final technical confirmation and management approval.\n"
            "2. Any change in quantity, specification, or scope will require price and lead-time revision.\n"
            "3. Once approved, cancellation charges may apply for work already executed or materials already procured."
        ),
    },
    {
        "termsCategory": "general",
        "termsName": "Technical General",
        "termsContent": (
            "Final execution will be based on approved sample, artwork, and technical sign-off.\n"
            "Any variation in fabric, trim, branding, or workmanship expectation may alter cost and lead time.\n"
            "Measurements and tolerances shall be considered as per the approved technical sheet."
        ),
    },
]

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
def quotation_list_create(request):
    if request.method == 'GET':
        quotations = Quotation.objects.all().prefetch_related('items')
        serializer = QuotationSerializer(quotations, many=True)
        return Response(serializer.data)

    serializer = QuotationSerializer(data=request.data)
    if serializer.is_valid():
        quotation = serializer.save()
        return Response(QuotationSerializer(quotation).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def quotation_detail_update_delete(request, pk):
    quotation = get_object_or_404(Quotation.objects.prefetch_related('items'), pk=pk)

    if request.method == 'GET':
        return Response(QuotationSerializer(quotation).data)

    if request.method == 'PUT':
        serializer = QuotationSerializer(quotation, data=request.data)
        if serializer.is_valid():
            quotation = serializer.save()
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


def view_quotation(request, quotation_id):
    quotation = get_object_or_404(Quotation, id=quotation_id)
    sales_service = SalesServiceRequest.objects.filter(rfq_no=quotation.rfq_no).first()
    host_name = request.get_host().split(":")[0]
    logo_url = f"{request.scheme}://{host_name}:3000/logo.png"
    decimal_places = int(getattr(quotation, "decimal_places", 2) or 2)
    terms_lines = []
    for block in [quotation.payment_terms, quotation.delivery_terms, quotation.general_terms]:
        for line in str(block or "").splitlines():
            if line.strip():
                terms_lines.append(line.strip())

    payment_lines = [line.strip() for line in str(quotation.payment_terms or "").splitlines() if line.strip()]
    delivery_lines = [line.strip() for line in str(quotation.delivery_terms or "").splitlines() if line.strip()]

    context = {
        "quotation": quotation,
        "logo_url": logo_url,
        "decimal_places": decimal_places,
        "formatted_total_amount": f"{float(quotation.total_net_amount or quotation.net_amount or 0):.{decimal_places}f}",
        "sender_name": "PRIYA FASHIONS",
        "sender_address_lines": [
            "72 north car street ext,",
            "Thoothukudi-628002",
            "Email: test@gmail.com",
            "TRN: 34354345",
            "TEL NO.: 324324324324",
        ],
        "client_location": getattr(sales_service, "client_location", "") or "-",
        "client_email": quotation.email or getattr(sales_service, "email", "") or "demo@gmail.com",
        "client_phone": quotation.phone_no or getattr(sales_service, "phone_no", "") or "9856321478",
        "payment_lines": payment_lines,
        "delivery_lines": delivery_lines,
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
def cost_estimation_list_create(request):
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
def cost_estimation_detail_update_delete(request, pk):
    estimation = get_object_or_404(CostEstimation, pk=pk)

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
            CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
            return Response(CostEstimationSerializer(estimation, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    estimation.delete()
    return Response({'message': 'Deleted successfully'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def cost_estimation_option_catalog(request):
    return Response({
        'rawMaterial': RawMaterialOptionSerializer(RawMaterialOption.objects.filter(is_active=True), many=True).data,
        'productionCost': ProductionCostOptionSerializer(ProductionCostOption.objects.filter(is_active=True), many=True).data,
        'addonCost': AddonCostOptionSerializer(AddonCostOption.objects.filter(is_active=True), many=True).data,
        'sewingCost': SewingCostOptionSerializer(SewingCostOption.objects.filter(is_active=True), many=True).data,
        'threadworkFinishing': ThreadworkFinishingOptionSerializer(ThreadworkFinishingOption.objects.filter(is_active=True), many=True).data,
        'packagingLogistics': PackagingLogisticsOptionSerializer(PackagingLogisticsOption.objects.filter(is_active=True), many=True).data,
        'miscellaneous': MiscellaneousOptionSerializer(MiscellaneousOption.objects.filter(is_active=True), many=True).data,
    })


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def cost_estimation_approval_update(request, pk):
    estimation = get_object_or_404(CostEstimation, pk=pk)
    approval, _ = CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
    action = request.data.get('action')

    if action == 'send_to_head':
        approval.sent_to_head = True
        approval.sent_to_head_at = approval.sent_to_head_at or timezone.now()
        approval.save(update_fields=['sent_to_head', 'sent_to_head_at', 'updated_at'])
        return Response(CostEstimationApprovalSerializer(approval).data)

    if action == 'head_review':
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
