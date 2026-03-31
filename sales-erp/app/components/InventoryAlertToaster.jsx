"use client";

import { useEffect, useRef } from "react";
import { Toaster, toast } from "react-hot-toast";
import { APP_EVENTS, STORAGE_KEYS, readJsonStorage } from "../utils/businessRules";

const TOASTABLE_ALERT_TYPES = new Set(["out_of_stock", "stock_aging"]);

const getAlertSignature = (alert) =>
  [
    alert?.type || "",
    alert?.item_code || "",
    alert?.item_name || "",
    alert?.quantity ?? "",
    alert?.age_days ?? "",
  ].join("|");

const getToastMessage = (alert) => {
  const itemName = alert?.item_name || alert?.item_code || "Item";

  if (alert?.type === "out_of_stock") {
    return `${itemName} is out of stock`;
  }

  if (alert?.type === "stock_aging") {
    return `${itemName} stock is aging${alert?.age_days ? ` (${alert.age_days} days)` : ""}`;
  }

  return itemName;
};

export default function InventoryAlertToaster() {
  const seenAlertSignaturesRef = useRef(new Set());
  const previousAlertsRef = useRef([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    previousAlertsRef.current = readJsonStorage(STORAGE_KEYS.alerts, []);

    const syncAlerts = () => {
      const nextAlerts = readJsonStorage(STORAGE_KEYS.alerts, []);
      const previousSignatures = new Set(
        previousAlertsRef.current
          .filter((alert) => TOASTABLE_ALERT_TYPES.has(alert?.type))
          .map(getAlertSignature)
      );

      nextAlerts
        .filter((alert) => TOASTABLE_ALERT_TYPES.has(alert?.type))
        .forEach((alert) => {
          const signature = getAlertSignature(alert);
          if (previousSignatures.has(signature) || seenAlertSignaturesRef.current.has(signature)) {
            return;
          }

          seenAlertSignaturesRef.current.add(signature);
          toast.error(getToastMessage(alert), {
            id: signature,
            duration: 4500,
          });
        });

      previousAlertsRef.current = nextAlerts;
    };

    window.addEventListener(APP_EVENTS.alertsUpdated, syncAlerts);
    window.addEventListener("storage", syncAlerts);

    return () => {
      window.removeEventListener(APP_EVENTS.alertsUpdated, syncAlerts);
      window.removeEventListener("storage", syncAlerts);
    };
  }, []);

  return <Toaster position="top-right" />;
}
