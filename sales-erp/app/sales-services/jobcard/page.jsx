"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import AppPageShell from "../../components/AppPageShell";
import { buildApiUrl } from "../../utils/api";
import { getApprovalRecord, getStageLabel } from "../approvalWorkflow";

const perPage = 10;

const buildQueueRow = (service, estimation, type) => ({
  service,
  estimation,
  type,
});

export default function JobCardQueuePage() {
  const router = useRouter();
  const [queueRows, setQueueRows] = useState([]);
  const [jobcards, setJobcards] = useState([]);
  const [purchaseOrderMap, setPurchaseOrderMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState("");

  const getAuthHeaders = useCallback(() => {
    if (typeof window === "undefined") return {};
    const token = window.localStorage.getItem("token");
    return token ? { Authorization: `Token ${token}` } : {};
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setStatusMessage("");
    try {
    const [svcResponse, estimationResponse, purchaseOrderResponse] = await Promise.all([
      fetch(buildApiUrl("/api/sales-services/"), { headers: getAuthHeaders() }),
      fetch(buildApiUrl("/api/cost-estimations/"), { headers: getAuthHeaders() }),
      fetch(buildApiUrl("/api/purchase-orders/"), { headers: getAuthHeaders() }),
    ]);
    const jobcardResponse = await fetch(buildApiUrl("/api/jobcards/"), { headers: getAuthHeaders() }).catch(() => null);

      if (!svcResponse.ok) {
        throw new Error("Failed to load RFQ data.");
      }

      const services = await svcResponse.json();
      const estimationData = estimationResponse.ok ? await estimationResponse.json() : [];
      const estimationMap = (Array.isArray(estimationData) ? estimationData : []).reduce((acc, estimation) => {
        if (estimation?.rfq_no) {
          acc[estimation.rfq_no] = estimation;
        }
        return acc;
      }, {});

      const rows = (Array.isArray(services) ? services : []).map((service) => {
        const type = (service.rfq_category || "Standard").toLowerCase().includes("completion")
          ? "completion"
          : (service.rfq_category || "Standard").toLowerCase().includes("assessment")
          ? "assessment"
          : "standard";
        return buildQueueRow(service, estimationMap[service.rfq_no], type);
      });

      const jobcardsData = jobcardResponse?.ok ? await jobcardResponse.json() : [];
      setJobcards(Array.isArray(jobcardsData) ? jobcardsData : []);
      const purchaseOrdersData = purchaseOrderResponse.ok ? await purchaseOrderResponse.json() : [];
      const poMap = (Array.isArray(purchaseOrdersData) ? purchaseOrdersData : []).reduce((acc, order) => {
        const keys = new Set();
        if (order?.rfq_no) {
          keys.add(order.rfq_no);
        }
        if (order?.quotation_no) {
          keys.add(order.quotation_no);
        }
        keys.forEach((key) => {
          if (key) acc[key] = order;
        });
        return acc;
      }, {});
      setPurchaseOrderMap(poMap);
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

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return queueRows;
    return queueRows.filter((row) => {
      const svc = row.service || {};
      return (
        (svc.rfq_no || "").toLowerCase().includes(value) ||
        (svc.company_name || "").toLowerCase().includes(value) ||
        (svc.client_name || "").toLowerCase().includes(value)
      );
    });
  }, [search, queueRows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

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

  const queueRangeStart = filtered.length ? (page - 1) * perPage + 1 : 0;
  const queueRangeEnd = Math.min(filtered.length, page * perPage);

  const categoryLabel = (row) => {
    if (row.type === "completion") return "Quote of Completion";
    if (row.type === "assessment") return "Quote of Assessment";
    return row.service?.rfq_category || "Standard";
  };

  const statusText = (row) => {
    if (row.type === "completion" && row.estimation) {
      const approval = getApprovalRecord(row.estimation.approval_workflow);
      const head = getStageLabel(approval.head.status, "WAITING");
      const md = getStageLabel(approval.md.status, "WAITING");
      return `Head: ${head} / MD: ${md}`;
    }
    if (row.type === "assessment") {
      return "No approval needed";
    }
    return "Standard";
  };

  const handleView = (row) => {
    const rfqId = row.service?.id;
    if (!rfqId) return;
    router.push(`/sales-services/jobcard/create?rfqId=${rfqId}`);
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1240px] px-4 py-4">
      <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-slate-900">Jobcard Queue - Document Controller</h1>
            <p className="text-[12px] text-slate-500">Showing both assessment and completion requests</p>
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
                    No RFQ requests in the queue.
                  </td>
                </tr>
              ) : (
                paginated.map((row, index) => {
                  const svc = row.service || {};
                  const jobcardRecord = jobcardMap[svc.rfq_no];
                  const poInfo = jobcardRecord?.purchase_order_info || {};
                  const jobcardNo = jobcardRecord?.jobcard_no || "-";
                  const matchedPurchaseOrder =
                    purchaseOrderMap[svc.rfq_no] || purchaseOrderMap[svc.quotation_no];
                  const poNo = matchedPurchaseOrder?.po_no || poInfo?.po_no || "-";
                  const quotationNo =
                    matchedPurchaseOrder?.quotation_no || poInfo?.quotation_no || svc.quotation_no || "-";
                  const costEstimationNo = jobcardRecord?.cost_estimation_no || row.estimation?.estimation_no || "-";
                  return (
                    <tr key={svc.id || index} className="border-b border-slate-100">
                      <td className="px-3 py-3">{(page - 1) * perPage + index + 1}</td>
                      <td className="px-3 py-3 font-semibold text-slate-900">{jobcardNo}</td>
                      <td className="px-3 py-3">{poNo}</td>
                      <td className="px-3 py-3">{quotationNo}</td>
                      <td className="px-3 py-3">{svc.rfq_no || "-"}</td>
                      <td className="px-3 py-3">{svc.plan_rfq_type || svc.rfq_type || "-"}</td>
                      <td className="px-3 py-3">{costEstimationNo}</td>
                      <td className="px-3 py-3">-</td>
                      <td className="px-3 py-3">{svc.company_name || svc.attention || "-"}</td>
                      <td className="px-3 py-3">{categoryLabel(row)}</td>
                      <td className="px-3 py-3">{statusText(row)}</td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => handleView(row)}
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
            Showing {queueRangeStart}-{queueRangeEnd} of {filtered.length} requests
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
