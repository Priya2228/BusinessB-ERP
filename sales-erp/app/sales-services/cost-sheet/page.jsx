"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Pencil, Trash2, X } from "lucide-react";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";

const inputClassName =
  "h-[34px] w-full rounded-[8px] border border-slate-200 bg-[#f9fbfd] px-3 text-[12px] text-slate-800 outline-none transition focus:border-sky-400";
const selectClassName = `${inputClassName} appearance-none`;
const textAreaClassName =
  "min-h-[78px] w-full rounded-[8px] border border-slate-200 bg-[#f9fbfd] px-3 py-2 text-[12px] text-slate-800 outline-none transition focus:border-sky-400";
const readOnlyClassName = `${inputClassName} bg-[#f1f5f9] text-slate-600`;
const labelClassName = "mb-1.5 block text-[11px] font-semibold text-slate-600";

const getToday = () => new Date().toISOString().split("T")[0];
const createCostSheetNo = () => `EST-${Date.now().toString().slice(-6)}`;

const sectionConfigs = [
  { key: "rawMaterial", title: "Raw Material" },
  { key: "productionCost", title: "Service Cost" },
  { key: "addonCost", title: "Overhead" },
  { key: "sewingCost", title: "Sewing Cost" },
  { key: "packagingLogistics", title: "Transport" },
  { key: "threadworkFinishing", title: "Threadwork & Finishing" },
  { key: "miscellaneous", title: "Miscellaneous" },
];

const createEmptyRow = () => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  itemId: "",
  itemCode: "",
  itemName: "",
  details: "",
  unit: "",
  itemType: "",
  itemCategory: "",
  batchNo: "",
  rate: "",
  quantity: "",
  amount: 0,
  notes: "",
});

const createInitialSections = () =>
  sectionConfigs.reduce((acc, section) => {
    acc[section.key] = [];
    return acc;
  }, {});

const createInitialDrafts = () =>
  sectionConfigs.reduce((acc, section) => {
    acc[section.key] = createEmptyRow();
    return acc;
  }, {});

const createInitialForm = () => ({
  costSheetNo: createCostSheetNo(),
  rfqNo: "",
  registeredDate: getToday(),
  deliveryDate: "",
  clientName: "",
  companyName: "",
  phoneNo: "",
  email: "",
  deliveryLocation: "",
  paymentTerms: "",
  taxPreference: "",
  deliveryMode: "",
  dressName: "",
  dressCode: "",
  dressType: "",
  dressCategory: "",
  dressUnit: "",
  dressRate: "",
  quantity: "",
  remarks: "",
});

const titleCaseSection = (sectionKey) =>
  sectionConfigs.find((section) => section.key === sectionKey)?.title || sectionKey;

const normalizeSectionRows = (sections = {}) =>
  sectionConfigs.reduce((acc, section) => {
    acc[section.key] = Array.isArray(sections?.[section.key]) ? sections[section.key] : [];
    return acc;
  }, {});

const buildFormFromEstimation = (estimation) => ({
  costSheetNo: estimation?.estimation_no || createCostSheetNo(),
  rfqNo: estimation?.rfq_no || "",
  registeredDate: estimation?.registered_date || getToday(),
  deliveryDate: estimation?.delivery_date || "",
  clientName: estimation?.client_name || "",
  companyName: estimation?.company_name || "",
  phoneNo: estimation?.phone_no || "",
  email: estimation?.email || "",
  deliveryLocation: estimation?.delivery_location || "",
  paymentTerms: estimation?.payment_terms || "",
  taxPreference: estimation?.tax_preference || "",
  deliveryMode: estimation?.delivery_mode || "",
  dressName: estimation?.dress_name || "",
  dressCode: estimation?.dress_code || "",
  dressType: estimation?.dress_type || "",
  dressCategory: estimation?.dress_category || "",
  dressUnit: estimation?.dress_unit || "",
  dressRate: estimation?.dress_rate ? String(estimation.dress_rate) : "",
  quantity: estimation?.quantity ? String(estimation.quantity) : "",
  remarks: estimation?.remarks || "",
});

function Field({ label, className = "", ...props }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <input className={`${inputClassName} ${className}`} {...props} />
    </div>
  );
}

function ReadOnlyField({ label, className = "", ...props }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <input className={`${readOnlyClassName} ${className}`} readOnly {...props} />
    </div>
  );
}

function SelectField({ label, options, className = "", ...props }) {
  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <select className={`${selectClassName} ${className}`} {...props}>
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InfoCard({ children }) {
  return (
    <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-gray-700">
      {children}
    </section>
  );
}

function CostSection({
  title,
  dropdownLabel,
  draft,
  rows,
  options,
  onItemSelect,
  onDraftChange,
  onSubmitRow,
  onEditRow,
  onRemoveRow,
  total,
}) {
  const isEditing = rows.some((row) => row.id === draft.id);

  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-bold text-slate-900">{title}</h2>
        <div className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
          Total {title} Cost: {total.toFixed(2)}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.8fr))_110px]">
          <div>
            <label className={labelClassName}>{dropdownLabel}</label>
            <select
              value={draft.itemId}
              onChange={(event) => onItemSelect(event.target.value)}
              className={selectClassName}
            >
              <option value="">Choose {dropdownLabel}</option>
              {options.map((option) => (
                <option key={option.id} value={String(option.id)}>
                  {option.item_name || option.itemName}
                </option>
              ))}
            </select>
          </div>
          <ReadOnlyField label="Unit" value={draft.unit} />
          <Field
            label="Cost"
            value={draft.rate}
            onChange={(event) => onDraftChange("rate", event.target.value.replace(/[^\d.]/g, ""))}
            className="text-right"
          />
          <Field
            label="No of unit"
            value={draft.quantity}
            onChange={(event) => onDraftChange("quantity", event.target.value.replace(/[^\d.]/g, ""))}
            className="text-right"
          />
          <ReadOnlyField label="Amount" value={Number(draft.amount || 0).toFixed(2)} className="text-right" />
          <div className="flex items-end">
            <button
              type="button"
              onClick={onSubmitRow}
              disabled={!draft.itemId}
              className="flex h-[34px] w-full items-center justify-center rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {isEditing ? "Update" : "Add"}
            </button>
          </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[10px] border border-slate-200">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 font-semibold">Details</th>
              <th className="px-3 py-2.5 font-semibold">Unit</th>
              <th className="px-3 py-2.5 font-semibold">Cost</th>
              <th className="px-3 py-2.5 font-semibold">No of unit</th>
              <th className="px-3 py-2.5 font-semibold text-right">Total</th>
              <th className="px-3 py-2.5 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2.5 text-slate-700">{row.itemName || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.details || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.unit || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.rate || "0"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{row.quantity || "0"}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{Number(row.amount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditRow(row.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveRow(row.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  No items added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-600">
        <span>Total {title}</span>
        <span>{total.toFixed(2)}</span>
      </div>
    </section>
  );
}

export default function ClothSalesCostSheetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const revisionMode = searchParams.get("revisionMode");
  const isPricingRevisionMode = revisionMode === "pricing";
  const [formData, setFormData] = useState(createInitialForm);
  const [rfqOptions, setRfqOptions] = useState([]);
  const [sectionOptionCatalog, setSectionOptionCatalog] = useState({});
  const [sections, setSections] = useState(createInitialSections);
  const [sectionDrafts, setSectionDrafts] = useState(createInitialDrafts);
  const [toast, setToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(Boolean(editId));

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadRealtimeData = async () => {
      try {
        setIsPageLoading(Boolean(editId));
        const rfqPromise = fetch(buildApiUrl("/api/sales-services/"));
        const sectionOptionPromise = fetch(buildApiUrl("/api/cost-estimation-options/"));
        const estimationPromise = editId
          ? fetch(buildApiUrl(`/api/cost-estimations/${editId}/`))
          : Promise.resolve(null);

        const [rfqResponse, sectionOptionResponse, estimationResponse] = await Promise.all([
          rfqPromise,
          sectionOptionPromise,
          estimationPromise,
        ]);

        if (rfqResponse.ok) {
          const rfqData = await rfqResponse.json();
          setRfqOptions(Array.isArray(rfqData) ? rfqData : []);
        } else {
          setRfqOptions([]);
        }

        if (sectionOptionResponse.ok) {
          const optionData = await sectionOptionResponse.json();
          setSectionOptionCatalog(optionData && typeof optionData === "object" ? optionData : {});
        } else {
          setSectionOptionCatalog({});
        }

        if (editId) {
          if (!estimationResponse?.ok) {
            showToast("Failed to load cost estimation for update.", "error");
            router.push("/sales-services/cost-sheet/list");
            return;
          }

          const estimationData = await estimationResponse.json();
          setFormData(buildFormFromEstimation(estimationData));
          setSections(normalizeSectionRows(estimationData.sections));
          setSectionDrafts(createInitialDrafts());
        }

      } catch {
        setRfqOptions([]);
        setSectionOptionCatalog({});
        if (editId) {
          showToast("Network error while loading cost estimation.", "error");
          router.push("/sales-services/cost-sheet/list");
        }
      } finally {
        setIsPageLoading(false);
      }
    };

    loadRealtimeData();
  }, [editId, router]);

  const sectionDropdownOptions = useMemo(
    () => sectionConfigs.reduce((acc, section) => {
      acc[section.key] = Array.isArray(sectionOptionCatalog?.[section.key]) ? sectionOptionCatalog[section.key] : [];
      return acc;
    }, {}),
    [sectionOptionCatalog]
  );

  const sectionTotals = useMemo(() => {
    return sectionConfigs.reduce((acc, section) => {
      acc[section.key] = (sections[section.key] || []).reduce(
        (sum, row) => sum + (Number(row.amount) || 0),
        0
      );
      return acc;
    }, {});
  }, [sections]);

  const grandTotal = useMemo(
    () => Object.values(sectionTotals).reduce((sum, value) => sum + Number(value || 0), 0),
    [sectionTotals]
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    if (name === "rfqNo") {
      const rfq = rfqOptions.find((option) => option.rfq_no === value);

      setFormData((prev) => ({
        ...prev,
        rfqNo: value,
        registeredDate: rfq?.registered_date || getToday(),
        deliveryDate: rfq?.delivery_date || "",
        clientName: rfq?.client_name || "",
        companyName: rfq?.company_name || "",
        phoneNo: rfq?.phone_no || "",
        email: rfq?.email || "",
        deliveryLocation: rfq?.delivery_location || "",
        paymentTerms: rfq?.payment_terms || "",
        taxPreference: rfq?.tax_preference || "",
        deliveryMode: rfq?.delivery_mode || "",
        dressName: rfq?.item_name || "",
        dressCode: "",
        dressType: "",
        dressCategory: "",
        dressUnit: rfq?.unit || "",
        dressRate: "",
        quantity: rfq?.quantity ? String(rfq.quantity) : "",
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "phoneNo" || name === "quantity" || name === "dressRate"
          ? value.replace(/[^\d.]/g, "")
          : value,
    }));
  };

  const updateDraftRow = (sectionKey, field, value) => {
    setSectionDrafts((prev) => {
      const nextRow = { ...prev[sectionKey], [field]: value };
      const rate = Number(nextRow.rate || 0);
      const quantity = Number(nextRow.quantity || 0);
      nextRow.amount = rate * quantity;
      return {
        ...prev,
        [sectionKey]: nextRow,
      };
    });
  };

  const handleItemSelect = (sectionKey, itemId) => {
    const selectedItem = (sectionDropdownOptions[sectionKey] || []).find(
      (item) => String(item.id) === String(itemId)
    );

    setSectionDrafts((prev) => {
      const quantity = Number(prev[sectionKey].quantity || 0);
      const selectedRate = Number(selectedItem?.cost || 0);

      return {
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          itemId,
          itemCode: "",
          itemName: selectedItem?.item_name || "",
          details: selectedItem?.details || titleCaseSection(sectionKey),
          unit: selectedItem?.unit || "",
          itemType: "",
          itemCategory: selectedItem?.item_category || titleCaseSection(sectionKey),
          batchNo: "",
          rate: selectedItem?.cost ? String(selectedItem.cost) : "",
          amount: selectedRate * quantity,
        },
      };
    });
  };

  const submitSectionRow = (sectionKey) => {
    const draft = sectionDrafts[sectionKey];
    if (!draft.itemId) return;
    if (Number(draft.quantity || 0) <= 0) {
      showToast("Quantity must be greater than 0 before adding.", "error");
      return;
    }

    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].some((row) => row.id === draft.id)
        ? prev[sectionKey].map((row) => (row.id === draft.id ? { ...draft } : row))
        : [...prev[sectionKey], { ...draft }],
    }));

    setSectionDrafts((prev) => ({
      ...prev,
      [sectionKey]: createEmptyRow(),
    }));
  };

  const editSectionRow = (sectionKey, rowId) => {
    const rowToEdit = sections[sectionKey].find((row) => row.id === rowId);
    if (!rowToEdit) return;

    setSectionDrafts((prev) => ({
      ...prev,
      [sectionKey]: { ...rowToEdit },
    }));
  };

  const removeSectionRow = (sectionKey, rowId) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].filter((row) => row.id !== rowId),
    }));

    setSectionDrafts((prev) => ({
      ...prev,
      [sectionKey]: prev[sectionKey].id === rowId ? createEmptyRow() : prev[sectionKey],
    }));
  };

  const handleReset = () => {
    if (editId) {
      router.push("/sales-services/cost-sheet/list");
      return;
    }

    setFormData(createInitialForm());
    setSections(createInitialSections());
    setSectionDrafts(createInitialDrafts());
  };

  const handleSubmit = async () => {
    if (!formData.rfqNo) {
      showToast("Please choose an RFQ before submitting.", "error");
      return;
    }

    const hasRows = Object.values(sections).some((rows) => rows.length > 0);
    if (!hasRows) {
      showToast("Add at least one cost item before submitting.", "error");
      return;
    }

    const payload = {
      estimation_no: formData.costSheetNo,
      rfq_no: formData.rfqNo,
      registered_date: formData.registeredDate,
      delivery_date: formData.deliveryDate || null,
      client_name: formData.clientName,
      company_name: formData.companyName,
      phone_no: formData.phoneNo,
      email: formData.email,
      delivery_location: formData.deliveryLocation,
      payment_terms: formData.paymentTerms,
      tax_preference: formData.taxPreference,
      delivery_mode: formData.deliveryMode,
      dress_name: formData.dressName,
      dress_code: formData.dressCode,
      dress_type: formData.dressType,
      dress_category: formData.dressCategory,
      dress_unit: formData.dressUnit,
      dress_rate: Number(formData.dressRate || 0),
      quantity: Number(formData.quantity || 0),
      remarks: formData.remarks,
      sections,
      section_totals: sectionTotals,
      grand_total: grandTotal,
      status: "ACTIVE",
    };

    try {
      setIsSubmitting(true);
      const response = await fetch(
        buildApiUrl(editId ? `/api/cost-estimations/${editId}/` : "/api/cost-estimations/"),
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData?.estimation_no?.length) {
          showToast("Estimation number already exists. Please try again.", "error");
          return;
        }
        showToast("Failed to save cost estimation.", "error");
        return;
      }

      showToast(editId ? "Cost estimation updated successfully." : "Cost estimation saved successfully.", "success");
      if (editId) {
        window.setTimeout(() => router.push("/sales-services/cost-sheet/list"), 600);
      } else if (!editId) {
        handleReset();
      }
    } catch {
      showToast(`Network error while ${editId ? "updating" : "saving"} cost estimation.`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryRows = [
    { label: "Raw Material Total", value: sectionTotals.rawMaterial || 0 },
    { label: "Service Cost Total", value: sectionTotals.productionCost || 0 },
    { label: "Overhead Cost Total", value: sectionTotals.addonCost || 0 },
    { label: "Sewing Cost Total", value: sectionTotals.sewingCost || 0 },
    { label: "Transport", value: sectionTotals.packagingLogistics || 0 },
    { label: "Threadwork & Finishing Total", value: sectionTotals.threadworkFinishing || 0 },
    { label: "Miscellaneous Total", value: sectionTotals.miscellaneous || 0 },
    { label: "Grand Total", value: grandTotal },
  ];

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
    >
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
            <div className="mt-3 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
              <div className="mx-auto max-w-[1180px]">
                <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-3">
                    <h1 className="text-[16px] font-bold text-slate-900">{editId ? "Update Cost Estimation Sheet" : "Cost Estimation Sheet"}</h1>
                    <button
                      type="button"
                      onClick={() => router.push("/sales-services/cost-sheet/list")}
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-white text-blue-600"
                    >
                      <List size={18} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-4">
                    <ReadOnlyField label="Cost Estimation Id" value={formData.costSheetNo} className="font-semibold text-slate-700" />
                    <SelectField
                      label="RFQ Code"
                      name="rfqNo"
                      value={formData.rfqNo}
                      onChange={handleFormChange}
                      options={rfqOptions.map((option) => ({ value: option.rfq_no, label: option.rfq_no }))}
                    />
                    <ReadOnlyField label="Registered Date" value={formData.registeredDate} />
                    
                  </div>
                </div>

                <div className="mt-5 grid gap-5">
                  <InfoCard>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[14px] font-bold text-slate-900">Client Information</h2>
                      <p className="text-[11px] font-semibold text-slate-500">Auto-filled from RFQ</p>
                    </div>
                    <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <ReadOnlyField label="Client Name" value={formData.clientName} />
                      <ReadOnlyField label="Company Name" value={formData.companyName} />
                      <ReadOnlyField label="Phone No" value={formData.phoneNo} />
                      <ReadOnlyField label="Email" value={formData.email} />
                      
                    </div>
                  </InfoCard>

                  {isPageLoading ? (
                    <InfoCard>
                      <div className="py-8 text-center text-[13px] font-semibold text-slate-500">Loading cost estimation...</div>
                    </InfoCard>
                  ) : sectionConfigs.map((section) => (
                    <CostSection
                      key={section.key}
                      title={section.title}
                      dropdownLabel={section.title}
                      draft={sectionDrafts[section.key]}
                      rows={sections[section.key]}
                      options={sectionDropdownOptions[section.key] || []}
                      total={sectionTotals[section.key] || 0}
                      onItemSelect={(itemId) => handleItemSelect(section.key, itemId)}
                      onDraftChange={(field, value) => updateDraftRow(section.key, field, value)}
                      onSubmitRow={() => submitSectionRow(section.key)}
                      onEditRow={(rowId) => editSectionRow(section.key, rowId)}
                      onRemoveRow={(rowId) => removeSectionRow(section.key, rowId)}
                    />
                  ))}

                  <InfoCard>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[14px] font-bold text-slate-900">Cost Sheet Summary</h2>
                      <p className="text-[14px] font-bold text-slate-900">Grand Total: Rs. {grandTotal.toFixed(2)}</p>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {summaryRows.map((row) => (
                        <ReadOnlyField key={row.label} label={row.label} value={row.value.toFixed(2)} />
                      ))}
                    </div>
                    <div className="mt-3">
                      <label className={labelClassName}>Remarks</label>
                      <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleFormChange}
                        className={textAreaClassName}
                        placeholder="Enter overall notes"
                      />
                    </div>
                  </InfoCard>

                  <div className="flex items-center gap-3 pb-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="rounded-[10px] bg-[#34b556] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(52,181,86,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (editId ? "UPDATING..." : "SAVING...") : (editId ? "UPDATE" : "SUBMIT")}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-[10px] bg-[#ff9533] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(255,149,51,0.22)]"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              </div>
            </div>
    </AppPageShell>
  );
}
