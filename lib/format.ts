const numberFormatter = new Intl.NumberFormat("en-PH");

export function formatDateTime(
  value: string | null | undefined,
  timeZone = "Asia/Manila",
): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

export function formatDate(
  value: string | null | undefined,
  timeZone = "Asia/Manila",
): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(value));
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function shortenId(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

/** Integer centavos as pesos (KitaMo keeps money as integer centavos). */
export function formatPesos(cents: number): string {
  return pesoFormatter.format(cents / 100);
}

/** A business day (YYYY-MM-DD) as "Oct 14, 2026", without a timezone shift. */
export function formatBusinessDay(value: string | null | undefined): string {
  if (!value) return "None";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Today's business day in a timezone (Manila by default), as YYYY-MM-DD. */
export function businessToday(nowMs = Date.now(), timeZone = "Asia/Manila") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

/** A YYYY-MM-DD day moved by whole days. */
export function shiftDay(day: string, days: number): string {
  const ms = Date.parse(`${day}T12:00:00Z`) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
