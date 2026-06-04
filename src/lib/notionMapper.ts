// ───────────────────────────────────────────────────────────
// Defensive Notion property readers.
// Notion returns a different shape per property type, and a field
// the schema calls "Select" might actually be a Status/RichText.
// These helpers tolerate ALL of that + missing fields gracefully.
//
// Critical fix (audit gap #1): "KPI Master Link" can be a Relation
// returning UUIDs instead of names. We try, in order:
//   rollup text → formula text → rich_text → title → select → relation id
// so the dashboard never shows raw UUIDs when a readable name exists.
//
// As a guaranteed last line of defence, a hardcoded KPI dictionary maps
// the known relation IDs from THIS FactoryOS workspace → readable names,
// so the UI never displays raw "c33f6162-..." codes even when no rollup
// is available. The map is dash/case-insensitive.
// ───────────────────────────────────────────────────────────

// Hardcoded BILINGUAL mapping extracted directly from the live FactoryOS
// workspace. Each ID maps to a clean English AND Arabic name so the two
// languages never bleed into one another in the UI.
// Keys are normalized (lowercase, no dashes) at lookup time, so you can
// add new entries with or without hyphens — both will match.
export type LangCode = "ar" | "en";

const KPI_MULTILANG_MAP: Record<string, { en: string; ar: string }> = {
  "c33f6162-013b-8225-8e53-816a5de63ea7": { en: "OEE Efficiency", ar: "كفاءة المعدات الكلية" },
  "1c8f6162-013b-82a9-8e15-816609db89de": { en: "Cycle Time", ar: "زمن الدورة الإنتاجية" },
  "a46f6162-013b-83df-aa79-81510ace7774": { en: "Changeover Time", ar: "وقت التبديل والتجهيز" },
  "683f6162-013b-833b-8669-0155a902e8ce": { en: "Defect Rate (DPMO)", ar: "معدل العيوب والتصنيع" },
  "dbdf6162-013b-82d5-b9fa-011cc8ec600c": { en: "Throughput Speed", ar: "معدل التدفق والإنتاجية" },
  "5dbf6162-013b-82b8-94b3-013c96eba9ad": { en: "MTTR / Downtime", ar: "زمن التوقف وإصلاح الأعطال" },
  "017f6162-013b-83bc-adcc-818a03cb3904": { en: "Quality Containment", ar: "احتواء عيوب الجودة" },
  // New IDs extracted from the KPI summary screen
  "532f6162-013b-8289-9d49-019c22747896": { en: "Availability Rate", ar: "معدل جاهزية الخطوط" },
  "5aaf6162-013b-8343-bc53-019c22747896": { en: "Performance Rate", ar: "معدل الأداء التشغيلي" },
  "e90f6162-013b-82fb-aa79-81510ace7774": { en: "Scrap Rate / Waste", ar: "معدل الهدر والنفاية" },
};

function normalizeId(id: string): string {
  return id.toLowerCase().replace(/-/g, "").trim();
}

// Pre-normalize the dictionary once for O(1), dash-insensitive lookups.
const NORMALIZED_KPI_MAP: Record<string, { en: string; ar: string }> =
  Object.fromEntries(
    Object.entries(KPI_MULTILANG_MAP).map(([id, names]) => [normalizeId(id), names])
  );

// Reverse index: readable name (en OR ar, lowercased) → bilingual pair.
// Lets the UI re-localize a card even after data was aggregated by the
// English label (the server resolves IDs → English before aggregation).
const NAME_TO_PAIR: Record<string, { en: string; ar: string }> = (() => {
  const out: Record<string, { en: string; ar: string }> = {};
  for (const names of Object.values(KPI_MULTILANG_MAP)) {
    out[names.en.toLowerCase()] = names;
    out[names.ar.toLowerCase()] = names;
  }
  return out;
})();

/**
 * Resolve a Notion relation ID (or already-readable name) to a clean,
 * language-aware KPI name.
 *  - Known ID            → localized name for the active language.
 *  - Already a real name → returned unchanged (no mangling of "Scrap Rate").
 *  - Unknown raw ID      → tidy "KPI-XXXXX" placeholder so no long UUID leaks.
 */
export function getCleanKpiName(
  relationId: string | undefined | null,
  lang: LangCode = "en"
): string {
  if (!relationId) return lang === "ar" ? "مؤشر غير معروف" : "Unknown KPI";
  const raw = relationId.trim();

  // 1) Direct ID match.
  const byId = NORMALIZED_KPI_MAP[normalizeId(raw)];
  if (byId) return lang === "ar" ? byId.ar : byId.en;

  // 2) Already a readable name (en or ar) → re-localize to active language.
  const byName = NAME_TO_PAIR[raw.toLowerCase()];
  if (byName) return lang === "ar" ? byName.ar : byName.en;

  // 3) Only shorten genuine Notion IDs; leave human-readable names intact
  //    (so "Scrap Rate" / "OEE" coming straight from a Select column survive).
  if (looksLikeNotionId(raw)) {
    return `KPI-${normalizeId(raw).substring(0, 5).toUpperCase()}`;
  }
  return raw;
}

/**
 * Language-agnostic resolver kept for the server/data layer (route.ts and
 * readText). Returns the English label for known IDs, the original string
 * for real names, and the raw ID otherwise (so nothing is ever lost before
 * the UI gets a chance to localize it via getCleanKpiName).
 */
export function resolveKpiName(relationId: string | undefined | null): string {
  if (!relationId) return "Unknown KPI";
  const raw = relationId.trim();
  const hit = NORMALIZED_KPI_MAP[normalizeId(raw)];
  return hit ? hit.en : raw;
}

/** True when a string looks like a Notion UUID (with or without dashes). */
export function looksLikeNotionId(value: string): boolean {
  const v = value.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(v);
}

export function readText(prop: any): string {
  if (!prop) return "";
  // rollup that contains an array of items
  if (prop.rollup) {
    if (typeof prop.rollup.number === "number") return String(prop.rollup.number);
    const arr = prop.rollup.array || [];
    for (const item of arr) {
      const t = readText(item);
      if (t) return t;
    }
  }
  if (prop.formula) {
    if (prop.formula.string) return prop.formula.string;
    if (typeof prop.formula.number === "number") return String(prop.formula.number);
  }
  if (Array.isArray(prop.title) && prop.title.length)
    return prop.title.map((x: any) => x.plain_text).join("");
  if (Array.isArray(prop.rich_text) && prop.rich_text.length)
    return prop.rich_text.map((x: any) => x.plain_text).join("");
  if (prop.select?.name) return prop.select.name;
  if (prop.status?.name) return prop.status.name;
  if (Array.isArray(prop.multi_select) && prop.multi_select.length)
    return prop.multi_select.map((x: any) => x.name).join(", ");
  if (Array.isArray(prop.people) && prop.people.length)
    return prop.people.map((x: any) => x.name || "User").join(", ");
  if (prop.date?.start) return prop.date.start;
  if (typeof prop.number === "number") return String(prop.number);
  if (typeof prop.checkbox === "boolean") return prop.checkbox ? "Yes" : "No";
  // last resort: relation → resolve first id via the hardcoded dictionary,
  // falling back to the raw id when it is not a known KPI.
  if (Array.isArray(prop.relation) && prop.relation.length)
    return resolveKpiName(prop.relation[0].id);
  return "";
}

export function readNumber(prop: any): number {
  if (!prop) return 0;
  if (typeof prop.number === "number") return prop.number;
  if (prop.formula && typeof prop.formula.number === "number")
    return prop.formula.number;
  if (prop.rollup && typeof prop.rollup.number === "number")
    return prop.rollup.number;
  const t = readText(prop);
  const n = parseFloat(t.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function readBool(prop: any): boolean {
  if (!prop) return false;
  if (typeof prop.checkbox === "boolean") return prop.checkbox;
  const t = readText(prop).toLowerCase();
  return ["yes", "true", "required", "1"].includes(t);
}

export function readDate(prop: any): string {
  if (!prop) return "";
  if (prop.date?.start) return prop.date.start.split("T")[0];
  const t = readText(prop);
  return t ? t.split("T")[0] : "";
}

/** Pick the first property that exists from a list of candidate names. */
export function pick(props: any, names: string[]): any {
  for (const n of names) {
    if (props && props[n] !== undefined) return props[n];
  }
  return undefined;
}

export function normalizeAlert(value: string): "On Target" | "Warning" | "Critical" | "Unknown" {
  const v = (value || "").toLowerCase();
  if (v.includes("crit") || v.includes("red") || v.includes("حرج")) return "Critical";
  if (v.includes("warn") || v.includes("amber") || v.includes("yellow") || v.includes("تحذير"))
    return "Warning";
  if (v.includes("target") || v.includes("ok") || v.includes("good") || v.includes("green") || v.includes("مستهدف"))
    return "On Target";
  return "Unknown";
}
