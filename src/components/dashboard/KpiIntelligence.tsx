"use client";

import { useMemo } from "react";
import { useStore } from "@/store/useStore";
import { getTranslations } from "@/lib/i18n";
import { useFactoryData } from "@/components/shared/DataProvider";
import { applyKpiFilters, countByAlert } from "@/lib/kpiProcessor";
import { Card, SectionHeader, EmptyState } from "@/components/shared/ui";
import ProactiveAiAssistant from "@/components/shared/ProactiveAiAssistant";
import { alertColorVar, downloadCsv } from "@/lib/utils";
import { BarChart2, Download } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, BarChart, Bar, Legend,
} from "recharts";
import QualityFpyDefectPareto from "@/components/charts/QualityFpyChart";
import ShiftPerformanceHeatmap from "@/components/charts/ShiftHeatmap";

export default function KpiIntelligence() {
  const { language } = useStore();
  const t = getTranslations(language);
  const { data, filters } = useFactoryData();

  const rows = useMemo(() => applyKpiFilters(data.kpis, filters), [data.kpis, filters]);
  const alertCounts = useMemo(() => countByAlert(rows), [rows]);
  const pieData = [
    { name: t.onTarget, value: alertCounts["On Target"], color: "var(--success)" },
    { name: t.warning, value: alertCounts.Warning, color: "var(--warning)" },
    { name: t.critical, value: alertCounts.Critical, color: "var(--critical)" },
  ].filter((d) => d.value > 0);

  const trend = useMemo(() => {
    const byDate: Record<string, { sum: number; count: number }> = {};
    rows.forEach((r) => {
      if (!r.target) return;
      const att = (r.actualValue / r.target) * 100;
      byDate[r.date] = byDate[r.date] || { sum: 0, count: 0 };
      byDate[r.date].sum += att; byDate[r.date].count += 1;
    });
    return Object.keys(byDate).sort().map((d) => ({ date: d.slice(5), attainment: Number((byDate[d].sum / byDate[d].count).toFixed(1)) }));
  }, [rows]);

  const byLine = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => { map[r.line] = (map[r.line] || 0) + 1; });
    return Object.keys(map).map((line) => ({ line, readings: map[line] }));
  }, [rows]);

  const alertsTable = useMemo(() => rows.filter((r) => r.alertLevel === "Warning" || r.alertLevel === "Critical" || r.actionRequired), [rows]);

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title={t.kpiIntel}
        subtitle={language === "ar" ? "التحليل الإحصائي وتوزيع التنبيهات" : "Statistical analysis & alert distribution"}
        icon={<BarChart2 className="text-[var(--accent)]" />}
        right={<button onClick={() => downloadCsv("kpi_measurements.csv", rows as unknown as Record<string, unknown>[])} className="flex items-center gap-2 text-xs bg-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--bg)] px-3 py-2 rounded-lg font-medium transition-colors"><Download size={14} /> CSV</button>}
      />

      <ProactiveAiAssistant />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "توزيع التنبيهات" : "Alert Distribution"}</h3>
          <div className="h-56">
            {pieData.length === 0 ? <EmptyState message={t.noData} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "اتجاه بلوغ الهدف" : "Target Attainment Trend (%)"}</h3>
          <div className="h-56">
            {trend.length === 0 ? <EmptyState message={t.noData} /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="date" stroke="var(--text)" fontSize={10} />
                  <YAxis stroke="var(--text)" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="attainment" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Quality FPY + Shift Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualityFpyDefectPareto />
        <ShiftPerformanceHeatmap />
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "القراءات حسب خط الإنتاج" : "Readings by Production Line"}</h3>
        <div className="h-56">
          {byLine.length === 0 ? <EmptyState message={t.noData} /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byLine}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="line" stroke="var(--text)" fontSize={11} />
                <YAxis stroke="var(--text)" fontSize={11} />
                <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", fontSize: "12px" }} />
                <Bar dataKey="readings" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold mb-3">{language === "ar" ? "القراءات الحرجة والتحذيرية" : "Warning / Critical Readings"}</h3>
        {alertsTable.length === 0 ? <EmptyState message={t.noData} /> : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="opacity-60 border-b border-[var(--border)] text-start">
                <th className="py-2 text-start">{t.date}</th>
                <th className="py-2 text-start">{t.line}</th>
                <th className="py-2 text-start">{t.shift}</th>
                <th className="py-2 text-start">KPI</th>
                <th className="py-2 text-end">{t.actual}</th>
                <th className="py-2 text-end">{t.target}</th>
                <th className="py-2 text-center">{t.alertLevel}</th>
                <th className="py-2 text-start">{t.rootCause}</th>
              </tr>
            </thead>
            <tbody>
              {alertsTable.slice(0, 60).map((r) => (
                <tr key={r.measurementId} className="border-b border-[var(--border)] last:border-none hover:bg-[var(--bg)] transition-colors">
                  <td className="py-2 font-mono">{r.date}</td>
                  <td className="py-2">{r.line}</td>
                  <td className="py-2">{r.shift}</td>
                  <td className="py-2 font-semibold">{r.kpiName}</td>
                  <td className="py-2 text-end font-mono">{r.actualValue}{r.unit}</td>
                  <td className="py-2 text-end font-mono opacity-70">{r.target}{r.unit}</td>
                  <td className="py-2 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ color: alertColorVar(r.alertLevel), backgroundColor: `color-mix(in srgb, ${alertColorVar(r.alertLevel)} 14%, transparent)` }}>{r.alertLevel}</span>
                  </td>
                  <td className="py-2 opacity-70">{r.rootCause || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
