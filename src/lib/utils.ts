import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { looksLikeNotionId } from "@/lib/notionMapper";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Turns long, ugly identifiers into a clean reference tag for display.
 *  - Notion UUIDs (e.g. "a46f6162-013b-83df-...") → "REF-A46F" with prefix.
 *  - Already-tidy IDs (e.g. "AP-01", "PR-002")     → returned unchanged.
 *  - Empty / Notion page ids                       → graceful fallback.
 */
export function shortRef(id: string | undefined | null, prefix = "REF"): string {
  if (!id) return `${prefix}-—`;
  const raw = id.trim();
  if (looksLikeNotionId(raw)) {
    const hex = raw.replace(/-/g, "").toUpperCase();
    return `${prefix}-${hex.substring(0, 4)}`;
  }
  return raw;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n || 0);
}

export function alertColorVar(level: string): string {
  switch (level) {
    case "Critical":
      return "var(--critical)";
    case "Warning":
      return "var(--warning)";
    case "On Target":
      return "var(--success)";
    default:
      return "var(--border)";
  }
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
