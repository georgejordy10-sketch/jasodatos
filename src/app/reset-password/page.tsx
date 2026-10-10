"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type RecoveryStatus =
  | "checking"
  | "ready"
  | "invalid"
  | "loading"
  | "success";

export default function ResetPasswordPage() {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [status, setStatus] =
    useState<RecoveryStatus>("checking");

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function initializeRecoverySession() {
      try {
        setErrorMessage("");

        const currentUrl = new URL(
          window.location.href
        );

        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );

        const accessToken =
          hashParams.get("access_token");

        const refreshToken =
          hashParams.get("refresh_token");

        const recoveryType =
          hashParams.get("type");

        const code =
          currentUrl.searchParams.get("code");

        /*
         * Flujo implícito de Supabase:
         * #access_token=...&refresh_token=...&type=recovery
         */
        if (accessToken && refreshToken) {
          const { error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (error) {
            throw error;
          }

          if (
            recoveryType &&
            recoveryType !== "recovery"
          ) {
            throw new Error(
              "El enlace recibido no corresponde a recuperación de contraseña."
            );
          }
        } else if (code) {
          /*
           * Flujo PKCE:
           * /reset-password?code=...
           */
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (error) {
            throw error;
          }
        }

        /*
         * Confirmamos que Supabase tiene una sesión válida.
         */
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error(
            "No existe una sesión válida de recuperación."
          );
        }

        /*
         * Quitamos access_token / refresh_token de la barra
         * del navegador una vez que la sesión ya fue creada.
         */
        window.history.replaceState(
          null,
          "",
          "/reset-password"
        );

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        console.error(
          "[reset-password] No se pudo iniciar la sesión de recuperación:",
          error
        );

        if (!cancelled) {
          setStatus("invalid");
          setErrorMessage(
            "El enlace de recuperación no es válido, ya venció o ya fue utilizado. Solicita uno nuevo."
          );
        }
      }
    }

    void initializeRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (status !== "ready") {
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "Las contraseñas no coinciden."
      );
      return;
    }

    setStatus("loading");

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      console.error(
        "[reset-password] Error actualizando contraseña:",
        error
      );

      setStatus("ready");
      setErrorMessage(
        "No se pudo actualizar la contraseña. El enlace puede haber vencido. Solicita uno nuevo."
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

        <p style={styles.eyebrow}>
          JasoDatos · Seguridad
        </p>

        <h1 style={styles.title}>
          Crear nueva contraseña
        </h1>

        {status === "checking" ? (
          <div style={styles.info}>
            Validando tu enlace de recuperación...
          </div>
        ) : null}

        {status === "invalid" ? (
          <>
            <div style={styles.errorBox}>
              {errorMessage}
            </div>

            <a
              style={styles.backLink}
              href="/login"
            >
              Volver al acceso administrador
            </a>
          </>
        ) : null}

        {status === "success" ? (
          <div style={styles.success}>
            Contraseña actualizada correctamente.
            Redirigiendo al acceso administrador...
          </div>
        ) : null}

        {(status === "ready" ||
          status === "loading") && (
          <>
            <p style={styles.text}>
              Ingresa una nueva contraseña para tu
              cuenta de administrador.
            </p>

            <form
              onSubmit={handleSubmit}
              style={styles.form}
            >
              <label style={styles.label}>
                Nueva contraseña

                <input
                  style={styles.input}
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  minLength={8}
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
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              {errorMessage ? (
                <p style={styles.error}>
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "loading"}
                style={{
                  ...styles.button,
                  opacity:
                    status === "loading"
                      ? 0.72
                      : 1,
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

            <a
              style={styles.backLink}
              href="/login"
            >
              Volver al acceso administrador
            </a>
          </>
        )}
      </section>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    color: "#F8FAFC",
    background:
      "radial-gradient(circle at top, rgba(127,178,255,.20), transparent 34%), linear-gradient(135deg,#070A1F,#120A3D)",
    fontFamily:
      "Arial, Helvetica, sans-serif",
  },

  card: {
    width: "min(100%, 460px)",
    padding: 34,
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(18,27,92,.96), rgba(9,15,52,.98))",
    border:
      "1px solid rgba(127,178,255,.26)",
    boxShadow:
      "0 34px 100px rgba(0,0,0,.42)",
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
    border:
      "1px solid rgba(255,255,255,.14)",
    background:
      "rgba(255,255,255,.06)",
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

  errorBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    background:
      "rgba(239,68,68,.12)",
    border:
      "1px solid rgba(248,113,113,.35)",
    color: "#FCA5A5",
    lineHeight: 1.5,
    fontWeight: 800,
  },

  info: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    background:
      "rgba(59,130,246,.12)",
    border:
      "1px solid rgba(96,165,250,.35)",
    color: "#BFDBFE",
    lineHeight: 1.5,
    fontWeight: 800,
  },

  success: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    border:
      "1px solid rgba(34,197,94,.35)",
    background:
      "rgba(34,197,94,.12)",
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
