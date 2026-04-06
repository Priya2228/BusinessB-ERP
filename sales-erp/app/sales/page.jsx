"use client"

import { useState, useEffect, useMemo } from "react";
import Sidebar, { AppFooter, AppHeader } from "../components/Sidebar";
import { List, Pencil, Trash2, X } from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/navigation";
import { FaMoneyBillWave } from 'react-icons/fa';
import {
  APP_EVENTS,
  getLinePricing,
  parseNumber,
  persistInventoryAlerts,
  persistOpeningStockBalances,
  persistOpeningStockRows,
  persistSalesRuleRecords,
  readOpeningStockBalances,
  readOpeningStockRows,
} from "../utils/businessRules";
import { buildApiUrl } from "../utils/api";

const updateOpeningStockQuantity = (rows, itemCode, quantityDelta) =>
  rows.map((row) =>
    String(row.item_code || "").trim() === String(itemCode || "").trim()
      ? {
          ...row,
          quantity: Math.max(0, parseNumber(row.quantity) + parseNumber(quantityDelta)),
        }
      : row
  );

export default function SalesInvoice() {
    const [selectedTermsType, setSelectedTermsType] = useState("");
  const router = useRouter();
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  
 const COUNTRY_CONFIG = {
  India: { currency: "Rs.", taxRate: 0.18, symbol: "INR", conversionRate: 1, decimalPlaces: 2 },
  USA: { currency: "$", taxRate: 0.08, symbol: "USD", conversionRate: 0.012, decimalPlaces: 2 },
  Euro: { currency: "€", taxRate: 0.20, symbol: "EUR", conversionRate: 0.011, decimalPlaces: 2 },
  Oman: { currency: "OMR", taxRate: 0.05, symbol: "OMR", conversionRate: 0.0046, decimalPlaces: 3 },
  UAE: { currency: "AED", taxRate: 0.05, symbol: "AED", conversionRate: 0.044, decimalPlaces: 2 },
  UK: { currency: "£", taxRate: 0.20, symbol: "GBP", conversionRate: 0.0093, decimalPlaces: 2 }
};
// 1. Add this state
const [selectedCountry, setSelectedCountry] = useState("India");

useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  setOpeningStockRows(readOpeningStockRows());
}, [router]);

useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) return;

  const loadItems = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/items/"), {
        headers: { Authorization: `Token ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to load items: ${response.status}`);
      }

      const data = await response.json();
      setItemOptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("loadItems error:", error);
      setItemOptions([]);
    }
  };

  loadItems();
}, []);

useEffect(() => {
  const syncOpeningStockRows = () => {
    setOpeningStockRows(readOpeningStockRows());
  };

  window.addEventListener("focus", syncOpeningStockRows);
  window.addEventListener("storage", syncOpeningStockRows);
  window.addEventListener(APP_EVENTS.inventoryUpdated, syncOpeningStockRows);

  return () => {
    window.removeEventListener("focus", syncOpeningStockRows);
    window.removeEventListener("storage", syncOpeningStockRows);
    window.removeEventListener(APP_EVENTS.inventoryUpdated, syncOpeningStockRows);
  };
}, []);

// 2. Update your calculation logic (Subtotal/Tax) to be dynamic
const currentConfig = COUNTRY_CONFIG[selectedCountry];
const convertFromBase = (amount) => amount * currentConfig.conversionRate;
const currencyDecimals = currentConfig.decimalPlaces ?? 2;
const roundToCurrency = (amount) => {
  const factor = 10 ** currencyDecimals;
  return Math.round(amount * factor) / factor;
};
const formatCurrencyNumber = (amount) => Number(amount || 0).toFixed(currencyDecimals);
const getLineBaseValues = (rec) => {
  const quantity = Number(rec.quantity || 0);
  const rate = Number(rec.rate || 0);
  const discountPercent = Number(rec.discount_percent || 0);
  const taxable = quantity * rate;
  const discountAmount = taxable * (discountPercent / 100);
  const taxableAfterDiscount = taxable - discountAmount;

  return {
    quantity,
    rate,
    discountPercent,
    taxable,
    discountAmount,
    taxableAfterDiscount
  };
};
  // --- 1. State Declarations ---
  const [ledger, setLedger] = useState("");
  const [billType, setBillType] = useState("");
  const [records, setRecords] = useState([]);
  const [openingStockRows, setOpeningStockRows] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState('form');
const [dispatchHistory, setDispatchHistory] = useState([]);
const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
const [invoiceCode, setInvoiceCode] = useState("SI-1003"); 

  const [itemInput, setItemInput] = useState({
    itemCode: "",
    itemName: "",
    itemCategory: "",
    unit: "",
    quantity: "",
    rate: "9.0",
    discount: "0",
    description: ""
  });
  const [dispatch, setDispatch] = useState({
    supRef: "",
    docNo: "",
    through: "",
    destination: "",
    creditDays: "",
    remarks: ""
  });

  const selectedStockRow = useMemo(
    () =>
      openingStockRows.find(
        (row) =>
          String(row.item_code || "") === String(itemInput.itemCode || "") ||
          String(row.item_name || "") === String(itemInput.itemName || "")
      ) || null,
    [openingStockRows, itemInput.itemCode, itemInput.itemName]
  );

  const itemDropdownOptions = useMemo(() => {
    if (itemOptions.length > 0) {
      return itemOptions;
    }

    return openingStockRows.map((row) => ({
      item_id: row.item_id || row.id || row.item_code,
      item_code: row.item_code || "",
      item_name: row.item_name || "",
      item_category: row.item_category || "",
      unit: row.unit || "",
      sales_price: row.sales_price || "",
    }));
  }, [itemOptions, openingStockRows]);

  // --- 2. Dynamic Summary Calculations ---
const totalTaxableBase = records.reduce((sum, rec) => sum + getLineBaseValues(rec).taxable, 0);

const totalDiscountBase = records.reduce((sum, rec) => sum + getLineBaseValues(rec).discountAmount, 0);
const taxableAfterDiscountBase = totalTaxableBase - totalDiscountBase;

const totalTaxable = convertFromBase(totalTaxableBase);
const totalDiscount = convertFromBase(totalDiscountBase);
const taxableAfterDiscount = convertFromBase(taxableAfterDiscountBase);
const totalTaxBase = records.reduce((sum, rec) => sum + Number(rec.tax_amount || 0), 0);
const totalTax = convertFromBase(totalTaxBase);
const subtotal = taxableAfterDiscount + totalTax;
const netAmount = roundToCurrency(subtotal);
const roundOff = formatCurrencyNumber(netAmount - subtotal);
 


  // --- 3. Toast Helper ---
  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 4. Effects ---
 // Add this inside your component
 // Add this line near line 11
 // Define the type for the terms object
// 1. Define the interface with an index signature
// 2. Apply the interface to your constant
const [selectedTermsContent, setSelectedTermsContent] = useState("");
const TERMS_DATA = {
  Payment: 
`1. PAYMENT SCHEDULE AND FINANCIAL OBLIGATIONS
 Advance Requirement: A non-refundable advance of 50% of the total order value is mandatory to initiate raw material procurement and production scheduling.
 Stage Payment: 30% of the total invoice value shall be payable upon completion of production and notification of readiness for dispatch.
 Final Settlement: The remaining 20% must be cleared within 7 working days from the date of delivery.
 Late Fee: Interest at 18% per annum will be charged on all outstanding balances beyond the due date, calculated daily.

2. TAXATION AND GST COMPLIANCE
GST Charges: All prices are exclusive of GST. GST at 5% or 12% (as applicable to textiles) will be added to the final invoice.
Statutory Changes: Any change in tax rates by the Government of India during the contract period will be passed on to the Buyer.
GST Credit: Fashion World will upload invoices to the GST portal only upon receipt of full payment.

3. DEFAULT AND LEGAL RECOURSE
Lien on Goods: Fashion World retains a purchase money security interest in all goods until the purchase price is paid in full.
Debt Recovery: In the event of non-payment exceeding 30 days, the Buyer agrees to pay all collection costs, including legal fees.
Jurisdiction: All financial disputes are subject to the exclusive jurisdiction of the courts in Tiruppur, Tamil Nadu.

4. BANKING AND TRANSACTION SECURITY
Payment Mode: Payments must be made via RTGS/NEFT/IMPS. Bank details: Punjab National Bank, A/C: 4402 0087 0004 4467.
Cash Policy: Transactions in cash exceeding â‚¹2,00,000 are strictly prohibited as per Income Tax Act Section 269ST.
Verification: Please verify bank details via official phone channels before making large transfers to prevent cyber-fraud.`,

  Standard: 
`1. SHIPPING AND LOGISTICS PROTOCOLS
 Delivery Terms: All dispatches are "Ex-Works" (Tiruppur) unless a separate "FOR Destination" agreement is signed.
 Loading Charges: Standard loading at our warehouse is included. Specialized crating or palletizing will be charged extra.
 Transporter Selection: The Buyer must nominate a preferred transporter. If not nominated, Fashion World will select a carrier at the Buyer's risk.

2. RISK AND TITLE TRANSFER
Risk of Loss: The risk of loss or damage passes to the Buyer the moment the goods leave our warehouse premises.
Insurance: Transit insurance is the sole responsibility of the Buyer. We recommend "All-Risk" coverage for high-value fabric shipments.
Title Transfer: Legal title to the goods remains with Fashion World until the delivery receipt is signed and payment is realized.

3. INSPECTION AND SHORTAGES
Arrival Inspection: The Buyer must verify the number of bales/cartons against the Lorry Receipt (LR) upon arrival.
Shortage Claims: Any discrepancy in quantity or visible packing damage must be endorsed on the LR and reported within 24 hours.
Hidden Defects: Claims for manufacturing defects must be submitted in writing with photographic evidence within 7 days of receipt.

4. DELAYS AND FORCE MAJEURE
Lead Times: Delivery dates provided are estimates. Fashion World is not liable for delays caused by logistics providers or port congestion.
Force Majeure: Neither party is liable for failure to perform due to strikes, power shortages, or government-imposed lockdowns in Tiruppur.
Storage Fees: If the Buyer fails to take delivery within 10 days of readiness notification, a storage fee of â‚¹500/day per pallet will apply.`
};



useEffect(() => {
  fetchRecords(); // Keep your existing fetch

  // Auto-load text from our object into the state
  if (selectedTermsType && TERMS_DATA[selectedTermsType]) {
    setSelectedTermsContent(TERMS_DATA[selectedTermsType]);
  } else {
    setSelectedTermsContent("");
  }
}, [selectedTermsType]);
  // Function to fetch full invoice history
const fetchDispatchHistory = async () => {
  try {
    const response = await fetch(buildApiUrl("/api/dispatch-details/"));
    if (response.ok) {
      const data = await response.json();
      setDispatchHistory(data);
      setView('list'); // Switch view after fetching
    }
  } catch (error) {
    showToast("Failed to fetch history", "error");
  }
};
const handleDelete = async (id) => {
  const recordToDelete = records.find((r) => r.id === id);

  // 1. Optimistic Update: Remove from UI immediately
  setRecords(records.filter((r) => r.id !== id));

  try {
    // 2. Persistent Update: Delete from Database
    const response = await fetch(buildApiUrl(`/api/invoice-items/${id}/`), {
      method: "DELETE",
    });

    if (response.ok) {
      if (recordToDelete) {
        const restoredStock = updateOpeningStockQuantity(
          openingStockRows,
          recordToDelete.item_code,
          Number(recordToDelete.quantity || 0)
        );
        const existingBalances = readOpeningStockBalances();
        const balanceRow = restoredStock.find(
          (row) => String(row.item_code || "").trim() === String(recordToDelete.item_code || "").trim()
        );
        if (balanceRow) {
          existingBalances[String(balanceRow.item_id ?? balanceRow.id ?? balanceRow.item_code)] = Number(balanceRow.quantity || 0);
          persistOpeningStockBalances(existingBalances);
        }
        setOpeningStockRows(restoredStock);
        persistOpeningStockRows(restoredStock);
        persistInventoryAlerts({
          openingRows: restoredStock,
          salesRecords: records.filter((r) => r.id !== id),
        });
      }
      showToast("Item deleted from database", "success");
    } else {
      // If server fails, refresh records to bring back the item in UI
      fetchRecords();
      showToast("Could not delete from server", "error");
    }
  } catch (error) {
    fetchRecords();
    showToast("Network error", "error");
  }
};

  // --- 5. API Functions ---
  const fetchRecords = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/invoice-items/"));
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setRecords(data);
      persistSalesRuleRecords(Array.isArray(data) ? data : []);
      persistInventoryAlerts({
        openingRows: readOpeningStockRows(),
        salesRecords: Array.isArray(data) ? data : [],
      });
    } catch (error) {
      console.error("fetchRecords error:", error);
    }
  };

const handleEditInitiate = (rec) => {
    setEditingId(rec.id);
    
    // Ensure these master fields are updated
    if (rec.ledger) setLedger(rec.ledger);
    if (rec.bill_type) setBillType(rec.bill_type);

    setItemInput({
      itemCode: rec.item_code || "",
      itemName: rec.item_name || "", 
      itemCategory: rec.item_category || "",
      unit: rec.unit || "5 unit",
      quantity: rec.quantity?.toString() || "",
      rate: rec.rate?.toString() || "",
      discount: rec.discount_percent?.toString() || "0",
      description: rec.description || ""
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

 const handleAddItem = async () => {
  let newErrors = {};

  if (!ledger) newErrors.ledger = "Required";
    if (!billType) newErrors.billType = "Required";

    if (!itemInput.itemCode.trim()) {
      newErrors.itemCode = "Required";
    }

  // 2. Item Name: Required
  if (!itemInput.itemName) newErrors.itemName = "Required";

  // 3. Description: Required
  if (!itemInput.description.trim()) newErrors.description = "Required";

  // 4. Quantity: Required + Limit 200
  const q = parseFloat(itemInput.quantity);
  if (!itemInput.quantity || itemInput.quantity.trim() === "") {
    newErrors.quantity = "Required";
  } else if (isNaN(q) || q <= 0 || q > 200) {
    newErrors.quantity = "Limit: 1-200";
  } else if (selectedStockRow && q > Number(selectedStockRow.quantity || 0)) {
    newErrors.quantity = "Exceeds stock";
  }

  // 5. Rate: Required
  const r = parseFloat(itemInput.rate);
  if (!itemInput.rate || itemInput.rate.trim() === "") {
    newErrors.rate = "Required";
  } else if (isNaN(r) || r < 0) {
    newErrors.rate = "Invalid Rate";
  }

  // 6. Discount: Required + 0-100 limit
  const d = parseFloat(itemInput.discount);
  if (!itemInput.discount || itemInput.discount.trim() === "") {
    newErrors.discount = "Required";
  } else if (isNaN(d) || d < 0 || d > 100) {
    newErrors.discount = "Max 100%";
  }

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    showToast("Please check the highlighted fields", "error");
    return;
  }
    // If validation passes, clear errors and proceed
    setErrors({});
    
    // Calculations
    const pricing = getLinePricing({
      quantity: q,
      rate: r,
      discountPercent: d,
      itemCategory: itemInput.itemCategory || selectedStockRow?.item_category || "",
      region: selectedCountry,
      fallbackTaxRate: currentConfig.taxRate,
    });

    const itemCategory = itemInput.itemCategory || selectedStockRow?.item_category || "";
    const payload = {
      item_code: itemInput.itemCode,
      item_name: itemInput.itemName,
      item_category: itemCategory,
      region: selectedCountry,
      unit: itemInput.unit,
      quantity: q,
      rate: r,
      discount_percent: d,
      tax_amount: Number(pricing.taxAmount.toFixed(2)),
      amount: Number(pricing.amount.toFixed(2)),
      description: itemInput.description,
      ledger: ledger,
      bill_type: billType,
    };

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId 
        ? buildApiUrl(`/api/invoice-items/${editingId}/`) 
        : buildApiUrl("/api/invoice-items/");

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        if (!editingId) {
          const updatedStock = updateOpeningStockQuantity(
            openingStockRows,
            payload.item_code,
            -q
          );
          const existingBalances = readOpeningStockBalances();
          const balanceRow = updatedStock.find(
            (row) => String(row.item_code || "").trim() === String(payload.item_code || "").trim()
          );
          if (balanceRow) {
            existingBalances[String(balanceRow.item_id ?? balanceRow.id ?? balanceRow.item_code)] = Number(balanceRow.quantity || 0);
            persistOpeningStockBalances(existingBalances);
          }
          setOpeningStockRows(updatedStock);
          persistOpeningStockRows(updatedStock);

          setItemInput({
            itemCode: payload.item_code,
            itemName: payload.item_name,
            itemCategory: itemCategory,
            unit: payload.unit,
            quantity: "",
            rate: payload.rate?.toString() || "9.0",
            discount: payload.discount_percent?.toString() || "0",
            description: "",
          });
        }

        await fetchRecords();
        if (editingId) {
          setItemInput({
            itemCode: "", itemName: "", itemCategory: "", unit: "",
            quantity: "", rate: "9.0", discount: "0", description: ""
          });
        }
        setEditingId(null);
        showToast(editingId ? "Item updated successfully!" : "Item added successfully!", "success");
      } else {
        showToast("Server Validation Failed", "error");
      }
    } catch (error) {
      showToast("Network Error: Could not reach server", "error");
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(20, 158, 136); 
    doc.text("SALES INVOICE", 105, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.text(`Invoice No: SI03`, 14, 25);
    doc.text(`Date: 16-03-2026`, 14, 30);
    doc.text(`Ledger: ${ledger || 'N/A'}`, 14, 35);
    doc.text(`Bill Type: ${billType || 'N/A'}`, 14, 40);

    doc.text(`Supplier Ref: ${dispatch.supRef || 'N/A'}`, 120, 25);
    doc.text(`Dispatch Via: ${dispatch.through || 'N/A'}`, 120, 30);
    doc.text(`Destination: ${dispatch.destination || 'N/A'}`, 120, 35);
    doc.text(`Credit Days: ${dispatch.creditDays || '0'}`, 120, 40);

    autoTable(doc, {
      startY: 50,
      head: [['#', 'Code', 'Item Name', 'Qty', 'Rate', 'Disc%', 'Tax', 'Total']],
      body: records.map((r, i) => [
        i + 1,
        r.item_code,
        r.item_name,
        r.quantity,
        formatCurrencyNumber(convertFromBase(Number(r.rate || 0))),
        `${r.discount_percent}%`,
        formatCurrencyNumber(convertFromBase(Number(r.amount || 0)) * currentConfig.taxRate),
        formatCurrencyNumber(convertFromBase(Number(r.amount || 0)))
      ]),
      headStyles: { fillColor: [20, 158, 136] },
      theme: 'grid'
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Taxable Amount:`, 130, finalY);
    doc.text(`${currentConfig.currency} ${formatCurrencyNumber(totalTaxable)}`, 180, finalY, { align: 'right' });
    
    doc.text(`Tax Amount (${currentConfig.taxRate * 100}%):`, 130, finalY + 6);
    doc.text(`${currentConfig.currency} ${formatCurrencyNumber(totalTax)}`, 180, finalY + 6, { align: 'right' });
    
    doc.text(`Discount Amount:`, 130, finalY + 12);
    doc.setTextColor(255, 0, 0);
    doc.text(`- ${currentConfig.currency} ${formatCurrencyNumber(totalDiscount)}`, 180, finalY + 12, { align: 'right' });
    
    doc.setTextColor(40);
    doc.text(`Subtotal:`, 130, finalY + 18);
    doc.text(`${currentConfig.currency} ${formatCurrencyNumber(subtotal)}`, 180, finalY + 18, { align: 'right' });

    doc.text(`Round Off:`, 130, finalY + 24);
    doc.text(`${currentConfig.currency} ${roundOff}`, 180, finalY + 24, { align: 'right' });

    doc.setFontSize(14);
    doc.setTextColor(20, 158, 136);
    doc.text(`Net Amount: ${currentConfig.currency} ${formatCurrencyNumber(netAmount)}`, 180, finalY + 34, { align: 'right' });

    doc.save(`Invoice_${ledger || 'Sales'}_${Date.now()}.pdf`);
  };

  const handleFinalSubmit = async () => {
    if (records.length === 0) return showToast("No items found", "error");

   const dispatchPayload = {
    region: selectedCountry,
    sup_ref: dispatch.supRef,
    dispatch_docno: dispatch.docNo,
    dispatch_through: dispatch.through,
    destination: dispatch.destination,
    credit_days: parseInt(dispatch.creditDays) || 0,
    quantity: records.reduce((s, r) => s + parseFloat(r.quantity), 0),
    rate: totalTaxable / (records.length || 1),
    tax_amount: totalTax,
    amount: netAmount,
    description: dispatch.remarks,
    ledger: ledger,
    // --- Added Terms Content ---
    terms_conditions: selectedTermsContent, 
    terms_type: selectedTermsType ,
    items: records.map(r => ({
        item_code: r.item_code,
        item_name: r.item_name,
        item_category: r.item_category || "",
        region: selectedCountry,
        unit: r.unit,
        quantity: parseFloat(r.quantity),
        rate: parseFloat(r.rate),
        tax_amount: parseFloat(r.tax_amount),
        amount: parseFloat(r.amount),
        description: r.description,
        discount_percent: parseFloat(r.discount_percent || 0)
    }))
  };

    try {
      const response = await fetch(buildApiUrl("/api/dispatch-details/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchPayload),
      });

      if (response.ok) {
        let savedDispatch = null;
        try {
          savedDispatch = await response.json();
        } catch {
          savedDispatch = null;
        }

        if (typeof window !== "undefined") {
          const storageKey = "salesInvoiceCurrencyMap";
          const existingRaw = localStorage.getItem(storageKey);
          let existingMap = {};

          try {
            existingMap = existingRaw ? JSON.parse(existingRaw) : {};
          } catch {
            existingMap = {};
          }

          const invoiceKey = String(savedDispatch?.dispatch_docno || dispatch.docNo || "").trim();
          if (invoiceKey) {
            existingMap[invoiceKey] = {
              country: selectedCountry,
              currency: currentConfig.currency,
              conversionRate: currentConfig.conversionRate,
              taxRate: currentConfig.taxRate,
              decimalPlaces: currentConfig.decimalPlaces
            };
            localStorage.setItem(storageKey, JSON.stringify(existingMap));
          }
        }

        generatePDF();
        showToast("Invoice Saved & PDF Exported", "success");
      } else {
        const err = await response.json();
        console.error("DB Error:", err);
        showToast("Failed to save to database", "error");
      }
    } catch (e) { 
      showToast("Connection Error", "error"); 
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-800">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
      <AppHeader />
      <div className="w-full flex-1">

      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-5 py-3 rounded-lg shadow-2xl text-white transition-all transform animate-bounce ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          <span className="font-bold">{toast.message}</span>
          <button onClick={() => setToast(null)}><X size={18} /></button>
        </div>
      )}

      <div className="mx-auto max-w-[1240px] px-2 py-2">
        <div className="mt-3 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-5">
            <h2 className="text-[22px] font-bold text-black">Add Sales Invoice</h2>
            
            <div className="flex gap-2">
              <div className="relative">
  {/* The Icon Button - Now using FaMoneyBillWave in Orange */}
  <button 
    onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
    className="h-10 w-10 bg-white border border-gray-300 rounded-md flex items-center justify-center text-orange-500"
    title="Change Currency & Tax"
  >
    <FaMoneyBillWave size={20} />
  </button>

  {/* The Floating Dropdown Menu */}
  {isCurrencyOpen && (
    <>
      <div 
        className="fixed inset-0 z-10" 
        onClick={() => setIsCurrencyOpen(false)} 
      />
      
      <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-md shadow-xl z-20 py-2">
        <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
          Currency Region
        </div>
        {Object.keys(COUNTRY_CONFIG).map((country) => (
          <button
            key={country}
            onClick={() => {
              setSelectedCountry(country);
              setIsCurrencyOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-sm flex justify-between items-center ${
              selectedCountry === country 
                ? 'bg-orange-50 text-orange-700 font-bold'
                : 'text-slate-700 hover:bg-gray-50'
            }`}
          >
            <span>{country}</span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600">
              {COUNTRY_CONFIG[country].currency}
            </span>
          </button>
        ))}
      </div>
    </>
  )}
</div>
              <button
                onClick={() => router.push("/list")}
                className="h-10 w-10 bg-white border border-blue-500 text-blue-600 rounded-md flex items-center justify-center"
                title="Sales list"
              >
                <List size={18} />
              </button>
            </div>
          </div>

         {/* Master Fields */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
  {/* Ledger Selection */}
  <div className="md:col-span-3">
    <label className="block text-[12px] font-semibold mb-2 text-black">Ledger</label>
    <div className="relative">
      <select
        value={ledger}
        onChange={(e) => setLedger(e.target.value)}
        className={`h-[36px] w-full rounded-lg border ${errors.ledger ? 'border-red-500' : 'border-gray-300'} bg-white pl-3 pr-10 text-[12px] text-gray-600 appearance-none outline-none`}
      >
        <option value="">Choose Ledger</option>
        <option value="Priya">Priya - [RETAIL]</option>
        <option value="Ramya">Ramya - [WHOLESALE]</option>
        <option value="General_Cash">General Cash Customer</option>
      </select>
      <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 h-5 w-px bg-gray-300" />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
    </div>
    {errors.ledger && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.ledger}</p>}
  </div>

  {/* Bill Type Selection */}
  <div className="md:col-span-3">
    <label className="block text-[12px] font-semibold mb-2 text-black">Bill Type</label>
    <div className="relative">
      <select
        value={billType}
        onChange={(e) => setBillType(e.target.value)}
        className={`h-[36px] w-full rounded-lg border ${errors.billType ? 'border-red-500' : 'border-gray-300'} bg-white pl-3 pr-10 text-[12px] text-gray-600 appearance-none outline-none`}
      >
        <option value="">Choose Bill Type</option>
        <option value="Cash">CashBill</option>
        <option value="Credit">CreditBill</option>
      </select>
      <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 h-5 w-px bg-gray-300" />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
    </div>
    {errors.billType && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.billType}</p>}
  </div>

  {/* Date Picker (Replaced ReadOnly with Interactive Picker) */}
  <div className="md:col-span-2">
    <label className="block text-[12px] font-semibold mb-2 text-black">Date</label>
    <input 
      type="date"
      value={invoiceDate}
      onChange={(e) => setInvoiceDate(e.target.value)}
      className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#e6e8eb] px-3 text-[12px] text-gray-700 outline-none"
    />
  </div>

  {/* Code (Read Only System Field) */}
  <div className="md:col-span-2">
    <label className="block text-[12px] font-semibold mb-2 text-black">Code</label>
    <input 
      className="h-[36px] w-full rounded-lg border border-gray-300 bg-[#dfe3e8] px-3 text-[12px] font-semibold text-gray-700"
      value={invoiceCode} 
      readOnly 
      disabled
    />
  </div>
</div>
          <h3 className="mt-6 text-[18px] font-bold text-black">{editingId ? "Edit Item Details" : "Item Details"}</h3>

          {/* Item Inputs */}
          <div className="mt-4 space-y-4">
           {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-[12px] font-semibold mb-2 text-black">Item Code</label>
          <input 
            className={`h-12 w-full rounded-xl border ${errors.itemCode ? 'border-red-500' : 'border-gray-300'} bg-[#e6e8eb] px-4 text-[12px] outline-none`} 
            value={itemInput.itemCode} 
            readOnly
          />
          {errors.itemCode && <p className="text-red-500 text-xs mt-1">{errors.itemCode}</p>}
        </div>

        <div className="md:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[12px] font-semibold text-black">Item Name</label>
            <label className="block text-[13px] font-semibold text-black whitespace-nowrap">Avl.Qty: <span className="text-red-600">{selectedStockRow ? selectedStockRow.quantity : 0}</span></label>
          </div>
          <select 
            value={itemInput.itemName} 
            onChange={(e) => {
              const selectedName = e.target.value;
              const selectedItem = itemDropdownOptions.find((row) => row.item_name === selectedName) || null;
              const selectedRow =
                openingStockRows.find(
                  (row) =>
                    String(row.item_code || "") === String(selectedItem?.item_code || "") ||
                    String(row.item_name || "") === String(selectedName || "")
                ) || null;

              setItemInput({
                ...itemInput,
                itemCode: selectedItem?.item_code || selectedRow?.item_code || "",
                itemName: selectedName,
                itemCategory: selectedItem?.item_category || selectedRow?.item_category || "",
                unit: selectedItem?.unit || selectedRow?.unit || "",
                quantity: "",
                rate: selectedItem?.sales_price ? String(selectedItem.sales_price) : itemInput.rate,
              });
            }} 
            className={`h-12 w-full rounded-xl border ${errors.itemName ? 'border-red-500' : 'border-gray-300'} bg-white px-4 text-[12px] outline-none`}
          >
            <option value="">Choose Item</option>
            {itemDropdownOptions.map((row) => (
                <option key={row.item_id || row.id || row.item_code} value={row.item_name}>
                  {row.item_name}
                </option>
              ))}
          </select>
          {errors.itemName && <p className="text-red-500 text-xs mt-1">{errors.itemName}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-[12px] font-semibold mb-2 text-black">Unit</label>
          <input
            className={`h-12 w-full rounded-xl border ${errors.unit ? 'border-red-500' : 'border-gray-300'} bg-[#eceff1] px-4 text-[12px] outline-none`}
            value={itemInput.unit}
            readOnly
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[12px] font-semibold mb-2 text-black">Quantity</label>
          <input 
            type="number" 
            className={`h-12 w-full rounded-xl border ${errors.quantity ? 'border-red-500' : 'border-gray-300'} bg-white px-4 text-[12px] outline-none`} 
            value={itemInput.quantity} 
            onChange={(e) => setItemInput({...itemInput, quantity: e.target.value})} 
          />
          {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
        </div>

        <div className="md:col-span-2">
          <label className="block text-[12px] font-semibold mb-2 text-black">Rate</label>
          <input 
            type="number" 
            className={`h-12 w-full rounded-xl border ${errors.rate ? 'border-red-500' : 'border-gray-300'} bg-white px-4 text-[12px] outline-none`} 
            value={itemInput.rate} 
            onChange={(e) => setItemInput({...itemInput, rate: e.target.value})} 
          />
          {errors.rate && <p className="text-red-500 text-xs mt-1">{errors.rate}</p>}
        </div>
      </div>

      {/* Row 2 */}
      {/* Row 2 */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
  <div className="md:col-span-3">
    <label className="block text-[12px] font-semibold mb-2 text-black">Discount (%)</label>
    <input 
      type="number" 
      className={`h-12 w-full rounded-xl border ${errors.discount ? 'border-red-500' : 'border-gray-300'} bg-white px-4 text-[12px] outline-none`} 
      value={itemInput.discount} 
      onChange={(e) => setItemInput({...itemInput, discount: e.target.value})} 
    />
    {errors.discount && <p className="text-red-500 text-xs mt-1">{errors.discount}</p>}
  </div>

  <div className="md:col-span-6">
    <label className="block text-[12px] font-semibold mb-2 text-black">Description</label>
    <input 
      className={`h-12 w-full rounded-xl border ${errors.description ? 'border-red-500' : 'border-gray-300'} bg-white px-4 text-[12px] outline-none`} 
      value={itemInput.description} 
      onChange={(e) => {
        const val = e.target.value;
        if (val === "" || /^[a-zA-Z\s]*$/.test(val)) {
          setItemInput({...itemInput, description: val});
        }
      }} 
    />
    {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
  </div>

  <div className="md:col-span-2">
    <label className="block text-[12px] font-semibold mb-2 text-black">Amount</label>
    <input 
      className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px] outline-none" 
      value={formatCurrencyNumber(convertFromBase((parseFloat(itemInput.quantity || "0") * parseFloat(itemInput.rate || "0")) * (1 - parseFloat(itemInput.discount || "0") / 100)))} 
      readOnly 
    />
  </div>

  


        <div className="md:col-span-1">
          <button 
            onClick={handleAddItem} 
            className={`${editingId ? 'bg-blue-500' : 'bg-green-500'} text-white font-bold w-full h-12 rounded-xl text-[13px] shadow`}
          >
            {editingId ? "SAVE" : "ADD"}
          </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mt-8 overflow-hidden rounded-xl border border-cyan-200 bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-gray-300">
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">#</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300">Item Code</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300">Item Name</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">Unit</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">Quantity</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">Rate</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">Discount</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">Tax Amount</th>
                  <th className="p-3 text-[12px] font-semibold border-r border-gray-300 text-center">Amount</th>
                  <th className="p-3 text-[12px] font-semibold text-center border-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? records.map((rec, index) => (
                  <tr key={rec.id} className="border-b border-gray-300">
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center">{index + 1}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300">{rec.item_code}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300">{rec.item_name}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center">{rec.unit}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center">{rec.quantity}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center">{formatCurrencyNumber(convertFromBase(Number(rec.rate || 0)))}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center">{rec.discount_percent || 0}%</td>
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center">{currentConfig.currency} {formatCurrencyNumber(convertFromBase(Number(rec.tax_amount || 0)))}</td>
                    <td className="p-3 text-[13px] border-r border-gray-300 text-center font-semibold">{currentConfig.currency} {formatCurrencyNumber(convertFromBase(Number(rec.amount || 0)))}</td>
                    <td className="p-3 text-[13px] text-center">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => handleEditInitiate(rec)} className="text-blue-600"><Pencil size={18} /></button>
<button 
  onClick={() => handleDelete(rec.id)} 
  className="text-red-600 hover:scale-110 transition-transform"
>
  <Trash2 size={18} />
</button>
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={10} className="text-center p-6 text-[12px] text-gray-500">No Records Added</td></tr>}
                <tr className="bg-[#f8fafc] border-t border-gray-300 font-semibold">
                  <td className="p-3 text-[12px] border-r border-gray-300" colSpan={4}>TOTAL</td>
                  <td className="p-3 text-[12px] border-r border-gray-300 text-right">{records.reduce((sum, rec) => sum + Number(rec.quantity || 0), 0)}</td>
                  <td className="p-3 text-[12px] border-r border-gray-300"></td>
                  <td className="p-3 text-[12px] border-r border-gray-300 text-right">{currentConfig.currency} {formatCurrencyNumber(totalDiscount)}</td>
                  <td className="p-3 text-[12px] border-r border-gray-300 text-right">{currentConfig.currency} {formatCurrencyNumber(totalTax)}</td>
                  <td className="p-3 text-[12px] border-r border-gray-300 text-right">{currentConfig.currency} {formatCurrencyNumber(subtotal)}</td>
                  <td className="p-3 text-[12px]"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dispatch Details & Note & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-8">
            <div className="md:col-span-4">
              <h3 className="text-[18px] font-bold text-black mb-4">Dispatch Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-[13px] font-semibold mb-2 text-black">Supplier's Ref</label>
                  <input className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px]" value={dispatch.supRef} onChange={(e) => setDispatch({...dispatch, supRef: e.target.value})} />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[13px] font-semibold mb-2 text-black">Dispatch Doc No</label>
                  <input className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px]" value={dispatch.docNo} onChange={(e) => setDispatch({...dispatch, docNo: e.target.value})} />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[13px] font-semibold mb-2 text-black">Dispatch Through</label>
                  <select className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px]" value={dispatch.through} onChange={(e) => setDispatch({...dispatch, through: e.target.value})}>
                    <option value="">Choose</option>
                    <option value="Bala">QA Analyst</option>
                    <option value="Rithu">Testers</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[13px] font-semibold mb-2 text-black">Destination</label>
                  <input className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px]" value={dispatch.destination} onChange={(e) => setDispatch({...dispatch, destination: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[13px] font-semibold mb-2 text-black">Credit Days</label>
                  <input type="number" className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px]" value={dispatch.creditDays} onChange={(e) => setDispatch({...dispatch, creditDays: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="md:col-span-4">
  <h3 className="text-[18px] font-bold text-black mb-4">Note</h3>
  <div className="mb-6">
    <label className="block text-[13px] font-semibold mb-2 text-black">Remarks</label>
    <textarea 
      className="w-full rounded-xl border border-gray-300 bg-white p-3 h-24 resize-none text-[12px]"
      value={dispatch.remarks} 
      onChange={(e) => setDispatch({...dispatch, remarks: e.target.value})} 
    />
  </div>

  <h3 className="text-[18px] font-bold text-black mb-4">Terms</h3>
<div className="mb-4">
  <label className="block text-[13px] font-semibold mb-2 text-black">Terms Type</label>
  <select 
    value={selectedTermsType}
    onChange={(e) => setSelectedTermsType(e.target.value)}
    id="termsTypeSelector"
    className="h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[12px] mb-4 outline-none"
  >
    <option value="">Choose Terms Type</option>
    <option value="Payment">Payment & Delays (Detailed)</option>
    <option value="Standard">Standard Terms</option>
  </select>

  <label className="block text-[13px] font-semibold mb-2 text-black">Terms Content</label>
  <textarea 
    id="dynamic-terms-content"
    value={selectedTermsContent} 
    onChange={(e) => setSelectedTermsContent(e.target.value)}
    /* Changed bg-gray-50 to bg-white below */
     className="w-full rounded-xl border border-gray-300 bg-white p-3 h-24 resize-none text-[12px] outline-none"
    placeholder="Enter terms here"
  />
 
</div>
</div>

          <div className="md:col-span-4">
<h3 className="text-[18px] font-bold text-black mb-4">Summary</h3>
<div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
<div className="flex justify-between items-center text-gray-700 border-b border-gray-200 pb-3">
 <span className="text-[13px] font-semibold text-black">Taxable Amount</span>
 <span className="text-[13px] font-semibold">{currentConfig.currency} {formatCurrencyNumber(totalTaxable)}</span>
</div>
<div className="flex justify-between items-center text-gray-700 border-b border-gray-200 pb-3">
  <span className="text-[13px] font-semibold text-black">Tax Amount</span>
  <span className="text-[13px] font-semibold">{currentConfig.currency} {formatCurrencyNumber(totalTax)}</span>
</div>
<div className="flex justify-between items-center text-gray-700 border-b border-gray-200 pb-3">
<span className="text-[13px] font-semibold text-black">Discount Amount</span>
<span className="text-[13px] font-semibold">{currentConfig.currency} {formatCurrencyNumber(totalDiscount)}</span>
 </div>
 <div className="flex justify-between items-center text-gray-700 border-b border-gray-200 pb-3">
 <span className="text-[13px] font-semibold text-black">Subtotal</span>
 <span className="text-[13px] font-semibold">{currentConfig.currency} {formatCurrencyNumber(subtotal)}</span>
 </div>
<div className="flex justify-between items-center text-gray-700 border-b border-gray-200 pb-3">
<span className="text-[13px] font-semibold text-black">Round Off</span>
<span className="text-[13px] font-semibold">{currentConfig.currency} {roundOff}</span>
</div>
<div className="flex justify-between items-center text-gray-900">
<span className="text-[16px] font-bold text-black">Net Amount</span>
  <span className="text-[16px] font-bold text-black">
  {currentConfig.currency} {formatCurrencyNumber(netAmount)}
</span>
 </div>
 </div>
 </div>
 </div>
          
          <div className="mt-8 flex gap-4">
            <button onClick={handleFinalSubmit} className="rounded-xl bg-green-500 text-white font-bold text-[13px] px-6 h-11 shadow">SUBMIT</button>
            <button onClick={() => window.location.reload()} className="rounded-xl bg-orange-400 text-white font-bold text-[13px] px-6 h-11 shadow">CANCEL</button>
          </div>
          <p className="mt-3 text-right text-[12px] text-red-500 font-semibold">Note: <span className="text-black font-medium">Fields marked with [ * ] are mandatory.</span></p>
        </div>
      </div>
      </div>
      <AppFooter />
      </div>
    </div>
  );
}











