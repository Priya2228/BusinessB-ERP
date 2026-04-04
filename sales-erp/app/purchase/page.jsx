"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List } from "lucide-react";
import toast from "react-hot-toast";
import AppPageShell from "../components/AppPageShell";
import { buildApiUrl } from "../utils/api";

const today = new Date().toISOString().slice(0, 10);

const createInitialForm = () => ({
  quotationNo: "",
  costEstimationNo: "",
  poNo: "",
  poDate: today,
  poReceivedDate: today,
  expectedDeliveryDate: "",
  fileAttachment: null,
  existingFileAttachment: "",
  fileName: "",
});

const generateNextPoNo = (rows) => {
  let highestNumber = 0;

  rows.forEach((row) => {
    const digits = String(row?.po_no || "")
      .replace(/\D/g, "")
      .trim();
    if (digits) {
      highestNumber = Math.max(highestNumber, Number(digits));
    }
  });

  return `PO${String(highestNumber + 1).padStart(3, "0")}`;
};

export default function PurchaseOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEditMode = Boolean(editId);

  const [formData, setFormData] = useState(createInitialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quotationOptions, setQuotationOptions] = useState([]);
  const [costEstimations, setCostEstimations] = useState([]);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const selectedQuotation = useMemo(
    () => quotationOptions.find((row) => String(row.quotation_code || "") === String(formData.quotationNo || "")),
    [formData.quotationNo, quotationOptions]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [quotationResponse, estimationResponse, purchaseOrderResponse] = await Promise.all([
          fetch(buildApiUrl("/api/quotations/"), { headers: getAuthHeaders() }),
          fetch(buildApiUrl("/api/cost-estimations/"), { headers: getAuthHeaders() }),
          fetch(buildApiUrl("/api/purchase-orders/"), { headers: getAuthHeaders() }),
        ]);

        const quotationData = quotationResponse.ok ? await quotationResponse.json() : [];
        const estimationData = estimationResponse.ok ? await estimationResponse.json() : [];
        const purchaseOrderData = purchaseOrderResponse.ok ? await purchaseOrderResponse.json() : [];

        setQuotationOptions(Array.isArray(quotationData) ? quotationData : []);
        setCostEstimations(Array.isArray(estimationData) ? estimationData : []);

        if (!isEditMode) {
          setFormData((prev) => ({
            ...prev,
            poNo: generateNextPoNo(Array.isArray(purchaseOrderData) ? purchaseOrderData : []),
          }));
          return;
        }

        const detailResponse = await fetch(buildApiUrl(`/api/purchase-orders/${editId}/`), {
          headers: getAuthHeaders(),
        });

        if (!detailResponse.ok) {
          toast.error("Failed to load purchase order.");
          return;
        }

        const detailData = await detailResponse.json();
        setFormData({
          quotationNo: detailData.quotation_no || "",
          costEstimationNo: detailData.cost_estimation_no || "",
          poNo: detailData.po_no || "",
          poDate: detailData.po_date || today,
          poReceivedDate: detailData.po_received_date || today,
          expectedDeliveryDate: detailData.expected_delivery_date || "",
          fileAttachment: null,
          existingFileAttachment: detailData.file_attachment || "",
          fileName: detailData.file_attachment ? String(detailData.file_attachment).split("/").pop() : "",
        });
      } catch {
        toast.error("Network error while loading purchase order.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [editId, isEditMode]);

  useEffect(() => {
    if (!selectedQuotation) {
      setFormData((prev) => ({ ...prev, costEstimationNo: "" }));
      return;
    }

    const matchedEstimation = costEstimations.find((row) => String(row.rfq_no || "") === String(selectedQuotation.rfq_no || ""));
    setFormData((prev) => ({
      ...prev,
      costEstimationNo: matchedEstimation?.estimation_no || "",
    }));
  }, [costEstimations, selectedQuotation]);

  const handleFieldChange = (field) => (event) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuotationChange = (event) => {
    const quotationNo = event.target.value;
    setFormData((prev) => ({
      ...prev,
      quotationNo,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setFormData((prev) => ({
      ...prev,
      fileAttachment: file,
      fileName: file?.name || prev.fileName,
    }));
  };

  const handleCancel = () => {
    router.push("/purchase/list");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.quotationNo) {
      toast.error("Quotation No is required.");
      return;
    }

    const payload = new FormData();
    payload.append("quotation_no", formData.quotationNo);
    payload.append("cost_estimation_no", formData.costEstimationNo);
    payload.append("po_no", formData.poNo);
    payload.append("po_date", formData.poDate);
    payload.append("po_received_date", formData.poReceivedDate);
    payload.append("expected_delivery_date", formData.expectedDeliveryDate);
    payload.append("rfq_no", selectedQuotation?.rfq_no || "");
    payload.append("attention", selectedQuotation?.attention_name || selectedQuotation?.customer_name || "");
    payload.append("company_address", selectedQuotation?.company_name || "");
    payload.append("client_address", selectedQuotation?.customer_name || "");
    payload.append("email", selectedQuotation?.email || "");
    payload.append("phone_number", selectedQuotation?.phone_no || "");
    payload.append("total_net_amount", String(Number(selectedQuotation?.total_net_amount || selectedQuotation?.net_amount || 0)));
    payload.append("scope_rows", "[]");

    if (formData.fileAttachment) {
      payload.append("file_attachment", formData.fileAttachment);
    }

    try {
      setSaving(true);
      const response = await fetch(buildApiUrl(isEditMode ? `/api/purchase-orders/${editId}/` : "/api/purchase-orders/"), {
        method: isEditMode ? "PUT" : "POST",
        headers: getAuthHeaders(),
        body: payload,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.po_no?.[0] || errorData.quotation_no?.[0] || "Failed to save purchase order.");
        return;
      }

      const savedPurchaseOrder = await response.json().catch(() => null);
      toast.success(isEditMode ? "Purchase order updated successfully." : "Purchase order saved successfully.");
      if (isEditMode && savedPurchaseOrder?.id) {
        router.replace(`/purchase?editId=${savedPurchaseOrder.id}`);
      }
    } catch {
      toast.error("Network error while saving purchase order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2">
      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-bold text-slate-900">Purchase Order</h1>
          <button
            type="button"
            onClick={() => router.push("/purchase/list")}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-white text-blue-600"
          >
            <List size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-14 text-center text-[13px] text-slate-500">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <section className="rounded-[16px] border border-slate-200 p-5">
              <h2 className="text-[15px] font-bold text-slate-900">Purchase Order Information</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Quotation No</span>
                  <select
                    value={formData.quotationNo}
                    onChange={handleQuotationChange}
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] outline-none"
                  >
                    <option value="">Select quotation</option>
                    {quotationOptions.map((row) => (
                      <option key={row.id} value={row.quotation_code || ""}>
                        {row.quotation_code || "-"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Cost Estimation No</span>
                  <input
                    type="text"
                    value={formData.costEstimationNo}
                    readOnly
                    className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-[13px] outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">P.O No</span>
                  <input
                    type="text"
                    value={formData.poNo}
                    readOnly
                    className="h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-[13px] outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Purchase Order Date</span>
                  <input
                    type="date"
                    value={formData.poDate}
                    onChange={handleFieldChange("poDate")}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Purchase Order Received Date</span>
                  <input
                    type="date"
                    value={formData.poReceivedDate}
                    onChange={handleFieldChange("poReceivedDate")}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-[13px] font-semibold text-slate-700">Expected Delivery Date</span>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={handleFieldChange("expectedDeliveryDate")}
                    className="h-10 w-full rounded-md border border-slate-300 px-3 text-[13px] outline-none"
                  />
                </label>
              </div>

              <div className="mt-5 max-w-[420px] space-y-2">
                <span className="block text-[13px] font-semibold text-slate-700">Purchase Order File Attachment</span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700">
                    Choose File
                    <input type="file" onChange={handleFileChange} className="hidden" />
                  </label>
                  <span className="text-[12px] text-slate-500">
                    {formData.fileName || "No file chosen"}
                  </span>
                </div>
                {formData.existingFileAttachment ? (
                  <a
                    href={formData.existingFileAttachment}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[12px] text-sky-600"
                  >
                    View uploaded file
                  </a>
                ) : null}
              </div>
            </section>

            <div className="mt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-[10px] bg-[#ff9533] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(255,149,51,0.25)]"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-[10px] bg-[#34b556] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(52,181,86,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "PROCESSING..." : isEditMode ? "UPDATE" : "SUBMIT"}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppPageShell>
  );
}
