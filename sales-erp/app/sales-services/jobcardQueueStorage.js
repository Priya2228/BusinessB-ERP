const STORE_QUEUE_KEY = "majesticsales_jobcard_store_queue_ids";
const HOD_QUEUE_KEY = "majesticsales_jobcard_hod_queue_ids";
const GRN_MAP_KEY = "majesticsales_jobcard_grns";

const safeParse = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const loadStoreQueueIds = () => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORE_QUEUE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

export const saveStoreQueueIds = (ids) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_QUEUE_KEY, JSON.stringify(ids));
};

export const loadHodQueueIds = () => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(HOD_QUEUE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
};

export const saveHodQueueIds = (ids) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HOD_QUEUE_KEY, JSON.stringify(ids));
};

export const loadGrnMap = () => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(GRN_MAP_KEY);
  const parsed = safeParse(raw, {});
  return parsed && typeof parsed === "object" ? parsed : {};
};

export const saveGrnMap = (map) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GRN_MAP_KEY, JSON.stringify(map));
};

export const STORE_QUEUE_STORAGE_KEY = STORE_QUEUE_KEY;
export const GRN_MAP_STORAGE_KEY = GRN_MAP_KEY;
export const HOD_QUEUE_STORAGE_KEY = HOD_QUEUE_KEY;
