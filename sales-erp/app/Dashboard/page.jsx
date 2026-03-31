"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  DollarSign, ShoppingCart, Briefcase, Users, 
  Receipt, FileText, AlertCircle, UserCheck,
  Target, Calculator, Building2, FileSearch
} from "lucide-react";
import AppPageShell from "../components/AppPageShell";

// --- Sub-component: StatCard ---
const StatCard = ({ title, value, percentage, icon: Icon, colorClass, trendUp }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-40 hover:shadow-md transition-all group">
    <div className="flex justify-between items-start">
      <div>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
            <Icon size={18} />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        </div>
        <p className="text-2xl font-bold mt-4 text-gray-900">{value}</p>
      </div>
    </div>
    <div>
      <div className="flex items-center text-[12px] font-semibold text-gray-400 mb-2">
        {trendUp && <span className="text-emerald-500 mr-1 text-sm">↑</span>}
        {percentage}%
      </div>
      <div className="w-full bg-gray-100 h-[4px] rounded-full overflow-hidden">
        <div className={`h-full w-1/3 rounded-full ${colorClass.split(' ')[0]}`} />
      </div>
    </div>
  </div>
);

// --- Main Dashboard Page ---
export default function Dashboard() {
  const router = useRouter();

  // 1. Authentication Guard
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      router.push("/login"); // Redirect to login if not authenticated
    }
  }, [router]);

  const stats = [
    { title: "Total Sales", value: "₹0", percentage: "0.0", icon: DollarSign, colorClass: "bg-blue-500 text-blue-600" },
    { title: "Total Expense", value: "₹0", percentage: "0.0", icon: ShoppingCart, colorClass: "bg-orange-400 text-orange-500" },
    { title: "Gross Profit", value: "₹0", percentage: "0.0", icon: Briefcase, colorClass: "bg-emerald-400 text-emerald-600" },
    { title: "Total Customer", value: "0", percentage: "0.0", icon: Users, colorClass: "bg-purple-400 text-purple-600" },
    { title: "Receivable", value: "₹0", percentage: "0.0", icon: Receipt, colorClass: "bg-green-400 text-green-600", trendUp: true },
    { title: "Payable", value: "₹0", percentage: "0.0", icon: FileText, colorClass: "bg-cyan-400 text-cyan-600", trendUp: true },
    { title: "Overdue", value: "₹0", percentage: "0.0", icon: AlertCircle, colorClass: "bg-yellow-400 text-yellow-600" },
    { title: "Total Employee", value: "0", percentage: "0.0", icon: UserCheck, colorClass: "bg-pink-400 text-pink-600" },
    { title: "Total Leads", value: "0", percentage: "0.0", icon: Target, colorClass: "bg-indigo-400 text-indigo-600" },
    { title: "Total Estimation", value: "0", percentage: "0.0", icon: Calculator, colorClass: "bg-teal-400 text-teal-600" },
    { title: "Total Branch", value: "0", percentage: "0.0", icon: Building2, colorClass: "bg-sky-400 text-sky-600" },
    { title: "Pending Quotation", value: "0", percentage: "0.0", icon: FileSearch, colorClass: "bg-amber-400 text-amber-600", trendUp: true },
  ];

  return (
    <AppPageShell
      mainClassName="custom-scrollbar"
      contentClassName="mx-auto w-full max-w-[1100px] px-3 py-2"
      contentWrapperClassName="mt-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
    >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Operational Overview</h2>
            <p className="text-gray-500 text-sm">Welcome back! Here&apos;s what&apos;s happening in your business today.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} />
            ))}
          </div>

      {/* Activate Windows Visual (Matches your screenshot style) */}
      <div className="fixed bottom-8 right-8 pointer-events-none select-none text-right opacity-20">
        <p className="text-gray-500 text-xl font-light">Activate Windows</p>
        <p className="text-gray-400 text-sm">Go to Settings to activate Windows.</p>
      </div>
    </AppPageShell>
  );
}
