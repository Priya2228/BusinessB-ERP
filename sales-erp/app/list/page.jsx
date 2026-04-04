"use client"

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppPageShell from "../components/AppPageShell";
import axios from 'axios';
import { buildApiUrl } from "../utils/api";

import { 
  Pencil, 
  Trash2, 
  Plus, 
  Search, 
  Download, 
  Check, 
  X,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SalesInvoiceList() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [dispatchHistory, setDispatchHistory] = useState([]);
  const [records, setRecords] = useState([]);
  const [dispatchData, setDispatchData] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Filter States
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // --- API FETCHING ---
  const fetchHistory = async () => {
    try {
      const response = await fetch(buildApiUrl("/api/dispatch-details/"));
      if (response.ok) {
        const data = await response.json();
        setDispatchHistory(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/api/invoice-items/"));
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (error) {
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchHistory();
    fetchRecords();
  }, []);

  // --- ACTIONS & HANDLERS ---
  const handleEditClick = (rec) => {
    setEditingId(rec.id);
    setEditFormData({ ...rec });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedData = { ...editFormData, [name]: value };
    if (name === 'quantity' || name === 'rate') {
      updatedData.amount = (updatedData.quantity || 0) * (updatedData.rate || 0);
    }
    setEditFormData(updatedData);
  };

  const handleSave = async (id) => {
    if (!id) return toast.error("Invalid ID");
    try {
      const response = await fetch(buildApiUrl(`/api/invoice-items/${id}/`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setRecords(prev => prev.map(r => r.id === id ? updatedItem : r));
        setEditingId(null); 
        toast.success("Item updated successfully");
      } else {
        toast.error("Save failed");
      }
    } catch (error) {
      toast.error("Network error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      const response = await fetch(buildApiUrl(`/api/invoice-items/${id}/`), { method: "DELETE" });
      if (response.ok) {
        setRecords(prev => prev.filter(r => r.id !== id));
        toast.success("Deleted");
      }
    } catch (error) { toast.error("Error deleting"); }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Items");
    XLSX.writeFile(workbook, "Sales_Items.xlsx");
  };
// --- PDF GENERATION LOGIC ---
  const generateInvoicePDF = (fetchedData) => {
    if (!fetchedData) {
      toast.error("No data available to print");
      return;
    }

    const readCurrencyMeta = (invoiceData) => {
      const fallback = { currency: "Rs.", conversionRate: 1, decimalPlaces: 2 };

      if (typeof window === "undefined") return fallback;

      try {
        const raw = localStorage.getItem("salesInvoiceCurrencyMap");
        const map = raw ? JSON.parse(raw) : {};
        const key = String(invoiceData?.dispatch_docno || "").trim();
        if (key && map?.[key]) {
          const mappedCurrency = map[key].currency || fallback.currency;
          const inferredDecimals = mappedCurrency === "OMR" ? 3 : 2;
          return {
            currency: mappedCurrency,
            conversionRate: Number(map[key].conversionRate || 1),
            decimalPlaces: Number(map[key].decimalPlaces ?? inferredDecimals)
          };
        }
      } catch {
        return fallback;
      }

      return fallback;
    };

    const currencyMeta = readCurrencyMeta(fetchedData);
    const convertFromBase = (amount) => Number(amount || 0) * Number(currencyMeta.conversionRate || 1);
    const formatCurrencyNumber = (amount) => Number(amount || 0).toFixed(Number(currencyMeta.decimalPlaces || 2));
    const invoiceItems = Array.isArray(fetchedData?.items) && fetchedData.items.length > 0 ? fetchedData.items : records;
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    
    // Helper to prevent overlapping at page bottom
    const checkNewPage = (y, neededSpace) => {
      if (y + neededSpace > pageHeight - 20) {
        doc.addPage();
        return 20; // Reset to top of new page
      }
      return y;
    };

    // 1. Header Section
    try { doc.addImage("/majesticlogo.png", 'png', 14, 10, 50, 20); } 
    catch (e) { 
      doc.setFontSize(18); doc.setFont("helvetica", "bold"); 
      doc.text("FASHION WORLD", 14, 20); 
    }

    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("72C Thanneerpanthal Colony, Anupparpalayam P.O", 14, 32);
    doc.text("Tiruppur, Tamil Nadu, India", 14, 36);
    doc.text("9344001577, prakiya318@gmail.com", 14, 40);
    doc.setFont("helvetica", "bold"); doc.text("GSTIN: 33AACFV3825E2ZG", 14, 44);

    // Invoice Meta Box (Right Side)
    doc.rect(120, 10, 76, 30);
    doc.text(`Invoice No. :  ${fetchedData.dispatch_docno || 'Draft'}`, 122, 16);
    doc.text(`Invoice Date:  ${new Date().toLocaleDateString('en-GB')}`, 122, 22);
    doc.setFont("helvetica", "normal");
    doc.text(`Vehicle No :  TN39CK3715`, 122, 28);
    doc.text(`Transport  :  PRIYA INDUSTRIES`, 122, 34);

    // 2. Address Section
    const addressStartY = 55;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("Customer Name", 14, addressStartY);
    doc.text("Billing Address", 75, addressStartY);
    doc.text("Delivery Address", 140, addressStartY);
    
    doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(fetchedData.ledger || "Cash/Customer", 14, addressStartY + 5);
    doc.text("GSTIN: 33AACFV3825E2ZG", 14, addressStartY + 9);
    doc.text("NO. 244/1, MUTHANAMPALAYAM ROAD\nTIRUPUR, 641606", 75, addressStartY + 5);
    doc.text("NO. 244/1, AMMAN KOVIL STREET ROAD\nNALLUR, TIRUPUR", 140, addressStartY + 5);

    // 3. Items Table
    const tableRows = invoiceItems.map((rec, index) => {
      const totalTax = convertFromBase(rec.tax_amount || 0);
      const taxPerSide = formatCurrencyNumber(totalTax / 2);
      return [
        index + 1, rec.item_code || "", rec.item_name || "Item", 
        Number(rec.quantity || 0), formatCurrencyNumber(convertFromBase(rec.rate || 0)), 
        `${rec.discount_percent || 0}%`, `CGST: ${taxPerSide}\nSGST: ${taxPerSide}`, 
        formatCurrencyNumber(convertFromBase(rec.amount || 0))
      ];
    });

    autoTable(doc, {
      startY: addressStartY + 20,
      head: [['SNo', 'Item No', 'Item Name', 'Qty', 'Rate', 'Disc%', 'Tax Amount', 'Amount']],
      body: tableRows,
      theme: 'grid',
      styles: { 
        fontSize: 7, 
        cellPadding: 2 ,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0],lineColor:[0,0,0] ,lineWidth: 0.1 }
    });

    // 4. Totals & Bank Details (Aligned precisely like Image 2)
    let currentY = doc.lastAutoTable.finalY + 10;
    currentY = checkNewPage(currentY, 40);

    const totalAmount = invoiceItems.reduce((sum, item) => sum + convertFromBase(item.amount), 0);
    const totalTax = invoiceItems.reduce((sum, item) => sum + convertFromBase(item.tax_amount), 0);
    // Added this line to fix the "blinking"/crash issue
    const taxableAmount = totalAmount - totalTax;
    // Left Box: Bank Info
    doc.rect(14, currentY, 100, 25);
    doc.setFont("helvetica", "bold");
    doc.text("BANKING DETAILS:", 16, currentY + 6);
    doc.setFont("helvetica", "normal");
    doc.text(`Bank: PUNJAB NATIONAL BANK`, 16, currentY + 12);
    doc.text(`A/C No: 4402 0087 0004 4467`, 16, currentY + 17);
    doc.text(`IFSC: PUNB0440200`, 16, currentY + 22);

    // Right Box: Totals
    doc.rect(130, currentY, 66, 30);
 doc.text("Taxable Amount:", 132, currentY + 10);
doc.text(`${currencyMeta.currency} ${formatCurrencyNumber(taxableAmount)}`, 194, currentY + 10, { align: 'right' });
doc.setFont("helvetica", "bold");
 doc.text("Net Amount:", 132, currentY + 22);
 doc.text(`${currencyMeta.currency} ${formatCurrencyNumber(totalAmount)}`, 194, currentY + 22, { align: 'right' });
    
    currentY += 32; // Move below the boxes

    // 5. Terms & Conditions
    currentY = checkNewPage(currentY, 30);
    const termsTitle = fetchedData.terms_type 
      ? `Terms and Conditions - ${fetchedData.terms_type}:` 
      : "Terms and Conditions:";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(termsTitle, 14, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const termsText = fetchedData.terms_conditions || "1. Jurisdiction: Tiruppur Court only.\n2. Goods once sold will not be taken back.";
    const cleanTerms = termsText.replace(/<\/?[^>]+(>|$)/g, ""); 
    const lines = doc.splitTextToSize(cleanTerms, 182);
    doc.text(lines, 14, currentY);
    
    currentY += (lines.length * 3.5) + 15; // Dynamic spacing based on text length

    // 6. Signature Section (Bottom of page)
    currentY = checkNewPage(currentY, 35);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FOR PRIYA INDUSTRIES", 196, currentY, { align: 'right' });
    
    currentY += 20;
    doc.setFont("helvetica", "normal");
    doc.text("Receiver Signature", 14, currentY);
    doc.text("Checked By", 70, currentY);
    doc.text("Prepared By", 130, currentY);
    doc.setFont("helvetica", "bold");
    doc.text("Authorised Signature", 196, currentY, { align: 'right' });

    doc.save(`Invoice_${fetchedData.dispatch_docno || 'Draft'}.pdf`);
  };

  // --- MEMOIZED FILTERS ---
  const filteredData = useMemo(() => {
    return records.filter((item) => {
      const matchesCustomer = !selectedCustomer || item.item_name?.toLowerCase().includes(selectedCustomer.toLowerCase());
      const matchesSearch = !searchQuery || 
        item.item_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.item_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCustomer && matchesSearch;
    });
  }, [records, selectedCustomer, searchQuery]);

  const uniqueCustomers = useMemo(() => {
    return Array.from(new Set(dispatchHistory.map(item => item.ledger).filter(Boolean)));
  }, [dispatchHistory]);

  const totalBillAmount = records.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
      contentWrapperClassName="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <Toaster position="top-right" />
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 flex justify-between items-center border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Sales Invoice List</h2>
            <div className="flex gap-2">
              <button onClick={() => router.push("/sales")} className="p-2 border border-emerald-500 text-emerald-600 rounded-lg hover:bg-emerald-50">
                <Plus size={20} />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]">
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none">
                <option>10</option>
                <option>25</option>
              </select>
              <button 
                onClick={async () => {
                  if (dispatchHistory.length > 0) {
                    const loadingToast = toast.loading("Generating PDF...");
                    try {
                      const latestDispatch = [...dispatchHistory].sort((a, b) => (Number(b?.id) || 0) - (Number(a?.id) || 0))[0];
                      const res = await axios.get(buildApiUrl(`/api/dispatch-details/${latestDispatch.id}/`));
                      toast.dismiss(loadingToast);
                      generateInvoicePDF(res.data);
                    } catch (e) { toast.dismiss(loadingToast); toast.error("DB Connection failed"); }
                  } else { toast.error("No dispatch record found"); }
                }}
                className="px-4 py-2 bg-cyan-100 text-cyan-700 font-bold rounded-lg text-xs uppercase tracking-wider"
              >
                Download Invoices
              </button>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <select 
                value={selectedCustomer} 
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[180px]"
              >
                <option value="">Choose Customer</option>
                {uniqueCustomers.map(name => <option key={name} value={name}>{name}</option>)}
              </select>

              <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex items-center gap-2 bg-white text-slate-500 cursor-default">
                Mar 21, 2026 - Mar 21, 2026 <X size={14} className="text-slate-300" />
              </div>

              <div className="relative">
                <input 
                  type="text" placeholder="Search" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-slate-200 rounded-lg px-4 py-2 text-sm w-40 outline-none focus:ring-2 focus:ring-cyan-100" 
                />
              </div>

              <button onClick={exportToExcel} className="px-6 py-2 bg-cyan-400 text-white font-bold rounded-lg text-xs uppercase tracking-widest">
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mx-6 mb-6 rounded-xl border border-cyan-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-cyan-100">
                  <th className="p-4 w-10 text-center border-r border-cyan-50"><input type="checkbox" className="rounded" /></th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 border-r border-cyan-50">#</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 border-r border-cyan-50">Code</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 border-r border-cyan-50">Date</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 border-r border-cyan-50">Ledger</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 text-center border-r border-cyan-50">Tax Amount</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 text-center border-r border-cyan-50">Bill Amount</th>
                  <th className="p-4 text-xs font-bold uppercase text-slate-800 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? filteredData.map((rec, index) => (
                  <tr key={rec.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="p-4 text-center border-r border-cyan-50"><input type="checkbox" className="rounded" /></td>
                    <td className="p-4 text-sm border-r border-cyan-50">{index + 1}</td>
                    {editingId === rec.id ? (
                      <>
                        <td className="p-2 border-r border-cyan-50"><input name="item_code" value={editFormData.item_code} onChange={handleInputChange} className="w-full border p-1 rounded text-sm" /></td>
                        <td className="p-2 border-r border-cyan-50 text-sm">21/03/2026</td>
                        <td className="p-2 border-r border-cyan-50"><input name="item_name" value={editFormData.item_name} onChange={handleInputChange} className="w-full border p-1 rounded text-sm" /></td>
                        <td className="p-2 border-r border-cyan-50 text-center text-sm">₹ {Number(rec.tax_amount || 0).toFixed(2)}</td>
                        <td className="p-2 border-r border-cyan-50 text-center"><input type="number" name="amount" value={editFormData.amount} onChange={handleInputChange} className="w-24 border p-1 rounded text-sm text-center" /></td>
                        <td className="p-4 text-center"><div className="flex justify-center gap-2">
                          <button onClick={() => handleSave(rec.id)} className="text-emerald-600"><Check size={18} /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400"><X size={18} /></button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 text-sm border-r border-cyan-50 font-medium">{rec.item_code}</td>
                        <td className="p-4 text-sm border-r border-cyan-50 text-slate-400">21/03/2026</td>
                        <td className="p-4 text-sm border-r border-cyan-50">{rec.item_name}</td>
                        <td className="p-4 text-sm border-r border-cyan-50 text-center">₹ {Number(rec.tax_amount || 0).toFixed(2)}</td>
                        <td className="p-4 text-sm border-r border-cyan-50 text-center font-bold">₹ {rec.amount}</td>
                  
                        <td className="p-4 text-center"><div className="flex justify-center gap-3">
                          <button onClick={() => handleEditClick(rec)} className="text-blue-600"><Pencil size={18} /></button>
                          <button onClick={() => handleDelete(rec.id)} className="text-red-600 hover:scale-110 transition-transform"><Trash2 size={18} /></button>
                        </div></td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr><td colSpan={9} className="text-center p-12 text-slate-400 italic">No Records Found</td></tr>
                )}
                {/* Footer Total */}
                <tr className="bg-white border-t border-cyan-100 font-bold">
                  <td className="p-4 text-xs uppercase" colSpan={5}>Total</td>
                  <td className="p-4 border-l border-cyan-100"></td>
                  <td className="p-4 border-l border-cyan-100 text-center text-lg text-emerald-600">₹ {totalBillAmount.toFixed(2)}</td>
                  <td className="p-4 border-l border-cyan-100" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 pb-6 flex justify-end gap-2 text-slate-400">
            <button className="flex items-center gap-1 px-3 py-1 text-xs border rounded-md uppercase font-bold"><ChevronLeft size={14} /> First</button>
            <button className="p-1 border rounded-md"><ChevronLeft size={16} /></button>
            <button className="w-8 h-8 flex items-center justify-center bg-cyan-400 text-white rounded-md text-sm font-bold shadow-sm shadow-cyan-200">1</button>
            <button className="p-1 border rounded-md"><ChevronRight size={16} /></button>
            <button className="flex items-center gap-1 px-3 py-1 text-xs border rounded-md uppercase font-bold">Last <ChevronRight size={14} /></button>
          </div>

        </div>
    </AppPageShell>
  );
}
