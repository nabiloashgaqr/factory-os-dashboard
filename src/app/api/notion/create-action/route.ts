import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

export const dynamic = "force-dynamic";


/**
 * "Close the loop": create a new Action Plan page in Notion from an AI
 * recommendation or a critical notification.
 *
 * Notion DB schemas vary, so we retrieve the schema first and only set
 * properties that actually exist (matched by name + type), guaranteeing the
 * create call never fails on an unknown/typed property.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token || process.env.NOTION_TOKEN || "";
    const actionDbId = body.actionDbId || process.env.NOTION_ACTION_DB_ID || "";

    const title: string = (body.title || "").toString().slice(0, 200);
    const priority: string = body.priority || "High";
    const targetKpi: string = body.targetKpi || "";
    const notes: string = (body.notes || "").toString().slice(0, 1800);

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Notion token is missing." },
        { status: 401 }
      );
    }
    if (!actionDbId) {
      return NextResponse.json(
        { success: false, error: "Action Plans database ID is required." },
        { status: 400 }
      );
    }
    if (!title) {
      return NextResponse.json(
        { success: false, error: "A title is required." },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: token });

    // 1) Read the schema to learn property names + types.
    const db: any = await notion.databases.retrieve({ database_id: actionDbId });
    const schema: Record<string, any> = db.properties || {};

    const findByType = (type: string) =>
      Object.keys(schema).find((k) => schema[k]?.type === type);
    const findByNames = (names: string[]) =>
      Object.keys(schema).find((k) =>
        names.some((n) => k.toLowerCase() === n.toLowerCase())
      );

    const props: Record<string, any> = {};

    // For select/status fields, only valid (pre-defined) options are accepted
    // by Notion. Pick the requested value if it exists (case-insensitive),
    // otherwise fall back to a preferred candidate, else the first option.
    const optionsOf = (key: string): string[] => {
      const def = schema[key];
      if (def?.type === "select") return (def.select?.options || []).map((o: any) => o.name);
      if (def?.type === "status") return (def.status?.options || []).map((o: any) => o.name);
      return [];
    };
    const pickOption = (key: string, wanted: string, prefer: string[] = []): string | null => {
      const opts = optionsOf(key);
      if (opts.length === 0) return null;
      const ci = (v: string) => v.trim().toLowerCase();
      const exact = opts.find((o) => ci(o) === ci(wanted));
      if (exact) return exact;
      for (const p of prefer) {
        const m = opts.find((o) => ci(o).includes(ci(p)));
        if (m) return m;
      }
      return opts[0];
    };

    // Title (required) — first title-type property.
    const titleKey = findByType("title");
    if (titleKey) {
      props[titleKey] = { title: [{ text: { content: title } }] };
    }

    // Priority — select / status if present (snap to a valid option).
    const priKey = findByNames(["Priority"]);
    if (priKey) {
      const ptype = schema[priKey].type;
      if (ptype === "select") {
        const v = pickOption(priKey, priority, ["high", "medium", "critical"]);
        if (v) props[priKey] = { select: { name: v } };
      } else if (ptype === "status") {
        const v = pickOption(priKey, priority, ["high", "medium"]);
        if (v) props[priKey] = { status: { name: v } };
      } else if (ptype === "rich_text") {
        props[priKey] = { rich_text: [{ text: { content: priority } }] };
      }
    }

    // Status — snap to an existing "open/pending/to-do" option (never invent one).
    const statusKey = findByNames(["Status"]);
    if (statusKey) {
      const stype = schema[statusKey].type;
      const wanted = body.status || "Pending";
      if (stype === "select") {
        const v = pickOption(statusKey, wanted, ["pending", "open", "not started", "to do", "new", "backlog"]);
        if (v) props[statusKey] = { select: { name: v } };
      } else if (stype === "status") {
        const v = pickOption(statusKey, wanted, ["not started", "to do", "pending", "open", "backlog", "new"]);
        if (v) props[statusKey] = { status: { name: v } };
      }
    }

    // Notes / source — rich_text fields.
    const notesKey = findByNames(["Notes", "Description", "Details"]);
    if (notesKey && schema[notesKey].type === "rich_text" && notes) {
      props[notesKey] = { rich_text: [{ text: { content: notes } }] };
    }

    // Target KPI — only set when it's a plain select/text (relations need ids).
    const tkKey = findByNames(["Target KPI"]);
    if (tkKey && targetKpi) {
      const ttype = schema[tkKey].type;
      if (ttype === "select") {
        // Only set if the option already exists (avoid invalid-option error).
        const v = pickOption(tkKey, targetKpi);
        const exists = optionsOf(tkKey).some((o) => o.toLowerCase() === targetKpi.toLowerCase());
        if (exists && v) props[tkKey] = { select: { name: v } };
      } else if (ttype === "rich_text") {
        props[tkKey] = { rich_text: [{ text: { content: targetKpi } }] };
      }
    }

    // 2) Create the page.
    const created: any = await notion.pages.create({
      parent: { database_id: actionDbId },
      properties: props,
    });

    return NextResponse.json({ success: true, id: created.id, url: created.url });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create action plan." },
      { status: 500 }
    );
  }
}
