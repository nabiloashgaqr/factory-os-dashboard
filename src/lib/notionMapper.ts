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
// ───────────────────────────────────────────────────────────


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
  // last resort: relation → first id (readable name not available without extra fetch)
  if (Array.isArray(prop.relation) && prop.relation.length)
    return prop.relation[0].id;
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
