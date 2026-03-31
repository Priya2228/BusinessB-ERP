"use client";

import Sidebar, { AppFooter, AppHeader } from "./Sidebar";

export default function AppPageShell({
  children,
  mainClassName = "",
  contentClassName = "mx-auto w-full max-w-[1100px] px-3 py-2",
  contentWrapperClassName = "",
  showFooter = true,
}) {
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
