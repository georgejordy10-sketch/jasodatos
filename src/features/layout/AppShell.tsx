"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AppSidebar } from "./AppSidebar";
import { PlanStatusBanner } from "./PlanStatusBanner";

type AppShellProps = {
  children: ReactNode;
  businessName?: string;
  periodLabel?: string;
  planName?: "basic" | "pro" | "ultra" | string;
  planStatus?: "trial" | "active" | "past_due" | "canceled" | "manual" | string;
  showPlanBanner?: boolean;
};

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    function updateIsMobile() {
      setIsMobile(mediaQuery.matches);
    }

    updateIsMobile();

    mediaQuery.addEventListener("change", updateIsMobile);
    window.addEventListener("resize", updateIsMobile);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobile);
      window.removeEventListener("resize", updateIsMobile);
    };
  }, [breakpoint]);

  return isMobile;
}

export function AppShell({
  children,
  planName = "basic",
  planStatus = "trial",
  showPlanBanner = true,
}: AppShellProps) {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "244px minmax(0, 1fr)",
        background:
          "linear-gradient(135deg, var(--jd-bg-main, #F8FAFC) 0%, var(--jd-bg-soft, #EEF2FF) 100%)",
      }}
    >
      {!isMobile ? <AppSidebar /> : null}
     {isMobile ? (
  <button
    type="button"
    onClick={() => setIsSidebarOpen(true)}
    aria-label="Abrir menú"
    style={{
      position: "fixed",
      top: 12,
      left: 12,
      zIndex: 70,
      width: 42,
      height: 42,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.18)",
      background: "linear-gradient(135deg, #2E0D4F 0%, #3D2C8D 100%)",
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 14px 34px rgba(46,13,79,0.24)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    ☰
  </button>
) : null}
      {isMobile && isSidebarOpen ? (
        <div
          role="presentation"
          onClick={closeSidebar}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(15, 23, 42, 0.52)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(86vw, 300px)",
              minHeight: "100dvh",
              maxHeight: "100dvh",
              overflow: "hidden",
              boxShadow: "24px 0 80px rgba(15, 23, 42, 0.34)",
            }}
          >
            <button
              type="button"
              onClick={closeSidebar}
              aria-label="Cerrar menú"
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "38px",
                height: "38px",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.10)",
                color: "#FFFFFF",
                fontSize: "18px",
                fontWeight: 800,
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              ×
            </button>

            <AppSidebar isDrawer onNavigate={closeSidebar} />
          </div>
        </div>
      ) : null}

      <main
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
       <div
  style={{
    padding: isMobile ? "0 14px 14px" : "0 24px 24px",
    display: "grid",
    gap: isMobile ? "14px" : "20px",
  }}
>
          {showPlanBanner ? (
  <PlanStatusBanner planName={planName} planStatus={planStatus} />
) : null}

          <section>{children}</section>
        </div>
      </main>
    </div>
  );
}