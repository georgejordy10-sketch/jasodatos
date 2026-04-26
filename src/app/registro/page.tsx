"use client";

import { useState, type CSSProperties } from "react";

type SignupForm = {
  business_name: string;
  owner_name: string;
  commercial_email: string;
  commercial_whatsapp: string;
  locale: string;
};

export default function RegistroPage() {
  const [form, setForm] = useState<SignupForm>({
    business_name: "",
    owner_name: "",
    commercial_email: "",
    commercial_whatsapp: "",
    locale: "es-EC",
  });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function submitTrial() {
    try {
      setLoading(true);
      setNotice("");

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

      window.location.href = result.redirectTo;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la prueba.";
      setNotice(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.badge}>Prueba gratis · Ultra 3 días</div>

        <h1 style={styles.title}>Empieza a probar JasoDatos</h1>

        <p style={styles.subtitle}>
          Registra tu negocio, carga tu archivo CSV o Excel y descubre
          oportunidades comerciales en minutos.
        </p>

        <div style={styles.grid}>
          <label style={styles.label}>
            <span>Nombre del negocio</span>
            <input
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
            <span>País / formato regional</span>
            <select
              style={styles.input}
              value={form.locale}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  locale: event.target.value,
                }))
              }
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

        {notice ? <div style={styles.notice}>{notice}</div> : null}

        <button
          type="button"
          style={styles.button}
          onClick={submitTrial}
          disabled={loading}
        >
          {loading ? "Creando prueba..." : "Crear prueba gratis"}
        </button>

        <p style={styles.footerText}>
          Al continuar, se creará una prueba Ultra de 3 días. Luego podrás
          elegir el plan que mejor se ajuste a tu negocio.
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
  notice: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,68,68,0.10)",
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: 800,
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