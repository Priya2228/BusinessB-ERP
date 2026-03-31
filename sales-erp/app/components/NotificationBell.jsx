"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { APP_EVENTS, STORAGE_KEYS, readJsonStorage } from "../utils/businessRules";

const SUPPORTED_ALERT_TYPES = new Set(["out_of_stock", "stock_aging"]);
const READ_STORAGE_KEY = "inventoryNotificationReadSignatures";

const getAlertSignature = (alert) =>
  [
    alert?.type || "",
    alert?.item_code || "",
    alert?.item_name || "",
    alert?.quantity ?? "",
    alert?.age_days ?? "",
  ].join("|");

const formatAlertTitle = (alert) => {
  const itemName = alert?.item_name || alert?.item_code || "Item";

  if (alert?.type === "out_of_stock") {
    return `${itemName} is out of stock.`;
  }

  if (alert?.type === "stock_aging") {
    return `${itemName} stock is aging${alert?.age_days ? ` for ${alert.age_days} days` : ""}.`;
  }

  return itemName;
};

const formatAlertMeta = (alert) => {
  if (alert?.type === "out_of_stock") {
    const minimumText = alert?.min_stock_qty ? ` | Min stock ${alert.min_stock_qty}` : "";
    return `Available qty ${alert?.quantity ?? 0}${minimumText}`;
  }

  if (alert?.type === "stock_aging") {
    return `Available qty ${alert?.quantity ?? 0} | Clearance required`;
  }

  return "Needs attention";
};

const readReadSignatures = () => {
  if (typeof window === "undefined") return [];
  return readJsonStorage(READ_STORAGE_KEY, []);
};

export default function NotificationBell({ iconSize = 18, panelWidthClass = "w-[380px]" }) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [alerts, setAlerts] = useState([]);
  const [readSignatures, setReadSignatures] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAlerts = () => {
      const nextAlerts = readJsonStorage(STORAGE_KEYS.alerts, []).filter((alert) =>
        SUPPORTED_ALERT_TYPES.has(alert?.type)
      );
      setAlerts(nextAlerts);
      setReadSignatures(readReadSignatures());
    };

    syncAlerts();
    window.addEventListener(APP_EVENTS.alertsUpdated, syncAlerts);
    window.addEventListener("storage", syncAlerts);

    return () => {
      window.removeEventListener(APP_EVENTS.alertsUpdated, syncAlerts);
      window.removeEventListener("storage", syncAlerts);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadAlerts = useMemo(
    () => alerts.filter((alert) => !readSignatures.includes(getAlertSignature(alert))),
    [alerts, readSignatures]
  );

  const visibleAlerts = activeTab === "unread" ? unreadAlerts : alerts;

  const markAlertsAsRead = () => {
    if (typeof window === "undefined" || alerts.length === 0) return;

    const nextReadSignatures = Array.from(
      new Set([...readSignatures, ...alerts.map(getAlertSignature)])
    );

    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(nextReadSignatures));
    setReadSignatures(nextReadSignatures);
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const nextOpen = !prev;
      if (nextOpen) {
        setActiveTab("all");
        markAlertsAsRead();
      }
      return nextOpen;
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:text-blue-600"
        aria-label="Notifications"
      >
        <Bell size={iconSize} strokeWidth={1.9} />
        {unreadAlerts.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadAlerts.length > 9 ? "9+" : unreadAlerts.length}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={`absolute right-0 top-11 z-40 overflow-hidden rounded-[22px] border border-slate-200 bg-[#f8fbff] shadow-[0_20px_45px_rgba(15,23,42,0.18)] ${panelWidthClass}`}
        >
          <div className="border-b border-slate-200 bg-white/70 px-5 py-4 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-bold text-slate-900">Notifications</h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  {alerts.length === 0
                    ? "All caught up"
                    : `${unreadAlerts.length} unread alert${unreadAlerts.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 inline-flex rounded-[12px] border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`rounded-[10px] px-4 py-2 text-[12px] font-bold ${activeTab === "all" ? "bg-blue-50 text-blue-600" : "text-slate-500"}`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`rounded-[10px] px-4 py-2 text-[12px] font-bold ${activeTab === "unread" ? "bg-blue-50 text-blue-600" : "text-slate-500"}`}
              >
                UNREAD
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto px-3 py-4">
            {visibleAlerts.length > 0 ? (
              <div className="space-y-3">
                <p className="px-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Earlier
                </p>
                {visibleAlerts.map((alert) => {
                  const signature = getAlertSignature(alert);
                  const isUnread = !readSignatures.includes(signature);

                  return (
                    <div
                      key={signature}
                      className="rounded-[16px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-blue-100 bg-blue-50 text-blue-600">
                          <Bell size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] leading-6 text-slate-700">{formatAlertTitle(alert)}</p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <p className="text-[12px] text-slate-400">{formatAlertMeta(alert)}</p>
                            {isUnread ? (
                              <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                                New
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-white px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Bell size={18} />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-slate-700">You are up to date</p>
                <p className="mt-1 text-[13px] text-slate-400">No {activeTab} notifications available.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
