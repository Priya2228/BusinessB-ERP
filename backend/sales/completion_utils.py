from django.utils import timezone

from .models import CostEstimation, CostEstimationApproval, SalesServiceRequest


def _generate_completion_estimation_no():
    timestamp = timezone.now().strftime("%Y%m%d%H%M%S%f")
    return f"CEC-{timestamp[-10:]}"


def ensure_completion_cost_estimation(service_request: SalesServiceRequest) -> CostEstimation:
    estimation = CostEstimation.objects.filter(rfq_no=service_request.rfq_no).first()
    if not estimation:
        estimation = CostEstimation.objects.create(
            estimation_no=_generate_completion_estimation_no(),
            rfq_no=service_request.rfq_no,
            registered_date=service_request.registered_date or timezone.now().date(),
            client_name=service_request.client_name or service_request.company_name,
            company_name=service_request.company_name or service_request.client_name,
            phone_no=service_request.phone_no,
            email=service_request.email,
            delivery_location=service_request.client_location,
            payment_terms="Quote of Completion",
            tax_preference=service_request.branding_type or "",
            delivery_mode=service_request.plan_rfq_type or "",
            remarks=service_request.scope_of_work,
        )

    approval, _ = CostEstimationApproval.objects.get_or_create(cost_estimation=estimation)
    approval.sent_to_head = True
    approval.sent_to_head_at = timezone.now()
    approval.head_status = "pending"
    approval.head_comment = ""
    approval.head_reviewed_at = None
    approval.head_reviewed_by = None
    approval.md_status = "pending"
    approval.md_comment = ""
    approval.md_reviewed_at = None
    approval.md_reviewed_by = None
    approval.save()
    return estimation
