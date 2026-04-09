"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";
import { getApprovalRecord, getStageLabel } from "../../approvalWorkflow";
import {
  loadGrnMap,
  loadHodQueueIds,
  loadStoreQueueIds,
  saveGrnMap,
  saveHodQueueIds,
  saveStoreQueueIds,
  GRN_MAP_STORAGE_KEY,
  HOD_QUEUE_STORAGE_KEY,
  STORE_QUEUE_STORAGE_KEY,
} from "../../jobcardQueueStorage.js";

const perPage = 10;
const PURCHASE_ORDER_TOAST_KEY = "majesticsales_purchase_order_toast";

const formatDateValue = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const queueType = (category) => {
  if (!category) return "standard";
  const lower = category.toLowerCase();
  if (lower.includes("completion")) return "completion";
  if (lower.includes("assessment")) return "assessment";
  return "standard";
};

const actionButtonBase =
  "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50";

export default function JobCardListPage() {
  const router = useRouter();
  const toastTimer = useRef(null);
  const [jobcards, setJobcards] = useState([]);
  const [queueRows, setQueueRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [storeQueueIds, setStoreQueueIds] = useState(() =>
    typeof window === "undefined" ? [] : loadStoreQueueIds()
  );
  const [grnMap, setGrnMap] = useState(() =>
    typeof window === "undefined" ? {} : loadGrnMap()
  );
  const [hodQueueIds, setHodQueueIds] = useState(() =>
    typeof window === "undefined" ? [] : loadHodQueueIds()
  );
  const [purchaseOrderMap, setPurchaseOrderMap] = useState({});

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    saveStoreQueueIds(storeQueueIds);
  }, [storeQueueIds]);

  useEffect(() => {
    saveHodQueueIds(hodQueueIds);
  }, [hodQueueIds]);

  useEffect(() => {
    saveGrnMap(grnMap);
  }, [grnMap]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === STORE_QUEUE_STORAGE_KEY ||
        event.key === GRN_MAP_STORAGE_KEY
        || event.key === HOD_QUEUE_STORAGE_KEY
      ) {
        setStoreQueueIds(loadStoreQueueIds());
        setGrnMap(loadGrnMap());
        setHodQueueIds(loadHodQueueIds());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PURCHASE_ORDER_TOAST_KEY);
    if (!stored) return;
    try {
      const payload = JSON.parse(stored);
      if (payload?.message) {
        showToast(payload.message, payload.type || "success");
      }
    } catch {
      /* ignore */
    } finally {
      window.localStorage.removeItem(PURCHASE_ORDER_TOAST_KEY);
    }
  }, [showToast]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const [jobcardResp, svcResp, estimationResp, purchaseOrderResp] = await Promise.all([
        fetch(buildApiUrl("/api/jobcards/"), { headers: getAuthHeaders() }),
        fetch(buildApiUrl("/api/sales-services/"), { headers: getAuthHeaders() }),
        fetch(buildApiUrl("/api/cost-estimations/"), { headers: getAuthHeaders() }),
        fetch(buildApiUrl("/api/purchase-orders/"), { headers: getAuthHeaders() }),
      ]);

      if (!jobcardResp.ok) {
        throw new Error("Failed to load jobcards.");
      }

      const [jobcardsData, servicesData, estimationData] = await Promise.all([
        jobcardResp.json(),
        svcResp.ok ? svcResp.json() : [],
        estimationResp.ok ? estimationResp.json() : [],
      ]);
      const purchaseOrdersData = purchaseOrderResp.ok ? await purchaseOrderResp.json() : [];

      setJobcards(Array.isArray(jobcardsData) ? jobcardsData : []);

      const estimationMap = (Array.isArray(estimationData) ? estimationData : []).reduce((acc, estimation) => {
        if (estimation?.rfq_no) {
          acc[estimation.rfq_no] = estimation;
        }
        return acc;
      }, {});

      const queue = (Array.isArray(servicesData) ? servicesData : []).map((service) => ({
        service,
        estimation: estimationMap[service.rfq_no],
        type: queueType(service.rfq_category),
      }));

      const purchaseOrders = Array.isArray(purchaseOrdersData) ? purchaseOrdersData : [];
      const purchaseMap = purchaseOrders.reduce((acc, order) => {
        const keys = [];
        if (order?.rfq_no) keys.push(order.rfq_no);
        if (order?.quotation_no) keys.push(order.quotation_no);
        keys.forEach((key) => {
          if (key) {
            acc[key] = order;
          }
        });
        return acc;
      }, {});
      setPurchaseOrderMap(purchaseMap);

      setQueueRows(queue);
    } catch (err) {
      showToast(err?.message || "Unable to load data.", "error");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const combinedRows = useMemo(() => {
    return jobcards.map((record) => ({ kind: "jobcard", payload: record }));
  }, [jobcards]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return combinedRows;
    return combinedRows.filter((item) => {
      const svc = item.kind === "queue" ? item.payload.service : item.payload;
      return (
        (svc?.company_name || "").toLowerCase().includes(normalizedSearch) ||
        (svc?.client_name || "").toLowerCase().includes(normalizedSearch) ||
        (svc?.rfq_no || "").toLowerCase().includes(normalizedSearch) ||
        (svc?.quotation_no || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [combinedRows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const paginated = filteredRows.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleEdit = (record) => {
    router.push(`/sales-services/jobcard/create?jobcardId=${record.id}`);
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete jobcard ${record.jobcard_no}?`)) return;
    try {
      const response = await fetch(buildApiUrl(`/api/jobcards/${record.id}/`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error("Delete failed.");
      }
      setJobcards((prev) => prev.filter((item) => item.id !== record.id));
      showToast(`Jobcard ${record.jobcard_no} deleted.`, "success");
    } catch {
      showToast("Network error while deleting jobcard.", "error");
    }
  };

  const handleNotify = (record, target) => {
    const lowerTarget = target?.toLowerCase();
    if (lowerTarget === "store" && !storeQueueIds.includes(record.id)) {
      const nextQueue = [...storeQueueIds, record.id];
      setStoreQueueIds(nextQueue);
      showToast(`Store notified for ${record.jobcard_no}.`, "success");
      return;
    }
    if (lowerTarget === "hod" && !hodQueueIds.includes(record.id)) {
      setHodQueueIds((prev) => [...prev, record.id]);
      showToast(`HOD notified for ${record.jobcard_no}.`, "success");
      return;
    }

    showToast(`${target} notified for ${record.jobcard_no}.`, "success");
  };

  const openJobcardFromQueue = (service) => {
    router.push(`/sales-services/jobcard/create?rfqId=${service.id}`);
  };

  const categoryLabel = (item) => {
    if (item.kind === "jobcard") return "Jobcard";
    if (item.payload.service.rfq_category) return item.payload.service.rfq_category;
    return item.payload.type === "completion"
      ? "Quote of Completion"
      : item.payload.type === "assessment"
        ? "Quote of Assessment"
        : "Standard";
  };

  const statusLabel = (item) => {
    if (item.kind === "jobcard") return "Jobcard created";
    if (item.payload.type === "completion" && item.payload.estimation) {
      const approval = getApprovalRecord(item.payload.estimation.approval_workflow);
      const headLabel = getStageLabel(approval.head.status, "WAITING");
      const mdLabel = getStageLabel(approval.md.status, "WAITING");
      return `Head: ${headLabel} / MD: ${mdLabel}`;
    }
    return "Awaiting document controller";
  };

  const queueRangeStart = filteredRows.length ? (page - 1) * perPage + 1 : 0;
  const queueRangeEnd = Math.min(filteredRows.length, page * perPage);

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
      {toast ? (
        <div
          className={`fixed right-5 top-5 z-[100] flex items-center gap-3 rounded-xl px-4 py-2 text-[13px] font-semibold shadow-2xl transition-all duration-200 ${
            toast.type === "success" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      ) : null}

      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Jobcard List</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-services/jobcard/create")}
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[13px] font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Plus size={18} />
            Add jobcard
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-[320px]">
            <label className="mb-1 block text-[12px] font-semibold text-slate-500">Filter</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search RFQ / company / client"
              className="w-full rounded-[12px] border border-slate-200 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-sky-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left text-[12px] text-slate-700">
            <thead className="bg-[#f5f9ff] text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Sl No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Jobcard</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">P.O. No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Quotation No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">RFQ No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">RFQ Type</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Cost Estimation</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">GRN No</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Company</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Category</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Status</th>
                <th className="border-b border-slate-200 px-3 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    Loading queue...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-12 text-center text-[13px] text-slate-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => {
                  if (item.kind === "jobcard") {
                    const record = item.payload;
                    const poInfo = record.purchase_order_info || {};
                    const attachmentUrl = poInfo.file_attachment;
                    const attachmentLabel = poInfo.file_name || attachmentUrl?.split("/").pop() || "-";
                    const isWorkshop = (record.rfq_type || "").toLowerCase() === "workshop";
                    const grnInfo = grnMap[record.id] || {};
                    const grnValue = record.grn_no || grnInfo.grn_no || "-";
                    const hasGrn = Boolean(record.grn_no || grnInfo.grn_no);
                    const isQueued = storeQueueIds.includes(record.id);
                    return (
                      <tr key={record.id} className="border-b border-slate-100">
                        <td className="px-3 py-3">{(page - 1) * perPage + index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{record.jobcard_no}</td>
                        <td className="px-3 py-3">{poInfo.po_no || "-"}</td>
                        <td className="px-3 py-3">{poInfo.quotation_no || "-"}</td>
                        <td className="px-3 py-3">{record.rfq_no || "-"}</td>
                        <td className="px-3 py-3">{record.rfq_type || "-"}</td>
                        <td className="px-3 py-3">{record.cost_estimation_no || "-"}</td>
                        <td className="px-3 py-3">{grnValue}</td>
                        <td className="px-3 py-3">{record.company_name || record.attention || "-"}</td>
                        <td className="px-3 py-3">{record.rfq_category || record.category || "Jobcard"}</td>
                        <td className="px-3 py-3">
                          {record.jobcard_status || record.status || "Jobcard created"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(record)}
                              className={`${actionButtonBase} text-slate-700`}
                              title="Edit jobcard"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(record)}
                              className={`${actionButtonBase} border-rose-200 text-rose-600 hover:border-rose-300`}
                              title="Delete jobcard"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleNotify(record, "HOD")}
                              disabled={isWorkshop && !hasGrn}
                              className={`rounded-[12px] border px-3 py-1 text-[12px] font-semibold transition ${
                                isWorkshop && !hasGrn
                                  ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "border-slate-200 bg-white text-sky-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              Notify HOD
                            </button>
                            {isWorkshop && (
                              <button
                                type="button"
                                onClick={() => handleNotify(record, "Store")}
                                disabled={hasGrn || isQueued}
                                className={`rounded-[12px] border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-emerald-600 transition ${
                                  hasGrn || isQueued ? "cursor-not-allowed border-slate-200 text-slate-400" : "hover:border-slate-300 hover:bg-emerald-50"
                                }`}
                              >
                                Notify Store
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  const { service, estimation } = item.payload;
                  const svc = service || {};
                  const statusText =
                    item.payload.type === "completion" && estimation
                      ? (() => {
                          const approval = getApprovalRecord(estimation.approval_workflow);
                          const headLabel = getStageLabel(approval.head.status, "WAITING");
                          const mdLabel = getStageLabel(approval.md.status, "WAITING");
                          return `Head: ${headLabel} / MD: ${mdLabel}`;
                        })()
                      : "Awaiting document controller";
                  const jobcardRecord = jobcardMap[svc.rfq_no];
                  const poInfo = jobcardRecord?.purchase_order_info || {};
                  const matchedPurchaseOrder =
                    purchaseOrderMap[svc.rfq_no] || purchaseOrderMap[svc.quotation_no];
                  const poNo = matchedPurchaseOrder?.po_no || poInfo?.po_no || "-";
                  const quotationNo =
                    matchedPurchaseOrder?.quotation_no || poInfo?.quotation_no || svc.quotation_no || "-";
                  return (
                    <tr key={svc.id || `queue-${index}`} className="border-b border-slate-100">
                      <td className="px-3 py-3">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-3 py-3">-</td>
                      <td className="px-3 py-3">{poNo}</td>
                      <td className="px-3 py-3">{quotationNo}</td>
                      <td className="px-3 py-3">{svc.rfq_no || "-"}</td>
                      <td className="px-3 py-3">{svc.plan_rfq_type || svc.rfq_type || "-"}</td>
                      <td className="px-3 py-3">{estimation ? estimation.estimation_no : "-"}</td>
                      <td className="px-3 py-3">-</td>
                      <td className="px-3 py-3">{svc.company_name || svc.attention || "-"}</td>
                      <td className="px-3 py-3">{categoryLabel(item)}</td>
                      <td className="px-3 py-3">{statusText}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => openJobcardFromQueue(svc)}
                          className="rounded-[12px] border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300"
                        >
                          Jobcard
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {queueRangeStart}-{queueRangeEnd} of {filteredRows.length} requests
          </p>
          <div className="flex items-center gap-2 font-semibold">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className={`rounded-full border px-3 py-1 transition ${
                page === 1 ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Previous
            </button>
            <span className="text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className={`rounded-full border px-3 py-1 transition ${
                page === totalPages ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AppPageShell>
  );
}
