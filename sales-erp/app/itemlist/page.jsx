"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppPageShell from "../components/AppPageShell";
import { buildApiUrl, getApiBaseUrl } from "../utils/api";
import toast, { Toaster } from "react-hot-toast";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  List,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";

const filterSelect =
  "h-[34px] w-full appearance-none rounded-[10px] border border-slate-300 bg-white px-4 text-[13px] text-slate-500 outline-none";

const getStatusLabel = (item) => {
  if (typeof item?.status === "string" && item.status.trim()) {
    return item.status;
  }
  return item?.is_active === false ? "Inactive" : "Active";
};

const getStatusBadgeClass = (item) =>
  item?.is_active === false
    ? "bg-orange-500 text-white shadow-[0_4px_10px_rgba(249,115,22,0.28)]"
    : "bg-emerald-600 text-white shadow-[0_4px_10px_rgba(5,150,105,0.28)]";

export default function ItemListPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null); // Tracks which row is in edit mode
  const [editFormData, setEditFormData] = useState({}); // Stores temporary edits
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const resolveImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (String(imagePath).startsWith("http://") || String(imagePath).startsWith("https://")) {
      return String(imagePath);
    }
    return `${getApiBaseUrl()}${String(imagePath).startsWith("/") ? "" : "/"}${imagePath}`;
  };

  const itemApiCandidates = [buildApiUrl("/api/items/"), buildApiUrl("/api/items")];

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const fetchFirstWorking = async (urls, options = {}) => {
    let lastError = null;
    for (const url of urls) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        if (response.status !== 404) throw new Error(`Status ${response.status}`);
        lastError = new Error(`404 at ${url}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Unable to reach items API");
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetchFirstWorking(itemApiCandidates, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setItems([]);
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
    fetchItems();
  }, [router]);

  // --- Inline Edit Handlers ---
  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEditFormData({ ...item }); // Clone item into edit state
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleInlineInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (id) => {
    try {
      const response = await fetch(buildApiUrl(`/api/items/${id}/`), {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems((prev) => prev.map((it) => (it.id === id ? updatedItem : it)));
        setEditingId(null);
        setEditFormData({});
        toast.success("Item updated successfully.");
      } else {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        console.error("Update failed:", errorData);
        toast.error(errorData?.detail || "Failed to update item.");
      }
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Network error while updating item.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      const response = await fetch(buildApiUrl(`/api/items/${id}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Item deleted successfully.");
      } else {
        toast.error("Failed to delete item.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Network error while deleting item.");
    }
  };

  const uniqueTypes = useMemo(() => Array.from(new Set(items.map((i) => i.item_type).filter(Boolean))), [items]);
  const uniqueCategories = useMemo(() => Array.from(new Set(items.map((i) => i.item_category).filter(Boolean))), [items]);
  const uniqueGroups = useMemo(() => Array.from(new Set(items.map((i) => i.item_group).filter(Boolean))), [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || 
        String(item.item_code || "").toLowerCase().includes(query) || 
        String(item.item_name || "").toLowerCase().includes(query);
      const matchesType = !selectedType || item.item_type === selectedType;
      const matchesCategory = !selectedCategory || item.item_category === selectedCategory;
      const matchesGroup = !selectedGroup || item.item_group === selectedGroup;
      return matchesSearch && matchesType && matchesCategory && matchesGroup;
    });
  }, [items, searchQuery, selectedType, selectedCategory, selectedGroup]);

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1240px] px-2 py-2"
      showFooter={false}
    >
          <Toaster position="top-right" />
          <div className="mt-3 rounded-[24px] border border-slate-300 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <h1 className="text-[17px] font-bold text-slate-900">Item List</h1>
              <div className="flex items-center gap-3">
                <button onClick={() => router.push("/master")} className="flex h-7 w-7 items-center justify-center rounded-md border border-green-500 bg-green-50 text-green-600">
                  <Plus size={16} />
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-md border border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]">
                  <List size={14} />
                </button>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {[
                { value: selectedType, onChange: setSelectedType, options: uniqueTypes, placeholder: "Choose Item Type" },
                { value: selectedCategory, onChange: setSelectedCategory, options: uniqueCategories, placeholder: "Choose Item Category" },
                { value: selectedGroup, onChange: setSelectedGroup, options: uniqueGroups, placeholder: "Choose Item Group" },
              ].map((f) => (
                <div key={f.placeholder} className="relative w-full max-w-[236px]">
                  <select value={f.value} onChange={(e) => f.onChange(e.target.value)} className={filterSelect}>
                    <option value="">{f.placeholder}</option>
                    {f.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-11 my-auto h-5 w-px bg-slate-300" />
                  <ChevronDown className="pointer-events-none absolute inset-y-0 right-4 my-auto text-slate-400" size={16} />
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="relative w-[62px]">
                <select className="h-[38px] w-full appearance-none rounded-[8px] border border-slate-300 bg-white pl-3 pr-8 text-[13px] text-slate-800 outline-none">
                  <option>10</option>
                </select>
                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2 my-auto text-slate-400" size={14} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-[34px] w-full max-w-[176px] rounded-[6px] border border-slate-300 bg-white px-4 text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="mt-8 overflow-hidden rounded-[12px] border border-sky-100">
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="bg-[#f8f8f8]">
                    <th className="w-[3%] border border-slate-200 px-1.5 py-2 text-[11px] font-semibold text-slate-900 whitespace-nowrap">#</th>
                    <th className="w-[10%] border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-900 whitespace-nowrap">Item Code</th>
                    <th className="w-[13%] border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-900 whitespace-nowrap">Item Name</th>
                    <th className="w-[11%] border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-900 whitespace-nowrap">Item Type</th>
                    <th className="w-[12%] border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-900 whitespace-nowrap">Item Category</th>
                    <th className="w-[11%] border border-slate-200 px-2 py-2 text-[11px] font-semibold text-slate-900 whitespace-nowrap">Item Group</th>
                    <th className="w-[10%] border border-slate-200 px-2 py-2 text-right text-[11px] font-semibold text-slate-900 whitespace-nowrap">Purchase Rate</th>
                    <th className="w-[10%] border border-slate-200 px-2 py-2 text-right text-[11px] font-semibold text-slate-900 whitespace-nowrap">Sales Rate</th>
                    <th className="w-[8%] border border-slate-200 px-2 py-2 text-center text-[11px] font-semibold text-slate-900 whitespace-nowrap">Status</th>
                    <th className="w-[12%] border border-slate-200 px-1.5 py-2 text-center text-[11px] font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">Loading...</td></tr>
                  ) : filteredItems.map((item, index) => {
                    const isEditing = editingId === item.id;
                    return (
                      <tr key={item.id || index} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="border border-slate-200 px-2 py-2 text-[12px]">{index + 1}</td>
                        <td className="border border-slate-200 px-3 py-2 text-[12px]">
                          {isEditing ? (
                            <input name="item_code" value={editFormData.item_code || ""} onChange={handleInlineInputChange} className="w-full rounded border px-1.5 py-1 text-[12px] outline-sky-500" />
                          ) : (item.item_code || "-")}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-[12px]">
                          {isEditing ? (
                            <input name="item_name" value={editFormData.item_name || ""} onChange={handleInlineInputChange} className="w-full rounded border px-1.5 py-1 text-[12px] outline-sky-500" />
                          ) : (item.item_name || "-")}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-[12px]">
                          {isEditing ? (
                            <input name="item_type" value={editFormData.item_type || ""} onChange={handleInlineInputChange} className="w-full rounded border px-1.5 py-1 text-[12px] outline-sky-500" />
                          ) : (item.item_type || "-")}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-[12px]">
                          {isEditing ? (
                            <input name="item_category" value={editFormData.item_category || ""} onChange={handleInlineInputChange} className="w-full rounded border px-1.5 py-1 text-[12px] outline-sky-500" />
                          ) : (item.item_category || "-")}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-[12px]">
                          {isEditing ? (
                            <input name="item_group" value={editFormData.item_group || ""} onChange={handleInlineInputChange} className="w-full rounded border px-1.5 py-1 text-[12px] outline-sky-500" />
                          ) : (item.item_group || "-")}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-[12px]">
                          {isEditing ? (
                            <input name="purchase_price" type="number" value={editFormData.purchase_price || ""} onChange={handleInlineInputChange} className="w-20 rounded border px-1.5 py-1 text-right text-[12px] outline-sky-500" />
                          ) : Number(item.purchase_price || 0).toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right text-[12px]">
                          {isEditing ? (
                            <input name="sales_price" type="number" value={editFormData.sales_price || ""} onChange={handleInlineInputChange} className="w-20 rounded border px-1.5 py-1 text-right text-[12px] outline-sky-500" />
                          ) : Number(item.sales_price || 0).toFixed(2)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-center text-[12px]">
                          {isEditing ? (
                            <select
                              name="is_active"
                              value={String(editFormData.is_active ?? true)}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  is_active: e.target.value === "true",
                                }))
                              }
                              className="w-full rounded border px-1.5 py-1 text-[12px] outline-sky-500"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex min-w-[44px] items-center justify-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.02em] ${getStatusBadgeClass(item)}`}
                            >
                              {getStatusLabel(item)}
                            </span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-2 py-2">
                          <div className="flex items-center justify-center gap-2">
                            {isEditing ? (
                              <>
                                <button onClick={() => handleUpdate(item.id)} className="text-emerald-600 hover:scale-110 transition-transform">
                                  <Check size={15} strokeWidth={3} />
                                </button>
                                <button onClick={handleCancel} className="text-slate-400 hover:scale-110 transition-transform">
                                  <X size={15} strokeWidth={3} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:opacity-70">
                                  <Pencil size={12} strokeWidth={2.2} />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:opacity-70">
                                  <Trash2 size={12} strokeWidth={2.2} />
                                </button>
                                <button onClick={() => setPreviewItem(item)} className="text-blue-600 hover:opacity-70">
                                  <FileText size={12} fill="currentColor" strokeWidth={2.2} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-7 flex justify-end gap-2 text-[13px] text-slate-400">
              <button className="rounded-[8px] border border-slate-200 px-4 py-2 font-semibold flex items-center gap-1"><ChevronLeft size={14} /> FIRST</button>
              <button className="rounded-[8px] border border-slate-200 px-3 py-2"><ChevronLeft size={14} /></button>
              <button className="rounded-[8px] bg-cyan-300 px-3 py-2 font-bold text-white">1</button>
              <button className="rounded-[8px] border border-slate-200 px-3 py-2"><ChevronRight size={14} /></button>
              <button className="rounded-[8px] border border-slate-200 px-4 py-2 font-semibold flex items-center gap-1">LAST <ChevronRight size={14} /></button>
            </div>
          </div>

      {previewItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/20 px-4">
          <div className="w-full max-w-[520px] rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_22px_50px_rgba(15,23,42,0.2)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Item Image</h2>
              <button
                onClick={() => setPreviewItem(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-400 text-base font-bold text-white shadow-[0_10px_18px_rgba(251,113,133,0.35)]"
              >
                X
              </button>
            </div>

            <div className="mt-5 rounded-[14px] bg-slate-50 px-6 py-5">
              <p className="text-[16px] font-semibold text-slate-900">Item Image</p>
            </div>

            <div className="flex min-h-[260px] items-center justify-center px-4 py-8">
              {previewItem.item_image ? (
                <img
                  src={resolveImageUrl(previewItem.item_image)}
                  alt={previewItem.item_name || "Item image"}
                  className="max-h-[240px] max-w-full rounded-[4px] object-contain"
                />
              ) : (
                <p className="text-sm text-slate-400">No image uploaded for this item.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppPageShell>
  );
}
