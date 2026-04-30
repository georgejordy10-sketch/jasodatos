"use client";

import { useState, type CSSProperties } from "react";

type SignupForm = {
  business_name: string;
  owner_name: string;
  commercial_email: string;
  commercial_whatsapp: string;
  ciudad: string;
  provincia: string;
  pais: string;
  locale: string;
};

const countryByLocale: Record<string, string> = {
  "es-EC": "Ecuador",
  "es-CO": "Colombia",
  "es-PE": "Perú",
  "es-MX": "México",
  "es-ES": "España",
  "en-US": "Estados Unidos",
};

export default function RegistroPage() {
  const [form, setForm] = useState<SignupForm>({
    business_name: "",
    owner_name: "",
    commercial_email: "",
    commercial_whatsapp: "",
    ciudad: "",
    provincia: "",
    pais: "Ecuador",
    locale: "es-EC",
  });

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [slug, setSlug] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [redirectTo, setRedirectTo] = useState("");
  const [debugCode, setDebugCode] = useState("");

  async function submitTrial() {
    try {
      setLoading(true);
      setNotice("");
      setRedirectTo("");
      setDebugCode("");

      if (!form.business_name.trim()) {
        throw new Error("El nombre del negocio es obligatorio.");
      }

      if (!form.owner_name.trim()) {
        throw new Error("El nombre del dueño o responsable es obligatorio.");
      }

      if (!form.commercial_email.trim()) {
        throw new Error("El correo comercial es obligatorio.");
      }

      if (!form.commercial_whatsapp.trim()) {
        throw new Error("El WhatsApp comercial es obligatorio.");
      }

      if (!form.ciudad.trim()) {
        throw new Error("La ciudad es obligatoria.");
      }

      if (!form.provincia.trim()) {
        throw new Error("La provincia es obligatoria.");
      }

      if (!form.pais.trim()) {
        throw new Error("El país es obligatorio.");
      }

      const response = await fetch("/api/public/trial-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo crear la prueba.");
      }

      setSlug(result.slug || result.business?.slug || "");
      setNotice(
        result?.message ||
          "Te enviamos un código de verificación al correo registrado."
      );

      if (result.debug_verification_code) {
        setDebugCode(result.debug_verification_code);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la prueba.";
      setNotice(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyTrial() {
    try {
      setVerifying(true);
      setNotice("");

      if (!slug) {
        throw new Error("No se encontró el código interno del negocio.");
      }

      if (!verificationCode.trim()) {
        throw new Error("Ingresa el código recibido por correo.");
      }

      const response = await fetch("/api/public/verify-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          code: verificationCode.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "No se pudo verificar el correo.");
      }

      setRedirectTo(result.redirectTo || `/cargas?business=${slug}`);
      setNotice("Correo verificado correctamente. Tu prueba gratis está activa.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo verificar el correo.";
      setNotice(message);
    } finally {
      setVerifying(false);
    }
  }

  const registrationLocked = Boolean(slug);
  const trialActivated = Boolean(redirectTo);

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>Prueba gratis · Ultra 3 días</div>

        <h1 style={styles.title}>Empieza a probar JasoDatos</h1>

        <p style={styles.subtitle}>
          Registra tu negocio, valida tu correo y carga tu archivo CSV o Excel
          para descubrir oportunidades comerciales en minutos.
        </p>

        <div style={styles.grid}>
          <label style={styles.label}>
            <span>Nombre del negocio</span>
            <input
              required
              disabled={registrationLocked}
              style={styles.input}
              value={form.business_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  business_name: event.target.value,
                }))
              }
              placeholder="Ej. Comercial El Sol"
            />
          </label>

          <label style={styles.label}>
            <span>Nombre del dueño o responsable</span>
            <input
              required
              disabled={registrationLocked}
              style={styles.input}
              value={form.owner_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  owner_name: event.target.value,
                }))
              }
              placeholder="Nombre + Apellido"
            />
          </label>

          <label style={styles.label}>
            <span>Correo comercial</span>
            <input
              required
              disabled={registrationLocked}
              type="email"
              style={styles.input}
              value={form.commercial_email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  commercial_email: event.target.value,
                }))
              }
              placeholder="correo@negocio.com"
            />
          </label>

          <label style={styles.label}>
            <span>WhatsApp comercial</span>
            <input
              required
              disabled={registrationLocked}
              type="tel"
              style={styles.input}
              value={form.commercial_whatsapp}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  commercial_whatsapp: event.target.value,
                }))
              }
              placeholder="0999999999 o +593999999999"
            />
          </label>

          <label style={styles.label}>
            <span>Ciudad</span>
            <input
              required
              disabled={registrationLocked}
              style={styles.input}
              value={form.ciudad}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ciudad: event.target.value,
                }))
              }
              placeholder="Ej. Quito"
            />
          </label>

          <label style={styles.label}>
            <span>Provincia</span>
            <input
              required
              disabled={registrationLocked}
              style={styles.input}
              value={form.provincia}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  provincia: event.target.value,
                }))
              }
              placeholder="Ej. Pichincha"
            />
          </label>

          <label style={styles.label}>
            <span>País</span>
            <select
              required
              disabled={registrationLocked}
              style={styles.input}
              value={form.locale}
              onChange={(event) => {
                const nextLocale = event.target.value;

                setForm((current) => ({
                  ...current,
                  locale: nextLocale,
                  pais: countryByLocale[nextLocale] ?? current.pais,
                }));
              }}
            >
              <option value="es-EC">Ecuador</option>
              <option value="es-CO">Colombia</option>
              <option value="es-PE">Perú</option>
              <option value="es-MX">México</option>
              <option value="es-ES">España</option>
              <option value="en-US">Estados Unidos</option>
            </select>
          </label>
        </div>

        {!registrationLocked ? (
          <button
            type="button"
            style={styles.button}
            onClick={submitTrial}
            disabled={loading}
          >
            {loading ? "Enviando código..." : "Crear prueba gratis"}
          </button>
        ) : null}

        {registrationLocked && !trialActivated ? (
          <div style={styles.verificationBox}>
            <h2 style={styles.verificationTitle}>Verifica tu correo</h2>

            <p style={styles.verificationText}>
              Enviamos un código de 6 dígitos a{" "}
              <strong>{form.commercial_email}</strong>. Ingresa el código para
              activar tu prueba gratis.
            </p>

            {debugCode ? (
              <div style={styles.debugCode}>
                Código local de prueba: <strong>{debugCode}</strong>
              </div>
            ) : null}

            <label style={styles.label}>
              <span>Código de verificación</span>
              <input
                style={styles.input}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="Ej. 123456"
                inputMode="numeric"
                maxLength={6}
              />
            </label>

            <button
              type="button"
              style={styles.button}
              onClick={verifyTrial}
              disabled={verifying}
            >
              {verifying
                ? "Verificando..."
                : "Verificar correo y activar prueba"}
            </button>
          </div>
        ) : null}

        {notice ? <div style={styles.notice}>{notice}</div> : null}

        {redirectTo ? (
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              window.location.href = redirectTo;
            }}
          >
            Ir a cargar archivo
          </button>
        ) : null}

        <p style={styles.footerText}>
          La prueba se activa únicamente después de validar el correo. Así
          protegemos la matriz de clientes y evitamos registros ficticios.
        </p>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background:
      "radial-gradient(circle at top left, #4338CA 0%, transparent 28%), linear-gradient(135deg, #0F172A 0%, #1E1B4B 52%, #312E81 100%)",
  },

  card: {
    width: "min(760px, 96vw)",
    borderRadius: 28,
    padding: 32,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(255,255,255,0.35)",
    boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.14)",
    color: "#15803D",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  title: {
    margin: "18px 0 0",
    color: "#172554",
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 900,
    letterSpacing: "-0.03em",
  },

  subtitle: {
    margin: "12px 0 24px",
    color: "#475569",
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 600,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },

  label: {
    display: "grid",
    gap: 6,
    color: "#172554",
    fontSize: 12,
    fontWeight: 900,
  },

  input: {
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
  },

  verificationBox: {
    marginTop: 20,
    padding: 18,
    borderRadius: 20,
    border: "1px solid rgba(67,56,202,0.18)",
    background: "rgba(67,56,202,0.06)",
    display: "grid",
    gap: 12,
  },

  verificationTitle: {
    margin: 0,
    color: "#172554",
    fontSize: 20,
    fontWeight: 900,
  },

  verificationText: {
    margin: 0,
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 700,
  },

  debugCode: {
    padding: 10,
    borderRadius: 14,
    background: "rgba(234,179,8,0.16)",
    color: "#854D0E",
    fontSize: 13,
    fontWeight: 900,
  },

  notice: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,68,68,0.10)",
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: 800,
  },

  secondaryButton: {
    width: "100%",
    minHeight: 46,
    marginTop: 12,
    borderRadius: 16,
    border: "1px solid rgba(67,56,202,0.35)",
    background: "rgba(67,56,202,0.08)",
    color: "#4338CA",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },

  button: {
    width: "100%",
    minHeight: 50,
    marginTop: 20,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(67,56,202,0.28)",
  },

  footerText: {
    margin: "14px 0 0",
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.5,
    fontWeight: 600,
    textAlign: "center",
  },
};