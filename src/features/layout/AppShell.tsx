"use client";

import { useEffect, useState, type ReactNode } from "react";

import { AppSidebar } from "./AppSidebar";
import { AppTopbar } from "./AppTopbar";
import { PlanStatusBanner } from "./PlanStatusBanner";

type AppShellProps = {
  children: ReactNode;
  businessName?: string;
  periodLabel?: string;
  planName?: "basic" | "pro" | "ultra" | string;
  planStatus?: "trial" | "active" | "past_due" | "canceled" | "manual" | string;
};

function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function updateIsMobile() {
      setIsMobile(window.innerWidth <= breakpoint);
    }

    updateIsMobile();

    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, [breakpoint]);

  return isMobile;
}

export function AppShell({
  children,
  businessName = "JasoDatos",
  periodLabel = "Período actual",
  planName = "basic",
  planStatus = "trial",
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
        gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "280px minmax(0, 1fr)",
        background:
          "linear-gradient(135deg, var(--jd-bg-main, #F8FAFC) 0%, var(--jd-bg-soft, #EEF2FF) 100%)",
      }}
    >
      {!isMobile ? <AppSidebar /> : null}

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
              width: "min(86vw, 320px)",
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
        <AppTopbar
          businessName={businessName}
          periodLabel={periodLabel}
          isMobile={isMobile}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <div
          style={{
            padding: isMobile ? "14px" : "24px",
            display: "grid",
            gap: isMobile ? "14px" : "20px",
          }}
        >
          <PlanStatusBanner planName={planName} planStatus={planStatus} />

          <section>{children}</section>
        </div>
      </main>
    </div>
  );
}