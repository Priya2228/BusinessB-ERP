"use client";

import { buildApiUrl } from "./api";

export const STORAGE_KEYS = {
  openingRows: "openingStockRows",
  openingBalances: "openingStockBalances",
  salesRecords: "salesRuleRecords",
  alerts: "inventoryRuleAlerts",
};

export const APP_EVENTS = {
  inventoryUpdated: "opening-stock-updated",
  alertsUpdated: "inventory-alerts-updated",
};

const DEFAULT_TAX_RULES = {
  India: {
    "Bought-out": 0.18,
    Manufactures: 0.12,
    Product: 0.18,
    "Raw Materials": 0.05,
    Spares: 0.18,
    Consumable: 0.18,
    default: 0.18,
  },
  USA: {
    "Bought-out": 0.08,
    Manufactures: 0.06,
    Product: 0.08,
    "Raw Materials": 0.04,
    Spares: 0.08,
    Consumable: 0.08,
    default: 0.08,
  },
  Euro: {
    "Bought-out": 0.2,
    Manufactures: 0.18,
    Product: 0.2,
    "Raw Materials": 0.1,
    Spares: 0.2,
    Consumable: 0.2,
    default: 0.2,
  },
  Oman: {
    "Bought-out": 0.05,
    Manufactures: 0.05,
    Product: 0.05,
    "Raw Materials": 0.03,
    Spares: 0.05,
    Consumable: 0.05,
    default: 0.05,
  },
  UAE: {
    "Bought-out": 0.05,
    Manufactures: 0.05,
    Product: 0.05,
    "Raw Materials": 0.03,
    Spares: 0.05,
    Consumable: 0.05,
    default: 0.05,
  },
  UK: {
    "Bought-out": 0.2,
    Manufactures: 0.15,
    Product: 0.2,
    "Raw Materials": 0.05,
    Spares: 0.2,
    Consumable: 0.2,
    default: 0.2,
  },
};

export const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseQuantity = (value) => {
  const parsed = parseNumber(value);
  return parsed >= 0 ? parsed : 0;
};

export const getDefaultAgingStockDate = () => {
  const thresholdDays = 91;
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - thresholdDays);
  return baseDate.toISOString();
};

export const readJsonStorage = (key, fallback) => {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeJsonStorage = (key, value, eventName = APP_EVENTS.inventoryUpdated) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(eventName));
};

export const normalizeOpeningRows = (rows = []) =>
  rows.map((row) => ({
    ...row,
    quantity: parseQuantity(row.quantity),
    item_category: row.item_category || "",
    min_stock_qty: parseQuantity(row.min_stock_qty),
    stock_date: row.stock_date || getDefaultAgingStockDate(),
  }));

export const readOpeningStockRows = () =>
  normalizeOpeningRows(readJsonStorage(STORAGE_KEYS.openingRows, []));

export const persistOpeningStockRows = (rows) =>
  writeJsonStorage(STORAGE_KEYS.openingRows, normalizeOpeningRows(rows));

export const readOpeningStockBalances = () => readJsonStorage(STORAGE_KEYS.openingBalances, {});

export const persistOpeningStockBalances = (balances) =>
  writeJsonStorage(STORAGE_KEYS.openingBalances, balances);

export const readSalesRuleRecords = () => readJsonStorage(STORAGE_KEYS.salesRecords, []);

export const persistSalesRuleRecords = (records) =>
  writeJsonStorage(STORAGE_KEYS.salesRecords, records);

export const getTaxRateForItem = ({ itemCategory, region, fallbackRate = 0 }) => {
  const regionalRules = DEFAULT_TAX_RULES[region] || DEFAULT_TAX_RULES.India;
  return regionalRules[itemCategory] ?? regionalRules.default ?? fallbackRate;
};

export const getLinePricing = ({ quantity, rate, discountPercent, itemCategory, region, fallbackTaxRate = 0 }) => {
  const safeQuantity = parseNumber(quantity);
  const safeRate = parseNumber(rate);
  const safeDiscount = parseNumber(discountPercent);
  const taxable = safeQuantity * safeRate;
  const discountAmount = taxable * (safeDiscount / 100);
  const amount = taxable - discountAmount;
  const taxRate = getTaxRateForItem({ itemCategory, region, fallbackRate: fallbackTaxRate });
  const taxAmount = amount * taxRate;

  return {
    quantity: safeQuantity,
    rate: safeRate,
    discountPercent: safeDiscount,
    taxable,
    discountAmount,
    amount,
    taxRate,
    taxAmount,
  };
};

export const getAgeInDays = (stockDate) => {
  if (!stockDate) return 0;
  const diff = Date.now() - new Date(stockDate).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const buildInventoryAlerts = ({ openingRows = [], salesRecords = [] }) => {
  const safeRows = normalizeOpeningRows(openingRows);
  const dailySalesMap = salesRecords.reduce((acc, record) => {
    const itemCode = String(record.item_code || "").trim();
    if (!itemCode) return acc;
    acc[itemCode] = (acc[itemCode] || 0) + parseNumber(record.quantity);
    return acc;
  }, {});

  return safeRows.flatMap((row) => {
    const itemCode = String(row.item_code || "").trim();
    const alerts = [];
    const quantity = parseQuantity(row.quantity);
    const minStock = parseQuantity(row.min_stock_qty);
    const ageDays = getAgeInDays(row.stock_date);
    const dailySales = dailySalesMap[itemCode] || 0;
    const daysCover = dailySales > 0 ? quantity / dailySales : null;

    if (quantity <= 0) {
      alerts.push({
        type: "out_of_stock",
        item_code: itemCode,
        item_name: row.item_name || "",
        quantity,
        min_stock_qty: minStock,
        severity: "critical",
      });
    } else if (minStock > 0 && quantity <= minStock) {
      alerts.push({
        type: "low_stock",
        item_code: itemCode,
        item_name: row.item_name || "",
        quantity,
        min_stock_qty: minStock,
        severity: "warning",
      });
    }

    if (daysCover !== null && daysCover <= 7) {
      alerts.push({
        type: "stock_cover",
        item_code: itemCode,
        item_name: row.item_name || "",
        quantity,
        days_cover: Number(daysCover.toFixed(2)),
        severity: daysCover <= 3 ? "critical" : "warning",
      });
    }

    if (ageDays > 90) {
      alerts.push({
        type: "stock_aging",
        item_code: itemCode,
        item_name: row.item_name || "",
        quantity,
        age_days: ageDays,
        clearance_required: true,
        severity: "warning",
      });
    }

    return alerts;
  });
};

export const persistInventoryAlerts = ({ openingRows = [], salesRecords = [] }) => {
  const alerts = buildInventoryAlerts({ openingRows, salesRecords });
  writeJsonStorage(STORAGE_KEYS.alerts, alerts, APP_EVENTS.alertsUpdated);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && alerts.length > 0) {
      fetch(buildApiUrl("/api/notifications/inventory-alerts/sync/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ alerts }),
      }).catch(() => {});
    }
  }

  return alerts;
};
