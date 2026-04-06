"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Send, Trash2 } from "lucide-react";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";
import {
  getApprovalRecord,
  getOverallStatus,
  isAnyStageDeclined,
  isApprovalLocked,
} from "../approvalWorkflow";
import {
  canCreateCostEstimation,
  canManageCostEstimation,
  getStoredAuthState,
} from "../../utils/rbac";

export default function CostEstimationListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRole, setAuthRole] = useState("");

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(buildApiUrl("/api/cost-estimations/"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setError("Failed to fetch cost estimations.");
        return;
      }

      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Network error while fetching cost estimations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setAuthRole(getStoredAuthState()?.role || "");
    fetchRows();
  }, [fetchRows, router]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this cost estimation?")) return;

    try {
      const response = await fetch(buildApiUrl(`/api/cost-estimations/${id}/`), {
        method: "DELETE",
      });

      if (!response.ok) {
        window.alert("Delete failed.");
        return;
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch {
      window.alert("Network error while deleting.");
    }
  };

  const handleSendToHead = async (id) => {
    try {
      const response = await fetch(buildApiUrl(`/api/cost-estimations/${id}/approval/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ action: "send_to_head" }),
      });

      if (!response.ok) {
        window.alert("Failed to send to Head.");
        return;
      }

      const approval = await response.json();
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, approval_workflow: approval } : row))
      );
    } catch {
      window.alert("Network error while sending to Head.");
    }
  };

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[12400px] px-3 py-2"
    >
              <div className="mt-3 mx-auto max-w-[1180px] rounded-[20px] border border-sky-100 bg-[#fbfdff] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[16px] font-bold text-slate-900">Cost Estimation List</h1>
                    
                  </div>
                  {canCreateCostEstimation(authRole) ? (
                    <button
                      type="button"
                      onClick={() => router.push("/sales-services/cost-sheet")}
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500 bg-white text-emerald-600"
                      title="Go to cost estimation sheet"
                    >
                      <Plus size={18} />
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200">
                  {loading ? (
                    <div className="px-4 py-12 text-center text-[13px] text-slate-500">Loading...</div>
                  ) : error ? (
                    <div className="px-4 py-12 text-center text-[13px] text-red-500">{error}</div>
                  ) : rows.length === 0 ? (
                    <div className="px-4 py-12 text-center text-[13px] text-slate-500">No cost estimations found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[1240px] w-full border-collapse text-left text-[11px] text-slate-700">
                        <thead className="bg-[#f5f9ff] text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">CST No</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">RFQ No</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Client Name (Attention)</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Company Name</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Phone No</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Email</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Created At</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Status</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {rows.map((row) => (
                            <tr key={row.id} className="align-top">
                              {(() => {
                                const approvalRecord = getApprovalRecord(row.approval_workflow);
                                const overallStatus = getOverallStatus(approvalRecord);
                                const isApproved = overallStatus === "approved";
                                const isLocked = isApprovalLocked(approvalRecord);
                                const canManageRow = canManageCostEstimation(authRole);
                                const canSend =
                                  canManageRow &&
                                  (!approvalRecord.sentToHead || isAnyStageDeclined(approvalRecord));

                                return (
                                  <>
                              <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">
                                {row.estimation_no || "-"}
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">{row.rfq_no || "-"}</td>
                              <td className="border-b border-slate-100 px-4 py-3">{row.client_name || "-"}</td>
                              <td className="border-b border-slate-100 px-4 py-3">{row.company_name || "-"}</td>
                              <td className="border-b border-slate-100 px-4 py-3">{row.phone_no || "-"}</td>
                              <td className="border-b border-slate-100 px-4 py-3">{row.email || "-"}</td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                {row.created_at ? new Date(row.created_at).toLocaleDateString("en-GB") : "-"}
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-4 py-1 text-[10px] font-bold text-white shadow-[0_8px_16px_rgba(16,185,129,0.28)] ${
                                    isApproved ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                >
                                  {isApproved ? "APPROVED" : "NOT APPROVED"}
                                </span>
                                {approvalRecord.sentToHead ? (
                                  <p className="mt-2 text-[10px] font-semibold text-sky-700">Sent to Head</p>
                                ) : null}
                                {approvalRecord.head.comment ? (
                                  <p className="mt-1 text-[10px] text-slate-500">Head: {approvalRecord.head.comment}</p>
                                ) : null}
                                {approvalRecord.md.comment ? (
                                  <p className="mt-1 text-[10px] text-slate-500">MD: {approvalRecord.md.comment}</p>
                                ) : null}
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {canManageRow ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSendToHead(row.id)}
                                      disabled={!canSend}
                                      className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                        canSend
                                          ? approvalRecord.sentToHead
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                            : "border-violet-200 bg-violet-50 text-violet-600"
                                          : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                      }`}
                                      title={
                                        canSend
                                          ? approvalRecord.sentToHead
                                            ? "Send again for approval"
                                            : "Send to Head"
                                          : "Disabled until approval is declined"
                                      }
                                    >
                                      <Send size={14} />
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/sales-services/cost-sheet/view/${row.id}`)}
                                    disabled={isLocked}
                                    className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                      isLocked
                                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                        : "border-sky-200 bg-sky-50 text-sky-600"
                                    }`}
                                    title={isLocked ? "Disabled while approval is pending" : "View details"}
                                  >
                                    <Eye size={14} />
                                  </button>
                                  {canManageRow ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => router.push(`/sales-services/cost-sheet?editId=${row.id}`)}
                                        disabled={isLocked}
                                        className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                          isLocked
                                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            : "border-amber-200 bg-amber-50 text-amber-600"
                                        }`}
                                        title={isLocked ? "Disabled while approval is pending" : "Update cost estimation"}
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(row.id)}
                                        disabled={isLocked}
                                        className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                          isLocked
                                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            : "border-rose-200 bg-rose-50 text-rose-600"
                                        }`}
                                        title={isLocked ? "Disabled while approval is pending" : "Delete cost estimation"}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  ) : null}
                                </div>
                              </td>
                                  </>
                                );
                              })()}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
    </AppPageShell>
  );
}
