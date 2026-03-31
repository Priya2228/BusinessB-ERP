"use client";

import React from "react";
import Sidebar from "./components/Sidebar";
import NotificationBell from "./components/NotificationBell";
// Fixed: Corrected import path and removed duplicate React import
 
import { 
  DollarSign, ShoppingCart, Briefcase, Users, 
  Receipt, FileText, AlertCircle, UserCheck, 
  Target, Calculator, Building2, FileSearch,
  Monitor, Link as LinkIcon, Menu
} from "lucide-react";

const StatCard = ({ title, value, percentage, icon: Icon, colorClass, trendUp }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
              <Icon size={18} className="text-gray-700" />
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          </div>
          <p className="text-2xl font-bold mt-4 text-gray-900">{value}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center text-[12px] font-semibold text-gray-400 mb-2">
          {trendUp && <span className="text-emerald-500 mr-1">↗</span>}
          {percentage}%
        </div>
        <div className="w-full bg-gray-100 h-[3px] rounded-full overflow-hidden">
          <div className={`h-full w-1/3 rounded-full ${colorClass.split(' ')[0]}`} />
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const stats = [
    { title: "Total Sales", value: "₹0", percentage: "0.0", icon: DollarSign, colorClass: "bg-blue-500 text-blue-500" },
    { title: "Total Expense", value: "₹0", percentage: "0.0", icon: ShoppingCart, colorClass: "bg-orange-400 text-orange-400" },
    { title: "Gross Profit", value: "₹0", percentage: "0.0", icon: Briefcase, colorClass: "bg-emerald-400 text-emerald-400" },
    { title: "Total Customer", value: "0", percentage: "0.0", icon: Users, colorClass: "bg-purple-400 text-purple-400" },
    { title: "Receivable", value: "₹0", percentage: "0.0", icon: Receipt, colorClass: "bg-green-400 text-green-400", trendUp: true },
    { title: "Payable", value: "₹0", percentage: "0.0", icon: FileText, colorClass: "bg-cyan-400 text-cyan-400", trendUp: true },
    { title: "Overdue", value: "₹0", percentage: "0.0", icon: AlertCircle, colorClass: "bg-yellow-400 text-yellow-400" },
    { title: "Total Employee", value: "0", percentage: "0.0", icon: UserCheck, colorClass: "bg-pink-400 text-pink-400" },
    { title: "Total Leads", value: "0", percentage: "0.0", icon: Target, colorClass: "bg-indigo-400 text-indigo-400" },
    { title: "Total Estimation", value: "0", percentage: "0.0", icon: Calculator, colorClass: "bg-teal-400 text-teal-400" },
    { title: "Total Branch", value: "0", percentage: "0.0", icon: Building2, colorClass: "bg-sky-400 text-sky-400" },
    { title: "Pending Quotation", value: "0", percentage: "0.0", icon: FileSearch, colorClass: "bg-amber-400 text-amber-400", trendUp: true },
  ];

  return (
    // Fixed: Wrapped in a flex container so Sidebar and Main content are side-by-side
    <div className="flex min-h-screen bg-[#f8fafc]">
      
      {/* 1. Sidebar Component */}
      <Sidebar />

      {/* 2. Main Dashboard Content */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
          <button className="text-gray-600 hover:bg-gray-50 p-1 rounded">
            <Menu size={22} />
          </button>
          
          <div className="flex items-center gap-5 text-gray-500">
            <NotificationBell iconSize={20} />
            <Users size={20} className="cursor-pointer hover:text-gray-800" />
            <Monitor size={20} className="cursor-pointer hover:text-gray-800" />
            <LinkIcon size={20} className="cursor-pointer hover:text-gray-800" />
            <div className="w-8 h-8 bg-[#e11d48] rounded-full flex items-center justify-center text-white font-bold text-xs cursor-pointer shadow-sm">
              B
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <StatCard key={idx} {...stat} />
            ))}
          </div>

          <footer className="mt-20 mb-10 text-center">
            <p className="text-[11px] text-gray-400 tracking-wide">
              Copyright © 2026 <span className="font-bold text-gray-700 uppercase">Business i ERP</span>
              <span className="text-[8px] align-top ml-0.5">®</span>, a product of{" "}
              <span className="text-blue-500 font-medium cursor-pointer hover:underline">Adhoc Softwares</span>. 
              All Rights Reserved.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
