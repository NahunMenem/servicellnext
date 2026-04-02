export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function toInputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function startOfWeekInput(value: Date | string) {
  const base =
    typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value.getTime());
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + diff);
  return toInputDate(base);
}

export function normalizeText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .toLowerCase()
    .trim();
}
