"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar, { AppFooter, AppHeader } from "./Sidebar";
import { buildApiUrl } from "../utils/api";
import {
  canAccessPath,
  clearAuthState,
  getDefaultRouteForRole,
  getStoredAuthState,
  persistAuthState,
} from "../utils/rbac";

export default function AppPageShell({
  children,
  mainClassName = "",
  contentClassName = "mx-auto w-full max-w-[1240px] px-2 py-2",
  contentWrapperClassName = "",
  showFooter = true,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyAccess = async () => {
      const authState = getStoredAuthState();

      if (!authState?.token) {
        router.replace("/login");
        return;
      }

      let nextAuthState = authState;

      if (!authState.role) {
        try {
          const response = await fetch(buildApiUrl("/api/me/"), {
            headers: { Authorization: `Token ${authState.token}` },
          });

          if (!response.ok) {
            clearAuthState();
            router.replace("/login");
            return;
          }

          const data = await response.json();
          nextAuthState = { ...authState, ...data };
          persistAuthState(nextAuthState);
        } catch {
          clearAuthState();
          router.replace("/login");
          return;
        }
      }

      if (!canAccessPath(pathname, nextAuthState.role)) {
        router.replace(getDefaultRouteForRole(nextAuthState.role));
        return;
      }

      if (isMounted) {
        setIsAuthorized(true);
      }
    };

    setIsAuthorized(false);
    verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (!isAuthorized) {
    return null;
  }

  const content = contentWrapperClassName ? (
    <div className={contentWrapperClassName}>{children}</div>
  ) : (
    children
  );

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-800">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className={`w-full flex-1 overflow-y-auto bg-white ${mainClassName}`.trim()}>
          <div className={contentClassName}>{content}</div>
          {showFooter ? <AppFooter /> : null}
        </main>
      </div>
    </div>
  );
}
