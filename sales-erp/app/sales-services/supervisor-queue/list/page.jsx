"use client";

import { useCallback, useEffect, useState } from "react";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupervisorQueueListPage() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  const loadSupervisorQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/api/operation-head-registrations/"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch supervisor queue.");
      }
      const data = await response.json();
      setRecords(
        Array.isArray(data) ? data.filter((record) => record.notified_supervisor) : []
      );
    } catch (error) {
      showToast(error?.message || "Unable to load supervisor queue.", "error");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadSupervisorQueue();
  }, [loadSupervisorQueue]);

  const openShopfloorExecution = (jobcardId) => {
    if (!jobcardId) return;
    router.push(`/sales-services/shopfloorprocessflow/${jobcardId}`);
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">

      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Supervisor Queue</h1>

          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-services/jobcard/create")}
            className="flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-[13px] font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
            title="Add jobcard"
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
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">P.O. No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">P.O. Date</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Shopfloor Incharge</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Target Completion</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Remarks</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    Loading supervisor queue...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    No supervisor notifications yet.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-900">{record.operation_no}</td>
                    <td className="px-3 py-3">{record.rfq_no || "-"}</td>
                    <td className="px-3 py-3">{record.jobcard_no || record.jobcard_info?.jobcard_no || "-"}</td>
                    <td className="px-3 py-3">{record.purchase_order_info?.po_no || "-"}</td>
                    <td className="px-3 py-3">
                      {record.purchase_order_info?.po_date || "—"}
                    </td>
                    <td className="px-3 py-3">
                      {record.shopfloor_incharge_info?.full_name || record.shopfloor_incharge_info?.username || "-"}
                    </td>
                    <td className="px-3 py-3">{record.target_completion_date || "-"}</td>
                    <td className="px-3 py-3">{record.remarks || "-"}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openShopfloorExecution(
                              record.jobcard_id || record.jobcard_info?.id || record.jobcard?.id
                            )
                          }
                          className="flex h-8 w-full items-center justify-center rounded-full border border-emerald-200 bg-white px-2 py-1 text-[12px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          Shopfloor Reg
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
