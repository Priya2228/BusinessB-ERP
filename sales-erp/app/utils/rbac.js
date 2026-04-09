"use client";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  CLIENT: "client",
  SALES_LEAD: "saleslead",
  SALES_HEAD: "saleshead",
  DEPT_HEAD: "depthead",
  MD: "md",
  DOCUMENT_CONTROLLER: "documentcontroller",
  OPERATION_HEAD: "operationhead",
  SITE_ENGINEER: "siteengineer",
  STORE_QUEUE: "storequeue",
};

export const INTERNAL_ROLES = [
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
];
export const AUTHENTICATED_ROLES = [...INTERNAL_ROLES, ROLES.CLIENT];

export const SALES_ROLES = [ROLES.ADMIN, ROLES.SALES_HEAD];
export const PURCHASE_ROLES = [ROLES.ADMIN, ROLES.SALES_LEAD];
export const MASTER_STOCK_ROLES = [ROLES.ADMIN];
export const RFQ_CREATE_ROLES = [ROLES.ADMIN, ROLES.SALES_HEAD, ROLES.USER];
export const RFQ_MANAGE_ROLES = [ROLES.ADMIN, ROLES.SALES_HEAD];
export const QUOTATION_CREATE_ROLES = [ROLES.ADMIN, ROLES.SALES_HEAD, ROLES.SALES_LEAD, ROLES.USER];
export const QUOTATION_MANAGE_ROLES = [ROLES.ADMIN, ROLES.SALES_HEAD, ROLES.SALES_LEAD];
export const QUOTATION_APPROVAL_ROLES = [ROLES.ADMIN, ROLES.DEPT_HEAD, ROLES.MD];
export const COST_CREATE_ROLES = [ROLES.ADMIN, ROLES.SALES_LEAD, ROLES.USER];
export const COST_MANAGE_ROLES = [ROLES.ADMIN, ROLES.SALES_LEAD];
export const COST_APPROVAL_ROLES = [ROLES.ADMIN, ROLES.DEPT_HEAD, ROLES.MD];
export const SALES_SERVICES_ROLES = [
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
];

const STORAGE_KEYS = {
  token: "token",
  username: "username",
  role: "role",
  designation: "designation",
  department: "department",
};

const ROUTE_RULES = [
  { prefix: "/sales-services/head-quotation-list", roles: [ROLES.ADMIN, ROLES.DEPT_HEAD] },
  { prefix: "/sales-services/dept-head-cost-estimation-list", roles: [ROLES.ADMIN, ROLES.DEPT_HEAD] },
  { prefix: "/sales-services/md-quotation-list", roles: [ROLES.ADMIN, ROLES.MD] },
  { prefix: "/sales-services/md-completion-list", roles: [ROLES.ADMIN, ROLES.MD] },
  { prefix: "/sales-services/md-cost-estimation-list", roles: [ROLES.ADMIN, ROLES.MD] },
  { prefix: "/sales-services/dept-head-completion-list", roles: [ROLES.ADMIN, ROLES.DEPT_HEAD] },
  { prefix: "/sales-services/cost-sheet/view", roles: [...COST_CREATE_ROLES, ROLES.SALES_HEAD, ROLES.MD] },
  { prefix: "/sales-services/cost-sheet/list", roles: [...COST_CREATE_ROLES, ROLES.MD] },
  { prefix: "/sales-services/cost-sheet", roles: COST_CREATE_ROLES },
  { prefix: "/sales-services/quotation/list", roles: [...QUOTATION_CREATE_ROLES, ...QUOTATION_APPROVAL_ROLES, ROLES.CLIENT] },
  { prefix: "/sales-services/quotation/preview", roles: [...QUOTATION_CREATE_ROLES, ...QUOTATION_APPROVAL_ROLES, ROLES.CLIENT] },
  { prefix: "/sales-services/quotation", roles: QUOTATION_CREATE_ROLES },
  { prefix: "/sales-services/rfq-list", roles: RFQ_CREATE_ROLES },
  { prefix: "/sales-services/rfq", roles: RFQ_CREATE_ROLES },
  { prefix: "/sales-services/jobcard", roles: [ROLES.ADMIN, ROLES.DOCUMENT_CONTROLLER, ROLES.OPERATION_HEAD] },
  { prefix: "/Dashboard", roles: INTERNAL_ROLES },
  { prefix: "/sales", roles: SALES_ROLES },
  { prefix: "/purchase", roles: PURCHASE_ROLES },
  { prefix: "/master", roles: MASTER_STOCK_ROLES },
  { prefix: "/stock", roles: MASTER_STOCK_ROLES },
  { prefix: "/itemlist", roles: MASTER_STOCK_ROLES },
  { prefix: "/list", roles: SALES_ROLES },
  { prefix: "/sales-services", roles: SALES_SERVICES_ROLES },
];

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();

export const getStoredAuthState = () => {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem(STORAGE_KEYS.token);
  if (!token) return null;

  return {
    token,
    username: window.localStorage.getItem(STORAGE_KEYS.username) || "",
    role: normalizeRole(window.localStorage.getItem(STORAGE_KEYS.role) || ""),
    designation: window.localStorage.getItem(STORAGE_KEYS.designation) || "",
    department: window.localStorage.getItem(STORAGE_KEYS.department) || "",
  };
};

export const persistAuthState = ({ token, username, role, designation, department }) => {
  if (typeof window === "undefined") return;

  if (token) {
    window.localStorage.setItem(STORAGE_KEYS.token, token);
  }
  window.localStorage.setItem(STORAGE_KEYS.username, username || "");
  window.localStorage.setItem(STORAGE_KEYS.role, normalizeRole(role));
  window.localStorage.setItem(STORAGE_KEYS.designation, designation || "");
  window.localStorage.setItem(STORAGE_KEYS.department, department || "");
};

/**
 * FULLY CLEAR LOCAL STORAGE
 * This removes all auth-related keys and ensures the state is wiped.
 */
export const clearAuthState = () => {
  if (typeof window === "undefined") return;

  // 1. Remove specific keys from the object
  Object.values(STORAGE_KEYS).forEach((key) => {
    window.localStorage.removeItem(key);
  });

  // 2. Clear common variations just in case of manual storage entries
  window.localStorage.removeItem("auth_token");
  window.localStorage.removeItem("user_role");
  
  // 3. Optional: Clear all to be absolutely sure no stale data remains
  // window.localStorage.clear(); 
};

export const hasAnyRole = (role, allowedRoles = []) =>
  allowedRoles.map(normalizeRole).includes(normalizeRole(role));

export const isAdminRole = (role) => {
  const norm = normalizeRole(role);
  return norm === "admin"; 
};

export const canCreateRfq = (role) => hasAnyRole(role, RFQ_CREATE_ROLES);
export const canManageRfq = (role) => hasAnyRole(role, RFQ_MANAGE_ROLES);
export const canCreateQuotation = (role) => hasAnyRole(role, QUOTATION_CREATE_ROLES);
export const canManageQuotation = (role) => hasAnyRole(role, QUOTATION_MANAGE_ROLES);
export const canApproveQuotation = (role) => hasAnyRole(role, QUOTATION_APPROVAL_ROLES);
export const canCreateCostEstimation = (role) => hasAnyRole(role, COST_CREATE_ROLES);
export const canManageCostEstimation = (role) => hasAnyRole(role, COST_MANAGE_ROLES);
export const canApproveCostEstimation = (role) => hasAnyRole(role, COST_APPROVAL_ROLES);

export const getDefaultRouteForRole = (role) => {
  switch (normalizeRole(role) || ROLES.USER) {
    case ROLES.ADMIN:
      return "/Dashboard";
    case ROLES.CLIENT:
      return "/sales-services/quotation/list";
    case ROLES.SALES_LEAD:
      return "/sales-services";
    case ROLES.SALES_HEAD:
      return "/sales-services/rfq-list";
    case ROLES.DEPT_HEAD:
      return "/sales-services/dept-head-cost-estimation-list";
    case ROLES.MD:
      return "/sales-services/md-quotation-list";
    case ROLES.DOCUMENT_CONTROLLER:
    case ROLES.OPERATION_HEAD:
      return "/sales-services";
    case ROLES.SITE_ENGINEER:
    case ROLES.STORE_QUEUE:
      return "/sales-services";
    default:
      return "/Dashboard";
  }
};

export const canAccessPath = (pathname, role) => {
  const normalizedPath = String(pathname || "").trim() || "/";
  const normalizedRole = normalizeRole(role);
  
  if (isAdminRole(normalizedRole)) return true;

  const matchedRule = ROUTE_RULES.find(
    (rule) => normalizedPath === rule.prefix || normalizedPath.startsWith(`${rule.prefix}/`)
  );

  if (!matchedRule) return false; 

  return hasAnyRole(normalizedRole, matchedRule.roles);
};

export const canViewMenuItem = (role, href) => canAccessPath(href, role);

export const isClientRole = (role) => normalizeRole(role) === ROLES.CLIENT;
