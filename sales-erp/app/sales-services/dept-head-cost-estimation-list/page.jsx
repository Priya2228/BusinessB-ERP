"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";
import {
  canApproveCostEstimation,
  canCreateCostEstimation,
  getStoredAuthState,
  isAdminRole,
} from "../../utils/rbac";
import {
  getApprovalRecord,
  getStageBadgeClass,
  getStageLabel,
} from "../approvalWorkflow";

const statusButtonClassName =
  "inline-flex w-fit max-w-full items-center rounded-full px-4 py-1.5 text-[10px] font-bold leading-none text-white shadow-[0_8px_16px_rgba(15,23,42,0.16)]";

export default function DeptHeadCostEstimationListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewRow, setReviewRow] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: "approved", comment: "" });
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

  const openReviewModal = (row) => {
    const record = getApprovalRecord(row.approval_workflow);
    setReviewRow(row);
    setReviewForm({
      status: record.head.status === "declined" ? "declined" : "approved",
      comment: record.head.comment || "",
    });
  };

  const handleReviewSubmit = async () => {
    if (!reviewRow) return;

    try {
      const response = await fetch(buildApiUrl(`/api/cost-estimations/${reviewRow.id}/approval/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          action: "head_review",
          status: reviewForm.status,
          comment: reviewForm.comment,
        }),
      });

      if (!response.ok) {
        window.alert("Failed to save Head approval.");
        return;
      }

      const approval = await response.json();
      setRows((prev) =>
        prev.map((row) => (row.id === reviewRow.id ? { ...row, approval_workflow: approval } : row))
      );
      setReviewRow(null);
    } catch {
      window.alert("Network error while saving Head approval.");
    }
  };

  const visibleRows = rows.filter((row) => getApprovalRecord(row.approval_workflow).sentToHead);

  const renderStatus = (approvalWorkflow) => {
    const record = getApprovalRecord(approvalWorkflow);
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className={`${statusButtonClassName} ${getStageBadgeClass(record.head.status)}`}>
          {getStageLabel(record.head.status, "WAITING FOR HEAD APPROVAL")}
        </span>
        {record.head.comment ? (
          <p className="text-[10px] text-slate-500">Head: {record.head.comment}</p>
        ) : null}
      </div>
    );
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-3 py-2">
      <div className="mt-3 mx-auto max-w-[1180px] rounded-[20px] border border-sky-100 bg-[#fbfdff] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[16px] font-bold text-slate-900">Dept Head Cost Estimation List</h1>
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
          ) : visibleRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-[13px] text-slate-500">No cost estimations sent to head.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1240px] w-full border-collapse text-left text-[11px] text-slate-700">
                <thead className="bg-[#f5f9ff] text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Company</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Client details</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Reference details</th>
                   
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Status</th>
                    <th className="border-b border-slate-200 px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {visibleRows.map((row) => {
                    const approvalRecord = getApprovalRecord(row.approval_workflow);
                    const isHeadApproved = approvalRecord.head.status === "approved";

                    return (
                    <tr key={row.id} className="align-top">
                      <td className="border-b border-slate-100 px-4 py-3">
                        <p className="font-semibold text-slate-900">{row.company_name || "-"}</p>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <p>{row.client_name || "-"}</p>
                        <p className="mt-1">{row.phone_no || "-"}</p>
                        <p className="mt-1">{row.email || "-"}</p>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <p>Est: {row.estimation_no || "-"}</p>
                        <p className="mt-1">RFQ: {row.rfq_no || "-"}</p>
                        <p className="mt-1">Reg: {row.registered_date || "-"}</p>
                        
                      </td>
                     
                     
                      <td className="border-b border-slate-100 px-4 py-3">
                        {renderStatus(row.approval_workflow)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canApproveCostEstimation(authRole) ? (
                            <button
                              type="button"
                              onClick={() => openReviewModal(row)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 transition"
                              title="Head review"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => router.push(`/sales-services/cost-sheet/view/${row.id}`)}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-600 transition"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          {isAdminRole(authRole) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => router.push(`/sales-services/cost-sheet?editId=${row.id}`)}
                                disabled={isHeadApproved}
                                className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                  isHeadApproved
                                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    : "border-amber-200 bg-amber-50 text-amber-600"
                                }`}
                                title={isHeadApproved ? "Disabled after head approval" : "Update cost estimation"}
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(row.id)}
                                disabled={isHeadApproved}
                                className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                                  isHeadApproved
                                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    : "border-rose-200 bg-rose-50 text-rose-600"
                                }`}
                                title={isHeadApproved ? "Disabled after head approval" : "Delete cost estimation"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reviewRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 px-4">
          <div className="w-full max-w-[420px] rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-bold text-slate-900">Head Approval</h2>
              <button
                type="button"
                onClick={() => setReviewRow(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2 text-[13px] text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="headStatus"
                    checked={reviewForm.status === "approved"}
                    onChange={() => setReviewForm((prev) => ({ ...prev, status: "approved" }))}
                  />
                  <span>Approved</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="headStatus"
                    checked={reviewForm.status === "declined"}
                    onChange={() => setReviewForm((prev) => ({ ...prev, status: "declined" }))}
                  />
                  <span>Declined</span>
                </label>
              </div>

              <div>
                <label className="mb-2 block text-[12px] font-semibold text-slate-800">Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(event) =>
                    setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
                  }
                  className="h-24 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none"
                  placeholder="Enter approval comment"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  className="rounded-[10px] bg-emerald-500 px-5 py-2 text-[13px] font-bold text-white"
                >
                  SAVE
                </button>
                <button
                  type="button"
                  onClick={() => setReviewRow(null)}
                  className="rounded-[10px] bg-slate-100 px-5 py-2 text-[13px] font-bold text-slate-700"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppPageShell>
  );
}
