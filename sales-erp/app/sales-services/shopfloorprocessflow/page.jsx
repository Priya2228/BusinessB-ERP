"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("token");
  return token ? { Authorization: `Token ${token}` } : {};
};

export default function ShopfloorProcessFlowListPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(buildApiUrl("/api/shopfloor/"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Unable to load shopfloor executions.");
      }
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Unable to load shopfloor executions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (jobcardId) => {
    if (!jobcardId || !window.confirm("Delete this execution record?")) return;
    setDeletingId(jobcardId);
    try {
      const response = await fetch(buildApiUrl(`/api/shopfloor/${jobcardId}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to delete execution.");
      }
      setRecords((prev) => prev.filter((item) => item.jobcard_info?.id !== jobcardId));
    } catch (err) {
      setError(err?.message || "Unable to delete execution.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (jobcardId) => {
    if (!jobcardId) return;
    router.push(`/sales-services/shopfloorprocessflow/${jobcardId}`);
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Shopfloor Process Flow</h1>
            
          </div>
        </div>

        {error ? (
          <div className="my-4 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
            {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-[12px] text-slate-700">
            <thead className="bg-[#f5f9ff] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Jobcard</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">RFQ</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Client</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Category</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Status</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Updated</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    Loading executions...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    No shopfloor records yet.
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const jobcardId = record.jobcard_info?.id || record.jobcard_id;
                  const jobcardNo = record.jobcard_info?.jobcard_no || "-";
                  const rfqNo = record.jobcard_info?.rfq_no || "-";
                  const clientName = record.jobcard_info?.client_name || "-";
                  const category = record.jobcard_info?.rfq_category || "-";
                  const statusLabel =
                    record.status === "completed" ? "Execution Complete" : record.status || "Draft";
                  return (
                    <tr key={jobcardId || record.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-semibold text-slate-900">{jobcardNo}</td>
                      <td className="px-3 py-3">{rfqNo}</td>
                      <td className="px-3 py-3">{clientName}</td>
                      <td className="px-3 py-3">{category}</td>
                      <td className="px-3 py-3">{statusLabel}</td>
                      <td className="px-3 py-3">
                        {new Date(record.updated_at || record.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(jobcardId)}
                            disabled={!jobcardId}
                            className="rounded-[12px] border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 disabled:border-slate-200 disabled:text-slate-400"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(jobcardId)}
                            disabled={!jobcardId || deletingId === jobcardId}
                            className="rounded-[12px] border border-rose-200 bg-white px-3 py-1 text-[12px] font-semibold text-rose-600 transition hover:border-rose-300 disabled:border-slate-200 disabled:text-slate-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppPageShell>
  );
}
