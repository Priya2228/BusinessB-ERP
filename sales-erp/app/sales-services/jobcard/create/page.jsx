"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List } from "lucide-react";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";
import { getStoredAuthState, normalizeRole, ROLES } from "../../../utils/rbac";

/**
 * UTILS & FORMATTERS
 */
const formatDateDisplay = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const ensureIsoDate = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.includes("T") ? value.split("T")[0] : value;
  return new Date(value).toISOString().split("T")[0];
};

const createJobCardNumber = (poNo) => (poNo ? `JOB-CARD-${poNo.split('-').pop()}` : `JOB-CARD-${Date.now().toString().slice(-4)}`);

const RFQ_CATEGORY_STANDARD = "Standard";

/**
 * DATA BUILDER
 */
const buildJobcardDraft = ({ purchaseOrder, service, costEstimation, existingJobcard }) => {
  const basePo = { ...(purchaseOrder || existingJobcard?.purchase_order_info || {}) };
  const rfqNo = existingJobcard?.rfq_no || basePo?.rfq_no || service?.rfq_no || "";
  const poScopeRows = Array.isArray(purchaseOrder?.scope_rows) ? purchaseOrder.scope_rows : [];
  const firstPoScope = poScopeRows[0] || {};
  const derivedScopeType =
    existingJobcard?.scope_type || service?.service_category || firstPoScope.name || "";
  const derivedScopeDescription =
    existingJobcard?.scope_description || service?.fabric_specs || firstPoScope.specification || "";
  const derivedScopeRemarks =
    existingJobcard?.scope_remarks || service?.scope_of_work || firstPoScope.remarks || "";

  return {
    jobcard_no: existingJobcard?.jobcard_no || createJobCardNumber(basePo?.po_no),
    jobcard_date: ensureIsoDate(existingJobcard?.jobcard_date || new Date().toISOString()),
    purchase_order_id: existingJobcard?.purchase_order || basePo?.id || null,
    rfq_no: rfqNo,
    rfq_type: existingJobcard?.rfq_type || service?.plan_rfq_type || "Workshop",
    rfq_category: existingJobcard?.rfq_category || service?.rfq_category || "Standard",
    cost_estimation_no:
      existingJobcard?.cost_estimation_no || costEstimation?.estimation_no || basePo?.cost_estimation_no || "",
    client_name: existingJobcard?.client_name || service?.client_name || "",
    company_name: existingJobcard?.company_name || service?.company_name || "",
    attention:
      existingJobcard?.attention ||
      basePo?.attention ||
      service?.attention ||
      service?.client_name ||
      "",
    planning_date: ensureIsoDate(existingJobcard?.planning_date || service?.planning_date || ""),
    expected_delivery_date:
      ensureIsoDate(existingJobcard?.expected_delivery_date || basePo?.expected_delivery_date || ""),
    remarks: existingJobcard?.remarks || "",
    scope_type: derivedScopeType,
    scope_description: derivedScopeDescription,
    scope_remarks: derivedScopeRemarks,
    supervisor_id: existingJobcard?.supervisor?.id || null,
  };
};

/**
 * MAIN COMPONENT
 */
export default function JobCardCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const poIdParam = searchParams.get("poId");
  const jobcardIdParam = searchParams.get("jobcardId");
  const rfqIdParam = searchParams.get("rfqId");
  const isEditingMode = Boolean(jobcardIdParam);
  const authState = getStoredAuthState();
  const isOperationHead = normalizeRole(authState?.role || "") === normalizeRole(ROLES.OPERATION_HEAD);

  // State Management
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [serviceDetail, setServiceDetail] = useState(null);
  const [costDetail, setCostDetail] = useState(null);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(null);
  const [rfqList, setRfqList] = useState([]);
  const [selectedRfq, setSelectedRfq] = useState("");
  const [selectedJobcard, setSelectedJobcard] = useState(null);
  const [jobcardDraft, setJobcardDraft] = useState(null);
  const [supervisorOptions, setSupervisorOptions] = useState([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState(null);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [savingJobcard, setSavingJobcard] = useState(false);
  const toastTimer = useRef(null);
  const [toast, setToast] = useState(null);

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  // 1. Initial Data Fetching
  useEffect(() => {
    const load = async () => {
      setLoadingRefs(true);
      try {
        const headers = getAuthHeaders();
        const [poRes, rfqRes] = await Promise.all([
          fetch(buildApiUrl("/api/purchase-orders/"), { headers }),
          fetch(buildApiUrl("/api/sales-services/"), { headers }),
        ]);
        const poData = poRes.ok ? await poRes.json() : [];
        const rfqData = rfqRes.ok ? await rfqRes.json() : [];
        setPurchaseOrders(Array.isArray(poData) ? poData : []);
        setRfqList(Array.isArray(rfqData) ? rfqData : []);
      } catch {
        showToast("Unable to load reference data.", "error");
      } finally {
        setLoadingRefs(false);
      }
    };
    load();
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!isOperationHead) return;
    const loadSupervisors = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/users/supervisors/"), {
          headers: getAuthHeaders(),
        });
        if (!response.ok) return;
        const data = await response.json();
        setSupervisorOptions(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      }
    };
    loadSupervisors();
  }, [getAuthHeaders, isOperationHead]);

  // 2. Handle URL Parameters (Editing or Creating from PO)
  useEffect(() => {
    if (!poIdParam || !purchaseOrders.length) return;
    const match = purchaseOrders.find((po) => po.id === Number(poIdParam));
    if (match) {
      setSelectedPurchaseOrder(match);
      setSelectedRfq(match.rfq_no || "");
    }
  }, [poIdParam, purchaseOrders]);

  useEffect(() => {
    if (!jobcardIdParam) return;
    const loadCard = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/jobcards/${jobcardIdParam}/`), { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSelectedJobcard(data);
          setSelectedRfq(data.rfq_no || "");
        }
      } catch {
        showToast("Unable to load jobcard.", "error");
      }
    };
    loadCard();
  }, [jobcardIdParam, getAuthHeaders]);

  // 3. Link Jobcard to PO
  useEffect(() => {
    if (!selectedJobcard || !purchaseOrders.length) return;
    const match = purchaseOrders.find(
      (po) => po.id === selectedJobcard.purchase_order || po.id === selectedJobcard.purchase_order_info?.id
    );
    if (match) {
      setSelectedPurchaseOrder(match);
      setSelectedRfq(match.rfq_no || "");
    }
  }, [selectedJobcard, purchaseOrders]);

  useEffect(() => {
    if (!rfqIdParam || !rfqList.length) return;
    const matchedRfq = rfqList.find((rfq) => String(rfq.id) === rfqIdParam);
    if (matchedRfq) {
      setSelectedRfq(matchedRfq.rfq_no || "");
    }
  }, [rfqIdParam, rfqList]);

  useEffect(() => {
    if (!rfqIdParam) return;
    const fetchServiceById = async () => {
      try {
        const headers = getAuthHeaders();
        const response = await fetch(buildApiUrl(`/api/sales-services/${rfqIdParam}/`), { headers });
        if (!response.ok) return;
        const data = await response.json();
        setServiceDetail(data);
        if (data?.rfq_no) {
          setSelectedRfq((prev) => prev || data.rfq_no);
        }
      } catch {
        // ignore; details will continue loading via rfq number
      }
    };
    fetchServiceById();
  }, [rfqIdParam, getAuthHeaders]);

  const activeRfqNo = useMemo(
    () => selectedRfq || selectedPurchaseOrder?.rfq_no || selectedJobcard?.rfq_no || "",
    [selectedRfq, selectedPurchaseOrder, selectedJobcard]
  );

  // 4. Fetch related details once RFQ is known
  useEffect(() => {
    if (!activeRfqNo) {
      setServiceDetail(null);
      setCostDetail(null);
      return;
    }

    const loadDetails = async () => {
      try {
        const headers = getAuthHeaders();
        const serviceId = serviceDetail?.id;
        const shouldFetchService =
          !rfqIdParam || serviceId === undefined || serviceId !== Number(rfqIdParam);
        if (shouldFetchService) {
          const svcRes = await fetch(buildApiUrl(`/api/sales-services/?rfq_no=${encodeURIComponent(activeRfqNo)}`), {
            headers,
          });
          const svcData = svcRes.ok ? await svcRes.json() : [];
          setServiceDetail(Array.isArray(svcData) ? svcData[0] || null : null);
        }
        const costRes = await fetch(buildApiUrl(`/api/cost-estimations/?rfq_no=${encodeURIComponent(activeRfqNo)}`), {
          headers,
        });
        const costData = costRes.ok ? await costRes.json() : [];
        setCostDetail(Array.isArray(costData) ? costData[0] || null : null);
      } catch {
        showToast("Unable to load RFQ details.", "error");
      }
    };

    loadDetails();
  }, [activeRfqNo, getAuthHeaders, rfqIdParam, serviceDetail?.id]);

  const selectedService = serviceDetail;
  const selectedCostEstimation = costDetail;
  const scopeRows = useMemo(() => {
    if (selectedService) {
      return [
        {
          scope:
            selectedService.service_category ||
            selectedService.project_title ||
            selectedService.service_name ||
            "Scope details",
          material: selectedService.fabric_specs || selectedService.size_breakdown || "",
          services:
            selectedService.scope_of_work ||
            selectedService.size_breakdown ||
            selectedService.fabric_specs ||
            selectedService.service_description ||
            "",
        },
      ];
    }

    if (selectedJobcard) {
      return [
        {
          scope: selectedJobcard.scope_type || selectedJobcard.job_type || selectedJobcard.rfq_type || "Saved scope",
          material: selectedJobcard.scope_description || "",
          services: selectedJobcard.scope_remarks || "",
        },
      ];
    }

    if (Array.isArray(selectedPurchaseOrder?.scope_rows) && selectedPurchaseOrder.scope_rows.length) {
      return selectedPurchaseOrder.scope_rows.map((row, index) => ({
        scope: row.name || row.scope_name || row.service_name || `Scope ${index + 1}`,
        material: row.specification || row.scope_specification || row.material || "",
        services: row.remarks || row.scope_remarks || row.scope_of_work || "",
      }));
    }

    return [];
  }, [selectedService, selectedJobcard, selectedPurchaseOrder]);

  // 5. Initialize Draft
  useEffect(() => {
    if (!selectedPurchaseOrder && !selectedJobcard && !selectedService) return;
    setJobcardDraft(
      buildJobcardDraft({
        purchaseOrder: selectedPurchaseOrder,
        service: selectedService,
        costEstimation: selectedCostEstimation,
        existingJobcard: selectedJobcard,
      })
    );
  }, [selectedPurchaseOrder, selectedJobcard, selectedService, selectedCostEstimation]);

  useEffect(() => {
    if (!selectedJobcard?.supervisor?.id) {
      setSelectedSupervisorId(null);
      return;
    }
    setSelectedSupervisorId(String(selectedJobcard.supervisor.id));
  }, [selectedJobcard]);

  useEffect(() => {
    if (!jobcardDraft) return;
    const supervisorValue = selectedSupervisorId ? Number(selectedSupervisorId) : null;
    setJobcardDraft((prev) =>
      prev ? { ...prev, supervisor_id: supervisorValue } : prev
    );
  }, [selectedSupervisorId]);

  useEffect(() => {
    if (!selectedRfq || !purchaseOrders.length) {
      return;
    }
    const match = purchaseOrders.find(
      (po) =>
        po.rfq_no === selectedRfq ||
        po.quotation_no === selectedRfq ||
        (!po.rfq_no && po.quotation_no && po.quotation_no === selectedRfq)
    );
    setSelectedPurchaseOrder(match || null);
  }, [selectedRfq, purchaseOrders]);

  // Actions
  const handleUpdate = async () => {
    if (!selectedJobcard || !jobcardDraft) return;
    setSavingJobcard(true);
    try {
      const res = await fetch(buildApiUrl(`/api/jobcards/${selectedJobcard.id}/`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(jobcardDraft),
      });
      if (res.ok) {
        showToast("Jobcard updated successfully.");
      } else {
        showToast("Update failed.", "error");
      }
    } catch {
      showToast("Update failed.", "error");
    } finally {
      setSavingJobcard(false);
    }
  };

  const handleSubmit = async () => {
    const category = jobcardDraft?.rfq_category || RFQ_CATEGORY_STANDARD;
    if (category === RFQ_CATEGORY_STANDARD && !jobcardDraft?.purchase_order_id) {
      showToast("Select a purchase order first.", "error");
      return;
    }
    setSavingJobcard(true);
    try {
      const res = await fetch(buildApiUrl("/api/jobcards/"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(jobcardDraft),
      });
      if (res.ok) {
        await res.json();
        showToast("Jobcard submitted successfully.");
      } else {
        showToast("Submission failed.", "error");
      }
    } catch {
      showToast("Submission failed.", "error");
    } finally {
      setSavingJobcard(false);
    }
  };

  const handleRfqChange = (event) => {
    setSelectedRfq(event.target.value);
  };

  /**
   * UI COMPONENTS
   */
  const InputField = ({ label, value, type = "text", readOnly = true, onChange = null }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value || ""}
        readOnly={readOnly}
        onChange={onChange}
        className={`w-full rounded-lg border border-slate-200 px-4 py-2 text-[14px] outline-none transition-all ${
          readOnly ? "bg-[#e2efff] text-slate-700" : "bg-white text-slate-900 focus:border-blue-400"
        }`}
      />
    </div>
  );

  return (
    <AppPageShell mainClassName="bg-[#f4f7fe]" contentClassName="mx-auto max-w-[1240px] p-8">
      {toast ? (
        <div
          className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-xl px-4 py-2 text-[13px] font-semibold shadow-2xl transition-all duration-200 ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      ) : null}
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        
        {/* Header */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[26px] font-bold text-slate-900">Create Job Card</h1>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
              type="button"
              onClick={() => router.push("/sales-services/jobcard/list")}
            >
              <List size={20} />
            </button>
          </div>
        
        </div>

        {/* Section 1: Job Card Details */}
        <div className="mb-10 rounded-2xl border border-slate-100 bg-slate-50/40 p-6">
          <h2 className="mb-5 text-[15px] font-bold text-slate-800">Job Card Details</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InputField label="Job card no" value={jobcardDraft?.jobcard_no} />
          <InputField
            label="Job card date"
            value={jobcardDraft?.jobcard_date}
            type="date"
            readOnly={false}
            onChange={(e) => setJobcardDraft((p) => ({ ...p, jobcard_date: e.target.value }))}
          />
          {isOperationHead ? (
            <div className="md:col-span-2">
              <label className="text-[12px] font-semibold text-slate-500">Supervisor</label>
              <select
                value={selectedSupervisorId || ""}
                onChange={(event) =>
                  setSelectedSupervisorId(event.target.value ? event.target.value : null)
                }
                className="h-[42px] w-full rounded-[12px] border border-slate-300 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-sky-400"
              >
                <option value="">Select Supervisor</option>
                {supervisorOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.full_name || option.username}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        </div>

        {/* Section 2: RFQ Details (Blue Box Style) */}
        <div className="mb-10 rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
          <h2 className="mb-5 text-[15px] font-bold text-slate-800">RFQ Details</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InputField label="RFQ no" value={jobcardDraft?.rfq_no} />
            <InputField label="RFQ type" value={jobcardDraft?.rfq_type} />
            <InputField label="RFQ category" value={jobcardDraft?.rfq_category} />
            <InputField label="Quotation no" value={jobcardDraft?.cost_estimation_no} />
          </div>
        </div>

        {/* Section 3: Client Details */}
        <div className="mb-10">
          <h2 className="mb-5 text-[15px] font-bold text-slate-800">Client Details</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InputField label="Company name" value={jobcardDraft?.company_name} />
            <InputField label="Attention name" value={jobcardDraft?.attention} />
          </div>
        </div>

        {/* Section 4: Scope Details Table */}
        <div className="mb-10">
          <h2 className="mb-5 text-[15px] font-bold text-slate-800">Scope Details</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-[#eef4ff] text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Scope details</th>
                  <th className="px-4 py-3 font-semibold">Material</th>
                  <th className="px-4 py-3 font-semibold">Services</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopeRows.length ? (
                  scopeRows.map((row, index) => (
                    <tr className="bg-white" key={`scope-row-${index}`}>
                      <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-4 font-medium text-slate-800">{row.scope || `Scope ${index + 1}`}</td>
                      <td className="px-4 py-4 text-slate-600">{row.material || "-"}</td>
                      <td className="px-4 py-4 text-slate-600">{row.services || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic">
                      No RFQ data loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-slate-500">Remarks</label>
            <textarea
              readOnly
              value={jobcardDraft?.scope_remarks}
              className="h-24 w-full rounded-xl border border-slate-200 bg-white p-4 text-[14px] text-slate-600 outline-none"
            />
          </div>
        </div>

        {/* Section 5: PO Information */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-6">
                <h2 className="mb-4 text-[14px] font-bold text-slate-800">Purchase Order No</h2>
                <InputField label="PO no" value={selectedPurchaseOrder?.po_no} />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-6">
                <h2 className="mb-4 text-[14px] font-bold text-slate-800">Purchase Order Date</h2>
                <InputField label="PO date" value={selectedPurchaseOrder?.po_date} />
            </div>
        </div>

        {/* Section 6: Delivery Details */}
        <div className="mb-10 rounded-2xl border border-slate-100 p-6">
          <h2 className="mb-5 text-[15px] font-bold text-slate-800">Delivery Details</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <InputField 
                label="Planning date" 
                value={jobcardDraft?.planning_date} 
                type="date" 
                readOnly={false} 
                onChange={(e) => setJobcardDraft(p => ({...p, planning_date: e.target.value}))}
            />
            <InputField 
                label="Expected Delivery date" 
                value={jobcardDraft?.expected_delivery_date} 
                type="date" 
                readOnly={false} 
                onChange={(e) => setJobcardDraft(p => ({...p, expected_delivery_date: e.target.value}))}
            />
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <label className="text-[12px] font-semibold text-slate-500">Remark</label>
            <textarea
              placeholder="Enter delivery remarks..."
              value={jobcardDraft?.remarks}
              onChange={(e) => setJobcardDraft(p => ({...p, remarks: e.target.value}))}
              className="h-28 w-full rounded-xl border border-slate-200 bg-white p-4 text-[14px] text-slate-900 outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-4 border-t border-slate-100 pt-8">
          <button
            onClick={isEditingMode ? handleUpdate : handleSubmit}
            disabled={savingJobcard}
            className="rounded-xl bg-[#10b981] px-10 py-3 text-[14px] font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
          >
            {savingJobcard ? "Processing..." : isEditingMode ? "Update" : "Submit"}
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-xl bg-[#ff9f43] px-10 py-3 text-[14px] font-bold text-white shadow-lg shadow-orange-100 transition-all hover:bg-orange-500 active:scale-95"
          >
            Cancel
          </button>
        </div>

      </div>
    </AppPageShell>
  );
}
