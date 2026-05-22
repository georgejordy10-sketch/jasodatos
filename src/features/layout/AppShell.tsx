import type { ReactNode } from "react";

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

export function AppShell({
  children,
  businessName = "JasoDatos",
  periodLabel = "Período actual",
  planName = "basic",
  planStatus = "trial",
}: AppShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "280px minmax(0, 1fr)",
        background:
          "linear-gradient(135deg, var(--jd-bg-main, #F8FAFC) 0%, var(--jd-bg-soft, #EEF2FF) 100%)",
      }}
    >
      <AppSidebar />

      <main
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AppTopbar businessName={businessName} periodLabel={periodLabel} />

        <div
          style={{
            padding: "24px",
            display: "grid",
            gap: "20px",
          }}
        >
          <PlanStatusBanner planName={planName} planStatus={planStatus} />

          <section>{children}</section>
        </div>
      </main>
    </div>
  );
}