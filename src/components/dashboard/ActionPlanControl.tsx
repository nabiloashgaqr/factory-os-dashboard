"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { Card, SectionHeader, StatCard, EmptyState, Badge } from "@/components/shared/ui";
import { getCleanKpiName } from "@/lib/notionMapper";
import ContextualAI from "@/components/shared/ContextualAI";
import { formatCurrency, downloadCsv, shortRef } from "@/lib/utils";
import { CheckSquare, Download, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

function isOpen(status: string) {
  return !/complete|closed|done/i.test(status);
}
function isOverdue(endDate: string, status: string) {
  return endDate && new Date(endDate) < new Date() && isOpen(status);
}
function priorityColor(p: string) {
  if (/crit/i.test(p)) return "var(--critical)";
  if (/high/i.test(p)) return "var(--warning)";
  return "var(--accent)";
}

export default function ActionPlanControl() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data } = useFactoryData();
  const actions = data.actions;

  const stats = useMemo(() => {
    const open = actions.filter((a) => isOpen(a.status)).length;
    const completed = actions.length - open;
    const avgExec = actions.length
      ? actions.reduce((s, a) => s + a.executionPct, 0) / actions.length
      : 0;
    const totalRoi = actions.reduce((s, a) => s + a.projectedRoi, 0);
    return { open, completed, avgExec: avgExec.toFixed(0), totalRoi };
  }, [actions]);

  const byPriority = useMemo(() => {
    const map: Record<string, { priority: string; open: number; completed: number }> = {};
    actions.forEach((a) => {
      const p = a.priority || "Medium";
      map[p] = map[p] || { priority: p, open: 0, completed: 0 };
      if (isOpen(a.status)) map[p].open += 1;
      else map[p].completed += 1;
    });
    return Object.values(map);
  }, [actions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.actions}
        subtitle={
          language === "ar"
            ? "الربط الحي مع قاعدة بيانات Action Plans لمواجهة انحرافات المؤشرات"
            : "Live link to Action Plans DB to remediate KPI deviations"
        }
        icon={<CheckSquare className="text-[var(--success)]" />}
        right={
          <button
            onClick={() => downloadCsv("action_plans.csv", actions as unknown as Record<string, unknown>[])}
            className="flex items-center gap-2 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-2 rounded-lg font-medium transition-colors"
          >
            <Download size={14} /> CSV
          </button>
        }
      />

      <ContextualAI pageContext="action_control" currentData={{ stats, byPriority }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t.openActions} value={stats.open} accent="var(--accent)" />
        <StatCard label={language === "ar" ? "مكتملة" : "Completed"} value={stats.completed} accent="var(--success)" />
        <StatCard label={t.avgExecution} value={`${stats.avgExec}%`} accent="var(--warning)" />
        <StatCard label={language === "ar" ? "إجمالي العائد المتوقع" : "Total Projected ROI"} value={formatCurrency(stats.totalRoi)} accent="var(--success)" />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">
          {language === "ar" ? "الخطط حسب الأولوية (مفتوحة مقابل مكتملة)" : "Actions by Priority (Open vs Completed)"}
        </h3>
        <div className="h-64">
          {byPriority.length === 0 ? (
            <EmptyState message={t.noData} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="priority" stroke="var(--text)" fontSize={11} />
                <YAxis stroke="var(--text)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="open" stackId="a" fill="var(--warning)" name={language === "ar" ? "مفتوحة" : "Open"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" stackId="a" fill="var(--success)" name={language === "ar" ? "مكتملة" : "Completed"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">
          {language === "ar" ? "جدول خطط العمل" : "Action Plans"}
        </h3>
        {actions.length === 0 ? (
          <EmptyState message={t.noData} />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs font-bold opacity-60 border-b border-[var(--border)]">
                <th className="py-3 px-2 text-center">ID</th>
                <th className="py-3 px-2 text-start">{language === "ar" ? "المبادرة التصحيحية" : "Initiative"}</th>
                <th className="py-3 px-2 text-start">{language === "ar" ? "المؤشر المستهدف" : "Target KPI"}</th>
                <th className="py-3 px-2 text-start">{t.owner}</th>
                <th className="py-3 px-2 text-center">{t.status}</th>
                <th className="py-3 px-2 text-center">{t.priority}</th>
                <th className="py-3 px-2 text-center">{language === "ar" ? "النهاية" : "End"}</th>
                <th className="py-3 px-2 text-end">{language === "ar" ? "الإنجاز" : "Exec %"}</th>
                <th className="py-3 px-2 text-end">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {actions.map((a) => {
                const overdue = isOverdue(a.endDate, a.status);
                const kpiName = getCleanKpiName(a.targetKpi, language);
                return (
                  <tr
                    key={a.id}
                    className="hover:bg-[var(--bg)] transition-colors"
                    style={overdue ? { backgroundColor: "color-mix(in srgb, var(--critical) 6%, transparent)" } : undefined}
                  >
                    <td className="py-4 px-2 text-center font-mono text-sm font-bold text-[var(--accent)]">
                      {shortRef(a.id, "AP")}
                    </td>
                    <td className="py-4 px-2 font-extrabold leading-relaxed max-w-sm">
                      <span className="flex items-center gap-1.5">
                        {(overdue || a.escalationRequired) && (
                          <AlertTriangle size={14} className="text-[var(--critical)] flex-shrink-0" />
                        )}
                        {a.initiative}
                      </span>
                    </td>
                    <td className="py-4 px-2 font-bold opacity-95">{kpiName}</td>
                    <td className="py-4 px-2 opacity-80">{a.owner}</td>
                    <td className="py-4 px-2 text-center">{a.status}</td>
                    <td className="py-4 px-2 text-center">
                      <Badge color={priorityColor(a.priority)}>{a.priority}</Badge>
                    </td>
                    <td className="py-4 px-2 text-center font-mono">{a.endDate || "—"}</td>
                    <td className="py-4 px-2 text-end font-mono text-base font-black">{a.executionPct}%</td>
                    <td className="py-4 px-2 text-end font-mono text-base font-black text-[var(--success)]">
                      {formatCurrency(a.projectedRoi)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
