"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Calculator, FileSpreadsheet, ReceiptText, UserCheck, X } from "lucide-react";
import AppPageShell from "../components/AppPageShell";

const quickLinks = [
  { title: "RFQ", icon: FileSpreadsheet, href: "/sales-services/rfq" },
  { title: "Cost Sheet", icon: Calculator, href: "/sales-services/cost-sheet" },
  { title: "Quotation", icon: ReceiptText, href: "/sales-services/quotation" },
  { title: "Dept Head Cost Estimation List", icon: UserCheck, href: "/sales-services/dept-head-cost-estimation-list" },
  { title: "MD Cost Estimation List", icon: BriefcaseBusiness, href: "/sales-services/md-cost-estimation-list" },
  { title: "Head Quotation List", icon: UserCheck, href: "/sales-services/head-quotation-list" },
  { title: "MD Quotation List", icon: BriefcaseBusiness, href: "/sales-services/md-quotation-list" },
];

export default function SalesServicesPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <AppPageShell
      mainClassName="relative"
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
    >
            <div className="mt-3 rounded-[24px] border border-slate-300 bg-white px-6 py-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <h1 className="text-[18px] font-bold text-slate-900">Sales & Services</h1>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-5">
                <div className="h-[36px] rounded-[10px] border border-slate-300 bg-white" />
                <div className="h-[36px] rounded-[10px] border border-slate-300 bg-white" />
                <div className="h-[36px] rounded-[10px] border border-slate-300 bg-white" />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="h-[36px] w-[62px] rounded-[6px] border border-slate-300 bg-white" />
                <div className="h-[36px] w-[176px] rounded-[6px] border border-slate-300 bg-white" />
              </div>

              <div className="mt-11 h-[250px] rounded-[12px] border border-sky-100 bg-white" />
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 px-6">
              <div className="w-full max-w-[860px] rounded-[22px] border border-slate-200 bg-white px-6 py-6 shadow-[0_24px_50px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-bold text-slate-900">Sales & Services - Quick Links</h2>
                  <button
                    type="button"
                    onClick={() => router.push("/Dashboard")}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-400 text-white shadow-[0_10px_18px_rgba(251,113,133,0.35)]"
                  >
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-4">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.title}
                        type="button"
                        onClick={() => router.push(link.href)}
                        className="flex items-center gap-3 rounded-[14px] border border-slate-100 bg-white px-4 py-4 text-left shadow-[0_8px_22px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-sky-300 text-sky-500">
                          <Icon size={18} />
                        </span>
                        <span className="text-[15px] font-semibold text-slate-700">{link.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
    </AppPageShell>
  );
}
