"use client";

import { useState, type CSSProperties } from "react";
import type { ChannelKey, ProfileSettings } from "./types";

type ProfileSettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  settings: ProfileSettings;
  updateSettings: (patch: Partial<ProfileSettings>) => void;
  updateThreshold: (key: string, value: number) => void;
  updateChannel: (channel: string, enabled: boolean) => void;
  resetSettings: () => void;
  businessSlug: string;
  onSaveCrm?: (payload: {
    owner_name: string;
    commercial_email: string;
    commercial_whatsapp: string;
  }) => Promise<void>;
};

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const COUNTRY_DIAL_CODES: Record<string, string> = {
  "es-EC": "593",
  "es-CO": "57",
  "es-MX": "52",
  "es-PE": "51",
  "es-ES": "34",
  "en-US": "1",
};

function normalizeWhatsappPhone(value: string, locale: string) {
  const rawValue = value.trim();
  const digits = rawValue.replace(/\D/g, "");

  if (!digits) return "";

  const dialCode = COUNTRY_DIAL_CODES[locale] ?? "593";

  if (rawValue.startsWith("+")) return digits;
  if (digits.startsWith(dialCode)) return digits;

  if (locale === "es-EC" && digits.startsWith("0") && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  if (locale === "es-CO" && digits.length === 10) return `57${digits}`;
  if (locale === "es-MX" && digits.length === 10) return `52${digits}`;
  if (locale === "es-PE" && digits.length === 9) return `51${digits}`;
  if (locale === "es-ES" && digits.length === 9) return `34${digits}`;
  if (locale === "en-US" && digits.length === 10) return `1${digits}`;

  return digits;
}

export default function ProfileSettingsPanel({
  open,
  onClose,
  settings,
  updateSettings,
  updateThreshold,
  updateChannel,
  resetSettings,
  businessSlug,
  onSaveCrm,
}: ProfileSettingsPanelProps) {
  const [ownerName, setOwnerName] = useState("");
  const [commercialEmail, setCommercialEmail] = useState("");
  const [savingCrm, setSavingCrm] = useState(false);
  const [crmNotice, setCrmNotice] = useState("");

  if (!open) return null;

  const whatsappDigits = normalizeWhatsappPhone(
    settings.businessWhatsapp,
    settings.locale
  );

  const whatsappLooksValid =
    whatsappDigits.length === 0 ||
    (whatsappDigits.length >= 8 && whatsappDigits.length <= 15);

  const whatsappPreview = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : "";

  async function saveCrmFromSettings() {
    if (!onSaveCrm) return;

    try {
      setSavingCrm(true);
      setCrmNotice("");

      await onSaveCrm({
        owner_name: ownerName,
        commercial_email: commercialEmail,
        commercial_whatsapp: normalizeWhatsappPhone(
          settings.businessWhatsapp,
          settings.locale
        ),
      });

      setCrmNotice("Datos CRM guardados correctamente.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los datos CRM.";

      setCrmNotice(message);
    } finally {
      setSavingCrm(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Configuración del negocio</h2>
            <p style={styles.subtitle}>
              Ajusta datos base y umbrales comerciales. Los cambios se guardan automáticamente.
            </p>
          </div>

          <button type="button" onClick={onClose} style={styles.closeButton}>
            Cerrar
          </button>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Datos del negocio</h3>

            <label style={styles.label}>
              <span>Nombre del negocio</span>
              <input
                style={styles.input}
                value={settings.businessName}
                onChange={(e) => updateSettings({ businessName: e.target.value })}
              />
            </label>
            <label style={styles.label}>
  <span>Nombre del dueño o responsable</span>
  <input
    style={styles.input}
    value={ownerName}
    onChange={(event) => setOwnerName(event.target.value)}
    placeholder="Ej. Primer nombre + Primer apellido"
  />
</label>

<label style={styles.label}>
  <span>Correo comercial</span>
  <input
    type="email"
    style={styles.input}
    value={commercialEmail}
    onChange={(event) => setCommercialEmail(event.target.value)}
    placeholder="correo@negocio.com"
  />
</label>
             <label style={styles.label}>
  <span>WhatsApp comercial</span>
  <input
    type="tel"
    inputMode="tel"
    placeholder="+593997945350"
    style={{
      ...styles.input,
      ...(whatsappLooksValid ? null : styles.inputError),
    }}
    value={settings.businessWhatsapp}
    onChange={(e) => updateSettings({ businessWhatsapp: e.target.value })}
onBlur={(e) =>
  updateSettings({
    businessWhatsapp: normalizeWhatsappPhone(e.target.value, settings.locale),
  })
}
  />

  <small
    style={
      whatsappLooksValid ? styles.helperText : { ...styles.helperText, ...styles.helperTextError }
    }
  >
{whatsappDigits.length === 0
  ? "Puedes escribir tu número local o con código internacional. Ejemplo Ecuador: 0997945350 o +593997945350."
  : whatsappLooksValid
  ? `Vista previa: ${whatsappPreview}`
  : "Número inválido. Usa un celular válido para el formato regional seleccionado."}
  </small>
</label>

<button
  type="button"
  style={styles.crmSaveButton}
  onClick={saveCrmFromSettings}
  disabled={savingCrm || !businessSlug}
>
  {savingCrm ? "Guardando CRM..." : "Guardar datos CRM"}
</button>

{crmNotice ? <small style={styles.helperText}>{crmNotice}</small> : null}

<label style={styles.label}>
  <span>Moneda</span>
  <select
    style={styles.input}
    value={settings.currencyCode}
    onChange={(e) =>
      updateSettings({
        currencyCode: e.target.value as ProfileSettings["currencyCode"],
      })
    }
  >
    <option style={styles.selectOption} value="USD">Dólar estadounidense (USD)</option>
    <option style={styles.selectOption} value="EUR">Euro (EUR)</option>
    <option style={styles.selectOption} value="PEN">Sol peruano (PEN)</option>
    <option style={styles.selectOption} value="COP">Peso colombiano (COP)</option>
    <option style={styles.selectOption} value="MXN">Peso mexicano (MXN)</option>
  </select>
</label>
<label style={styles.label}>
  <span>Formato regional</span>
  <select
    style={styles.input}
    value={settings.locale}
    onChange={(e) => updateSettings({ locale: e.target.value })}
  >
    <option style={styles.selectOption} value="es-EC">Español (Ecuador)</option>
    <option style={styles.selectOption} value="es-ES">Español (España)</option>
    <option style={styles.selectOption} value="en-US">English (United States)</option>
    <option style={styles.selectOption} value="es-MX">Español (México)</option>
    <option style={styles.selectOption} value="es-CO">Español (Colombia)</option>
    <option style={styles.selectOption} value="es-PE">Español (Perú)</option>
  </select>
</label>
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Reglas comerciales</h3>

            <label style={styles.label}>
              <span>Stock mínimo por defecto</span>
              <input
                type="number"
                style={styles.input}
                value={settings.defaultStockMin}
                onChange={(e) =>
                  updateSettings({ defaultStockMin: toNumber(e.target.value) })
                }
              />
            </label>

            <label style={styles.label}>
              <span>Caída de ventas - alerta media (%)</span>
              <input
                type="number"
                style={styles.input}
                value={settings.salesDropMediumPct}
                onChange={(e) =>
                  updateThreshold("salesDropMediumPct", toNumber(e.target.value))
                }
              />
            </label>

            <label style={styles.label}>
              <span>Caída de ventas - alerta alta (%)</span>
              <input
                type="number"
                style={styles.input}
                value={settings.salesDropHighPct}
                onChange={(e) =>
                  updateThreshold("salesDropHighPct", toNumber(e.target.value))
                }
              />
            </label>
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Canales habilitados</h3>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.channelsEnabled.ecommerce}
                onChange={(e) => updateChannel("ecommerce", e.target.checked)}
              />
              <span>e-commerce</span>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.channelsEnabled.mayorista}
                onChange={(e) => updateChannel("mayorista", e.target.checked)}
              />
              <span>mayorista</span>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.channelsEnabled.tiendaFisica}
                onChange={(e) => updateChannel("tiendaFisica", e.target.checked)}
              />
              <span>tienda física</span>
            </label>
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>Módulos visibles</h3>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.showBenchmarking}
                onChange={(e) => updateSettings({ showBenchmarking: e.target.checked })}
              />
              <span>Mostrar benchmarking</span>
            </label>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.showAssistant}
                onChange={(e) => updateSettings({ showAssistant: e.target.checked })}
              />
              <span>Mostrar JasoBot Comercial</span>
            </label>

            <div style={styles.footerRow}>
              <button type="button" onClick={resetSettings} style={styles.secondaryButton}>
                Restaurar valores
              </button>
              <button type="button" onClick={onClose} style={styles.primaryButton}>
                Listo
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(8, 12, 32, 0.64)",
    backdropFilter: "blur(6px)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  panel: {
    width: "min(1120px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 40px rgba(10, 17, 70, 0.35)",
    padding: 22,
    display: "grid",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "rgba(236,242,255,0.90)",
    fontSize: 14,
    lineHeight: 1.45,
  },
  closeButton: {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(127,178,255,0.12)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },
  card: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: 800,
  },
  label: {
    display: "grid",
    gap: 6,
    color: "#EAF2FF",
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "#FFFFFF",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
  },
  inputError: {
  border: "1px solid rgba(239,68,68,0.55)",
  boxShadow: "0 0 0 1px rgba(239,68,68,0.18)",
},

helperText: {
  color: "rgba(236,242,255,0.74)",
  fontSize: 12,
  lineHeight: 1.35,
},
selectOption: {
  color: "#111827",
  background: "#FFFFFF",
},
helperTextError: {
  color: "#FCA5A5",
},
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#F5F8FF",
    fontSize: 14,
    fontWeight: 500,
  },
  footerRow: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 8,
    flexWrap: "wrap",
  },
  primaryButton: {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(127,178,255,0.22)",
    background: "rgba(127,178,255,0.16)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  crmSaveButton: {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid rgba(34,197,94,0.28)",
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#FFFFFF",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
},
};

