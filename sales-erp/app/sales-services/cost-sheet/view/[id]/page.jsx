"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppPageShell from "../../../../components/AppPageShell";
import { buildApiUrl } from "../../../../utils/api";

const sectionTitles = {
  rawMaterial: "Raw Material",
  productionCost: "Services",
  addonCost: "Overhead",
  sewingCost: "Manpower",
  packagingLogistics: "Transport",
  threadworkFinishing: "Threadwork & Finishing",
  miscellaneous: "Miscellaneous",
};

const summaryOrder = [
  ["rawMaterial", "Raw Material Total"],
  ["productionCost", "Services Total"],
  ["addonCost", "Overhead Total"],
  ["sewingCost", "Manpower Total"],
  ["packagingLogistics", "Transport Total"],
  ["threadworkFinishing", "Threadwork & Finishing Total"],
  ["miscellaneous", "Miscellaneous Total"],
];

function InfoCell({ label, value, gray = false }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-[13px] font-bold ${gray ? "text-slate-500" : "text-slate-900"}`}>{value || "-"}</p>
    </div>
  );
}

function SectionTable({ title, rows, total }) {
  return (
    <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-gray-700">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>
        <span className="text-[12px] font-semibold text-slate-600">Total: {Number(total || 0).toFixed(2)}</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-[12px] border border-slate-200">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="bg-[#f8fafc] text-slate-600">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Item</th>
              <th className="px-3 py-2.5 font-semibold">Details</th>
              <th className="px-3 py-2.5 font-semibold">Unit</th>
              <th className="px-3 py-2.5 font-semibold">Rate</th>
              <th className="px-3 py-2.5 font-semibold">No of units</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length ? (
              rows.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-2.5 text-slate-700">{item.itemName || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{item.details || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{item.unit || "-"}</td>
                  <td className="px-3 py-2.5 text-slate-700">{Number(item.rate || 0).toFixed(2)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{item.quantity || 0}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{Number(item.amount || 0).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                  No records added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function CostEstimationViewPage() {
  const params = useParams();
  const router = useRouter();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const loadRow = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(buildApiUrl(`/api/cost-estimations/${params.id}/`));
        if (!response.ok) {
          setError("Failed to fetch cost estimation details.");
          return;
        }

        const data = await response.json();
        setRow(data);
      } catch {
        setError("Network error while fetching cost estimation details.");
      } finally {
        setLoading(false);
      }
    };

    if (params?.id) {
      loadRow();
    }
  }, [params?.id, router]);

  return (
    <AppPageShell
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
    >
            <div className="mt-3 rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
              <div className="mx-auto max-w-[1180px]">
                <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                  <div>
                    <h1 className="text-[16px] font-bold text-slate-900">Cost Estimation View</h1>
                    <p className="mt-1 text-[11px] text-slate-500">{row?.estimation_no || "Loading record"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push("/sales-services/cost-sheet/list")}
                      className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700"
                      title="Back to list"
                    >
                      <ArrowLeft size={18} />
                    </button>
                   
                  </div>
                </div>

                {loading ? (
                  <div className="mt-5 rounded-[18px] border border-slate-200 bg-white p-10 text-center text-[13px] text-slate-500 shadow-sm">
                    Loading...
                  </div>
                ) : error ? (
                  <div className="mt-5 rounded-[18px] border border-slate-200 bg-white p-10 text-center text-[13px] text-red-500 shadow-sm">
                    {error}
                  </div>
                ) : row ? (
                  <div className="mt-5 grid gap-5">
                    <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-gray-700">
                      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                        <InfoCell label="Cost Estimation Id" value={row.estimation_no} gray />
                        <InfoCell label="Ref No" value={row.rfq_no} />
                        <InfoCell label="Client Name" value={row.client_name} />
                        <InfoCell label="Phone No" value={row.phone_no} />
                        <InfoCell label="Company" value={row.company_name} />
                      </div>
                    </section>

                    {Object.entries(sectionTitles).map(([key, title]) => (
                      <SectionTable
                        key={key}
                        title={title}
                        rows={Array.isArray(row.sections?.[key]) ? row.sections[key] : []}
                        total={row.section_totals?.[key] || 0}
                      />
                    ))}

                    <div className="grid gap-4 md:grid-cols-12">
                      <div className="md:col-span-8 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-gray-700">
                        
                        
                      </div>

                      <div className="md:col-span-4">
                        <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
                          <h3 className="mb-4 text-[18px] font-bold text-black">Summary</h3>
                          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            {summaryOrder.map(([key, label]) => (
                              <div key={key} className="flex items-center justify-between border-b border-gray-200 pb-3 text-gray-700">
                                <span className="text-[13px] font-semibold text-black">{label}</span>
                                <span className="text-[13px] font-semibold">{Number(row.section_totals?.[key] || 0).toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-gray-900">
                              <span className="text-[16px] font-bold text-black">Grand Total</span>
                              <span className="text-[16px] font-bold text-black">{Number(row.grand_total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
    </AppPageShell>
  );
}
