"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function ResetPasswordPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setStatus("loading");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setStatus("idle");
      setErrorMessage(
        "El enlace de recuperación no es válido o ya venció. Solicita uno nuevo."
      );
      return;
    }

    setStatus("success");

    await supabase.auth.signOut();

    window.setTimeout(() => {
      router.replace("/login");
      router.refresh();
    }, 1200);
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.brand}>JD</div>

        <p style={styles.eyebrow}>JasoDatos · Seguridad</p>

        <h1 style={styles.title}>Crear nueva contraseña</h1>

        <p style={styles.text}>
          Ingresa una nueva contraseña para tu cuenta de administrador.
        </p>

        {status === "success" ? (
          <div style={styles.success}>
            Contraseña actualizada correctamente. Redirigiendo al acceso
            administrador...
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Nueva contraseña
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="new-password"
                required
              />
            </label>

            <label style={styles.label}>
              Confirmar contraseña
              <input
                style={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                required
              />
            </label>

            {errorMessage ? (
              <p style={styles.error}>{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                ...styles.button,
                opacity: status === "loading" ? 0.72 : 1,
                cursor:
                  status === "loading"
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {status === "loading"
                ? "Actualizando..."
                : "Cambiar contraseña"}
            </button>
          </form>
        )}

        <a style={styles.backLink} href="/login">
          Volver al acceso administrador
        </a>
      </section>
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
    background:
      "linear-gradient(135deg,#7FB2FF,#8B5CF6)",
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

  success: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(34,197,94,.35)",
    background: "rgba(34,197,94,.12)",
    color: "#BBF7D0",
    lineHeight: 1.5,
    fontWeight: 800,
  },

  button: {
    minHeight: 50,
    border: 0,
    borderRadius: 14,
    color: "#FFFFFF",
    fontWeight: 950,
    fontSize: "1rem",
    background:
      "linear-gradient(135deg,#22C55E,#16A34A)",
    boxShadow:
      "0 16px 34px rgba(34,197,94,.24)",
  },

  backLink: {
    display: "inline-block",
    marginTop: 18,
    color: "#C7D2FE",
    fontWeight: 800,
  },
};
