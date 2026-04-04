"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { List, Pencil, Plus, Printer, Send, Trash2, User } from "lucide-react";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";
import {
  getApprovalRecord,
  getStageLabel,
  isAnyStageDeclined,
  isApprovalLocked,
  isFullyApproved,
} from "../../approvalWorkflow";

const iconButtonClassName = "flex h-8 w-8 items-center justify-center rounded-md border transition";

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
  const [clientDialogRow, setClientDialogRow] = useState(null);
  const [clientDecision, setClientDecision] = useState("accepted");
  const [clientRemarks, setClientRemarks] = useState("Client accepted quotation");
  const [sendingRowId, setSendingRowId] = useState(null);
  const [deletingRowId, setDeletingRowId] = useState(null);
  const [savingClientRowId, setSavingClientRowId] = useState(null);
  const [printingRowId, setPrintingRowId] = useState(null);

  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return token ? { Authorization: `Token ${token}` } : {};
  };

  const getRowApprovalRecord = (row) =>
    getApprovalRecord(
      row?.approval_workflow || {
        sent_to_head: row?.sent_to_head,
        head_status: row?.head_status,
        head_comment: row?.head_comment,
        md_status: row?.md_status,
        md_comment: row?.md_comment,
      }
    );

  const getNormalizedClientStatus = (row) => {
    const status = String(row?.client_status || "").trim().toLowerCase();
    const remarks = String(row?.client_response_remarks || "").trim().toLowerCase();

    if (status.includes("reject") || remarks.includes("reject")) return "rejected";
    if (status.includes("accept") || remarks.includes("accept")) return "accepted";
    return "";
  };

  const buildQuotationUpdatePayload = (row, overrides = {}) => ({
    customer_name: row?.customer_name || row?.customerName || "",
    quotation_code: row?.quotation_code || "",
    quotation_date: row?.quotation_date || null,
    expiry_date: row?.expiry_date || null,
    quote_validity: row?.quote_validity || "",
    rfq_no: row?.rfq_no || "",
    rfq_date: row?.rfq_date || null,
    attention_name: row?.attention_name || "",
    company_name: row?.company_name || "",
    email: row?.email || "",
    phone_no: row?.phone_no || "",
    scope_no: row?.scope_no || "",
    scope_name: row?.scope_name || "",
    scope_specification: row?.scope_specification || "",
    scope_remarks: row?.scope_remarks || "",
    payment_terms: row?.payment_terms || "",
    delivery_terms: row?.delivery_terms || "",
    general_terms: row?.general_terms || "",
    currency_country: row?.currency_country || row?.region || "",
    currency_symbol: row?.currency_symbol || "Rs.",
    conversion_rate: row?.conversion_rate ?? 1,
    tax_rate: row?.tax_rate ?? 0,
    decimal_places: row?.decimal_places ?? 2,
    taxable_amount: row?.taxable_amount ?? 0,
    tax_amount: row?.tax_amount ?? 0,
    discount_amount: row?.discount_amount ?? 0,
    subtotal: row?.subtotal ?? 0,
    round_off: row?.round_off ?? 0,
    net_amount: row?.net_amount ?? row?.total_net_amount ?? 0,
    total_net_amount: row?.total_net_amount ?? row?.net_amount ?? 0,
    region: row?.region || row?.currency_country || "",
    items: Array.isArray(row?.items) ? row.items : [],
    client_status: row?.client_status || "",
    client_response_remarks: row?.client_response_remarks || "",
    ...overrides,
  });

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
          fetch(buildApiUrl("/api/quotations/"), {
            headers: getAuthHeaders(),
          }),
          fetch(buildApiUrl("/api/cost-estimations/"), {
            headers: getAuthHeaders(),
          }),
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

    router.push(`/sales-services/quotation/preview/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation?")) return;

    try {
      setDeletingRowId(id);
      const response = await fetch(buildApiUrl(`/api/quotations/${id}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) return;
      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch {
      return;
    } finally {
      setDeletingRowId(null);
    }
  };

  const handleOpenEditModal = (row) => {
    setEditTarget(row);
    setSelectedModification("terms");
  };

  const handleCloseEditModal = () => {
    setEditTarget(null);
  };

  const openClientDialog = (row) => {
    const nextDecision = getNormalizedClientStatus(row) === "rejected" ? "rejected" : "accepted";
    setClientDialogRow(row);
    setClientDecision(nextDecision);
    setClientRemarks(
      row.client_response_remarks ||
        (nextDecision === "accepted" ? "Client accepted quotation" : "Client rejected quotation")
    );
  };

  const handleClientDecisionChange = (decision) => {
    setClientDecision(decision);
    setClientRemarks(decision === "accepted" ? "Client accepted quotation" : "Client rejected quotation");
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

  const handleSendForApproval = async (id) => {
    try {
      setSendingRowId(id);
      const currentRow = rows.find((row) => row.id === id);
      const response = await fetch(buildApiUrl(`/api/quotations/${id}/approval/`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ action: "send_to_head" }),
      });

      if (!response.ok) {
        window.alert("Failed to send quotation for approval.");
        return;
      }

      const approval = await response.json();
      if (currentRow) {
        await fetch(buildApiUrl(`/api/quotations/${id}/`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(
            buildQuotationUpdatePayload(currentRow, {
              client_status: "",
              client_response_remarks: "",
            })
          ),
        }).catch(() => null);
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                approval_workflow: approval,
                client_status: "",
                client_response_remarks: "",
              }
            : row
        )
      );
    } catch {
      window.alert("Network error while sending quotation for approval.");
    } finally {
      setSendingRowId(null);
    }
  };

  const openPrintPreview = (id) => {
    if (!id) {
      window.alert("Quotation preview is not available.");
      return;
    }

    setPrintingRowId(id);
    window.open(buildApiUrl(`/api/view_quotation/${id}/`), "_blank", "noopener,noreferrer");
  };

  const handleClientResponseSave = async () => {
    if (!clientDialogRow?.id) return;

    try {
      setSavingClientRowId(clientDialogRow.id);
      const responseRemarks =
        clientRemarks.trim() ||
        (clientDecision === "accepted"
          ? "Client accepted quotation"
          : "Client rejected quotation");
      const response = await fetch(buildApiUrl(`/api/quotations/${clientDialogRow.id}/`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(
          buildQuotationUpdatePayload(clientDialogRow, {
            client_status: clientDecision,
            client_response_remarks: responseRemarks,
          })
        ),
      });

      if (!response.ok) {
        window.alert("Failed to save client response.");
        return;
      }

      const updatedRow = await response.json();
      setRows((prev) =>
        prev.map((row) =>
          row.id === updatedRow.id
            ? {
                ...row,
                client_status: updatedRow.client_status ?? clientDecision,
                client_response_remarks: updatedRow.client_response_remarks ?? responseRemarks,
              }
            : row
        )
      );
      setClientDialogRow(null);
    } catch {
      window.alert("Network error while saving client response.");
    } finally {
      setSavingClientRowId(null);
    }
  };

  useEffect(() => {
    if (printingRowId == null) return;

    const timeoutId = window.setTimeout(() => {
      setPrintingRowId(null);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [printingRowId]);

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2">
      {clientDialogRow ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-[360px] rounded-[16px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[18px] font-bold text-slate-900">Client Response</h2>
            </div>

            <div className="space-y-4 px-5 py-5">
              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="client-response"
                  checked={clientDecision === "accepted"}
                  onChange={() => handleClientDecisionChange("accepted")}
                  className="h-4 w-4 accent-emerald-600"
                />
                <div className="text-[14px] font-medium text-slate-900">Client accepted quotation</div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-slate-200 px-4 py-3 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="client-response"
                  checked={clientDecision === "rejected"}
                  onChange={() => handleClientDecisionChange("rejected")}
                  className="h-4 w-4 accent-rose-600"
                />
                <div className="text-[14px] font-medium text-slate-900">Client rejected quotation</div>
              </label>

              <textarea
                value={clientRemarks}
                onChange={(event) => setClientRemarks(event.target.value)}
                className="h-24 w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none"
                placeholder="Enter client remarks"
              />

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setClientDialogRow(null)}
                  disabled={savingClientRowId === clientDialogRow.id}
                  className="rounded-[10px] border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClientResponseSave}
                  disabled={savingClientRowId === clientDialogRow.id}
                  className="rounded-[10px] bg-sky-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  {savingClientRowId === clientDialogRow.id ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
          <h1 className="text-[16px] font-bold text-slate-900">Quotation List</h1>
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
                    {(() => {
                      const approvalRecord = getRowApprovalRecord(row);
                      const isApproved = isFullyApproved(approvalRecord);
                      const normalizedClientStatus = getNormalizedClientStatus(row);
                      const isClientRejected = normalizedClientStatus === "rejected";
                      const isClientAccepted = normalizedClientStatus === "accepted";
                      const isBusy =
                        sendingRowId === row.id ||
                        deletingRowId === row.id ||
                        savingClientRowId === row.id ||
                        printingRowId === row.id ||
                        clientDialogRow?.id === row.id;
                      const isLocked = isApprovalLocked(approvalRecord) && !isClientRejected;
                      const canSend =
                        !isBusy &&
                        !isApproved &&
                        (!approvalRecord.sentToHead || isAnyStageDeclined(approvalRecord) || isClientRejected);
                      const showPrintAction = isApproved && !isClientRejected;
                      const showClientAction = isApproved && !isClientAccepted && !isClientRejected;
                      const disableSend = !canSend;
                      const disableEditDelete = isBusy || isLocked || (isApproved && !isClientRejected);

                      return (
                        <>
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
                      <div className="space-y-2">
                        <button
                          type="button"
                          className={`inline-flex rounded-full px-4 py-1 text-[10px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,0.16)] ${
                            isClientRejected ? "bg-rose-500" : isApproved ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        >
                          {isClientRejected ? "REJECTED" : isApproved ? "APPROVED" : "NOT APPROVED"}
                        </button>
                        {approvalRecord.sentToHead ? (
                          <p className="max-w-[220px] text-[10px] leading-4 text-sky-700">
                            Head: {getStageLabel(approvalRecord.head.status, "WAITING")}
                            {" | "}
                            MD: {getStageLabel(approvalRecord.md.status, "WAITING")}
                          </p>
                        ) : null}
                        {row.remarks ? (
                          <p className="max-w-[220px] text-[10px] leading-4 text-rose-600">
                            Remarks: {row.remarks}
                          </p>
                        ) : null}
                        {row.client_response_remarks && (isApproved || isClientRejected) ? (
                          <p className={`max-w-[220px] text-[10px] leading-4 ${
                            normalizedClientStatus === "accepted" ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            Client: {row.client_response_remarks}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-r border-slate-100 p-3 text-right text-[13px] font-semibold text-black">
                      {row.currency_symbol || "Rs."} {Number(row.total_net_amount || row.net_amount || 0).toFixed(row.decimal_places || 2)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-3">
                        {showPrintAction ? (
                          <button
                            type="button"
                            onClick={() => openPrintPreview(row.id)}
                            disabled={isBusy}
                            className={`${iconButtonClassName} ${
                              isBusy
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                : "border-emerald-200 bg-emerald-50 text-emerald-600"
                            }`}
                            title="Print quotation"
                          >
                            <Printer size={16} />
                          </button>
                        ) : null}
                        {showClientAction ? (
                          <button
                            type="button"
                            onClick={() => openClientDialog(row)}
                            disabled={isBusy}
                            className={`${iconButtonClassName} ${
                              isBusy
                                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                : "border-sky-200 bg-sky-50 text-sky-600"
                            }`}
                            title="Client response"
                          >
                            <User size={16} />
                          </button>
                        ) : null}
                        {!showPrintAction && !showClientAction ? (
                          <button
                            type="button"
                            onClick={() => handleSendForApproval(row.id)}
                            disabled={disableSend}
                            className={`${iconButtonClassName} ${
                              !disableSend
                                ? "border-violet-200 bg-violet-50 text-violet-600"
                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            }`}
                            title={!disableSend ? "Send quotation for approval" : "Already sent for approval"}
                          >
                            <Send size={16} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(row)}
                          disabled={disableEditDelete}
                          className={`${
                            disableEditDelete ? "cursor-not-allowed text-slate-300" : "text-amber-600"
                          }`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={disableEditDelete}
                          className={`${
                            disableEditDelete ? "cursor-not-allowed text-slate-300" : "text-rose-600"
                          }`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                        </>
                      );
                    })()}
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
