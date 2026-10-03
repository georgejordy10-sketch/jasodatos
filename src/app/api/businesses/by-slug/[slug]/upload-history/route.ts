import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authorizeBusinessAccess } from "@/lib/authorizeBusinessAccess";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type UploadHistoryPayload = {
  fileName?: string;
  totalRows?: number;
  totalSales?: number;
  totalUnits?: number;
  productsCount?: number;
  localsCount?: number;
  channelsCount?: number;
  metadata?: Record<string, unknown>;
};

function toSafeNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

async function getAuthorizedBusiness(
  slug: string
) {
  const businessSlug = slug?.trim();

  if (!businessSlug) {
    return {
      access: null,
      business: null,
      errorResponse: NextResponse.json(
        {
          error:
            "No se recibió el identificador del negocio.",
        },
        { status: 400 }
      ),
    };
  }

  const access =
    await authorizeBusinessAccess(
      businessSlug
    );

  if (!access) {
    return {
      access: null,
      business: null,
      errorResponse: NextResponse.json(
        {
          error: "No autorizado",
        },
        { status: 401 }
      ),
    };
  }

  const supabase =
    createAdminSupabaseClient();

  const {
    data: business,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select(
      "id, slug"
    )
    .eq(
      "id",
      access.businessId
    )
    .eq(
      "slug",
      access.slug
    )
    .maybeSingle();

  if (businessError) {
    console.error(
      "[upload-history] Error consultando negocio:",
      businessError
    );

    return {
      access: null,
      business: null,
      errorResponse: NextResponse.json(
        {
          error:
            "No se pudo consultar el negocio.",
        },
        { status: 500 }
      ),
    };
  }

  if (!business) {
    return {
      access: null,
      business: null,
      errorResponse: NextResponse.json(
        {
          error:
            "No se encontró el negocio.",
        },
        { status: 404 }
      ),
    };
  }

  return {
    access,
    business,
    errorResponse: null,
  };
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    const authorization =
      await getAuthorizedBusiness(
        slug
      );

    if (
      authorization.errorResponse ||
      !authorization.access ||
      !authorization.business
    ) {
      return (
        authorization.errorResponse ??
        NextResponse.json(
          {
            error: "No autorizado",
          },
          { status: 401 }
        )
      );
    }

    let body: UploadHistoryPayload;

    try {
      body =
        (await request.json()) as UploadHistoryPayload;
    } catch {
      return NextResponse.json(
        {
          error:
            "La solicitud contiene datos inválidos.",
        },
        { status: 400 }
      );
    }

    const fileName =
      typeof body.fileName === "string"
        ? body.fileName.trim()
        : "";

    if (!fileName) {
      return NextResponse.json(
        {
          error:
            "No se recibió el nombre del archivo.",
        },
        { status: 400 }
      );
    }

    const supabase =
      createAdminSupabaseClient();

    const payload = {
      business_id:
        authorization.access.businessId,
      file_name: fileName,
      uploaded_at:
        new Date().toISOString(),
      total_rows: Math.round(
        toSafeNumber(body.totalRows)
      ),
      total_sales:
        toSafeNumber(body.totalSales),
      total_units:
        toSafeNumber(body.totalUnits),
      products_count: Math.round(
        toSafeNumber(body.productsCount)
      ),
      locals_count: Math.round(
        toSafeNumber(body.localsCount)
      ),
      channels_count: Math.round(
        toSafeNumber(body.channelsCount)
      ),
      metadata:
        body.metadata &&
        typeof body.metadata === "object" &&
        !Array.isArray(body.metadata)
          ? body.metadata
          : {},
      source: "upload_flow",
    };

    const {
      data: existingHistory,
      error: existingHistoryError,
    } = await supabase
      .from("business_upload_history")
      .select("id")
      .eq(
        "business_id",
        authorization.access.businessId
      )
      .eq(
        "file_name",
        fileName
      )
      .maybeSingle();

    if (existingHistoryError) {
      console.error(
        "[upload-history] Error validando historial existente:",
        existingHistoryError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo validar el historial existente.",
        },
        { status: 500 }
      );
    }

    const {
      data: uploadHistory,
      error: saveError,
    } = existingHistory
      ? await supabase
          .from("business_upload_history")
          .update(payload)
          .eq(
            "id",
            existingHistory.id
          )
          .eq(
            "business_id",
            authorization.access.businessId
          )
          .select("*")
          .single()
      : await supabase
          .from("business_upload_history")
          .insert(payload)
          .select("*")
          .single();

    if (saveError) {
      console.error(
        "[upload-history] Error guardando historial:",
        saveError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo guardar el historial de carga.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      uploadHistory,
    });
  } catch (error) {
    console.error(
      "[upload-history] Error POST:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error inesperado guardando historial de carga.",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    const authorization =
      await getAuthorizedBusiness(
        slug
      );

    if (
      authorization.errorResponse ||
      !authorization.access ||
      !authorization.business
    ) {
      return (
        authorization.errorResponse ??
        NextResponse.json(
          {
            error: "No autorizado",
          },
          { status: 401 }
        )
      );
    }

    const supabase =
      createAdminSupabaseClient();

    const {
      data: uploadHistory,
      error: historyError,
    } = await supabase
      .from("business_upload_history")
      .select("*")
      .eq(
        "business_id",
        authorization.access.businessId
      )
      .order(
        "uploaded_at",
        {
          ascending: false,
        }
      )
      .limit(20);

    if (historyError) {
      console.error(
        "[upload-history] Error consultando historial:",
        historyError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo consultar el historial de cargas.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      uploadHistory:
        uploadHistory ?? [],
    });
  } catch (error) {
    console.error(
      "[upload-history] Error GET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error inesperado consultando historial de carga.",
      },
      { status: 500 }
    );
  }
}
