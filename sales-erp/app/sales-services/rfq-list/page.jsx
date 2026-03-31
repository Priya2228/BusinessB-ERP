"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";

const actionButtonClassName =
  "flex h-7 w-7 items-center justify-center rounded-md border text-[12px] transition";

function formatDate(value) {
  return value || "-";
}

export default function RfqListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(buildApiUrl("/api/sales-services/"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setError("Failed to fetch RFQ records.");
        return;
      }
      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("Network error while fetching RFQ records.");
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

    fetchRows();
  }, [fetchRows, router]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this RFQ record?")) return;

    try {
      const response = await fetch(buildApiUrl(`/api/sales-services/${id}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        toast.error("Failed to delete RFQ record.");
        return;
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success("RFQ record deleted successfully.");
    } catch {
      toast.error("Network error while deleting RFQ.");
    }
  };

  const handlePreview = (attachmentUrl) => {
    if (!attachmentUrl) {
      toast.error("No attachment found.");
      return;
    }

    window.open(attachmentUrl, "_blank", "noopener,noreferrer");
    toast.success("Attachment opened successfully.");
  };

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
    >
          <Toaster position="top-right" />
              <div className="mt-3 mx-auto max-w-[1180px] rounded-[20px] border border-sky-100 bg-[#fbfdff] p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h1 className="text-[16px] font-bold text-slate-900">Request for quotation List</h1>
                
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/sales-services/rfq")}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-green-500 bg-green-50 text-green-600"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-[14px] border border-slate-200">
                  {loading ? (
                    <div className="px-4 py-12 text-center text-[13px] text-slate-500">Loading...</div>
                  ) : error ? (
                    <div className="px-4 py-12 text-center text-[13px] text-red-500">{error}</div>
                  ) : rows.length === 0 ? (
                    <div className="px-4 py-12 text-center text-[13px] text-slate-500">No RFQ records found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[1380px] w-full border-collapse text-left text-[11px] text-slate-700">
                        <thead className="bg-[#f5f9ff] text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">RFQ Reference</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">RFQ Information</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">RFQ Scope</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Planning</th>
                            <th className="border-b border-slate-200 px-4 py-3 font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {rows.map((row) => (
                            <tr key={row.id} className="align-top">
                              <td className="border-b border-slate-100 px-4 py-3">
                                <p className="font-semibold text-slate-900">{row.rfq_no || "-"}</p>
                                <p className="mt-1">RFQ Date: {formatDate(row.registered_date)}</p>
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                <p className="font-semibold text-slate-900">Mode: {row.enquiry_mode || (row.email ? "Email" : row.phone_no ? "Phone" : "Verbal")}</p>
                                <p className="mt-1">Contact: {row.email || row.phone_no || "-"}</p>
                                <p className="mt-1">Email Ref: {row.email_ref_no || "-"}</p>
                                <p className="mt-1">Attention: {row.client_name || "-"}</p>
                                <p className="mt-1">Company: {row.company_name || "-"}</p>
                                <p className="mt-1">Location: {row.client_location || "-"}</p>
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                <p className="font-semibold text-slate-900">{row.project_title || "-"}</p>
                                <p className="mt-1">Category: {row.service_category || "-"}</p>
                                <p className="mt-1">Specification: {row.fabric_specs || "-"}</p>
                                <p className="mt-1">Branding: {row.branding_type || "-"}</p>
                                <p className="mt-1">Remarks: {row.size_breakdown || "-"}</p>
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                <p className="font-semibold text-slate-900">Type: {row.plan_rfq_type || "-"}</p>
                                <p className="mt-1">Start: {formatDate(row.plan_start_date)}</p>
                                <p className="mt-1">End: {formatDate(row.plan_end_date || row.expected_deadline)}</p>
                                <p className="mt-1">Remarks: {row.scope_of_work || "-"}</p>
                              </td>
                              <td className="border-b border-slate-100 px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handlePreview(row.email_attachment)}
                                    className={`${actionButtonClassName} border-sky-200 bg-sky-50 text-sky-600`}
                                    title="Preview attachment"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/sales-services/rfq?editId=${row.id}`)}
                                    className={`${actionButtonClassName} border-blue-200 bg-blue-50 text-blue-600`}
                                    title="Edit RFQ"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(row.id)}
                                    className={`${actionButtonClassName} border-rose-200 bg-rose-50 text-rose-600`}
                                    title="Delete RFQ"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
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
