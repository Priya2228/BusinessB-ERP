"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, X } from "lucide-react";
import { FaMoneyBillWave } from "react-icons/fa";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";

const COUNTRY_CONFIG = {
  India: { currency: "Rs.", taxRate: 0.18, symbol: "INR", conversionRate: 1, decimalPlaces: 2 },
  USA: { currency: "$", taxRate: 0.08, symbol: "USD", conversionRate: 0.012, decimalPlaces: 2 },
  Euro: { currency: "EUR", taxRate: 0.2, symbol: "EUR", conversionRate: 0.011, decimalPlaces: 2 },
  Oman: { currency: "OMR", taxRate: 0.05, symbol: "OMR", conversionRate: 0.0046, decimalPlaces: 3 },
  UAE: { currency: "AED", taxRate: 0.05, symbol: "AED", conversionRate: 0.044, decimalPlaces: 2 },
  UK: { currency: "GBP", taxRate: 0.2, symbol: "GBP", conversionRate: 0.0093, decimalPlaces: 2 },
};

const VALIDITY_OPTIONS = ["10 Days", "20 Days", "30 Days"];

const addDaysToDate = (dateValue, days) => {
  if (!dateValue || !days) return "";
  const nextDate = new Date(dateValue);
  nextDate.setDate(nextDate.getDate() + Number(days || 0));
  return nextDate.toISOString().split("T")[0];
};

const formatDateValue = (value) => {
  if (!value) return new Date().toISOString().split("T")[0];
  return String(value).split("T")[0];
};

export default function QuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const viewId = searchParams.get("viewId");
  const estimationId = searchParams.get("estimationId");
  const activeId = editId || viewId;
  const isViewMode = Boolean(viewId);
  const isEditMode = Boolean(editId);

  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [rfqOptions, setRfqOptions] = useState([]);
  const [estimationOptions, setEstimationOptions] = useState([]);
  const [termsOptions, setTermsOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    customerName: "",
    quotationDate: new Date().toISOString().split("T")[0],
    quotationCode: "QU001",
    expiryDate: "",
    quoteValidity: "",
    rfqNo: "",
    rfqDate: "",
    attentionName: "",
    companyName: "",
    email: "",
    phoneNo: "",
    scopeNo: "",
    scopeName: "",
    scopeSpecification: "",
    scopeRemarks: "",
    paymentTermsOption: "",
    paymentTerms: "",
    deliveryTermsOption: "",
    deliveryTerms: "",
    generalTermsOption: "",
    generalTerms: "",
    totalNetAmount: "0.00",
  });

  const currentConfig = COUNTRY_CONFIG[selectedCountry] || COUNTRY_CONFIG.India;
  const currencyDecimals = currentConfig.decimalPlaces ?? 2;

  const formatCurrencyNumber = (amount) => Number(amount || 0).toFixed(currencyDecimals);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    const fetchBootstrapData = async () => {
      try {
        setLoading(true);
        const [quotationsResponse, termsResponse, rfqResponse, costEstimationsResponse, estimationResponse] = await Promise.all([
          fetch(buildApiUrl("/api/quotations/")),
          fetch(buildApiUrl("/api/quotation-terms/")),
          fetch(buildApiUrl("/api/sales-services/")),
          fetch(buildApiUrl("/api/cost-estimations/")),
          estimationId && !activeId
            ? fetch(buildApiUrl(`/api/cost-estimations/${estimationId}/`))
            : Promise.resolve(null),
        ]);

        const quotationsData = quotationsResponse?.ok ? await quotationsResponse.json() : [];
        const termsData = termsResponse?.ok ? await termsResponse.json() : [];
        const rfqData = rfqResponse?.ok ? await rfqResponse.json() : [];
        const costEstimationsData = costEstimationsResponse?.ok ? await costEstimationsResponse.json() : [];
        const estimationData =
          estimationResponse && estimationResponse.ok ? await estimationResponse.json() : null;

        setTermsOptions(Array.isArray(termsData) ? termsData : []);
        setRfqOptions(Array.isArray(rfqData) ? rfqData : []);
        setEstimationOptions(Array.isArray(costEstimationsData) ? costEstimationsData : []);

        if (!activeId) {
          const nextCode = `QU${String((Array.isArray(quotationsData) ? quotationsData.length : 0) + 1).padStart(3, "0")}`;
          setFormData((prev) => ({
            ...prev,
            quotationCode: nextCode,
          }));
        }

        if (estimationData && !activeId) {
          const estimationGrandTotal = Number(estimationData.grand_total || 0) * Number(currentConfig.conversionRate || 1);
          setFormData((prev) => ({
            ...prev,
            customerName: estimationData.company_name || estimationData.client_name || "",
            rfqNo: estimationData.rfq_no || "",
            rfqDate: estimationData.registered_date || "",
            attentionName: estimationData.client_name || "",
            companyName: estimationData.company_name || "",
            email: estimationData.email || "",
            phoneNo: estimationData.phone_no || "",
            scopeNo: estimationData.rfq_no || "",
            scopeName: estimationData.dress_name || "",
            scopeSpecification: estimationData.sections ? JSON.stringify(estimationData.sections) : "",
            scopeRemarks: estimationData.remarks || "",
            totalNetAmount: Number(estimationGrandTotal || 0).toFixed(currencyDecimals),
          }));
        }
      } catch {
        showToast("Failed to load quotation data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchBootstrapData();
  }, [activeId, currencyDecimals, currentConfig.conversionRate, estimationId]);

  useEffect(() => {
    if (!activeId) return;

    const fetchQuotationDetail = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl(`/api/quotations/${activeId}/`));
        if (!response.ok) {
          showToast("Failed to load quotation", "error");
          return;
        }

        const data = await response.json();
        setSelectedCountry(data.currency_country || "India");
        setFormData({
          customerName: data.customer_name || "",
          quotationDate: formatDateValue(data.quotation_date),
          quotationCode: data.quotation_code || "",
          expiryDate: formatDateValue(data.expiry_date),
          quoteValidity: data.quote_validity || "",
          rfqNo: data.rfq_no || "",
          rfqDate: formatDateValue(data.rfq_date),
          attentionName: data.attention_name || "",
          companyName: data.company_name || "",
          email: data.email || "",
          phoneNo: data.phone_no || "",
          scopeNo: data.scope_no || "",
          scopeName: data.scope_name || "",
          scopeSpecification: data.scope_specification || "",
          scopeRemarks: data.scope_remarks || "",
          paymentTermsOption: "",
          paymentTerms: data.payment_terms || "",
          deliveryTermsOption: "",
          deliveryTerms: data.delivery_terms || "",
          generalTermsOption: "",
          generalTerms: data.general_terms || "",
          totalNetAmount: Number(data.total_net_amount || data.net_amount || 0).toFixed(currencyDecimals),
        });
      } catch {
        showToast("Network error while loading quotation", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotationDetail();
  }, [activeId, currencyDecimals]);

  useEffect(() => {
    if (!formData.rfqNo) {
      setFormData((prev) => ({
        ...prev,
        customerName: "",
        rfqDate: "",
        attentionName: "",
        companyName: "",
        email: "",
        phoneNo: "",
        scopeNo: "",
        scopeName: "",
        scopeSpecification: "",
        scopeRemarks: "",
        paymentTermsOption: "",
        paymentTerms: "",
        deliveryTermsOption: "",
        deliveryTerms: "",
        generalTermsOption: "",
        generalTerms: "",
        totalNetAmount: "0.00",
      }));
      return;
    }
    const matchedRfq = rfqOptions.find((rfq) => rfq.rfq_no === formData.rfqNo);
    if (!matchedRfq) return;
    const matchedEstimation = estimationOptions.find((estimation) => estimation.rfq_no === matchedRfq.rfq_no);
    const estimationGrandTotal = Number(matchedEstimation?.grand_total || 0) * Number(currentConfig.conversionRate || 1);

    setFormData((prev) => ({
      ...prev,
      customerName: matchedRfq.company_name || matchedRfq.client_name || "",
      rfqDate: matchedRfq.registered_date || "",
      attentionName: matchedRfq.client_name || "",
      companyName: matchedRfq.company_name || "",
      email: matchedRfq.email || "",
      phoneNo: matchedRfq.phone_no || "",
      scopeNo: matchedRfq.rfq_no || "",
      scopeName: matchedRfq.project_title || matchedRfq.service_category || "",
      scopeSpecification: matchedRfq.fabric_specs || "",
      scopeRemarks: matchedRfq.scope_of_work || "",
      totalNetAmount: Number(estimationGrandTotal || 0).toFixed(currencyDecimals),
    }));
  }, [currencyDecimals, currentConfig.conversionRate, estimationOptions, formData.rfqNo, rfqOptions, termsOptions]);

  useEffect(() => {
    const selectedOption = termsOptions.find(
      (term) => term.termsCategory === "payment" && term.termsName === formData.paymentTermsOption
    );
    if (!selectedOption) return;
    setFormData((prev) => ({ ...prev, paymentTerms: selectedOption.termsContent || "" }));
  }, [formData.paymentTermsOption, termsOptions]);

  useEffect(() => {
    const selectedOption = termsOptions.find(
      (term) => term.termsCategory === "delivery" && term.termsName === formData.deliveryTermsOption
    );
    if (!selectedOption) return;
    setFormData((prev) => ({ ...prev, deliveryTerms: selectedOption.termsContent || "" }));
  }, [formData.deliveryTermsOption, termsOptions]);

  useEffect(() => {
    const selectedOption = termsOptions.find(
      (term) => term.termsCategory === "general" && term.termsName === formData.generalTermsOption
    );
    if (!selectedOption) return;
    setFormData((prev) => ({ ...prev, generalTerms: selectedOption.termsContent || "" }));
  }, [formData.generalTermsOption, termsOptions]);

  useEffect(() => {
    const validityDays = Number(String(formData.quoteValidity || "").replace(/\D/g, ""));
    if (!validityDays || !formData.quotationDate) return;
    const nextExpiry = addDaysToDate(formData.quotationDate, validityDays);
    setFormData((prev) => (prev.expiryDate === nextExpiry ? prev : { ...prev, expiryDate: nextExpiry }));
  }, [formData.quoteValidity, formData.quotationDate]);

  const handleSubmit = async () => {
    if (isViewMode) return;
    if (!formData.rfqNo.trim()) {
      setErrors({ rfqNo: "Required" });
      showToast("RFQ No is required", "error");
      return;
    }

    const payload = {
      customer_name: formData.customerName,
      quotation_code: formData.quotationCode,
      quotation_date: formData.quotationDate,
      expiry_date: formData.expiryDate || null,
      quote_validity: formData.quoteValidity,
      rfq_no: formData.rfqNo,
      rfq_date: formData.rfqDate || null,
      attention_name: formData.attentionName,
      company_name: formData.companyName,
      email: formData.email,
      phone_no: formData.phoneNo,
      scope_no: formData.scopeNo,
      scope_name: formData.scopeName,
      scope_specification: formData.scopeSpecification,
      scope_remarks: formData.scopeRemarks,
      payment_terms: formData.paymentTerms,
      delivery_terms: formData.deliveryTerms,
      general_terms: formData.generalTerms,
      currency_country: selectedCountry,
      currency_symbol: currentConfig.currency,
      conversion_rate: currentConfig.conversionRate,
      tax_rate: currentConfig.taxRate,
      decimal_places: currentConfig.decimalPlaces,
      taxable_amount: Number(formData.totalNetAmount || 0),
      tax_amount: 0,
      discount_amount: 0,
      subtotal: Number(formData.totalNetAmount || 0),
      round_off: 0,
      net_amount: Number(formData.totalNetAmount || 0),
      total_net_amount: Number(formData.totalNetAmount || 0),
      region: selectedCountry,
      items: [],
    };

    try {
      setSaving(true);
      const response = await fetch(buildApiUrl(isEditMode ? `/api/quotations/${editId}/` : "/api/quotations/"), {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        showToast("Failed to save quotation", "error");
        return;
      }

      const savedQuotation = await response.json().catch(() => null);
      showToast(isEditMode ? "Quotation updated successfully" : "Quotation saved successfully");
      if (!isEditMode && savedQuotation?.id) {
        router.replace(`/sales-services/quotation?editId=${savedQuotation.id}`);
      }
    } catch {
      showToast("Connection error while saving quotation", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppPageShell contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2">
        <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-6 text-[14px] text-slate-500 shadow-sm">
          Loading quotation...
        </div>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2">
      {toast ? (
        <div
          className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-lg px-5 py-3 text-white shadow-2xl ${
            toast.type === "error" ? "bg-red-500" : "bg-emerald-500"
          }`}
        >
          <span className="font-semibold">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)}>
            <X size={18} />
          </button>
        </div>
      ) : null}

      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[22px] font-bold text-black">Add Quotation</h2>

          <div className="flex gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCurrencyOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-orange-500"
                title="Change Currency"
              >
                <FaMoneyBillWave size={20} />
              </button>

              {isCurrencyOpen ? (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsCurrencyOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-gray-300 bg-white py-2 shadow-xl">
                    <div className="mb-1 border-b border-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Currency Region
                    </div>
                    {Object.keys(COUNTRY_CONFIG).map((country) => (
                      <button
                        key={country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setIsCurrencyOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                          selectedCountry === country
                            ? "bg-orange-50 font-bold text-orange-700"
                            : "text-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        <span>{country}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                          {COUNTRY_CONFIG[country].currency}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => router.push("/sales-services/quotation/list")}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-white text-blue-600"
              title="Quotation list"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <h3 className="mb-4 text-[18px] font-bold text-black">Quotation Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="mb-2 block text-[13px] font-semibold text-black">Quote No</label>
            <input
              value={formData.quotationCode}
              disabled
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#dfe3e8] px-3 text-[12px] font-semibold text-gray-700 outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-[13px] font-semibold text-black">Quote Date</label>
            <input
              type="date"
              value={formData.quotationDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, quotationDate: event.target.value }))}
              disabled={isViewMode}
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-[13px] font-semibold text-black">Expiry Date</label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(event) => setFormData((prev) => ({ ...prev, expiryDate: event.target.value }))}
              disabled={isViewMode}
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-white px-3 text-[12px] text-gray-700 outline-none disabled:bg-slate-100"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-2 block text-[13px] font-semibold text-black">Quote Validity</label>
            <div className="relative">
              <select
                value={formData.quoteValidity}
                onChange={(event) => setFormData((prev) => ({ ...prev, quoteValidity: event.target.value }))}
                disabled={isViewMode}
                className="h-[36px] w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 text-[12px] outline-none disabled:bg-slate-100"
              >
                <option value="">Choose Validity</option>
                {VALIDITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-8 top-1/2 h-5 w-px -translate-y-1/2 bg-gray-300" />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">v</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-2">
            <label className="mb-2 block text-[13px] font-semibold text-black">RFQ No</label>
            <div className="relative">
              <select
                value={formData.rfqNo}
                onChange={(event) => setFormData((prev) => ({ ...prev, rfqNo: event.target.value }))}
                disabled={isViewMode}
                className={`h-[36px] w-full appearance-none rounded-lg border px-3 pr-10 text-[12px] outline-none ${
                  errors.rfqNo ? "border-red-500" : "border-gray-300"
                } ${isViewMode ? "bg-slate-100" : "bg-white"}`}
              >
                <option value="">Select RFQ No</option>
                {rfqOptions.map((rfq) => (
                  <option key={rfq.id || rfq.rfq_no} value={rfq.rfq_no}>
                    {rfq.rfq_no}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-8 top-1/2 h-5 w-px -translate-y-1/2 bg-gray-300" />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">v</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-[13px] font-semibold text-black">RFQ Date</label>
            <input
              value={formData.rfqDate}
              readOnly
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-[13px] font-semibold text-black">Customer Name</label>
            <input
              value={formData.attentionName}
              readOnly
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-[13px] font-semibold text-black">Company Name</label>
            <input
              value={formData.companyName}
              readOnly
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-[13px] font-semibold text-black">Email</label>
            <input
              value={formData.email}
              readOnly
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-[13px] font-semibold text-black">Phone No</label>
            <input
              value={formData.phoneNo}
              readOnly
              className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
            />
          </div>
        </div>

        <h3 className="mt-8 mb-4 text-[18px] font-bold text-black">Scope Details</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          

          

       

          
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-cyan-200 bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-300 bg-[#f9fafb]">
                <th className="border-r border-gray-300 p-3 text-center text-[12px] font-semibold">No</th>
                <th className="border-r border-gray-300 p-3 text-[12px] font-semibold">Name</th>
                <th className="border-r border-gray-300 p-3 text-[12px] font-semibold">Specification</th>
                <th className="p-3 text-[12px] font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="border-r border-gray-300 p-3 text-center text-[13px]">1</td>
                <td className="border-r border-gray-300 p-3 text-[13px]">{formData.scopeName || "-"}</td>
                <td className="border-r border-gray-300 p-3 text-[13px]">{formData.scopeSpecification || "-"}</td>
                <td className="p-3 text-[13px]">{formData.scopeRemarks || "-"}</td>
              </tr>
              <tr className="bg-[#f8fafc] font-semibold">
                <td colSpan={3} className="border-r border-gray-300 p-3 text-right text-[12px]">
                  Total Net Amount
                </td>
                <td className="p-3 text-[12px] font-bold">
                  {currentConfig.currency} {formatCurrencyNumber(formData.totalNetAmount || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-cyan-200 bg-white">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 p-4">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-black">Payment Option</label>
              <div className="relative mb-3">
                <select
                  value={formData.paymentTermsOption}
                  onChange={(event) => setFormData((prev) => ({ ...prev, paymentTermsOption: event.target.value }))}
                  disabled={isViewMode}
                  className="h-[36px] w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 text-[12px] outline-none disabled:bg-slate-100"
                >
                  <option value="">Select Payment Option</option>
                  {termsOptions
                    .filter((term) => term.termsCategory === "payment")
                    .map((term) => (
                      <option key={term.termsName} value={term.termsName}>
                        {term.termsName}
                      </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute right-8 top-1/2 h-5 w-px -translate-y-1/2 bg-gray-300" />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">v</span>
              </div>
              <label className="mb-2 block text-[13px] font-semibold text-black">Payment Terms</label>
              <textarea
                value={formData.paymentTerms}
                onChange={(event) => setFormData((prev) => ({ ...prev, paymentTerms: event.target.value }))}
                disabled={isViewMode}
                className="h-32 w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-[12px] outline-none disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-black">Delivery Option</label>
              <div className="relative mb-3">
                <select
                  value={formData.deliveryTermsOption}
                  onChange={(event) => setFormData((prev) => ({ ...prev, deliveryTermsOption: event.target.value }))}
                  disabled={isViewMode}
                  className="h-[36px] w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 text-[12px] outline-none disabled:bg-slate-100"
                >
                  <option value="">Select Delivery Option</option>
                  {termsOptions
                    .filter((term) => term.termsCategory === "delivery")
                    .map((term) => (
                      <option key={term.termsName} value={term.termsName}>
                        {term.termsName}
                      </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute right-8 top-1/2 h-5 w-px -translate-y-1/2 bg-gray-300" />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">v</span>
              </div>
              <label className="mb-2 block text-[13px] font-semibold text-black">Delivery Terms</label>
              <textarea
                value={formData.deliveryTerms}
                onChange={(event) => setFormData((prev) => ({ ...prev, deliveryTerms: event.target.value }))}
                disabled={isViewMode}
                className="h-32 w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-[12px] outline-none disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-black">General Option</label>
              <div className="relative mb-3">
                <select
                  value={formData.generalTermsOption}
                  onChange={(event) => setFormData((prev) => ({ ...prev, generalTermsOption: event.target.value }))}
                  disabled={isViewMode}
                  className="h-[36px] w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-10 text-[12px] outline-none disabled:bg-slate-100"
                >
                  <option value="">Select General Option</option>
                  {termsOptions
                    .filter((term) => term.termsCategory === "general")
                    .map((term) => (
                      <option key={term.termsName} value={term.termsName}>
                        {term.termsName}
                      </option>
                    ))}
                </select>
                <span className="pointer-events-none absolute right-8 top-1/2 h-5 w-px -translate-y-1/2 bg-gray-300" />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">v</span>
              </div>
              <label className="mb-2 block text-[13px] font-semibold text-black">General Terms</label>
              <textarea
                value={formData.generalTerms}
                onChange={(event) => setFormData((prev) => ({ ...prev, generalTerms: event.target.value }))}
                disabled={isViewMode}
                className="h-32 w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-[12px] outline-none disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4">
          {!isViewMode ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="h-11 rounded-xl bg-green-500 px-6 text-[13px] font-bold text-white shadow disabled:opacity-70"
            >
              {saving ? "SAVING..." : isEditMode ? "UPDATE" : "SUBMIT"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push("/sales-services/quotation/list")}
            className="h-11 rounded-xl bg-orange-400 px-6 text-[13px] font-bold text-white shadow"
          >
            {isViewMode ? "BACK" : "CANCEL"}
          </button>
        </div>
        <p className="mt-3 text-right text-[12px] font-semibold text-red-500">
          Note: <span className="font-medium text-black">Fields marked with [ * ] are mandatory.</span>
        </p>
      </div>
    </AppPageShell>
  );
}
