"use client";

import {
  FormEvent,
  Suspense,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type RecoveryStatus =
  | "idle"
  | "loading"
  | "sent";

function getRecoveryRedirectUrl() {
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return `${window.location.origin}/reset-password`;
  }

  return "https://app.jasodatos.com/reset-password";
}

function LoginForm() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const nextPath =
    searchParams.get("next") ||
    "/admin/clientes";

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL!,
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [status, setStatus] =
    useState<
      "idle" | "loading"
    >("idle");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    recoveryOpen,
    setRecoveryOpen,
  ] = useState(false);

  const [
    recoveryEmail,
    setRecoveryEmail,
  ] = useState("");

  const [
    recoveryStatus,
    setRecoveryStatus,
  ] =
    useState<RecoveryStatus>(
      "idle"
    );

  const [
    recoveryMessage,
    setRecoveryMessage,
  ] = useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    setStatus("loading");

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email:
            normalizedEmail,
          password,
        }
      );

    setStatus("idle");

    if (error) {
      setErrorMessage(
        "Correo o contraseña incorrectos."
      );
      return;
    }

    router.replace(
      nextPath
    );

    router.refresh();
  }

  function openRecovery() {
    setRecoveryMessage("");

    setRecoveryStatus(
      "idle"
    );

    setRecoveryEmail(
      email
        .trim()
        .toLowerCase()
    );

    setRecoveryOpen(true);
  }

  function closeRecovery() {
    if (
      recoveryStatus ===
      "loading"
    ) {
      return;
    }

    setRecoveryOpen(false);
    setRecoveryMessage("");
    setRecoveryStatus(
      "idle"
    );
  }

  async function handleRecovery(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setRecoveryMessage("");

    const normalizedEmail =
      recoveryEmail
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      setRecoveryMessage(
        "Ingresa tu correo administrador."
      );
      return;
    }

    setRecoveryStatus(
      "loading"
    );

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo:
            getRecoveryRedirectUrl(),
        }
      );

    if (error) {
      console.error(
        "[admin-password-recovery] No se pudo solicitar recuperación:",
        error
      );

      setRecoveryStatus(
        "idle"
      );

      setRecoveryMessage(
        "No se pudo procesar la solicitud en este momento. Espera un momento e inténtalo nuevamente."
      );

      return;
    }

    setRecoveryStatus(
      "sent"
    );

    setRecoveryMessage(
      "Si el correo corresponde a una cuenta autorizada, recibirás un enlace para crear una nueva contraseña."
    );
  }

  return (
    <>
      <section
        style={styles.card}
      >
        <div
          style={styles.brand}
        >
          JD
        </div>

        <p
          style={
            styles.eyebrow
          }
        >
          Acceso administrador
        </p>

        <h1
          style={styles.title}
        >
          Entrar a JasoDatos
          Admin
        </h1>

        <p
          style={styles.text}
        >
          Usa un correo
          administrador
          autorizado para
          gestionar clientes,
          planes y accesos.
        </p>

        <form
          onSubmit={
            handleLogin
          }
          style={styles.form}
        >
          <label
            style={
              styles.label
            }
          >
            Correo
            administrador

            <input
              style={
                styles.input
              }
              type="email"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
              placeholder="Correo administrador"
              autoComplete="email"
              required
            />
          </label>

          <label
            style={
              styles.label
            }
          >
            Contraseña

            <input
              style={
                styles.input
              }
              type="password"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            type="button"
            onClick={
              openRecovery
            }
            style={
              styles.recoveryLink
            }
          >
            ¿Olvidaste tu
            contraseña?
          </button>

          {errorMessage ? (
            <p
              style={
                styles.error
              }
            >
              {
                errorMessage
              }
            </p>
          ) : null}

          <button
            style={{
              ...styles.button,
              opacity:
                status ===
                "loading"
                  ? 0.72
                  : 1,
              cursor:
                status ===
                "loading"
                  ? "not-allowed"
                  : "pointer",
            }}
            type="submit"
            disabled={
              status ===
              "loading"
            }
          >
            {status ===
            "loading"
              ? "Validando..."
              : "Entrar al panel"}
          </button>
        </form>

        <a
          style={
            styles.backLink
          }
          href="/registro"
        >
          Volver al registro
        </a>
      </section>

      {recoveryOpen ? (
        <div
          style={
            styles.overlay
          }
        >
          <section
            style={
              styles.recoveryCard
            }
          >
            <div
              style={
                styles.brand
              }
            >
              JD
            </div>

            <p
              style={
                styles.eyebrow
              }
            >
              Recuperación
              segura
            </p>

            <h2
              style={
                styles.recoveryTitle
              }
            >
              Recuperar
              contraseña
            </h2>

            <p
              style={
                styles.text
              }
            >
              Ingresa el
              correo de tu
              cuenta
              administradora.
              Si está
              autorizado,
              enviaremos un
              enlace para
              crear una nueva
              contraseña.
            </p>

            <form
              onSubmit={
                handleRecovery
              }
              style={
                styles.form
              }
            >
              <label
                style={
                  styles.label
                }
              >
                Correo
                administrador

                <input
                  style={
                    styles.input
                  }
                  type="email"
                  value={
                    recoveryEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setRecoveryEmail(
                      event
                        .target
                        .value
                    )
                  }
                  autoComplete="email"
                  required
                />
              </label>

              {recoveryMessage ? (
                <div
                  style={
                    recoveryStatus ===
                    "sent"
                      ? styles.successBox
                      : styles.errorBox
                  }
                >
                  {
                    recoveryMessage
                  }
                </div>
              ) : null}

              {recoveryStatus !==
              "sent" ? (
                <button
                  type="submit"
                  disabled={
                    recoveryStatus ===
                    "loading"
                  }
                  style={{
                    ...styles.button,
                    opacity:
                      recoveryStatus ===
                      "loading"
                        ? 0.72
                        : 1,
                    cursor:
                      recoveryStatus ===
                      "loading"
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {recoveryStatus ===
                  "loading"
                    ? "Enviando..."
                    : "Enviar enlace de recuperación"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={
                  closeRecovery
                }
                disabled={
                  recoveryStatus ===
                  "loading"
                }
                style={
                  styles.secondaryButton
                }
              >
                {recoveryStatus ===
                "sent"
                  ? "Cerrar"
                  : "Cancelar"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function LoginFallback() {
  return (
    <section
      style={styles.card}
    >
      <div
        style={styles.brand}
      >
        JD
      </div>

      <p
        style={
          styles.eyebrow
        }
      >
        Acceso administrador
      </p>

      <h1
        style={styles.title}
      >
        Cargando acceso...
      </h1>

      <p
        style={styles.text}
      >
        Preparando
        validación segura
        del panel.
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <main
      style={styles.page}
    >
      <Suspense
        fallback={
          <LoginFallback />
        }
      >
        <LoginForm />
      </Suspense>
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
    width:
      "min(100%, 460px)",
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
    textTransform:
      "uppercase",
    letterSpacing:
      ".16em",
    fontSize: ".76rem",
    fontWeight: 950,
  },

  title: {
    margin:
      "10px 0 12px",
    fontSize: "2rem",
    lineHeight: 1.05,
    letterSpacing:
      "-.04em",
  },

  recoveryTitle: {
    margin:
      "10px 0 12px",
    fontSize: "1.7rem",
    lineHeight: 1.08,
    letterSpacing:
      "-.03em",
  },

  text: {
    margin:
      "0 0 24px",
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
    padding:
      "0 14px",
    outline: "none",
    fontSize: "1rem",
    boxSizing:
      "border-box",
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
    background:
      "linear-gradient(135deg,#22C55E,#16A34A)",
    boxShadow:
      "0 16px 34px rgba(34,197,94,.24)",
  },

  recoveryLink: {
    justifySelf:
      "start",
    padding: 0,
    border: 0,
    background:
      "transparent",
    color: "#93C5FD",
    fontWeight: 850,
    fontSize: ".9rem",
    cursor: "pointer",
    textDecoration:
      "underline",
    textUnderlineOffset:
      3,
  },

  backLink: {
    display:
      "inline-block",
    marginTop: 18,
    color: "#C7D2FE",
    fontWeight: 800,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "rgba(3,7,30,.78)",
    backdropFilter:
      "blur(8px)",
  },

  recoveryCard: {
    width:
      "min(100%, 460px)",
    padding: 34,
    borderRadius: 28,
    background:
      "linear-gradient(180deg, rgba(18,27,92,.99), rgba(9,15,52,.99))",
    border:
      "1px solid rgba(127,178,255,.30)",
    boxShadow:
      "0 34px 100px rgba(0,0,0,.55)",
  },

  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    border:
      "1px solid rgba(255,255,255,.14)",
    background:
      "rgba(255,255,255,.06)",
    color: "#E0E7FF",
    fontWeight: 850,
    fontSize: ".95rem",
    cursor: "pointer",
  },

  successBox: {
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

  errorBox: {
    padding: 14,
    borderRadius: 14,
    border:
      "1px solid rgba(248,113,113,.35)",
    background:
      "rgba(239,68,68,.12)",
    color: "#FCA5A5",
    lineHeight: 1.5,
    fontWeight: 800,
  },
};