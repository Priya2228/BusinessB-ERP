"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppPageShell from "../components/AppPageShell";
import MoneyWaveIcon from "../components/MoneyWaveIcon";
import { buildApiUrl } from "../utils/api";
import {
  ChevronDown,
  List,
} from "lucide-react";

const textInput =
  "h-[36px] w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400";
const selectInput =
  "h-[36px] w-full appearance-none rounded-[10px] border border-slate-300 bg-white px-3 text-[13px] text-slate-500 outline-none focus:border-sky-400";
const unitOptions = ["TON", "10", "5", "KG", "PCS"];
const COUNTRY_CONFIG = {
  India: { currency: "Rs.", code: "IN" },
  USA: { currency: "$", code: "USA" },
  Euro: { currency: "EUR", code: "EURO" },
  Oman: { currency: "OMR", code: "OMAN" },
  UAE: { currency: "AED", code: "UAE" },
  UK: { currency: "£", code: "UK" },
};

const resolveStoredCountry = () => {
  if (typeof window === "undefined") return "India";

  const rawCountry =
    localStorage.getItem("selectedCountry") ||
    localStorage.getItem("country") ||
    localStorage.getItem("countryCode") ||
    localStorage.getItem("country_code") ||
    "India";

  if (COUNTRY_CONFIG[rawCountry]) {
    return rawCountry;
  }

  const matchedCountry = Object.entries(COUNTRY_CONFIG).find(
    ([, config]) => config.code === String(rawCountry || "").toUpperCase()
  );

  return matchedCountry?.[0] || "India";
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-2 block text-[13px] font-semibold text-slate-800">
        {label}
        {hint ? <span className="ml-2 text-[11px] font-bold text-red-500">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

function SelectField({ placeholder, options = [], name, value, onChange }) {
  return (
    <div className="relative">
      <select 
        name={name}
        value={value}
        onChange={onChange}
        className={selectInput}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-11 my-auto h-5 w-px bg-slate-300" />
      <ChevronDown className="pointer-events-none absolute inset-y-0 right-3 my-auto text-slate-400" size={16} />
    </div>
  );
}

export default function MasterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const itemApiCandidates = [buildApiUrl("/api/items/"), buildApiUrl("/api/items")];
  
  // --- REFS AND STATE MOVED INSIDE COMPONENT ---
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [isEditing, setIsEditing] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [taxOptions, setTaxOptions] = useState([]);

  const [formData, setFormData] = useState({
    item_code: "ITEM06",
    unit: "",
    mrp: "",
    item_type: "",
    hsn_sac_code: "",
    purchase_price: "",
    item_name: "",
    tax: "",
    sales_price: "",
    item_category: "",
    part_no: "",
    item_group: "",
    batch_no: "",
    min_order_qty: "",
    min_stock_qty: "",
    description: "",
    is_stock: false,
    is_active: true,
    need_qc: false,
    need_service: false,
    need_warranty: false,
    need_serial_no: false,
    item_image: null,
  });

  const fetchFirstWorking = async (urls, options = {}) => {
    let lastError = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status !== 404) return response;
        lastError = new Error(`404 at ${url}`);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) throw lastError;
    throw new Error("Unable to reach items API");
  };

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      setFormData(prev => ({ ...prev, item_image: file }));
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    const data = new FormData();

    const requiredFields = [
      ["item_code", "Item Code"],
      ["item_name", "Item Name"],
      ["unit", "Unit"],
      ["item_type", "Item Type"],
      ["item_category", "Item Category"],
      ["item_group", "Item Group"],
      ["purchase_price", "Purchase Price"],
      ["sales_price", "Sales Price"],
    ];

    const missingField = requiredFields.find(([key]) => !String(formData[key] ?? "").trim());
    if (missingField) {
      alert(`${missingField[1]} is required.`);
      return;
    }
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "item_image") return;
      if (typeof value === "boolean") {
        data.append(key, String(value));
        return;
      }

      if (value !== null && value !== undefined && value !== "") {
        data.append(key, typeof value === "boolean" ? String(value) : value);
      }
    });

    data.append("country", selectedCountry);

    if (formData.item_image instanceof File) {
      data.append("item_image", formData.item_image);
    }

    try {
      let response = null;
      let lastError = null;

      const submitUrls = isEditing && editId
        ? itemApiCandidates.flatMap((baseUrl) => {
            const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
            return [`${normalized}${editId}/`, `${normalized}${editId}`];
          })
        : itemApiCandidates;

      for (const url of submitUrls) {
        try {
          response = await fetch(url, {
            method: isEditing && editId ? "PUT" : "POST",
            headers: {
              Accept: "application/json",
              Authorization: `Token ${token}`,
            },
            body: data,
          });

          if (response.ok) break;
          lastError = response;

          if (response.status !== 404) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw lastError || new Error("Connection to server failed.");
      }

      if (response.ok) {
        alert(isEditing ? "Item updated successfully!" : "Item saved successfully!");
        if (isEditing) {
          router.push("/itemlist");
        } else {
          const nextCodeResponse = await fetchFirstWorking(itemApiCandidates, {
            headers: {
              Accept: "application/json",
              Authorization: `Token ${token}`,
            },
          });
          const nextCodeData = await nextCodeResponse.json();
          const nextNumber =
            (Array.isArray(nextCodeData) ? nextCodeData : []).reduce((max, item) => {
              const match = String(item?.item_code || "").match(/(\d+)$/);
              return match ? Math.max(max, Number(match[1])) : max;
            }, 0) + 1;

          setFormData({
            item_code: `ITEM${String(nextNumber).padStart(2, "0")}`,
            unit: "",
            mrp: "",
            item_type: "",
            hsn_sac_code: "",
            purchase_price: "",
            item_name: "",
            tax: "",
            sales_price: "",
            item_category: "",
            part_no: "",
            item_group: "",
            batch_no: "",
            min_order_qty: "",
            min_stock_qty: "",
            description: "",
            is_stock: false,
            is_active: true,
            need_qc: false,
            need_service: false,
            need_warranty: false,
            need_serial_no: false,
            item_image: null,
          });
          setFileName("No file chosen");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      } else {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { status: response.status };
        }
        console.error("Server Error:", errorData);
        alert(
          errorData?.detail ||
            errorData?.item_code?.[0] ||
            errorData?.item_image?.[0] ||
            "Save failed. Check console for details."
        );
      }
    } catch (error) {
      alert("Connection to server failed.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setSelectedCountry(resolveStoredCountry());
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("selectedCountry", selectedCountry);
    localStorage.setItem("country", selectedCountry);
  }, [selectedCountry]);

  useEffect(() => {
    const loadTaxRules = async () => {
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({ country: selectedCountry || "India" });
        if (formData.item_category) {
          params.set("item_category", formData.item_category);
        }

        const response = await fetch(buildApiUrl(`/api/tax-rules/?${params.toString()}`), {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tax rules");
        }

        const data = await response.json();
        const nextOptions = Array.from(
          new Set(
            (Array.isArray(data?.tax_rules) ? data.tax_rules : [])
              .map((rule) => rule?.tax_label)
              .filter(Boolean)
          )
        );

        setTaxOptions(nextOptions);

        if (data?.selected_tax?.tax_label) {
          setFormData((prev) =>
            prev.tax === data.selected_tax.tax_label
              ? prev
              : { ...prev, tax: data.selected_tax.tax_label }
          );
        }
      } catch (error) {
        console.error(error);
        setTaxOptions([]);
      }
    };

    loadTaxRules();
  }, [selectedCountry, formData.item_category]);

  useEffect(() => {
    const loadItemForEdit = async () => {
      if (!editId) {
        setIsEditing(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const country = resolveStoredCountry();
        const response = await fetch(buildApiUrl(`/api/items/${editId}/?country=${country}`), {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });

        if (!response.ok) {
          throw new Error("Failed to fetch item");
        }

        const item = await response.json();
        setIsEditing(true);
        setFormData((prev) => ({
          ...prev,
          item_code: item.item_code || "",
          unit: item.unit || "",
          mrp: item.mrp || "",
          item_type: item.item_type || "",
          hsn_sac_code: item.hsn_sac_code || "",
          purchase_price: item.purchase_price || "",
          item_name: item.item_name || "",
          tax: item.tax || "",
          sales_price: item.sales_price || "",
          item_category: item.item_category || "",
          part_no: item.part_no || "",
          item_group: item.item_group || "",
          batch_no: item.batch_no || "",
          min_order_qty: item.min_order_qty || "",
          min_stock_qty: item.min_stock_qty || "",
          description: item.description || "",
          is_stock: Boolean(item.is_stock),
          is_active: Boolean(item.is_active),
          need_qc: Boolean(item.need_qc),
          need_service: Boolean(item.need_service),
          need_warranty: Boolean(item.need_warranty),
          need_serial_no: Boolean(item.need_serial_no),
          item_image: null,
        }));
        setFileName(item.item_image ? String(item.item_image).split("/").pop() : "No file chosen");
      } catch (error) {
        console.error(error);
      }
    };

    loadItemForEdit();
  }, [editId]);

  useEffect(() => {
    const loadNextItemCode = async () => {
      if (editId) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetchFirstWorking(itemApiCandidates, {
          headers: token ? { Authorization: `Token ${token}` } : {},
        });
        const data = await response.json();
        const nextNumber =
          (Array.isArray(data) ? data : []).reduce((max, item) => {
            const match = String(item?.item_code || "").match(/(\d+)$/);
            return match ? Math.max(max, Number(match[1])) : max;
          }, 0) + 1;

        setFormData((prev) => ({
          ...prev,
          item_code: `ITEM${String(nextNumber).padStart(2, "0")}`,
        }));
      } catch (error) {
        console.error(error);
      }
    };

    loadNextItemCode();
  }, [editId]);

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
    >
            <div className="mt-3 rounded-[24px] border border-slate-300 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between px-6 py-6">
                <h1 className="text-[18px] font-bold text-slate-900">{isEditing ? "Edit Item" : "Add Item"}</h1>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCurrencyOpen((prev) => !prev)}
                      className="h-10 w-10 rounded-md border border-gray-300 bg-white flex items-center justify-center"
                      title="Change Currency & Tax"
                    >
                      <MoneyWaveIcon className="text-[20px]" />
                    </button>

                    {isCurrencyOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsCurrencyOpen(false)}
                        />
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
                    )}
                  </div>
                  <button
                    onClick={() => router.push("/itemlist")}
                    className="h-10 w-10 bg-white border border-blue-500 text-blue-600 rounded-md flex items-center justify-center"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-8">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-3">
                  <Field label="Item Code">
                    <input 
  name="item_code" 
  className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#dfe3e8] px-3 text-[12px] font-semibold text-gray-700 outline-none cursor-not-allowed" 
  value={formData.item_code} 
  readOnly 
/>
                  </Field>
                  <Field label="Unit">
                    <SelectField name="unit" placeholder="Choose Unit" options={unitOptions} value={formData.unit} onChange={handleInputChange} />
                  </Field>
                  <Field label="MRP">
                    <input name="mrp" className={textInput} placeholder="Enter Amount" value={formData.mrp} onChange={handleInputChange} />
                  </Field>

                  <Field label="Item Type">
                    <SelectField name="item_type" placeholder="Choose Item Type" options={["Product", "Raw Materials","Spares", "Consumable"]} value={formData.item_type} onChange={handleInputChange} />
                  </Field>
                  <Field label="HSN & SAC Code">
                    <input name="hsn_sac_code" className={textInput} placeholder="Enter HSN & SAC Code" value={formData.hsn_sac_code} onChange={handleInputChange} />
                  </Field>
                  <Field label="Purchase Price">
                    <input name="purchase_price" className={textInput} placeholder="Enter Price" value={formData.purchase_price} onChange={handleInputChange} />
                  </Field>

                  <Field label="Item Name">
                    <input name="item_name" className={textInput} placeholder="Enter Item Name" value={formData.item_name} onChange={handleInputChange} />
                  </Field>
                  <Field label="Tax">
                    <SelectField name="tax" placeholder="Choose Tax" options={taxOptions} value={formData.tax} onChange={handleInputChange} />
                  </Field>
                  <Field label="Sales Price">
                    <input name="sales_price" className={textInput} placeholder="Enter Price" value={formData.sales_price} onChange={handleInputChange} />
                  </Field>

                  <Field label="Item Category Name">
                    <SelectField name="item_category" placeholder="Choose Item Category" options={["Bought-out", "Manufactures"]} value={formData.item_category} onChange={handleInputChange} />
                  </Field>
                  <Field label="Part No">
                    <input name="part_no" className={textInput} placeholder="Enter Part No" value={formData.part_no} onChange={handleInputChange} />
                  </Field>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 pt-7 text-[13px] text-slate-800">
                    {[
                      { label: "Is Stock", key: "is_stock" },
                      { label: "Is Active", key: "is_active" },
                      { label: "Need QC", key: "need_qc" },
                      { label: "Need Service", key: "need_service" },
                      { label: "Need Warranty", key: "need_warranty" },
                      { label: "Need Serial No", key: "need_serial_no" },
                    ].map((item) => (
                      <label key={item.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={item.key}
                          checked={formData[item.key]}
                          onChange={handleInputChange}
                          className="h-[15px] w-[15px] rounded border accent-blue-500"
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  <Field label="Item Group">
                    <SelectField name="item_group" placeholder="Choose Item Group" options={["Sales", "Non-Sales", "Both", "Production Based","Customer Based","bricks","Rubber"]} value={formData.item_group} onChange={handleInputChange} />
                  </Field>
                  <Field label="Batch No">
                    <input name="batch_no" className={textInput} placeholder="Enter Batch No" value={formData.batch_no} onChange={handleInputChange} />
                  </Field>
                  <Field label="Minimum Order Qty">
                    <input name="min_order_qty" className={textInput} placeholder="Enter Minimum Order Qty" value={formData.min_order_qty} onChange={handleInputChange} />
                  </Field>

                  <Field label="Minimum Stock Qty">
                    <input name="min_stock_qty" className={textInput} placeholder="Enter Minimum Stock Qty" value={formData.min_stock_qty} onChange={handleInputChange} />
                  </Field>
                  
                  <Field label="Item Image" hint="[JPG/JPEG]">
                    <div className="flex h-[36px] items-center rounded-[10px] border border-slate-300 bg-white px-3 text-[13px] text-slate-600">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".jpg,.jpeg"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={triggerFileSelect}
                        className="mr-3 rounded border border-slate-500 bg-slate-100 px-3 py-1 text-[13px] text-slate-900 hover:bg-slate-200 transition"
                      >
                        Choose File
                      </button>
                      <span className="truncate flex-1">
                        {fileName}
                      </span>
                    </div>
                  </Field>

                  <Field label="Item Description">
                    <textarea name="description" value={formData.description} onChange={handleInputChange} className="h-[54px] w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400 focus:border-sky-400" placeholder="Write here" />
                  </Field>
                </div>

                <div className="mt-14 flex items-center gap-3">
                  <button onClick={handleSubmit} className="rounded-[10px] bg-[#34b556] px-6 py-3 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(52,181,86,0.25)]">{isEditing ? "UPDATE" : "SUBMIT"}</button>
                  <button className="rounded-[10px] bg-[#ff9533] px-6 py-3 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(255,149,51,0.25)]">CANCEL</button>
                </div>

                <div className="mt-3 text-right text-[13px] font-semibold">
                  <span className="text-red-500">Note:</span> <span className="text-slate-700">Fields marked with [ ] are mandatory.</span>
                </div>
              </div>
            </div>
    </AppPageShell>
  );
}
