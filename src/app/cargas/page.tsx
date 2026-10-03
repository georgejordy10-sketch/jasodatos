import { redirect } from "next/navigation";
import UploadFlow from "@/features/upload/UploadFlow";
import { authorizeBusinessAccess } from "@/lib/authorizeBusinessAccess";

type CargasPageProps = {
  searchParams: Promise<{
    business?: string | string[];
  }>;
};

export default async function CargasPage({
  searchParams,
}: CargasPageProps) {
  const params =
    await searchParams;

  const businessParam =
    Array.isArray(params.business)
      ? params.business[0]
      : params.business;

  const businessSlug =
    businessParam?.trim() ?? "";

  /*
   * Conservamos el modo local de desarrollo sin negocio
   * para poder probar JasoDatos desde localhost.
   *
   * En producción, /cargas siempre requiere un negocio
   * identificado y una sesión de acceso válida.
   */
  if (!businessSlug) {
    if (
      process.env.NODE_ENV === "development"
    ) {
      return <UploadFlow />;
    }

    redirect("/registro");
  }

  const access =
    await authorizeBusinessAccess(
      businessSlug
    );

  if (!access) {
    redirect("/registro");
  }

  return <UploadFlow />;
}
