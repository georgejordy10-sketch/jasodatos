import { AppShell } from "@/features/layout/AppShell";
import UploadFlow from "@/features/upload/UploadFlow";

export default function CargasPage() {
  return (
<AppShell
  businessName="Panel comercial"
  periodLabel="Carga y análisis"
  planName="Análisis comercial"
  planStatus="active"
>
      <UploadFlow />
    </AppShell>
  );
}