import { AppShell } from "@/features/layout/AppShell";
import UploadFlow from "@/features/upload/UploadFlow";

export default function CargasPage() {
  return (
    <AppShell
      businessName="Panel comercial"
      periodLabel="Carga y análisis"
      planName="basic"
      planStatus="trial"
    >
      <UploadFlow />
    </AppShell>
  );
}