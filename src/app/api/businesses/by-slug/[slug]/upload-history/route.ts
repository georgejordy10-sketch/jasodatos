import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

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

function toSafeNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as UploadHistoryPayload;

    if (!slug) {
      return NextResponse.json(
        { error: "No se recibió el identificador del negocio." },
        { status: 400 }
      );
    }

    if (!body.fileName) {
      return NextResponse.json(
        { error: "No se recibió el nombre del archivo." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (businessError) {
      return NextResponse.json(
        { error: "No se pudo consultar el negocio." },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "No se encontró el negocio." },
        { status: 404 }
      );
    }

    const { data: uploadHistory, error: insertError } = await supabase
      .from("business_upload_history")
      .insert({
        business_id: business.id,
        file_name: body.fileName,
        total_rows: Math.round(toSafeNumber(body.totalRows)),
        total_sales: toSafeNumber(body.totalSales),
        total_units: toSafeNumber(body.totalUnits),
        products_count: Math.round(toSafeNumber(body.productsCount)),
        locals_count: Math.round(toSafeNumber(body.localsCount)),
        channels_count: Math.round(toSafeNumber(body.channelsCount)),
        metadata: body.metadata ?? {},
        source: "upload_flow",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "No se pudo guardar el historial de carga." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      uploadHistory,
    });
  } catch (error) {
    console.error("Error guardando historial de carga:", error);

    return NextResponse.json(
      { error: "Error inesperado guardando historial de carga." },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { error: "No se recibió el identificador del negocio." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (businessError) {
      return NextResponse.json(
        { error: "No se pudo consultar el negocio." },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "No se encontró el negocio." },
        { status: 404 }
      );
    }

    const { data: uploadHistory, error: historyError } = await supabase
      .from("business_upload_history")
      .select("*")
      .eq("business_id", business.id)
      .order("uploaded_at", { ascending: false })
      .limit(20);

    if (historyError) {
      return NextResponse.json(
        { error: "No se pudo consultar el historial de cargas." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      uploadHistory: uploadHistory ?? [],
    });
  } catch (error) {
    console.error("Error consultando historial de carga:", error);

    return NextResponse.json(
      { error: "Error inesperado consultando historial de carga." },
      { status: 500 }
    );
  }
}