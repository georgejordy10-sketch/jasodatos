import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type AdminAuthResult =
  | {
      ok: true;
      userEmail: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

function getAllowedAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(
  request: NextRequest
): Promise<AdminAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Configuración de autenticación incompleta." },
        { status: 500 }
      ),
    };
  }

  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
      ),
    };
  }

  const userEmail = user.email.toLowerCase();
  const allowedAdminEmails = getAllowedAdminEmails();

  if (!allowedAdminEmails.includes(userEmail)) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Acceso admin denegado." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userEmail,
  };
}