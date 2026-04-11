"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { List, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";

const SECTION_DEFINITIONS = [
  {
    key: "inspection",
    title: "Inspection",
    fields: [
      { name: "inspection_start_date", label: "Start Date", type: "date" },
      { name: "inspection_end_date", label: "End Date", type: "date" },
      { name: "inspection_done_by", label: "Done By", type: "text" },
      { name: "inspection_validated_by", label: "Validated By", type: "text" },
    ],
    textAreas: [
      { name: "incoming_inspection_checklist", label: "Incoming Inspection Checklist" },
      { name: "inspection_remarks", label: "Remarks" },
    ],
    fileFields: [
      { name: "inspection_report", label: "Inspection Report" },
      { name: "inspection_additional_file", label: "Upload Additional Files" },
    ],
  },
  {
    key: "disassembly",
    title: "Disassembly",
    fields: [
      { name: "disassembly_start_date", label: "Start Date", type: "date" },
      { name: "disassembly_end_date", label: "End Date", type: "date" },
      { name: "disassembly_done_by", label: "Done By", type: "text" },
      { name: "disassembly_validated_by", label: "Validated By", type: "text" },
    ],
    textAreas: [],
    fileFields: [],
  },
  {
    key: "assessment",
    title: "Assessment",
    fields: [
      { name: "assessment_start_date", label: "Start Date", type: "date" },
      { name: "assessment_end_date", label: "End Date", type: "date" },
      { name: "assessment_done_by", label: "Done By", type: "text" },
      { name: "assessment_validated_by_qc", label: "Validated by QC", type: "text" },
      { name: "assessment_validated_by_hod", label: "Validated by HOD", type: "text" },
      { name: "assessment_approved_by_hod", label: "Approved by HOD", type: "text" },
    ],
    textAreas: [
      { name: "assessment_spare_repair_recommended", label: "Spare/Repair Recommended" },
      { name: "assessment_remarks", label: "Remarks" },
    ],
    fileFields: [{ name: "assessment_opening_report", label: "Opening Report" }],
  },
  {
    key: "spare_repair",
    title: "Spare & Repair",
    fields: [
      { name: "spare_repair_start_date", label: "Start Date", type: "date" },
      { name: "spare_repair_end_date", label: "End Date", type: "date" },
      { name: "spare_repair_done_by", label: "Done By", type: "text" },
      { name: "spare_repair_validated_by_qc", label: "Validated by QC", type: "text" },
    ],
    textAreas: [{ name: "spare_repair_remarks", label: "Remarks" }],
    fileFields: [],
  },
  {
    key: "assembly",
    title: "Assembly",
    fields: [
      { name: "assembly_start_date", label: "Start Date", type: "date" },
      { name: "assembly_end_date", label: "End Date", type: "date" },
      { name: "assembly_done_by", label: "Done By", type: "text" },
      { name: "assembly_validated_by_qc", label: "Validated by QC", type: "text" },
      { name: "assembly_validated_by_hod", label: "Validated by HOD", type: "text" },
      { name: "assembly_approved_by_hod", label: "Approved by HOD", type: "text" },
    ],
    textAreas: [{ name: "assembly_remarks", label: "Remarks" }],
    fileFields: [
      { name: "assembly_testing_report", label: "Testing Report" },
      { name: "assembly_job_completion_report", label: "Job Completion Report" },
      { name: "assembly_final_report", label: "Final Report" },
      { name: "assembly_shipping_checklist", label: "Shipping Checklist" },
    ],
  },
];

const GENERAL_REPORT_FIELDS = [
  { name: "opening_report", label: "Opening Report" },
  { name: "testing_report", label: "Testing Report" },
  { name: "job_completion_report", label: "Job Completion Report" },
];

const REQUEST_TYPES = [
  { key: "internal_service", title: "Internal Service Request" },
  { key: "pr_request", title: "PR Request" },
  { key: "material_request", title: "Material Request" },
  { key: "transport_request", title: "Transport Request" },
];

const CARD_COMMON_CLASSES =
  "flex min-h-[110px] w-full flex-col items-center justify-center gap-2 rounded-[14px] border px-4 py-3 text-center shadow-sm transition";
const REQUEST_TITLE_CLASSES = "text-[12px] font-semibold uppercase tracking-[0.3em]";

const formatDateValue = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const formatTimelineValue = (value) => {
  if (!value) return "Pending";
  return formatDateValue(value);
};

const normalizeInputValue = (value) => (value === "" ? null : value);

const HIDDEN_USER_FIELDS = [
  "inspection_done_by",
  "inspection_validated_by",
  "disassembly_done_by",
  "disassembly_validated_by",
  "assessment_done_by",
  "assessment_validated_by_qc",
  "assessment_validated_by_hod",
  "assessment_approved_by_hod",
  "spare_repair_done_by",
  "spare_repair_validated_by_qc",
  "assembly_done_by",
  "assembly_validated_by_qc",
  "assembly_validated_by_hod",
  "assembly_approved_by_hod",
];

const ACTIVITY_BUTTON_TITLES = {
  inspection: "Inspection",
  disassembly: "Disassembly",
  assessment: "Assessment",
  assembly: "QC Check",
};

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("token");
  return token ? { Authorization: `Token ${token}` } : {};
};

export default function ShopfloorProcessFlowDetail({ params }) {
  const resolvedParams = React.use(params);
  const jobcardId = resolvedParams?.jobcardId;
  const router = useRouter();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formState, setFormState] = useState({});
  const [fileState, setFileState] = useState({});
  const [displayOverrides, setDisplayOverrides] = useState({});
  const [sectionSaving, setSectionSaving] = useState({});
  const [completionLoading, setCompletionLoading] = useState(false);
  const [activityForm, setActivityForm] = useState({
    internal_service: "",
    pr_request: "",
    material_request: "",
    transport_request: "",
  });
  const [activityRequests, setActivityRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");

  const getFormFieldValue = (name) => {
    const rawValue = formState[name];
    if (rawValue === undefined) return undefined;
    return normalizeInputValue(rawValue);
  };

  const buildFileInputId = (context, name) => `file-${context}-${name}`;

  const getDisplayedFileName = (name) => {
    if (fileState[name]?.name) return fileState[name].name;
    return "";
  };

  const getInputValue = (name) => {
    if (displayOverrides[name] !== undefined) {
      return displayOverrides[name];
    }
    if (HIDDEN_USER_FIELDS.includes(name)) {
      return "";
    }
    return formState[name] || "";
  };

  const renderFilePicker = (field, context) => {
    const inputId = buildFileInputId(context, field.name);
    const displayedName = getDisplayedFileName(field.name);
    return (
      <div key={field.name} className="text-[13px] text-slate-700">
        <span className="text-[12px] font-semibold text-slate-500">{field.label}</span>
        <input
          id={inputId}
          type="file"
          className="hidden"
          onChange={(event) => handleFileChange(field.name, event.target.files?.[0])}
        />
        <label
          htmlFor={inputId}
          className="mt-2 inline-flex w-full items-center justify-center rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Choose File
        </label>
        {displayedName ? (
          <p className="mt-1 text-[11px] text-slate-500">{displayedName}</p>
        ) : null}
      </div>
    );
  };

  const gatherDraftPayload = () => {
    const payload = {};
    SECTION_DEFINITIONS.forEach((section) => {
      section.fields.forEach(({ name }) => {
        const value = getFormFieldValue(name);
        if (value !== undefined) {
          payload[name] = value;
        }
      });
      section.textAreas?.forEach(({ name }) => {
        const value = getFormFieldValue(name);
        if (value !== undefined) {
          payload[name] = value;
        }
      });
    });
    const notifyNoteValue = getFormFieldValue("notify_note");
    if (notifyNoteValue !== undefined) {
      payload.notify_note = notifyNoteValue;
    }
    GENERAL_REPORT_FIELDS.forEach((field) => {
      const value = getFormFieldValue(field.name);
      if (value !== undefined) {
        payload[field.name] = value;
      }
    });
    return payload;
  };

  const gatherFilePayload = () => {
    const payload = {};
    Object.entries(fileState).forEach(([key, file]) => {
      if (file) {
        payload[key] = file;
      }
    });
    return payload;
  };

  const loadExecution = useCallback(async () => {
    if (!jobcardId) {
      setError("Jobcard ID is missing.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(buildApiUrl(`/api/shopfloor/${jobcardId}/`), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to load shopfloor execution.");
      }
      const data = await response.json();
      setExecution(data);
      setFormState((prev) => ({ ...prev, ...data }));
      setDisplayOverrides({});
    } catch (err) {
      setError(err?.message || "Unable to load execution.");
    } finally {
      setLoading(false);
    }
  }, [jobcardId]);

  const loadActivityRequests = useCallback(async () => {
    if (!execution?.id) return;
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const response = await fetch(
        buildApiUrl(`/api/shopfloor-requests/?execution=${execution.id}`),
        { headers: getAuthHeaders() }
      );
      if (!response.ok) {
        throw new Error("Unable to load activity requests.");
      }
      const data = await response.json();
      setActivityRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setRequestsError(err?.message || "Unable to load activity requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, [execution]);

  useEffect(() => {
    loadExecution();
  }, [loadExecution]);

  useEffect(() => {
    if (execution?.id) {
      loadActivityRequests();
    }
  }, [execution, loadActivityRequests]);

  const handleInputChange = (name, value) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (HIDDEN_USER_FIELDS.includes(name)) {
      setDisplayOverrides((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (name, file) => {
    setFileState((prev) => ({ ...prev, [name]: file }));
  };

  const patchExecution = async (payload, files = {}) => {
    const hasFiles = Object.values(files).some(Boolean);
    const headers = { ...getAuthHeaders() };
    const options = { method: "PATCH", headers };
    if (hasFiles) {
      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      Object.entries(files).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });
      options.body = formData;
      delete options.headers["Content-Type"];
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }
    const response = await fetch(buildApiUrl(`/api/shopfloor/${jobcardId}/`), options);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Unable to save data.");
    }
    return response.json();
  };

  const persistDraftData = async () => {
    const payload = gatherDraftPayload();
    const files = gatherFilePayload();
    const updated = await patchExecution(payload, files);
    setExecution(updated);
    setFormState((prev) => ({ ...prev, ...updated }));
    return updated;
  };

  const saveSection = async (sectionKey) => {
    const section = SECTION_DEFINITIONS.find((item) => item.key === sectionKey);
    if (!section) return;
    setSectionSaving((prev) => ({ ...prev, [sectionKey]: true }));
    try {
        const payload = {};
        section.fields.forEach((field) => {
          const value = getFormFieldValue(field.name);
          if (value === undefined) {
            return;
          }
          payload[field.name] = value;
        });
      const files = {};
      if (section.fileFields?.length) {
        section.fileFields.forEach((fileField) => {
          if (fileState[fileField.name]) {
            files[fileField.name] = fileState[fileField.name];
          }
        });
      }
      const updated = await patchExecution(payload, files);
      setExecution(updated);
      setFormState((prev) => ({ ...prev, ...updated }));
      toast.success(`${section.title} saved.`);
    } catch (err) {
      toast.error(err?.message || "Unable to save section.");
    } finally {
      setSectionSaving((prev) => ({ ...prev, [sectionKey]: false }));
    }
  };

  const saveGeneralReports = async () => {
    setSectionSaving((prev) => ({ ...prev, general: true }));
    try {
      const payload = {};
      GENERAL_REPORT_FIELDS.forEach((field) => {
        const value = getFormFieldValue(field.name);
        if (value !== undefined) {
          payload[field.name] = value;
        }
      });
      const files = {};
      GENERAL_REPORT_FIELDS.forEach((field) => {
        if (fileState[field.name]) {
          files[field.name] = fileState[field.name];
        }
      });
      const updated = await patchExecution(payload, files);
      setExecution(updated);
      setFormState((prev) => ({ ...prev, ...updated }));
      toast.success("Reports saved.");
    } catch (err) {
      toast.error(err?.message || "Unable to save reports.");
    } finally {
      setSectionSaving((prev) => ({ ...prev, general: false }));
    }
  };

const [missingFields, setMissingFields] = useState([]);

  const handleSaveCompletion = async () => {
    if (!jobcardId) return;
    
    setCompletionLoading(true);
    setMissingFields([]); // Reset errors before trying
    
    try {
      // 1. Ensure latest local state is saved to the draft first 
      // (Assuming persistDraftData() handles the PATCH logic internally)
      await handleSaveDraft(); 

      // 2. Attempt to finalize
      const response = await fetch(buildApiUrl(`/api/shopfloor/${jobcardId}/complete/`), {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // 3. Specific handling for the 400 response containing missing fields
        if (data?.missing_fields) {
          setMissingFields(data.missing_fields);
          const list = data.missing_fields.map(f => f.replace(/_/g, ' ')).join(", ");
          throw new Error(`Incomplete: Please fill ${list}`);
        }
        
        throw new Error(data?.detail || "Unable to finalize execution.");
      }

      // 4. Success state
      setExecution(data);
      setFormState((prev) => ({ ...prev, ...data }));
      toast.success("Execution marked as complete");
      
    } catch (err) {
      toast.error(err.message, { duration: 5000 });
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setSectionSaving((prev) => ({ ...prev, globalDraft: true }));
    try {
      await persistDraftData();
      toast.success("Draft saved.");
    } catch (err) {
      toast.error(err?.message || "Unable to save draft.");
    } finally {
      setSectionSaving((prev) => ({ ...prev, globalDraft: false }));
    }
  };

  const createActivityRequest = async (type) => {
    if (!execution?.id) return;
    const notes = activityForm[type]?.trim();
    if (!notes) {
      toast.error("Add some context before saving the request.");
      return;
    }
    try {
      const response = await fetch(buildApiUrl("/api/shopfloor-requests/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          request_type: type,
          notes,
          shopfloor_execution_id: execution.id,
        }),
      });
      if (!response.ok) {
        throw new Error("Unable to save request.");
      }
      setActivityForm((prev) => ({ ...prev, [type]: "" }));
      await loadActivityRequests();
      toast.success("Request saved.");
    } catch (err) {
      toast.error(err?.message || "Unable to save request.");
    }
  };

  const deleteActivityRequest = async (requestId) => {
    if (!requestId) return;
    try {
      const response = await fetch(buildApiUrl(`/api/shopfloor-requests/${requestId}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to remove request.");
      }
      setActivityRequests((prev) => prev.filter((req) => req.id !== requestId));
      toast.success("Request deleted.");
    } catch (err) {
      toast.error(err?.message || "Unable to delete request.");
    }
  };

  const activityFlow = useMemo(() => {
    return SECTION_DEFINITIONS.map((section) => {
      const startValue = formState[`${section.key}_start_date`];
      const endValue = formState[`${section.key}_end_date`];
      const hasProgress =
        Boolean(startValue) ||
        Boolean(endValue) ||
        Boolean(formState[`${section.key}_done_by`]);
      return {
        key: section.key,
        title: section.title,
        startLabel: formatTimelineValue(startValue),
        endLabel: formatTimelineValue(endValue),
        hasProgress,
      };
    });
  }, [formState]);

  const activityButtons = useMemo(() => {
    return SECTION_DEFINITIONS.map((section) => {
      const flowItem = activityFlow.find((item) => item.key === section.key);
      return {
        key: section.key,
        title: ACTIVITY_BUTTON_TITLES[section.key] || section.title,
        hasProgress: flowItem?.hasProgress,
      };
    });
  }, [activityFlow]);
  
  const jobcardInfo = execution?.jobcard_info || {};
  const detailSections = useMemo(() => {
    const poInfo =
      jobcardInfo.purchase_order ||
      jobcardInfo.purchase_order_info ||
      (jobcardInfo.purchaseOrder ?? {}) ||
      {};
    return [
      {
        title: "RFQ Details",
        items: [
          { label: "RFQ No", value: jobcardInfo.rfq_no },
          { label: "RFQ Date", value: formatDateValue(jobcardInfo.rfq_date) },
          { label: "RFQ Type", value: jobcardInfo.rfq_type },
          { label: "RFQ Category", value: jobcardInfo.rfq_category },
        ],
      },
      {
        title: "Client Details",
        items: [
          
          { label: "Company", value: jobcardInfo.company_name },
          { label: "Attention", value: jobcardInfo.attention },
        ],
      },
      {
        title: "Purchase Order",
        items: [
          { label: "P.O. No", value: poInfo.po_no },
          { label: "P.O. Date", value: formatDateValue(poInfo.po_date) },
        ],
      },
      {
        title: "Jobcard Details",
        items: [
          { label: "Jobcard No", value: jobcardInfo.jobcard_no },
          { label: "Jobcard Date", value: formatDateValue(jobcardInfo.jobcard_date) },
          { label: "Status", value: jobcardInfo.jobcard_status },
        ],
      },
      {
        title: "Scope Details",
        items: [
          { label: "Scope Type", value: jobcardInfo.scope_type },
          { label: "Scope Description", value: jobcardInfo.scope_description },
          { label: "Scope Remarks", value: jobcardInfo.scope_remarks },
        ],
      },
    ];
  }, [jobcardInfo]);

  if (loading && !execution?.id) {
    return (
      <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
        <p className="text-[13px] text-slate-500">Loading shopfloor flow...</p>
      </AppPageShell>
    );
  }


  const isDraftSaving = Boolean(sectionSaving.globalDraft);

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
      <Toaster position="top-right" />
      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[22px] font-bold text-slate-900">Shopfloor Process Flow</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/sales-services/shopfloorprocessflow")}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                <List size={18} />
                <span className="sr-only">View all executions</span>
              </button>
              
            </div>
          </div>
          <div className="space-y-4">
            {detailSections.map((section) => (
              <section
                key={section.title}
                className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
              >
                <h3 className="text-[16px] font-semibold text-slate-900">{section.title}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <span className="text-[12px] font-semibold text-slate-500">{item.label}</span>
                      <div className="rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-900 shadow-inner">
                        {item.value || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </header>

        <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-[16px] font-semibold text-slate-900">Activity Details</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {activityButtons.map((button) => (
              <button
                key={button.key}
                type="button"
                className={`rounded-[15px] border border-slate-200 bg-gradient-to-b from-[#f8fafc] to-white px-4 py-3 text-[14px] font-semibold text-slate-700 transition hover:border-slate-300 ${
                  button.hasProgress ? "ring-2 ring-emerald-200" : ""
                }`}
              >
                {button.title}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-[16px] font-semibold text-slate-900">Activity Request</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {REQUEST_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                className="rounded-[15px] border border-slate-200 bg-gradient-to-b from-[#f8fafc] to-white px-4 py-3 text-[14px] font-semibold text-slate-700 transition hover:border-slate-300"
              >
                {type.title}
              </button>
            ))}
          </div>
        </section>


        {SECTION_DEFINITIONS.map((section) => (
          <section key={section.key} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-slate-900">{section.title}</h3>
              <button
                type="button"
                onClick={() => saveSection(section.key)}
                disabled={sectionSaving[section.key]}
                title={`Save ${section.title}`}
                className="flex items-center justify-center rounded-[12px] border border-emerald-200 bg-white px-3 py-1 text-[12px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400"
              >
                {sectionSaving[section.key] ? (
                  "Saving..."
                ) : (
                  <>
                    <Save size={16} />
                    <span className="sr-only">Save {section.title}</span>
                  </>
                )}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field.name} className="text-[13px] text-slate-700">
                  <span className="text-[12px] font-semibold text-slate-500">{field.label}</span>
                  <input
                    type={field.type}
                    value={getInputValue(field.name)}
                    onChange={(event) => handleInputChange(field.name, event.target.value)}
                    className="mt-1 w-full rounded-[10px] border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
                  />
                </label>
              ))}
            </div>
            {section.textAreas?.length ? (
              <div className="grid gap-3">
                {section.textAreas.map((area) => (
                  <label key={area.name} className="text-[13px] text-slate-700">
                    <span className="text-[12px] font-semibold text-slate-500">{area.label}</span>
                    <textarea
                      rows={area.rows || 3}
                      value={formState[area.name] || ""}
                      onChange={(event) => handleInputChange(area.name, event.target.value)}
                      className="mt-1 w-full rounded-[10px] border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {section.fileFields?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {section.fileFields.map((fileField) => renderFilePicker(fileField, section.key))}
              </div>
            ) : null}
            {section.key === "assessment" ? (
              <div className="grid gap-3">
                <label className="text-[13px] text-slate-700">
                  <span className="text-[12px] font-semibold text-slate-500">
                    Notification to Sales & Executive
                  </span>
                  <textarea
                    rows={3}
                    value={formState.notify_note || ""}
                    onChange={(event) => handleInputChange("notify_note", event.target.value)}
                    className="mt-1 w-full rounded-[10px] border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
                  />
                </label>
              </div>
            ) : null}
          </section>
        ))}

        <section className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-slate-900">General Reports</h3>
            <button
              type="button"
              onClick={saveGeneralReports}
              disabled={sectionSaving.general}
              className="rounded-[12px] border border-emerald-200 bg-white px-3 py-1 text-[12px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400"
            >
              {sectionSaving.general ? "Saving..." : "Save Reports"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {GENERAL_REPORT_FIELDS.map((report) => renderFilePicker(report, "general"))}
          </div>
        </section>

        <footer className="rounded-[20px] border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isDraftSaving}
              className="flex items-center justify-center gap-2 rounded-[14px] border border-slate-300 bg-white px-4 py-3 text-[14px] font-semibold text-slate-700 transition hover:border-slate-400 disabled:border-slate-200 disabled:text-slate-400"
            >
              <List size={16} />
              {isDraftSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleSaveCompletion}
              disabled={completionLoading}
              className="flex items-center justify-center gap-2 rounded-[14px] border border-emerald-500 bg-emerald-600 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-emerald-500 disabled:border-slate-200 disabled:bg-slate-200"
            >
              {completionLoading ? "Saving..." : "Save Completion"}
            </button>
          </div>
        </footer>
      </div>
    </AppPageShell>
  );
}
