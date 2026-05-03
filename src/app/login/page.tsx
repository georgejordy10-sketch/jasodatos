"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const ADMIN_EMAILS = ["jaso.23@hotmail.com", "georgejordy.10@gmail.com"];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/admin/clientes";

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      setErrorMessage("Este correo no está autorizado para entrar al panel administrador.");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setStatus("idle");

    if (error) {
      setErrorMessage("No se pudo iniciar sesión. Revisa el correo y la contraseña.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <section style={styles.card}>
      <div style={styles.brand}>JD</div>

      <p style={styles.eyebrow}>Acceso administrador</p>

      <h1 style={styles.title}>Entrar a JasoDatos Admin</h1>

      <p style={styles.text}>
        Usa un correo administrador autorizado para gestionar clientes, planes y accesos.
      </p>

      <form onSubmit={handleLogin} style={styles.form}>
        <label style={styles.label}>
          Correo administrador
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="jaso.23@hotmail.com"
            autoComplete="email"
            required
          />
        </label>

        <label style={styles.label}>
          Contraseña
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>

        {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}

        <button
          style={{
            ...styles.button,
            opacity: status === "loading" ? 0.72 : 1,
            cursor: status === "loading" ? "not-allowed" : "pointer",
          }}
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Validando..." : "Entrar al panel"}
        </button>
      </form>

      <a style={styles.backLink} href="/registro">
        Volver al registro
      </a>
    </section>
  );
}

function LoginFallback() {
  return (
    <section style={styles.card}>
      <div style={styles.brand}>JD</div>
      <p style={styles.eyebrow}>Acceso administrador</p>
      <h1 style={styles.title}>Cargando acceso...</h1>
      <p style={styles.text}>Preparando validación segura del panel.</p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main style={styles.page}>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    color: "#F8FAFC",
    background:
      "radial-gradient(circle at top, rgba(127,178,255,.20), transparent 34%), linear-gradient(135deg,#070A1F,#120A3D)",
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  card: {
    width: "min(100%, 460px)",
    padding: 34,
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(18,27,92,.96), rgba(9,15,52,.98))",
    border: "1px solid rgba(127,178,255,.26)",
    boxShadow: "0 34px 100px rgba(0,0,0,.42)",
  },
  brand: {
    width: 52,
    height: 52,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    background: "linear-gradient(135deg,#7FB2FF,#8B5CF6)",
    marginBottom: 22,
  },
  eyebrow: {
    margin: 0,
    color: "#7FB2FF",
    textTransform: "uppercase",
    letterSpacing: ".16em",
    fontSize: ".76rem",
    fontWeight: 950,
  },
  title: {
    margin: "10px 0 12px",
    fontSize: "2rem",
    lineHeight: 1.05,
    letterSpacing: "-.04em",
  },
  text: {
    margin: "0 0 24px",
    color: "#C7D2FE",
    lineHeight: 1.65,
  },
  form: {
    display: "grid",
    gap: 16,
  },
  label: {
    display: "grid",
    gap: 8,
    color: "#E0E7FF",
    fontWeight: 850,
    fontSize: ".92rem",
  },
  input: {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.06)",
    color: "#FFFFFF",
    padding: "0 14px",
    outline: "none",
    fontSize: "1rem",
  },
  error: {
    margin: 0,
    color: "#FCA5A5",
    lineHeight: 1.45,
    fontWeight: 800,
  },
  button: {
    minHeight: 50,
    border: 0,
    borderRadius: 14,
    color: "#FFFFFF",
    fontWeight: 950,
    fontSize: "1rem",
    background: "linear-gradient(135deg,#22C55E,#16A34A)",
    boxShadow: "0 16px 34px rgba(34,197,94,.24)",
  },
  backLink: {
    display: "inline-block",
    marginTop: 18,
    color: "#C7D2FE",
    fontWeight: 800,
  },
};