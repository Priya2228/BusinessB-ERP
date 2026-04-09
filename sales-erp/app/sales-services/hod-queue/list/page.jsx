"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";
import { getApprovalRecord, getStageLabel } from "../../approvalWorkflow";
import {
  loadGrnMap,
  loadHodQueueIds,
  saveGrnMap,
  saveHodQueueIds,
  GRN_MAP_STORAGE_KEY,
  HOD_QUEUE_STORAGE_KEY,
} from "../../jobcardQueueStorage.js";

const perPage = 10;

const queueType = (category) => {
  if (!category) return "standard";
  const lower = category.toLowerCase();
  if (lower.includes("completion")) return "completion";
  if (lower.includes("assessment")) return "assessment";
  return "standard";
};

const buildQueueRow = (service, estimation) => ({
  service,
  estimation,
  type: queueType(service?.rfq_category),
});

const isWorkshopService = (service) => {
  const type = (service?.plan_rfq_type || service?.rfq_type || "").toLowerCase();
  return type === "workshop";
};

const formatStatus = (row) => {
  if (row.type === "completion" && row.estimation) {
    const approval = getApprovalRecord(row.estimation.approval_workflow);
    const head = getStageLabel(approval.head.status, "WAITING");
    const md = getStageLabel(approval.md.status, "WAITING");
    return `Head: ${head} / MD: ${md}`;
  }
  if (row.type === "assessment") {
    return "Awaiting document controller";
  }
  return "Standard";
};

const categoryLabel = (row) => {
  if (row.type === "completion") return "Quote of Completion";
  if (row.type === "assessment") return "Quote of Assessment";
  return row.service?.rfq_category || "Standard";
};

export default function HodQueueListPage() {
  const router = useRouter();
  const [queueRows, setQueueRows] = useState([]);
  const [jobcards, setJobcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [hodQueueIds, setHodQueueIds] = useState(() =>
    typeof window === "undefined" ? [] : loadHodQueueIds()
  );
  const [grnMap, setGrnMap] = useState(() =>
    typeof window === "undefined" ? {} : loadGrnMap()
  );

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
    saveHodQueueIds(hodQueueIds);
  }, [hodQueueIds]);

  useEffect(() => {
    saveGrnMap(grnMap);
  }, [grnMap]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === HOD_QUEUE_STORAGE_KEY ||
        event.key === GRN_MAP_STORAGE_KEY
      ) {
        setHodQueueIds(loadHodQueueIds());
        setGrnMap(loadGrnMap());
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");
    try {
      const [svcResponse, estimationResponse] = await Promise.all([
        fetch(buildApiUrl("/api/sales-services/"), { headers: getAuthHeaders() }),
        fetch(buildApiUrl("/api/cost-estimations/"), { headers: getAuthHeaders() }),
      ]);
      const jobcardResponse = await fetch(buildApiUrl("/api/jobcards/"), {
        headers: getAuthHeaders(),
      }).catch(() => null);

      if (!svcResponse.ok) {
        throw new Error("Failed to load queue data.");
      }

      const services = await svcResponse.json();
      const estimationData = estimationResponse.ok ? await estimationResponse.json() : [];
      const estimationMap = (Array.isArray(estimationData) ? estimationData : []).reduce(
        (acc, estimation) => {
          if (estimation?.rfq_no) {
            acc[estimation.rfq_no] = estimation;
          }
          return acc;
        },
        {}
      );

      const rows = (Array.isArray(services) ? services : []).map((service) =>
        buildQueueRow(service, estimationMap[service.rfq_no])
      );

      const jobcardsData = jobcardResponse?.ok ? await jobcardResponse.json() : [];
      setJobcards(Array.isArray(jobcardsData) ? jobcardsData : []);
      setQueueRows(rows);
    } catch {
      setStatusMessage("Unable to load queue. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    return queueRows.filter((row) => {
      if (isWorkshopService(row.service)) return false;
      if (!normalizedSearch) return true;
      const svc = row.service || {};
      return (
        (svc.rfq_no || "").toLowerCase().includes(normalizedSearch) ||
        (svc.company_name || "").toLowerCase().includes(normalizedSearch) ||
        (svc.client_name || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [queueRows, normalizedSearch]);

  const queuedJobcards = useMemo(() => {
    if (!Array.isArray(jobcards) || hodQueueIds.length === 0) return [];
    return jobcards.filter((jobcard) => hodQueueIds.includes(jobcard.id));
  }, [jobcards, hodQueueIds]);

  const filteredJobcards = useMemo(() => {
    if (!normalizedSearch) return queuedJobcards;
    return queuedJobcards.filter((record) => {
      return (
        (record.jobcard_no || "").toLowerCase().includes(normalizedSearch) ||
        (record.rfq_no || "").toLowerCase().includes(normalizedSearch) ||
        (record.company_name || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [queuedJobcards, normalizedSearch]);

  const combinedRows = useMemo(() => {
    const queuedRows = filteredJobcards.map((record) => ({ kind: "jobcard", payload: record }));
    const serviceRows = filteredRows.map((row) => ({ kind: "service", payload: row }));
    return [...queuedRows, ...serviceRows];
  }, [filteredJobcards, filteredRows]);

  const totalPages = Math.max(1, Math.ceil(combinedRows.length / perPage));
  const paginated = combinedRows.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const jobcardMap = useMemo(() => {
    if (!Array.isArray(jobcards)) return {};
    return jobcards.reduce((acc, jobcard) => {
      const keys = new Set();
      if (jobcard?.rfq_no) {
        keys.add(jobcard.rfq_no);
      }
      const poRfq = jobcard?.purchase_order_info?.rfq_no;
      if (poRfq) {
        keys.add(poRfq);
      }
      keys.forEach((key) => {
        if (!acc[key]) {
          acc[key] = jobcard;
        }
      });
      return acc;
    }, {});
  }, [jobcards]);

  const queueRangeStart = combinedRows.length ? (page - 1) * perPage + 1 : 0;
  const queueRangeEnd = Math.min(combinedRows.length, page * perPage);

  const handleView = (row) => {
    if (row.service?.id) {
      router.push(`/sales-services/jobcard/create?rfqId=${row.service.id}`);
    }
  };

  const handleNotify = (row, target) => {
    showToast(`${target} notified for ${row.service?.rfq_no || "RFQ"}.`);
  };

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
            <h1 className="text-[22px] font-bold text-slate-900">HOD Queue</h1>
            
          </div>
          <button
            type="button"
            onClick={() => router.push("/sales-services/jobcard/create")}
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[13px] font-semibold text-emerald-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Plus size={18} />
            
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

        {statusMessage ? (
          <div className="mb-4 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-600">
            {statusMessage}
          </div>
        ) : null}

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
                    No RFQ requests for HOD notification.
                  </td>
                </tr>
              ) : (
                paginated.map((row, index) => {
                  if (row.kind === "jobcard") {
                    const record = row.payload;
                    const poInfo = record.purchase_order_info || {};
                    const jobcardNo = record.jobcard_no || "-";
                    const poNo = poInfo?.po_no || "-";
                    const quotationNo = poInfo?.quotation_no || "-";
                    const grnValue = grnMap[record.id]?.grn_no || record.grn_no || "-";
                    return (
                      <tr key={record.id} className="border-b border-slate-100">
                        <td className="px-3 py-3">{(page - 1) * perPage + index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900">{jobcardNo}</td>
                        <td className="px-3 py-3">{poNo}</td>
                        <td className="px-3 py-3">{quotationNo}</td>
                        <td className="px-3 py-3">{record.rfq_no || "-"}</td>
                        <td className="px-3 py-3">{record.rfq_type || "-"}</td>
                        <td className="px-3 py-3">{record.cost_estimation_no || "-"}</td>
                        <td className="px-3 py-3">{grnValue}</td>
                        <td className="px-3 py-3">{record.company_name || record.attention || "-"}</td>
                        <td className="px-3 py-3">{record.rfq_category || record.category || "Jobcard"}</td>
                        <td className="px-3 py-3">{record.jobcard_status || record.status || "Jobcard created"}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/sales-services/operation-head-registration/create?jobcardId=${record.id}&rfqNo=${encodeURIComponent(
                                    record.rfq_no || ""
                                  )}`
                                )
                              }
                              className="rounded-[12px] border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300"
                            >
                              Op Head
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const { service, estimation } = row.payload;
                  const statusText =
                    row.payload.type === "completion" && estimation
                      ? (() => {
                          const approval = getApprovalRecord(estimation.approval_workflow);
                          const headLabel = getStageLabel(approval.head.status, "WAITING");
                          const mdLabel = getStageLabel(approval.md.status, "WAITING");
                          return `Head: ${headLabel} / MD: ${mdLabel}`;
                        })()
                      : "Awaiting document controller";
                  const svc = service || {};
                  const jobcardRecord = jobcardMap[svc.rfq_no];
                  const poInfo = jobcardRecord?.purchase_order_info || {};
                  const jobcardNo = jobcardRecord?.jobcard_no || "-";
                  const poNo = poInfo?.po_no || "-";
                  const quotationNo = poInfo?.quotation_no || svc.quotation_no || "-";
                  const costEstimationNo =
                    jobcardRecord?.cost_estimation_no || row.estimation?.estimation_no || "-";
                  const grnNo =
                    grnMap[jobcardRecord?.id || ""]?.grn_no || jobcardRecord?.grn_no || "-";
                  return (
                    <tr key={svc.id || `queue-${index}`} className="border-b border-slate-100">
                      <td className="px-3 py-3">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{jobcardNo}</td>
                      <td className="px-3 py-3">{poNo}</td>
                      <td className="px-3 py-3">{quotationNo}</td>
                      <td className="px-3 py-3">{svc.rfq_no || "-"}</td>
                      <td className="px-3 py-3">{svc.plan_rfq_type || svc.rfq_type || "-"}</td>
                      <td className="px-3 py-3">{costEstimationNo}</td>
                      <td className="px-3 py-3">{grnNo}</td>
                      <td className="px-3 py-3">{svc.company_name || svc.attention || "-"}</td>
                      <td className="px-3 py-3">{categoryLabel(row)}</td>
                      <td className="px-3 py-3">{statusText}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(row)}
                            className="rounded-[12px] border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300"
                          >
                            Jobcard
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNotify(row, "HOD")}
                            className="rounded-[12px] border border-sky-200 bg-white px-3 py-1 text-[12px] font-semibold text-sky-600 transition hover:border-sky-300 hover:bg-sky-50"
                          >
                            Notify HOD
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

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {queueRangeStart}-{queueRangeEnd} of {combinedRows.length} requests
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
