"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  async function handleLogout() {
    setLoading(true);

    await supabase.auth.signOut();

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
style={{
  minHeight: 42,
  padding: "0 18px",
  borderRadius: 12,
  border: "1px solid rgba(37,99,235,.55)",
  background:
    "linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #7C3AED 100%)",
  color: "#FFFFFF",
  fontWeight: 950,
  boxShadow: "0 14px 32px rgba(37,99,235,.32)",
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.72 : 1,
}}
    >
      {loading ? "Cerrando..." : "Cerrar sesión admin"}
    </button>
  );
}