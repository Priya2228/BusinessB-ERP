"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import AppPageShell from "../../../components/AppPageShell";
import { buildApiUrl } from "../../../utils/api";
import { getApprovalRecord, getStageLabel } from "../../approvalWorkflow";
import {
  loadGrnMap,
  loadStoreQueueIds,
  saveGrnMap,
  saveStoreQueueIds,
  GRN_MAP_STORAGE_KEY,
  STORE_QUEUE_STORAGE_KEY,
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

export default function StoreQueueListPage() {
  const router = useRouter();
  const [queueRows, setQueueRows] = useState([]);
  const [jobcards, setJobcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");
  const [storeQueueIds, setStoreQueueIds] = useState(() =>
    typeof window === "undefined" ? [] : loadStoreQueueIds()
  );
  const [grnMap, setGrnMap] = useState(() =>
    typeof window === "undefined" ? {} : loadGrnMap()
  );
  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  useEffect(() => {
    saveStoreQueueIds(storeQueueIds);
  }, [storeQueueIds]);

  useEffect(() => {
    saveGrnMap(grnMap);
  }, [grnMap]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === STORE_QUEUE_STORAGE_KEY ||
        event.key === GRN_MAP_STORAGE_KEY
      ) {
        setStoreQueueIds(loadStoreQueueIds());
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

  const queuedJobcards = useMemo(() => {
    if (!Array.isArray(jobcards) || storeQueueIds.length === 0) return [];
    return jobcards.filter((jobcard) => storeQueueIds.includes(jobcard.id));
  }, [jobcards, storeQueueIds]);

  const combinedRows = useMemo(() => {
    const queuedRows = queuedJobcards.map((record) => ({ kind: "jobcard", payload: record }));
    const serviceRows = queueRows.map((serviceRow) => ({ kind: "service", payload: serviceRow }));
    return [...queuedRows, ...serviceRows];
  }, [queuedJobcards, queueRows]);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return combinedRows.filter((row) => {
      if (row.kind === "jobcard") {
        if (!normalized) return true;
        const record = row.payload;
        return (
          (record.jobcard_no || "").toLowerCase().includes(normalized) ||
          (record.rfq_no || "").toLowerCase().includes(normalized) ||
          (record.company_name || "").toLowerCase().includes(normalized)
        );
      }

      const svc = row.payload.service || {};
      if (!isWorkshopService(svc)) return false;
      if (!normalized) return true;
      return (
        (svc.rfq_no || "").toLowerCase().includes(normalized) ||
        (svc.company_name || "").toLowerCase().includes(normalized) ||
        (svc.client_name || "").toLowerCase().includes(normalized)
      );
    });
  }, [combinedRows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const paginated = filteredRows.slice((page - 1) * perPage, page * perPage);

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

  const queueRangeStart = filteredRows.length ? (page - 1) * perPage + 1 : 0;
  const queueRangeEnd = Math.min(filteredRows.length, page * perPage);

  const handleView = (row) => {
    if (row.service?.id) {
      router.push(`/sales-services/jobcard/create?rfqId=${row.service.id}`);
    }
  };

  const openShopfloorExecution = (jobcardId) => {
    if (!jobcardId) return;
    router.push(`/sales-services/shopfloorprocessflow/${jobcardId}`);
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">

      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Store Queue</h1>
            
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
                    No workshop RFQ requests for Store notification.
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
                              onClick={() => openShopfloorExecution(record.id)}
                              className="rounded-[12px] border border-emerald-200 bg-white px-3 py-1 text-[12px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50"
                            >
                              Shopfloor
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
