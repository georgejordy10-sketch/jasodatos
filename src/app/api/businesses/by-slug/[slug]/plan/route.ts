import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  return NextResponse.json({
    business: {
      business_name: "Bodega Central",
      slug,
      plan: "basic",
      status: "active",
      billing_status: "trial",
    },
  });
}