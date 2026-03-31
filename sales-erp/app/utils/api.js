"use client";

const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const explicitBaseUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8000`;
  }

  return "http://127.0.0.1:8000";
};

export const buildApiUrl = (path) => {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};
