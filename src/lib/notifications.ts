import type { FactoryData, Filters } from "./types";
import { applyKpiFilters } from "./kpiProcessor";
import type { Language } from "./i18n";

export type NotifSeverity = "critical" | "warning" | "info";

export interface AppNotification {
  id: string;
  severity: NotifSeverity;
  title: string;
  detail: string;
  tab: string; // destination tab id when clicked
}

/**
 * Derives the critical-priority operational notifications from LIVE data:
 *  1) Critical KPI alerts
 *  2) Overdue action plans (past End Date, not completed)
 *  3) Materials about to stock out (≤ 5 days)
 * Always reflects the current state (no read/dismiss persistence).
 */
export function buildNotifications(
  data: FactoryData,
  filters: Filters,
  language: Language
): AppNotification[] {
  const ar = language === "ar";
  const out: AppNotification[] = [];

  // 1) Critical KPI alerts (respect active filters)
  const rows = applyKpiFilters(data.kpis, filters);
  const critical = rows.filter((r) => r.alertLevel === "Critical");
  if (critical.length > 0) {
    out.push({
      id: "kpi-critical",
      severity: "critical",
      title: ar ? "تنبيهات أداء حرجة" : "Critical KPI Alerts",
      detail: ar
        ? `${critical.length} قراءة تجاوزت الحدود الحرجة وتحتاج إجراءً فورياً.`
        : `${critical.length} readings breached critical limits — immediate action needed.`,
      tab: "kpi_intel",
    });
  }

  // 2) Overdue action plans
  const now = new Date();
  const overdue = data.actions.filter(
    (a) =>
      a.endDate &&
      new Date(a.endDate) < now &&
      !/complete|closed|done/i.test(a.status)
  );
  if (overdue.length > 0) {
    out.push({
      id: "actions-overdue",
      severity: "critical",
      title: ar ? "خطط عمل متأخرة" : "Overdue Action Plans",
      detail: ar
        ? `${overdue.length} خطة تجاوزت موعد الإنجاز ولم تُغلق بعد.`
        : `${overdue.length} plans are past their due date and still open.`,
      tab: "actions",
    });
  }

  // 3) Materials about to stock out (≤ 5 days)
  const stockOut = data.inventory.filter(
    (i) => i.daysUntilStockOut > 0 && i.daysUntilStockOut <= 5
  );
  if (stockOut.length > 0) {
    const soonest = Math.min(...stockOut.map((i) => i.daysUntilStockOut));
    out.push({
      id: "inventory-stockout",
      severity: "critical",
      title: ar ? "مواد ستنفد قريباً" : "Imminent Stock-Out",
      detail: ar
        ? `${stockOut.length} مادة ستنفد خلال ${soonest} يوم/أيام. فعّل الشراء العاجل.`
        : `${stockOut.length} materials run out within ${soonest} day(s). Expedite procurement.`,
      tab: "inventory",
    });
  }

  return out;
}
