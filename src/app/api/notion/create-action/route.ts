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

    // Title (required) — first title-type property.
    const titleKey = findByType("title");
    if (titleKey) {
      props[titleKey] = { title: [{ text: { content: title } }] };
    }

    // Priority — select / status if present.
    const priKey = findByNames(["Priority"]);
    if (priKey) {
      const ptype = schema[priKey].type;
      if (ptype === "select") props[priKey] = { select: { name: priority } };
      else if (ptype === "status") props[priKey] = { status: { name: priority } };
      else if (ptype === "rich_text")
        props[priKey] = { rich_text: [{ text: { content: priority } }] };
    }

    // Status — default to a sensible "open" value when it's a select/status.
    const statusKey = findByNames(["Status"]);
    if (statusKey) {
      const stype = schema[statusKey].type;
      const openVal = body.status || "Pending";
      if (stype === "select") props[statusKey] = { select: { name: openVal } };
      else if (stype === "status") props[statusKey] = { status: { name: openVal } };
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
      if (ttype === "select") props[tkKey] = { select: { name: targetKpi } };
      else if (ttype === "rich_text")
        props[tkKey] = { rich_text: [{ text: { content: targetKpi } }] };
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
