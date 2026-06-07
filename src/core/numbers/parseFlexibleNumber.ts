export function parseFlexibleNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value === null || value === undefined) return 0;

  let raw = String(value).trim();

  if (!raw) return 0;

  const isNegativeByParentheses = /^\(.*\)$/.test(raw);

  raw = raw
    .replace(/\((.*)\)/, "$1")
    .replace(/\s+/g, "")
    .replace(/[^\d,.\-]/g, "");

  if (!raw || raw === "-" || raw === "," || raw === ".") return 0;

  const negative = isNegativeByParentheses || raw.startsWith("-");
  raw = raw.replace(/-/g, "");

  const commaCount = (raw.match(/,/g) ?? []).length;
  const dotCount = (raw.match(/\./g) ?? []).length;

  let normalized = raw;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");

    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (commaCount > 0) {
    const parts = raw.split(",");
    const lastPart = parts[parts.length - 1];

    if (commaCount === 1 && lastPart.length > 0 && lastPart.length <= 2) {
      normalized = raw.replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (dotCount > 0) {
    const parts = raw.split(".");
    const lastPart = parts[parts.length - 1];

    if (dotCount === 1 && lastPart.length > 0 && lastPart.length <= 2) {
      normalized = raw;
    } else {
      normalized = raw.replace(/\./g, "");
    }
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return 0;

  return negative ? -parsed : parsed;
}
