import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import {
  readText,
  readNumber,
  readBool,
  readDate,
  pick,
  normalizeAlert,
  resolveKpiName,
  looksLikeNotionId,
} from "@/lib/notionMapper";
import type {
  KpiMeasurement,
  ActionPlan,
  ProgressEntry,
  InventoryItem,
} from "@/lib/types";

export const dynamic = "force-dynamic";


async function queryAll(notion: Client, databaseId: string): Promise<any[]> {
  if (!databaseId) return [];
  const results: any[] = [];
  let cursor: string | undefined = undefined;
  // Paginate so large factories aren't truncated at 100 rows.
  do {
    const resp: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return results;
}

function mapKpis(pages: any[]): KpiMeasurement[] {
  return pages.map((page) => {
    const p = page.properties || {};
    // readText already resolves relations via the dictionary, but if it still
    // returns a raw Notion UUID (e.g. an unmapped relation), force one more
    // pass through resolveKpiName so the UI never shows a cryptic code.
    const rawKpi =
      readText(pick(p, ["KPI Master Link", "KPI Name", "KPI", "Name"])) || "";
    const kpiName = looksLikeNotionId(rawKpi)
      ? resolveKpiName(rawKpi)
      : rawKpi || "Unknown KPI";
    return {
      measurementId: page.id,
      kpiName,
      date: readDate(pick(p, ["Date"])) || new Date().toISOString().split("T")[0],
      shift: readText(pick(p, ["Shift"])) || "All",
      line: readText(pick(p, ["Line", "Production Line"])) || "Unknown",
      actualValue: readNumber(pick(p, ["Actual Value", "Actual", "# Actual Value"])),
      target: readNumber(pick(p, ["Target", "Target Value"])),
      unit: readText(pick(p, ["Unit"])),
      alertLevel: normalizeAlert(readText(pick(p, ["Alert Level", "Status"]))),
      actionRequired: readBool(pick(p, ["Action Required"])),
      rootCause: readText(pick(p, ["Root Cause Category", "Root Cause"])),
      notes: readText(pick(p, ["Notes", "Operational Context"])),
    };
  });
}

function mapActions(pages: any[]): ActionPlan[] {
  return pages.map((page) => {
    const p = page.properties || {};
    return {
      id: page.id,
      initiative: readText(pick(p, ["Optimization Initiative", "Initiative", "Name"])),
      targetKpi: (() => {
        const raw = readText(pick(p, ["Target KPI"]));
        return looksLikeNotionId(raw) ? resolveKpiName(raw) : raw;
      })(),
      owner: readText(pick(p, ["Owner"])),
      status: readText(pick(p, ["Status"])) || "Unknown",
      priority: readText(pick(p, ["Priority"])) || "Medium",
      riskLevel: readText(pick(p, ["Risk Level", "Risk"])),
      startDate: readDate(pick(p, ["Start Date"])),
      endDate: readDate(pick(p, ["End Date"])),
      daysOpen: readNumber(pick(p, ["Days Open"])),
      executionPct: readNumber(pick(p, ["Execution %", "Execution"])),
      projectedRoi: readNumber(
        pick(p, ["Projected ROI", "Projected ROI (Financial)"])
      ),
      valueImpactScore: readNumber(pick(p, ["Value Impact Score"])),
      escalationRequired: readBool(pick(p, ["Escalation Required"])),
      rootCause: readText(pick(p, ["Root Cause (5-Why)", "Root Cause"])),
      notes: readText(pick(p, ["Notes"])),
    };
  });
}

function mapProgress(pages: any[]): ProgressEntry[] {
  return pages.map((page) => {
    const p = page.properties || {};
    const status = readText(pick(p, ["Status"]));
    return {
      id: page.id,
      entryTitle: readText(pick(p, ["Entry Title", "Name"])),
      sourceActionPlan: readText(pick(p, ["Source Action Plan", "Action Plan"])),
      date: readDate(pick(p, ["Date"])),
      stage: readText(pick(p, ["Progress Stage", "Stage"])),
      status: status || "Unknown",
      baselineValue: readNumber(pick(p, ["Baseline Value", "Baseline"])),
      actualPostFix: readNumber(pick(p, ["Actual (Post-Fix)", "Actual"])),
      improvementPct: readNumber(pick(p, ["Improvement %", "Improvement"])),
      financialSaving: readNumber(pick(p, ["Financial Saving ($)", "Financial Saving"])),
      verifiedBy: readText(pick(p, ["Verified By"])),
      verified: /complete|verified|closed|done/i.test(status),
      notes: readText(pick(p, ["Notes"])),
      lessonLearned: readText(pick(p, ["Lesson Learned"])),
    };
  });
}

function mapInventory(pages: any[]): InventoryItem[] {
  return pages.map((page) => {
    const p = page.properties || {};
    return {
      id: page.id,
      materialName: readText(pick(p, ["Material Name", "Material", "Name"])),
      category: readText(pick(p, ["Category"])),
      unit: readText(pick(p, ["Unit"])),
      currentStock: readNumber(pick(p, ["Current Stock Level", "Current Stock"])),
      safetyStock: readNumber(pick(p, ["Safety Stock Threshold", "Safety Stock"])),
      dailyBurnRate: readNumber(pick(p, ["Daily Burn Rate (Avg)", "Daily Burn Rate"])),
      leadTimeDays: readNumber(pick(p, ["Supplier Lead Time (Days)", "Lead Time"])),
      daysUntilStockOut: readNumber(pick(p, ["Days Until Stock-Out"])),
      inventoryHealth: readText(pick(p, ["Inventory Health"])),
      reorderPoint: readNumber(pick(p, ["Reorder Point"])),
      recommendedOrderQty: readNumber(pick(p, ["Recommended Order Qty"])),
      procurementSignal: readText(pick(p, ["Procurement Signal", "Signal"])),
      coverageGap: readNumber(pick(p, ["Coverage Gap (Days)", "Coverage Gap"])),
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const token = body.token || process.env.NOTION_TOKEN || "";
    const kpiDbId = body.kpiDbId || process.env.NOTION_KPI_DB_ID || "";
    const actionDbId = body.actionDbId || process.env.NOTION_ACTION_DB_ID || "";
    const progressDbId = body.progressDbId || process.env.NOTION_PROGRESS_DB_ID || "";
    const inventoryDbId =
      body.inventoryDbId || process.env.NOTION_INVENTORY_DB_ID || "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Notion token is missing." },
        { status: 401 }
      );
    }
    if (!kpiDbId) {
      return NextResponse.json(
        { success: false, error: "KPI database ID is required." },
        { status: 400 }
      );
    }

    const notion = new Client({ auth: token });

    // Fetch the 4 databases in parallel; tolerate individual failures.
    const [kpiPages, actionPages, progressPages, inventoryPages] =
      await Promise.all([
        queryAll(notion, kpiDbId).catch(() => []),
        queryAll(notion, actionDbId).catch(() => []),
        queryAll(notion, progressDbId).catch(() => []),
        queryAll(notion, inventoryDbId).catch(() => []),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        kpis: mapKpis(kpiPages),
        actions: mapActions(actionPages),
        progress: mapProgress(progressPages),
        inventory: mapInventory(inventoryPages),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to sync with Notion." },
      { status: 500 }
    );
  }
}
