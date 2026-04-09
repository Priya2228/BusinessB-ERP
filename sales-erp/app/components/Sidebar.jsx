"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  Grid2X2,
  LayoutGrid,
  Link as LinkIcon,
  LogOut,
  Menu,
  Monitor,
  Settings,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  User,
  Briefcase,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { ROLES, canViewMenuItem, clearAuthState, getStoredAuthState, normalizeRole } from "../utils/rbac";

export default function Sidebar() {
  const pathname = usePathname();
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    setAuthState(getStoredAuthState());
  }, []);

  const role = normalizeRole(authState?.role);
  const isMd = role === ROLES.MD;
  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutGrid size={20} />,
      href: "/Dashboard",
      roles: [
        ROLES.ADMIN,
        ROLES.USER,
        ROLES.SALES_LEAD,
        ROLES.SALES_HEAD,
        ROLES.DEPT_HEAD,
        ROLES.MD,
        ROLES.DOCUMENT_CONTROLLER,
        ROLES.OPERATION_HEAD,
        ROLES.SITE_ENGINEER,
        ROLES.STORE_QUEUE,
      ],
    },
    { name: "Sales", icon: <ShoppingBag size={20} />, href: "/sales", roles: [ROLES.ADMIN, ROLES.SALES_HEAD] },
    { name: "Purchase", icon: <ShoppingCart size={20} />, href: "/purchase", roles: [ROLES.ADMIN] },
    { name: "Master", icon: <SlidersHorizontal size={20} />, href: "/master", roles: [ROLES.ADMIN] },
    { name: "Stock", icon: <Boxes size={20} />, href: "/stock", roles: [ROLES.ADMIN] },
    {
      name: "Sales & Services",
      icon: <Briefcase size={20} />,
      href: "/sales-services",
      roles: [
        ROLES.ADMIN,
        ROLES.USER,
        ROLES.SALES_LEAD,
        ROLES.SALES_HEAD,
        ROLES.DEPT_HEAD,
        ROLES.MD,
        ROLES.DOCUMENT_CONTROLLER,
        ROLES.OPERATION_HEAD,
        ROLES.SITE_ENGINEER,
        ROLES.STORE_QUEUE,
      ],
    },
  ];
  const visibleMenuItems = menuItems.filter(
    (item) => (!item.roles || item.roles.includes(role)) && canViewMenuItem(role, item.href)
  );

  const restrictedRoles = [
    ROLES.MD,
    ROLES.DOCUMENT_CONTROLLER,
    ROLES.OPERATION_HEAD,
    ROLES.SITE_ENGINEER,
    ROLES.STORE_QUEUE,
  ];
  const finalMenuItems = restrictedRoles.includes(role)
    ? visibleMenuItems.filter((item) => ["/Dashboard", "/sales-services"].includes(item.href))
    : visibleMenuItems;

  return (
    <div className="sticky top-0 flex h-screen w-[225px] flex-col bg-white p-6 shadow-sm">
      <div className="mb-10 flex px-2">
        <Image src="/majesticlogo.png" alt="Majestic" width={180} height={54} priority />
      </div>

      <nav className="sidebar-scroll-hidden flex-1 overflow-y-auto">
        <ul className="space-y-6">
          {finalMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/Dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex items-center rounded-full px-4 py-3 transition-colors duration-200 ${
                    isActive ? "bg-sky-100" : ""
                  }`}
                >
                  <span className={isActive ? "text-sky-500" : "text-gray-900 group-hover:text-blue-600"}>
                    {item.icon}
                  </span>
                  <span
                    className={`ml-4 flex-grow text-[15px] font-bold ${
                      isActive ? "text-sky-500" : "text-gray-900 group-hover:text-blue-600"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export function AppHeader() {
  const router = useRouter();
  const dropdownRef = useRef(null);
  const [authState] = useState(() => getStoredAuthState());
  const username = authState?.username || "Adhoc Demo Team";
  const designation = authState?.designation || "";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuthState();
    router.push("/login");
  };

  return (
    <header className="flex h-[58px] items-center justify-between border-b border-slate-200 bg-white px-6">
      <button className="text-slate-700">
        <Menu size={24} />
      </button>
      <div className="flex items-center gap-5 text-slate-700">
        <NotificationBell />
        <Monitor size={18} strokeWidth={1.9} />
        <Grid2X2 size={18} strokeWidth={1.9} />
        <LinkIcon size={18} strokeWidth={1.9} />
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-300 bg-white text-rose-500 shadow-sm"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white">
              B
            </span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-14 z-30 w-[202px] rounded-[26px] border border-slate-200 bg-white px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
              <div className="flex flex-col items-center">
                <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white shadow-[0_8px_22px_rgba(15,23,42,0.12)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-xl font-bold text-white">
                    B
                  </span>
                </div>
                <p className="mt-4 text-center text-[14px] font-bold text-slate-800">{username}</p>
                {designation ? (
                  <p className="mt-1 text-center text-[12px] text-slate-500">{designation}</p>
                ) : null}
              </div>
              <div className="my-5 border-t border-slate-200" />
              <div className="space-y-1">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[15px] text-slate-700 hover:bg-slate-50">
                  <User size={17} />
                  <span>Profile</span>
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[15px] text-slate-700 hover:bg-slate-50">
                  <Settings size={17} />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-[15px] text-slate-700 hover:bg-slate-50"
                >
                  <LogOut size={17} />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="py-6 text-center text-[12px] text-slate-500">
      Copyright <span className="mx-1">&copy;</span> 2026 Business i ERP , a product of{" "}
      <span className="text-blue-500">Adhoc Softwares</span> . All Rights Reserved.
    </footer>
  );
}
