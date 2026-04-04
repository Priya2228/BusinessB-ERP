"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, X } from "lucide-react";
import AppPageShell from "../components/AppPageShell";
import { buildApiUrl } from "../utils/api";

const ENQUIRY_MODES = ["Email", "Phone", "Verbal"];

const PLAN_RFQ_TYPES = [
  "Verbal",
  "Demo",
  "Friendly"
];

const createRfqNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  return `RFQ-${timestamp}`;
};

const getToday = () => new Date().toISOString().split("T")[0];

const createInitialForm = () => ({
  rfqNo: createRfqNumber(),
  registeredDate: getToday(),
  enquiryMode: "Email",
  clientName: "",
  companyName: "",
  clientLocation: "",
  phoneNo: "",
  email: "",
  emailRefNo: "",
  emailAttachment: null,
  projectTitle: "",
  serviceCategory: "",
  fabricSpecs: "",
  brandingType: "",
  sizeBreakdown: "",
  scopeOfWork: "",
  planRfqType: "",
  planStartDate: "",
  expectedDeadline: "",
});

const inputClassName =
  "h-[42px] w-full rounded-[12px] border border-slate-300 bg-white px-4 text-[13px] text-slate-800 outline-none transition focus:border-sky-400";

const labelClassName = "mb-2 block text-[12px] font-semibold text-slate-800";

function FormField({ label, name, value, onChange, error, className = "", ...props }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <input
        name={name}
        value={value}
        onChange={onChange}
        className={`${inputClassName} ${error ? "border-red-400 bg-red-50" : ""} ${className}`}
        {...props}
      />
      {error ? <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, error, placeholder }) {
  return (
    <div className="md:col-span-2 lg:col-span-3">
      <label className={labelClassName}>{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className={`w-full rounded-[12px] border border-slate-300 bg-white p-4 text-[13px] text-slate-800 outline-none transition focus:border-sky-400 min-h-[100px] ${error ? "border-red-400 bg-red-50" : ""}`}
      />
      {error ? <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, error }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`${inputClassName} appearance-none ${error ? "border-red-400 bg-red-50" : ""}`}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p> : null}
    </div>
  );
}

function ServiceScopeField({ options, values, scopeValue, onToggle, onScopeChange, error }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-5">
      <h3 className="text-[14px] font-bold text-slate-900">Service Details</h3>
      <div className="mt-5">
        <p className="text-[13px] font-medium text-slate-800">Marine related service</p>
        <div className={`mt-3 rounded-[12px] ${error ? "border border-red-400 bg-red-50 p-4" : ""}`}>
          <div className="grid gap-x-10 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => {
              const checked = values.includes(option);
              return (
                <label key={option} className="flex items-start gap-3 text-[13px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-500 focus:ring-violet-400"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </div>
        {error ? <p className="mt-1 text-[11px] font-medium text-red-500">{error}</p> : null}
      </div>

      <div className="mt-6">
        <label className={labelClassName}>Scope area</label>
        <textarea
          name="fabricSpecs"
          value={scopeValue}
          onChange={onScopeChange}
          rows={5}
          className={`min-h-[138px] w-full rounded-[10px] border bg-white p-3 text-[13px] text-slate-800 outline-none transition focus:border-cyan-400 ${error ? "border-red-400 bg-red-50" : "border-slate-300"}`}
        />
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-[#fbfdff] p-5 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-[1px] hover:border-gray-700 hover:shadow-[0_10px_24px_rgba(14,116,144,0.12)]">
      <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FileField({ label, name, file, onChange, disabled = false }) {
  const fileLabel =
    typeof file === "string"
      ? file.split("/").pop()
      : file?.name || "No file chosen";

  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <label className={`flex h-[42px] w-full items-center overflow-hidden rounded-[12px] border border-slate-300 bg-white text-[13px] text-slate-800 transition focus-within:border-sky-400 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
        <span className="flex h-full items-center border-r border-slate-300 bg-slate-100 px-4 font-medium text-slate-700">
          Choose File
        </span>
        <span className="min-w-0 flex-1 truncate px-4 text-slate-500">
          {disabled ? "Attachment disabled for verbal enquiry" : fileLabel}
        </span>
        <input name={name} type="file" onChange={onChange} className="hidden" disabled={disabled} />
      </label>
    </div>
  );
}

export default function RfqForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [formData, setFormData] = useState(createInitialForm);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(Boolean(editId));
  const [serviceCategoryOptions, setServiceCategoryOptions] = useState([]);
  const isEmailMode = formData.enquiryMode === "Email";
  const isPhoneMode = formData.enquiryMode === "Phone";
  const isVerbalMode = formData.enquiryMode === "Verbal";
  const selectedMarineServices = formData.serviceCategory
    ? formData.serviceCategory.split(",").map((item) => item.trim()).filter(Boolean)
    : [];

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const applyServerErrors = (serverErrors) => {
    const fieldMap = {
      registered_date: "registeredDate",
      enquiry_mode: "enquiryMode",
      client_name: "clientName",
      company_name: "companyName",
      client_location: "clientLocation",
      phone_no: "phoneNo",
      email_ref_no: "emailRefNo",
      project_title: "projectTitle",
      service_category: "serviceCategory",
      fabric_specs: "fabricSpecs",
      branding_type: "brandingType",
      size_breakdown: "sizeBreakdown",
      scope_of_work: "scopeOfWork",
      plan_rfq_type: "planRfqType",
      plan_start_date: "planStartDate",
      plan_end_date: "expectedDeadline",
      expected_deadline: "expectedDeadline",
    };

    const nextErrors = {};
    Object.entries(serverErrors || {}).forEach(([key, value]) => {
      const targetKey = fieldMap[key] || key;
      nextErrors[targetKey] = Array.isArray(value) ? value[0] : String(value);
    });
    setErrors(nextErrors);
    return nextErrors;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const loadWebsiteProfile = async () => {
      try {
        const response = await fetch(buildApiUrl("/api/website-company-profile/"), {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          return;
        }

        const profile = await response.json();
        const nextServiceCategories = Array.isArray(profile?.service_categories)
          ? profile.service_categories.filter(Boolean)
          : [];
        setServiceCategoryOptions(nextServiceCategories);

        if (editId) {
          return;
        }

        setFormData((prev) => ({
          ...prev,
          clientName: prev.clientName || profile?.client_name || "",
          companyName: prev.companyName || profile?.company_name || "",
          clientLocation: prev.clientLocation || profile?.client_location || "",
          phoneNo: prev.phoneNo || profile?.phone_no || "",
          email: prev.email || profile?.email || "",
          serviceCategory: prev.serviceCategory || "",
          projectTitle: prev.projectTitle || "",
          fabricSpecs: prev.fabricSpecs || "",
          scopeOfWork:
            prev.scopeOfWork || (Array.isArray(profile?.brief_services) ? profile.brief_services.join("\n") : ""),
        }));
      } catch {
        setServiceCategoryOptions([]);
      }
    };

    loadWebsiteProfile();
  }, [editId]);

  useEffect(() => {
    if (!editId) {
      setIsLoadingRecord(false);
      return;
    }

    const loadRecord = async () => {
      try {
        setIsLoadingRecord(true);
        const response = await fetch(buildApiUrl(`/api/sales-services/${editId}/`), {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to load RFQ");
        }

        const data = await response.json();
        setFormData({
          rfqNo: data.rfq_no || "",
          registeredDate: data.registered_date || getToday(),
          enquiryMode: data.enquiry_mode || (data.email ? "Email" : data.phone_no ? "Phone" : "Verbal"),
          clientName: data.client_name || "",
          companyName: data.company_name || "",
          clientLocation: data.client_location || "",
          phoneNo: data.phone_no || "",
          email: data.email || "",
          emailRefNo: data.email_ref_no || "",
          emailAttachment: data.email_attachment || null,
          projectTitle: data.project_title || "",
          serviceCategory: data.service_category || "",
          fabricSpecs: data.fabric_specs || "",
          brandingType: data.branding_type || "",
          sizeBreakdown: data.size_breakdown || "",
          scopeOfWork: data.scope_of_work || "",
          planRfqType: data.plan_rfq_type || "",
          planStartDate: data.plan_start_date || "",
          expectedDeadline: data.plan_end_date || data.expected_deadline || "",
        });
        setErrors({});
      } catch {
        showToast("Failed to load RFQ for editing.", "error");
      } finally {
        setIsLoadingRecord(false);
      }
    };

    loadRecord();
  }, [editId, router]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (event) => {
    const { name, value, files, type } = event.target;

    setFormData((prev) => {
      if (name === "enquiryMode") {
        return {
          ...prev,
          enquiryMode: value,
          phoneNo: value === "Phone" ? prev.phoneNo : "",
          email: value === "Email" ? prev.email : "",
          emailRefNo: value === "Email" ? prev.emailRefNo : "",
          emailAttachment: null,
        };
      }

      return {
        ...prev,
        [name]:
          type === "file"
            ? files?.[0] || null
            : name === "phoneNo"
              ? value.replace(/[^\d]/g, "")
              : value,
      };
    });

    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleMarineServiceToggle = (serviceName) => {
    setFormData((prev) => {
      const currentSelections = prev.serviceCategory
        ? prev.serviceCategory.split(",").map((item) => item.trim()).filter(Boolean)
        : [];
      const nextSelections = currentSelections.includes(serviceName)
        ? currentSelections.filter((item) => item !== serviceName)
        : [...currentSelections, serviceName];
      const previousAutoScope = currentSelections.join("\n");
      const nextAutoScope = nextSelections.join("\n");
      const currentPrimaryTitle = currentSelections[0] || "";
      const nextPrimaryTitle = nextSelections[0] || "";

      return {
        ...prev,
        serviceCategory: nextSelections.join(", "),
        projectTitle:
          !prev.projectTitle || prev.projectTitle === currentPrimaryTitle
            ? nextPrimaryTitle
            : prev.projectTitle,
        fabricSpecs:
          !prev.fabricSpecs.trim() || prev.fabricSpecs === previousAutoScope
            ? nextAutoScope
            : prev.fabricSpecs,
      };
    });
    setErrors((prev) => ({ ...prev, serviceCategory: "", fabricSpecs: "" }));
  };

  const resetForm = () => {
    if (editId) {
      router.push("/sales-services/rfq-list");
      return;
    }
    setFormData(createInitialForm());
    setErrors({});
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formData.registeredDate) nextErrors.registeredDate = "Registered date is required.";
    if (!formData.clientName.trim()) nextErrors.clientName = "Attention is required.";
    if (!formData.companyName.trim()) nextErrors.companyName = "Company name is required.";
    if (!formData.clientLocation.trim()) nextErrors.clientLocation = "Client location is required.";
    if (isEmailMode) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        nextErrors.email = "Enter a valid email address.";
      }
    } else if (isPhoneMode && !/^\d{7,15}$/.test(formData.phoneNo)) {
      nextErrors.phoneNo = "Phone number must be between 7 and 15 digits.";
    }
    
    if (!selectedMarineServices.length) nextErrors.serviceCategory = "Select at least one marine service.";
    if (!formData.fabricSpecs.trim()) nextErrors.fabricSpecs = "Scope area is required.";
    if (!formData.planRfqType) nextErrors.planRfqType = "Plan RFQ type is required.";
    if (!formData.planStartDate) nextErrors.planStartDate = "Starting date is required.";
    if (!formData.expectedDeadline) nextErrors.expectedDeadline = "Plan end date is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showToast("Please correct the highlighted fields.", "error");
      return;
    }

    const payload = new FormData();
    payload.append("rfq_no", formData.rfqNo);
    payload.append("registered_date", formData.registeredDate);
    payload.append("enquiry_mode", formData.enquiryMode);
    payload.append("client_name", formData.clientName.trim());
    payload.append("company_name", formData.companyName.trim());
    payload.append("client_location", formData.clientLocation.trim());
    payload.append("phone_no", isPhoneMode ? formData.phoneNo : "");
    payload.append("email", isEmailMode ? formData.email.trim() : "");
    payload.append("email_ref_no", isEmailMode ? formData.emailRefNo.trim() : "");
    if (!isVerbalMode && formData.emailAttachment instanceof File) {
      payload.append("email_attachment", formData.emailAttachment);
    }

    payload.append("project_title", formData.projectTitle.trim());
    payload.append("service_category", formData.serviceCategory);
    payload.append("fabric_specs", formData.fabricSpecs.trim());
    payload.append("branding_type", formData.brandingType);
    payload.append("size_breakdown", formData.sizeBreakdown.trim());
    payload.append("scope_of_work", formData.scopeOfWork.trim());
    payload.append("plan_rfq_type", formData.planRfqType);
    payload.append("plan_start_date", formData.planStartDate);
    payload.append("plan_end_date", formData.expectedDeadline);
    payload.append("expected_deadline", formData.expectedDeadline);

    try {
      setIsSubmitting(true);
      const response = await fetch(
        buildApiUrl(editId ? `/api/sales-services/${editId}/` : "/api/sales-services/"),
        {
          method: editId ? "PUT" : "POST",
          headers: getAuthHeaders(),
          body: payload,
        }
      );

      if (!response.ok) {
        let serverErrors = null;
        try {
          serverErrors = await response.json();
        } catch {
          serverErrors = null;
        }

        const nextErrors = applyServerErrors(serverErrors);
        const fallbackMessage = editId ? "Failed to update RFQ." : "Failed to save RFQ.";
        const firstError = Object.values(nextErrors)[0];
        showToast(firstError || fallbackMessage, "error");
        return;
      }

      showToast(editId ? "RFQ updated successfully." : "RFQ submitted successfully.", "success");
      if (editId) {
        router.push("/sales-services/rfq-list");
        return;
      }
      resetForm();
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2">
      {toast ? (
        <div
          className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-lg px-5 py-3 text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          <span className="text-[13px] font-bold">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="text-white">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <div className="mt-3 rounded-[24px] border border-slate-300 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] transition-all duration-200 hover:border-gray-700 hover:shadow-[0_12px_28px_rgba(14,116,144,0.12)]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-[18px] font-bold text-slate-900">Request for Quotation</h1>
            <button
              onClick={() => router.push("/sales-services/rfq-list")}
              className="h-10 w-10 rounded-md border border-blue-500 bg-white text-blue-600"
            >
              <List size={18} className="mx-auto" />
            </button>
          </div>

          <SectionCard title="RFQ Reference">
            {isLoadingRecord && <div className="pb-4 text-[13px] text-slate-500">Loading RFQ...</div>}
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className={labelClassName}>RFQ No</label>
                <input
                  className="h-[42px] w-full rounded-[12px] border border-gray-300 bg-[#dfe3e8] px-4 text-[13px] font-semibold text-gray-700 outline-none"
                  value={formData.rfqNo}
                  readOnly
                />
              </div>
              <FormField
                label="RFQ Date"
                name="registeredDate"
                type="date"
                value={formData.registeredDate}
                onChange={handleChange}
                error={errors.registeredDate}
                className="h-[42px] w-full rounded-[12px] border border-gray-300 bg-[#dfe3e8] px-4 text-[13px] font-semibold text-gray-700 outline-none"
              />
            </div>
          </SectionCard>

          <SectionCard title="RFQ Information">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SelectField
                label="Mode of Enquiry"
                name="enquiryMode"
                value={formData.enquiryMode}
                onChange={handleChange}
                options={ENQUIRY_MODES}
              />
              {isEmailMode ? (
                <FormField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} />
              ) : isPhoneMode ? (
                <FormField label="Phone No" name="phoneNo" inputMode="numeric" maxLength={15} value={formData.phoneNo} onChange={handleChange} error={errors.phoneNo} />
              ) : (
                <div className="hidden md:block"></div>
              )}
              {isEmailMode ? (
                <FormField
                  label="Email Reference No"
                  name="emailRefNo"
                  value={formData.emailRefNo}
                  onChange={handleChange}
                  placeholder="Enter email reference if available"
                />
              ) : null}
              <FileField
                label={isVerbalMode ? "Attachment" : isEmailMode ? "Email Attachment" : "Phone Attachment"}
                name="emailAttachment"
                file={formData.emailAttachment}
                onChange={handleChange}
                disabled={isVerbalMode}
              />
            </div>
          </SectionCard>

          <SectionCard title="Client Information">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Attention" name="clientName" value={formData.clientName} onChange={handleChange} error={errors.clientName} />
              <FormField label="Company Name" name="companyName" value={formData.companyName} onChange={handleChange} error={errors.companyName} />
              <FormField label="Client Address" name="clientLocation" value={formData.clientLocation} onChange={handleChange} error={errors.clientLocation} />
            </div>
          </SectionCard>

          <SectionCard title="RFQ Scope">
            <ServiceScopeField
              options={serviceCategoryOptions}
              values={selectedMarineServices}
              scopeValue={formData.fabricSpecs}
              onToggle={handleMarineServiceToggle}
              onScopeChange={handleChange}
              error={errors.serviceCategory || errors.fabricSpecs}
            />
          </SectionCard>

          <SectionCard title="Planning">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <SelectField
                label="Plan RFQ Type"
                name="planRfqType"
                value={formData.planRfqType}
                onChange={handleChange}
                options={PLAN_RFQ_TYPES}
                error={errors.planRfqType}
              />
              <FormField
                label="Plan Starting Date"
                name="planStartDate"
                type="date"
                value={formData.planStartDate}
                onChange={handleChange}
                error={errors.planStartDate}
              />
              <FormField
                label="Plan End Date"
                name="expectedDeadline"
                type="date"
                value={formData.expectedDeadline}
                onChange={handleChange}
                error={errors.expectedDeadline}
              />
              <TextAreaField
                label="Remarks"
                name="scopeOfWork"
                value={formData.scopeOfWork}
                onChange={handleChange}
                placeholder="Add planning notes, schedule remarks, internal dependencies, or follow-up details."
              />
            </div>
          </SectionCard>

          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || isLoadingRecord}
              className="rounded-[10px] bg-[#34b556] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(52,181,86,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "PROCESSING..." : (editId ? "UPDATE" : "SUBMIT")}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-[10px] bg-[#ff9533] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(255,149,51,0.25)]"
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
