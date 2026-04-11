"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";

const STATIC_SUPERVISOR_ID = 10;

export default function OperationHeadRegistrationListPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/api/operation-head-registrations/"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch registrations.");
      }
      const data = await response.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error?.message || "Unable to load registrations.", "error");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleNotifySupervisor = async (recordId) => {
    try {
      const response = await fetch(
        buildApiUrl(`/api/operation-head-registrations/${recordId}/notify-supervisor/`),
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        throw new Error("Notify failed.");
      }
      setRecords((prev) =>
        prev.map((record) =>
          record.id === recordId ? { ...record, notified_supervisor: true } : record
        )
      );
      showToast("Supervisor notified.");
    } catch (error) {
      showToast(error?.message || "Unable to notify supervisor.", "error");
    }
  };

  const visibleRecords = useMemo(() => records || [], [records]);

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
      {toast ? (
        <div
          className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-xl px-4 py-2 text-[13px] font-semibold shadow-2xl transition duration-200 ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Operation Head Registrations List</h1>
            
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-services/operation-head-registration/create")}
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[13px] font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Plus size={18} />
            
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-[12px] text-slate-700">
            <thead className="bg-[#f5f9ff] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Operation No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">RFQ No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Jobcard</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Shopfloor Incharge</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Target Completion</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Status</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    Loading registrations...
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    No operation head records yet.
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-900">{record.operation_no}</td>
                    <td className="px-3 py-3">{record.rfq_no || "-"}</td>
                    <td className="px-3 py-3">{record.jobcard_no || "-"}</td>
                    <td className="px-3 py-3">
                      {record.shopfloor_incharge === STATIC_SUPERVISOR_ID
                        ? "Supervisor"
                        : record.shopfloor_incharge_info?.full_name ||
                          record.shopfloor_incharge_info?.username ||
                          "-"}
                    </td>
                    <td className="px-3 py-3">{record.target_completion_date || "-"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
                          record.notified_supervisor ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {record.notified_supervisor ? "Supervisor notified" : "Pending supervisor"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleNotifySupervisor(record.id)}
                          disabled={record.notified_supervisor}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                            record.notified_supervisor
                              ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "border-emerald-200 bg-white text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50"
                          }`}
                          title="Notify supervisor"
                        >
                          <BellRing size={16} />
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
