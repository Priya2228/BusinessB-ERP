"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, List, Pencil, Plus, Trash2 } from "lucide-react";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";

export default function QuotationListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState(null);
  const [estimationRows, setEstimationRows] = useState([]);
  const [selectedModification, setSelectedModification] = useState("terms");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchRows = async () => {
      try {
        setLoading(true);
        const [quotationResponse, estimationResponse] = await Promise.all([
          fetch(buildApiUrl("/api/quotations/")),
          fetch(buildApiUrl("/api/cost-estimations/")),
        ]);
        const quotationData = quotationResponse.ok ? await quotationResponse.json() : [];
        const estimationData = estimationResponse.ok ? await estimationResponse.json() : [];
        setRows(Array.isArray(quotationData) ? quotationData : []);
        setEstimationRows(Array.isArray(estimationData) ? estimationData : []);
      } catch {
        setRows([]);
        setEstimationRows([]);
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
        String(row.quotation_code || "").toLowerCase().includes(query) ||
        String(row.rfq_no || "").toLowerCase().includes(query) ||
        String(row.company_name || row.customer_name || "").toLowerCase().includes(query)
      );
    });
  }, [rows, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openPdfPreview = (id) => {
    if (!id) {
      window.alert("Quotation preview is not available.");
      return;
    }

    window.open(buildApiUrl(`/api/view_quotation/${id}/`), "_blank", "noopener,noreferrer");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;

    try {
      const response = await fetch(buildApiUrl(`/api/quotations/${id}/`), {
        method: "DELETE",
      });
      if (!response.ok) return;
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch {
      return;
    }
  };

  const handleOpenEditModal = (row) => {
    setEditTarget(row);
    setSelectedModification("terms");
  };

  const handleCloseEditModal = () => {
    setEditTarget(null);
  };

  const handleConfirmModification = () => {
    if (selectedModification === "pricing") {
      handlePriceQuantityModification();
      return;
    }
    handleTermsModification();
  };

  const handleTermsModification = () => {
    if (!editTarget?.id) return;
    router.push(`/sales-services/quotation?editId=${editTarget.id}&editMode=terms`);
    handleCloseEditModal();
  };

  const handlePriceQuantityModification = () => {
    if (!editTarget?.id) return;

    const linkedEstimation = estimationRows.find((row) => row.rfq_no === editTarget.rfq_no);
    if (!linkedEstimation?.id) {
      window.alert("Linked cost estimation not found for this quotation.");
      return;
    }

    router.push(
      `/sales-services/cost-sheet?editId=${linkedEstimation.id}&quotationId=${editTarget.id}&revisionMode=pricing`
    );
    handleCloseEditModal();
  };

  const getQuotationApprovalStatus = (quotation) => {
    const linkedEstimation = estimationRows.find((row) => row.rfq_no === quotation.rfq_no);
    const headStatus = linkedEstimation?.approval_workflow?.head_status;
    const mdStatus = linkedEstimation?.approval_workflow?.md_status;
    return headStatus === "approved" && mdStatus === "approved" ? "Approved" : "Not Approved";
  };

  const getQuotationStatusClassName = (quotation) => {
    const status = getQuotationApprovalStatus(quotation);
    return status === "Approved"
      ? "bg-emerald-500 text-white shadow-[0_8px_16px_rgba(16,185,129,0.28)]"
      : "bg-amber-500 text-white shadow-[0_8px_16px_rgba(245,158,11,0.26)]";
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2">
      {editTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[360px] rounded-[16px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[18px] font-bold text-slate-900">Modification</h2>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="quotation-modification"
                  value="terms"
                  checked={selectedModification === "terms"}
                  onChange={(event) => setSelectedModification(event.target.value)}
                  className="h-4 w-4 accent-sky-600"
                />
                <div className="text-[14px] font-medium text-slate-900">Terms and Conditions</div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="quotation-modification"
                  value="pricing"
                  checked={selectedModification === "pricing"}
                  onChange={(event) => setSelectedModification(event.target.value)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <div className="text-[14px] font-medium text-slate-900">Prices and Quantity</div>
              </label>

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="rounded-[10px] border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModification}
                  className="rounded-[10px] bg-sky-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-sky-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-bold text-slate-900">Review Quotation</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/sales-services/quotation")}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-emerald-500 bg-white text-emerald-600"
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-blue-500 bg-white text-blue-600"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            className="h-[38px] w-[72px] rounded-md border border-slate-300 bg-white px-3 text-[14px]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              className="h-[38px] w-[176px] rounded-md border border-slate-300 bg-white px-4 text-[14px] outline-none"
            />
            <button
              type="button"
              onClick={() => openPdfPreview(paginatedRows[0]?.id)}
              className="h-[38px] rounded-[10px] bg-sky-200 px-5 text-[13px] font-bold text-slate-900"
            >
              Export
            </button>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-[12px] border border-sky-100 bg-white">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black"># ^</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Quote No</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Quote Date</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Expiry Date</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Quote Validity</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">RFQ No</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">RFQ Date</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Customer Name</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Company Name</th>
                <th className="border-r border-slate-200 p-3 text-[12px] font-bold text-black">Status</th>
                <th className="border-r border-slate-200 p-3 text-right text-[12px] font-bold text-black">Total Net Amount</th>
                <th className="p-3 text-center text-[12px] font-bold text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-[13px] text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-10 text-center text-[13px] text-slate-500">
                    No Records Found
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.quotation_code || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.quotation_date || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.expiry_date || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.quote_validity || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.rfq_no || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.rfq_date || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.attention_name || row.customer_name || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">{row.company_name || row.customer_name || "-"}</td>
                    <td className="border-r border-slate-100 p-3 text-[13px] text-black">
                      <button
                        type="button"
                        className={`inline-flex rounded-full px-4 py-1 text-[10px] font-bold ${getQuotationStatusClassName(row)}`}
                      >
                        {getQuotationApprovalStatus(row).toUpperCase()}
                      </button>
                    </td>
                    <td className="border-r border-slate-100 p-3 text-right text-[13px] font-semibold text-black">
                      {row.currency_symbol || "Rs."} {Number(row.total_net_amount || row.net_amount || 0).toFixed(row.decimal_places || 2)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => openPdfPreview(row.id)}
                          className="text-sky-600"
                          title="Preview quotation"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(row)}
                          className="text-amber-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => handleDelete(row.id)} className="text-rose-600">
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

        <div className="mt-7 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="rounded-[8px] border border-slate-200 px-4 py-2 text-[13px] text-slate-500 disabled:opacity-60"
          >
            {"< FIRST"}
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className="rounded-[8px] border border-slate-200 px-4 py-2 text-[13px] text-slate-500 disabled:opacity-60"
          >
            {"<"}
          </button>
          <button
            type="button"
            className="rounded-[8px] bg-cyan-300 px-4 py-2 text-[13px] font-bold text-white shadow"
          >
            {page}
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
            className="rounded-[8px] border border-slate-200 px-4 py-2 text-[13px] text-slate-500 disabled:opacity-60"
          >
            {">"}
          </button>
          <button
            type="button"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="rounded-[8px] border border-slate-200 px-4 py-2 text-[13px] text-slate-500 disabled:opacity-60"
          >
            {"LAST >"}
          </button>
        </div>
      </div>
    </AppPageShell>
  );
}
