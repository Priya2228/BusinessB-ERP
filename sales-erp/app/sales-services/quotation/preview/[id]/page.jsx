"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import AppPageShell from "../../../../components/AppPageShell";
import { buildApiUrl } from "../../../../utils/api";

export default function QuotationPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params?.id;

  const previewUrl = useMemo(() => {
    if (!quotationId) return "";
    return buildApiUrl(`/api/view_quotation/${quotationId}/`);
  }, [quotationId]);

  const handlePrint = () => {
    const previewFrame = document.getElementById("quotation-preview-frame");
    if (previewFrame?.contentWindow) {
      previewFrame.contentWindow.focus();
      previewFrame.contentWindow.print();
    }
  };

  return (
    <AppPageShell contentClassName="mx-auto w-full max-w-[1200px] px-3 py-2">
      <div className="mt-3 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h1 className="text-[16px] font-bold text-slate-900">Quotation PDF Preview</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[16px] border border-slate-200 bg-slate-100">
          {previewUrl ? (
            <iframe
              id="quotation-preview-frame"
              src={previewUrl}
              title="Quotation preview"
              className="h-[calc(100vh-180px)] min-h-[720px] w-full bg-white"
            />
          ) : (
            <div className="p-10 text-center text-[13px] text-slate-500">Quotation preview is not available.</div>
          )}
        </div>
      </div>
    </AppPageShell>
  );
}
