"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";

export default function PurchaseOrderListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingRowId, setDeletingRowId] = useState(null);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchRows = async () => {
      try {
        setLoading(true);
        const response = await fetch(buildApiUrl("/api/purchase-orders/"), {
          headers: getAuthHeaders(),
        });
        const data = response.ok ? await response.json() : [];
        setRows(Array.isArray(data) ? data : []);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [router]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (!query) return true;
      return (
        String(row.po_no || "").toLowerCase().includes(query) ||
        String(row.quotation_no || "").toLowerCase().includes(query) ||
        String(row.cost_estimation_no || "").toLowerCase().includes(query)
      );
    });
  }, [rows, searchQuery]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this purchase order?")) return;

    try {
      setDeletingRowId(id);
      const response = await fetch(buildApiUrl(`/api/purchase-orders/${id}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        toast.error("Delete failed.");
        return;
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success("Purchase order deleted successfully.");
    } catch {
      toast.error("Network error while deleting purchase order.");
    } finally {
      setDeletingRowId(null);
    }
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-3 py-2">
      <Toaster position="top-right" />
      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-bold text-slate-900">Purchase Order List</h1>
          <button
            type="button"
            onClick={() => router.push("/purchase")}
            className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500 bg-white text-emerald-600"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="mt-8 flex justify-end">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            className="h-[38px] w-[220px] rounded-md border border-slate-300 bg-white px-4 text-[14px] outline-none"
          />
        </div>

        <div className="mt-7 overflow-hidden rounded-[12px] border border-sky-100 bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">P.O No</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Quotation No</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Cost Estimation No</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">P.O Date</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Received Date</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Expected Delivery</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Attachment</th>
                <th className="p-3 text-center text-[12px] font-bold text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-[13px] text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-[13px] text-slate-500">
                    No Records Found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.po_no || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.quotation_no || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.cost_estimation_no || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.po_date || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.po_received_date || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.expected_delivery_date || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">
                      {row.file_attachment ? (
                        <a href={row.file_attachment} target="_blank" rel="noreferrer" className="text-sky-600">
                          {String(row.file_attachment).split("/").pop()}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => router.push(`/purchase?editId=${row.id}`)}
                          className="text-amber-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingRowId === row.id}
                          className={`${deletingRowId === row.id ? "cursor-not-allowed text-slate-300" : "text-rose-600"}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppPageShell>
  );
}
