import { NextResponse } from "next/server";
import { clearBusinessAccessChallenge } from "@/lib/businessAccessChallenge";
import { clearBusinessAccessSession } from "@/lib/businessAccessSession";

export async function POST() {
  try {
    await clearBusinessAccessChallenge();
    await clearBusinessAccessSession();

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "[logout-business] Error cerrando sesión:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cerrar la sesión.",
      },
      {
        status: 500,
      }
    );
  }
}
