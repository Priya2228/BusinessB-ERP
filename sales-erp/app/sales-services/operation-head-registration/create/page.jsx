"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { List, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";

const PLAN_RFQ_TYPES = ["Workshop", "Spare", "Onsite"];
const RFQ_CATEGORIES = ["Standard", "Quote of Assessment", "Quote of Completion"];

const getToday = () => new Date().toISOString().split("T")[0];
const DEFAULT_SUPERVISOR_ID = 10;

const createInitialForm = () => ({
  operationNo: `OP-${Date.now().toString().slice(-6)}`,
  operationDate: getToday(),
  rfqNo: "",
  rfqDate: "",
  rfqType: "",
  rfqCategory: "",
  costEstimationNo: "",
  costEstimationDate: "",
  clientName: "",
  attentionName: "",
  poNo: "",
  poDate: "",
  jobcardNo: "",
  jobcardDate: "",
  planStartDate: "",
  targetCompletionDate: "",
  poDeliveryDate: "",
  expectedDeliveryDate: "",
  shopfloorInchargeId: DEFAULT_SUPERVISOR_ID,
  remarks: "",
});

const inputClassName =
  "h-[42px] w-full rounded-[12px] border border-slate-300 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-sky-400";
const labelClassName = "mb-2 block text-[12px] font-semibold text-slate-800";

function FormField({ label, name, value, onChange, type = "text", readOnly = false, disabled = false }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        readOnly={readOnly}
        disabled={disabled}
        className={`${inputClassName} ${readOnly || disabled ? "bg-[#f1f5f9] border-slate-200 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

function SelectField({ label, name, value, onChange, options = [], disabled = false, placeholder = "Select" }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${inputClassName} appearance-none ${disabled ? "bg-[#f1f5f9] border-slate-200 cursor-not-allowed" : ""}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          }
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function TextAreaField({ label, name, value, onChange }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        className="w-full rounded-[12px] border border-slate-300 bg-white p-3 text-[13px] text-slate-800 outline-none transition focus:border-sky-400"
      />
    </div>
  );
}

const SHOPFLOOR_OPTIONS = [{ label: "Supervisor", value: DEFAULT_SUPERVISOR_ID }];

function SectionCard({ title, children }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-[#fbfdff] p-5 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-gray-700 hover:shadow-[0_10px_24px_rgba(14,116,144,0.12)]">
      <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default function OperationHeadRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationId = searchParams.get("id");
  const rfqNoParam = searchParams.get("rfqNo");
  const jobcardIdParam = searchParams.get("jobcardId");
  const [formData, setFormData] = useState(createInitialForm);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rfqRows, setRfqRows] = useState([]);
  const [costEstimations, setCostEstimations] = useState([]);
  const [jobcards, setJobcards] = useState([]);
  const [selectedJobcardId, setSelectedJobcardId] = useState(null);

  const isEditMode = Boolean(registrationId);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  const applyRfqData = useCallback(
    (rfqNo, { rfqDataset, jobcardDataset, costDataset } = {}) => {
      if (!rfqNo) {
        setSelectedJobcardId(null);
        setFormData((prev) => ({ ...prev, rfqNo: "", clientName: "", attentionName: "" }));
        return;
      }
      const serviceSource = rfqDataset || rfqRows;
      const costSource = costDataset || costEstimations;
      const jobcardSource = jobcardDataset || jobcards;
      const serviceData = serviceSource.find((row) => row.rfq_no === rfqNo);
      const costData = costSource.find((row) => row.rfq_no === rfqNo);
      const jobcardData =
        jobcardSource.find((record) => record.rfq_no === rfqNo) ||
        jobcardSource.find((record) => record.purchase_order_info?.rfq_no === rfqNo);
      const poInfo = jobcardData?.purchase_order_info || {};
      const category = (
        serviceData?.rfq_category ||
        jobcardData?.rfq_category ||
        ""
      ).trim();
      const loadPoCost = category === "Standard";
      setSelectedJobcardId(jobcardData?.id || null);
      setFormData((prev) => ({
        ...prev,
        rfqNo,
        rfqDate: serviceData?.registered_date || prev.rfqDate,
        rfqCategory: category || prev.rfqCategory,
        rfqType:
          serviceData?.plan_rfq_type ||
          serviceData?.rfq_type ||
          jobcardData?.rfq_type ||
          prev.rfqType,
        costEstimationNo: loadPoCost
          ? jobcardData?.cost_estimation_no || costData?.estimation_no || prev.costEstimationNo
          : "",
        costEstimationDate: loadPoCost ? costData?.registered_date || prev.costEstimationDate : "",
        clientName: jobcardData?.company_name || serviceData?.company_name || prev.clientName,
        attentionName: jobcardData?.attention || serviceData?.client_name || prev.attentionName,
        poNo: loadPoCost ? poInfo?.po_no || prev.poNo : "",
        poDate: loadPoCost ? poInfo?.po_date || prev.poDate : "",
        jobcardNo: jobcardData?.jobcard_no || prev.jobcardNo,
        jobcardDate: jobcardData?.jobcard_date || prev.jobcardDate,
        planStartDate:
          serviceData?.plan_start_date || jobcardData?.planning_date || prev.planStartDate,
        targetCompletionDate:
          serviceData?.plan_end_date || jobcardData?.expected_delivery_date || prev.targetCompletionDate,
        poDeliveryDate: loadPoCost ? poInfo?.expected_delivery_date || prev.poDeliveryDate : "",
        expectedDeliveryDate:
          loadPoCost
            ? jobcardData?.expected_delivery_date || poInfo?.expected_delivery_date || prev.expectedDeliveryDate
            : jobcardData?.expected_delivery_date || "",
      }));
    },
    [rfqRows, jobcards, costEstimations]
  );

  const loadRegistrationRecord = useCallback(
    async (id) => {
      try {
        const response = await fetch(buildApiUrl(`/api/operation-head-registrations/${id}/`), {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error("Unable to load registration.");
        }
        const data = await response.json();
        setSelectedJobcardId(data.jobcard?.id || null);
        setFormData({
          operationNo: data.operation_no || createInitialForm().operationNo,
          operationDate: data.operation_date || getToday(),
          rfqNo: data.rfq_no || "",
          rfqDate: data.rfq_date || "",
          rfqType: data.rfq_type || "",
          rfqCategory: data.rfq_category || "",
          costEstimationNo: data.cost_estimation_no || "",
          costEstimationDate: data.cost_estimation_date || "",
          clientName: data.client_name || "",
          attentionName: data.attention_name || "",
          poNo: data.po_no || "",
          poDate: data.po_date || "",
          jobcardNo: data.jobcard_no || "",
          jobcardDate: data.jobcard_date || "",
          planStartDate: data.plan_start_date || "",
          targetCompletionDate: data.target_completion_date || "",
          poDeliveryDate: data.po_delivery_date || "",
          expectedDeliveryDate: data.expected_delivery_date || "",
          shopfloorInchargeId: data.shopfloor_incharge?.id || DEFAULT_SUPERVISOR_ID,
          remarks: data.remarks || "",
        });
      } catch (error) {
        showToast(error?.message || "Failed to load registration.", "error");
      }
    },
    [getAuthHeaders, showToast]
  );
  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [rfqResponse, costResponse, jobcardResponse] = await Promise.all([
          fetch(buildApiUrl("/api/sales-services/"), { headers: getAuthHeaders() }),
          fetch(buildApiUrl("/api/cost-estimations/"), { headers: getAuthHeaders() }),
          fetch(buildApiUrl("/api/jobcards/"), { headers: getAuthHeaders() }),
        ]);

        const rfqData = rfqResponse.ok ? await rfqResponse.json() : [];
        const costData = costResponse.ok ? await costResponse.json() : [];
        const jobcardData = jobcardResponse.ok ? await jobcardResponse.json() : [];

        setRfqRows(Array.isArray(rfqData) ? rfqData : []);
        setCostEstimations(Array.isArray(costData) ? costData : []);
        setJobcards(Array.isArray(jobcardData) ? jobcardData : []);

        if (!registrationId) {
          const jobcardRecord =
            jobcardIdParam && Array.isArray(jobcardData)
              ? jobcardData.find((record) => String(record.id) === jobcardIdParam) || null
              : null;
          const targetRfq =
            rfqNoParam || jobcardRecord?.rfq_no || jobcardRecord?.purchase_order_info?.rfq_no || "";
          if (targetRfq) {
            applyRfqData(targetRfq, {
              rfqDataset: rfqData,
              jobcardDataset: jobcardData,
              costDataset: costData,
            });
          }
        }

        if (registrationId) {
          await loadRegistrationRecord(registrationId);
        }
      } catch {
        showToast("Failed to load operation head options.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [getAuthHeaders, loadRegistrationRecord, registrationId, showToast]);

  useEffect(() => {
    if (registrationId) return;
    let jobcardRecord = null;
    if (jobcardIdParam) {
      jobcardRecord = jobcards.find((record) => String(record.id) === jobcardIdParam) || null;
    }
    const targetRfq =
      rfqNoParam || jobcardRecord?.rfq_no || jobcardRecord?.purchase_order_info?.rfq_no || "";
    if (targetRfq) {
      applyRfqData(targetRfq);
    }
  }, [registrationId, rfqNoParam, jobcardIdParam, rfqRows, jobcards, costEstimations, applyRfqData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRfqChange = (event) => {
    const nextValue = event.target.value;
    applyRfqData(nextValue);
  };

  const disableDeliveryFields = useMemo(() => {
    const category = (formData.rfqCategory || "").trim();
    return category === "Quote of Assessment" || category === "Quote of Completion";
  }, [formData.rfqCategory]);

  const payloadForSubmit = () => ({
    operation_no: formData.operationNo,
    operation_date: formData.operationDate,
    rfq_no: formData.rfqNo,
    rfq_date: formData.rfqDate,
    rfq_category: formData.rfqCategory,
    rfq_type: formData.rfqType,
    cost_estimation_no: formData.costEstimationNo,
    cost_estimation_date: formData.costEstimationDate,
    client_name: formData.clientName,
    attention_name: formData.attentionName,
    po_no: formData.poNo,
    po_date: formData.poDate,
    jobcard_no: formData.jobcardNo,
    jobcard_date: formData.jobcardDate,
    plan_start_date: formData.planStartDate,
    target_completion_date: formData.targetCompletionDate,
    po_delivery_date: formData.poDeliveryDate,
    expected_delivery_date: formData.expectedDeliveryDate,
    shopfloor_incharge_id: (() => {
      const parsed = Number(formData.shopfloorInchargeId);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    })(),
    remarks: formData.remarks,
    jobcard_id: selectedJobcardId,
  });

  const handleSubmit = async () => {
    const endpoint = registrationId
      ? buildApiUrl(`/api/operation-head-registrations/${registrationId}/`)
      : buildApiUrl("/api/operation-head-registrations/");
    const method = registrationId ? "PUT" : "POST";
    setIsSaving(true);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payloadForSubmit()),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const firstError = errorData ? Object.values(errorData)[0] : null;
        throw new Error(firstError || "Failed to save registration.");
      }
      showToast(
        registrationId ? "Operation head registration updated." : "Op head registration created."
      );
      if (!registrationId) {
        setFormData(createInitialForm());
        setSelectedJobcardId(null);
      }
    } catch (error) {
      showToast(error?.message || "Operation failed.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
      {toast ? (
        <div
          className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-xl px-4 py-2 text-[13px] font-semibold shadow-2xl transition duration-200 ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-slate-300 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] transition-all duration-200 hover:border-gray-700 hover:shadow-[0_12px_28px_rgba(14,116,144,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold text-slate-900">Operation Head Registration</h1>
            
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-services/operation-head-registration/list")}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300"
            title="View registrations"
          >
            <List size={18} />
          </button>
        </div>

        {loading ? (
          <div className="mt-6 text-[13px] text-slate-500">Loading reference data...</div>
        ) : null}

        <div className="mt-6 space-y-6">
          <SectionCard title="Operation Details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Operation No"
                name="operationNo"
                value={formData.operationNo}
                onChange={handleChange}
              />
              <FormField
                label="Operation Date"
                name="operationDate"
                type="date"
                value={formData.operationDate}
                onChange={handleChange}
              />
            </div>
          </SectionCard>

          <SectionCard title="RFQ Details">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="RFQ No"
                name="rfqNo"
                value={formData.rfqNo}
                onChange={handleRfqChange}
                options={(rfqRows || []).map((row) => ({
                  label: row.rfq_no,
                  value: row.rfq_no,
                }))}
                placeholder="Select RFQ"
              />
              <FormField
                label="RFQ Date"
                name="rfqDate"
                type="date"
                value={formData.rfqDate}
                onChange={handleChange}
              />
              <SelectField
                label="RFQ Type"
                name="rfqType"
                value={formData.rfqType}
                onChange={handleChange}
                options={PLAN_RFQ_TYPES}
              />
              <SelectField
                label="RFQ Category"
                name="rfqCategory"
                value={formData.rfqCategory}
                onChange={handleChange}
                options={RFQ_CATEGORIES}
              />
              <FormField
                label="Cost Estimation No"
                name="costEstimationNo"
                value={formData.costEstimationNo}
                onChange={handleChange}
              />
              <FormField
                label="Cost Estimation Date"
                name="costEstimationDate"
                type="date"
                value={formData.costEstimationDate}
                onChange={handleChange}
              />
            </div>
          </SectionCard>

          <SectionCard title="Client Details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Client Name"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
              />
              <FormField
                label="Attention Name"
                name="attentionName"
                value={formData.attentionName}
                onChange={handleChange}
              />
            </div>
          </SectionCard>

          <SectionCard title="PO Details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="P.O. No" name="poNo" value={formData.poNo} onChange={handleChange} />
              <FormField
                label="P.O. Date"
                name="poDate"
                type="date"
                value={formData.poDate}
                onChange={handleChange}
              />
            </div>
          </SectionCard>

          <SectionCard title="Jobcard Details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Jobcard No"
                name="jobcardNo"
                value={formData.jobcardNo}
                onChange={handleChange}
              />
              <FormField
                label="Jobcard Date"
                name="jobcardDate"
                type="date"
                value={formData.jobcardDate}
                onChange={handleChange}
              />
            </div>
          </SectionCard>

          <SectionCard title="Planning Details">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                label="Plan Start Date"
                name="planStartDate"
                type="date"
                value={formData.planStartDate}
                onChange={handleChange}
              />
              <FormField
                label="Target Completion Date"
                name="targetCompletionDate"
                type="date"
                value={formData.targetCompletionDate}
                onChange={handleChange}
              />
              <FormField
                label="P.O. Delivery Date"
                name="poDeliveryDate"
                type="date"
                value={formData.poDeliveryDate}
                onChange={handleChange}
                disabled={disableDeliveryFields}
              />
              <FormField
                label="Expected Delivery Date"
                name="expectedDeliveryDate"
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={handleChange}
                disabled={disableDeliveryFields}
              />
              <div>
                <label className={labelClassName}>RFQ Type</label>
                <input
                  className={`${inputClassName} bg-[#f1f5f9] border-slate-200 cursor-not-allowed`}
                  value={formData.rfqType || "-"}
                  readOnly
                />
              </div>
            
              <SelectField
                label="Shopfloor Incharge"
                name="shopfloorInchargeId"
                value={formData.shopfloorInchargeId}
                onChange={handleChange}
                options={SHOPFLOOR_OPTIONS}
                placeholder="Select supervisor"
              />
            </div>
            <div className="mt-3">
              
              <TextAreaField
                label="Remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
              />
            </div>
          </SectionCard>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || loading}
            className="rounded-[10px] bg-[#34b556] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(52,181,86,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : isEditMode ? "UPDATE" : "SUBMIT"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/sales-services/operation-head-registration/list")}
            className="rounded-[10px] bg-[#ff9533] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(255,149,51,0.25)]"
          >
            CANCEL
          </button>
        </div>
      </div>
    </AppPageShell>
  );
}
